"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Users,
  Package,
  AlertTriangle,
  Download,
  FileText,
} from "lucide-react";

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split("T")[0]
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [selectedBranch, setSelectedBranch] = useState<string | undefined>(
    undefined
  );

  const branches = useQuery(api.master_data.branches.list, {});

  // Dashboard KPIs
  const dashboard = useQuery(
    api.reports.dashboardReports.getMainDashboard,
    activeTab === "dashboard"
      ? {
        startDate: new Date(startDate).getTime(),
        endDate: new Date(endDate).getTime(),
        branchId: selectedBranch as any,
        compareWithPreviousPeriod: true,
      }
      : "skip"
  );

  // Sales Reports
  const salesSummary = useQuery(
    api.reports.salesReports.getSalesSummary,
    activeTab === "sales"
      ? {
        startDate: new Date(startDate).getTime(),
        endDate: new Date(endDate).getTime(),
        branchId: selectedBranch as any,
      }
      : "skip"
  );

  const salesByCustomer = useQuery(
    api.reports.salesReports.getSalesByCustomer,
    activeTab === "sales"
      ? {
        startDate: new Date(startDate).getTime(),
        endDate: new Date(endDate).getTime(),
        branchId: selectedBranch as any,
        limit: 10,
      }
      : "skip"
  );

  // Inventory Reports
  const stockSummary = useQuery(
    api.reports.inventoryReports.getStockSummary,
    activeTab === "inventory"
      ? {
        branchId: selectedBranch as any,
      }
      : "skip"
  );

  const lowStockItems = useQuery(
    api.reports.inventoryReports.getLowStockItems,
    activeTab === "inventory"
      ? {
        branchId: selectedBranch as any,
      }
      : "skip"
  );

  const bestSelling = useQuery(
    api.reports.inventoryReports.getBestSellingProducts,
    activeTab === "inventory"
      ? {
        startDate: new Date(startDate).getTime(),
        endDate: new Date(endDate).getTime(),
        branchId: selectedBranch as any,
        limit: 10,
      }
      : "skip"
  );

  // Clinic Reports
  const clinicSummary = useQuery(
    api.reports.clinicReports.getClinicSummary,
    activeTab === "clinic"
      ? {
        startDate: new Date(startDate).getTime(),
        endDate: new Date(endDate).getTime(),
        branchId: selectedBranch as any,
      }
      : "skip"
  );

  const patientReport = useQuery(
    api.reports.clinicReports.getPatientReport,
    activeTab === "clinic"
      ? {
        startDate: new Date(startDate).getTime(),
        endDate: new Date(endDate).getTime(),
        branchId: selectedBranch as any,
      }
      : "skip"
  );

  // Hotel Reports
  const hotelSummary = useQuery(
    api.reports.hotelReports.getHotelSummary,
    activeTab === "hotel"
      ? {
        startDate: new Date(startDate).getTime(),
        endDate: new Date(endDate).getTime(),
        branchId: selectedBranch as any,
      }
      : "skip"
  );

  const roomOccupancy = useQuery(
    api.reports.hotelReports.getRoomOccupancy,
    activeTab === "hotel"
      ? {
        startDate: new Date(startDate).getTime(),
        endDate: new Date(endDate).getTime(),
        branchId: selectedBranch as any,
      }
      : "skip"
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("id-ID").format(num);
  };

  const formatPercent = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "percent",
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(value / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const handleExport = () => {
    alert("Fitur export akan segera hadir!");
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Pusat Laporan & Analitik
          </h1>
          <p className="text-slate-600 mt-1">
            Laporan komprehensif untuk semua modul bisnis
          </p>
        </div>
        <Button onClick={handleExport}>
          <Download className="w-4 h-4 mr-2" />
          Export Laporan
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Dari Tanggal</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Sampai Tanggal</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Cabang</Label>
              <Select
                value={selectedBranch || "all"}
                onValueChange={(value) =>
                  setSelectedBranch(value === "all" ? undefined : value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Cabang</SelectItem>
                  {branches?.map((branch) => (
                    <SelectItem key={branch._id} value={branch._id}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button className="w-full" variant="outline">
                <FileText className="w-4 h-4 mr-2" />
                Terapkan Filter
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="sales">Penjualan</TabsTrigger>
          <TabsTrigger value="inventory">Inventori</TabsTrigger>
          <TabsTrigger value="clinic">Klinik</TabsTrigger>
          <TabsTrigger value="hotel">Hotel</TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          {dashboard ? (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Pendapatan
                    </CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatCurrency(dashboard.kpis.totalRevenue.value)}
                    </div>
                    {dashboard.kpis.totalRevenue.change !== undefined && (
                      <p className="text-xs text-muted-foreground flex items-center mt-1">
                        {dashboard.kpis.totalRevenue.trend === "up" ? (
                          <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
                        ) : dashboard.kpis.totalRevenue.trend === "down" ? (
                          <TrendingDown className="w-4 h-4 text-red-600 mr-1" />
                        ) : null}
                        {formatPercent(dashboard.kpis.totalRevenue.change)} dari
                        periode sebelumnya
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Transaksi
                    </CardTitle>
                    <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatNumber(dashboard.kpis.totalTransactions.value)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Rata-rata:{" "}
                      {formatCurrency(
                        dashboard.kpis.averageTransactionValue.value
                      )}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Pelanggan Aktif
                    </CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatNumber(dashboard.kpis.activeCustomers.value)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Pelanggan Baru: {dashboard.kpis.newCustomers.value}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Nilai Inventori
                    </CardTitle>
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatCurrency(dashboard.kpis.inventoryValue.value)}
                    </div>
                    {dashboard.kpis.lowStockItems.alert && (
                      <p className="text-xs text-red-600 flex items-center mt-1">
                        <AlertTriangle className="w-4 h-4 mr-1" />
                        {dashboard.kpis.lowStockItems.value} item stok rendah
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Revenue Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Rincian Pendapatan per Kategori</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {dashboard.revenueBreakdown.map((item) => (
                      <div key={item.category}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">
                            {item.category}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {formatCurrency(item.amount)} (
                            {formatPercent(item.percentage)})
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${item.percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Top Products */}
                <Card>
                  <CardHeader>
                    <CardTitle>Produk Terlaris</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {dashboard.topPerformers.products.map((product, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between"
                        >
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                              <span className="text-sm font-bold text-blue-600">
                                {idx + 1}
                              </span>
                            </div>
                            <span className="text-sm">{product.name}</span>
                          </div>
                          <span className="text-sm font-medium">
                            {formatCurrency(product.revenue)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Top Customers */}
                <Card>
                  <CardHeader>
                    <CardTitle>Pelanggan Terbaik</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {dashboard.topPerformers.customers.map(
                        (customer, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between"
                          >
                            <div className="flex items-center">
                              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                                <span className="text-sm font-bold text-green-600">
                                  {idx + 1}
                                </span>
                              </div>
                              <span className="text-sm">{customer.name}</span>
                            </div>
                            <span className="text-sm font-medium">
                              {formatCurrency(customer.totalSpent)}
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Alerts Section */}
              {(dashboard.kpis.lowStockItems.alert ||
                dashboard.kpis.accountsReceivable.alert) && (
                  <Card className="border-amber-500">
                    <CardHeader>
                      <CardTitle className="flex items-center text-amber-600">
                        <AlertTriangle className="w-5 h-5 mr-2" />
                        Peringatan & Alert
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {dashboard.kpis.lowStockItems.alert && (
                          <div className="flex items-start p-3 bg-amber-50 rounded-lg">
                            <AlertTriangle className="w-5 h-5 text-amber-600 mr-2 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium">
                                Stok Produk Rendah
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {dashboard.kpis.lowStockItems.value} produk
                                memiliki stok dibawah minimum. Segera lakukan
                                pemesanan ulang.
                              </p>
                            </div>
                          </div>
                        )}
                        {dashboard.kpis.accountsReceivable.alert && (
                          <div className="flex items-start p-3 bg-red-50 rounded-lg">
                            <AlertTriangle className="w-5 h-5 text-red-600 mr-2 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium">
                                Piutang Tinggi
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Piutang usaha mencapai{" "}
                                {formatCurrency(
                                  dashboard.kpis.accountsReceivable.value
                                )}
                                . Lakukan penagihan untuk meningkatkan arus kas.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
            </>
          ) : (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-slate-600">Memuat dashboard...</p>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Sales Tab */}
        <TabsContent value="sales" className="space-y-6">
          {salesSummary ? (
            <>
              {/* Sales Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Total Penjualan</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatCurrency(salesSummary.summary.totalRevenue)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {salesSummary.summary.totalTransactions} transaksi
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">
                      Rata-rata Transaksi
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatCurrency(salesSummary.summary.averageTransaction)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatNumber(salesSummary.summary.totalItemsSold)} item
                      terjual
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Diskon & Pajak</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold">
                      {formatCurrency(salesSummary.summary.totalDiscount)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Pajak: {formatCurrency(salesSummary.summary.totalTax)}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Payment Methods */}
              <Card>
                <CardHeader>
                  <CardTitle>Metode Pembayaran</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Metode</TableHead>
                        <TableHead className="text-right">
                          Jumlah Transaksi
                        </TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Persentase</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {salesSummary.paymentMethods.map((method) => (
                        <TableRow key={method.method}>
                          <TableCell className="font-medium">
                            {method.method}
                          </TableCell>
                          <TableCell className="text-right">
                            {method.count}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(method.amount)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatPercent(method.percentage)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Top Products */}
              <Card>
                <CardHeader>
                  <CardTitle>Produk Terlaris</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produk</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Pendapatan</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {salesSummary.topProducts.map((product) => (
                        <TableRow key={product.productId}>
                          <TableCell className="font-medium">
                            {product.productName}
                          </TableCell>
                          <TableCell>{product.sku}</TableCell>
                          <TableCell className="text-right">
                            {formatNumber(product.quantitySold)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(product.revenue)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Sales by Customer */}
              {salesByCustomer && salesByCustomer.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Penjualan per Pelanggan</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Pelanggan</TableHead>
                          <TableHead className="text-right">
                            Transaksi
                          </TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead className="text-right">Rata-rata</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {salesByCustomer.map((customer) => (
                          <TableRow key={customer.customerId}>
                            <TableCell className="font-medium">
                              {customer.customerName}
                            </TableCell>
                            <TableCell className="text-right">
                              {customer.totalTransactions}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(customer.totalRevenue)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(customer.averageTransaction)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-slate-600">Memuat laporan penjualan...</p>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Inventory Tab */}
        <TabsContent value="inventory" className="space-y-6">
          {stockSummary ? (
            <>
              {/* Stock Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Total Produk</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatNumber(stockSummary.totalProducts)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {stockSummary.totalSKUs} SKU
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Nilai Inventori</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatCurrency(stockSummary.totalStockValue)}
                    </div>
                  </CardContent>
                </Card>

                <Card
                  className={
                    stockSummary.lowStockItems > 0 ? "border-amber-500" : ""
                  }
                >
                  <CardHeader>
                    <CardTitle className="text-sm">Stok Rendah</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-amber-600">
                      {formatNumber(stockSummary.lowStockItems)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Habis: {stockSummary.outOfStockItems}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Stok Berlebih</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatNumber(stockSummary.excessStockItems)}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Low Stock Items */}
              {lowStockItems && lowStockItems.length > 0 && (
                <Card className="border-amber-500">
                  <CardHeader>
                    <CardTitle className="flex items-center text-amber-600">
                      <AlertTriangle className="w-5 h-5 mr-2" />
                      Produk dengan Stok Rendah
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Produk</TableHead>
                          <TableHead>Kategori</TableHead>
                          <TableHead>Cabang</TableHead>
                          <TableHead className="text-right">Stok</TableHead>
                          <TableHead className="text-right">Min</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lowStockItems.slice(0, 10).map((item) => (
                          <TableRow key={item.productId}>
                            <TableCell className="font-medium">
                              {item.productName}
                            </TableCell>
                            <TableCell>{item.categoryName}</TableCell>
                            <TableCell>{item.branchName}</TableCell>
                            <TableCell className="text-right">
                              {item.currentStock}
                            </TableCell>
                            <TableCell className="text-right">
                              {item.minStock}
                            </TableCell>
                            <TableCell>
                              <span
                                className={`px-2 py-1 rounded text-xs ${item.status === "Out of Stock"
                                    ? "bg-red-100 text-red-700"
                                    : "bg-amber-100 text-amber-700"
                                  }`}
                              >
                                {item.status === "Out of Stock"
                                  ? "Habis"
                                  : "Rendah"}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {/* Best Selling Products */}
              {bestSelling && bestSelling.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Produk Terlaris (dengan Profit)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Produk</TableHead>
                          <TableHead>Kategori</TableHead>
                          <TableHead className="text-right">Qty</TableHead>
                          <TableHead className="text-right">Revenue</TableHead>
                          <TableHead className="text-right">Profit</TableHead>
                          <TableHead className="text-right">Margin</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bestSelling.map((product) => (
                          <TableRow key={product.productId}>
                            <TableCell className="font-medium">
                              {product.productName}
                            </TableCell>
                            <TableCell>{product.categoryName}</TableCell>
                            <TableCell className="text-right">
                              {formatNumber(product.quantitySold)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(product.revenue)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(product.profit)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatPercent(product.profitMargin)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-slate-600">Memuat laporan inventori...</p>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Clinic Tab */}
        <TabsContent value="clinic" className="space-y-6">
          {clinicSummary ? (
            <>
              {/* Clinic Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Total Janji Temu</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatNumber(clinicSummary.summary.totalAppointments)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Selesai: {clinicSummary.summary.completedAppointments}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Pendapatan Klinik</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatCurrency(clinicSummary.summary.totalRevenue)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Rata-rata:{" "}
                      {formatCurrency(clinicSummary.summary.averageRevenue)}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Total Pasien</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatNumber(clinicSummary.summary.totalPatients)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Piutang</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatCurrency(clinicSummary.summary.outstandingAmount)}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Service Revenue */}
              <Card>
                <CardHeader>
                  <CardTitle>Pendapatan per Layanan</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Layanan</TableHead>
                        <TableHead className="text-right">
                          Jumlah Temu
                        </TableHead>
                        <TableHead className="text-right">Pendapatan</TableHead>
                        <TableHead className="text-right">Persentase</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {clinicSummary.serviceRevenue.map((service) => (
                        <TableRow key={service.serviceId}>
                          <TableCell className="font-medium">
                            {service.serviceName}
                          </TableCell>
                          <TableCell className="text-right">
                            {service.appointmentCount}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(service.revenue)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatPercent(service.percentage)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Staff Performance */}
              {clinicSummary.staffPerformance.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Performa Staff</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Staff</TableHead>
                          <TableHead className="text-right">
                            Janji Temu
                          </TableHead>
                          <TableHead className="text-right">Revenue</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {clinicSummary.staffPerformance.map((staff) => (
                          <TableRow key={staff.staffId}>
                            <TableCell className="font-medium">
                              {staff.staffName}
                            </TableCell>
                            <TableCell className="text-right">
                              {staff.appointmentCount}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(staff.revenue)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {/* Patient Report */}
              {patientReport && patientReport.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Laporan Pasien (Top 10)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Hewan</TableHead>
                          <TableHead>Pemilik</TableHead>
                          <TableHead>Jenis</TableHead>
                          <TableHead className="text-right">Kunjungan</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {patientReport.slice(0, 10).map((patient) => (
                          <TableRow key={patient.petId}>
                            <TableCell className="font-medium">
                              {patient.petName}
                            </TableCell>
                            <TableCell>{patient.customerName}</TableCell>
                            <TableCell>{patient.animalType}</TableCell>
                            <TableCell className="text-right">
                              {patient.visitCount}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(patient.totalSpent)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-slate-600">Memuat laporan klinik...</p>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Hotel Tab */}
        <TabsContent value="hotel" className="space-y-6">
          {hotelSummary ? (
            <>
              {/* Hotel Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Total Booking</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatNumber(hotelSummary.summary.totalBookings)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Check-out: {hotelSummary.summary.checkedOutBookings}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Pendapatan Hotel</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatCurrency(hotelSummary.summary.totalRevenue)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Kamar: {formatCurrency(hotelSummary.summary.roomRevenue)}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Tingkat Okupansi</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatPercent(hotelSummary.summary.occupancyRate)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Rata-rata periode
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Lama Menginap</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {hotelSummary.summary.averageStayDuration.toFixed(1)}{" "}
                      hari
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Revenue by Room Type */}
              {hotelSummary.revenueByRoomType.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Pendapatan per Tipe Kamar</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tipe Kamar</TableHead>
                          <TableHead className="text-right">Booking</TableHead>
                          <TableHead className="text-right">Revenue</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {hotelSummary.revenueByRoomType.map((type) => (
                          <TableRow key={type.roomType}>
                            <TableCell className="font-medium">
                              {type.roomType}
                            </TableCell>
                            <TableCell className="text-right">
                              {type.bookingCount}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(type.revenue)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {/* Room Occupancy */}
              {roomOccupancy && roomOccupancy.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Okupansi per Kamar</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Kamar</TableHead>
                          <TableHead>Tipe</TableHead>
                          <TableHead className="text-right">Booking</TableHead>
                          <TableHead className="text-right">
                            Total Hari
                          </TableHead>
                          <TableHead className="text-right">Okupansi</TableHead>
                          <TableHead className="text-right">Revenue</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {roomOccupancy.map((room) => (
                          <TableRow key={room.roomId}>
                            <TableCell className="font-medium">
                              {room.roomName}
                            </TableCell>
                            <TableCell>{room.roomType}</TableCell>
                            <TableCell className="text-right">
                              {room.totalBookings}
                            </TableCell>
                            <TableCell className="text-right">
                              {room.totalDays}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatPercent(room.occupancyRate)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(room.revenue)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-slate-600">Memuat laporan hotel...</p>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
