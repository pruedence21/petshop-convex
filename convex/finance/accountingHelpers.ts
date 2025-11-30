import { Id } from "../_generated/dataModel";

export async function generateJournalNumber(ctx: any) {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const prefix = `JE-${dateStr}-`;

  const todayEntries = await ctx.db
    .query("journalEntries")
    .withIndex("by_journal_number")
    .collect();

  const todayFiltered = todayEntries.filter((je: any) =>
    je.journalNumber.startsWith(prefix)
  );

  if (todayFiltered.length === 0) {
    return `${prefix}001`;
  }

  const maxNumber = Math.max(
    ...todayFiltered.map((je: any) => {
      const numPart = je.journalNumber.split("-")[2];
      return parseInt(numPart, 10);
    })
  );

  return `${prefix}${String(maxNumber + 1).padStart(3, "0")}`;
}

// Helper: Get account by code
export async function getAccountByCode(
  ctx: any,
  accountCode: string
): Promise<Id<"accounts">> {
  const account = await ctx.db
    .query("accounts")
    .withIndex("by_account_code", (q: any) => q.eq("accountCode", accountCode))
    .first();

  if (!account || account.deletedAt) {
    throw new Error(`Account ${accountCode} not found`);
  }

  return account._id;
}

/**
 * Create journal entry for Sale (Retail/Clinic/Hotel)
 * 
 * Entry:
 * DR Cash/AR           (total amount)
 *   CR Sales Revenue   (subtotal - discount + tax)
 * DR COGS              (cost of goods sold)
 *   CR Inventory       (cost of goods sold)
 * DR Discount Expense  (if discount given)
 *   CR Sales Revenue   (discount amount)
 */
export async function createSaleJournalEntry(
  ctx: any,
  args: {
    saleId: string;
    saleNumber: string;
    saleDate: number;
    branchId: Id<"branches">;
    totalAmount: number;
    paidAmount: number;
    outstandingAmount: number;
    items: Array<{
      productName: string;
      quantity: number;
      unitPrice: number;
      cogs: number;
      subtotal: number;
      category: string; // "Pet Food", "Medicine", "Accessories"
    }>;
    discountAmount: number;
    taxAmount: number;
  }
) {
  const journalNumber = await generateJournalNumber(ctx);

  // Determine revenue account based on product category
  const getRevenueAccount = (category: string): string => {
    if (category.includes("Pet Food") || category.includes("Food")) {
      return "4-111"; // Penjualan Makanan Hewan
    } else if (category.includes("Medicine") || category.includes("Vitamin")) {
      return "4-113"; // Penjualan Obat & Vitamin
    } else if (category.includes("Accessories")) {
      return "4-112"; // Penjualan Aksesoris
    }
    return "4-111"; // Default to Pet Food Sales
  };

  // Determine COGS account
  const getCogsAccount = (category: string): string => {
    if (category.includes("Pet Food") || category.includes("Food")) {
      return "5-101"; // HPP Makanan Hewan
    } else if (category.includes("Medicine") || category.includes("Vitamin")) {
      return "5-103"; // HPP Obat & Vitamin
    } else if (category.includes("Accessories")) {
      return "5-102"; // HPP Aksesoris
    }
    return "5-101"; // Default
  };

  // Determine inventory account
  const getInventoryAccount = (category: string): string => {
    if (category.includes("Pet Food") || category.includes("Food")) {
      return "1-131"; // Persediaan Makanan Hewan
    } else if (category.includes("Medicine") || category.includes("Vitamin")) {
      return "1-133"; // Persediaan Obat & Vitamin
    } else if (category.includes("Vaccine")) {
      return "1-134"; // Persediaan Vaksin
    } else if (category.includes("Accessories")) {
      return "1-132"; // Persediaan Aksesoris
    }
    return "1-131"; // Default
  };

  const lines: Array<{
    accountId: Id<"accounts">;
    branchId: Id<"branches">;
    description: string;
    debitAmount: number;
    creditAmount: number;
  }> = [];

  // 1. Record cash/receivable
  if (args.paidAmount > 0) {
    // Cash received
    const cashAccount = await getAccountByCode(ctx, "1-101"); // Kas Besar
    lines.push({
      accountId: cashAccount,
      branchId: args.branchId,
      description: `Penerimaan kas dari ${args.saleNumber}`,
      debitAmount: args.paidAmount,
      creditAmount: 0,
    });
  }

  if (args.outstandingAmount > 0) {
    // Accounts Receivable
    const arAccount = await getAccountByCode(ctx, "1-120"); // Piutang Usaha
    lines.push({
      accountId: arAccount,
      branchId: args.branchId,
      description: `Piutang dari ${args.saleNumber}`,
      debitAmount: args.outstandingAmount,
      creditAmount: 0,
    });
  }

  // 2. Record revenue by category and COGS
  const revenueByCategory = new Map<string, number>();
  const cogsByCategory = new Map<string, number>();

  for (const item of args.items) {
    const revenueCode = getRevenueAccount(item.category);
    const cogsCode = getCogsAccount(item.category);
    const inventoryCode = getInventoryAccount(item.category);

    // Aggregate revenue
    revenueByCategory.set(
      revenueCode,
      (revenueByCategory.get(revenueCode) || 0) + item.subtotal
    );

    // Aggregate COGS by category (COGS account + Inventory account)
    const key = `${cogsCode}|${inventoryCode}`;
    cogsByCategory.set(key, (cogsByCategory.get(key) || 0) + item.cogs);
  }

  // Create revenue entries
  for (const [accountCode, amount] of revenueByCategory.entries()) {
    const revenueAccount = await getAccountByCode(ctx, accountCode);
    lines.push({
      accountId: revenueAccount,
      branchId: args.branchId,
      description: `Pendapatan penjualan ${args.saleNumber}`,
      debitAmount: 0,
      creditAmount: amount,
    });
  }

  // Create COGS and Inventory entries
  for (const [key, cogsAmount] of cogsByCategory.entries()) {
    const [cogsCode, inventoryCode] = key.split("|");

    // DR COGS
    const cogsAccount = await getAccountByCode(ctx, cogsCode);
    lines.push({
      accountId: cogsAccount,
      branchId: args.branchId,
      description: `HPP ${args.saleNumber}`,
      debitAmount: cogsAmount,
      creditAmount: 0,
    });

    // CR Inventory
    const inventoryAccount = await getAccountByCode(ctx, inventoryCode);
    lines.push({
      accountId: inventoryAccount,
      branchId: args.branchId,
      description: `Pengurangan persediaan ${args.saleNumber}`,
      debitAmount: 0,
      creditAmount: cogsAmount,
    });
  }

  // 3. Record tax (PPN Keluaran) if any
  if (args.taxAmount > 0) {
    const taxAccount = await getAccountByCode(ctx, "2-111"); // PPN Keluaran
    lines.push({
      accountId: taxAccount,
      branchId: args.branchId,
      description: `PPN ${args.saleNumber}`,
      debitAmount: 0,
      creditAmount: args.taxAmount,
    });
  }

  // Create journal entry
  const journalEntryId = await ctx.db.insert("journalEntries", {
    journalNumber,
    journalDate: args.saleDate,
    description: `Penjualan ${args.saleNumber}`,
    sourceType: "SALE",
    sourceId: args.saleId,
    status: "Posted", // Auto-post sale transactions
    totalDebit: lines.reduce((sum, l) => sum + l.debitAmount, 0),
    totalCredit: lines.reduce((sum, l) => sum + l.creditAmount, 0),
    postedBy: undefined,
    postedAt: Date.now(),
    createdBy: undefined,
  });

  // Create journal entry lines
  let sortOrder = 1;
  for (const line of lines) {
    await ctx.db.insert("journalEntryLines", {
      journalEntryId,
      accountId: line.accountId,
      branchId: line.branchId,
      description: line.description,
      debitAmount: line.debitAmount,
      creditAmount: line.creditAmount,
      sortOrder: sortOrder++,
    });
  }

  return journalEntryId;
}

/**
 * Create journal entry for Purchase Order receiving
 * 
 * Entry:
 * DR Inventory         (unit price × quantity)
 * DR PPN Masukan       (tax amount)
 *   CR Cash/AP         (total amount)
 */
export async function createPurchaseJournalEntry(
  ctx: any,
  args: {
    purchaseOrderId: string;
    poNumber: string;
    orderDate: number;
    branchId: Id<"branches">;
    totalAmount: number;
    items: Array<{
      productName: string;
      quantity: number;
      unitPrice: number;
      category: string;
    }>;
    taxAmount: number;
    paid: boolean; // true = cash payment, false = accounts payable
  }
) {
  const journalNumber = await generateJournalNumber(ctx);

  const getInventoryAccount = (category: string): string => {
    if (category.includes("Pet Food") || category.includes("Food")) {
      return "1-131";
    } else if (category.includes("Medicine") || category.includes("Vitamin")) {
      return "1-133";
    } else if (category.includes("Vaccine")) {
      return "1-134";
    } else if (category.includes("Accessories")) {
      return "1-132";
    } else if (category.includes("Grooming")) {
      return "1-135";
    }
    return "1-131";
  };

  const lines: Array<{
    accountId: Id<"accounts">;
    branchId: Id<"branches">;
    description: string;
    debitAmount: number;
    creditAmount: number;
  }> = [];

  // 1. Record inventory by category
  const inventoryByCategory = new Map<string, number>();

  for (const item of args.items) {
    const inventoryCode = getInventoryAccount(item.category);
    const amount = item.quantity * item.unitPrice;
    inventoryByCategory.set(
      inventoryCode,
      (inventoryByCategory.get(inventoryCode) || 0) + amount
    );
  }

  for (const [accountCode, amount] of inventoryByCategory.entries()) {
    const inventoryAccount = await getAccountByCode(ctx, accountCode);
    lines.push({
      accountId: inventoryAccount,
      branchId: args.branchId,
      description: `Pembelian persediaan ${args.poNumber}`,
      debitAmount: amount,
      creditAmount: 0,
    });
  }

  // 2. Record input VAT if any
  if (args.taxAmount > 0) {
    const vatInputAccount = await getAccountByCode(ctx, "5-301"); // PPN Masukan
    lines.push({
      accountId: vatInputAccount,
      branchId: args.branchId,
      description: `PPN Masukan ${args.poNumber}`,
      debitAmount: args.taxAmount,
      creditAmount: 0,
    });
  }

  // 3. Record cash payment or accounts payable
  if (args.paid) {
    const cashAccount = await getAccountByCode(ctx, "1-101"); // Kas Besar
    lines.push({
      accountId: cashAccount,
      branchId: args.branchId,
      description: `Pembayaran pembelian ${args.poNumber}`,
      debitAmount: 0,
      creditAmount: args.totalAmount,
    });
  } else {
    const apAccount = await getAccountByCode(ctx, "2-101"); // Hutang Usaha
    lines.push({
      accountId: apAccount,
      branchId: args.branchId,
      description: `Hutang pembelian ${args.poNumber}`,
      debitAmount: 0,
      creditAmount: args.totalAmount,
    });
  }

  // Create journal entry
  const journalEntryId = await ctx.db.insert("journalEntries", {
    journalNumber,
    journalDate: args.orderDate,
    description: `Pembelian ${args.poNumber}`,
    sourceType: "PURCHASE",
    sourceId: args.purchaseOrderId,
    status: "Posted",
    totalDebit: lines.reduce((sum, l) => sum + l.debitAmount, 0),
    totalCredit: lines.reduce((sum, l) => sum + l.creditAmount, 0),
    postedBy: undefined,
    postedAt: Date.now(),
    createdBy: undefined,
  });

  // Create lines
  let sortOrder = 1;
  for (const line of lines) {
    await ctx.db.insert("journalEntryLines", {
      journalEntryId,
      accountId: line.accountId,
      branchId: line.branchId,
      description: line.description,
      debitAmount: line.debitAmount,
      creditAmount: line.creditAmount,
      sortOrder: sortOrder++,
    });
  }

  return journalEntryId;
}

/**
 * Create journal entry for Clinic Appointment
 * 
 * Entry:
 * DR Cash/AR                     (total amount)
 *   CR Service Revenue           (service fees)
 *   CR Product Sales (Medicine)  (if any)
 * DR COGS                        (if inventory used)
 *   CR Inventory                 (if inventory used)
 */
export async function createClinicJournalEntry(
  ctx: any,
  args: {
    appointmentId: string;
    appointmentNumber: string;
    appointmentDate: number;
    branchId: Id<"branches">;
    totalAmount: number;
    paidAmount: number;
    outstandingAmount: number;
    services: Array<{
      serviceName: string;
      subtotal: number;
      cogs?: number;
      category: string; // "Medical", "Grooming", etc.
    }>;
    taxAmount: number;
  }
) {
  const journalNumber = await generateJournalNumber(ctx);

  const getServiceRevenueAccount = (category: string): string => {
    if (category.includes("Medical") || category.includes("Examination")) {
      return "4-121"; // Jasa Pemeriksaan
    } else if (category.includes("Vaccination")) {
      return "4-122"; // Jasa Vaksinasi
    } else if (category.includes("Sterilization")) {
      return "4-123"; // Jasa Sterilisasi
    } else if (category.includes("Grooming")) {
      return "4-131"; // Grooming Basic (default)
    }
    return "4-121"; // Default Medical
  };

  const lines: Array<{
    accountId: Id<"accounts">;
    branchId: Id<"branches">;
    description: string;
    debitAmount: number;
    creditAmount: number;
  }> = [];

  // 1. Record cash/receivable
  if (args.paidAmount > 0) {
    const cashAccount = await getAccountByCode(ctx, "1-101");
    lines.push({
      accountId: cashAccount,
      branchId: args.branchId,
      description: `Penerimaan kas ${args.appointmentNumber}`,
      debitAmount: args.paidAmount,
      creditAmount: 0,
    });
  }

  if (args.outstandingAmount > 0) {
    const arAccount = await getAccountByCode(ctx, "1-120");
    lines.push({
      accountId: arAccount,
      branchId: args.branchId,
      description: `Piutang ${args.appointmentNumber}`,
      debitAmount: args.outstandingAmount,
      creditAmount: 0,
    });
  }

  // 2. Record service revenue by category
  const revenueByCategory = new Map<string, number>();
  let totalCogs = 0;

  for (const service of args.services) {
    const revenueCode = getServiceRevenueAccount(service.category);
    revenueByCategory.set(
      revenueCode,
      (revenueByCategory.get(revenueCode) || 0) + service.subtotal
    );

    if (service.cogs) {
      totalCogs += service.cogs;
    }
  }

  for (const [accountCode, amount] of revenueByCategory.entries()) {
    const revenueAccount = await getAccountByCode(ctx, accountCode);
    lines.push({
      accountId: revenueAccount,
      branchId: args.branchId,
      description: `Pendapatan jasa ${args.appointmentNumber}`,
      debitAmount: 0,
      creditAmount: amount,
    });
  }

  // 3. Record COGS and inventory reduction if any
  if (totalCogs > 0) {
    const cogsAccount = await getAccountByCode(ctx, "5-103"); // HPP Obat & Vitamin
    const inventoryAccount = await getAccountByCode(ctx, "1-133"); // Persediaan Obat

    lines.push({
      accountId: cogsAccount,
      branchId: args.branchId,
      description: `HPP ${args.appointmentNumber}`,
      debitAmount: totalCogs,
      creditAmount: 0,
    });

    lines.push({
      accountId: inventoryAccount,
      branchId: args.branchId,
      description: `Pengurangan persediaan ${args.appointmentNumber}`,
      debitAmount: 0,
      creditAmount: totalCogs,
    });
  }

  // 4. Record tax if any
  if (args.taxAmount > 0) {
    const taxAccount = await getAccountByCode(ctx, "2-111");
    lines.push({
      accountId: taxAccount,
      branchId: args.branchId,
      description: `PPN ${args.appointmentNumber}`,
      debitAmount: 0,
      creditAmount: args.taxAmount,
    });
  }

  // Create journal entry
  const journalEntryId = await ctx.db.insert("journalEntries", {
    journalNumber,
    journalDate: args.appointmentDate,
    description: `Jasa klinik ${args.appointmentNumber}`,
    sourceType: "CLINIC",
    sourceId: args.appointmentId,
    status: "Posted",
    totalDebit: lines.reduce((sum, l) => sum + l.debitAmount, 0),
    totalCredit: lines.reduce((sum, l) => sum + l.creditAmount, 0),
    postedBy: undefined,
    postedAt: Date.now(),
    createdBy: undefined,
  });

  let sortOrder = 1;
  for (const line of lines) {
    await ctx.db.insert("journalEntryLines", {
      journalEntryId,
      accountId: line.accountId,
      branchId: line.branchId,
      description: line.description,
      debitAmount: line.debitAmount,
      creditAmount: line.creditAmount,
      sortOrder: sortOrder++,
    });
  }

  return journalEntryId;
}

/**
 * Create journal entry for Payment Received (AR collection)
 * 
 * Entry:
 * DR Cash/Bank         (amount)
 *   CR Accounts Receivable (amount)
 */
export async function createPaymentReceivedJournalEntry(
  ctx: any,
  args: {
    paymentId: string;
    paymentDate: number;
    amount: number;
    paymentMethod: string;
    referenceNumber?: string;
    customerId: Id<"customers">;
    branchId?: Id<"branches">;
  }
) {
  const journalNumber = await generateJournalNumber(ctx);

  // Determine cash/bank account based on payment method
  let cashAccountCode = "1-101"; // Default: Kas Besar
  if (args.paymentMethod === "BANK_TRANSFER") {
    cashAccountCode = "1-111"; // Bank BCA (default)
  } else if (args.paymentMethod === "QRIS") {
    cashAccountCode = "1-111"; // Bank account for QRIS
  }

  const cashAccount = await getAccountByCode(ctx, cashAccountCode);
  const arAccount = await getAccountByCode(ctx, "1-120"); // Piutang Usaha

  const lines: Array<{
    accountId: Id<"accounts">;
    branchId?: Id<"branches">;
    description: string;
    debitAmount: number;
    creditAmount: number;
  }> = [];

  // DR Cash/Bank
  lines.push({
    accountId: cashAccount,
    branchId: args.branchId,
    description: `Penerimaan pembayaran ${args.referenceNumber || ""}`,
    debitAmount: args.amount,
    creditAmount: 0,
  });

  // CR Accounts Receivable
  lines.push({
    accountId: arAccount,
    branchId: args.branchId,
    description: `Pelunasan piutang`,
    debitAmount: 0,
    creditAmount: args.amount,
  });

  // Create journal entry
  const journalEntryId = await ctx.db.insert("journalEntries", {
    journalNumber,
    journalDate: args.paymentDate,
    description: `Penerimaan pembayaran piutang`,
    sourceType: "PAYMENT",
    sourceId: args.paymentId,
    status: "Posted",
    totalDebit: args.amount,
    totalCredit: args.amount,
    postedBy: undefined,
    postedAt: Date.now(),
    createdBy: undefined,
  });

  let sortOrder = 1;
  for (const line of lines) {
    await ctx.db.insert("journalEntryLines", {
      journalEntryId,
      accountId: line.accountId,
      branchId: line.branchId,
      description: line.description,
      debitAmount: line.debitAmount,
      creditAmount: line.creditAmount,
      sortOrder: sortOrder++,
    });
  }

  return journalEntryId;
}

/**
 * Create journal entry for Hotel Booking (Check-out) - INVOICE / REVENUE RECOGNITION
 * 
 * Entry:
 * DR Accounts Receivable (Total Amount)
 *   CR Hotel Revenue     (room total)
 *   CR Service Revenue   (services total)
 *   CR Product Sales     (consumables total)
 *   CR Tax Payable       (tax amount)
 *   CR/DR Discount       (if any)
 * DR COGS                (consumables cost)
 *   CR Inventory         (consumables cost)
 * 
 * Note: Payments are recorded separately via createPaymentReceivedJournalEntry
 */
export async function createHotelJournalEntry(
  ctx: any,
  args: {
    bookingId: string;
    bookingNumber: string;
    checkOutDate: number;
    branchId: Id<"branches">;
    totalAmount: number;
    paidAmount: number; // Unused for JE, but kept for interface
    outstandingAmount: number; // Unused for JE
    roomTotal: number;
    servicesTotal: number;
    consumablesTotal: number;
    consumablesCost: number; // COGS for consumables
    discountAmount: number;
    taxAmount: number;
  }
) {
  const journalNumber = await generateJournalNumber(ctx);

  const lines: Array<{
    accountId: Id<"accounts">;
    branchId: Id<"branches">;
    description: string;
    debitAmount: number;
    creditAmount: number;
  }> = [];

  // 1. Debit Accounts Receivable (Full Amount)
  // We treat the checkout as generating an Invoice for the full amount.
  // Payments (Deposits + Final) will Credit AR.
  const arAccount = await getAccountByCode(ctx, "1-120"); // Piutang Usaha
  lines.push({
    accountId: arAccount,
    branchId: args.branchId,
    description: `Tagihan hotel ${args.bookingNumber}`,
    debitAmount: args.totalAmount,
    creditAmount: 0,
  });

  // 2. Record Revenue
  // Room Revenue
  if (args.roomTotal > 0) {
    const roomRevenueAccount = await getAccountByCode(ctx, "4-140"); // Pendapatan Hotel Hewan
    lines.push({
      accountId: roomRevenueAccount,
      branchId: args.branchId,
      description: `Pendapatan kamar ${args.bookingNumber}`,
      debitAmount: 0,
      creditAmount: args.roomTotal,
    });
  }

  // Service Revenue
  if (args.servicesTotal > 0) {
    const serviceRevenueAccount = await getAccountByCode(ctx, "4-140"); // Use Hotel Revenue for simplicity
    lines.push({
      accountId: serviceRevenueAccount,
      branchId: args.branchId,
      description: `Pendapatan jasa hotel ${args.bookingNumber}`,
      debitAmount: 0,
      creditAmount: args.servicesTotal,
    });
  }

  // Consumables Revenue (Sales)
  if (args.consumablesTotal > 0) {
    const productRevenueAccount = await getAccountByCode(ctx, "4-111"); // Penjualan Makanan Hewan (Default)
    lines.push({
      accountId: productRevenueAccount,
      branchId: args.branchId,
      description: `Pendapatan consumables ${args.bookingNumber}`,
      debitAmount: 0,
      creditAmount: args.consumablesTotal,
    });
  }

  // 3. Record COGS for Consumables
  if (args.consumablesCost > 0) {
    const cogsAccount = await getAccountByCode(ctx, "5-101"); // HPP Makanan
    const inventoryAccount = await getAccountByCode(ctx, "1-131"); // Persediaan Makanan

    lines.push({
      accountId: cogsAccount,
      branchId: args.branchId,
      description: `HPP Consumables ${args.bookingNumber}`,
      debitAmount: args.consumablesCost,
      creditAmount: 0,
    });

    lines.push({
      accountId: inventoryAccount,
      branchId: args.branchId,
      description: `Pengurangan persediaan ${args.bookingNumber}`,
      debitAmount: 0,
      creditAmount: args.consumablesCost,
    });
  }

  // 4. Record Tax
  if (args.taxAmount > 0) {
    const taxAccount = await getAccountByCode(ctx, "2-111"); // PPN Keluaran
    lines.push({
      accountId: taxAccount,
      branchId: args.branchId,
      description: `PPN ${args.bookingNumber}`,
      debitAmount: 0,
      creditAmount: args.taxAmount,
    });
  }

  // 5. Handle Discount (Debit)
  if (args.discountAmount > 0) {
    const discountAccount = await getAccountByCode(ctx, "5-212"); // Beban Lain-lain (as Sales Discount)
    lines.push({
      accountId: discountAccount,
      branchId: args.branchId,
      description: `Diskon ${args.bookingNumber}`,
      debitAmount: args.discountAmount,
      creditAmount: 0,
    });
  }

  // Create journal entry
  const journalEntryId = await ctx.db.insert("journalEntries", {
    journalNumber,
    journalDate: args.checkOutDate,
    description: `Hotel Checkout Invoice ${args.bookingNumber}`,
    sourceType: "HOTEL",
    sourceId: args.bookingId,
    status: "Posted",
    totalDebit: lines.reduce((sum, l) => sum + l.debitAmount, 0),
    totalCredit: lines.reduce((sum, l) => sum + l.creditAmount, 0),
    postedBy: undefined,
    postedAt: Date.now(),
    createdBy: undefined,
  });

  let sortOrder = 1;
  for (const line of lines) {
    await ctx.db.insert("journalEntryLines", {
      journalEntryId,
      accountId: line.accountId,
      branchId: line.branchId,
      description: line.description,
      debitAmount: line.debitAmount,
      creditAmount: line.creditAmount,
      sortOrder: sortOrder++,
    });
  }

  return journalEntryId;
}

/**
 * Create journal entry for Stock Adjustment
 * 
 * Entry (IN):
 * DR Inventory
 *   CR COGS (Recovery) or Other Income
 * 
 * Entry (OUT):
 * DR COGS (Shrinkage) or Expense
 *   CR Inventory
 */
export async function createStockAdjustmentJournalEntry(
  ctx: any,
  args: {
    adjustmentId: string;
    branchId: Id<"branches">;
    adjustmentDate: number;
    description: string;
    items: Array<{
      productName: string;
      category: string;
      quantity: number; // Positive (IN) or Negative (OUT)
      cost: number; // Total cost (abs(qty) * avgCost)
    }>;
  }
) {
  const journalNumber = await generateJournalNumber(ctx);

  const getInventoryAccount = (category: string): string => {
    if (category.includes("Pet Food") || category.includes("Food")) return "1-131";
    if (category.includes("Medicine") || category.includes("Vitamin")) return "1-133";
    if (category.includes("Vaccine")) return "1-134";
    if (category.includes("Accessories")) return "1-132";
    if (category.includes("Grooming")) return "1-135";
    return "1-131";
  };

  const getCogsAccount = (category: string): string => {
    if (category.includes("Pet Food") || category.includes("Food")) return "5-101";
    if (category.includes("Medicine") || category.includes("Vitamin")) return "5-103";
    if (category.includes("Vaccine")) return "5-104";
    if (category.includes("Accessories")) return "5-102";
    return "5-101";
  };

  const lines: Array<{
    accountId: Id<"accounts">;
    branchId: Id<"branches">;
    description: string;
    debitAmount: number;
    creditAmount: number;
  }> = [];

  for (const item of args.items) {
    const inventoryCode = getInventoryAccount(item.category);
    const cogsCode = getCogsAccount(item.category);

    const inventoryAccount = await getAccountByCode(ctx, inventoryCode);
    const cogsAccount = await getAccountByCode(ctx, cogsCode);

    if (item.quantity > 0) {
      // ADJUSTMENT IN (Found stock)
      // DR Inventory
      lines.push({
        accountId: inventoryAccount,
        branchId: args.branchId,
        description: `Penyesuaian stok masuk: ${item.productName}`,
        debitAmount: item.cost,
        creditAmount: 0,
      });
      // CR COGS (Reduce cost)
      lines.push({
        accountId: cogsAccount,
        branchId: args.branchId,
        description: `Koreksi stok masuk: ${item.productName}`,
        debitAmount: 0,
        creditAmount: item.cost,
      });
    } else {
      // ADJUSTMENT OUT (Lost/Damaged)
      // DR COGS (Increase cost/loss)
      lines.push({
        accountId: cogsAccount,
        branchId: args.branchId,
        description: `Penyesuaian stok keluar: ${item.productName}`,
        debitAmount: item.cost,
        creditAmount: 0,
      });
      // CR Inventory
      lines.push({
        accountId: inventoryAccount,
        branchId: args.branchId,
        description: `Koreksi stok keluar: ${item.productName}`,
        debitAmount: 0,
        creditAmount: item.cost,
      });
    }
  }

  // Create journal entry
  const journalEntryId = await ctx.db.insert("journalEntries", {
    journalNumber,
    journalDate: args.adjustmentDate,
    description: args.description,
    sourceType: "ADJUSTMENT",
    sourceId: args.adjustmentId,
    status: "Posted",
    totalDebit: lines.reduce((sum, l) => sum + l.debitAmount, 0),
    totalCredit: lines.reduce((sum, l) => sum + l.creditAmount, 0),
    postedBy: undefined,
    postedAt: Date.now(),
    createdBy: undefined,
  });

  let sortOrder = 1;
  for (const line of lines) {
    await ctx.db.insert("journalEntryLines", {
      journalEntryId,
      accountId: line.accountId,
      branchId: line.branchId,
      description: line.description,
      debitAmount: line.debitAmount,
      creditAmount: line.creditAmount,
      sortOrder: sortOrder++,
    });
  }

  return journalEntryId;
}
