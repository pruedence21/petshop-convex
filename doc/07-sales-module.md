# 🛒 Sales Module Documentation - Pet Shop Management System

Comprehensive documentation for the Sales module, covering all retail operations, point-of-sale functionality, inventory integration, and sales analytics.

## 📋 Table of Contents

- [Module Overview](#module-overview)
- [Point of Sale System](#point-of-sale-system)
- [Product Catalog](#product-catalog)
- [Customer Management](#customer-management)
- [Payment Processing](#payment-processing)
- [Inventory Integration](#inventory-integration)
- [Sales Analytics](#sales-analytics)
- [Loyalty Program](#loyalty-program)
- [Returns & Exchanges](#returns--exchanges)
- [API Reference](#api-reference)

## 🎯 Module Overview

The Sales module provides a complete point-of-sale (POS) solution specifically designed for pet shops. It integrates seamlessly with inventory management, customer records, and accounting systems to provide real-time business operations.

### Key Features

- **Modern POS Interface**: Touch-friendly, fast checkout
- **Real-time Inventory**: Automatic stock updates during sales
- **Multi-payment Support**: Cash, card, digital wallets, split payments
- **Customer Integration**: Loyalty program, purchase history
- **Analytics Dashboard**: Real-time sales insights
- **Receipt Management**: Print, email, SMS receipts

### Business Benefits

- **Faster Checkout**: Streamlined sales process
- **Accurate Inventory**: Real-time stock tracking
- **Customer Insights**: Purchase behavior analysis
- **Financial Integration**: Automatic accounting entries
- **Operational Efficiency**: Reduced manual processes

## 💻 Point of Sale System

### Sales Dashboard

The main sales interface provides:

```
┌─────────────────────────────────────────────────────────────┐
│ 💰 NEW SALE - Pet Shop POS                                 │
├─────────────────────────────────────────────────────────────┤
│ Customer: [Search/Create]         📋 Loyalty: 245 pts      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Products:                                                  │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Scan Barcode: [________________] 🔍                     │ │
│ │ OR Product Name: [________________] 🔍                  │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Current Cart:                💰 Subtotal: $156.50         │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 1. Premium Dog Food (2x)  @ $24.99 = $49.98           │ │
│ │ 2. Cat Treats (3x)        @ $8.99  = $26.97           │ │
│ │ 3. Dog Toy (1x)           @ $12.99 = $12.99           │ │
│ │ 4. Dog Collar (1x)        @ $18.99 = $18.99           │ │
│ │ 5. Cat Litter (1x)        @ $24.99 = $24.99           │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ 💳 Tax (10%): $15.65    🛒 Items: 5    📦 Total: $172.15  │
├─────────────────────────────────────────────────────────────┤
│ [Hold Sale] [Clear] 💳 Payment →                         │
└─────────────────────────────────────────────────────────────┘
```

### Product Search Methods

#### 1. Barcode Scanning
```typescript
// Scan product barcode for instant lookup
const handleBarcodeScan = (barcode: string) => {
  const product = products.find(p => p.barcode === barcode);
  if (product) {
    addToCart(product);
  } else {
    showProductNotFound(barcode);
  }
};
```

#### 2. Text Search
```typescript
// Search by product name, SKU, or description
const handleProductSearch = (query: string) => {
  const results = products.filter(product => 
    product.name.toLowerCase().includes(query.toLowerCase()) ||
    product.sku.includes(query) ||
    product.description.toLowerCase().includes(query.toLowerCase())
  );
  displaySearchResults(results);
};
```

#### 3. Category Browsing
```typescript
// Browse products by category
const categories = [
  { id: "pet-food", name: "Pet Food", subcategories: ["Dog Food", "Cat Food"] },
  { id: "supplies", name: "Supplies", subcategories: ["Grooming", "Toys", "Accessories"] },
  { id: "health", name: "Health & Wellness", subcategories: ["Vitamins", "Medications"] }
];
```

### Shopping Cart Management

#### Adding Items
```typescript
interface CartItem {
  productId: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  discounts: Discount[];
  notes?: string;
}

const addToCart = (product: Product, quantity: number = 1) => {
  const existingItem = cart.find(item => item.productId === product.id);
  
  if (existingItem) {
    existingItem.quantity += quantity;
    existingItem.subtotal = existingItem.quantity * existingItem.unitPrice;
  } else {
    cart.push({
      productId: product.id,
      quantity,
      unitPrice: product.sellingPrice,
      subtotal: quantity * product.sellingPrice,
      discounts: [],
      productName: product.name
    });
  }
  
  recalculateCart();
};
```

#### Cart Operations
```typescript
// Update quantity
const updateQuantity = (productId: string, newQuantity: number) => {
  if (newQuantity <= 0) {
    removeFromCart(productId);
  } else {
    const item = cart.find(item => item.productId === productId);
    if (item) {
      item.quantity = newQuantity;
      item.subtotal = newQuantity * item.unitPrice;
      recalculateCart();
    }
  }
};

// Remove item
const removeFromCart = (productId: string) => {
  const index = cart.findIndex(item => item.productId === productId);
  if (index !== -1) {
    cart.splice(index, 1);
    recalculateCart();
  }
};

// Apply discount
const applyDiscount = (productId: string, discountType: DiscountType, amount: number) => {
  const item = cart.find(item => item.productId === productId);
  if (item) {
    item.discounts.push({
      type: discountType,
      amount,
      description: getDiscountDescription(discountType, amount)
    });
    recalculateCart();
  }
};
```

### Price Calculation

```typescript
interface PriceCalculation {
  subtotal: number;
  discounts: number;
  tax: number;
  taxRate: number;
  total: number;
  savings: number;
}

const calculateCartTotal = (cart: CartItem[], taxRate: number = 0.10): PriceCalculation => {
  const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const discounts = cart.reduce((sum, item) => 
    sum + item.discounts.reduce((dSum, discount) => dSum + discount.amount, 0), 0
  );
  const taxableAmount = subtotal - discounts;
  const tax = taxableAmount * taxRate;
  const total = taxableAmount + tax;
  
  return {
    subtotal,
    discounts,
    tax,
    taxRate,
    total,
    savings: discounts
  };
};
```

## 📦 Product Catalog

### Product Management

#### Product Structure
```typescript
interface Product {
  id: string;
  name: string;
  description: string;
  sku: string;
  barcode?: string;
  categoryId: string;
  subcategoryId?: string;
  brandId?: string;
  unitId: string;
  purchasePrice: number;    // Cost price
  sellingPrice: number;     // Retail price
  wholesalePrice?: number;  // Bulk price
  isActive: boolean;
  isTaxable: boolean;
  trackInventory: boolean;
  reorderLevel: number;
  reorderQuantity: number;
  weight?: number;
  dimensions?: ProductDimensions;
  images: ProductImage[];
  variants?: ProductVariant[];
  tags: string[];
  seoTitle?: string;
  seoDescription?: string;
  createdAt: number;
  updatedAt: number;
}
```

#### Product Categories

**Pet Food Categories**
```
📦 Pet Food/
├── 🐕 Dog Food
│   ├── Dry Food
│   │   ├── Puppy (0-12 months)
│   │   ├── Adult (1-7 years)
│   │   └── Senior (7+ years)
│   ├── Wet Food
│   │   ├── Puppy
│   │   ├── Adult
│   │   └── Senior
│   └── Treats
│       ├── Training Treats
│       ├── Dental Treats
│       └── Natural Treats
├── 🐱 Cat Food
│   ├── Dry Food
│   │   ├── Kitten (0-12 months)
│   │   ├── Adult (1-7 years)
│   │   └── Senior (7+ years)
│   ├── Wet Food
│   │   ├── Kitten
│   │   ├── Adult
│   │   └── Senior
│   └── Treats
│       ├── Catnip Treats
│       ├── Dental Treats
│       └── Crunchy Treats
├── 🦜 Bird Food
│   ├── Seeds
│   ├── Pellets
│   └── Treats
├── 🐠 Fish Food
│   ├── Flakes
│   ├── Pellets
│   └── Frozen
└── 🐹 Small Animal Food
    ├── Hamster Food
    ├── Rabbit Food
    └── Guinea Pig Food
```

**Supply Categories**
```
🧴 Supplies/
├── ✂️ Grooming Supplies
│   ├── Shampoos
│   ├── Brushes & Combs
│   ├── Nail Clippers
│   └── Professional Tools
├── 🧸 Toys & Entertainment
│   ├── Interactive Toys
│   ├── Chew Toys
│   ├── Puzzle Toys
│   └── Plush Toys
├── 🦴 Accessories
│   ├── Collars & Leashes
│   ├── Beds & Furniture
│   ├── Bowls & Feeders
│   └── Carriers & Crates
└── 🏥 Health & Wellness
    ├── Supplements
    ├── Medications
    ├── First Aid
    └── Preventive Care
```

### Product Search & Filtering

#### Search Implementation
```typescript
interface ProductFilter {
  categoryId?: string;
  subcategoryId?: string;
  brandId?: string;
  priceRange?: [number, number];
  inStock?: boolean;
  searchQuery?: string;
  tags?: string[];
  sortBy?: "name" | "price" | "popularity" | "newest";
  sortOrder?: "asc" | "desc";
}

const searchProducts = async (filters: ProductFilter): Promise<Product[]> => {
  let query = ctx.db.query("products").withIndex("by_active");
  
  // Apply filters
  if (filters.categoryId) {
    query = query.withIndex("by_category", q => q.eq("categoryId", filters.categoryId));
  }
  
  if (filters.brandId) {
    query = query.withIndex("by_brand", q => q.eq("brandId", filters.brandId));
  }
  
  if (filters.inStock) {
    query = query.withIndex("by_inventory", q => q.gt("stockQuantity", 0));
  }
  
  if (filters.searchQuery) {
    const products = await query.collect();
    return products.filter(product => 
      product.name.toLowerCase().includes(filters.searchQuery!.toLowerCase()) ||
      product.description.toLowerCase().includes(filters.searchQuery!.toLowerCase()) ||
      product.sku.includes(filters.searchQuery!)
    );
  }
  
  const products = await query.collect();
  
  // Apply additional filters
  return products.filter(product => {
    if (filters.priceRange) {
      const [min, max] = filters.priceRange;
      if (product.sellingPrice < min || product.sellingPrice > max) {
        return false;
      }
    }
    
    if (filters.tags && filters.tags.length > 0) {
      const hasMatchingTag = filters.tags.some(tag => 
        product.tags.includes(tag)
      );
      if (!hasMatchingTag) return false;
    }
    
    return true;
  });
};
```

## 👥 Customer Management

### Customer Records

#### Customer Profile
```typescript
interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: Address;
  dateOfBirth?: number;
  preferredContact: "EMAIL" | "PHONE" | "SMS" | "MAIL";
  loyaltyTier: "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";
  loyaltyPoints: number;
  totalSpent: number;
  lastVisit: number;
  visitCount: number;
  preferredPayment?: string;
  notes?: string;
  marketingOptIn: boolean;
  createdAt: number;
  updatedAt: number;
}
```

#### Pet Information
```typescript
interface CustomerPet {
  id: string;
  customerId: string;
  name: string;
  species: "DOG" | "CAT" | "BIRD" | "FISH" | "RABBIT" | "OTHER";
  breed?: string;
  dateOfBirth?: number;
  gender: "MALE" | "FEMALE" | "UNKNOWN";
  weight?: number;
  color?: string;
  microchipId?: string;
  profilePhoto?: string;
  specialNeeds?: string[];
  allergies?: string[];
  preferredFood?: string;
  behavioralNotes?: string;
  createdAt: number;
}
```

### Customer Lookup

#### Search Methods
```typescript
// Search by phone number (most common)
const searchByPhone = async (phoneNumber: string): Promise<Customer | null> => {
  const normalizedPhone = phoneNumber.replace(/\D/g, '');
  const customers = await ctx.db
    .query("customers")
    .withIndex("by_phone", q => q.eq("normalizedPhone", normalizedPhone))
    .collect();
    
  return customers[0] || null;
};

// Search by email
const searchByEmail = async (email: string): Promise<Customer | null> => {
  const customers = await ctx.db
    .query("customers")
    .withIndex("by_email", q => q.eq("email", email.toLowerCase()))
    .collect();
    
  return customers[0] || null;
};

// Search by name
const searchByName = async (name: string): Promise<Customer[]> => {
  const allCustomers = await ctx.db.query("customers").collect();
  
  return allCustomers.filter(customer => 
    customer.name.toLowerCase().includes(name.toLowerCase())
  );
};
```

### Quick Customer Creation

```typescript
const createQuickCustomer = async (customerData: {
  name: string;
  phone?: string;
  email?: string;
}): Promise<Customer> => {
  // Validate required fields
  if (!customerData.name || (!customerData.phone && !customerData.email)) {
    throw new Error("Customer name and at least one contact method required");
  }
  
  // Check for existing customer
  let existingCustomer = null;
  if (customerData.phone) {
    existingCustomer = await searchByPhone(customerData.phone);
  }
  if (!existingCustomer && customerData.email) {
    existingCustomer = await searchByEmail(customerData.email);
  }
  
  if (existingCustomer) {
    return existingCustomer; // Return existing customer
  }
  
  // Create new customer
  const customer = await ctx.db.insert("customers", {
    ...customerData,
    email: customerData.email?.toLowerCase(),
    loyaltyTier: "BRONZE",
    loyaltyPoints: 0,
    totalSpent: 0,
    lastVisit: Date.now(),
    visitCount: 1,
    marketingOptIn: false,
    createdAt: Date.now(),
    updatedAt: Date.now()
  });
  
  return customer;
};
```

## 💳 Payment Processing

### Payment Methods

#### Supported Payment Types
```typescript
interface PaymentMethod {
  id: string;
  name: string;
  type: "CASH" | "CARD" | "DIGITAL_WALLET" | "CHECK" | "GIFT_CARD";
  icon: string;
  requiresAmount: boolean;      // Cash requires amount received
  allowsChange: boolean;        // Cash allows change calculation
  processingFee?: number;       // Credit card processing fee
  instantProcessing: boolean;   // No delay for processing
  refundable: boolean;          // Can be refunded
}

const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: "cash",
    name: "Cash",
    type: "CASH",
    icon: "💵",
    requiresAmount: true,
    allowsChange: true,
    processingFee: 0,
    instantProcessing: true,
    refundable: true
  },
  {
    id: "credit_card",
    name: "Credit Card",
    type: "CARD",
    icon: "💳",
    requiresAmount: false,
    allowsChange: false,
    processingFee: 0.029, // 2.9%
    instantProcessing: true,
    refundable: true
  },
  {
    id: "debit_card",
    name: "Debit Card",
    type: "CARD",
    icon: "💳",
    requiresAmount: false,
    allowsChange: false,
    processingFee: 0,
    instantProcessing: true,
    refundable: true
  },
  {
    id: "digital_wallet",
    name: "Digital Wallet",
    type: "DIGITAL_WALLET",
    icon: "📱",
    requiresAmount: false,
    allowsChange: false,
    processingFee: 0.025,
    instantProcessing: true,
    refundable: true
  },
  {
    id: "gift_card",
    name: "Gift Card",
    type: "GIFT_CARD",
    icon: "🎁",
    requiresAmount: false,
    allowsChange: false,
    processingFee: 0,
    instantProcessing: true,
    refundable: false
  }
];
```

### Payment Processing Flow

#### Single Payment
```typescript
const processSinglePayment = async (saleId: string, paymentData: {
  method: string;
  amount?: number;
  reference?: string;
}) => {
  const sale = await ctx.db.get(saleId);
  if (!sale) throw new Error("Sale not found");
  
  const payment = await ctx.db.insert("salePayments", {
    saleId,
    amount: paymentData.amount || sale.totalAmount,
    paymentMethod: paymentData.method,
    referenceNumber: paymentData.reference,
    processedAt: Date.now(),
    status: "COMPLETED"
  });
  
  // Update sale status
  await ctx.db.patch(saleId, {
    status: "COMPLETED",
    paymentStatus: "PAID",
    updatedAt: Date.now()
  });
  
  return payment;
};
```

#### Split Payments
```typescript
interface SplitPayment {
  method: string;
  amount: number;
  reference?: string;
}

const processSplitPayment = async (saleId: string, payments: SplitPayment[]) => {
  const sale = await ctx.db.get(saleId);
  if (!sale) throw new Error("Sale not found");
  
  const totalPayment = payments.reduce((sum, p) => sum + p.amount, 0);
  if (Math.abs(totalPayment - sale.totalAmount) > 0.01) {
    throw new Error("Payment total must equal sale total");
  }
  
  // Process each payment
  const processedPayments = [];
  for (const paymentData of payments) {
    const payment = await ctx.db.insert("salePayments", {
      saleId,
      amount: paymentData.amount,
      paymentMethod: paymentData.method,
      referenceNumber: paymentData.reference,
      processedAt: Date.now(),
      status: "COMPLETED"
    });
    processedPayments.push(payment);
  }
  
  // Update sale
  await ctx.db.patch(saleId, {
    status: "COMPLETED",
    paymentStatus: "PAID",
    updatedAt: Date.now()
  });
  
  return processedPayments;
};
```

### Cash Management

#### Change Calculation
```typescript
const calculateChange = (amountReceived: number, totalAmount: number): number => {
  return Math.max(0, amountReceived - totalAmount);
};

const makeChange = (changeAmount: number): ChangeBreakdown => {
  const denominations = [
    { value: 100000, name: "100k note", count: 0 },
    { value: 50000, name: "50k note", count: 0 },
    { value: 20000, name: "20k note", count: 0 },
    { value: 10000, name: "10k note", count: 0 },
    { value: 5000, name: "5k note", count: 0 },
    { value: 2000, name: "2k note", count: 0 },
    { value: 1000, name: "1k note", count: 0 },
    { value: 500, name: "500 coin", count: 0 },
    { value: 100, name: "100 coin", count: 0 },
    { value: 50, name: "50 coin", count: 0 }
  ];
  
  let remaining = changeAmount;
  
  for (const denom of denominations) {
    if (remaining >= denom.value) {
      denom.count = Math.floor(remaining / denom.value);
      remaining -= denom.count * denom.value;
    }
  }
  
  return {
    total: changeAmount,
    denominations: denominations.filter(d => d.count > 0),
    remaining: remaining // Should be 0
  };
};
```

## 📦 Inventory Integration

### Real-time Stock Updates

#### Stock Reduction During Sale
```typescript
const updateStockForSale = async (saleId: string, items: SaleItem[]) => {
  for (const item of items) {
    // Get current stock
    const stockRecord = await ctx.db
      .query("productStock")
      .withIndex("by_product_branch", q => 
        q.eq("productId", item.productId)
         .eq("branchId", getCurrentBranchId())
      )
      .unique();
    
    if (!stockRecord || stockRecord.quantity < item.quantity) {
      throw new Error(`Insufficient stock for product ${item.productId}`);
    }
    
    // Update stock quantity
    await ctx.db.patch(stockRecord._id, {
      quantity: stockRecord.quantity - item.quantity,
      updatedAt: Date.now()
    });
    
    // Record stock movement
    await ctx.db.insert("stockMovements", {
      productId: item.productId,
      branchId: getCurrentBranchId(),
      movementType: "SALE",
      quantityChange: -item.quantity,
      referenceId: saleId,
      referenceType: "sale",
      notes: "Stock reduced due to sale",
      createdAt: Date.now()
    });
    
    // Check reorder level
    if (stockRecord.quantity - item.quantity <= stockRecord.reorderLevel) {
      await createReorderAlert(item.productId, stockRecord.quantity - item.quantity);
    }
  }
};
```

#### Stock Reservation
```typescript
const reserveStock = async (cart: CartItem[], reservationMinutes: number = 30) => {
  const reservations = [];
  
  for (const item of cart) {
    const stockRecord = await ctx.db
      .query("productStock")
      .withIndex("by_product_branch", q => 
        q.eq("productId", item.productId)
         .eq("branchId", getCurrentBranchId())
      )
      .unique();
    
    if (!stockRecord || stockRecord.quantity < item.quantity) {
      throw new Error(`Insufficient stock for ${item.productName}`);
    }
    
    // Create reservation
    const reservation = await ctx.db.insert("stockReservations", {
      productId: item.productId,
      branchId: getCurrentBranchId(),
      quantity: item.quantity,
      expiresAt: Date.now() + (reservationMinutes * 60 * 1000),
      cartId: getCurrentCartId(),
      status: "ACTIVE"
    });
    
    reservations.push(reservation);
  }
  
  return reservations;
};
```

### Low Stock Alerts

#### Alert Generation
```typescript
const checkLowStock = async () => {
  const lowStockItems = await ctx.db
    .query("productStock")
    .withIndex("by_branch", q => q.eq("branchId", getCurrentBranchId()))
    .filter(stock => stock.quantity <= stock.reorderLevel)
    .collect();
  
  for (const stock of lowStockItems) {
    const product = await ctx.db.get(stock.productId);
    
    // Create alert
    await ctx.db.insert("inventoryAlerts", {
      type: "LOW_STOCK",
      productId: stock.productId,
      branchId: stock.branchId,
      currentStock: stock.quantity,
      reorderLevel: stock.reorderLevel,
      severity: stock.quantity === 0 ? "CRITICAL" : "WARNING",
      message: `Low stock: ${product.name} (${stock.quantity} remaining)`,
      createdAt: Date.now(),
      resolved: false
    });
    
    // Send notification (email/SMS)
    await sendLowStockNotification({
      product: product.name,
      currentStock: stock.quantity,
      reorderLevel: stock.reorderLevel,
      reorderQuantity: stock.reorderQuantity
    });
  }
};
```

## 📊 Sales Analytics

### Real-time Dashboard

#### Key Metrics
```typescript
interface SalesMetrics {
  // Current period metrics
  totalSales: number;
  totalTransactions: number;
  averageTransactionValue: number;
  topSellingProducts: ProductSalesData[];
  salesByHour: HourlySalesData[];
  salesByCategory: CategorySalesData[];
  paymentMethodBreakdown: PaymentMethodData[];
  
  // Comparison metrics
  vsYesterday: PercentageChange;
  vsLastWeek: PercentageChange;
  vsLastMonth: PercentageChange;
  
  // Goals and targets
  dailyGoal: number;
  goalProgress: number;
  goalProgressPercentage: number;
}

const getSalesMetrics = async (dateRange: DateRange): Promise<SalesMetrics> => {
  const sales = await ctx.db
    .query("sales")
    .withIndex("by_date_branch", q => 
      q.gte("saleDate", dateRange.start)
       .lte("saleDate", dateRange.end)
       .eq("branchId", getCurrentBranchId())
    )
    .collect();
  
  // Calculate metrics
  const totalSales = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
  const totalTransactions = sales.length;
  const averageTransactionValue = totalTransactions > 0 ? totalSales / totalTransactions : 0;
  
  // Get top selling products
  const productSales = await getProductSalesData(dateRange);
  const topSellingProducts = productSales
    .sort((a, b) => b.quantitySold - a.quantitySold)
    .slice(0, 10);
  
  // Calculate hourly breakdown
  const salesByHour = calculateHourlySales(sales);
  
  return {
    totalSales,
    totalTransactions,
    averageTransactionValue,
    topSellingProducts,
    salesByHour,
    // ... other metrics
  };
};
```

### Performance Tracking

#### Daily Sales Report
```typescript
interface DailySalesReport {
  date: string;
  summary: {
    totalRevenue: number;
    totalTransactions: number;
    averageTransaction: number;
    totalItems: number;
    returns: number;
    netSales: number;
  };
  hourlyBreakdown: HourlySales[];
  topProducts: ProductPerformance[];
  paymentMethods: PaymentMethodStats[];
  customerMetrics: CustomerStats;
}

const generateDailyReport = async (date: string): Promise<DailySalesReport> => {
  const startOfDay = new Date(date + "T00:00:00").getTime();
  const endOfDay = new Date(date + "T23:59:59").getTime();
  
  const sales = await ctx.db
    .query("sales")
    .withIndex("by_date", q => 
      q.gte("saleDate", startOfDay)
       .lte("saleDate", endOfDay)
    )
    .collect();
  
  const returns = await ctx.db
    .query("saleReturns")
    .withIndex("by_date", q => 
      q.gte("returnDate", startOfDay)
       .lte("returnDate", endOfDay)
    )
    .collect();
  
  return {
    date,
    summary: {
      totalRevenue: sales.reduce((sum, s) => sum + s.totalAmount, 0),
      totalTransactions: sales.length,
      averageTransaction: sales.length > 0 ? 
        sales.reduce((sum, s) => sum + s.totalAmount, 0) / sales.length : 0,
      totalItems: sales.reduce((sum, s) => 
        sum + s.items.reduce((iSum, item) => iSum + item.quantity, 0), 0),
      returns: returns.reduce((sum, r) => sum + r.refundAmount, 0),
      netSales: sales.reduce((sum, s) => sum + s.totalAmount, 0) - 
                returns.reduce((sum, r) => sum + r.refundAmount, 0)
    },
    hourlyBreakdown: calculateHourlyBreakdown(sales),
    topProducts: await getTopProducts(sales),
    paymentMethods: analyzePaymentMethods(sales),
    customerMetrics: await analyzeCustomers(sales)
  };
};
```

## 🎁 Loyalty Program

### Program Structure

#### Loyalty Tiers
```typescript
interface LoyaltyTier {
  id: string;
  name: string;
  minPoints: number;
  minSpend?: number;
  benefits: LoyaltyBenefit[];
  multiplier: number; // Points earning multiplier
  color: string;
  icon: string;
}

const LOYALTY_TIERS: LoyaltyTier[] = [
  {
    id: "bronze",
    name: "Bronze",
    minPoints: 0,
    multiplier: 1,
    benefits: ["Basic points earning", "Birthday discount"],
    color: "#CD7F32",
    icon: "🥉"
  },
  {
    id: "silver",
    name: "Silver",
    minPoints: 500,
    minSpend: 1000,
    multiplier: 1.25,
    benefits: ["25% bonus points", "Priority customer service", "Monthly special offers"],
    color: "#C0C0C0",
    icon: "🥈"
  },
  {
    id: "gold",
    name: "Gold",
    minPoints: 2000,
    minSpend: 5000,
    multiplier: 1.5,
    benefits: ["50% bonus points", "Free shipping", "Early access to sales", "Personal pet consultant"],
    color: "#FFD700",
    icon: "🥇"
  },
  {
    id: "platinum",
    name: "Platinum",
    minPoints: 5000,
    minSpend: 15000,
    multiplier: 2,
    benefits: ["Double points", "VIP events", "Free grooming monthly", "Dedicated account manager"],
    color: "#E5E4E2",
    icon: "💎"
  }
];
```

#### Points Earning
```typescript
const calculatePointsEarned = (saleAmount: number, customerTier: string): number => {
  const tier = LOYALTY_TIERS.find(t => t.id === customerTier);
  const basePoints = Math.floor(saleAmount); // 1 point per dollar
  const multiplier = tier?.multiplier || 1;
  
  return Math.floor(basePoints * multiplier);
};

const processLoyaltyPoints = async (saleId: string, customerId: string) => {
  const sale = await ctx.db.get(saleId);
  const customer = await ctx.db.get(customerId);
  
  const pointsEarned = calculatePointsEarned(sale.totalAmount, customer.loyaltyTier);
  
  // Add points to customer account
  const newPointsBalance = customer.loyaltyPoints + pointsEarned;
  await ctx.db.patch(customerId, {
    loyaltyPoints: newPointsBalance,
    totalSpent: customer.totalSpent + sale.totalAmount,
    lastVisit: Date.now(),
    visitCount: customer.visitCount + 1
  });
  
  // Record points transaction
  await ctx.db.insert("loyaltyTransactions", {
    customerId,
    type: "EARNED",
    points: pointsEarned,
    source: "SALE",
    referenceId: saleId,
    description: `Points earned from sale ${sale.saleNumber}`,
    createdAt: Date.now()
  });
  
  // Check for tier upgrade
  await checkTierUpgrade(customerId, newPointsBalance);
  
  return pointsEarned;
};
```

#### Points Redemption
```typescript
const redeemPoints = async (customerId: string, pointsToRedeem: number, saleId?: string) => {
  const customer = await ctx.db.get(customerId);
  
  if (customer.loyaltyPoints < pointsToRedeem) {
    throw new Error("Insufficient points balance");
  }
  
  const redemptionValue = calculatePointsValue(pointsToRedeem);
  
  // Deduct points
  await ctx.db.patch(customerId, {
    loyaltyPoints: customer.loyaltyPoints - pointsToRedeem
  });
  
  // Record redemption
  await ctx.db.insert("loyaltyTransactions", {
    customerId,
    type: "REDEEMED",
    points: -pointsToRedeem,
    value: redemptionValue,
    source: saleId ? "SALE_DISCOUNT" : "MANUAL_REDEMPTION",
    referenceId: saleId,
    description: saleId ? `Discount applied to sale` : "Manual points redemption",
    createdAt: Date.now()
  });
  
  return {
    pointsRedeemed: pointsToRedeem,
    redemptionValue,
    remainingPoints: customer.loyaltyPoints - pointsToRedeem
  };
};

const calculatePointsValue = (points: number): number => {
  // 100 points = $1 redemption value
  return Math.floor(points / 100);
};
```

## 🔄 Returns & Exchanges

### Return Processing

#### Return Request
```typescript
interface ReturnRequest {
  originalSaleId: string;
  customerId: string;
  returnReason: "DAMAGED" | "WRONG_ITEM" | "CUSTOMER_CHANGE" | "DEFECTIVE" | "OTHER";
  returnItems: ReturnItem[];
  refundMethod: "ORIGINAL" | "STORE_CREDIT" | "CASH";
  notes?: string;
}

const processReturn = async (returnRequest: ReturnRequest) => {
  const originalSale = await ctx.db.get(returnRequest.originalSaleId);
  if (!originalSale) throw new Error("Original sale not found");
  
  // Validate return items
  for (const returnItem of returnRequest.returnItems) {
    const originalItem = originalSale.items.find(
      item => item.productId === returnItem.productId
    );
    
    if (!originalItem || originalItem.quantity < returnItem.quantity) {
      throw new Error(`Cannot return more than purchased for product ${returnItem.productId}`);
    }
  }
  
  // Calculate refund amount
  const refundAmount = returnRequest.returnItems.reduce((sum, item) => {
    const originalItem = originalSale.items.find(
      i => i.productId === item.productId
    );
    return sum + (originalItem!.unitPrice * item.quantity);
  }, 0);
  
  // Create return record
  const saleReturn = await ctx.db.insert("saleReturns", {
    originalSaleId: returnRequest.originalSaleId,
    customerId: returnRequest.customerId,
    returnDate: Date.now(),
    returnReason: returnRequest.returnReason,
    refundAmount,
    refundMethod: returnRequest.refundMethod,
    items: returnRequest.returnItems,
    notes: returnRequest.notes,
    status: "PROCESSED",
    processedBy: getCurrentUserId()
  });
  
  // Process refund
  await processRefund(saleReturn._id, refundAmount, returnRequest.refundMethod);
  
  // Restock returned items
  await restockReturnedItems(returnRequest.returnItems);
  
  // Update customer loyalty points
  await adjustLoyaltyPoints(returnRequest.customerId, originalSale, returnRequest.returnItems);
  
  return saleReturn;
};
```

#### Inventory Restocking
```typescript
const restockReturnedItems = async (returnItems: ReturnItem[]) => {
  for (const returnItem of returnItems) {
    // Get current stock
    const stockRecord = await ctx.db
      .query("productStock")
      .withIndex("by_product_branch", q => 
        q.eq("productId", returnItem.productId)
         .eq("branchId", getCurrentBranchId())
      )
      .unique();
    
    if (stockRecord) {
      // Increase stock
      await ctx.db.patch(stockRecord._id, {
        quantity: stockRecord.quantity + returnItem.quantity,
        updatedAt: Date.now()
      });
    } else {
      // Create new stock record
      await ctx.db.insert("productStock", {
        productId: returnItem.productId,
        branchId: getCurrentBranchId(),
        quantity: returnItem.quantity,
        reorderLevel: 10,
        lastRestocked: Date.now()
      });
    }
    
    // Record stock movement
    await ctx.db.insert("stockMovements", {
      productId: returnItem.productId,
      branchId: getCurrentBranchId(),
      movementType: "RETURN",
      quantityChange: returnItem.quantity,
      referenceId: `return_${returnItem.productId}`,
      notes: "Stock increased due to customer return",
      createdAt: Date.now()
    });
  }
};
```

## 🔧 API Reference

### Core Sales Functions

#### `sales.create`
Create a new sale transaction.

```typescript
const newSale = await client.mutation(api.sales.create, {
  customerId?: "customer_123",
  branchId: "branch_456",
  saleDate: Date.now(),
  items: [
    {
      productId: "product_789",
      quantity: 2,
      unitPrice: 2499, // $24.99
      subtotal: 4998
    }
  ],
  subtotal: 4998,
  taxAmount: 500,
  discountAmount: 0,
  totalAmount: 5498,
  paymentMethod: "CASH"
});
```

**Response:**
```typescript
{
  saleId: "sale_123",
  saleNumber: "SAL-20251112-001",
  totalAmount: 5498,
  status: "DRAFT",
  journalEntryId?: "je_456"
}
```

#### `sales.submitSale`
Complete a sale transaction.

```typescript
const completedSale = await client.mutation(api.sales.submitSale, {
  saleId: "sale_123",
  payments: [
    {
      amount: 5498,
      paymentMethod: "CASH",
      referenceNumber: "CASH_001"
    }
  ]
});
```

**Effects:**
- Updates product stock
- Creates accounting journal entries
- Updates customer loyalty points
- Generates receipt

#### `sales.getById`
Get complete sale details.

```typescript
const saleDetails = await client.query(api.sales.getById, {
  saleId: "sale_123"
});
```

**Response:**
```typescript
{
  _id: "sale_123",
  saleNumber: "SAL-20251112-001",
  customer: { name: "John Doe", loyaltyPoints: 245 },
  items: [
    {
      product: { name: "Premium Dog Food", sku: "PDF-001" },
      quantity: 2,
      unitPrice: 2499,
      subtotal: 4998
    }
  ],
  payments: [
    { method: "CASH", amount: 5498, processedAt: 1634567890000 }
  ],
  status: "COMPLETED",
  totalAmount: 5498
}
```

### Supporting Functions

#### `salePayments.create`
Record payment for a sale.

#### `customers.search`
Search for existing customers.

#### `products.search`
Search and filter products.

#### `loyalty.processPoints`
Process loyalty points earning/redemption.

---

**Related Documentation**:
- [User Guide](./05-user-guide.md) - Complete business workflows
- [API Reference](./04-api-reference.md) - Technical API details
- [Installation Guide](./02-installation-guide.md) - System setup
- [System Architecture](./06-system-architecture.md) - Technical overview