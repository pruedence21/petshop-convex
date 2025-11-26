/**
 * Test data factories for generating mock data
 * Provides consistent test data across all test files
 */

import type { Id, TableNames } from '../../_generated/dataModel';

/**
 * Generate a mock ID
 */
export function mockId<T extends TableNames>(table: T, id: number = 1): Id<T> {
    return `${table}_${id}` as Id<T>;
}

/**
 * Factory for creating mock accounts
 */
export function createMockAccount(overrides?: Partial<any>) {
    return {
        _id: mockId('accounts', Math.floor(Math.random() * 10000)),
        _creationTime: Date.now(),
        accountCode: '1-101',
        accountName: 'Kas Besar',
        accountType: 'ASSET',
        category: 'Current Asset',
        normalBalance: 'DEBIT',
        isActive: true,
        level: 1,
        ...overrides,
    };
}

/**
 * Factory for creating mock branches
 */
export function createMockBranch(overrides?: Partial<any>) {
    return {
        _id: mockId('branches', Math.floor(Math.random() * 10000)),
        _creationTime: Date.now(),
        code: 'BR001',
        name: 'Cabang Utama',
        address: 'Jl. Test No. 123',
        city: 'Jakarta',
        province: 'DKI Jakarta',
        phone: '021-12345678',
        isActive: true,
        ...overrides,
    };
}

/**
 * Factory for creating mock customers
 */
export function createMockCustomer(overrides?: Partial<any>) {
    return {
        _id: mockId('customers', Math.floor(Math.random() * 10000)),
        _creationTime: Date.now(),
        code: 'CUST001',
        name: 'John Doe',
        phone: '08123456789',
        email: 'john@example.com',
        address: 'Jl. Customer No. 1',
        isActive: true,
        ...overrides,
    };
}

/**
 * Factory for creating mock products
 */
export function createMockProduct(overrides?: Partial<any>) {
    const categoryId = mockId('productCategories', 1);
    const brandId = mockId('brands', 1);
    const unitId = mockId('units', 1);

    return {
        _id: mockId('products', Math.floor(Math.random() * 10000)),
        _creationTime: Date.now(),
        sku: 'PROD001',
        name: 'Dog Food Premium 1kg',
        categoryId,
        brandId,
        unitId,
        purchasePrice: 50000,
        sellingPrice: 75000,
        minStock: 10,
        maxStock: 100,
        hasVariants: false,
        isActive: true,
        ...overrides,
    };
}

/**
 * Factory for creating mock product categories
 */
export function createMockProductCategory(overrides?: Partial<any>) {
    return {
        _id: mockId('productCategories', Math.floor(Math.random() * 10000)),
        _creationTime: Date.now(),
        code: 'CAT001',
        name: 'Pet Food',
        description: 'Makanan Hewan',
        isActive: true,
        ...overrides,
    };
}

/**
 * Factory for creating mock sales
 */
export function createMockSale(overrides?: Partial<any>) {
    const branchId = mockId('branches', 1);
    const customerId = mockId('customers', 1);

    return {
        _id: mockId('sales', Math.floor(Math.random() * 10000)),
        _creationTime: Date.now(),
        saleNumber: 'INV-20250125-001',
        branchId,
        customerId,
        saleDate: Date.now(),
        status: 'Draft',
        subtotal: 0,
        discountAmount: 0,
        discountType: 'nominal',
        taxAmount: 0,
        taxRate: 0,
        totalAmount: 0,
        paidAmount: 0,
        outstandingAmount: 0,
        ...overrides,
    };
}

/**
 * Factory for creating mock sale items
 */
export function createMockSaleItem(overrides?: Partial<any>) {
    const saleId = mockId('sales', 1);
    const productId = mockId('products', 1);

    return {
        _id: mockId('saleItems', Math.floor(Math.random() * 10000)),
        _creationTime: Date.now(),
        saleId,
        productId,
        quantity: 1,
        unitPrice: 75000,
        discountAmount: 0,
        discountType: 'nominal',
        subtotal: 75000,
        cogs: 50000,
        ...overrides,
    };
}

/**
 * Factory for creating mock journal entries
 */
export function createMockJournalEntry(overrides?: Partial<any>) {
    return {
        _id: mockId('journalEntries', Math.floor(Math.random() * 10000)),
        _creationTime: Date.now(),
        journalNumber: 'JE-20250125-001',
        journalDate: Date.now(),
        description: 'Test Journal Entry',
        sourceType: 'MANUAL',
        sourceId: 'test-source',
        status: 'Posted',
        totalDebit: 100000,
        totalCredit: 100000,
        postedAt: Date.now(),
        ...overrides,
    };
}

/**
 * Factory for creating mock journal entry lines
 */
export function createMockJournalEntryLine(overrides?: Partial<any>) {
    const journalEntryId = mockId('journalEntries', 1);
    const accountId = mockId('accounts', 1);
    const branchId = mockId('branches', 1);

    return {
        _id: mockId('journalEntryLines', Math.floor(Math.random() * 10000)),
        _creationTime: Date.now(),
        journalEntryId,
        accountId,
        branchId,
        description: 'Test Line',
        debitAmount: 100000,
        creditAmount: 0,
        sortOrder: 1,
        ...overrides,
    };
}

/**
 * Factory for creating mock product stock
 */
export function createMockProductStock(overrides?: Partial<any>) {
    const branchId = mockId('branches', 1);
    const productId = mockId('products', 1);

    return {
        _id: mockId('productStock', Math.floor(Math.random() * 10000)),
        _creationTime: Date.now(),
        branchId,
        productId,
        quantity: 100,
        averageCost: 50000,
        lastUpdated: Date.now(),
        ...overrides,
    };
}

/**
 * Create a complete test scenario with related data
 */
export function createTestScenario() {
    const branch = createMockBranch();
    const customer = createMockCustomer();
    const category = createMockProductCategory();
    const product = createMockProduct({ categoryId: category._id });
    const stock = createMockProductStock({
        branchId: branch._id,
        productId: product._id,
    });

    // Create Chart of Accounts
    const accounts = {
        cash: createMockAccount({ accountCode: '1-101', accountName: 'Kas Besar' }),
        ar: createMockAccount({ accountCode: '1-120', accountName: 'Piutang Usaha' }),
        inventory: createMockAccount({ accountCode: '1-131', accountName: 'Persediaan Makanan Hewan' }),
        revenue: createMockAccount({ accountCode: '4-111', accountName: 'Penjualan Makanan Hewan', accountType: 'REVENUE' }),
        cogs: createMockAccount({ accountCode: '5-101', accountName: 'HPP Makanan Hewan', accountType: 'EXPENSE' }),
        tax: createMockAccount({ accountCode: '2-111', accountName: 'PPN Keluaran', accountType: 'LIABILITY' }),
    };

    return {
        branch,
        customer,
        category,
        product,
        stock,
        accounts,
    };
}
