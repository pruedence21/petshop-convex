"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import Link from "next/link";
import { AlertTriangle, Package, ShoppingCart, Users, Truck } from "lucide-react";

export default function DashboardPage() {
  const stats = useQuery(api.dashboard.getStats);
  const recentSales = useQuery(api.dashboard.getRecentSales);
  const lowStock = useQuery(api.dashboard.getLowStockProducts);
  const salesChartData = useQuery(api.dashboard.getSalesChartData);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (!stats || !recentSales || !lowStock || !salesChartData) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Selamat datang di Sistem Manajemen Petshop
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Pendapatan Hari Ini</p>
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(stats.todayRevenue)}
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-card p-6 rounded-lg border border-border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Produk</p>
              <p className="text-2xl font-bold text-card-foreground mt-1">
                {stats.totalProducts}
              </p>
            </div>
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-primary" />
            </div>
          </div>
        </div>

        <div className="bg-card p-6 rounded-lg border border-border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Penjualan</p>
              <p className="text-2xl font-bold text-card-foreground mt-1">
                {stats.totalSales}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
              <ShoppingCart className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-card p-6 rounded-lg border border-border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Pelanggan</p>
              <p className="text-2xl font-bold text-card-foreground mt-1">
                {stats.totalCustomers}
              </p>
            </div>
            <div className="w-12 h-12 bg-pink-500/10 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-pink-600 dark:text-pink-400" />
            </div>
          </div>
        </div>

        <div className="bg-card p-6 rounded-lg border border-border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Supplier</p>
              <p className="text-2xl font-bold text-card-foreground mt-1">
                {stats.totalSuppliers}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center">
              <Truck className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sales Chart */}
        <div className="lg:col-span-2 bg-card p-6 rounded-lg border border-border shadow-sm">
          <h2 className="text-lg font-semibold text-card-foreground mb-6">
            Penjualan 7 Hari Terakhir
          </h2>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(date) => format(new Date(date), "dd MMM", { locale: id })}
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'var(--muted-foreground)' }}
                />
                <YAxis
                  tickFormatter={(value) =>
                    new Intl.NumberFormat("id-ID", {
                      notation: "compact",
                      compactDisplay: "short",
                    }).format(value)
                  }
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'var(--muted-foreground)' }}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--popover)', borderColor: 'var(--border)', color: 'var(--popover-foreground)' }}
                  formatter={(value: number) => [formatCurrency(value), "Penjualan"]}
                  labelFormatter={(label) => format(new Date(label), "dd MMMM yyyy", { locale: id })}
                />
                <Bar dataKey="amount" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-card p-6 rounded-lg border border-border shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-card-foreground">Stok Menipis</h2>
            <Link
              href="/dashboard/stock"
              className="text-sm text-primary hover:text-primary/80"
            >
              Lihat Semua
            </Link>
          </div>
          <div className="space-y-4">
            {lowStock.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Stok aman
              </p>
            ) : (
              lowStock.map((item, index) => (
                <div
                  key={index}
                  className="flex items-start space-x-3 p-3 bg-destructive/10 rounded-lg border border-destructive/20"
                >
                  <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {item.productName}
                    </p>
                    <p className="text-xs text-destructive mt-1">
                      Sisa: {item.quantity} (Min: {item.minStock})
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Cabang: {item.branchName}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-card p-6 rounded-lg border border-border shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-card-foreground">
            Transaksi Terakhir
          </h2>
          <Link
            href="/dashboard/sales"
            className="text-sm text-primary hover:text-primary/80"
          >
            Lihat Semua
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
              <tr>
                <th className="px-4 py-3">No. Transaksi</th>
                <th className="px-4 py-3">Pelanggan</th>
                <th className="px-4 py-3">Tanggal</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentSales.map((sale) => (
                <tr key={sale._id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">
                    {sale.saleNumber}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {sale.customerName}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {format(new Date(sale.saleDate), "dd MMM yyyy HH:mm", {
                      locale: id,
                    })}
                  </td>
                  <td className="px-4 py-3 font-medium text-foreground">
                    {formatCurrency(sale.totalAmount)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${sale.status === "Completed"
                        ? "bg-green-500/10 text-green-600 dark:text-green-400"
                        : "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
                        }`}
                    >
                      {sale.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

