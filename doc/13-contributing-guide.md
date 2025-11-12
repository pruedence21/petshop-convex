# 👨‍💻 Contributing Guide - Pet Shop Management System

Comprehensive guide for developers contributing to the Pet Shop Management System. This guide covers development standards, coding practices, contribution workflow, and testing procedures.

## 📋 Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Coding Standards](#coding-standards)
- [Architecture Guidelines](#architecture-guidelines)
- [Testing Guidelines](#testing-guidelines)
- [Contribution Workflow](#contribution-workflow)
- [Code Review Process](#code-review-process)
- [Documentation Standards](#documentation-standards)
- [Release Process](#release-process)

## 🚀 Getting Started

### Prerequisites

#### Required Software
- **Node.js**: Version 18.0.0 or higher
- **npm**: Version 8.0.0 or higher (comes with Node.js)
- **Git**: For version control
- **VS Code**: Recommended editor with extensions
- **Convex CLI**: For backend development

#### Recommended Extensions
```json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "esbenp.prettier-vscode", 
    "ms-vscode.vscode-eslint",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-json",
    "convex.convex-vscode"
  ]
}
```

### Development Environment Setup

#### 1. Clone the Repository
```bash
# Clone the repository
git clone https://github.com/your-org/petshop-convex.git
cd petshop-convex

# Create your feature branch
git checkout -b feature/your-feature-name
```

#### 2. Install Dependencies
```bash
# Install all dependencies
npm install

# Install Convex CLI globally
npm install -g convex

# Login to Convex
npx convex login
```

#### 3. Environment Configuration
```bash
# Copy environment template
cp .env.example .env.local

# Edit environment variables
# CONVEX_URL=your-convex-url
# CONVEX_DEPLOYMENT=your-deployment-name
# NEXTAUTH_SECRET=your-secret-key
```

#### 4. Database Setup
```bash
# Deploy Convex functions and schema
npx convex dev

# Seed initial data (optional)
npx convex run --name accountingSeed.seedChartOfAccounts
npx convex run --name bankSeed.seedBankAccounts
```

#### 5. Start Development Servers
```bash
# Terminal 1: Start Convex backend
npx convex dev

# Terminal 2: Start Next.js frontend (new terminal)
npm run dev:frontend

# Or start both simultaneously
npm run dev
```

## 🛠️ Development Setup

### Project Structure

```
petshop-convex/
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
│   ├── api/                    # API routes
│   ├── globals.css             # Global styles
│   ├── layout.tsx              # Root layout
│   └── page.tsx                # Home page
├── convex/                     # Convex backend
│   ├── functions/              # Server functions
│   │   ├── sales.ts           # Sales logic
│   │   ├── clinic/            # Clinic logic
│   │   ├── hotel/             # Hotel logic
│   │   ├── accounting/        # Accounting logic
│   │   ├── inventory/         # Inventory logic
│   │   ├── customers/         # Customer logic
│   │   └── auth.ts            # Authentication
│   ├── schema.ts              # Database schema
│   ├── auth.config.ts         # Auth configuration
│   └── migration.ts           # Database migrations
├── components/                 # React components
│   ├── ui/                    # shadcn/ui components
│   ├── forms/                 # Form components
│   ├── charts/                # Data visualization
│   └── layout/                # Layout components
├── lib/                       # Utilities and helpers
│   ├── utils.ts               # General utilities
│   ├── convex.ts              # Convex client
│   └── validations.ts         # Form validations
├── hooks/                     # Custom React hooks
├── types/                     # TypeScript types
├── docs/                      # Documentation
├── tests/                     # Test files
├── .github/                   # GitHub workflows
├── .eslintrc.js               # ESLint configuration
├── .prettierrc                # Prettier configuration
├── tailwind.config.js         # Tailwind configuration
├── tsconfig.json              # TypeScript configuration
└── package.json               # Dependencies and scripts
```

### Convex Development Workflow

#### Creating New Functions
```typescript
// convex/functions/sales.ts
import { query, mutation } from "../_generated/server";
import { v } from "convex/values";

// Query function
export const getSalesByDate = query({
  args: {
    startDate: v.number(),
    endDate: v.number(),
    branchId: v.optional(v.id("branches"))
  },

  handler: async (ctx, args) => {
    // Function implementation
    return await getSalesByDateRange(ctx, args);
  }
});

// Mutation function
export const createSale = mutation({
  args: {
    customerId: v.optional(v.id("customers")),
    branchId: v.id("branches"),
    items: v.array(v.object({
      productId: v.id("products"),
      quantity: v.number(),
      unitPrice: v.number()
    }))
  },

  handler: async (ctx, args) => {
    // Function implementation
    return await createSaleRecord(ctx, args);
  }
});
```

#### Database Schema Changes
```typescript
// When adding new tables or fields, update schema.ts
export default defineSchema({
  // Existing tables...
  
  // New table example
  newTable: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    relatedId: v.optional(v.id("relatedTable")),
    createdAt: v.number(),
    updatedAt: v.number()
  })
  .index("by_name", ["name"])
  .index("by_related", ["relatedId"])
});
```

## 📝 Coding Standards

### TypeScript Guidelines

#### Code Style
```typescript
// Use strict TypeScript
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true
  }
}

// Use proper typing
interface SaleItem {
  productId: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

interface CreateSaleArgs {
  customerId?: string;
  branchId: string;
  items: SaleItem[];
}

// Use discriminated unions for state
type SaleStatus = 
  | { status: "PENDING" }
  | { status: "COMPLETED"; completedAt: number }
  | { status: "CANCELLED"; cancelledAt: number; reason: string };

// Use const assertions for literal types
const SaleStatus = {
  PENDING: "PENDING",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED"
} as const;
```

#### Naming Conventions
```typescript
// PascalCase for types and interfaces
interface CustomerProfile {
  name: string;
  email: string;
  phone: string;
}

// camelCase for variables and functions
const getCustomerById = async (id: string) => { /* ... */ };
const calculateTotalAmount = (items: SaleItem[]) => { /* ... */ };

// UPPER_CASE for constants
const MAX_SALE_AMOUNT = 1000000;
const DEFAULT_BRANCH_ID = "main-branch";

// kebab-case for file and folder names
// new-customer-form.tsx
// customer-profile.component.ts

// Event handlers should start with "handle"
const handleFormSubmit = (event: FormEvent) => { /* ... */ };
const handleCustomerSelect = (customerId: string) => { /* ... */ };
```

### Code Organization

#### File Organization
```typescript
// components/sales/SalesDashboard.tsx

// 1. Imports (external libraries first)
import React, { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

// 2. Types and interfaces
interface SalesDashboardProps {
  branchId: string;
  dateRange: DateRange;
}

interface SalesMetrics {
  totalSales: number;
  transactionCount: number;
  averageTransaction: number;
}

// 3. Constants and utilities
const CURRENCY_FORMATTER = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR"
});

// 4. Helper functions
const formatCurrency = (amount: number): string => {
  return CURRENCY_FORMATTER.format(amount);
};

const calculateGrowth = (current: number, previous: number): number => {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
};

// 5. Main component
export function SalesDashboard({ branchId, dateRange }: SalesDashboardProps) {
  // State
  const [isLoading, setIsLoading] = useState(false);
  
  // Queries
  const { data: currentData } = useQuery(api.sales.getMetrics, {
    branchId,
    startDate: dateRange.start,
    endDate: dateRange.end
  });
  
  const { data: previousData } = useQuery(api.sales.getMetrics, {
    branchId,
    startDate: dateRange.previousStart,
    endDate: dateRange.previousEnd
  });
  
  // Effects
  useEffect(() => {
    setIsLoading(true);
    // Data loading logic
    setIsLoading(false);
  }, [branchId, dateRange]);
  
  // Render
  if (isLoading) return <div>Loading...</div>;
  
  return (
    <div className="space-y-6">
      {/* Component JSX */}
    </div>
  );
}

// 6. Default export
export default SalesDashboard;
```

#### Function Structure
```typescript
// Good: Clear, single-purpose function
const calculateSaleTotal = (items: SaleItem[]): number => {
  return items.reduce((total, item) => total + item.subtotal, 0);
};

// Good: Proper error handling
const processSale = async (saleData: CreateSaleArgs): Promise<string> => {
  try {
    // Validation
    if (!saleData.items.length) {
      throw new Error("Sale must have at least one item");
    }
    
    // Business logic
    const total = calculateSaleTotal(saleData.items);
    const saleId = await createSaleRecord(saleData);
    
    // Logging
    console.info("Sale processed successfully", { saleId, total });
    
    return saleId;
    
  } catch (error) {
    console.error("Failed to process sale", { error, saleData });
    throw new Error("Failed to process sale: " + error.message);
  }
};

// Good: Explicit return types
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Good: Descriptive parameter names
const createJournalEntry = (
  ctx: ConvexContext,
  args: CreateJournalEntryArgs
): Promise<JournalEntry> => {
  // Implementation
};
```

### React Component Guidelines

#### Component Patterns
```typescript
// Presentational component
interface CustomerCardProps {
  customer: Customer;
  onSelect: (customerId: string) => void;
}

export const CustomerCard: React.FC<CustomerCardProps> = ({ customer, onSelect }) => {
  return (
    <Card className="p-4">
      <h3 className="font-semibold">{customer.name}</h3>
      <p className="text-sm text-muted-foreground">{customer.email}</p>
      <Button onClick={() => onSelect(customer._id)} className="mt-2">
        Select
      </Button>
    </Card>
  );
};

// Container component
export const CustomerList: React.FC = () => {
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  
  const { data: customers } = useQuery(api.customers.list);
  
  const handleCustomerSelect = (customerId: string) => {
    setSelectedCustomer(customerId);
  };
  
  if (!customers) return <div>Loading...</div>;
  
  return (
    <div className="grid gap-4">
      {customers.map(customer => (
        <CustomerCard
          key={customer._id}
          customer={customer}
          onSelect={handleCustomerSelect}
        />
      ))}
    </div>
  );
};

// Custom hook for logic reuse
const useCustomerData = (customerId: string) => {
  const { data: customer } = useQuery(api.customers.getById, { customerId });
  const { data: pets } = useQuery(api.customerPets.listByCustomer, { customerId });
  const { data: sales } = useQuery(api.sales.listByCustomer, { customerId });
  
  return {
    customer,
    pets,
    sales,
    isLoading: !customer || !pets || !sales
  };
};
```

#### State Management
```typescript
// Local state for UI-specific data
const [isModalOpen, setIsModalOpen] = useState(false);
const [selectedItems, setSelectedItems] = useState<string[]>([]);

// Server state (managed by Convex)
const { data: sales, isLoading } = useQuery(api.sales.list, {
  branchId,
  status: "COMPLETED"
});

// Derived state
const totalSelectedAmount = useMemo(() => {
  return selectedItems.reduce((sum, itemId) => {
    const item = items.find(i => i.id === itemId);
    return sum + (item?.amount || 0);
  }, 0);
}, [selectedItems, items]);

// Form state management
const { register, handleSubmit, formState: { errors } } = useForm<CreateSaleForm>({
  resolver: zodResolver(createSaleSchema)
});

const onSubmit = (data: CreateSaleForm) => {
  createSaleMutation.mutate(data);
};
```

## 🏗️ Architecture Guidelines

### Component Architecture

#### Atomic Design Pattern
```
components/
├── atoms/                     # Basic building blocks
│   ├── Button.tsx            # Button component
│   ├── Input.tsx             # Input component
│   ├── Label.tsx             # Label component
│   └── Card.tsx              # Card component
├── molecules/                # Simple combinations
│   ├── SearchBox.tsx         # Input + Button
│   ├── FormField.tsx         # Label + Input + Error
│   └── ProductCard.tsx       # Image + Title + Price
├── organisms/                # Complex components
│   ├── Navigation.tsx        # Menu + Links + Logo
│   ├── DataTable.tsx         # Headers + Rows + Actions
│   └── CustomerList.tsx      # Cards + Filters + Search
├── templates/                # Page layouts
│   ├── DashboardLayout.tsx   # Sidebar + Header + Content
│   └── AuthLayout.tsx        # Header + Form + Footer
└── pages/                    # Full pages
    ├── SalesPage.tsx         # Template + Organisms
    └── CustomerPage.tsx      # Template + Organisms
```

#### Component Composition
```typescript
// Good: Reusable and composable
interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  onRowClick?: (row: T) => void;
  isLoading?: boolean;
}

export function DataTable<T>({ data, columns, onRowClick, isLoading }: DataTableProps<T>) {
  if (isLoading) return <DataTableSkeleton />;
  
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map(column => (
              <TableHead key={column.key}>
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, index) => (
            <TableRow 
              key={index} 
              className={onRowClick ? "cursor-pointer hover:bg-muted/50" : ""}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map(column => (
                <TableCell key={column.key}>
                  {column.render(row)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// Usage
const salesColumns: ColumnDef<Sale>[] = [
  {
    key: "saleNumber",
    header: "Sale #",
    render: (row) => <span className="font-medium">{row.saleNumber}</span>
  },
  {
    key: "customerName",
    header: "Customer",
    render: (row) => row.customerName || "Walk-in"
  },
  {
    key: "totalAmount",
    header: "Amount",
    render: (row) => formatCurrency(row.totalAmount)
  }
];

<DataTable data={sales} columns={salesColumns} onRowClick={handleSaleClick} />
```

### Error Handling

#### Frontend Error Boundaries
```typescript
// components/ErrorBoundary.tsx
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
    
    // Send to error tracking service
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(error);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen">
          <h2 className="text-2xl font-bold text-destructive">Something went wrong</h2>
          <p className="text-muted-foreground mt-2">
            {this.state.error?.message || "An unexpected error occurred"}
          </p>
          <Button 
            onClick={() => window.location.reload()} 
            className="mt-4"
          >
            Reload Page
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Usage in layout
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </body>
    </html>
  );
}
```

#### Backend Error Handling
```typescript
// convex/functions/helpers/errors.ts
export class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string,
    public value?: any
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

export class BusinessRuleError extends Error {
  constructor(
    message: string,
    public rule: string,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = "BusinessRuleError";
  }
}

export class NotFoundError extends Error {
  constructor(
    public resource: string,
    public id: string
  ) {
    super(`${resource} with id ${id} not found`);
    this.name = "NotFoundError";
  }
}

// Usage in functions
export const createSale = mutation({
  args: { customerId: v.optional(v.id("customers")) },
  handler: async (ctx, args) => {
    try {
      // Validate customer exists if provided
      if (args.customerId) {
        const customer = await ctx.db.get(args.customerId);
        if (!customer) {
          throw new NotFoundError("Customer", args.customerId);
        }
      }
      
      // Business logic
      const saleId = await ctx.db.insert("sales", {
        // ... sale data
      });
      
      return saleId;
      
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      
      console.error("Failed to create sale:", error);
      throw new Error("Failed to create sale");
    }
  }
});
```

### State Management Patterns

#### Client State vs Server State
```typescript
// Client state (local UI state)
const [searchTerm, setSearchTerm] = useState("");
const [selectedFilters, setSelectedFilters] = useState<Filter[]>([]);
const [sortBy, setSortBy] = useState<SortOption>("date");

// Server state (from Convex)
const { data: sales, isLoading, error } = useQuery(api.sales.list, {
  branchId,
  searchTerm,
  filters: selectedFilters,
  sortBy
});

// Derived state
const filteredSales = useMemo(() => {
  if (!sales) return [];
  return sales.filter(sale => {
    if (searchTerm && !sale.saleNumber.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    return true;
  });
}, [sales, searchTerm]);

// Optimistic updates
const createSale = useMutation(api.sales.create, {
  onSuccess: (newSale) => {
    // Update cache optimistically
    queryClient.setQueryData(["sales", { branchId }], (old: Sale[] = []) => [
      ...old,
      newSale
    ]);
  },
  onError: (error, variables, context) => {
    // Revert optimistic update on error
    console.error("Failed to create sale:", error);
  }
});
```

## 🧪 Testing Guidelines

### Testing Strategy

#### Unit Tests
```typescript
// tests/utils/calculations.test.ts
import { describe, it, expect } from 'vitest';
import { calculateSaleTotal, calculateTax, formatCurrency } from '@/lib/calculations';

describe('calculateSaleTotal', () => {
  it('should calculate total correctly', () => {
    const items = [
      { quantity: 2, unitPrice: 1000 },
      { quantity: 1, unitPrice: 500 }
    ];
    
    const total = calculateSaleTotal(items);
    expect(total).toBe(2500);
  });
  
  it('should return 0 for empty items', () => {
    const total = calculateSaleTotal([]);
    expect(total).toBe(0);
  });
  
  it('should handle decimal quantities', () => {
    const items = [
      { quantity: 1.5, unitPrice: 1000 }
    ];
    
    const total = calculateSaleTotal(items);
    expect(total).toBe(1500);
  });
});
```

#### Integration Tests
```typescript
// tests/integration/sales.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { TestConvexProvider, TestDocument } from 'convex-test';
import { createContext } from 'convex-test';
import { api } from '../convex/_generated/api';

describe('Sales Integration', () => {
  beforeEach(async () => {
    // Setup test data
    await seedTestData();
  });
  
  it('should create sale with items and update inventory', async () => {
    const context = await createContext(api);
    
    // Create sale
    const saleId = await context.mutation(api.sales.create, {
      customerId: undefined,
      branchId: testBranchId,
      items: [
        {
          productId: testProductId,
          quantity: 2,
          unitPrice: 1000
        }
      ]
    });
    
    expect(saleId).toBeDefined();
    
    // Verify inventory was updated
    const updatedProduct = await context.query(api.products.getById, {
      productId: testProductId
    });
    
    expect(updatedProduct.stock).toBeLessThan(testProductStock);
  });
  
  it('should handle validation errors', async () => {
    const context = await createContext(api);
    
    await expect(context.mutation(api.sales.create, {
      // Missing required fields
      items: []
    })).rejects.toThrow();
  });
});
```

#### Component Tests
```typescript
// tests/components/SalesForm.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SalesForm } from '@/components/sales/SalesForm';
import { ConvexProvider, ConvexReactClient } from 'convex/react';

const mockClient = new ConvexReactClient('http://localhost:3000');

const TestSalesForm = () => (
  <ConvexProvider client={mockClient}>
    <SalesForm branchId={testBranchId} />
  </ConvexProvider>
);

describe('SalesForm', () => {
  it('should render form fields', () => {
    render(<TestSalesForm />);
    
    expect(screen.getByLabelText(/customer/i)).toBeInTheDocument();
    expect(screen.getByText(/add items/i)).toBeInTheDocument();
    expect(screen.getByText(/submit sale/i)).toBeInTheDocument();
  });
  
  it('should add items to cart', async () => {
    render(<TestSalesForm />);
    
    const addItemButton = screen.getByText(/add items/i);
    fireEvent.click(addItemButton);
    
    await waitFor(() => {
      expect(screen.getByText(/search products/i)).toBeInTheDocument();
    });
  });
  
  it('should validate required fields', async () => {
    render(<TestSalesForm />);
    
    const submitButton = screen.getByText(/submit sale/i);
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/at least one item/i)).toBeInTheDocument();
    });
  });
});
```

### Test Configuration

#### Vitest Configuration
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: [
      'node_modules',
      'dist',
      '.next',
      '.convex',
      'coverage'
    ]
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
```

#### Test Setup
```typescript
// tests/setup.ts
import '@testing-library/jest-dom';
import { beforeAll, afterEach, vi } from 'vitest';

// Mock Convex
vi.mock('convex/react', () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  useConvexClient: vi.fn(),
}));

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn(),
  }),
  usePathname: () => '/',
}));
```

## 🔄 Contribution Workflow

### Branch Strategy

#### Branch Naming Convention
```
feature/feature-name           # New features
bugfix/issue-description       # Bug fixes
hotfix/critical-issue          # Critical fixes
refactor/component-name        # Code refactoring
docs/update-documentation      # Documentation updates
test/add-tests-for-feature     # Test additions
chore/dependency-update        # Maintenance tasks
```

#### Feature Development Workflow
```bash
# 1. Start from main branch
git checkout main
git pull origin main

# 2. Create feature branch
git checkout -b feature/sales-analytics

# 3. Make changes and commit
git add .
git commit -m "feat: add sales analytics dashboard"

# 4. Push and create PR
git push origin feature/sales-analytics

# 5. After review and approval, merge to main
git checkout main
git pull origin main
git branch -d feature/sales-analytics
```

### Commit Message Convention

#### Conventional Commits Format
```
<type>(<scope>): <subject>

<body>

<footer>
```

#### Commit Types
- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, etc.)
- **refactor**: Code refactoring
- **test**: Adding or updating tests
- **chore**: Maintenance tasks

#### Examples
```bash
# Feature commits
feat(sales): add sales analytics dashboard
feat(accounting): implement bank reconciliation

# Bug fixes
fix(inventory): resolve stock calculation error
fix(clinic): fix appointment scheduling conflict

# Documentation
docs(api): update sales API documentation
docs(readme): add installation instructions

# Refactoring
refactor(ui): simplify customer form component
refactor(database): optimize product queries

# Tests
test(sales): add unit tests for sale calculations
test(integration): add E2E tests for checkout flow
```

### Pull Request Guidelines

#### PR Template
```markdown
## Description
Brief description of changes made.

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed
- [ ] Edge cases considered

## Screenshots (if applicable)
Add screenshots for UI changes.

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Tests added/updated
- [ ] No console errors
```

#### Code Review Checklist
```markdown
## Code Quality
- [ ] Code is readable and well-commented
- [ ] No console.log statements in production code
- [ ] Proper error handling implemented
- [ ] TypeScript types are correct
- [ ] No unused imports or variables

## Security
- [ ] No sensitive data in client-side code
- [ ] Input validation implemented
- [ ] SQL injection prevention (Convex handles this)
- [ ] XSS prevention implemented

## Performance
- [ ] Appropriate use of React.useMemo/useCallback
- [ ] Efficient database queries
- [ ] Proper image optimization
- [ ] No unnecessary re-renders

## Testing
- [ ] Unit tests added for new logic
- [ ] Integration tests updated if needed
- [ ] Edge cases tested
- [ ] Error scenarios handled

## Documentation
- [ ] Code comments added for complex logic
- [ ] API documentation updated
- [ ] Component documentation updated
```

## 📚 Documentation Standards

### Code Documentation

#### Function Documentation
```typescript
/**
 * Calculate the total amount for a sale including tax and discount
 * 
 * @param items - Array of sale items with quantity and unit price
 * @param taxRate - Tax rate as decimal (e.g., 0.1 for 10%)
 * @param discountAmount - Fixed discount amount in cents
 * @returns Total sale amount in cents
 * 
 * @example
 * ```typescript
 * const items = [
 *   { quantity: 2, unitPrice: 1000 },
 *   { quantity: 1, unitPrice: 500 }
 * ];
 * const total = calculateSaleTotal(items, 0.1, 0);
 * // Returns 3300 (2 * 1000 + 1 * 500) * 1.1 = 3300 cents = $33.00
 * ```
 * 
 * @throws {ValidationError} If items array is empty
 */
export function calculateSaleTotal(
  items: SaleItem[],
  taxRate: number = 0,
  discountAmount: number = 0
): number {
  if (items.length === 0) {
    throw new ValidationError("Sale must have at least one item");
  }
  
  const subtotal = items.reduce((sum, item) => 
    sum + (item.quantity * item.unitPrice), 0
  );
  
  const taxAmount = subtotal * taxRate;
  const total = subtotal + taxAmount - discountAmount;
  
  return Math.max(0, total); // Ensure total is not negative
}
```

#### Component Documentation
```typescript
/**
 * Sales dashboard component displaying key metrics and charts
 * 
 * This component provides an overview of sales performance including
 * total sales, transaction count, and trend analysis.
 * 
 * @param props - Component props
 * @param props.branchId - ID of the branch to show data for
 * @param props.dateRange - Date range for the data
 * @param props.showComparison - Whether to show period-over-period comparison
 * 
 * @example
 * ```tsx
 * <SalesDashboard
 *   branchId="branch-123"
 *   dateRange={{ start: Date.now(), end: Date.now() }}
 *   showComparison={true}
 * />
 * ```
 * 
 * @remarks
 * - Uses Convex queries for real-time data
 * - Supports optimistic updates for better UX
 * - Automatically refreshes when data changes
 */
export function SalesDashboard({ 
  branchId, 
  dateRange, 
  showComparison = false 
}: SalesDashboardProps) {
  // Component implementation
}
```

### API Documentation

#### Convex Function Documentation
```typescript
/**
 * Get sales metrics for a specified date range and branch
 * 
 * This query function calculates various sales metrics including total sales,
 * transaction count, average transaction value, and growth compared to the
 * previous period.
 * 
 * @param args - Query arguments
 * @param args.branchId - Branch ID to filter by (optional, all branches if not provided)
 * @param args.startDate - Start date timestamp (inclusive)
 * @param args.endDate - End date timestamp (inclusive)
 * @param args.includeComparison - Whether to include comparison data (optional)
 * 
 * @returns Promise resolving to sales metrics object
 * 
 * @throws {ValidationError} If date range is invalid (startDate >= endDate)
 * 
 * @example
 * ```typescript
 * const metrics = await ctx.query(api.sales.getMetrics, {
 *   branchId: "branch-123",
 *   startDate: new Date('2025-01-01').getTime(),
 *   endDate: new Date('2025-01-31').getTime(),
 *   includeComparison: true
 * });
 * 
 * console.log(metrics.totalSales); // $45,250.00
 * console.log(metrics.growthPercentage); // 12.5
 * ```
 */
export const getMetrics = query({
  args: {
    branchId: v.optional(v.id("branches")),
    startDate: v.number(),
    endDate: v.number(),
    includeComparison: v.optional(v.boolean())
  },

  handler: async (ctx, args) => {
    // Validate date range
    if (args.startDate >= args.endDate) {
      throw new ValidationError("Start date must be before end date");
    }

    // Build base query
    let salesQuery = ctx.db.query("sales")
      .withIndex("by_date", q => 
        q.gte("saleDate", args.startDate)
         .lte("saleDate", args.endDate)
      );

    // Apply branch filter if specified
    if (args.branchId) {
      salesQuery = salesQuery.filter(sale => sale.branchId === args.branchId);
    }

    // Execute query and calculate metrics
    const sales = await salesQuery.collect();
    
    return calculateSalesMetrics(sales, args.includeComparison);
  }
});
```

## 🚀 Release Process

### Version Management

#### Semantic Versioning
- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

#### Version Updates
```bash
# Update version in package.json
npm version patch    # 1.0.0 -> 1.0.1
npm version minor    # 1.0.1 -> 1.1.0  
npm version major    # 1.1.0 -> 2.0.0

# This creates a git tag
git push origin main --tags
```

### Deployment Pipeline

#### GitHub Actions Workflow
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]
    tags: ['v*']

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm run test
      
      - name: Run linting
        run: npm run lint
      
      - name: Type check
        run: npm run type-check

  build-and-deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
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

### Release Checklist

#### Pre-Release
- [ ] All tests pass
- [ ] Code review completed
- [ ] Documentation updated
- [ ] Version number updated
- [ ] Changelog updated
- [ ] Migration scripts prepared

#### Release Day
- [ ] Create release branch
- [ ] Run final testing
- [ ] Deploy to staging
- [ ] Deploy to production
- [ ] Monitor for issues
- [ ] Update documentation

#### Post-Release
- [ ] Verify deployment success
- [ ] Check monitoring dashboards
- [ ] Notify team of release
- [ ] Update stakeholders
- [ ] Archive release notes

---

## 🆘 Getting Help

### Development Resources
- **Convex Documentation**: https://docs.convex.dev/
- **Next.js Documentation**: https://nextjs.org/docs
- **React Documentation**: https://react.dev/
- **TypeScript Handbook**: https://www.typescriptlang.org/docs/

### Getting Help
- **Internal Chat**: Use the development team channel
- **Code Reviews**: Request review from senior developers
- **Architecture Questions**: Discuss in weekly architecture meetings
- **Bug Reports**: Create detailed GitHub issues

### Additional Resources
- **Git Style Guide**: Follow conventional commits
- **Testing Guide**: Follow the testing strategy outlined above
- **API Guidelines**: Maintain consistency with existing patterns
- **UI/UX Guidelines**: Follow the design system standards

---

**Happy Contributing!** 🎉

Remember to always write code you'd be proud to maintain and document code for future developers (including yourself!).