# GEMINI Project Context: Petshop Management System

This document provides a comprehensive overview of the Petshop Management System project, its architecture, and development conventions to guide future interactions and development.

## 1. Project Overview

This is a full-stack, real-time **Pet Shop Management System** built with a modern technology stack. The application is designed to be a comprehensive business management tool, featuring modules for:

*   **Sales & Inventory:** Point-of-sale, product catalog, stock management, and purchase orders.
*   **Veterinary Clinic:** Appointment scheduling, medical records, and service management.
*   **Pet Hotel:** Room management and bookings.
*   **Customer Management:** Customer and pet profiles.
*   **Accounting:** A complete, integrated double-entry accounting system with a standard Indonesian Chart of Accounts (CoA), automated journal entries, and financial reporting.

### Technology Stack

*   **Frontend:** Next.js 16 (App Router), React 19
*   **Backend & Database:** Convex (Real-time database, Serverless Functions, Auth)
*   **UI & Styling:** Tailwind CSS 4, shadcn/ui, Radix UI
*   **Language:** TypeScript (end-to-end)
*   **Code Quality:** ESLint, Prettier

## 2. Building and Running the Project

### Prerequisites
*   Node.js (v18+)
*   npm

### Key Commands

1.  **Install Dependencies:**
    ```bash
    npm install
    ```

2.  **Run Development Servers:**
    This command starts the Next.js frontend and Convex backend services concurrently. It also runs a setup script on first launch.
    ```bash
    npm run dev
    ```

3.  **Build for Production:**
    ```bash
    npm run build
    ```

4.  **Start Production Server:**
    ```bash
    npm run start
    ```

5.  **Lint the Code:**
    ```bash
    npm run lint
    ```

## 3. Architecture & Development Conventions

This project has well-documented standards. Key documents to reference are `doc/06-system-architecture.md`, `UI_UX_MODERNIZATION_GUIDE.md`, and `ACCOUNTING_MODULE_README.md`.

### Backend (Convex)

*   **Schema:** The single source of truth for the database is `convex/schema.ts`. It is extensive and defines all data models and their relationships.
*   **Modularity:** Business logic is organized into files within the `convex/` directory, corresponding to the application's modules (e.g., `convex/sales.ts`, `convex/clinicAppointments.ts`, `convex/accounting/`).
*   **Accounting Integration:** A critical architectural pattern is the automated generation of journal entries from business transactions. Helper functions like `createSaleJournalEntry` (found in `convex/accountingHelpers.ts`) **must** be called when a sale, purchase, or other financial event occurs. Refer to `ACCOUNTING_MODULE_README.md` for detailed integration logic.

### Frontend (Next.js & React)

*   **Structure:** The frontend uses the Next.js App Router. Pages are located in `app/dashboard/`. Reusable components are in `components/`.
*   **UI Components:** The project uses `shadcn/ui`. New components should be added via `npx shadcn-ui@latest add [component]`.
*   **State Management:** Primarily uses Convex's real-time queries (`useQuery`) for server state. Local component state is managed with React hooks (`useState`, `useReducer`).

### UI/UX and Accessibility Conventions

The `UI_UX_MODERNIZATION_GUIDE.md` outlines strict guidelines that must be followed:

*   **Accessibility (WCAG 2.1 AA):** This is a high priority.
    *   All interactive elements must be keyboard accessible with visible focus indicators.
    *   Icon-only buttons require an `aria-label` and a visually hidden text element (`<span className="sr-only">`).
    *   Use semantic HTML (`<nav>`, `<main>`, etc.) over `<div>` where appropriate.
*   **Error Handling:**
    *   Wrap all pages or major components in the `<ErrorBoundary>` component from `@/components/error-boundary.tsx`.
    *   Use the `withRetry()` helper function from `@/lib/error-handling.ts` for mutations to handle transient network errors.
    *   Display user-friendly error messages using `formatErrorMessage()`.
*   **User Interaction:**
    *   **Do not use `window.confirm()`**. Instead, use the promise-based `useConfirm()` hook from `@/components/ui/confirm-dialog.tsx`.
    *   Display loading states during data fetching and mutations. Use the pre-built skeleton components from `@/components/ui/loading-skeletons.tsx` for initial page loads.
    *   Disable buttons and show a loading indicator during form submissions.
*   **Responsiveness:** All UI must be tested on mobile, tablet, and desktop screen sizes. Use responsive Tailwind CSS classes (`sm:`, `md:`, `lg:`).
