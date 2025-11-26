"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Filter,
  Download,
  Calendar,
} from "lucide-react";

export default function SalesListPage() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Queries
  const branches = useQuery(api.master_data.branches.list, { includeInactive: false });
  
  // We pass status if it's not "all", otherwise undefined
  const salesQueryArgs = statusFilter !== "all" ? { status: statusFilter } : {};
  // Note: The current API only supports one filter at a time (status OR branch OR customer)
  // If we need multi-filtering, we should do it client-side or update the API.
  // For now, let's prioritizing Status filter in API, or handle client side filtering if API returns all.
  
  // The list API: args: { status?, branchId?, customerId? }
  // If I pass { status: "Completed" }, it filters by status.
  
  // Let's fetch based on status if selected, otherwise all (sorted by date)
  const salesData = useQuery(api.sales.sales.list, 
    statusFilter !== "all" ? { status: statusFilter } : 
    branchFilter !== "all" ? { branchId: branchFilter as Id<"branches"> } : 
    {}
  );

  // Client-side filtering for the other fields
  const filteredSales = (salesData || []).filter((sale) => {
    const matchesSearch = 
      sale.saleNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.customer?.name.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesBranch = branchFilter === "all" || sale.branchId === branchFilter;
    const matchesStatus = statusFilter === "all" || sale.status === statusFilter;
    
    // If we used API filter for status, matchesStatus is already true. 
    // But if we used API filter for Branch, we need to check Status here, etc.
    // To be safe and consistent, let's just rely on client side filtering for secondary filters 
    // if the API call was broad.
    // Actually, the API call `list` with no args returns ALL sales sorted by date.
    // Let's stick to that for simplicity unless pagination is needed.
    
    return matchesSearch && matchesBranch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed": return "bg-green-100 text-green-800 hover:bg-green-100";
      case "Draft": return "bg-gray-100 text-gray-800 hover:bg-gray-100";
      case "Cancelled": return "bg-red-100 text-red-800 hover:bg-red-100";
      default: return "bg-blue-100 text-blue-800 hover:bg-blue-100";
    }
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50/50 min-h-screen">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Daftar Penjualan</h1>
          <p className="text-slate-500">Kelola data transaksi penjualan dan pembayaran.</p>
        </div>
        <Button asChild className="bg-blue-600 hover:bg-blue-700">
          <Link href="/dashboard/sales/create">
            <Plus className="h-4 w-4 mr-2" />
            Transaksi Baru
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="p-4 border-b border-slate-100 bg-white">
          <div className="flex flex-col md:flex-row gap-4 justify-between">
            <div className="flex flex-1 gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                <Input
                  placeholder="Cari No. Transaksi atau Customer..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <Filter className="h-4 w-4 mr-2 text-slate-500" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="Completed">Selesai</SelectItem>
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="Cancelled">Dibatalkan</SelectItem>
                </SelectContent>
              </Select>

              <Select value={branchFilter} onValueChange={setBranchFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Semua Cabang" />
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
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No. Transaksi</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Cabang</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-center">Item</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSales.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-slate-500">
                    {salesData === undefined ? "Memuat data..." : "Tidak ada data penjualan."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredSales.map((sale) => (
                  <TableRow key={sale._id} className="hover:bg-slate-50/50">
                    <TableCell className="font-medium font-mono text-xs">
                      {sale.saleNumber}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm">{formatDate(sale.saleDate)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">{sale.customer?.name}</div>
                      <div className="text-xs text-slate-500">{sale.customer?.code}</div>
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {sale.branch?.name}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(sale.totalAmount)}
                      {sale.outstandingAmount > 0 && (
                        <div className="text-xs text-red-500 mt-0.5">
                          Belum lunas: {formatCurrency(sale.outstandingAmount)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="bg-slate-50">
                        {sale.itemCount}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={getStatusColor(sale.status)}>
                        {sale.status === "Completed" ? "Selesai" : 
                         sale.status === "Draft" ? "Draft" : "Batal"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Aksi</DropdownMenuLabel>
                          <DropdownMenuItem asChild>
                            <Link href={`/dashboard/sales/${sale._id}`}>
                              <Eye className="mr-2 h-4 w-4" />
                              Lihat Detail
                            </Link>
                          </DropdownMenuItem>
                          {/* Add more actions like Print Invoice if needed */}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
