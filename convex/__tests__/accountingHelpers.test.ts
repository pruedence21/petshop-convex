/**
 * Unit tests for accountingHelpers.ts
 * Tests journal entry generation and balance validation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
    generateJournalNumber,
    getAccountByCode,
    createSaleJournalEntry,
    createPurchaseJournalEntry,
    createClinicJournalEntry,
    createPaymentReceivedJournalEntry,
} from '../finance/accountingHelpers';
import { MockDatabase, createMockMutationContext } from './helpers/mockContext';
import { createTestScenario, createMockAccount, mockId } from './helpers/testData';

describe('generateJournalNumber', () => {
    let db: MockDatabase;
    let ctx: any;

    beforeEach(() => {
        db = new MockDatabase();
        ctx = createMockMutationContext(db);
    });

    it('should generate first journal number of the day', async () => {
        const journalNumber = await generateJournalNumber(ctx);

        const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        expect(journalNumber).toBe(`JE-${today}-001`);
    });

    it('should increment journal number for same day', async () => {
        const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');

        // Insert existing journal entry
        await db.insert('journalEntries', {
            journalNumber: `JE-${today}-001`,
            journalDate: Date.now(),
            description: 'Test',
            sourceType: 'MANUAL',
            sourceId: 'test',
            status: 'Posted',
            totalDebit: 0,
            totalCredit: 0,
        });

        const journalNumber = await generateJournalNumber(ctx);
        expect(journalNumber).toBe(`JE-${today}-002`);
    });

    it('should handle multiple journal entries on same day', async () => {
        const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');

        // Insert 5 existing journal entries
        for (let i = 1; i <= 5; i++) {
            await db.insert('journalEntries', {
                journalNumber: `JE-${today}-${String(i).padStart(3, '0')}`,
                journalDate: Date.now(),
                description: 'Test',
                sourceType: 'MANUAL',
                sourceId: 'test',
                status: 'Posted',
                totalDebit: 0,
                totalCredit: 0,
            });
        }

        const journalNumber = await generateJournalNumber(ctx);
        expect(journalNumber).toBe(`JE-${today}-006`);
    });
});

describe('getAccountByCode', () => {
    let db: MockDatabase;
    let ctx: any;

    beforeEach(() => {
        db = new MockDatabase();
        ctx = createMockMutationContext(db);
    });

    it('should return account ID for valid account code', async () => {
        const account = createMockAccount({ accountCode: '1-101' });
        const insertedId = await db.insert('accounts', account);

        const accountId = await getAccountByCode(ctx, '1-101');
        expect(accountId).toBe(insertedId); // Use the actual inserted ID
    });

    it('should throw error for non-existent account code', async () => {
        await expect(getAccountByCode(ctx, '9-999')).rejects.toThrow('Account 9-999 not found');
    });

    it('should throw error for deleted account', async () => {
        const account = createMockAccount({
            accountCode: '1-101',
            deletedAt: Date.now(),
        });
        await db.insert('accounts', account);

        await expect(getAccountByCode(ctx, '1-101')).rejects.toThrow('Account 1-101 not found');
    });
});

describe('createSaleJournalEntry', () => {
    let db: MockDatabase;
    let ctx: any;
    let scenario: ReturnType<typeof createTestScenario>;

    beforeEach(async () => {
        db = new MockDatabase();
        ctx = createMockMutationContext(db);
        scenario = createTestScenario();

        // Seed accounts
        await db.insert('accounts', scenario.accounts.cash);
        await db.insert('accounts', scenario.accounts.ar);
        await db.insert('accounts', scenario.accounts.inventory);
        await db.insert('accounts', scenario.accounts.revenue);
        await db.insert('accounts', scenario.accounts.cogs);
        await db.insert('accounts', scenario.accounts.tax);
    });

    it('should create balanced journal entry for cash sale', async () => {
        const journalEntryId = await createSaleJournalEntry(ctx, {
            saleId: 'sale_1',
            saleNumber: 'INV-20250125-001',
            saleDate: Date.now(),
            branchId: scenario.branch._id,
            totalAmount: 110000,
            paidAmount: 110000,
            outstandingAmount: 0,
            items: [
                {
                    productName: 'Dog Food 1kg',
                    quantity: 1,
                    unitPrice: 100000,
                    cogs: 60000,
                    subtotal: 100000,
                    category: 'Pet Food',
                },
            ],
            discountAmount: 0,
            taxAmount: 10000, // 10% tax
        });

        // Verify journal entry created
        const journalEntry = await db.get(journalEntryId);
        expect(journalEntry).toBeDefined();
        expect(journalEntry.status).toBe('Posted');

        // Verify balance: debit = credit
        expect(journalEntry.totalDebit).toBe(journalEntry.totalCredit);

        // Get journal entry lines
        const lines = await ctx.db.query('journalEntryLines')
            .withIndex('by_journal_entry', (q: any) => q.eq('journalEntryId', journalEntryId))
            .collect();

        // Calculate totals
        const totalDebit = lines.reduce((sum: number, line: any) => sum + line.debitAmount, 0);
        const totalCredit = lines.reduce((sum: number, line: any) => sum + line.creditAmount, 0);

        expect(totalDebit).toBe(totalCredit);
        expect(totalDebit).toBe(180000); // Cash 110k + COGS 60k + Tax 10k = 180k
        expect(totalCredit).toBe(180000); // Revenue 100k + Inventory 60k + Tax 10k = 180k
    });

    it('should create balanced journal entry for credit sale', async () => {
        const journalEntryId = await createSaleJournalEntry(ctx, {
            saleId: 'sale_2',
            saleNumber: 'INV-20250125-002',
            saleDate: Date.now(),
            branchId: scenario.branch._id,
            totalAmount: 100000,
            paidAmount: 0,
            outstandingAmount: 100000,
            items: [
                {
                    productName: 'Dog Food 1kg',
                    quantity: 1,
                    unitPrice: 100000,
                    cogs: 60000,
                    subtotal: 100000,
                    category: 'Pet Food',
                },
            ],
            discountAmount: 0,
            taxAmount: 0,
        });

        const journalEntry = await db.get(journalEntryId);
        expect(journalEntry.totalDebit).toBe(journalEntry.totalCredit);
        // DR: AR 100k + COGS 60k = 160k
        // CR: Revenue 100k + Inventory 60k = 160k  
        expect(journalEntry.totalDebit).toBe(160000);
    });

    it('should create balanced journal entry for partial payment', async () => {
        const journalEntryId = await createSaleJournalEntry(ctx, {
            saleId: 'sale_3',
            saleNumber: 'INV-20250125-003',
            saleDate: Date.now(),
            branchId: scenario.branch._id,
            totalAmount: 100000,
            paidAmount: 50000,
            outstandingAmount: 50000,
            items: [
                {
                    productName: 'Dog Food 1kg',
                    quantity: 1,
                    unitPrice: 100000,
                    cogs: 60000,
                    subtotal: 100000,
                    category: 'Pet Food',
                },
            ],
            discountAmount: 0,
            taxAmount: 0,
        });

        const journalEntry = await db.get(journalEntryId);
        expect(journalEntry.totalDebit).toBe(journalEntry.totalCredit);
        // DR: Cash 50k + AR 50k + COGS 60k = 160k
        // CR: Revenue 100k + Inventory 60k = 160k
        expect(journalEntry.totalDebit).toBe(160000);
    });

    it('should handle multiple items with different categories', async () => {
        // Add medicine accounts
        const medicineRevenue = createMockAccount({
            accountCode: '4-113',
            accountName: 'Penjualan Obat & Vitamin',
            accountType: 'REVENUE',
        });
        const medicineCogs = createMockAccount({
            accountCode: '5-103',
            accountName: 'HPP Obat & Vitamin',
            accountType: 'EXPENSE',
        });
        const medicineInventory = createMockAccount({
            accountCode: '1-133',
            accountName: 'Persediaan Obat & Vitamin',
        });

        await db.insert('accounts', medicineRevenue);
        await db.insert('accounts', medicineCogs);
        await db.insert('accounts', medicineInventory);

        const journalEntryId = await createSaleJournalEntry(ctx, {
            saleId: 'sale_4',
            saleNumber: 'INV-20250125-004',
            saleDate: Date.now(),
            branchId: scenario.branch._id,
            totalAmount: 200000,
            paidAmount: 200000,
            outstandingAmount: 0,
            items: [
                {
                    productName: 'Dog Food 1kg',
                    quantity: 1,
                    unitPrice: 100000,
                    cogs: 60000,
                    subtotal: 100000,
                    category: 'Pet Food',
                },
                {
                    productName: 'Vitamin',
                    quantity: 1,
                    unitPrice: 100000,
                    cogs: 40000,
                    subtotal: 100000,
                    category: 'Medicine',
                },
            ],
            discountAmount: 0,
            taxAmount: 0,
        });

        const journalEntry = await db.get(journalEntryId);
        expect(journalEntry.totalDebit).toBe(journalEntry.totalCredit);
        expect(journalEntry.totalDebit).toBe(300000); // Cash 200k + COGS 100k
    });

    it('should handle sale with discount', async () => {
        const journalEntryId = await createSaleJournalEntry(ctx, {
            saleId: 'sale_5',
            saleNumber: 'INV-20250125-005',
            saleDate: Date.now(),
            branchId: scenario.branch._id,
            totalAmount: 90000, // After 10k discount
            paidAmount: 90000,
            outstandingAmount: 0,
            items: [
                {
                    productName: 'Dog Food 1kg',
                    quantity: 1,
                    unitPrice: 100000,
                    cogs: 60000,
                    subtotal: 100000,
                    category: 'Pet Food',
                },
            ],
            discountAmount: 10000,
            taxAmount: 0,
        });

        const journalEntry = await db.get(journalEntryId);
        expect(journalEntry.totalDebit).toBe(journalEntry.totalCredit);
        // Discount reduces revenue, so:
        // DR: Cash 90k + COGS 60k = 150k
        // CR: Revenue 90k + Inventory 60k = 150k
        expect(journalEntry.totalDebit).toBe(150000);
    });
});

describe('createPurchaseJournalEntry', () => {
    let db: MockDatabase;
    let ctx: any;
    let scenario: ReturnType<typeof createTestScenario>;

    beforeEach(async () => {
        db = new MockDatabase();
        ctx = createMockMutationContext(db);
        scenario = createTestScenario();

        await db.insert('accounts', scenario.accounts.cash);
        await db.insert('accounts', scenario.accounts.inventory);

        // Add AP account
        const apAccount = createMockAccount({
            accountCode: '2-101',
            accountName: 'Hutang Usaha',
            accountType: 'LIABILITY',
        });
        await db.insert('accounts', apAccount);

        // Add VAT input account
        const vatInput = createMockAccount({
            accountCode: '5-301',
            accountName: 'PPN Masukan',
            accountType: 'EXPENSE',
        });
        await db.insert('accounts', vatInput);
    });

    it('should create balanced journal entry for cash purchase', async () => {
        const journalEntryId = await createPurchaseJournalEntry(ctx, {
            purchaseOrderId: 'po_1',
            poNumber: 'PO-20250125-001',
            orderDate: Date.now(),
            branchId: scenario.branch._id,
            totalAmount: 110000,
            items: [
                {
                    productName: 'Dog Food 1kg',
                    quantity: 10,
                    unitPrice: 10000,
                    category: 'Pet Food',
                },
            ],
            taxAmount: 10000,
            paid: true,
        });

        const journalEntry = await db.get(journalEntryId);
        expect(journalEntry.totalDebit).toBe(journalEntry.totalCredit);
        expect(journalEntry.totalDebit).toBe(110000); // Inventory 100k + VAT 10k
    });

    it('should create balanced journal entry for credit purchase', async () => {
        const journalEntryId = await createPurchaseJournalEntry(ctx, {
            purchaseOrderId: 'po_2',
            poNumber: 'PO-20250125-002',
            orderDate: Date.now(),
            branchId: scenario.branch._id,
            totalAmount: 110000,
            items: [
                {
                    productName: 'Dog Food 1kg',
                    quantity: 10,
                    unitPrice: 10000,
                    category: 'Pet Food',
                },
            ],
            taxAmount: 10000,
            paid: false,
        });

        const journalEntry = await db.get(journalEntryId);
        expect(journalEntry.totalDebit).toBe(journalEntry.totalCredit);
        expect(journalEntry.totalDebit).toBe(110000);
    });
});

describe('createClinicJournalEntry', () => {
    let db: MockDatabase;
    let ctx: any;
    let scenario: ReturnType<typeof createTestScenario>;

    beforeEach(async () => {
        db = new MockDatabase();
        ctx = createMockMutationContext(db);
        scenario = createTestScenario();

        await db.insert('accounts', scenario.accounts.cash);
        await db.insert('accounts', scenario.accounts.ar);
        await db.insert('accounts', scenario.accounts.cogs);
        await db.insert('accounts', scenario.accounts.inventory);

        // Add service revenue account
        const serviceRevenue = createMockAccount({
            accountCode: '4-121',
            accountName: 'Jasa Pemeriksaan',
            accountType: 'REVENUE',
        });
        await db.insert('accounts', serviceRevenue);

        // Add medicine accounts for inventory usage tests
        const medicineCogs = createMockAccount({
            accountCode: '5-103',
            accountName: 'HPP Obat & Vitamin',
            accountType: 'EXPENSE',
        });
        const medicineInventory = createMockAccount({
            accountCode: '1-133',
            accountName: 'Persediaan Obat & Vitamin',
        });
        await db.insert('accounts', medicineCogs);
        await db.insert('accounts', medicineInventory);
    });

    it('should create balanced journal entry for clinic service', async () => {
        const journalEntryId = await createClinicJournalEntry(ctx, {
            appointmentId: 'apt_1',
            appointmentNumber: 'APT-20250125-001',
            appointmentDate: Date.now(),
            branchId: scenario.branch._id,
            totalAmount: 200000,
            paidAmount: 200000,
            outstandingAmount: 0,
            services: [
                {
                    serviceName: 'Pemeriksaan Umum',
                    subtotal: 200000,
                    category: 'Medical',
                },
            ],
            taxAmount: 0,
        });

        const journalEntry = await db.get(journalEntryId);
        expect(journalEntry.totalDebit).toBe(journalEntry.totalCredit);
        expect(journalEntry.totalDebit).toBe(200000); // Cash 200k
    });

    it('should handle service with inventory usage', async () => {
        const journalEntryId = await createClinicJournalEntry(ctx, {
            appointmentId: 'apt_2',
            appointmentNumber: 'APT-20250125-002',
            appointmentDate: Date.now(),
            branchId: scenario.branch._id,
            totalAmount: 250000,
            paidAmount: 250000,
            outstandingAmount: 0,
            services: [
                {
                    serviceName: 'Pemeriksaan + Obat',
                    subtotal: 250000,
                    cogs: 50000, // Medicine used
                    category: 'Medical',
                },
            ],
            taxAmount: 0,
        });

        const journalEntry = await db.get(journalEntryId);
        expect(journalEntry.totalDebit).toBe(journalEntry.totalCredit);
        expect(journalEntry.totalDebit).toBe(300000); // Cash 250k + COGS 50k
    });
});

describe('createPaymentReceivedJournalEntry', () => {
    let db: MockDatabase;
    let ctx: any;
    let scenario: ReturnType<typeof createTestScenario>;

    beforeEach(async () => {
        db = new MockDatabase();
        ctx = createMockMutationContext(db);
        scenario = createTestScenario();

        await db.insert('accounts', scenario.accounts.cash);
        await db.insert('accounts', scenario.accounts.ar);

        // Add bank account
        const bankAccount = createMockAccount({
            accountCode: '1-111',
            accountName: 'Bank BCA',
        });
        await db.insert('accounts', bankAccount);
    });

    it('should create balanced journal entry for cash payment', async () => {
        const journalEntryId = await createPaymentReceivedJournalEntry(ctx, {
            paymentId: 'pay_1',
            paymentDate: Date.now(),
            amount: 100000,
            paymentMethod: 'CASH',
            customerId: scenario.customer._id,
            branchId: scenario.branch._id,
        });

        const journalEntry = await db.get(journalEntryId);
        expect(journalEntry.totalDebit).toBe(journalEntry.totalCredit);
        expect(journalEntry.totalDebit).toBe(100000);
    });

    it('should create balanced journal entry for bank transfer', async () => {
        const journalEntryId = await createPaymentReceivedJournalEntry(ctx, {
            paymentId: 'pay_2',
            paymentDate: Date.now(),
            amount: 100000,
            paymentMethod: 'BANK_TRANSFER',
            referenceNumber: 'TRF123456',
            customerId: scenario.customer._id,
            branchId: scenario.branch._id,
        });

        const journalEntry = await db.get(journalEntryId);
        expect(journalEntry.totalDebit).toBe(journalEntry.totalCredit);
        expect(journalEntry.totalDebit).toBe(100000);
    });
});
