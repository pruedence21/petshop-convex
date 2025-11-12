"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog, useConfirm } from "@/components/ui/confirm-dialog";
import { TableSkeleton, StatCardSkeleton } from "@/components/ui/loading-skeletons";
import { ErrorBoundary } from "@/components/error-boundary";
import { withRetry, formatErrorMessage } from "@/lib/error-handling";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Receipt,
  Plus,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Filter,
  Upload,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Id } from "@/convex/_generated/dataModel";

export default function ExpenseManagementPage() {
  return (
    <ErrorBoundary>
      <ExpenseContent />
    </ErrorBoundary>
  );
}

function ExpenseContent() {
  const expenses = useQuery(api.expenses.list, {});
  const categories = useQuery(api.expenseCategories.list, {});
  const branches = useQuery(api.branches.list, {});

  const createExpense = useMutation(api.expenses.create);
  const submitExpense = useMutation(api.expenses.submit);
  const approveExpense = useMutation(api.expenses.approve);
  const rejectExpense = useMutation(api.expenses.reject);
  const payExpense = useMutation(api.expenses.pay);

  const { confirm, dialog: confirmDialog } = useConfirm();
  const [showDialog, setShowDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showPayDialog, setShowPayDialog] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");

  const [formData, setFormData] = useState({
    branchId: "",
    categoryId: "",
    expenseDate: new Date().toISOString().split("T")[0],
    amount: 0,
    vendor: "",
    description: "",
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { className: string; label: string; icon: any }> = {
      DRAFT: { className: "bg-slate-100 text-slate-800", label: "Draft", icon: Clock },
      PENDING_APPROVAL: {
        className: "bg-amber-100 text-amber-800",
        label: "Pending",
        icon: Clock,
      },
      APPROVED: {
        className: "bg-green-100 text-green-800",
        label: "Approved",
        icon: CheckCircle,
      },
      REJECTED: {
        className: "bg-red-100 text-red-800",
        label: "Rejected",
        icon: XCircle,
      },
      PAID: { className: "bg-blue-100 text-blue-800", label: "Paid", icon: CheckCircle },
    };
    const variant = variants[status] || variants.DRAFT;
    const Icon = variant.icon;
    return (
      <Badge className={variant.className}>
        <Icon className="w-3 h-3 mr-1" />
        {variant.label}
      </Badge>
    );
  };

  const handleCreate = () => {
    setFormData({
      branchId: branches?.[0]?._id || "",
      categoryId: "",
      expenseDate: new Date().toISOString().split("T")[0],
      amount: 0,
      vendor: "",
      description: "",
    });
    setShowDialog(true);
  };

  const handleSubmit = async () => {
    try {
      const result = await createExpense({
        branchId: formData.branchId as Id<"branches">,
        categoryId: formData.categoryId as Id<"expenseCategories">,
        expenseDate: new Date(formData.expenseDate).getTime(),
        amount: formData.amount,
        vendor: formData.vendor,
        description: formData.description,
      });

      // Auto-submit for approval
      await submitExpense({ id: result.expenseId });
      
      toast.success("Expense berhasil dibuat dan disubmit untuk approval");
      setShowDialog(false);
    } catch (error: any) {
      toast.error(error.message || "Gagal membuat expense");
    }
  };

  const handleApprove = async (id: Id<"expenses">) => {
    try {
      await approveExpense({ id });
      toast.success("Expense berhasil diapprove");
    } catch (error: any) {
      toast.error(error.message || "Gagal approve expense");
    }
  };

  const handleReject = async (id: Id<"expenses">) => {
    const reason = prompt("Alasan penolakan:");
    if (!reason) return;

    try {
      await rejectExpense({ id, rejectionReason: reason });
      toast.success("Expense berhasil ditolak");
    } catch (error: any) {
      toast.error(error.message || "Gagal reject expense");
    }
  };

  const handlePay = async (id: Id<"expenses">) => {
    const paymentMethod = prompt("Metode pembayaran (CASH/BANK/TRANSFER):");
    if (!paymentMethod) return;

    try {
      await payExpense({ id, paymentMethod });
      toast.success("Expense berhasil dibayar");
    } catch (error: any) {
      toast.error(error.message || "Gagal membayar expense");
    }
  };

  const viewDetails = (expense: any) => {
    setSelectedExpense(expense);
    setShowDetailDialog(true);
  };

  if (expenses === undefined || categories === undefined || branches === undefined) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="h-8 w-64 bg-slate-200 animate-pulse rounded" />
            <div className="h-4 w-96 bg-slate-200 animate-pulse rounded" />
          </div>
          <div className="h-10 w-40 bg-slate-200 animate-pulse rounded" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
        <TableSkeleton rows={8} columns={7} />
      </div>
    );
  }

  const filteredExpenses =
    statusFilter === "all"
      ? expenses
      : expenses.filter((e) => e.status === statusFilter);

  // Summary stats
  const stats = {
    total: expenses.length,
    pending: expenses.filter((e) => e.status === "PENDING_APPROVAL").length,
    approved: expenses.filter((e) => e.status === "APPROVED").length,
    paid: expenses.filter((e) => e.status === "PAID").length,
    totalAmount: expenses.reduce((sum, e) => sum + e.amount, 0),
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {confirmDialog}
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Manajemen Expense</h1>
          <p className="text-slate-600 mt-1">
            Kelola pengeluaran dengan approval workflow
          </p>
        </div>
        <Button onClick={handleCreate} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" aria-hidden="true" />
          Buat Expense Baru
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expense</CardTitle>
            <Receipt className="h-4 w-4 text-slate-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-slate-600 mt-1">Semua transaksi</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
            <Clock className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
            <p className="text-xs text-slate-600 mt-1">Menunggu approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
            <p className="text-xs text-slate-600 mt-1">Siap dibayar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid</CardTitle>
            <CheckCircle className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.paid}</div>
            <p className="text-xs text-slate-600 mt-1">Sudah dibayar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            <Receipt className="h-4 w-4 text-slate-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatCurrency(stats.totalAmount)}</div>
            <p className="text-xs text-slate-600 mt-1">Semua expense</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 items-center">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-600" />
              <Label>Status:</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua</SelectItem>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="PENDING_APPROVAL">Pending Approval</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                  <SelectItem value="PAID">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expense List */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Expense</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No. Expense</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead className="text-right">Jumlah</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExpenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-slate-500">
                    <Receipt className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Belum ada expense</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredExpenses.map((expense) => (
                  <TableRow key={expense._id}>
                    <TableCell className="font-mono text-sm">
                      {expense.expenseNumber}
                    </TableCell>
                    <TableCell>{formatDate(expense.expenseDate)}</TableCell>
                    <TableCell>{expense.vendor || "-"}</TableCell>
                    <TableCell>
                      <span className="text-sm text-slate-600">
                        {/* Category name would need to be fetched */}
                        Category
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold">
                      {formatCurrency(expense.amount)}
                    </TableCell>
                    <TableCell>{getStatusBadge(expense.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => viewDetails(expense)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {expense.status === "PENDING_APPROVAL" && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleApprove(expense._id)}
                              className="text-green-600"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleReject(expense._id)}
                              className="text-red-600"
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        {expense.status === "APPROVED" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePay(expense._id)}
                            className="text-blue-600"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Expense Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Buat Expense Baru</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="branchId">Cabang *</Label>
                <Select
                  value={formData.branchId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, branchId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((branch) => (
                      <SelectItem key={branch._id} value={branch._id}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="categoryId">Kategori *</Label>
                <Select
                  value={formData.categoryId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, categoryId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category._id} value={category._id}>
                        {category.categoryName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expenseDate">Tanggal *</Label>
                <Input
                  id="expenseDate"
                  type="date"
                  value={formData.expenseDate}
                  onChange={(e) =>
                    setFormData({ ...formData, expenseDate: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Jumlah *</Label>
                <Input
                  id="amount"
                  type="number"
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      amount: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="0"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vendor">Vendor</Label>
              <Input
                id="vendor"
                value={formData.vendor}
                onChange={(e) =>
                  setFormData({ ...formData, vendor: e.target.value })
                }
                placeholder="Nama vendor/supplier"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Deskripsi *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Deskripsi pengeluaran..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="receipt">Upload Receipt (Coming Soon)</Label>
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center">
                <Upload className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                <p className="text-sm text-slate-500">
                  File upload akan segera tersedia
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Batal
            </Button>
            <Button onClick={handleSubmit}>Submit untuk Approval</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      {selectedExpense && (
        <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Detail Expense</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-600">Nomor Expense</Label>
                  <p className="font-mono font-semibold">
                    {selectedExpense.expenseNumber}
                  </p>
                </div>
                <div>
                  <Label className="text-slate-600">Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedExpense.status)}</div>
                </div>
                <div>
                  <Label className="text-slate-600">Tanggal</Label>
                  <p>{formatDate(selectedExpense.expenseDate)}</p>
                </div>
                <div>
                  <Label className="text-slate-600">Jumlah</Label>
                  <p className="font-semibold text-lg">
                    {formatCurrency(selectedExpense.amount)}
                  </p>
                </div>
              </div>

              <div>
                <Label className="text-slate-600">Vendor</Label>
                <p>{selectedExpense.vendor || "-"}</p>
              </div>

              <div>
                <Label className="text-slate-600">Deskripsi</Label>
                <p>{selectedExpense.description}</p>
              </div>

              {selectedExpense.rejectionReason && (
                <div className="bg-red-50 p-3 rounded">
                  <Label className="text-red-800">Alasan Penolakan</Label>
                  <p className="text-red-700">{selectedExpense.rejectionReason}</p>
                </div>
              )}

              {selectedExpense.approvedAt && (
                <div className="bg-green-50 p-3 rounded">
                  <Label className="text-green-800">Approval Info</Label>
                  <p className="text-sm text-green-700">
                    Approved on {formatDate(selectedExpense.approvedAt)}
                  </p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button onClick={() => setShowDetailDialog(false)}>Tutup</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
