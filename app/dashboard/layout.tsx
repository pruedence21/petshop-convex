"use client";

import { ReactNode } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthActions } from "@convex-dev/auth/react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Penjualan", href: "/dashboard/sales", icon: Receipt },
  { name: "Produk", href: "/dashboard/products", icon: Package },
  { name: "Pembelian", href: "/dashboard/purchase-orders", icon: ShoppingCart },
  { name: "Stok", href: "/dashboard/stock", icon: PackageSearch },
  { name: "Hewan", href: "/dashboard/pets", icon: Heart },
  { name: "Pelanggan", href: "/dashboard/customers", icon: Users },
  { name: "Supplier", href: "/dashboard/suppliers", icon: TruckIcon },
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
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { signOut } = useAuthActions();

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-6 border-b border-slate-200">
          <h1 className="text-2xl font-bold text-blue-600">🐾 Petshop</h1>
          <p className="text-sm text-slate-500 mt-1">Management System</p>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {navigation.map((item) => {
            if (item.children) {
              return (
                <div key={item.name} className="space-y-1">
                  <div className="px-3 py-2 text-sm font-medium text-slate-700 flex items-center gap-2">
                    <item.icon className="h-5 w-5" />
                    {item.name}
                  </div>
                  <div className="ml-4 space-y-1">
                    {item.children.map((child) => {
                      const isActive = pathname === child.href;
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={cn(
                            "flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors",
                            isActive
                              ? "bg-blue-50 text-blue-600 font-medium"
                              : "text-slate-600 hover:bg-slate-100"
                          )}
                        >
                          <child.icon className="h-4 w-4" />
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
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors",
                  isActive
                    ? "bg-blue-50 text-blue-600 font-medium"
                    : "text-slate-600 hover:bg-slate-100"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200">
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-slate-600 hover:text-red-600"
            onClick={() => signOut()}
          >
            <LogOut className="h-5 w-5" />
            Keluar
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
