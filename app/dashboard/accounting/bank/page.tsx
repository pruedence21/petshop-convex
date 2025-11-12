"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Wallet,
  Plus,
  Edit,
  Trash2,
  TrendingUp,
  TrendingDown,
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Id } from "@/convex/_generated/dataModel";

export default function BankManagementPage() {
  const bankAccounts = useQuery(api.bankAccounts.list, {});
  const accounts = useQuery(api.accounts.list, { accountType: "ASSET" });

  const createBankAccount = useMutation(api.bankAccounts.create);
  const updateBankAccount = useMutation(api.bankAccounts.update);
  const removeBankAccount = useMutation(api.bankAccounts.remove);
  const recordTransaction = useMutation(api.bankTransactions.recordTransaction);
  const reconcileTransaction = useMutation(api.bankTransactions.reconcile);

  const [showAccountDialog, setShowAccountDialog] = useState(false);
  const [showTransactionDialog, setShowTransactionDialog] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any>(null);
  const [selectedBankId, setSelectedBankId] = useState<Id<"bankAccounts"> | null>(
    null
  );

  const [accountFormData, setAccountFormData] = useState({
    accountName: "",
    bankName: "",
    accountNumber: "",
    linkedAccountId: "",
    initialBalance: 0,
    currency: "IDR",
  });

  const [transactionFormData, setTransactionFormData] = useState({
    transactionType: "DEPOSIT",
    amount: 0,
    referenceNumber: "",
    description: "",
    transactionDate: new Date().toISOString().split("T")[0],
  });

  // Get transactions for selected bank
  const bankTransactions = useQuery(
    api.bankTransactions.list,
    selectedBankId ? { bankAccountId: selectedBankId } : "skip"
  );

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

  const handleCreateAccount = () => {
    setEditingAccount(null);
    setAccountFormData({
      accountName: "",
      bankName: "",
      accountNumber: "",
      linkedAccountId: "",
      initialBalance: 0,
      currency: "IDR",
    });
    setShowAccountDialog(true);
  };

  const handleEditAccount = (account: any) => {
    setEditingAccount(account);
    setAccountFormData({
      accountName: account.accountName,
      bankName: account.bankName,
      accountNumber: account.accountNumber,
      linkedAccountId: account.linkedAccountId,
      initialBalance: account.initialBalance,
      currency: account.currency || "IDR",
    });
    setShowAccountDialog(true);
  };

  const handleSubmitAccount = async () => {
    try {
      if (editingAccount) {
        await updateBankAccount({
          id: editingAccount._id,
          accountName: accountFormData.accountName,
          isActive: true,
        });
        toast.success("Bank account berhasil diperbarui");
      } else {
        await createBankAccount({
          accountName: accountFormData.accountName,
          bankName: accountFormData.bankName,
          accountNumber: accountFormData.accountNumber,
          linkedAccountId: accountFormData.linkedAccountId as Id<"accounts">,
          initialBalance: accountFormData.initialBalance,
          currency: accountFormData.currency,
        });
        toast.success("Bank account berhasil dibuat");
      }
      setShowAccountDialog(false);
    } catch (error: any) {
      toast.error(error.message || "Gagal menyimpan bank account");
    }
  };

  const handleDeleteAccount = async (id: Id<"bankAccounts">) => {
    if (!confirm("Yakin ingin menghapus bank account ini?")) return;

    try {
      await removeBankAccount({ id });
      toast.success("Bank account berhasil dihapus");
    } catch (error: any) {
      toast.error(error.message || "Gagal menghapus bank account");
    }
  };

  const handleRecordTransaction = () => {
    setTransactionFormData({
      transactionType: "DEPOSIT",
      amount: 0,
      referenceNumber: "",
      description: "",
      transactionDate: new Date().toISOString().split("T")[0],
    });
    setShowTransactionDialog(true);
  };

  const handleSubmitTransaction = async () => {
    if (!selectedBankId) {
      toast.error("Pilih bank account terlebih dahulu");
      return;
    }

    try {
      await recordTransaction({
        bankAccountId: selectedBankId,
        transactionType: transactionFormData.transactionType as any,
        amount: transactionFormData.amount,
        referenceNumber: transactionFormData.referenceNumber,
        description: transactionFormData.description,
        transactionDate: new Date(transactionFormData.transactionDate).getTime(),
      });
      toast.success("Transaksi berhasil dicatat");
      setShowTransactionDialog(false);
    } catch (error: any) {
      toast.error(error.message || "Gagal mencatat transaksi");
    }
  };

  const handleReconcile = async (transactionId: Id<"bankTransactions">) => {
    try {
      await reconcileTransaction({ transactionId });
      toast.success("Transaksi berhasil direkonsiliasi");
    } catch (error: any) {
      toast.error(error.message || "Gagal merekonsiliasi transaksi");
    }
  };

  const getTransactionTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      DEPOSIT: "bg-green-100 text-green-800",
      WITHDRAWAL: "bg-red-100 text-red-800",
      TRANSFER_IN: "bg-blue-100 text-blue-800",
      TRANSFER_OUT: "bg-orange-100 text-orange-800",
    };
    return colors[type] || "bg-slate-100 text-slate-800";
  };

  const getReconciliationBadge = (status: string) => {
    const variants: Record<string, { className: string; label: string }> = {
      UNRECONCILED: { className: "bg-amber-100 text-amber-800", label: "Belum" },
      RECONCILED: { className: "bg-green-100 text-green-800", label: "Sudah" },
      VOID: { className: "bg-red-100 text-red-800", label: "Void" },
    };
    const variant = variants[status] || variants.UNRECONCILED;
    return <Badge className={variant.className}>{variant.label}</Badge>;
  };

  if (bankAccounts === undefined || accounts === undefined) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading bank accounts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Manajemen Bank</h1>
          <p className="text-slate-600 mt-1">
            Kelola akun bank dan rekonsiliasi transaksi
          </p>
        </div>
        <Button onClick={handleCreateAccount}>
          <Plus className="w-4 h-4 mr-2" />
          Tambah Akun Bank
        </Button>
      </div>

      {/* Bank Accounts Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Akun</CardTitle>
            <Wallet className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {bankAccounts.filter((a) => a.isActive).length}
            </div>
            <p className="text-xs text-slate-600 mt-1">Akun aktif</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Saldo</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(
                bankAccounts.reduce((sum, acc) => sum + acc.currentBalance, 0)
              )}
            </div>
            <p className="text-xs text-slate-600 mt-1">Semua bank</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Belum Rekonsiliasi</CardTitle>
            <CheckCircle className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-slate-600 mt-1">Transaksi pending</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bulan Ini</CardTitle>
            <TrendingDown className="h-4 w-4 text-slate-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(0)}</div>
            <p className="text-xs text-slate-600 mt-1">Net movement</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="accounts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="accounts">Daftar Akun Bank</TabsTrigger>
          <TabsTrigger value="transactions" disabled={!selectedBankId}>
            Transaksi Bank
          </TabsTrigger>
          <TabsTrigger value="reconciliation" disabled={!selectedBankId}>
            Rekonsiliasi
          </TabsTrigger>
        </TabsList>

        {/* Bank Accounts Tab */}
        <TabsContent value="accounts">
          <Card>
            <CardHeader>
              <CardTitle>Daftar Akun Bank</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bank</TableHead>
                    <TableHead>Nama Akun</TableHead>
                    <TableHead>No. Rekening</TableHead>
                    <TableHead className="text-right">Saldo Awal</TableHead>
                    <TableHead className="text-right">Saldo Saat Ini</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bankAccounts.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center py-12 text-slate-500"
                      >
                        <Wallet className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>Belum ada akun bank</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    bankAccounts.map((account) => (
                      <TableRow
                        key={account._id}
                        className={
                          selectedBankId === account._id ? "bg-blue-50" : ""
                        }
                        onClick={() => setSelectedBankId(account._id)}
                        style={{ cursor: "pointer" }}
                      >
                        <TableCell className="font-medium">
                          {account.bankName}
                        </TableCell>
                        <TableCell>{account.accountName}</TableCell>
                        <TableCell className="font-mono">
                          {account.accountNumber}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(account.initialBalance)}
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                          {formatCurrency(account.currentBalance)}
                        </TableCell>
                        <TableCell>
                          {account.isActive ? (
                            <Badge className="bg-green-100 text-green-800">
                              Aktif
                            </Badge>
                          ) : (
                            <Badge variant="outline">Inactive</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditAccount(account);
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteAccount(account._id);
                              }}
                              className="text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bank Transactions Tab */}
        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Transaksi Bank</CardTitle>
                <Button onClick={handleRecordTransaction}>
                  <Plus className="w-4 h-4 mr-2" />
                  Catat Transaksi
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Tipe</TableHead>
                    <TableHead>Referensi</TableHead>
                    <TableHead>Keterangan</TableHead>
                    <TableHead className="text-right">Jumlah</TableHead>
                    <TableHead>Rekonsiliasi</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!bankTransactions || bankTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center py-12 text-slate-500"
                      >
                        Belum ada transaksi
                      </TableCell>
                    </TableRow>
                  ) : (
                    bankTransactions.map((txn: any) => (
                      <TableRow key={txn._id}>
                        <TableCell>{formatDate(txn.transactionDate)}</TableCell>
                        <TableCell>
                          <Badge className={getTransactionTypeColor(txn.transactionType)}>
                            {txn.transactionType}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {txn.referenceNumber || "-"}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {txn.description}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(txn.amount)}
                        </TableCell>
                        <TableCell>
                          {getReconciliationBadge(txn.reconciliationStatus)}
                        </TableCell>
                        <TableCell className="text-right">
                          {txn.reconciliationStatus === "UNRECONCILED" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleReconcile(txn._id)}
                              className="text-green-600"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reconciliation Tab */}
        <TabsContent value="reconciliation">
          <Card>
            <CardHeader>
              <CardTitle>Rekonsiliasi Bank</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-slate-500">
                <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Fitur rekonsiliasi akan segera tersedia</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Bank Account Dialog */}
      <Dialog open={showAccountDialog} onOpenChange={setShowAccountDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingAccount ? "Edit Akun Bank" : "Tambah Akun Bank Baru"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bankName">Nama Bank *</Label>
                <Input
                  id="bankName"
                  value={accountFormData.bankName}
                  onChange={(e) =>
                    setAccountFormData({
                      ...accountFormData,
                      bankName: e.target.value,
                    })
                  }
                  placeholder="BCA, Mandiri, BRI, dll"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="accountName">Nama Akun *</Label>
                <Input
                  id="accountName"
                  value={accountFormData.accountName}
                  onChange={(e) =>
                    setAccountFormData({
                      ...accountFormData,
                      accountName: e.target.value,
                    })
                  }
                  placeholder="Rekening Giro"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="accountNumber">No. Rekening *</Label>
                <Input
                  id="accountNumber"
                  value={accountFormData.accountNumber}
                  onChange={(e) =>
                    setAccountFormData({
                      ...accountFormData,
                      accountNumber: e.target.value,
                    })
                  }
                  placeholder="1234567890"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Mata Uang</Label>
                <Select
                  value={accountFormData.currency}
                  onValueChange={(value) =>
                    setAccountFormData({ ...accountFormData, currency: value })
                  }
                  disabled={!!editingAccount}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IDR">IDR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {!editingAccount && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="linkedAccountId">Link ke CoA *</Label>
                  <Select
                    value={accountFormData.linkedAccountId}
                    onValueChange={(value) =>
                      setAccountFormData({
                        ...accountFormData,
                        linkedAccountId: value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih akun di Chart of Accounts" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts
                        ?.filter(
                          (a) =>
                            !a.isHeader &&
                            a.isActive &&
                            a.category === "Bank"
                        )
                        .map((account) => (
                          <SelectItem key={account._id} value={account._id}>
                            {account.accountCode} - {account.accountName}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="initialBalance">Saldo Awal</Label>
                  <Input
                    id="initialBalance"
                    type="number"
                    value={accountFormData.initialBalance}
                    onChange={(e) =>
                      setAccountFormData({
                        ...accountFormData,
                        initialBalance: parseFloat(e.target.value) || 0,
                      })
                    }
                    placeholder="0"
                  />
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAccountDialog(false)}>
              Batal
            </Button>
            <Button onClick={handleSubmitAccount}>
              {editingAccount ? "Update" : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record Transaction Dialog */}
      <Dialog open={showTransactionDialog} onOpenChange={setShowTransactionDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Catat Transaksi Bank</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="transactionType">Tipe Transaksi *</Label>
                <Select
                  value={transactionFormData.transactionType}
                  onValueChange={(value) =>
                    setTransactionFormData({
                      ...transactionFormData,
                      transactionType: value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DEPOSIT">Deposit (Masuk)</SelectItem>
                    <SelectItem value="WITHDRAWAL">Withdrawal (Keluar)</SelectItem>
                    <SelectItem value="TRANSFER_IN">Transfer Masuk</SelectItem>
                    <SelectItem value="TRANSFER_OUT">Transfer Keluar</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Jumlah *</Label>
                <Input
                  id="amount"
                  type="number"
                  value={transactionFormData.amount}
                  onChange={(e) =>
                    setTransactionFormData({
                      ...transactionFormData,
                      amount: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="transactionDate">Tanggal *</Label>
                <Input
                  id="transactionDate"
                  type="date"
                  value={transactionFormData.transactionDate}
                  onChange={(e) =>
                    setTransactionFormData({
                      ...transactionFormData,
                      transactionDate: e.target.value,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="referenceNumber">No. Referensi</Label>
                <Input
                  id="referenceNumber"
                  value={transactionFormData.referenceNumber}
                  onChange={(e) =>
                    setTransactionFormData({
                      ...transactionFormData,
                      referenceNumber: e.target.value,
                    })
                  }
                  placeholder="Nomor transaksi/cek"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Keterangan *</Label>
              <Input
                id="description"
                value={transactionFormData.description}
                onChange={(e) =>
                  setTransactionFormData({
                    ...transactionFormData,
                    description: e.target.value,
                  })
                }
                placeholder="Deskripsi transaksi"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowTransactionDialog(false)}
            >
              Batal
            </Button>
            <Button onClick={handleSubmitTransaction}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
