# 🏗️ System Architecture - Pet Shop Management System

Technical documentation covering the system architecture, design patterns, technology stack, and infrastructure components of the Pet Shop Management System.

## 📋 Table of Contents

- [Architecture Overview](#architecture-overview)
- [Technology Stack](#technology-stack)
- [System Components](#system-components)
- [Database Design](#database-design)
- [API Architecture](#api-architecture)
- [Frontend Architecture](#frontend-architecture)
- [Security Architecture](#security-architecture)
- [Deployment Architecture](#deployment-architecture)
- [Scalability & Performance](#scalability--performance)
- [Monitoring & Logging](#monitoring--logging)

## 🏛️ Architecture Overview

### High-Level Architecture

The Pet Shop Management System follows a modern full-stack architecture with real-time capabilities:

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                             │
├─────────────────────────────────────────────────────────────────┤
│  🖥️ Web Browser     │  📱 Mobile Apps  │  🔌 Third-party APIs  │
│  Next.js Frontend   │  (Future)        │  Integrations         │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                      APPLICATION LAYER                          │
├─────────────────────────────────────────────────────────────────┤
│                    Next.js 16 + React 19                       │
│  • Server-Side Rendering (SSR)                                  │
│  • Static Site Generation (SSG)                                 │
│  • API Routes                                                   │
│  • Middleware                                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                      BUSINESS LOGIC LAYER                       │
├─────────────────────────────────────────────────────────────────┤
│                    Convex Functions                             │
│  • Real-time Queries                                            │
│  • Mutations & Actions                                          │
│  • Scheduled Functions                                          │
│  • Authentication                                               │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                       DATA LAYER                                │
├─────────────────────────────────────────────────────────────────┤
│                   Convex Database                               │
│  • PostgreSQL Backend                                           │
│  • Real-time Synchronization                                    │
│  • ACID Transactions                                            │
│  • Automatic Backups                                            │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                    INFRASTRUCTURE LAYER                         │
├─────────────────────────────────────────────────────────────────┤
│  🌐 CDN            │  🔐 SSL/TLS      │  📊 Monitoring        │
│  Vercel/Netlify    │  Security       │  Analytics            │
│  Global Delivery   │  Certificates   │  Error Tracking       │
└─────────────────────────────────────────────────────────────────┘
```

### Architecture Principles

1. **Real-time First**: All data operations support real-time synchronization
2. **Type Safety**: Full TypeScript coverage for reliability
3. **Scalable Design**: Supports multi-branch operations and concurrent users
4. **Security Focused**: Built-in authentication and authorization
5. **Modern Standards**: Uses latest web technologies and best practices
6. **Cloud Native**: Designed for cloud deployment and scalability

## 🛠️ Technology Stack

### Frontend Technologies

#### Core Framework
```typescript
// Next.js 16 with App Router
- Server-Side Rendering (SSR)
- Static Site Generation (SSG) 
- Incremental Static Regeneration (ISR)
- API Routes
- Middleware Support

// React 19
- Concurrent Features
- Server Components
- Suspense Integration
- Hooks Evolution
```

#### UI Framework & Styling
```typescript
// Tailwind CSS 4
- Utility-first CSS framework
- Custom design system
- Dark mode support
- Responsive design
- Component styling

// shadcn/ui Components
- Accessible component library
- Radix UI primitives
- Custom component variants
- Type-safe component props
- Consistent design patterns
```

#### State Management
```typescript
// React State (Built-in)
// - useState for local state
// - useContext for shared state
// - useReducer for complex state logic

// Convex Client
// - Real-time data synchronization
// - Optimistic updates
// - Automatic cache management
// - Query subscriptions

// React Query (Convex)
- Server state management
- Background synchronization
- Error handling and retry
- Cache invalidation
```

### Backend Technologies

#### Core Backend Platform
```typescript
// Convex Platform
- Real-time database
- Serverless functions
- Automatic scaling
- Global distribution
- Built-in authentication

// Convex Features
- Type-safe queries and mutations
- Real-time subscriptions
- Scheduled functions
- File storage
- Authentication & authorization
```

#### Database Technology
```typescript
// PostgreSQL Backend
- Relational database
- ACID transactions
- Advanced indexing
- Full-text search
- JSON/JSONB support

// Convex Optimizations
- Automatic indexing
- Query optimization
- Connection pooling
- Backup management
- Performance monitoring
```

### Development Tools

#### Development Environment
```typescript
// TypeScript 5
- Strict type checking
- Modern JavaScript features
- IntelliSense support
- Error prevention
- Code refactoring

// ESLint & Prettier
- Code quality enforcement
- Consistent formatting
- Security linting
- Performance analysis
- Import organization
```

#### Testing Framework
```typescript
// Testing Strategy
// - Unit tests for business logic
// - Integration tests for APIs
// - E2E tests for user workflows
// - Performance testing
// - Security testing

// Test Tools
- Vitest for unit testing
- React Testing Library
- Playwright for E2E
- Jest for integration tests
```

## 🧩 System Components

### Frontend Components

#### Application Structure
```
src/
├── app/                          # Next.js App Router
│   ├── (auth)/                  # Authentication pages
│   ├── dashboard/               # Main application
│   │   ├── sales/              # Sales module
│   │   ├── clinic/             # Clinic module
│   │   ├── hotel/              # Hotel module
│   │   ├── accounting/         # Accounting module
│   │   ├── products/           # Inventory module
│   │   ├── customers/          # Customer module
│   │   └── reports/            # Reports module
│   ├── globals.css             # Global styles
│   ├── layout.tsx              # Root layout
│   └── page.tsx                # Home page
├── components/                  # Reusable components
│   ├── ui/                     # shadcn/ui components
│   ├── forms/                  # Form components
│   ├── charts/                 # Data visualization
│   └── layout/                 # Layout components
├── lib/                         # Utilities and helpers
│   ├── utils.ts               # General utilities
│   ├── convex.ts              # Convex client setup
│   └── validations.ts         # Form validations
└── hooks/                      # Custom React hooks
    ├── useAuth.ts             # Authentication logic
    ├── useRealtime.ts         # Real-time data hooks
    └── useDashboard.ts        # Dashboard functionality
```

#### Component Architecture Pattern
```typescript
// Atomic Design Pattern
// Atoms: Basic UI elements (Button, Input, Label)
// Molecules: Simple combinations (SearchBox, FormField)
// Organisms: Complex components (Navigation, DataTable)
// Templates: Page layouts (DashboardLayout)
// Pages: Full page components

// Component Example
interface SalesDashboardProps {
  data: SalesMetrics;
  onDateRangeChange: (range: DateRange) => void;
  onRefresh: () => void;
}

export function SalesDashboard({
  data,
  onDateRangeChange,
  onRefresh
}: SalesDashboardProps) {
  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Sales Dashboard"
        onRefresh={onRefresh}
      />
      
      <MetricGrid>
        <MetricCard
          title="Total Sales"
          value={data.totalSales}
          change={data.salesChange}
        />
        <MetricCard
          title="Transactions"
          value={data.transactionCount}
          change={data.transactionChange}
        />
        <MetricCard
          title="Average Transaction"
          value={data.averageTransaction}
          change={data.averageChange}
        />
      </MetricGrid>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SalesChart data={data.salesTrend} />
        <TopProductsTable data={data.topProducts} />
      </div>
    </div>
  );
}
```

### Backend Components

#### Convex Function Structure
```
convex/
├── clinic/                    # Clinic module
├── finance/                   # Accounting & Finance module
├── hotel/                     # Hotel module
├── inventory/                 # Inventory module
├── master_data/               # Master Data (Customers, Pets)
├── procurement/               # Procurement module
├── reports/                   # Reports module
├── sales/                     # Sales module
├── users/                     # User management
├── auth.config.ts             # Auth configuration
├── auth.ts                    # Authentication logic
├── http.ts                    # HTTP handlers
├── schema.ts                  # Database schema
└── seed.ts                    # Seed data
```

#### Query Function Example
```typescript
// sales.ts - Query function example
import { query } from "./_generated/server";
import { v } from "convex/values";

export const getSalesByDateRange = query({
  args: {
    startDate: v.number(),
    endDate: v.number(),
    branchId: v.optional(v.id("branches"))
  },

  handler: async (ctx, args) => {
    // Build query with filters
    let salesQuery = ctx.db.query("sales")
      .withIndex("by_date", q => 
        q.gte("saleDate", args.startDate)
         .lte("saleDate", args.endDate)
      );

    // Apply branch filter if specified
    if (args.branchId) {
      salesQuery = salesQuery.filter(sale => 
        sale.branchId === args.branchId
      );
    }

    // Fetch and process data
    const sales = await salesQuery.collect();
    
    // Calculate metrics
    const totalSales = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
    const transactionCount = sales.length;
    const averageTransaction = transactionCount > 0 ? totalSales / transactionCount : 0;

    // Group by day for trend analysis
    const salesByDay = sales.reduce((acc, sale) => {
      const day = new Date(sale.saleDate).toDateString();
      acc[day] = (acc[day] || 0) + sale.totalAmount;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalSales,
      transactionCount,
      averageTransaction,
      salesTrend: Object.entries(salesByDay).map(([date, amount]) => ({
        date,
        amount
      }))
    };
  }
});
```

#### Mutation Function Example
```typescript
// sales.ts - Mutation function example
import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const createSale = mutation({
  args: {
    customerId: v.optional(v.id("customers")),
    branchId: v.id("branches"),
    items: v.array(v.object({
      productId: v.id("products"),
      quantity: v.number(),
      unitPrice: v.number()
    })),
    paymentMethod: v.string(),
    notes: v.optional(v.string())
  },

  handler: async (ctx, args) => {
    // Generate sale number
    const saleNumber = await generateSaleNumber(ctx);
    
    // Calculate totals
    const subtotal = args.items.reduce((sum, item) => 
      sum + (item.quantity * item.unitPrice), 0
    );
    const tax = subtotal * 0.1; // 10% tax
    const total = subtotal + tax;

    // Create sale record
    const saleId = await ctx.db.insert("sales", {
      saleNumber,
      customerId: args.customerId,
      branchId: args.branchId,
      saleDate: Date.now(),
      subtotal,
      taxAmount: tax,
      totalAmount: total,
      paymentMethod: args.paymentMethod,
      status: "PENDING",
      notes: args.notes
    });

    // Create sale items
    for (const item of args.items) {
      await ctx.db.insert("saleItems", {
        saleId,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: item.quantity * item.unitPrice
      });

      // Update inventory
      await updateProductStock(ctx, item.productId, -item.quantity);
    }

    return saleId;
  }
});
```

## 🗄️ Database Design

### Schema Architecture

#### Entity Relationship Overview
```sql
-- Core Business Entities
CUSTOMERS -> PETS -> APPOINTMENTS
    |           |
    |           +-> MEDICAL_RECORDS
    |           |
    |           +-> VACCINATION_RECORDS
    |
    +-> SALES -> SALE_ITEMS
    |
    +-> HOTEL_BOOKINGS -> DAILY_LOGS
    |
    +-> EXPENSE_CLAIMS

-- Supporting Entities
PRODUCTS -> PRODUCT_VARIANTS -> PRODUCT_STOCK
    |
    +-> PURCHASE_ORDERS -> PURCHASE_ORDER_ITEMS

-- Financial Entities
ACCOUNTS -> JOURNAL_ENTRIES -> JOURNAL_ENTRY_LINES
    |
    +-> BANK_ACCOUNTS -> BANK_TRANSACTIONS
    |
    +-> EXPENSE_CATEGORIES

-- Operational Entities
BRANCHES -> STAFF -> ROLES
    |
    +-> CLINIC_SERVICES
    |
    +-> HOTEL_ROOMS
```

#### Database Schema Definition
```typescript
// schema.ts - Complete database schema
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Core business tables
export default defineSchema({
  // Customer and Pet Management
  customers: defineTable({
    name: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    postalCode: v.optional(v.string()),
    dateOfBirth: v.optional(v.number()),
    loyaltyPoints: v.number(),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number()
  }).index("by_email", ["email"]),

  customerPets: defineTable({
    customerId: v.id("customers"),
    name: v.string(),
    species: v.string(),
    breed: v.optional(v.string()),
    dateOfBirth: v.optional(v.number()),
    gender: v.optional(v.string()),
    weight: v.optional(v.number()),
    microchipId: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number()
  }).index("by_customer", ["customerId"]),

  // Sales and Inventory
  products: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    sku: v.string(),
    categoryId: v.optional(v.id("productCategories")),
    brandId: v.optional(v.id("brands")),
    unitId: v.id("units"),
    purchasePrice: v.number(),
    sellingPrice: v.number(),
    barcode: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number()
  }).index("by_sku", ["sku"])
   .index("by_barcode", ["barcode"]),

  sales: defineTable({
    saleNumber: v.string(),
    customerId: v.optional(v.id("customers")),
    branchId: v.id("branches"),
    saleDate: v.number(),
    subtotal: v.number(),
    taxAmount: v.number(),
    discountAmount: v.number(),
    totalAmount: v.number(),
    paymentMethod: v.string(),
    status: v.string(),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number()
  }).index("by_date", ["saleDate"])
   .index("by_customer", ["customerId"]),

  // Financial Accounting
  accounts: defineTable({
    accountCode: v.string(),
    accountName: v.string(),
    accountType: v.string(), // ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE
    category: v.string(),
    parentAccountId: v.optional(v.id("accounts")),
    normalBalance: v.string(), // DEBIT or CREDIT
    isHeader: v.boolean(),
    level: v.number(),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number()
  }).index("by_code", ["accountCode"])
   .index("by_type", ["accountType"]),

  journalEntries: defineTable({
    journalNumber: v.string(),
    journalDate: v.number(),
    description: v.string(),
    sourceType: v.string(),
    sourceId: v.optional(v.string()),
    status: v.string(), // DRAFT, POSTED, VOIDED
    totalDebit: v.number(),
    totalCredit: v.number(),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number()
  }).index("by_date", ["journalDate"])
   .index("by_status", ["status"])
   .index("by_source", ["sourceType", "sourceId"]),

  // Hotel Management
  hotelRooms: defineTable({
    roomNumber: v.string(),
    roomType: v.string(),
    capacity: v.number(),
    baseRate: v.number(),
    amenities: v.array(v.string()),
    isActive: v.boolean(),
    maintenanceStatus: v.string(),
    lastCleaned: v.number(),
    createdAt: v.number(),
    updatedAt: v.number()
  }).index("by_number", ["roomNumber"]),

  hotelBookings: defineTable({
    bookingNumber: v.string(),
    customerId: v.id("customers"),
    petId: v.id("customerPets"),
    roomId: v.id("hotelRooms"),
    checkInDate: v.number(),
    checkOutDate: v.number(),
    status: v.string(),
    totalAmount: v.number(),
    createdAt: v.number(),
    updatedAt: v.number()
  }).index("by_dates", ["checkInDate", "checkOutDate"])
   .index("by_customer", ["customerId"]),

  // Clinic Management
  clinicAppointments: defineTable({
    appointmentNumber: v.string(),
    customerId: v.id("customers"),
    petId: v.id("customerPets"),
    veterinarianId: v.id("staff"),
    appointmentDate: v.number(),
    duration: v.number(),
    status: v.string(),
    totalAmount: v.number(),
    createdAt: v.number(),
    updatedAt: v.number()
  }).index("by_date", ["appointmentDate"])
   .index("by_veterinarian", ["veterinarianId"]),
});
```

#### Indexing Strategy
```typescript
// Primary Indexes
// - Support most common query patterns
// - Optimize join operations
// - Enable efficient filtering

// Secondary Indexes  
// - Support alternative access paths
// - Optimize reporting queries
// - Enable data analysis

// Composite Indexes
// - Support multi-column filtering
// - Optimize range queries
// - Enable complex sorting

// Example Index Usage
const getSalesReport = query({
  args: { startDate: v.number(), endDate: v.number() },
  handler: async (ctx, args) => {
    // Uses by_date index for efficient date range query
    const sales = await ctx.db
      .query("sales")
      .withIndex("by_date", q => 
        q.gte("saleDate", args.startDate)
         .lte("saleDate", args.endDate)
      )
      .collect();
    
    return calculateReportMetrics(sales);
  }
});
```

### Data Relationships

#### Foreign Key Relationships
```typescript
// One-to-Many Relationships
// Customer -> Pets
// Customer -> Sales
// Customer -> Hotel Bookings
// Product -> Sale Items
// Appointment -> Medical Records

// Many-to-Many Relationships
// Products -> Categories (via productCategories)
// Pets -> Services (via appointmentServices)  
// Staff -> Roles (via staffRoles)

// Hierarchical Relationships
// Accounts (parent/child structure)
// Product Categories (tree structure)
// Menu Items (with submenus)
```

## 🔌 API Architecture

### RESTful API Design

#### URL Structure
```
# Base URL structure
https://api.petshop-system.com/v1/

# Resource patterns
GET    /sales                    # List sales
GET    /sales/{id}               # Get specific sale
POST   /sales                    # Create new sale
PUT    /sales/{id}               # Update sale
DELETE /sales/{id}               # Delete sale

# Nested resources
GET    /sales/{id}/items         # Get sale items
POST   /sales/{id}/items         # Add sale item
PUT    /sales/{id}/items/{itemId} # Update sale item

# Query parameters
GET    /sales?startDate=2025-01-01&endDate=2025-01-31&branchId=123
GET    /sales?customerId=456&status=completed&limit=50
GET    /sales?sort=totalAmount&order=desc&page=2
```

#### Request/Response Format
```typescript
// Request format
interface APIRequest<T = any> {
  url: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  headers: {
    "Content-Type": "application/json";
    "Authorization": "Bearer {token}";
    "X-API-Key": "{api-key}";
  };
  params?: Record<string, string | number>;
  body?: T;
}

// Response format
interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
  meta?: {
    requestId: string;
    timestamp: number;
    version: string;
  };
}

// Example API call
const response = await fetch("/api/sales", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer token123"
  },
  body: JSON.stringify({
    customerId: "customer123",
    branchId: "branch456",
    items: [
      {
        productId: "product789",
        quantity: 2,
        unitPrice: 25.99
      }
    ]
  })
});

const result = await response.json();
```

### Real-time API (Convex)

#### Query Subscriptions
```typescript
// Real-time data subscription
const salesData = useQuery(api.sales.getSalesByDateRange, {
  startDate: startOfMonth,
  endDate: endOfMonth
});

// Optimistic updates
const addSale = useMutation(api.sales.createSale);

// Automatic re-subscriptions on data changes
useEffect(() => {
  // Component re-renders automatically when data changes
  console.log("Sales data updated:", salesData);
}, [salesData]);
```

#### WebSocket Connections
```typescript
// Real-time event handling
const { socket } = useConvex();

useEffect(() => {
  // Subscribe to real-time events
  socket.on("sale_created", (sale) => {
    console.log("New sale created:", sale);
    // Update local state
    setSales(prev => [...prev, sale]);
  });

  socket.on("inventory_low", (product) => {
    console.log("Low inventory alert:", product);
    // Show notification
    showLowInventoryAlert(product);
  });

  return () => {
    // Cleanup subscriptions
    socket.off("sale_created");
    socket.off("inventory_low");
  };
}, []);
```

## 🔒 Security Architecture

### Authentication & Authorization

#### Convex Auth Integration
```typescript
// Authentication setup
import { Auth } from "@convex-dev/auth/server";

export const { auth, signIn, signOut } = Auth(vectors, {
  redirectTo: "/signin",
});

// Protected route middleware
export const requireAuth = async (ctx: any) => {
  const user = await ctx.auth.getUserIdentity();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
};

// Role-based access control
export const requireRole = (roles: string[]) => {
  return async (ctx: any) => {
    const user = await requireAuth(ctx);
    const userRole = await ctx.db.get(user.tokenIdentifier);
    
    if (!roles.includes(userRole.role)) {
      throw new Error("Insufficient permissions");
    }
    
    return user;
  };
};

// Usage in functions
export const createSale = mutation({
  args: { /* ... */ },
  handler: async (ctx, args) => {
    // Require authentication and sales role
    const user = await requireRole(["admin", "manager", "sales"])(ctx);
    
    // Rest of function logic
  }
});
```

#### JWT Token Management
```typescript
// Token structure
interface JWTPayload {
  sub: string;          // User ID
  email: string;        // User email
  role: string;         // User role
  branchId?: string;    // User's branch
  permissions: string[]; // Specific permissions
  exp: number;          // Expiration timestamp
  iat: number;          // Issued at timestamp
}

// Token validation middleware
const validateToken = (token: string): JWTPayload | null => {
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!);
    return payload as JWTPayload;
  } catch (error) {
    return null;
  }
};

// Protected API endpoint
const protectedHandler = async (req: Request) => {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  
  if (!token) {
    return new Response("Unauthorized", { status: 401 });
  }
  
  const payload = validateToken(token);
  if (!payload) {
    return new Response("Invalid token", { status: 401 });
  }
  
  // Check token expiration
  if (payload.exp < Date.now() / 1000) {
    return new Response("Token expired", { status: 401 });
  }
  
  // Attach user to request
  req.user = payload;
  return handler(req);
};
```

### Data Protection

#### Input Validation
```typescript
// Zod validation schemas
import { z } from "zod";

const CreateSaleSchema = z.object({
  customerId: z.string().optional(),
  branchId: z.string(),
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number().positive(),
    unitPrice: z.number().nonnegative()
  })).min(1),
  paymentMethod: z.enum(["CASH", "CARD", "DIGITAL_WALLET"]),
  notes: z.string().max(500).optional()
});

// Validation middleware
const validateInput = <T>(schema: z.ZodSchema<T>) => {
  return (req: Request): T => {
    try {
      const data = JSON.parse(req.body!);
      return schema.parse(data);
    } catch (error) {
      throw new Error("Invalid input data");
    }
  };
};
```

#### SQL Injection Prevention
```typescript
// Use parameterized queries (Convex handles this automatically)
// Never concatenate user input into queries

// Convex query (automatically parameterized)
const sales = await ctx.db
  .query("sales")
  .withIndex("by_date", q => 
    q.gte("saleDate", startDate)  // Safe: typed parameter
     .lte("saleDate", endDate)    // Safe: typed parameter
  )
  .filter(sale => 
    sale.customerId === customerId  // Safe: typed comparison
  );

// Avoid this (unsafe):
// const sales = await ctx.db.query("sales").filter(sale => 
//   `saleDate >= '${startDate}' AND saleDate <= '${endDate}'` // UNSAFE!
// );
```

#### XSS Prevention
```typescript
// React automatically escapes JSX content
// Additional sanitization for user-generated content

import DOMPurify from "dompurify";

// Sanitize HTML content
const sanitizeHTML = (html: string): string => {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em'],
    ALLOWED_ATTR: []
  });
};

// Usage in component
function CustomerNote({ note }: { note: string }) {
  // React automatically escapes this
  return <p>{sanitizeHTML(note)}</p>;
}
```

## 🚀 Deployment Architecture

### Cloud Deployment

#### Vercel Deployment
```typescript
// vercel.json configuration
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/next"
    }
  ],
  "env": {
    "CONVEX_DEPLOYMENT": "@convex-deployment",
    "NEXTAUTH_SECRET": "@nextauth-secret"
  },
  "regions": ["iad1", "sfo1"], // Primary regions
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/$1"
    }
  ]
}

// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true, // Use App Router
  },
  images: {
    domains: ['api.convex.dev'],
  },
  env: {
    CONVEX_URL: process.env.CONVEX_URL,
  },
}

module.exports = nextConfig;
```

#### Convex Deployment
```typescript
// convex configuration (auto-generated)
// Convex handles deployment automatically

// Environment variables
CONVEX_URL=https://your-deployment.convex.cloud
CONVEX_DEPLOYMENT=your-deployment-name

// Deploy commands
npm run dev        # Development
npx convex deploy  # Production deployment
npx convex status  # Check deployment status
```

### CI/CD Pipeline

#### GitHub Actions Workflow
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run tests
      run: npm run test
    
    - name: Build application
      run: npm run build
    
    - name: Deploy to Vercel
      uses: amondnet/vercel-action@v20
      with:
        vercel-token: ${{ secrets.VERCEL_TOKEN }}
        vercel-org-id: ${{ secrets.ORG_ID }}
        vercel-project-id: ${{ secrets.PROJECT_ID }}
        vercel-args: '--prod'
    
    - name: Deploy to Convex
      run: npx convex deploy
      env:
        CONVEX_DEPLOYMENT: ${{ secrets.CONVEX_DEPLOYMENT }}
```

### Environment Management

#### Environment Configuration
```typescript
// Configuration by environment
interface Config {
  NODE_ENV: 'development' | 'production' | 'test';
  CONVEX_URL: string;
  DATABASE_URL: string;
  NEXTAUTH_SECRET: string;
  NEXTAUTH_URL: string;
  EMAIL_SERVER: string;
  STRIPE_SECRET_KEY: string;
}

const config: Config = {
  development: {
    NODE_ENV: 'development',
    CONVEX_URL: process.env.CONVEX_DEV_URL!,
    DATABASE_URL: process.env.DEV_DATABASE_URL!,
    NEXTAUTH_SECRET: process.env.DEV_NEXTAUTH_SECRET!,
    NEXTAUTH_URL: 'http://localhost:3000',
    EMAIL_SERVER: 'smtp://localhost:1025',
    STRIPE_SECRET_KEY: process.env.STRIPE_TEST_SECRET!
  },
  
  production: {
    NODE_ENV: 'production',
    CONVEX_URL: process.env.CONVEX_PROD_URL!,
    DATABASE_URL: process.env.PROD_DATABASE_URL!,
    NEXTAUTH_SECRET: process.env.PROD_NEXTAUTH_SECRET!,
    NEXTAUTH_URL: 'https://your-domain.com',
    EMAIL_SERVER: process.env.EMAIL_SERVER!,
    STRIPE_SECRET_KEY: process.env.STRIPE_LIVE_SECRET!
  }
};

export const appConfig = config[process.env.NODE_ENV as keyof typeof config];
```

## ⚡ Scalability & Performance

### Horizontal Scaling

#### Load Balancing
```typescript
// Vercel automatically handles load balancing
// Global CDN distribution
// Edge function execution

// Database connection pooling (Convex manages this)
// Query optimization
// Caching strategies
```

#### Caching Strategy
```typescript
// Multi-level caching approach
// Level 1: Browser cache
// Level 2: CDN cache  
// Level 3: Application cache
// Level 4: Database cache

// Browser caching headers
export async function GET() {
  return new Response(
    JSON.stringify(data),
    {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        'Content-Type': 'application/json',
      }
    }
  );
}

// Convex query caching (automatic)
const getCachedSales = query({
  args: { startDate: v.number() },
  handler: async (ctx, args) => {
    // Results automatically cached by Convex
    const sales = await ctx.db.query("sales")
      .withIndex("by_date", q => q.gte("saleDate", args.startDate))
      .collect();
    
    return sales;
  }
});
```

### Performance Optimization

#### Code Splitting
```typescript
// Next.js automatic code splitting
// Route-based splitting
// Component-based splitting

// Lazy loading components
import dynamic from 'next/dynamic';

const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <p>Loading...</p>,
  ssr: false // Disable SSR for client-only components
});

// Route-based splitting
// Next.js automatically splits pages
const SalesDashboard = dynamic(() => import('./SalesDashboard'));
const Reports = dynamic(() => import('./Reports'), { ssr: false });
```

#### Database Optimization
```typescript
// Efficient query patterns
const getOptimizedSales = query({
  args: { branchId: v.id("branches") },
  handler: async (ctx, args) => {
    // Use indexes for fast lookups
    const sales = await ctx.db
      .query("sales")
      .withIndex("by_branch_date", q => 
        q.eq("branchId", args.branchId)
         .gte("saleDate", Date.now() - 30 * 24 * 60 * 60 * 1000)
      )
      .collect();
    
    // Only fetch necessary fields
    return sales.map(sale => ({
      id: sale._id,
      saleNumber: sale.saleNumber,
      saleDate: sale.saleDate,
      totalAmount: sale.totalAmount,
      customerName: sale.customerId && ctx.db.get(sale.customerId)?.name
    }));
  }
});

// Pagination for large datasets
const getPaginatedSales = query({
  args: { 
    branchId: v.id("branches"),
    cursor: v.optional(v.string()),
    limit: v.number()
  },
  handler: async (ctx, args) => {
    const sales = await ctx.db
      .query("sales")
      .withIndex("by_branch_date", q => 
        q.eq("branchId", args.branchId)
         .gt("_id", args.cursor || "")
      )
      .order("desc")
      .take(args.limit);
    
    return {
      sales,
      nextCursor: sales.length === args.limit ? sales[sales.length - 1]._id : null
    };
  }
});
```

### Performance Monitoring

#### Metrics Collection
```typescript
// Performance monitoring setup
import { Analytics } from '@vercel/analytics';

// Core Web Vitals monitoring
// - Largest Contentful Paint (LCP)
// - First Input Delay (FID)  
// - Cumulative Layout Shift (CLS)

// Custom performance tracking
const trackPerformance = (name: string, fn: () => Promise<any>) => {
  return performance.mark(`${name}-start`);
  const result = await fn();
  performance.mark(`${name}-end`);
  performance.measure(name, `${name}-start`, `${name}-end`);
  return result;
};

// Database query performance
const monitoredQuery = query({
  args: { branchId: v.id("branches") },
  handler: async (ctx, args) => {
    const start = performance.now();
    const sales = await ctx.db
      .query("sales")
      .withIndex("by_branch", q => q.eq("branchId", args.branchId))
      .collect();
    const duration = performance.now() - start;
    
    // Log slow queries
    if (duration > 100) {
      console.warn(`Slow query detected: ${duration}ms`, { branchId: args.branchId });
    }
    
    return sales;
  }
});
```

## 📊 Monitoring & Logging

### Application Monitoring

#### Error Tracking
```typescript
// Sentry integration for error tracking
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});

// Error boundary component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
      },
    });
  }

  render() {
    if (this.state.hasError) {
      return <h1>Something went wrong.</h1>;
    }

    return this.props.children;
  }
}
```

#### Health Checks
```typescript
// API health check endpoint
export async function GET() {
  try {
    // Check database connectivity
    const dbHealth = await checkDatabaseHealth();
    
    // Check external services
    const convexHealth = await checkConvexHealth();
    
    // Check system resources
    const systemHealth = await checkSystemHealth();
    
    const healthStatus = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      services: {
        database: dbHealth ? "healthy" : "unhealthy",
        convex: convexHealth ? "healthy" : "unhealthy",
        system: systemHealth ? "healthy" : "unhealthy"
      }
    };
    
    const statusCode = Object.values(healthStatus.services).includes("unhealthy") ? 503 : 200;
    
    return new Response(JSON.stringify(healthStatus), {
      status: statusCode,
      headers: { "Content-Type": "application/json" }
    });
    
  } catch (error) {
    return new Response(
      JSON.stringify({
        status: "unhealthy",
        error: error.message
      }),
      { status: 503 }
    );
  }
}
```

### Logging Strategy

#### Structured Logging
```typescript
// Structured logging implementation
interface LogEntry {
  timestamp: string;
  level: "DEBUG" | "INFO" | "WARN" | "ERROR";
  service: string;
  message: string;
  metadata?: Record<string, any>;
  userId?: string;
  requestId?: string;
  sessionId?: string;
}

class Logger {
  static info(message: string, metadata?: Record<string, any>) {
    this.log("INFO", message, metadata);
  }
  
  static error(message: string, error?: Error, metadata?: Record<string, any>) {
    this.log("ERROR", message, {
      error: error?.message,
      stack: error?.stack,
      ...metadata
    });
  }
  
  private static log(level: LogEntry["level"], message: string, metadata?: Record<string, any>) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      service: "petshop-app",
      message,
      metadata,
      requestId: this.getRequestId(),
      sessionId: this.getSessionId()
    };
    
    // Send to logging service
    console.log(JSON.stringify(entry));
    
    // Send to external logging service
    if (level === "ERROR") {
      this.sendToErrorTracking(entry);
    }
  }
}

// Usage in application
export const createSale = mutation({
  args: { /* ... */ },
  handler: async (ctx, args) => {
    try {
      Logger.info("Creating new sale", { customerId: args.customerId });
      
      const saleId = await ctx.db.insert("sales", { /* ... */ });
      
      Logger.info("Sale created successfully", { saleId, amount: totalAmount });
      
      return saleId;
      
    } catch (error) {
      Logger.error("Failed to create sale", error, { customerId: args.customerId });
      throw error;
    }
  }
});
```

This comprehensive system architecture documentation provides the technical foundation for understanding, deploying, and maintaining the Pet Shop Management System. It covers all essential aspects from high-level design to implementation details.

---

**Related Documentation**:
- [API Reference](./04-api-reference.md) - Detailed API documentation
- [Installation Guide](./02-installation-guide.md) - Deployment procedures
- [User Guide](./05-user-guide.md) - Business logic and workflows
- [Contributing Guide](./13-contributing-guide.md) - Development standards