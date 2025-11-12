# 💰 Accounting Module Documentation - Pet Shop Management System

Comprehensive documentation for the Accounting module, covering financial management, double-entry bookkeeping, reporting, and compliance features specifically designed for pet shop operations.

## 📋 Table of Contents

- [Module Overview](#module-overview)
- [Chart of Accounts](#chart-of-accounts)
- [Double-Entry Bookkeeping](#double-entry-bookkeeping)
- [Journal Entry Management](#journal-entry-management)
- [Financial Reports](#financial-reports)
- [Bank Management](#bank-management)
- [Expense Management](#expense-management)
- [Accounts Receivable](#accounts-receivable)
- [Period Management](#period-management)
- [Integration with Business Modules](#integration-with-business-modules)

## 🎯 Module Overview

The Accounting module provides a complete financial management system with professional-grade double-entry bookkeeping, designed specifically for pet shop operations. It includes Indonesian Chart of Accounts, automated journal generation, and comprehensive financial reporting.

### Key Features

- **Double-Entry Bookkeeping**: Professional accounting standards
- **Indonesian Chart of Accounts**: 80+ pre-configured accounts
- **Automated Journal Entries**: Integration with sales, purchases, clinic, and hotel
- **Real-time Financial Reports**: Balance Sheet, Income Statement, Cash Flow
- **Bank Integration**: Account management and reconciliation
- **Expense Management**: Approval workflows and categorization
- **Multi-branch Support**: Consolidated or branch-specific reporting

### Business Benefits

- **Financial Compliance**: Professional accounting standards
- **Automated Processes**: Reduce manual data entry and errors
- **Real-time Insights**: Instant financial visibility
- **Audit Trail**: Complete transaction history
- **Tax Compliance**: Indonesian tax regulations support

## 📊 Chart of Accounts

### Account Structure

#### Indonesian Standard Accounts
```typescript
interface Account {
  id: string;
  accountCode: string;        // "1-111", "4-121"
  accountName: string;        // "Kas", "Penjualan Makanan"
  accountType: AccountType;   // ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE
  category: string;           // "Current Asset", "Operating Revenue"
  
  // Hierarchy
  parentAccountId?: string;
  level: number;              // 1=main, 2=sub, 3=detail
  isHeader: boolean;          // true = group account (no posting)
  
  // Accounting Properties
  normalBalance: "DEBIT" | "CREDIT";
  isActive: boolean;
  taxable?: boolean;          // For tax reporting
  
  // Pet Shop Specific
  petShopCategory?: PetShopCategory;
  businessUnit?: string;      // RETAIL, CLINIC, HOTEL
  
  createdAt: number;
  updatedAt: number;
}

enum AccountType {
  ASSET = "ASSET",
  LIABILITY = "LIABILITY", 
  EQUITY = "EQUITY",
  REVENUE = "REVENUE",
  EXPENSE = "EXPENSE"
}

enum PetShopCategory {
  RETAIL_SALES = "RETAIL_SALES",
  CLINIC_SERVICES = "CLINIC_SERVICES",
  HOTEL_SERVICES = "HOTEL_SERVICES",
  INVENTORY = "INVENTORY",
  OPERATING_EXPENSES = "OPERATING_EXPENSES"
}
```

#### Account Hierarchy
```
ASSET (1-xxx)
├── Current Assets (1-1xx)
│   ├── 1-111 Cash on Hand
│   ├── 1-121 Bank Accounts
│   ├── 1-131 Inventory - Pet Food
│   ├── 1-132 Inventory - Accessories  
│   ├── 1-133 Inventory - Medications
│   ├── 1-141 Accounts Receivable
│   └── 1-151 Prepaid Expenses
└── Fixed Assets (1-2xx)
    ├── 1-211 Equipment
    ├── 1-221 Furniture & Fixtures
    └── 1-231 Vehicles

LIABILITY (2-xxx)
├── Current Liabilities (2-1xx)
│   ├── 2-111 Accounts Payable
│   ├── 2-121 Sales Tax Payable
│   └── 2-131 Accrued Expenses
└── Long-term Liabilities (2-2xx)
    └── 2-211 Bank Loans

EQUITY (3-xxx)
├── 3-111 Owner's Equity
└── 3-121 Retained Earnings

REVENUE (4-xxx)
├── Operating Revenue (4-1xx)
│   ├── 4-111 Sales - Pet Food
│   ├── 4-112 Sales - Accessories
│   ├── 4-121 Veterinary Services
│   ├── 4-131 Grooming Services
│   └── 4-141 Boarding Revenue
└── Other Revenue (4-2xx)
    └── 4-211 Interest Income

EXPENSE (5-xxx)
├── Cost of Goods Sold (5-1xx)
│   ├── 5-111 COGS - Pet Food
│   ├── 5-112 COGS - Accessories
│   └── 5-113 COGS - Medications
├── Operating Expenses (5-2xx)
│   ├── 5-211 Salaries & Wages
│   ├── 5-221 Rent Expense
│   ├── 5-231 Utilities
│   └── 5-241 Marketing Expense
└── Other Expenses (5-3xx)
    └── 5-311 Interest Expense
```

### Pet Shop-Specific Accounts

#### Specialized Inventory Accounts
```typescript
const PET_SHOP_INVENTORY_ACCOUNTS = [
  {
    code: "1-131",
    name: "Persediaan Makanan Hewan",
    category: "Current Asset",
    type: "ASSET",
    subcategory: "Inventory",
    petShopCategory: "INVENTORY",
    normalBalance: "DEBIT"
  },
  {
    code: "1-132", 
    name: "Persediaan Aksesoris Hewan",
    category: "Current Asset",
    type: "ASSET",
    subcategory: "Inventory",
    petShopCategory: "INVENTORY",
    normalBalance: "DEBIT"
  },
  {
    code: "1-133",
    name: "Persediaan Obat & Vitamin",
    category: "Current Asset", 
    type: "ASSET",
    subcategory: "Inventory",
    petShopCategory: "INVENTORY",
    normalBalance: "DEBIT"
  },
  {
    code: "1-134",
    name: "Persediaan Vaksin",
    category: "Current Asset",
    type: "ASSET", 
    subcategory: "Inventory",
    petShopCategory: "INVENTORY",
    normalBalance: "DEBIT"
  },
  {
    code: "1-135",
    name: "Persediaan Grooming Supplies",
    category: "Current Asset",
    type: "ASSET",
    subcategory: "Inventory", 
    petShopCategory: "INVENTORY",
    normalBalance: "DEBIT"
  }
];
```

#### Revenue Accounts by Service Type
```typescript
const PET_SHOP_REVENUE_ACCOUNTS = [
  // Retail Sales
  {
    code: "4-111",
    name: "Penjualan Makanan Hewan",
    category: "Operating Revenue",
    type: "REVENUE",
    businessUnit: "RETAIL",
    petShopCategory: "RETAIL_SALES"
  },
  {
    code: "4-112",
    name: "Penjualan Aksesoris",
    category: "Operating Revenue", 
    type: "REVENUE",
    businessUnit: "RETAIL",
    petShopCategory: "RETAIL_SALES"
  },
  {
    code: "4-113",
    name: "Penjualan Obat & Vitamin",
    category: "Operating Revenue",
    type: "REVENUE",
    businessUnit: "RETAIL", 
    petShopCategory: "RETAIL_SALES"
  },
  
  // Clinic Services
  {
    code: "4-121",
    name: "Jasa Pemeriksaan & Konsultasi",
    category: "Operating Revenue",
    type: "REVENUE",
    businessUnit: "CLINIC",
    petShopCategory: "CLINIC_SERVICES"
  },
  {
    code: "4-122",
    name: "Jasa Vaksinasi",
    category: "Operating Revenue",
    type: "REVENUE", 
    businessUnit: "CLINIC",
    petShopCategory: "CLINIC_SERVICES"
  },
  {
    code: "4-123",
    name: "Jasa Sterilisasi",
    category: "Operating Revenue",
    type: "REVENUE",
    businessUnit: "CLINIC",
    petShopCategory: "CLINIC_SERVICES"
  },
  
  // Grooming Services
  {
    code: "4-131",
    name: "Grooming Basic",
    category: "Operating Revenue",
    type: "REVENUE",
    businessUnit: "CLINIC",
    petShopCategory: "CLINIC_SERVICES"
  },
  {
    code: "4-132",
    name: "Grooming Premium",
    category: "Operating Revenue",
    type: "REVENUE",
    businessUnit: "CLINIC", 
    petShopCategory: "CLINIC_SERVICES"
  },
  
  // Hotel Services
  {
    code: "4-140",
    name: "Pendapatan Hotel Hewan",
    category: "Operating Revenue",
    type: "REVENUE",
    businessUnit: "HOTEL",
    petShopCategory: "HOTEL_SERVICES"
  }
];
```

### Account Management

#### Account Tree Structure
```typescript
const getAccountTree = async (accountType?: AccountType): Promise<AccountTreeNode[]> => {
  let query = ctx.db.query("accounts").withIndex("by_active");
  
  if (accountType) {
    query = query.filter(account => account.accountType === accountType);
  }
  
  const accounts = await query.collect();
  
  // Build hierarchical tree
  const buildTree = (parentId?: string): AccountTreeNode[] => {
    const children = accounts
      .filter(account => account.parentAccountId === parentId)
      .sort((a, b) => a.accountCode.localeCompare(b.accountCode))
      .map(account => ({
        account,
        children: buildTree(account._id)
      }));
    
    return children;
  };
  
  return buildTree();
};

const createAccount = async (accountData: {
  accountCode: string;
  accountName: string;
  accountType: AccountType;
  category: string;
  parentAccountId?: string;
  normalBalance: "DEBIT" | "CREDIT";
  level: number;
  isHeader: boolean;
  petShopCategory?: PetShopCategory;
}) => {
  // Validate account code uniqueness
  const existingAccount = await ctx.db
    .query("accounts")
    .withIndex("by_code", q => q.eq("accountCode", accountData.accountCode))
    .unique();
    
  if (existingAccount) {
    throw new Error(`Account code ${accountData.accountCode} already exists`);
  }
  
  // Validate parent account if specified
  if (accountData.parentAccountId) {
    const parentAccount = await ctx.db.get(accountData.parentAccountId);
    if (!parentAccount) {
      throw new Error("Parent account not found");
    }
    
    if (parentAccount.isHeader !== true) {
      throw new Error("Parent account must be a header account");
    }
  }
  
  // Create account
  const account = await ctx.db.insert("accounts", {
    ...accountData,
    isActive: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  });
  
  return account;
};
```

## 📝 Double-Entry Bookkeeping

### Journal Entry Structure

#### Core Components
```typescript
interface JournalEntry {
  id: string;
  journalNumber: string;      // "JE-20251112-001"
  journalDate: number;        // Transaction date
  description: string;        // Transaction description
  sourceType: SourceType;     // SALE, PURCHASE, EXPENSE, PAYMENT, CLINIC, HOTEL, MANUAL
  sourceId?: string;          // Reference to source transaction ID
  
  // Status and Control
  status: "DRAFT" | "POSTED" | "VOIDED";
  totalDebit: number;
  totalCredit: number;
  
  // Approval Workflow
  approvedBy?: string;
  approvedAt?: number;
  voidedBy?: string;
  voidedAt?: number;
  voidReason?: string;
  
  // Audit Trail
  createdBy: string;
  createdAt: number;
  updatedAt: number;
  
  // Lines
  lines: JournalEntryLine[];
}

interface JournalEntryLine {
  id: string;
  journalEntryId: string;
  accountId: string;
  branchId?: string;          // For branch-level reporting
  
  // Line Details
  description?: string;       // Line-level notes
  debitAmount: number;        // 0 if credit entry
  creditAmount: number;       // 0 if debit entry
  sortOrder: number;          // Display order
  
  // Reference Data
  referenceType?: string;     // "invoice", "receipt", "check"
  referenceNumber?: string;   // Document number
  
  createdAt: number;
}

enum SourceType {
  SALE = "SALE",
  PURCHASE = "PURCHASE", 
  EXPENSE = "EXPENSE",
  PAYMENT = "PAYMENT",
  CLINIC = "CLINIC",
  HOTEL = "HOTEL",
  BANK = "BANK",
  ADJUSTMENT = "ADJUSTMENT",
  MANUAL = "MANUAL"
}
```

### Automated Journal Generation

#### Sales Transaction Journal
```typescript
const createSaleJournalEntry = async (
  saleData: SaleJournalData
): Promise<JournalEntry> => {
  const { saleId, saleNumber, saleDate, branchId, totalAmount, paidAmount, outstandingAmount, items } = saleData;
  
  // Get accounting accounts
  const cashAccount = await getAccountByCode("1-111");      // Cash on Hand
  const arAccount = await getAccountByCode("1-141");        // Accounts Receivable
  const salesRevenueAccounts = await getRevenueAccountsByCategory();
  
  const lines: JournalEntryLine[] = [];
  let lineNumber = 1;
  
  // 1. Record Revenue by Category
  const revenueByCategory = groupItemsByRevenueCategory(items);
  
  for (const [category, categoryTotal] of Object.entries(revenueByCategory)) {
    const revenueAccount = salesRevenueAccounts[category];
    if (!revenueAccount) {
      throw new Error(`No revenue account found for category: ${category}`);
    }
    
    lines.push({
      journalEntryId: "", // Will be set after JE creation
      accountId: revenueAccount._id,
      branchId,
      description: `${saleNumber} - ${category}`,
      debitAmount: 0,
      creditAmount: categoryTotal,
      sortOrder: lineNumber++
    });
  }
  
  // 2. Record Cash Received
  if (paidAmount > 0) {
    const cashAccountToUse = cashAccount || arAccount; // Use AR if no cash account
    
    lines.push({
      journalEntryId: "",
      accountId: cashAccountToUse._id,
      branchId,
      description: `${saleNumber} - Cash received`,
      debitAmount: paidAmount,
      creditAmount: 0,
      sortOrder: lineNumber++
    });
  }
  
  // 3. Record Accounts Receivable
  if (outstandingAmount > 0) {
    lines.push({
      journalEntryId: "",
      accountId: arAccount._id,
      branchId,
      description: `${saleNumber} - Outstanding`,
      debitAmount: outstandingAmount,
      creditAmount: 0,
      sortOrder: lineNumber++
    });
  }
  
  // 4. Record Cost of Goods Sold
  const cogsByCategory = calculateCOGSByCategory(items);
  
  for (const [category, cogsTotal] of Object.entries(cogsByCategory)) {
    const cogsAccount = await getCOGSAccountByCategory(category);
    const inventoryAccount = await getInventoryAccountByCategory(category);
    
    // Debit COGS
    lines.push({
      journalEntryId: "",
      accountId: cogsAccount._id,
      branchId,
      description: `${saleNumber} - COGS ${category}`,
      debitAmount: cogsTotal,
      creditAmount: 0,
      sortOrder: lineNumber++
    });
    
    // Credit Inventory
    lines.push({
      journalEntryId: "",
      accountId: inventoryAccount._id,
      branchId,
      description: `${saleNumber} - Inventory reduction ${category}`,
      debitAmount: 0,
      creditAmount: cogsTotal,
      sortOrder: lineNumber++
    });
  }
  
  // Create journal entry
  const journalEntry = await createJournalEntry({
    journalNumber: await generateJournalNumber(ctx),
    journalDate: saleDate,
    description: `Sale ${saleNumber} - ${items.length} items`,
    sourceType: "SALE",
    sourceId: saleId,
    lines
  });
  
  return journalEntry;
};
```

#### Purchase Transaction Journal
```typescript
const createPurchaseJournalEntry = async (
  purchaseData: PurchaseJournalData
): Promise<JournalEntry> => {
  const { purchaseOrderId, poNumber, orderDate, branchId, totalAmount, items, taxAmount } = purchaseData;
  
  const inventoryAccounts = await getInventoryAccounts();
  const apAccount = await getAccountByCode("2-111");  // Accounts Payable
  const cashAccount = await getAccountByCode("1-111"); // Cash on Hand
  const vatInputAccount = await getAccountByCode("1-152"); // VAT Input
  
  const lines: JournalEntryLine[] = [];
  let lineNumber = 1;
  
  // 1. Record Inventory by Category
  const inventoryByCategory = groupItemsByInventoryCategory(items);
  
  for (const [category, categoryTotal] of Object.entries(inventoryByCategory)) {
    const inventoryAccount = inventoryAccounts[category];
    if (!inventoryAccount) {
      throw new Error(`No inventory account found for category: ${category}`);
    }
    
    lines.push({
      journalEntryId: "",
      accountId: inventoryAccount._id,
      branchId,
      description: `${poNumber} - Inventory ${category}`,
      debitAmount: categoryTotal,
      creditAmount: 0,
      sortOrder: lineNumber++
    });
  }
  
  // 2. Record VAT Input (if applicable)
  if (taxAmount > 0) {
    lines.push({
      journalEntryId: "",
      accountId: vatInputAccount._id,
      branchId,
      description: `${poNumber} - VAT Input`,
      debitAmount: taxAmount,
      creditAmount: 0,
      sortOrder: lineNumber++
    });
  }
  
  // 3. Record Payable or Cash Outflow
  const totalLiability = totalAmount + taxAmount;
  
  lines.push({
    journalEntryId: "",
    accountId: apAccount._id, // or cashAccount._id if paid immediately
    branchId,
    description: `${poNumber} - ${purchaseData.paid ? 'Cash paid' : 'Payable'}`,
    debitAmount: 0,
    creditAmount: totalLiability,
    sortOrder: lineNumber++
  });
  
  const journalEntry = await createJournalEntry({
    journalNumber: await generateJournalNumber(ctx),
    journalDate: orderDate,
    description: `Purchase ${poNumber} - ${items.length} items`,
    sourceType: "PURCHASE",
    sourceId: purchaseOrderId,
    lines
  });
  
  return journalEntry;
};
```

#### Clinic Service Journal
```typescript
const createClinicJournalEntry = async (
  clinicData: ClinicJournalData
): Promise<JournalEntry> => {
  const { appointmentId, appointmentNumber, appointmentDate, branchId, totalAmount, paidAmount, outstandingAmount, services } = clinicData;
  
  const cashAccount = await getAccountByCode("1-111");
  const arAccount = await getAccountByCode("1-141");
  const serviceRevenueAccounts = await getClinicServiceAccounts();
  
  const lines: JournalEntryLine[] = [];
  let lineNumber = 1;
  
  // 1. Record Service Revenue by Category
  const revenueByService = groupServicesByRevenueCategory(services);
  
  for (const [serviceCategory, serviceTotal] of Object.entries(revenueByService)) {
    const revenueAccount = serviceRevenueAccounts[serviceCategory];
    if (!revenueAccount) {
      throw new Error(`No revenue account found for service category: ${serviceCategory}`);
    }
    
    lines.push({
      journalEntryId: "",
      accountId: revenueAccount._id,
      branchId,
      description: `${appointmentNumber} - ${serviceCategory}`,
      debitAmount: 0,
      creditAmount: serviceTotal,
      sortOrder: lineNumber++
    });
  }
  
  // 2. Record Cash/AR
  if (paidAmount > 0) {
    lines.push({
      journalEntryId: "",
      accountId: cashAccount._id,
      branchId,
      description: `${appointmentNumber} - Payment received`,
      debitAmount: paidAmount,
      creditAmount: 0,
      sortOrder: lineNumber++
    });
  }
  
  if (outstandingAmount > 0) {
    lines.push({
      journalEntryId: "",
      accountId: arAccount._id,
      branchId,
      description: `${appointmentNumber} - Outstanding`,
      debitAmount: outstandingAmount,
      creditAmount: 0,
      sortOrder: lineNumber++
    });
  }
  
  // 3. Record COGS for Medical Supplies Used
  const cogsForSupplies = calculateServiceCOGS(services);
  if (cogsForSupplies > 0) {
    const cogsAccount = await getAccountByCode("5-113"); // COGS - Medications
    const suppliesInventoryAccount = await getAccountByCode("1-133"); // Inventory - Medications
    
    lines.push({
      journalEntryId: "",
      accountId: cogsAccount._id,
      branchId,
      description: `${appointmentNumber} - Medical supplies COGS`,
      debitAmount: cogsForSupplies,
      creditAmount: 0,
      sortOrder: lineNumber++
    });
    
    lines.push({
      journalEntryId: "",
      accountId: suppliesInventoryAccount._id,
      branchId,
      description: `${appointmentNumber} - Medical supplies used`,
      debitAmount: 0,
      creditAmount: cogsForSupplies,
      sortOrder: lineNumber++
    });
  }
  
  const journalEntry = await createJournalEntry({
    journalNumber: await generateJournalNumber(ctx),
    journalDate: appointmentDate,
    description: `Clinic ${appointmentNumber} - ${services.length} services`,
    sourceType: "CLINIC",
    sourceId: appointmentId,
    lines
  });
  
  return journalEntry;
};
```

## 📊 Financial Reports

### Balance Sheet

#### Real-time Balance Sheet Generation
```typescript
interface BalanceSheet {
  asOfDate: number;
  assets: {
    currentAssets: AccountBalance[];
    fixedAssets: AccountBalance[];
    totalAssets: number;
  };
  liabilities: {
    currentLiabilities: AccountBalance[];
    longTermLiabilities: AccountBalance[];
    totalLiabilities: number;
  };
  equity: {
    items: AccountBalance[];
    totalEquity: number;
  };
  totalLiabilitiesAndEquity: number;
  
  // Comparative data (optional)
  comparative?: {
    previousPeriodAssets: number;
    previousPeriodLiabilities: number;
    previousPeriodEquity: number;
    assetsChange: number;
    liabilitiesChange: number;
    equityChange: number;
  };
}

const generateBalanceSheet = async (
  asOfDate: number,
  branchId?: string,
  comparative: boolean = false,
  priorDate?: number
): Promise<BalanceSheet> => {
  const accounts = await ctx.db
    .query("accounts")
    .withIndex("by_active", q => q.eq("isActive", true))
    .collect();
  
  const journalLines = await ctx.db
    .query("journalEntryLines")
    .withIndex("by_date_account", q => 
      q.lte("createdAt", asOfDate)
    )
    .filter(line => {
      // Filter by branch if specified
      if (branchId && line.branchId !== branchId) return false;
      
      // Only include posted entries
      const journalEntry = line.journalEntryId;
      return journalEntry?.status === "POSTED";
    })
    .collect();
  
  // Calculate account balances
  const accountBalances = new Map<string, number>();
  
  for (const line of journalLines) {
    const currentBalance = accountBalances.get(line.accountId) || 0;
    accountBalances.set(line.accountId, currentBalance + line.debitAmount - line.creditAmount);
  }
  
  // Categorize accounts
  const assets = accounts.filter(acc => acc.accountType === "ASSET");
  const liabilities = accounts.filter(acc => acc.accountType === "LIABILITY");
  const equity = accounts.filter(acc => acc.accountType === "EQUITY");
  
  // Build balance sheet sections
  const currentAssets = assets
    .filter(acc => acc.category.includes("Current"))
    .map(acc => ({
      account: acc,
      balance: accountBalances.get(acc._id) || 0
    }))
    .filter(item => item.balance !== 0);
  
  const fixedAssets = assets
    .filter(acc => acc.category.includes("Fixed"))
    .map(acc => ({
      account: acc,
      balance: accountBalances.get(acc._id) || 0
    }))
    .filter(item => item.balance !== 0);
  
  const currentLiabilities = liabilities
    .filter(acc => acc.category.includes("Current"))
    .map(acc => ({
      account: acc,
      balance: accountBalances.get(acc._id) || 0
    }))
    .filter(item => item.balance !== 0);
  
  const longTermLiabilities = liabilities
    .filter(acc => acc.category.includes("Long-term"))
    .map(acc => ({
      account: acc,
      balance: accountBalances.get(acc._id) || 0
    }))
    .filter(item => item.balance !== 0);
  
  const equityItems = equity
    .map(acc => ({
      account: acc,
      balance: accountBalances.get(acc._id) || 0
    }))
    .filter(item => item.balance !== 0);
  
  // Calculate totals
  const totalCurrentAssets = currentAssets.reduce((sum, item) => sum + Math.abs(item.balance), 0);
  const totalFixedAssets = fixedAssets.reduce((sum, item) => sum + Math.abs(item.balance), 0);
  const totalAssets = totalCurrentAssets + totalFixedAssets;
  
  const totalCurrentLiabilities = currentLiabilities.reduce((sum, item) => sum + Math.abs(item.balance), 0);
  const totalLongTermLiabilities = longTermLiabilities.reduce((sum, item) => sum + Math.abs(item.balance), 0);
  const totalLiabilities = totalCurrentLiabilities + totalLongTermLiabilities;
  
  const totalEquity = equityItems.reduce((sum, item) => sum + item.balance, 0);
  const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;
  
  // Prepare result
  const balanceSheet: BalanceSheet = {
    asOfDate,
    assets: {
      currentAssets,
      fixedAssets,
      totalAssets
    },
    liabilities: {
      currentLiabilities,
      longTermLiabilities,
      totalLiabilities
    },
    equity: {
      items: equityItems,
      totalEquity
    },
    totalLiabilitiesAndEquity
  };
  
  // Add comparative data if requested
  if (comparative && priorDate) {
    const priorBalanceSheet = await generateBalanceSheet(priorDate, branchId, false);
    
    balanceSheet.comparative = {
      previousPeriodAssets: priorBalanceSheet.assets.totalAssets,
      previousPeriodLiabilities: priorBalanceSheet.liabilities.totalLiabilities,
      previousPeriodEquity: priorBalanceSheet.equity.totalEquity,
      assetsChange: totalAssets - priorBalanceSheet.assets.totalAssets,
      liabilitiesChange: totalLiabilities - priorBalanceSheet.liabilities.totalLiabilities,
      equityChange: totalEquity - priorBalanceSheet.equity.totalEquity
    };
  }
  
  return balanceSheet;
};
```

### Income Statement (Profit & Loss)

#### Comprehensive P&L Report
```typescript
interface IncomeStatement {
  period: { startDate: number; endDate: number };
  revenue: {
    operatingRevenue: {
      items: AccountBalance[];
      total: number;
    };
    otherIncome: {
      items: AccountBalance[];
      total: number;
    };
    totalRevenue: number;
  };
  cogs: {
    items: AccountBalance[];
    total: number;
  };
  grossProfit: number;
  grossProfitMargin: number;
  expenses: {
    operatingExpenses: {
      items: AccountBalance[];
      total: number;
    };
    taxExpenses: {
      items: AccountBalance[];
      total: number;
    };
    otherExpenses: {
      items: AccountBalance[];
      total: number;
    };
    totalExpenses: number;
  };
  netIncome: number;
  netProfitMargin: number;
  
  // Detailed breakdown
  revenueByBusinessUnit: { [unit: string]: number };
  expenseByCategory: { [category: string]: number };
  
  // Comparative data (optional)
  comparative?: {
    previousPeriodNetIncome: number;
    incomeChange: number;
    revenueChange: number;
    expenseChange: number;
  };
}

const generateIncomeStatement = async (
  startDate: number,
  endDate: number,
  branchId?: string,
  comparative: boolean = false,
  priorStartDate?: number,
  priorEndDate?: number
): Promise<IncomeStatement> => {
  // Get journal lines for the period
  const journalLines = await ctx.db
    .query("journalEntryLines")
    .withIndex("by_date", q => 
      q.gte("createdAt", startDate)
       .lte("createdAt", endDate)
    )
    .filter(line => {
      // Filter by branch if specified
      if (branchId && line.branchId !== branchId) return false;
      
      // Only include posted entries
      const journalEntry = line.journalEntryId;
      return journalEntry?.status === "POSTED";
    })
    .collect();
  
  const accounts = await ctx.db
    .query("accounts")
    .withIndex("by_active", q => q.eq("isActive", true))
    .collect();
  
  // Calculate account activity for the period
  const accountActivity = new Map<string, { debit: number; credit: number }>();
  
  for (const line of journalLines) {
    const activity = accountActivity.get(line.accountId) || { debit: 0, credit: 0 };
    activity.debit += line.debitAmount;
    activity.credit += line.creditAmount;
    accountActivity.set(line.accountId, activity);
  }
  
  // Categorize accounts and calculate balances
  const revenueAccounts = accounts.filter(acc => acc.accountType === "REVENUE");
  const expenseAccounts = accounts.filter(acc => acc.accountType === "EXPENSE");
  
  // Revenue breakdown
  const operatingRevenue = revenueAccounts
    .filter(acc => acc.category.includes("Operating"))
    .map(acc => {
      const activity = accountActivity.get(acc._id) || { debit: 0, credit: 0 };
      // For revenue accounts, credit increases balance
      const balance = activity.credit - activity.debit;
      return {
        account: acc,
        balance: balance
      };
    })
    .filter(item => item.balance !== 0);
  
  const otherIncome = revenueAccounts
    .filter(acc => acc.category.includes("Other"))
    .map(acc => {
      const activity = accountActivity.get(acc._id) || { debit: 0, credit: 0 };
      const balance = activity.credit - activity.debit;
      return {
        account: acc,
        balance: balance
      };
    })
    .filter(item => item.balance !== 0);
  
  // COGS breakdown
  const cogsAccounts = expenseAccounts
    .filter(acc => acc.category.includes("Cost of Goods"))
    .map(acc => {
      const activity = accountActivity.get(acc._id) || { debit: 0, credit: 0 };
      // For expense accounts, debit increases balance
      const balance = activity.debit - activity.credit;
      return {
        account: acc,
        balance: balance
      };
    })
    .filter(item => item.balance !== 0);
  
  // Operating Expenses
  const operatingExpenses = expenseAccounts
    .filter(acc => acc.category.includes("Operating"))
    .map(acc => {
      const activity = accountActivity.get(acc._id) || { debit: 0, credit: 0 };
      const balance = activity.debit - activity.credit;
      return {
        account: acc,
        balance: balance
      };
    })
    .filter(item => item.balance !== 0);
  
  // Tax Expenses
  const taxExpenses = expenseAccounts
    .filter(acc => acc.category.includes("Tax"))
    .map(acc => {
      const activity = accountActivity.get(acc._id) || { debit: 0, credit: 0 };
      const balance = activity.debit - activity.credit;
      return {
        account: acc,
        balance: balance
      };
    })
    .filter(item => item.balance !== 0);
  
  // Other Expenses
  const otherExpenses = expenseAccounts
    .filter(acc => acc.category.includes("Other"))
    .map(acc => {
      const activity = accountActivity.get(acc._id) || { debit: 0, credit: 0 };
      const balance = activity.debit - activity.credit;
      return {
        account: acc,
        balance: balance
      };
    })
    .filter(item => item.balance !== 0);
  
  // Calculate totals and derived metrics
  const totalOperatingRevenue = operatingRevenue.reduce((sum, item) => sum + item.balance, 0);
  const totalOtherIncome = otherIncome.reduce((sum, item) => sum + item.balance, 0);
  const totalRevenue = totalOperatingRevenue + totalOtherIncome;
  
  const totalCOGS = cogsAccounts.reduce((sum, item) => sum + item.balance, 0);
  const grossProfit = totalRevenue - totalCOGS;
  const grossProfitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
  
  const totalOperatingExpenses = operatingExpenses.reduce((sum, item) => sum + item.balance, 0);
  const totalTaxExpenses = taxExpenses.reduce((sum, item) => sum + item.balance, 0);
  const totalOtherExpenses = otherExpenses.reduce((sum, item) => sum + item.balance, 0);
  const totalExpenses = totalOperatingExpenses + totalTaxExpenses + totalOtherExpenses;
  
  const netIncome = grossProfit - totalExpenses;
  const netProfitMargin = totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0;
  
  // Business unit breakdown
  const revenueByBusinessUnit = calculateRevenueByBusinessUnit(operatingRevenue, otherIncome);
  const expenseByCategory = calculateExpenseByCategory([...operatingExpenses, ...taxExpenses, ...otherExpenses]);
  
  const incomeStatement: IncomeStatement = {
    period: { startDate, endDate },
    revenue: {
      operatingRevenue: { items: operatingRevenue, total: totalOperatingRevenue },
      otherIncome: { items: otherIncome, total: totalOtherIncome },
      totalRevenue
    },
    cogs: { items: cogsAccounts, total: totalCOGS },
    grossProfit,
    grossProfitMargin,
    expenses: {
      operatingExpenses: { items: operatingExpenses, total: totalOperatingExpenses },
      taxExpenses: { items: taxExpenses, total: totalTaxExpenses },
      otherExpenses: { items: otherExpenses, total: totalOtherExpenses },
      totalExpenses
    },
    netIncome,
    netProfitMargin,
    revenueByBusinessUnit,
    expenseByCategory
  };
  
  // Add comparative data if requested
  if (comparative && priorStartDate && priorEndDate) {
    const priorIncomeStatement = await generateIncomeStatement(priorStartDate, priorEndDate, branchId, false);
    
    incomeStatement.comparative = {
      previousPeriodNetIncome: priorIncomeStatement.netIncome,
      incomeChange: netIncome - priorIncomeStatement.netIncome,
      revenueChange: totalRevenue - priorIncomeStatement.revenue.totalRevenue,
      expenseChange: totalExpenses - priorIncomeStatement.expenses.totalExpenses
    };
  }
  
  return incomeStatement;
};
```

### Cash Flow Statement

#### Indirect Method Cash Flow
```typescript
interface CashFlowStatement {
  period: { startDate: number; endDate: number };
  operatingActivities: {
    netIncome: number;
    adjustments: {
      depreciation: number;
      changesInReceivables: number;
      changesInInventory: number;
      changesInPayables: number;
      otherAdjustments: number;
    };
    netCashFromOperating: number;
  };
  investingActivities: {
    items: CashFlowItem[];
    netCashFromInvesting: number;
  };
  financingActivities: {
    items: CashFlowItem[];
    netCashFromFinancing: number;
  };
  netCashChange: number;
  cashBeginning: number;
  cashEnding: number;
}

interface CashFlowItem {
  description: string;
  amount: number;
  category: "INFLOW" | "OUTFLOW";
}

const generateCashFlowStatement = async (
  startDate: number,
  endDate: number,
  branchId?: string
): Promise<CashFlowStatement> => {
  // Get beginning and ending cash balances
  const cashAccounts = await ctx.db
    .query("accounts")
    .withIndex("by_code", q => q.eq("accountCode", "1-111")) // Cash on Hand
    .collect();
  
  const bankAccounts = await ctx.db
    .query("bankAccounts")
    .collect();
  
  const beginningCash = await calculateCashBalance(startDate - 1, branchId);
  const endingCash = await calculateCashBalance(endDate, branchId);
  
  // Get income statement for operating activities
  const incomeStatement = await generateIncomeStatement(startDate, endDate, branchId);
  
  // Operating Activities - Indirect Method
  const operatingActivities = {
    netIncome: incomeStatement.netIncome,
    adjustments: {
      depreciation: await calculateDepreciationExpense(startDate, endDate, branchId),
      changesInReceivables: await calculateChangesInReceivables(startDate, endDate, branchId),
      changesInInventory: await calculateChangesInInventory(startDate, endDate, branchId),
      changesInPayables: await calculateChangesInPayables(startDate, endDate, branchId),
      otherAdjustments: 0 // Calculate other non-cash items
    },
    netCashFromOperating: 0 // Will be calculated
  };
  
  // Calculate net cash from operating
  operatingActivities.netCashFromOperating = 
    operatingActivities.netIncome +
    operatingActivities.adjustments.depreciation +
    operatingActivities.adjustments.changesInReceivables +
    operatingActivities.adjustments.changesInInventory +
    operatingActivities.adjustments.changesInPayables +
    operatingActivities.adjustments.otherAdjustments;
  
  // Investing Activities
  const investingItems = await calculateInvestingActivities(startDate, endDate, branchId);
  const netCashFromInvesting = investingItems.reduce((sum, item) => 
    sum + (item.category === "INFLOW" ? item.amount : -item.amount), 0
  );
  
  // Financing Activities
  const financingItems = await calculateFinancingActivities(startDate, endDate, branchId);
  const netCashFromFinancing = financingItems.reduce((sum, item) => 
    sum + (item.category === "INFLOW" ? item.amount : -item.amount), 0
  );
  
  const netCashChange = endingCash - beginningCash;
  const calculatedEndingCash = beginningCash + 
    operatingActivities.netCashFromOperating + 
    netCashFromInvesting + 
    netCashFromFinancing;
  
  return {
    period: { startDate, endDate },
    operatingActivities: {
      ...operatingActivities,
      netCashFromOperating: Math.round(operatingActivities.netCashFromOperating)
    },
    investingActivities: {
      items: investingItems,
      netCashFromInvesting: Math.round(netCashFromInvesting)
    },
    financingActivities: {
      items: financingItems,
      netCashFromFinancing: Math.round(netCashFromFinancing)
    },
    netCashChange: Math.round(netCashChange),
    cashBeginning: Math.round(beginningCash),
    cashEnding: Math.round(endingCash)
  };
};
```

## 🏦 Bank Management

### Bank Account Integration

#### Bank Account Structure
```typescript
interface BankAccount {
  id: string;
  accountName: string;        // "BCA - Main Account"
  bankName: string;           // "Bank Central Asia"
  accountNumber: string;      // "1234567890"
  accountType: "CHECKING" | "SAVINGS" | "BUSINESS";
  
  // Accounting Integration
  linkedAccountId: string;    // Link to CoA account (e.g., 1-121)
  
  // Balance Information
  initialBalance: number;
  currentBalance: number;
  availableBalance: number;   // May differ from current for holds
  
  // Settings
  currency: "IDR" | "USD" | "EUR";
  isActive: boolean;
  reconciliationStatus: "RECONCILED" | "UNRECONCILED" | "DISPUTED";
  
  // Bank Integration
  bankCode: string;           // Bank identifier for integration
  swiftCode?: string;
  
  createdAt: number;
  updatedAt: number;
}

interface BankTransaction {
  id: string;
  bankAccountId: string;
  
  // Transaction Details
  transactionDate: number;
  postedDate: number;
  description: string;
  referenceNumber?: string;
  transactionType: "DEPOSIT" | "WITHDRAWAL" | "TRANSFER_IN" | "TRANSFER_OUT" | "FEE" | "INTEREST";
  
  // Amounts
  amount: number;
  fee?: number;
  netAmount: number;          // Amount minus fees
  
  // Accounting Integration
  journalEntryId?: string;    // Link to auto-generated JE
  
  // Reconciliation
  reconciliationStatus: "UNRECONCILED" | "RECONCILED" | "DISPUTED" | "EXCLUDED";
  reconciledDate?: number;
  reconciledBy?: string;
  
  // Notes
  notes?: string;
  
  createdAt: number;
  updatedAt: number;
}
```

#### Bank Reconciliation Process
```typescript
interface ReconciliationData {
  bankAccountId: string;
  statementDate: number;
  statementEndingBalance: number;
  transactions: ReconciliationTransaction[];
}

interface ReconciliationTransaction {
  transactionId: string;
  amount: number;
  date: number;
  description: string;
  status: "MATCHED" | "UNMATCHED" | "DISPUTED" | "MISSING";
}

const performBankReconciliation = async (
  reconciliationData: ReconciliationData
): Promise<ReconciliationResult> => {
  const bankAccount = await ctx.db.get(reconciliationData.bankAccountId);
  if (!bankAccount) throw new Error("Bank account not found");
  
  // Get system transactions for the period
  const systemTransactions = await ctx.db
    .query("bankTransactions")
    .withIndex("by_account_date", q => 
      q.eq("bankAccountId", reconciliationData.bankAccountId)
       .lte("transactionDate", reconciliationData.statementDate)
    )
    .filter(tx => tx.reconciliationStatus === "UNRECONCILED")
    .collect();
  
  // Match transactions
  const matches = await matchTransactions(
    systemTransactions, 
    reconciliationData.transactions
  );
  
  // Calculate reconciliation items
  const matchedTransactions = matches.filter(m => m.status === "MATCHED");
  const unmatchedInSystem = matches.filter(m => m.status === "UNMATCHED" && m.systemTransaction);
  const unmatchedInStatement = matches.filter(m => m.status === "UNMATCHED" && m.statementTransaction);
  
  // Calculate balances
  const matchedTotal = matchedTransactions.reduce((sum, m) => sum + m.amount, 0);
  const systemTotal = systemTransactions.reduce((sum, tx) => sum + tx.amount, 0);
  const statementTotal = reconciliationData.transactions.reduce((sum, tx) => sum + tx.amount, 0);
  
  const systemBalance = bankAccount.currentBalance - systemTotal + matchedTotal;
  const adjustedStatementBalance = reconciliationData.statementEndingBalance;
  
  const difference = systemBalance - adjustedStatementBalance;
  
  // Create reconciliation record
  const reconciliation = await ctx.db.insert("bankReconciliations", {
    bankAccountId: reconciliationData.bankAccountId,
    statementDate: reconciliationData.statementDate,
    statementEndingBalance: reconciliationData.statementEndingBalance,
    systemBalance,
    adjustedStatementBalance,
    difference,
    matchedTransactions: matchedTransactions.length,
    unmatchedInSystem: unmatchedInSystem.length,
    unmatchedInStatement: unmatchedInStatement.length,
    status: Math.abs(difference) < 0.01 ? "BALANCED" : "OUT_OF_BALANCE",
    reconciledBy: getCurrentUserId(),
    reconciledAt: Date.now()
  });
  
  // Update matched transactions
  for (const match of matchedTransactions) {
    await ctx.db.patch(match.systemTransaction._id, {
      reconciliationStatus: "RECONCILED",
      reconciledDate: Date.now(),
      reconciledBy: getCurrentUserId()
    });
  }
  
  // Create adjustment entries for unmatched items if needed
  if (Math.abs(difference) > 0.01) {
    const adjustmentEntry = await createReconciliationAdjustment(
      reconciliationData.bankAccountId,
      difference,
      "Bank reconciliation adjustment"
    );
    
    await ctx.db.patch(reconciliation._id, {
      adjustmentJournalEntryId: adjustmentEntry._id,
      status: "REQUIRES_ADJUSTMENT"
    });
  }
  
  return {
    reconciliationId: reconciliation._id,
    isBalanced: Math.abs(difference) < 0.01,
    difference,
    matchedCount: matchedTransactions.length,
    unmatchedSystemCount: unmatchedInSystem.length,
    unmatchedStatementCount: unmatchedInStatement.length,
    adjustmentRequired: Math.abs(difference) > 0.01
  };
};
```

## 💳 Expense Management

### Expense Approval Workflow

#### Expense Structure
```typescript
interface Expense {
  id: string;
  expenseNumber: string;      // "EXP-20251112-001"
  branchId: string;
  categoryId: string;         // Link to expense category
  
  // Transaction Details
  expenseDate: number;
  amount: number;
  vendor?: string;
  description: string;
  receiptAttachment?: string; // Convex storage ID
  
  // Approval Workflow
  status: ExpenseStatus;
  
  // Approval Tracking
  submittedBy?: string;
  submittedAt?: number;
  approvedBy?: string;
  approvedAt?: number;
  rejectedBy?: string;
  rejectionReason?: string;
  
  // Payment
  paymentMethod?: string;
  paymentDate?: number;
  
  // Integration
  journalEntryId?: string;    // Created after approval
  
  createdAt: number;
  updatedAt: number;
}

enum ExpenseStatus {
  DRAFT = "DRAFT",
  PENDING_APPROVAL = "PENDING_APPROVAL",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  PAID = "PAID"
}

interface ExpenseCategory {
  id: string;
  name: string;
  description?: string;
  linkedAccountId: string;    // Link to expense account in CoA
  requiresReceipt: boolean;
  approvalRequired: boolean;
  approvalLimit?: number;     // Amount requiring approval
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}
```

#### Approval Process
```typescript
const submitExpense = async (expenseData: ExpenseData) => {
  const expense = await ctx.db.insert("expenses", {
    expenseNumber: await generateExpenseNumber(ctx),
    branchId: expenseData.branchId,
    categoryId: expenseData.categoryId,
    expenseDate: expenseData.expenseDate,
    amount: expenseData.amount,
    vendor: expenseData.vendor,
    description: expenseData.description,
    receiptAttachment: expenseData.receiptAttachment,
    status: "PENDING_APPROVAL",
    submittedBy: getCurrentUserId(),
    submittedAt: Date.now(),
    createdAt: Date.now(),
    updatedAt: Date.now()
  });
  
  // Check if approval is required
  const category = await ctx.db.get(expenseData.categoryId);
  if (category?.approvalRequired && expenseData.amount >= (category.approvalLimit || 0)) {
    // Send approval notification
    await notifyManagersOfPendingExpense(expense._id);
  } else {
    // Auto-approve if under limit
    await approveExpense(expense._id, "AUTO_APPROVED", "Below approval threshold");
  }
  
  return expense;
};

const approveExpense = async (
  expenseId: string,
  approvedBy: string,
  approvalNotes?: string
) => {
  const expense = await ctx.db.get(expenseId);
  if (!expense) throw new Error("Expense not found");
  
  if (expense.status !== "PENDING_APPROVAL") {
    throw new Error("Only pending expenses can be approved");
  }
  
  // Update expense status
  await ctx.db.patch(expenseId, {
    status: "APPROVED",
    approvedBy,
    approvedAt: Date.now(),
    updatedAt: Date.now()
  });
  
  // Create journal entry automatically
  const journalEntry = await createExpenseJournalEntry(expense);
  
  // Update expense with journal entry
  await ctx.db.patch(expenseId, {
    journalEntryId: journalEntry._id,
    updatedAt: Date.now()
  });
  
  // Notify relevant parties
  await notifyExpenseApproval(expenseId, approvedBy, approvalNotes);
  
  return journalEntry;
};

const createExpenseJournalEntry = async (expense: Expense): Promise<JournalEntry> => {
  const category = await ctx.db.get(expense.categoryId);
  if (!category) throw new Error("Expense category not found");
  
  // Get accounts
  const cashAccount = await getAccountByCode("1-111");      // Cash on Hand
  const expenseAccount = await ctx.db.get(category.linkedAccountId);
  const bankAccount = await getBankAccountForExpense(expense);
  
  // Determine payment account
  const paymentAccount = bankAccount?.linkedAccountId || cashAccount;
  
  const lines: JournalEntryLine[] = [
    {
      journalEntryId: "", // Will be set after JE creation
      accountId: expenseAccount._id,
      branchId: expense.branchId,
      description: expense.description,
      debitAmount: expense.amount,
      creditAmount: 0,
      sortOrder: 1
    },
    {
      journalEntryId: "",
      accountId: paymentAccount._id,
      branchId: expense.branchId,
      description: `${expense.expenseNumber} - Payment`,
      debitAmount: 0,
      creditAmount: expense.amount,
      sortOrder: 2
    }
  ];
  
  const journalEntry = await createJournalEntry({
    journalNumber: await generateJournalNumber(ctx),
    journalDate: expense.expenseDate,
    description: `Expense ${expense.expenseNumber} - ${expense.vendor || 'Vendor'}`,
    sourceType: "EXPENSE",
    sourceId: expense._id,
    lines
  });
  
  return journalEntry;
};
```

## 📊 Integration with Business Modules

### Automatic Journal Generation Triggers

#### Sales Integration
```typescript
// In convex/sales.ts - after successful sale completion
export const submitSale = mutation({
  args: { saleId: Id<"sales">, payments: v.array(v.object({
    amount: v.number(),
    paymentMethod: v.string()
  }))},
  handler: async (ctx, args) => {
    // ... existing sale processing logic ...
    
    // After successful sale processing, create accounting entry
    try {
      const sale = await ctx.db.get(args.saleId);
      const items = await ctx.db.query("saleItems")
        .withIndex("by_sale", q => q.eq("saleId", args.saleId))
        .collect();
      
      // Prepare data for journal entry
      const saleData = {
        saleId: args.saleId,
        saleNumber: sale.saleNumber,
        saleDate: sale.saleDate,
        branchId: sale.branchId,
        totalAmount: sale.totalAmount,
        paidAmount: args.payments.reduce((sum, p) => sum + p.amount, 0),
        outstandingAmount: sale.totalAmount - args.payments.reduce((sum, p) => sum + p.amount, 0),
        items: await Promise.all(items.map(async item => {
          const product = await ctx.db.get(item.productId);
          return {
            productName: product?.name || "Unknown",
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            cogs: item.cogs,
            subtotal: item.subtotal,
            category: product?.category || "Pet Food"
          };
        }))
      };
      
      // Create journal entry
      await createSaleJournalEntry(ctx, saleData);
      
    } catch (error) {
      console.error("Failed to create journal entry for sale:", error);
      // Don't fail the sale if journal entry fails
    }
  }
});
```

#### Clinic Integration
```typescript
// In convex/clinicAppointments.ts - after appointment completion
export const submitAppointment = mutation({
  args: { appointmentId: Id<"clinicAppointments"> },
  handler: async (ctx, args) => {
    // ... existing appointment processing logic ...
    
    // After successful completion, create accounting entry
    try {
      const appointment = await ctx.db.get(args.appointmentId);
      const services = await ctx.db.query("clinicAppointmentServices")
        .withIndex("by_appointment", q => q.eq("appointmentId", args.appointmentId))
        .collect();
      
      const clinicData = {
        appointmentId: args.appointmentId,
        appointmentNumber: appointment.appointmentNumber,
        appointmentDate: appointment.appointmentDate,
        branchId: appointment.branchId,
        totalAmount: appointment.totalAmount,
        paidAmount: appointment.paidAmount,
        outstandingAmount: appointment.totalAmount - appointment.paidAmount,
        services: await Promise.all(services.map(async service => {
          const serviceProduct = await ctx.db.get(service.serviceId);
          return {
            serviceName: serviceProduct?.name || "Unknown",
            subtotal: service.subtotal,
            cogs: service.isPrescription ? 0 : (service.productId ? 0 : 0),
            category: serviceProduct?.category || "Medical"
          };
        }))
      };
      
      await createClinicJournalEntry(ctx, clinicData);
      
    } catch (error) {
      console.error("Failed to create journal entry for clinic appointment:", error);
    }
  }
});
```

### Multi-branch Financial Consolidation

#### Consolidated Financial Reports
```typescript
const generateConsolidatedBalanceSheet = async (
  asOfDate: number,
  parentBranchId?: string
): Promise<ConsolidatedBalanceSheet> => {
  // Get all branches (or specific branch tree)
  const branches = await getBranchHierarchy(parentBranchId);
  
  // Generate balance sheet for each branch
  const branchBalanceSheets = await Promise.all(
    branches.map(async branch => ({
      branch,
      balanceSheet: await generateBalanceSheet(asOfDate, branch._id)
    }))
  );
  
  // Consolidate balances
  const consolidated: ConsolidatedBalanceSheet = {
    asOfDate,
    branches: branchBalanceSheets,
    consolidated: {
      assets: consolidateAssets(branchBalanceSheets),
      liabilities: consolidateLiabilities(branchBalanceSheets),
      equity: consolidateEquity(branchBalanceSheets)
    },
    eliminationEntries: await generateIntercompanyEliminations(branchBalanceSheets),
    consolidationAdjustments: await calculateConsolidationAdjustments(branchBalanceSheets)
  };
  
  return consolidated;
};

const generateIntercompanyEliminations = async (
  branchReports: BranchBalanceSheet[]
): Promise<JournalEntry[]> => {
  const eliminations: JournalEntry[] = [];
  
  // Find intercompany transactions
  for (let i = 0; i < branchReports.length; i++) {
    for (let j = i + 1; j < branchReports.length; j++) {
      const intercompanyTransactions = await findIntercompanyTransactions(
        branchReports[i].branch._id,
        branchReports[j].branch._id
      );
      
      if (intercompanyTransactions.length > 0) {
        const elimination = await createEliminationEntry(
          branchReports[i].branch,
          branchReports[j].branch,
          intercompanyTransactions
        );
        eliminations.push(elimination);
      }
    }
  }
  
  return eliminations;
};
```

This comprehensive accounting module documentation provides a complete foundation for professional financial management in the pet shop system, with Indonesian accounting standards, automated processes, and multi-branch support.

---

**Related Documentation**:
- [User Guide](./05-user-guide.md) - Financial workflows and procedures
- [API Reference](./04-api-reference.md) - Technical API details
- [Installation Guide](./02-installation-guide.md) - System setup
- [System Architecture](./06-system-architecture.md) - Technical overview