"use client";

import { ReactNode, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Package,
  Users,
  Building2,
  Tag,
  Ruler,
  PawPrint,
  TruckIcon,
  Settings,
  LogOut,
  Heart,
  ShoppingCart,
  PackageSearch,
  History,
  Receipt,
  Stethoscope,
  Calendar,
  UserCog,
  Scissors,
  FileText,
  PackagePlus,
  Zap,
  Hotel,
  Wallet,
  BookOpen,
  DollarSign,
  CreditCard,
  TrendingUp,
  BarChart3,
  ClipboardList,
  Menu,
  X,
  LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ErrorBoundary } from "@/components/error-boundary";
import { useAuthActions } from "@convex-dev/auth/react";
import { LocaleSwitcher } from "@/components/ui/LocaleSwitcher";

// Type definitions for navigation structure
interface NavigationChild {
  name: string;
  href: string;
  icon: LucideIcon;
}

interface NavigationItem {
  name: string;
  icon: LucideIcon;
  href?: string;
  children?: NavigationChild[];
}

const navigation: NavigationItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Penjualan", href: "/dashboard/sales", icon: Receipt },
  { name: "Produk", href: "/dashboard/products", icon: Package },
  { name: "Pembelian", href: "/dashboard/purchase-orders", icon: ShoppingCart },
  { name: "Stok", href: "/dashboard/stock", icon: PackageSearch },
  { name: "Hewan", href: "/dashboard/pets", icon: Heart },
  { name: "Pelanggan", href: "/dashboard/customers", icon: Users },
  { name: "Supplier", href: "/dashboard/suppliers", icon: TruckIcon },
  { name: "Laporan", href: "/dashboard/reports", icon: ClipboardList },
  {
    name: "Akuntansi",
    icon: FileText,
    children: [
      { name: "Dashboard", href: "/dashboard/accounting", icon: LayoutDashboard },
      { name: "Chart of Accounts", href: "/dashboard/accounting/chart-of-accounts", icon: BookOpen },
      { name: "Journal Entries", href: "/dashboard/accounting/journal-entries", icon: FileText },
      { name: "General Ledger", href: "/dashboard/accounting/ledger", icon: BookOpen },
      { name: "Expenses", href: "/dashboard/accounting/expenses", icon: DollarSign },
      { name: "Bank", href: "/dashboard/accounting/bank", icon: Wallet },
      { name: "AR Aging", href: "/dashboard/accounting/ar-aging", icon: CreditCard },
      { name: "Reports", href: "/dashboard/accounting/reports", icon: BarChart3 },
    ],
  },
  {
    name: "Klinik",
    icon: Stethoscope,
    children: [
      { name: "Transaksi Cepat", href: "/dashboard/clinic/transactions", icon: Zap },
      { name: "Appointment", href: "/dashboard/clinic/appointments", icon: Calendar },
      { name: "Rekam Medis", href: "/dashboard/clinic/medical-records", icon: FileText },
      { name: "Staff/Dokter", href: "/dashboard/clinic/staff", icon: UserCog },
    ],
  },
  {
    name: "Pet Hotel",
    icon: Hotel,
    children: [
      { name: "Booking", href: "/dashboard/hotel/bookings", icon: Calendar },
      { name: "Kandang", href: "/dashboard/hotel/rooms", icon: Hotel },
    ],
  },
  {
    name: "Master Data",
    icon: Settings,
    children: [
      { name: "Kategori Produk", href: "/dashboard/product-categories", icon: Package },
      { name: "Sub-Kategori Produk", href: "/dashboard/product-subcategories", icon: Package },
      { name: "Jenis Hewan", href: "/dashboard/animal-categories", icon: PawPrint },
      { name: "Sub-Kategori Hewan", href: "/dashboard/animal-subcategories", icon: PawPrint },
      { name: "Merek", href: "/dashboard/brands", icon: Tag },
      { name: "Satuan", href: "/dashboard/units", icon: Ruler },
      { name: "Cabang", href: "/dashboard/branches", icon: Building2 },
    ],
  },
  {
    name: "Pengaturan",
    icon: UserCog,
    children: [
      { name: "User Management", href: "/dashboard/users", icon: Users },
      { name: "Roles & Permissions", href: "/dashboard/roles", icon: Settings },
    ],
  },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { signOut } = useAuthActions();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <ErrorBoundary>
      <div className="flex h-screen bg-slate-50">
        {/* Mobile Header */}
        <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  aria-label="Buka menu navigasi"
                >
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                <MobileNav
                  pathname={pathname}
                  navigation={navigation}
                  signOut={signOut}
                  onClose={() => setMobileMenuOpen(false)}
                />
              </SheetContent>
            </Sheet>
            <h1 className="text-xl font-bold text-blue-600">🐾 Petshop</h1>
          </div>
          <LocaleSwitcher />
        </div>

        {/* Desktop Sidebar */}
        <aside
          className="hidden lg:flex w-64 bg-white border-r border-slate-200 flex-col"
          role="navigation"
          aria-label="Menu utama"
        >
        <div className="p-6 border-b border-slate-200">
          <h1 className="text-2xl font-bold text-blue-600">🐾 Petshop</h1>
          <p className="text-sm text-slate-500 mt-1">Management System</p>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-1" aria-label="Menu navigasi">
          <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded-md z-50">
            Lewati ke konten utama
          </a>
          {navigation.map((item) => {
            if (item.children) {
              return (
                <div key={item.name} className="space-y-1" role="group" aria-label={item.name}>
                  <div className="px-3 py-2 text-sm font-medium text-slate-700 flex items-center gap-2">
                    <item.icon className="h-5 w-5" aria-hidden="true" />
                    {item.name}
                  </div>
                  <div className="ml-4 space-y-1">
                    {item.children.map((child: NavigationChild) => {
                      const isActive = pathname === child.href;
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={cn(
                            "flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                            isActive
                              ? "bg-blue-50 text-blue-600 font-medium"
                              : "text-slate-600 hover:bg-slate-100"
                          )}
                          aria-current={isActive ? "page" : undefined}
                        >
                          <child.icon className="h-4 w-4" aria-hidden="true" />
                          {child.name}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            }

            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href!}
                href={item.href!}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                  isActive
                    ? "bg-blue-50 text-blue-600 font-medium"
                    : "text-slate-600 hover:bg-slate-100"
                )}
                aria-current={isActive ? "page" : undefined}
              >
                <item.icon className="h-5 w-5" aria-hidden="true" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 space-y-2">
          <LocaleSwitcher />
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-slate-600 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500"
            onClick={() => signOut()}
            aria-label="Keluar dari aplikasi"
          >
            <LogOut className="h-5 w-5" aria-hidden="true" />
            Keluar
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main id="main-content" className="flex-1 overflow-y-auto pt-16 lg:pt-0" role="main">
        {children}
      </main>
    </div>
    </ErrorBoundary>
  );
}

// Mobile Navigation Component
function MobileNav({
  pathname,
  navigation,
  signOut,
  onClose,
}: {
  pathname: string;
  navigation: NavigationItem[];
  signOut: () => void;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-slate-200">
        <h1 className="text-2xl font-bold text-blue-600">🐾 Petshop</h1>
        <p className="text-sm text-slate-500 mt-1">Management System</p>
      </div>

      <nav className="flex-1 overflow-y-auto p-4 space-y-1" aria-label="Menu navigasi mobile">
        {navigation.map((item) => {
          if (item.children) {
            return (
              <div key={item.name} className="space-y-1" role="group" aria-label={item.name}>
                <div className="px-3 py-2 text-sm font-medium text-slate-700 flex items-center gap-2">
                  <item.icon className="h-5 w-5" aria-hidden="true" />
                  {item.name}
                </div>
                <div className="ml-4 space-y-1">
                  {item.children.map((child: NavigationChild) => {
                    const isActive = pathname === child.href;
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        onClick={onClose}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                          isActive
                            ? "bg-blue-50 text-blue-600 font-medium"
                            : "text-slate-600 hover:bg-slate-100"
                        )}
                        aria-current={isActive ? "page" : undefined}
                      >
                        <child.icon className="h-4 w-4" aria-hidden="true" />
                        {child.name}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          }

          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href!}
              href={item.href!}
              onClick={onClose}
              className={cn(
                "flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                isActive
                  ? "bg-blue-50 text-blue-600 font-medium"
                  : "text-slate-600 hover:bg-slate-100"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <item.icon className="h-5 w-5" aria-hidden="true" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-200">
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-slate-600 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500"
          onClick={() => {
            signOut();
            onClose();
          }}
          aria-label="Keluar dari aplikasi"
        >
          <LogOut className="h-5 w-5" aria-hidden="true" />
          Keluar
        </Button>
      </div>
    </div>
  );
}
