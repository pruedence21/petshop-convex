# 🚀 Installation Guide - Pet Shop Management System

This guide will walk you through setting up the Pet Shop Management System from scratch. Follow these steps to get your system running locally or in production.

## 📋 System Requirements

### Development Environment
- **Node.js**: Version 18.0.0 or higher
- **npm**: Version 8.0.0 or higher (comes with Node.js)
- **Git**: For version control and cloning
- **Code Editor**: VS Code (recommended) or any TypeScript-compatible editor

### Production Environment
- **Web Server**: Vercel, Netlify, or any Next.js compatible hosting
- **Database**: Convex (cloud-hosted, no setup required)
- **Domain**: Custom domain (optional)
- **SSL Certificate**: HTTPS required for production

### Browser Compatibility
- **Chrome**: Version 90+ ✅
- **Firefox**: Version 88+ ✅
- **Safari**: Version 14+ ✅
- **Edge**: Version 90+ ✅

## 📦 Installation Methods

### Method 1: Fresh Installation (Recommended)

#### Step 1: Clone the Repository
```bash
# Clone from GitHub
git clone https://github.com/your-username/petshop-convex.git
cd petshop-convex

# Or download and extract the ZIP file
```

#### Step 2: Install Dependencies
```bash
# Install all required packages
npm install

# This will install:
# - Next.js 16 and React 19
# - Convex backend framework
# - Tailwind CSS 4
# - TypeScript and type definitions
# - shadcn/ui components
```

#### Step 3: Environment Setup
```bash
# Create environment file
cp .env.local.example .env.local

# Edit .env.local with your configuration
```

**Required Environment Variables:**
```env
# Convex Configuration
CONVEX_DEPLOYMENT=your-convex-deployment-url
CONVEX_URL=https://your-deployment.convex.cloud

# Database Configuration (optional - uses default Convex setup)
DATABASE_URL=postgresql://...

# Authentication (if using custom auth providers)
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3000

# Email Configuration (for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

#### Step 4: Convex Setup
```bash
# Login to Convex (first time only)
npx convex login

# Initialize Convex project
npx convex init

# Deploy the schema and functions
npx convex dev
```

The `npx convex dev` command will:
- Create a new Convex deployment
- Deploy all database schemas
- Start the development server
- Open the Convex dashboard in your browser

#### Step 5: Seed Initial Data
```typescript
// Run in the Convex dashboard or via CLI
// This seeds the chart of accounts and sample data

await ctx.mutation(api.accountingSeed.seedChartOfAccounts, {});
await ctx.mutation(api.bankSeed.seedBankAccounts, {});
await ctx.mutation(api.expenseSeed.seedExpenseCategories, {});

// Output should show:
// ✅ Successfully seeded 80 accounts
// ✅ Successfully seeded 3 bank accounts
// ✅ Successfully seeded 12 expense categories
```

#### Step 6: Start Development Server
```bash
# Terminal 1: Start Convex backend
npx convex dev

# Terminal 2: Start Next.js frontend (in new terminal)
npm run dev:frontend

# Or run both simultaneously
npm run dev
```

Your application will be available at:
- **Frontend**: http://localhost:3000
- **Convex Dashboard**: http://localhost:3000/convex/dashboard

### Method 2: Quick Setup with Create Convex

If you want to start from the official Convex template:

```bash
# Create new project from template
npm create convex@latest -- -t nextjs-convexauth

# Follow the prompts to set up your project
cd your-project-name

# Install dependencies
npm install

# Start development
npm run dev
```

## 🔧 Configuration

### Database Configuration

The system uses Convex's managed PostgreSQL database. No additional database setup is required.

**Database Tables Created:**
- 13 accounting tables (accounts, journal entries, etc.)
- 25+ business tables (sales, customers, products, etc.)
- 10+ reference tables (categories, branches, users, etc.)

### Authentication Setup

The system uses Convex Auth for authentication. Default setup includes:
- Email/password authentication
- User roles and permissions
- Session management

**To customize authentication:**
1. Edit `convex/auth.config.ts`
2. Add custom providers (Google, GitHub, etc.)
3. Configure role-based access control

### Email Configuration

For production, configure SMTP for email notifications:

```env
# Gmail SMTP example
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-business@gmail.com
SMTP_PASS=your-16-digit-app-password
SMTP_FROM=Pet Shop System <noreply@yourpetshop.com>
```

### Payment Integration (Optional)

To enable payment processing:

1. **Stripe Integration:**
```env
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

2. **Local Payment Methods:**
Add cash, card, and digital wallet options in the admin panel.

## 🗃️ Database Seeding

### Initial Setup Data

Run these commands in the Convex dashboard or via API:

#### 1. Chart of Accounts (Required)
```typescript
await ctx.mutation(api.accountingSeed.seedChartOfAccounts, {});
```
Creates 80+ standard Indonesian accounts for accounting.

#### 2. Bank Accounts (Optional)
```typescript
await ctx.mutation(api.bankSeed.seedBankAccounts, {});
```
Creates sample bank accounts linked to the chart of accounts.

#### 3. Expense Categories (Optional)
```typescript
await ctx.mutation(api.expenseSeed.seedExpenseCategories, {});
```
Sets up common expense categories for business operations.

#### 4. Sample Products (Optional)
```typescript
// Add via admin interface or create custom seed
```
Populate your product catalog with initial inventory.

### Custom Seed Data

To add your own seed data:

```typescript
// Create custom seed function in convex/customSeed.ts
export const seedCustomData = mutation({
  handler: async (ctx) => {
    // Add your custom data here
    const branches = [
      { name: "Main Store", address: "Jl. Contoh No. 123" },
      { name: "Branch Store", address: "Jl. Testing No. 456" }
    ];
    
    for (const branch of branches) {
      await ctx.db.insert("branches", {
        ...branch,
        createdAt: Date.now(),
        isActive: true
      });
    }
  }
});
```

## 🌐 Production Deployment

### Deploy to Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# Follow the prompts to configure your deployment
# Set environment variables in Vercel dashboard
```

### Deploy to Netlify

```bash
# Install Netlify CLI
npm i -g netlify-cli

# Login to Netlify
netlify login

# Build and deploy
npm run build
netlify deploy --prod

# Configure environment variables in Netlify dashboard
```

### Manual Deployment

```bash
# Build the application
npm run build

# Start production server
npm start

# Or use PM2 for process management
pm2 start npm --name "petshop-app" -- start
```

## ⚙️ Configuration Files

### package.json Scripts

```json
{
  "scripts": {
    "dev": "npm-run-all --parallel dev:frontend dev:backend",
    "dev:frontend": "next dev",
    "dev:backend": "convex dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint . --ignore-pattern \"convex/_generated/**\"",
    "type-check": "tsc --noEmit"
  }
}
```

### Environment Variables Reference

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `CONVEX_URL` | Convex deployment URL | Yes | `https://happy-animal.convex.cloud` |
| `CONVEX_DEPLOYMENT` | Convex deployment name | Yes | `happy-animal` |
| `NEXTAUTH_SECRET` | Secret for NextAuth | No | `your-secret-key` |
| `STRIPE_SECRET_KEY` | Stripe API key | No | `sk_test_...` |
| `SMTP_HOST` | Email server | No | `smtp.gmail.com` |

### TypeScript Configuration

The project uses strict TypeScript configuration:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "es6"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"],
      "@/components/*": ["./components/*"],
      "@/lib/*": ["./lib/*"],
      "@/app/*": ["./app/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

## 🧪 Testing the Installation

### 1. Basic Functionality Test
1. Open http://localhost:3000
2. Create a user account
3. Log in successfully
4. Navigate through the dashboard

### 2. Database Connection Test
```typescript
// In Convex dashboard, run:
await ctx.query(api.accounts.list, {});
await ctx.query(api.customers.list, {});
await ctx.query(api.products.list, {});
```
All queries should return data or empty arrays.

### 3. API Endpoints Test
```bash
# Test Convex functions
curl -X POST https://your-deployment.convex.cloud/api/mutation \
  -H "Content-Type: application/json" \
  -d '{"path": "accounts/list", "args": {}}'
```

### 4. Core Module Test
1. **Sales**: Create a test sale
2. **Clinic**: Schedule a test appointment
3. **Accounting**: View chart of accounts
4. **Reports**: Generate a financial report

## 🔍 Troubleshooting

### Common Issues

#### Installation Failed
```bash
# Clear npm cache and reinstall
npm cache clean --force
rm -rf node_modules package-lock.json
npm install

# Check Node.js version
node --version  # Should be 18+
```

#### Convex Connection Error
```bash
# Re-authenticate with Convex
npx convex logout
npx convex login

# Check deployment status
npx convex status
```

#### Database Schema Error
```bash
# Reset and redeploy schema
npx convex dev --reset
```

#### Environment Variables Not Working
1. Check `.env.local` file exists
2. Restart development server
3. Verify variable names match exactly
4. Check for typos and extra spaces

#### Build Errors
```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Clear Next.js cache
rm -rf .next
npm run build
```

### Getting Help

1. **Check Logs**: Use browser console and Convex dashboard
2. **Community**: Join Convex Discord community
3. **Documentation**: Review Convex and Next.js docs
4. **Issues**: Report bugs via GitHub Issues

## 📈 Performance Optimization

### Development Optimization
```bash
# Enable fast refresh
# Already enabled by default in Next.js

# Use React DevTools
# Install browser extension for component debugging
```

### Production Optimization
```bash
# Build optimization
npm run build

# Static generation (where applicable)
# Configure in next.config.js

# Image optimization
# Already included in Next.js Image component
```

### Database Optimization
- Indexes are automatically created by Convex
- Use proper query patterns for performance
- Avoid N+1 queries with proper data loading

## 🔒 Security Configuration

### Authentication Security
- Use strong passwords
- Enable two-factor authentication
- Regular password updates
- Secure session management

### Environment Security
- Never commit `.env.local` to version control
- Use different secrets for development/production
- Rotate API keys regularly
- Enable HTTPS in production

### Data Security
- Convex provides automatic encryption
- Regular backups are handled automatically
- Audit logs are maintained for all transactions

---

**Next Steps**: 
- Review the [Quick Start Guide](./03-quick-start.md) to begin using the system
- Check the [API Reference](./04-api-reference.md) for technical details
- Explore the [User Guide](./05-user-guide.md) for business operations

**Related Documentation**:
- [Project Overview](./01-project-overview.md) - System features and benefits
- [Quick Start Guide](./03-quick-start.md) - Get started quickly
- [Troubleshooting Guide](./15-faq-troubleshooting.md) - Common issues and solutions