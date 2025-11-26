# Deployment Guide

This guide covers how to deploy the Pet Shop Management System to Vercel and set up the initial data.

## Prerequisites

1.  **Vercel Account**: [Sign up here](https://vercel.com/signup).
2.  **Convex Account**: [Sign up here](https://www.convex.dev/).
3.  **GitHub Repository**: Ensure your code is pushed to a GitHub repository.

## Step 1: Deploy to Vercel

1.  Go to your Vercel Dashboard and click **"Add New..."** > **"Project"**.
2.  Import your GitHub repository.
3.  **Build Command**: Vercel should auto-detect Next.js.
    - Build Command: `next build`
    - Install Command: `npm install`
4.  **Environment Variables**:
    - You need to add the Convex environment variables.
    - The easiest way is to use the Convex integration for Vercel, or copy them manually from your local `.env.local` or Convex Dashboard.
    - Required variables:
        - `CONVEX_DEPLOYMENT`: (e.g., `petshop-production-123`)
        - `NEXT_PUBLIC_CONVEX_URL`: (e.g., `https://petshop-production-123.convex.cloud`)

5.  Click **Deploy**.

## Step 2: Initial Setup (Production)

Once deployed, you need to initialize the database and create your admin account.

### 1. Create the First Admin User
The system is designed to automatically assign the **Super Admin** role to the **very first user** who signs up.

1.  Open your deployed application URL (e.g., `https://your-project.vercel.app`).
2.  Go to the Sign In page.
3.  Sign up with your preferred email and password.
4.  **Success!** You are now the Super Admin.
    - You can verify this by going to the Dashboard. You should see all admin menus.

### 2. Seed the Database
Populate the database with essential master data (Chart of Accounts, Branches, Categories, etc.).

**Option A: Using the Command Line (Recommended)**
If you have the project cloned locally and linked to the production deployment:

```bash
# 1. Switch to production context (be careful!)
npx convex env set CONVEX_DEPLOYMENT <your-production-deployment-name>

# 2. Run the seed script
npm run seed
```

**Option B: Using the Convex Dashboard**
1.  Go to your [Convex Dashboard](https://dashboard.convex.dev/).
2.  Select your production deployment.
3.  Go to **Functions**.
4.  Find `seed` > `seedAll`.
5.  Click **Run Function**.

**What gets seeded?**
- **Finance**: Chart of Accounts (Standard Indonesian CoA), Bank Accounts, Expense Categories.
- **Master Data**: "PUSAT" Branch, Units, Product Categories, Brands, Suppliers.
- **Clinic**: Service Categories, Standard Services (Grooming, Checkups), Staff.
- **Inventory**: Sample Products & Medicines.
- **Customers**: General Customer ("UMUM") for walk-in sales.

## Troubleshooting

-   **"I signed up but I'm not an Admin"**:
    -   Did someone else sign up before you? Check the `users` table in the Convex Dashboard.
    -   If needed, you can manually assign the role in the Convex Dashboard by editing your `userProfile` record and setting `roleId` to the ID of the "Admin" role.

-   **"Missing Data"**:
    -   Ensure you ran the `seed` script successfully. Check the logs in the Convex Dashboard for any errors during seeding.
