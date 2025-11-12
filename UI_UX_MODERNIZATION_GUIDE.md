# UI/UX Modernization Guide
## Pet Shop Management System - Accessibility & Error Handling

### Overview
This guide documents the comprehensive UI/UX improvements implemented across the pet shop management system, focusing on accessibility compliance (WCAG 2.1 AA), robust error handling, and intuitive user interactions.

---

## 🎯 Key Improvements

### 1. **Accessibility Foundation (WCAG 2.1 AA Compliant)**

#### ARIA Labels & Semantic HTML
All interactive elements now include proper ARIA attributes:
```tsx
// ✅ GOOD - Accessible button
<Button
  onClick={handleAction}
  aria-label="Hapus data pelanggan"
  aria-describedby="confirm-delete-description"
>
  <Trash className="w-4 h-4" aria-hidden="true" />
  <span className="sr-only">Hapus</span>
</Button>

// ❌ BAD - Not accessible
<Button onClick={handleAction}>
  <Trash className="w-4 h-4" />
</Button>
```

#### Keyboard Navigation
- **Tab navigation**: All interactive elements are keyboard-accessible
- **Focus indicators**: Visible focus rings with `focus:ring-2 focus:ring-blue-500`
- **Skip links**: "Lewati ke konten utama" for screen readers
- **Proper tab order**: Logical navigation flow

```tsx
// Skip link example (in dashboard layout)
<a 
  href="#main-content" 
  className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 
             bg-blue-600 text-white px-4 py-2 rounded-md z-50"
>
  Lewati ke konten utama
</a>
```

#### Screen Reader Support
- All icons marked with `aria-hidden="true"`
- Meaningful text alternatives via `sr-only` class
- Dynamic content changes announced with live regions
- Proper heading hierarchy (h1 → h2 → h3)

---

### 2. **Error Handling Infrastructure**

#### React Error Boundary
Catches JavaScript errors anywhere in component tree:

```tsx
import { ErrorBoundary } from "@/components/error-boundary";

// Wrap entire pages or sections
export default function MyPage() {
  return (
    <ErrorBoundary>
      <PageContent />
    </ErrorBoundary>
  );
}

// Custom fallback UI
<ErrorBoundary fallback={CustomErrorComponent}>
  <CriticalSection />
</ErrorBoundary>
```

**Features:**
- Graceful error display with recovery options
- Error logging to console (production: send to Sentry/LogRocket)
- Reset functionality to attempt recovery
- Prevents entire app crashes

#### Retry Mechanisms with Exponential Backoff
```tsx
import { withRetry, formatErrorMessage } from "@/lib/error-handling";

const handleSubmit = async () => {
  try {
    await withRetry(
      async () => await mutation({ data }),
      {
        maxAttempts: 3,
        initialDelay: 1000,  // 1s
        maxDelay: 10000,     // 10s
        backoffMultiplier: 2,
        onRetry: (attempt) => toast.info(`Mencoba lagi (${attempt}/3)...`)
      }
    );
    toast.success("Berhasil!");
  } catch (error) {
    toast.error(formatErrorMessage(error));
  }
};
```

**When to Retry:**
- ✅ Network errors (connection lost, timeout)
- ✅ Server errors (500, 503)
- ❌ Validation errors (400, 422)
- ❌ Authorization errors (401, 403)

#### User-Friendly Error Messages
```tsx
// Indonesian translations for common errors
formatErrorMessage(error) → 
  "Data tidak ditemukan"          // "not found"
  "Data sudah ada"                // "already exists"
  "Masalah koneksi jaringan"      // "network"
  "Tidak memiliki izin"           // "permission"
```

---

### 3. **Accessible Confirmation Dialogs**

#### Replace Native `confirm()` and `prompt()`
**❌ OLD WAY (inaccessible):**
```tsx
const handleDelete = () => {
  if (confirm("Apakah yakin?")) {
    deleteMutation({ id });
  }
};
```

**✅ NEW WAY (accessible):**
```tsx
import { useConfirm } from "@/components/ui/confirm-dialog";

const { confirm, dialog } = useConfirm();

const handleDelete = async () => {
  const confirmed = await confirm({
    title: "Hapus Data",
    description: "Apakah Anda yakin ingin menghapus data ini? Tindakan ini tidak dapat dibatalkan.",
    confirmText: "Hapus",
    cancelText: "Batal",
    variant: "destructive",
  });

  if (confirmed) {
    await deleteMutation({ id });
    toast.success("Data berhasil dihapus");
  }
};

return (
  <div>
    {dialog}
    <Button onClick={handleDelete}>Hapus</Button>
  </div>
);
```

**Features:**
- ARIA-compliant AlertDialog (Radix UI)
- Keyboard accessible (Esc to cancel, Enter to confirm)
- Focus trap within dialog
- Promise-based API (feels like native confirm)

---

### 4. **Loading States & Skeleton Screens**

#### Skeleton Components
Replace "Loading..." text with visual placeholders:

```tsx
import { TableSkeleton, StatCardSkeleton, FormSkeleton } from "@/components/ui/loading-skeletons";

if (data === undefined) {
  return <TableSkeleton rows={8} columns={6} />;
}
```

**Available Skeletons:**
- `<TableSkeleton />` - Data tables
- `<StatCardSkeleton />` - Dashboard cards
- `<FormSkeleton />` - Form fields
- `<CardSkeleton />` - Generic card content
- `<PageHeaderSkeleton />` - Page headers

#### Loading Button States
```tsx
<Button onClick={handleSubmit} disabled={isSubmitting}>
  {isSubmitting ? (
    <>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
      Memproses...
    </>
  ) : (
    "Submit"
  )}
</Button>
```

---

### 5. **Responsive Design & Mobile Optimization**

#### Mobile-First Sidebar
```tsx
// Desktop: Fixed sidebar
<aside className="hidden lg:flex w-64 ...">
  {/* Navigation */}
</aside>

// Mobile: Drawer (Sheet component)
<Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
  <SheetTrigger asChild>
    <Button variant="ghost" size="icon" aria-label="Buka menu navigasi">
      <Menu className="h-6 w-6" />
    </Button>
  </SheetTrigger>
  <SheetContent side="left" className="w-64 p-0">
    <MobileNav ... />
  </SheetContent>
</Sheet>
```

#### Responsive Patterns
```tsx
// Grid layouts adapt to screen size
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  {/* Cards */}
</div>

// Buttons go full-width on mobile
<Button className="w-full sm:w-auto">
  Action
</Button>

// Tables scroll horizontally on mobile
<div className="overflow-x-auto">
  <Table>...</Table>
</div>
```

---

## 📋 Implementation Checklist

### For Every New Page/Component:

#### ✅ Accessibility
- [ ] Wrap page with `<ErrorBoundary>`
- [ ] Add skip link for screen readers
- [ ] All icons have `aria-hidden="true"`
- [ ] All buttons have `aria-label` (if text not visible)
- [ ] Form fields have proper `<Label>` with `htmlFor`
- [ ] Interactive elements have focus indicators
- [ ] Use semantic HTML (`<nav>`, `<main>`, `<section>`)
- [ ] Heading hierarchy is logical (h1 → h2 → h3)

#### ✅ Error Handling
- [ ] Replace `window.confirm()` with `useConfirm()` hook
- [ ] Replace `window.prompt()` with custom Dialog
- [ ] Use `withRetry()` for network operations
- [ ] Use `formatErrorMessage()` for toast errors
- [ ] Show loading states on buttons (`isSubmitting`)
- [ ] Handle `undefined` state from Convex queries

#### ✅ Loading States
- [ ] Show skeleton screens during initial load
- [ ] Use loading spinners on submit buttons
- [ ] Disable buttons during submission
- [ ] Show retry options on errors

#### ✅ Responsive Design
- [ ] Test on mobile (< 768px)
- [ ] Use responsive grid (`grid-cols-1 md:grid-cols-2`)
- [ ] Make buttons full-width on mobile (`w-full sm:w-auto`)
- [ ] Ensure tables scroll horizontally on small screens
- [ ] Test keyboard navigation on all devices

---

## 🎨 Component Library Reference

### Newly Added Components
```bash
npx shadcn@latest add alert-dialog    # Confirmation dialogs
npx shadcn@latest add skeleton        # Loading placeholders
npx shadcn@latest add tooltip         # Hover information
npx shadcn@latest add checkbox        # Form checkboxes
npx shadcn@latest add command         # Command palette
npx shadcn@latest add popover         # Floating content
npx shadcn@latest add separator       # Visual dividers
npx shadcn@latest add scroll-area     # Scrollable containers
npx shadcn@latest add sheet           # Side drawers
```

### Custom Components (created)
- `components/ui/confirm-dialog.tsx` - Accessible confirmation
- `components/ui/loading-skeletons.tsx` - Loading states
- `components/error-boundary.tsx` - Error catching
- `lib/error-handling.ts` - Retry logic

---

## 🚀 Migration Guide

### Step 1: Add Error Boundary
```tsx
// Before
export default function MyPage() {
  return <div>...</div>;
}

// After
export default function MyPage() {
  return (
    <ErrorBoundary>
      <MyPageContent />
    </ErrorBoundary>
  );
}

function MyPageContent() {
  // Existing page logic
}
```

### Step 2: Replace confirm() Dialogs
```tsx
// Before
const handleDelete = () => {
  if (confirm("Delete?")) {
    deleteMutation({ id });
  }
};

// After
const { confirm, dialog } = useConfirm();

const handleDelete = async () => {
  const confirmed = await confirm({
    title: "Hapus Data",
    description: "Apakah Anda yakin?",
    variant: "destructive"
  });
  if (confirmed) await deleteMutation({ id });
};

return (
  <>
    {dialog}
    {/* Your JSX */}
  </>
);
```

### Step 3: Add Loading Skeletons
```tsx
// Before
if (data === undefined) {
  return <div>Loading...</div>;
}

// After
if (data === undefined) {
  return <TableSkeleton rows={10} columns={5} />;
}
```

### Step 4: Improve Button States
```tsx
// Before
<Button onClick={handleSubmit}>Submit</Button>

// After
const [isSubmitting, setIsSubmitting] = useState(false);

<Button onClick={handleSubmit} disabled={isSubmitting}>
  {isSubmitting ? (
    <>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      Memproses...
    </>
  ) : (
    "Submit"
  )}
</Button>
```

### Step 5: Add ARIA Labels
```tsx
// Before
<Button onClick={handleView}>
  <Eye className="w-4 h-4" />
</Button>

// After
<Button 
  onClick={handleView}
  aria-label={`Lihat detail ${item.name}`}
>
  <Eye className="w-4 h-4" aria-hidden="true" />
  <span className="sr-only">Lihat Detail</span>
</Button>
```

---

## 🧪 Testing Checklist

### Accessibility Testing
```bash
# Install axe DevTools Chrome extension
# https://chrome.google.com/webstore (search "axe DevTools")

# Run automated tests
npm install -D @axe-core/react
```

### Manual Testing
1. **Keyboard Navigation**: 
   - Tab through all interactive elements
   - Ensure focus is visible
   - Test Esc key closes dialogs
   - Test Enter key submits forms

2. **Screen Reader** (NVDA/JAWS/VoiceOver):
   - Navigate with screen reader on
   - Verify all content is announced
   - Check form labels are read correctly
   - Test skip links work

3. **Mobile Testing**:
   - Test on real device (or Chrome DevTools mobile view)
   - Verify sidebar drawer opens/closes
   - Check buttons are tappable (min 44x44px)
   - Test horizontal scroll on tables

4. **Error Scenarios**:
   - Disconnect network → verify retry works
   - Submit invalid form → verify inline errors
   - Cause JavaScript error → verify error boundary catches it

---

## 📚 Best Practices

### DO ✅
- Always wrap pages with `<ErrorBoundary>`
- Use `useConfirm()` for all confirmations
- Add `aria-label` to icon-only buttons
- Show loading states during async operations
- Use semantic HTML elements
- Test with keyboard only (no mouse)
- Provide alternative text for visual elements

### DON'T ❌
- Don't use `window.confirm()` or `window.prompt()`
- Don't rely on color alone to convey information
- Don't use `div` when semantic element exists
- Don't forget to handle loading states
- Don't ignore Convex `undefined` state
- Don't hardcode error messages in English
- Don't skip focus indicators

---

## 🔧 Troubleshooting

### "Confirm dialog not showing"
```tsx
// ❌ WRONG - Forgot to render dialog
const { confirm } = useConfirm();

// ✅ CORRECT - Must render dialog
const { confirm, dialog } = useConfirm();
return <>{dialog} {/* rest of JSX */}</>;
```

### "Button still clickable during submission"
```tsx
// ❌ WRONG - No disabled state
<Button onClick={handleSubmit}>Submit</Button>

// ✅ CORRECT - Disable during submission
<Button onClick={handleSubmit} disabled={isSubmitting}>
  {isSubmitting ? "Loading..." : "Submit"}
</Button>
```

### "Skeleton flickers before showing data"
```tsx
// This is expected! Convex queries return undefined first, then data.
// The skeleton shows during undefined state, which is correct behavior.
```

---

## 🎯 Next Steps

### Priority 1 (Current Sprint)
- [x] Error boundaries on all pages
- [x] Replace all `confirm()` calls
- [x] Add loading skeletons
- [x] Mobile-responsive sidebar
- [ ] Migrate sales page to react-hook-form + Zod
- [ ] Add keyboard shortcuts (Ctrl+K command palette)

### Priority 2 (Next Sprint)
- [ ] Add pagination to tables
- [ ] Implement date picker component
- [ ] Add autocomplete for large dropdowns
- [ ] Dark mode support
- [ ] Optimistic updates for better UX

### Priority 3 (Future)
- [ ] E2E tests with Playwright
- [ ] Performance monitoring (web-vitals)
- [ ] Error tracking (Sentry integration)
- [ ] Analytics (PostHog/Mixpanel)
- [ ] Internationalization (next-intl)

---

## 📖 Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Radix UI Accessibility](https://www.radix-ui.com/primitives/docs/overview/accessibility)
- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [Next.js Accessibility](https://nextjs.org/docs/architecture/accessibility)
- [Convex Best Practices](https://docs.convex.dev/production/best-practices)

---

## 💬 Questions?

For questions or suggestions, please:
1. Check this guide first
2. Review example implementation in `app/dashboard/accounting/expenses/page.tsx`
3. Ask in team chat with specific code examples

---

**Last Updated:** November 12, 2025  
**Version:** 1.0.0  
**Maintainers:** Development Team
