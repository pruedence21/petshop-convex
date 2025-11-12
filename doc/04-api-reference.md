# 🔌 API Reference - Pet Shop Management System

Complete API documentation for the Pet Shop Management System built on Convex. This reference covers all available endpoints, data models, and integration patterns.

## 📋 Table of Contents

- [Authentication](#authentication)
- [Core Data Models](#core-data-models)
- [Sales API](#sales-api)
- [Clinic API](#clinic-api)
- [Hotel API](#hotel-api)
- [Accounting API](#accounting-api)
- [Inventory API](#inventory-api)
- [Customer API](#customer-api)
- [Utility Functions](#utility-functions)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)

## 🔐 Authentication

### User Authentication

All API calls require user authentication through Convex Auth:

```typescript
// Login
import { ConvexHttpClient } from "convex/browser";
const client = new ConvexHttpClient(process.env.CONVEX_URL);

// Authenticated request
const result = await client.query(api.sales.list, {
  branchId: branchId
});
```

### Role-Based Access Control

```typescript
// User roles: ADMIN, MANAGER, STAFF, ACCOUNTANT
const userRole = await client.query(api.users.getCurrentUserRole, {});

if (userRole === "ACCOUNTANT") {
  // Access to accounting features
} else {
  // Limited access
}
```

## 📊 Core Data Models

### Common Field Types

```typescript
// Standard timestamp
timestamp: number; // Unix timestamp in milliseconds

// Standard ID types
Id<T extends TableName>: Convex document ID

// Standard status values
status: "ACTIVE" | "INACTIVE" | "DRAFT" | "PENDING" | "APPROVED" | "REJECTED";

// Standard money amounts
amount: number; // Stored in smallest currency unit (cents)
price: number;  // Unit price in cents
quantity: number; // Whole number or decimal
```

### Document Structure

```typescript
// Base document structure
interface BaseDocument {
  _id: Id<TableName>;
  createdAt: timestamp;
  updatedAt: timestamp;
  createdBy?: Id<"users">;
  updatedBy?: Id<"users">;
  isActive: boolean;
}

// Example: Customer document
interface Customer extends BaseDocument {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  notes?: string;
  loyaltyPoints: number;
}
```

## 🛒 Sales API

### Sales Operations

#### `sales.create`
Create a new sale transaction.

```typescript
const sale = await client.mutation(api.sales.create, {
  customerId?: Id<"customers">,
  branchId: Id<"branches">,
  saleDate: timestamp,
  subtotal: number,
  taxAmount: number,
  discountAmount: number,
  totalAmount: number,
  paymentMethod: "CASH" | "CARD" | "DIGITAL_WALLET",
  notes?: string,
  items: [
    {
      productId: Id<"products">,
      quantity: number,
      unitPrice: number,
      subtotal: number,
      cogs: number
    }
  ]
});
```

**Response:**
```typescript
{
  saleId: Id<"sales">,
  saleNumber: string,
  totalAmount: number,
  journalEntryId?: Id<"journalEntries"> // Auto-generated accounting entry
}
```

#### `sales.list`
Get list of sales with filtering.

```typescript
const sales = await client.query(api.sales.list, {
  branchId?: Id<"branches">,
  startDate?: timestamp,
  endDate?: timestamp,
  status?: "DRAFT" | "COMPLETED" | "CANCELLED",
  customerId?: Id<"customers">,
  limit?: number
});
```

**Response:**
```typescript
[
  {
    _id: Id<"sales">,
    saleNumber: string,
    saleDate: timestamp,
    customerName?: string,
    totalAmount: number,
    items: number,
    status: string,
    paymentMethod: string
  }
]
```

#### `sales.getById`
Get complete sale details including items.

```typescript
const saleDetails = await client.query(api.sales.getById, {
  saleId: Id<"sales">
});
```

#### `sales.submitSale`
Process sale completion with payment and inventory updates.

```typescript
const result = await client.mutation(api.sales.submitSale, {
  saleId: Id<"sales">,
  payments: [
    {
      amount: number,
      paymentMethod: string,
      referenceNumber?: string
    }
  ]
});
```

**Effects:**
- Reduces product stock
- Creates accounting journal entries
- Updates customer loyalty points
- Generates receipt

#### `sales.cancelSale`
Cancel a sale and reverse all effects.

```typescript
await client.mutation(api.sales.cancelSale, {
  saleId: Id<"sales">,
  reason: string
});
```

**Effects:**
- Restores product stock
- Reverses accounting entries
- Removes loyalty points
- Refunds payments

### Payment Processing

#### `salePayments.create`
Record payment for a sale.

```typescript
const payment = await client.mutation(api.salePayments.create, {
  saleId: Id<"sales">,
  amount: number,
  paymentMethod: "CASH" | "CARD" | "DIGITAL_WALLET",
  referenceNumber?: string,
  paymentDate: timestamp
});
```

#### `salePayments.list`
Get payment history for sales.

```typescript
const payments = await client.query(api.salePayments.list, {
  saleId?: Id<"sales">,
  startDate?: timestamp,
  endDate?: timestamp,
  paymentMethod?: string
});
```

## 🏥 Clinic API

### Appointment Management

#### `clinicAppointments.create`
Create new clinic appointment.

```typescript
const appointment = await client.mutation(api.clinicAppointments.create, {
  customerId: Id<"customers">,
  petId: Id<"customerPets">,
  branchId: Id<"branches">,
  appointmentDate: timestamp,
  duration: number, // minutes
  status: "SCHEDULED" | "CONFIRMED" | "COMPLETED" | "CANCELLED",
  notes?: string,
  services: [
    {
      serviceId: Id<"clinicServices">,
      quantity: number,
      unitPrice: number,
      subtotal: number
    }
  ]
});
```

#### `clinicAppointments.update`
Update appointment details.

```typescript
await client.mutation(api.clinicAppointments.update, {
  appointmentId: Id<"clinicAppointments">,
  appointmentDate?: timestamp,
  status?: string,
  notes?: string
});
```

#### `clinicAppointments.submit`
Complete appointment and process billing.

```typescript
const result = await client.mutation(api.clinicAppointments.submit, {
  appointmentId: Id<"clinicAppointments">,
  actualDuration: number,
  treatmentNotes?: string,
  medications?: [
    {
      name: string,
      dosage: string,
      frequency: string,
      duration: string
    }
  ],
  followUpRequired: boolean,
  followUpDate?: timestamp
});
```

**Effects:**
- Updates medical records
- Processes billing
- Creates accounting entries
- Updates next vaccination schedules

### Medical Records

#### `petMedicalRecords.create`
Create medical record entry.

```typescript
const record = await client.mutation(api.petMedicalRecords.create, {
  petId: Id<"customerPets">,
  appointmentId?: Id<"clinicAppointments">,
  recordDate: timestamp,
  recordType: "EXAMINATION" | "VACCINATION" | "TREATMENT" | "SURGERY" | "MEDICATION",
  diagnosis: string,
  treatment: string,
  medications?: string[],
  notes: string,
  veterinarian: string,
  nextVisitDate?: timestamp
});
```

#### `petMedicalRecords.getHistory`
Get complete medical history for a pet.

```typescript
const history = await client.query(api.petMedicalRecords.getHistory, {
  petId: Id<"customerPets">,
  recordType?: string,
  startDate?: timestamp,
  endDate?: timestamp
});
```

### Staff Scheduling

#### `clinicStaff.listAvailable`
Find available staff for a time slot.

```typescript
const availableStaff = await client.query(api.clinicStaff.listAvailable, {
  appointmentDate: timestamp,
  duration: number,
  branchId: Id<"branches">,
  serviceType?: string
});
```

## 🏨 Hotel API

### Booking Management

#### `hotelBookings.create`
Create new hotel booking.

```typescript
const booking = await client.mutation(api.hotelBookings.create, {
  customerId: Id<"customers">,
  petId: Id<"customerPets">,
  roomId: Id<"hotelRooms">,
  checkInDate: timestamp,
  checkOutDate: timestamp,
  numberOfDays: number,
  dailyRate: number,
  subtotal: number,
  services: [
    {
      serviceId: Id<"hotelBookingServices">,
      quantity: number,
      unitPrice: number,
      subtotal: number
    }
  ],
  totalAmount: number,
  specialInstructions?: string,
  emergencyContact: {
    name: string,
    phone: string,
    relationship: string
  }
});
```

#### `hotelBookings.checkIn`
Process guest check-in.

```typescript
await client.mutation(api.hotelBookings.checkIn, {
  bookingId: Id<"hotelBookings">,
  checkInTime: timestamp,
  conditionNotes: string,
  medications?: [
    {
      name: string,
      dosage: string,
      frequency: string,
      instructions: string
    }
  ]
});
```

#### `hotelBookings.checkOut`
Process guest check-out and billing.

```typescript
const finalBill = await client.mutation(api.hotelBookings.checkOut, {
  bookingId: Id<"hotelBookings">,
  checkOutTime: timestamp,
  conditionNotes: string,
  additionalServices?: [
    {
      serviceId: Id<"hotelBookingServices">,
      quantity: number,
      unitPrice: number
    }
  ]
});
```

### Room Management

#### `hotelRooms.listAvailable`
Find available rooms for date range.

```typescript
const availableRooms = await client.query(api.hotelRooms.listAvailable, {
  checkInDate: timestamp,
  checkOutDate: timestamp,
  roomType?: string,
  maxGuests?: number
});
```

#### `hotelRooms.getUtilization`
Get room utilization statistics.

```typescript
const utilization = await client.query(api.hotelRooms.getUtilization, {
  startDate: timestamp,
  endDate: timestamp,
  branchId?: Id<"branches">
});
```

## 💰 Accounting API

### Chart of Accounts

#### `accounts.create`
Create new account.

```typescript
const account = await client.mutation(api.accounts.create, {
  accountCode: string,
  accountName: string,
  accountType: "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE",
  category: string,
  normalBalance: "DEBIT" | "CREDIT",
  isHeader: boolean,
  level: number,
  parentAccountId?: Id<"accounts">,
  taxable?: boolean
});
```

#### `accounts.getTree`
Get hierarchical account structure.

```typescript
const accountTree = await client.query(api.accounts.getTree, {
  accountType?: string,
  includeInactive?: boolean
});
```

**Response:**
```typescript
[
  {
    accountId: Id<"accounts">,
    accountCode: string,
    accountName: string,
    accountType: string,
    children: [
      {
        accountId: Id<"accounts">,
        accountCode: string,
        accountName: string,
        children: [...]
      }
    ]
  }
]
```

#### `accounts.getBalance`
Get account balance as of date.

```typescript
const balance = await client.query(api.accounts.getBalance, {
  accountId: Id<"accounts">,
  asOfDate: timestamp,
  branchId?: Id<"branches">
});
```

### Journal Entries

#### `journalEntries.create`
Create manual journal entry.

```typescript
const journalEntry = await client.mutation(api.journalEntries.create, {
  journalDate: timestamp,
  description: string,
  sourceType: "MANUAL" | "SALE" | "PURCHASE" | "CLINIC" | "HOTEL" | "EXPENSE" | "PAYMENT",
  sourceId?: string,
  lines: [
    {
      accountId: Id<"accounts">,
      branchId?: Id<"branches">,
      description?: string,
      debitAmount: number,
      creditAmount: number,
      sortOrder: number
    }
  ]
});
```

**Validation Rules:**
- Total debit must equal total credit
- Cannot post to header accounts
- Cannot post to inactive accounts
- Cannot post to closed periods

#### `journalEntries.post`
Post draft journal entry to ledger.

```typescript
await client.mutation(api.journalEntries.post, {
  journalEntryId: Id<"journalEntries">,
  postedBy: Id<"users">
});
```

#### `journalEntries.voidEntry`
Void a posted journal entry.

```typescript
await client.mutation(api.journalEntries.voidEntry, {
  journalEntryId: Id<"journalEntries">,
  voidReason: string,
  voidedBy: Id<"users">
});
```

### Financial Reports

#### `financialReports.getBalanceSheet`
Generate balance sheet report.

```typescript
const balanceSheet = await client.query(api.financialReports.getBalanceSheet, {
  asOfDate: timestamp,
  branchId?: Id<"branches">,
  comparative?: boolean,
  priorDate?: timestamp
});
```

**Response:**
```typescript
{
  asOfDate: timestamp,
  assets: {
    currentAssets: [
      { accountCode: string, accountName: string, balance: number }
    ],
    fixedAssets: [
      { accountCode: string, accountName: string, balance: number }
    ],
    totalAssets: number
  },
  liabilities: {
    currentLiabilities: [...],
    longTermLiabilities: [...],
    totalLiabilities: number
  },
  equity: {
    items: [...],
    totalEquity: number
  },
  totalLiabilitiesAndEquity: number
}
```

#### `financialReports.getIncomeStatement`
Generate income statement.

```typescript
const incomeStatement = await client.query(api.financialReports.getIncomeStatement, {
  startDate: timestamp,
  endDate: timestamp,
  branchId?: Id<"branches">,
  comparative?: boolean,
  priorStartDate?: timestamp,
  priorEndDate?: timestamp
});
```

#### `financialReports.getCashFlowStatement`
Generate cash flow statement.

```typescript
const cashFlow = await client.query(api.financialReports.getCashFlowStatement, {
  startDate: timestamp,
  endDate: timestamp,
  branchId?: Id<"branches">
});
```

### Bank Management

#### `bankAccounts.create`
Create bank account.

```typescript
const bankAccount = await client.mutation(api.bankAccounts.create, {
  accountName: string,
  bankName: string,
  accountNumber: string,
  linkedAccountId: Id<"accounts">,
  initialBalance: number,
  currency: string,
  isActive: boolean
});
```

#### `bankTransactions.record`
Record bank transaction.

```typescript
const transaction = await client.mutation(api.bankTransactions.record, {
  bankAccountId: Id<"bankAccounts">,
  transactionDate: timestamp,
  transactionType: "DEPOSIT" | "WITHDRAWAL" | "TRANSFER_IN" | "TRANSFER_OUT",
  amount: number,
  referenceNumber?: string,
  description: string
});
```

#### `bankTransactions.reconcile`
Mark transaction as reconciled.

```typescript
await client.mutation(api.bankTransactions.reconcile, {
  transactionId: Id<"bankTransactions">,
  reconciledBy: Id<"users">,
  reconciliationDate: timestamp
});
```

### Expense Management

#### `expenses.create`
Create expense entry.

```typescript
const expense = await client.mutation(api.expenses.create, {
  branchId: Id<"branches">,
  categoryId: Id<"expenseCategories">,
  expenseDate: timestamp,
  amount: number,
  vendor?: string,
  description: string,
  receiptAttachment?: string,
  status: "DRAFT" | "PENDING_APPROVAL" | "APPROVED" | "REJECTED" | "PAID"
});
```

#### `expenses.submitForApproval`
Submit expense for approval.

```typescript
await client.mutation(api.expenses.submitForApproval, {
  expenseId: Id<"expenses">,
  submittedBy: Id<"users">,
  submittedAt: timestamp
});
```

#### `expenses.approve`
Approve expense (managers only).

```typescript
await client.mutation(api.expenses.approve, {
  expenseId: Id<"expenses">,
  approvedBy: Id<"users">,
  approvedAt: timestamp
});
```

## 📦 Inventory API

### Product Management

#### `products.create`
Create new product.

```typescript
const product = await client.mutation(api.products.create, {
  name: string,
  description?: string,
  sku: string,
  barcode?: string,
  categoryId: Id<"productCategories">,
  subcategoryId?: Id<"productSubcategories">,
  brandId?: Id<"brands">,
  unitId: Id<"units">,
  purchasePrice: number,
  sellingPrice: number,
  isActive: boolean,
  isTaxable: boolean,
  trackInventory: boolean
});
```

#### `products.updateStock`
Update product stock levels.

```typescript
await client.mutation(api.products.updateStock, {
  productId: Id<"products">,
  branchId: Id<"branches">,
  quantityChange: number,
  reason: "SALE" | "PURCHASE" | "ADJUSTMENT" | "DAMAGED" | "RETURNED",
  referenceId?: string,
  notes?: string
});
```

#### `products.getLowStock`
Get products below reorder level.

```typescript
const lowStockProducts = await client.query(api.products.getLowStock, {
  branchId: Id<"branches">,
  categoryId?: Id<"productCategories">
});
```

### Purchase Orders

#### `purchaseOrders.create`
Create purchase order.

```typescript
const purchaseOrder = await client.mutation(api.purchaseOrders.create, {
  poNumber: string,
  supplierId: Id<"suppliers">,
  branchId: Id<"branches">,
  orderDate: timestamp,
  expectedDate: timestamp,
  subtotal: number,
  taxAmount: number,
  totalAmount: number,
  status: "DRAFT" | "SENT" | "CONFIRMED" | "RECEIVED" | "CANCELLED",
  items: [
    {
      productId: Id<"products">,
      quantity: number,
      unitPrice: number,
      subtotal: number,
      receivedQuantity?: number
    }
  ]
});
```

#### `purchaseOrders.receive`
Process purchase order receipt.

```typescript
await client.mutation(api.purchaseOrders.receive, {
  purchaseOrderId: Id<"purchaseOrders">,
  receivedDate: timestamp,
  receivedItems: [
    {
      itemId: Id<"purchaseOrderItems">,
      receivedQuantity: number,
      unitPrice?: number // For price adjustments
    }
  ],
  referenceNumber?: string,
  notes?: string
});
```

**Effects:**
- Updates product stock
- Creates accounting entries
- Updates accounts payable
- Generates vendor bills

## 👥 Customer API

### Customer Management

#### `customers.create`
Create new customer.

```typescript
const customer = await client.mutation(api.customers.create, {
  name: string,
  email?: string,
  phone?: string,
  address?: string,
  city?: string,
  postalCode?: string,
  dateOfBirth?: timestamp,
  notes?: string,
  loyaltyPoints: number,
  preferredContact: "EMAIL" | "PHONE" | "SMS"
});
```

#### `customers.addPet`
Add pet to customer profile.

```typescript
const pet = await client.mutation(api.customerPets.create, {
  customerId: Id<"customers">,
  name: string,
  species: string,
  breed?: string,
  dateOfBirth?: timestamp,
  gender: "MALE" | "FEMALE" | "UNKNOWN",
  weight?: number,
  microchipId?: string,
  notes?: string,
  medicalConditions?: string[],
  medications?: string[],
  emergencyContact?: string
});
```

#### `customers.getLoyaltyProfile`
Get customer loyalty information.

```typescript
const loyaltyProfile = await client.query(api.customers.getLoyaltyProfile, {
  customerId: Id<"customers">
});
```

**Response:**
```typescript
{
  customerId: Id<"customers">,
  totalPurchases: number,
  loyaltyPoints: number,
  lastVisitDate: timestamp,
  favoriteProducts: string[],
  serviceHistory: {
    totalSales: number,
    totalClinicVisits: number,
    totalHotelStays: number
  }
}
```

### Accounts Receivable

#### `accountsReceivable.getSummary`
Get AR summary by customer.

```typescript
const arSummary = await client.query(api.accountsReceivable.getSummary, {
  asOfDate: timestamp,
  branchId?: Id<"branches">,
  includeOverdue?: boolean
});
```

#### `accountsReceivable.getAging`
Get aging analysis of receivables.

```typescript
const agingReport = await client.query(api.accountsReceivable.getAging, {
  asOfDate: timestamp,
  branchId?: Id<"branches">
});
```

**Response:**
```typescript
[
  {
    customerId: Id<"customers">,
    customerName: string,
    totalOutstanding: number,
    current: number,        // 0-30 days
    thirtyOneToSixty: number,  // 31-60 days
    sixtyOneToNinety: number,  // 61-90 days
    overNinety: number
  }
]
```

## 🔧 Utility Functions

### Date and Time Helpers

#### `myFunctions.formatCurrency`
Format currency amount.

```typescript
const formatted = await client.query(api.myFunctions.formatCurrency, {
  amount: 12345.67,
  currency: "USD",
  locale: "en-US"
});
// Returns: "$12,345.67"
```

#### `myFunctions.calculateAge`
Calculate age from date of birth.

```typescript
const age = await client.query(api.myFunctions.calculateAge, {
  dateOfBirth: new Date("2020-01-01").getTime(),
  asOfDate: new Date().getTime()
});
// Returns: { years: 4, months: 10, days: 11 }
```

### Branch Management

#### `branches.list`
Get list of all branches.

```typescript
const branches = await client.query(api.branches.list, {
  includeInactive?: boolean
});
```

#### `branches.getCurrent`
Get current user's branch (for multi-location businesses).

```typescript
const currentBranch = await client.query(api.branches.getCurrent, {});
```

### User Management

#### `users.getCurrent`
Get current user information.

```typescript
const currentUser = await client.query(api.users.getCurrent, {});

#### `users.getPermissions`
Get user permissions and role.

```typescript
const permissions = await client.query(api.users.getPermissions, {
  userId?: Id<"users"> // Defaults to current user
});
```

## 🚨 Error Handling

### Common Error Types

```typescript
// Authentication errors
interface AuthError {
  code: "UNAUTHORIZED" | "FORBIDDEN";
  message: string;
}

// Validation errors
interface ValidationError {
  code: "VALIDATION_FAILED";
  field: string;
  message: string;
  value: any;
}

// Business rule errors
interface BusinessRuleError {
  code: "BUSINESS_RULE_VIOLATION";
  rule: string;
  message: string;
}

// Not found errors
interface NotFoundError {
  code: "NOT_FOUND";
  resource: string;
  id: string;
}
```

### Error Response Format

```typescript
{
  error: {
    code: string,
    message: string,
    details?: {
      field?: string,
      value?: any,
      suggestion?: string
    },
    timestamp: number
  }
}
```

### Error Handling Best Practices

```typescript
try {
  const result = await client.mutation(api.sales.create, saleData);
  return result;
} catch (error) {
  if (error.code === "VALIDATION_FAILED") {
    // Handle validation errors
    console.log(`Validation failed: ${error.message}`);
    return { success: false, errors: [error] };
  } else if (error.code === "BUSINESS_RULE_VIOLATION") {
    // Handle business rule violations
    console.log(`Business rule violated: ${error.message}`);
    return { success: false, errors: [error] };
  } else {
    // Handle other errors
    console.error("Unexpected error:", error);
    return { success: false, errors: [{ message: "An unexpected error occurred" }] };
  }
}
```

## ⏱️ Rate Limiting

### Convex Rate Limits

Convex implements automatic rate limiting:

- **Query limits**: No hard limits, but slow queries are optimized
- **Mutation limits**: 1,000 mutations per second per deployment
- **Concurrent connections**: Up to 100 concurrent users

### Best Practices for Performance

```typescript
// Use pagination for large datasets
const customers = await client.query(api.customers.list, {
  branchId: branchId,
  limit: 50,
  cursor: "next-page-cursor"
});

// Filter data on the server side
const sales = await client.query(api.sales.list, {
  startDate: startOfDay,
  endDate: endOfDay,
  status: "COMPLETED" // Only get completed sales
});

// Use specific indexes for better performance
const journalEntries = await client.query(api.journalEntries.list, {
  journalDate: [startDate, endDate], // Range query
  status: "POSTED"
}).withIndex("by_journal_date");
```

### Optimizing API Calls

```typescript
// Batch related queries
const [customers, branches, products] = await Promise.all([
  client.query(api.customers.list, {}),
  client.query(api.branches.list, {}),
  client.query(api.products.list, {})
]);

// Use React Query for client-side caching
import { useQuery } from 'convex/react';

function SalesDashboard() {
  const salesData = useQuery(api.sales.getDailySummary, {
    date: Date.now()
  });
  
  const customerData = useQuery(api.customers.getLoyaltyTop10, {});
  
  if (!salesData || !customerData) return <Spinner />;
  
  return (
    <Dashboard>
      <SalesSummary data={salesData} />
      <TopCustomers data={customerData} />
    </Dashboard>
  );
}
```

## 📚 Integration Examples

### Complete Sale Workflow

```typescript
async function processCompleteSale(saleData, paymentData) {
  try {
    // 1. Create sale
    const sale = await client.mutation(api.sales.create, saleData);
    
    // 2. Add items
    for (const item of saleData.items) {
      await client.mutation(api.sales.addItem, {
        saleId: sale.saleId,
        ...item
      });
    }
    
    // 3. Process payment
    await client.mutation(api.salePayments.create, {
      saleId: sale.saleId,
      ...paymentData
    });
    
    // 4. Complete sale (updates stock, creates accounting entries)
    const result = await client.mutation(api.sales.submitSale, {
      saleId: sale.saleId,
      payments: [paymentData]
    });
    
    return { success: true, sale: result };
    
  } catch (error) {
    // Rollback any partial operations
    console.error("Sale processing failed:", error);
    return { success: false, error: error.message };
  }
}
```

### Financial Reporting Integration

```typescript
async function generateMonthlyReport(month: number, year: number) {
  const startDate = new Date(year, month - 1, 1).getTime();
  const endDate = new Date(year, month, 0).getTime();
  
  const [balanceSheet, incomeStatement, cashFlow] = await Promise.all([
    client.query(api.financialReports.getBalanceSheet, {
      asOfDate: endDate,
      comparative: true
    }),
    client.query(api.financialReports.getIncomeStatement, {
      startDate,
      endDate,
      comparative: true
    }),
    client.query(api.financialReports.getCashFlowStatement, {
      startDate,
      endDate
    })
  ]);
  
  return {
    period: `${year}-${month.toString().padStart(2, '0')}`,
    balanceSheet,
    incomeStatement,
    cashFlow
  };
}
```

---

**Related Documentation**:
- [Installation Guide](./02-installation-guide.md) - Setup API environment
- [User Guide](./05-user-guide.md) - Business process workflows
- [Contributing Guide](./13-contributing-guide.md) - Development standards
- [System Architecture](./06-system-architecture.md) - Technical design