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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileText, Search, Download } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";

export default function GeneralLedgerPage() {
  const [selectedAccountId, setSelectedAccountId] = useState<Id<"accounts"> | "all">("all");
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split("T")[0]
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [viewType, setViewType] = useState<"ledger" | "trial-balance">("trial-balance");

  const accounts = useQuery(api.finance.accounts.list, {});

  // Trial Balance Query
  const trialBalance = useQuery(
    api.finance.generalLedger.getTrialBalance,
    viewType === "trial-balance"
      ? {
        asOfDate: new Date(endDate).getTime(),
      }
      : "skip"
  );

  // Account Ledger Query
  const accountLedger = useQuery(
    api.finance.generalLedger.getAccountLedger,
    viewType === "ledger" && selectedAccountId !== "all"
      ? {
        accountId: selectedAccountId as Id<"accounts">,
        startDate: new Date(startDate).getTime(),
        endDate: new Date(endDate).getTime(),
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

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleExport = () => {
    alert("Export feature coming soon!");
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">General Ledger</h1>
          <p className="text-muted-foreground mt-1">
            Buku besar dan neraca saldo
          </p>
        </div>
        <Button onClick={handleExport}>
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Tampilan</Label>
              <Select value={viewType} onValueChange={(v: any) => setViewType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="trial-balance">Trial Balance</SelectItem>
                  <SelectItem value="ledger">Account Ledger</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {viewType === "ledger" && (
              <div className="space-y-2">
                <Label>Akun</Label>
                <Select
                  value={selectedAccountId}
                  onValueChange={(v: any) => setSelectedAccountId(v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih akun" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts
                      ?.filter((a) => !a.isHeader && a.isActive)
                      .map((account) => (
                        <SelectItem key={account._id} value={account._id}>
                          {account.accountCode} - {account.accountName}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {viewType === "ledger" && (
              <>
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
              </>
            )}

            {viewType === "trial-balance" && (
              <div className="space-y-2">
                <Label>Per Tanggal</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Trial Balance View */}
      {viewType === "trial-balance" && trialBalance && (
        <Card>
          <CardHeader>
            <CardTitle className="text-center text-xl">
              NERACA SALDO (TRIAL BALANCE)
            </CardTitle>
            <p className="text-center text-muted-foreground">
              Per {formatDate(new Date(endDate).getTime())}
            </p>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Kode</TableHead>
                  <TableHead>Nama Akun</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trialBalance.accounts?.map((account: any) => (
                  <TableRow key={account.accountCode}>
                    <TableCell className="font-mono text-sm">
                      {account.accountCode}
                    </TableCell>
                    <TableCell>{account.accountName}</TableCell>
                    <TableCell className="text-right font-mono">
                      {account.debitBalance > 0
                        ? formatCurrency(account.debitBalance)
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {account.creditBalance > 0
                        ? formatCurrency(account.creditBalance)
                        : "-"}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold bg-muted/50">
                  <TableCell colSpan={2}>TOTAL</TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(trialBalance.totalDebit || 0)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(trialBalance.totalCredit || 0)}
                  </TableCell>
                </TableRow>
                {Math.abs((trialBalance.totalDebit || 0) - (trialBalance.totalCredit || 0)) > 0.01 && (
                  <TableRow className="bg-red-50">
                    <TableCell colSpan={4} className="text-center text-red-600">
                      ⚠️ Trial Balance tidak seimbang! Selisih:{" "}
                      {formatCurrency(
                        Math.abs(
                          (trialBalance.totalDebit || 0) -
                          (trialBalance.totalCredit || 0)
                        )
                      )}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Account Ledger View */}
      {viewType === "ledger" && accountLedger && selectedAccountId !== "all" && (
        <Card>
          <CardHeader>
            <CardTitle>
              Buku Besar: {accountLedger.account?.accountCode} -{" "}
              {accountLedger.account?.accountName}
            </CardTitle>
            <p className="text-muted-foreground">
              Periode {formatDate(new Date(startDate).getTime())} -{" "}
              {formatDate(new Date(endDate).getTime())}
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Opening Balance */}
              <div className="flex justify-between items-center p-3 bg-muted/50 rounded">
                <span className="font-semibold">Saldo Awal</span>
                <span className="font-mono font-semibold">
                  {formatCurrency(accountLedger.openingBalance || 0)}
                </span>
              </div>

              {/* Transactions */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>No. Jurnal</TableHead>
                    <TableHead>Keterangan</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accountLedger.transactions?.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center py-8 text-muted-foreground"
                      >
                        Tidak ada transaksi dalam periode ini
                      </TableCell>
                    </TableRow>
                  ) : (
                    accountLedger.transactions?.map((txn: any, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell>{formatDate(txn.journalDate)}</TableCell>
                        <TableCell className="font-mono text-sm">
                          {txn.journalNumber}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {txn.description}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {txn.debitAmount > 0
                            ? formatCurrency(txn.debitAmount)
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {txn.creditAmount > 0
                            ? formatCurrency(txn.creditAmount)
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                          {formatCurrency(txn.balance)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {/* Summary */}
              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="p-4 bg-blue-50 rounded">
                  <p className="text-sm text-muted-foreground mb-1">Total Debit</p>
                  <p className="text-xl font-bold font-mono">
                    {formatCurrency(accountLedger.totalDebit || 0)}
                  </p>
                </div>
                <div className="p-4 bg-red-50 rounded">
                  <p className="text-sm text-muted-foreground mb-1">Total Credit</p>
                  <p className="text-xl font-bold font-mono">
                    {formatCurrency(accountLedger.totalCredit || 0)}
                  </p>
                </div>
              </div>

              {/* Closing Balance */}
              <div className="flex justify-between items-center p-4 bg-green-50 rounded border-2 border-green-200">
                <span className="font-bold text-lg">Saldo Akhir</span>
                <span className="font-mono font-bold text-xl">
                  {formatCurrency(accountLedger.closingBalance || 0)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {((viewType === "trial-balance" && trialBalance === undefined) ||
        (viewType === "ledger" && accountLedger === undefined && selectedAccountId !== "all")) && (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-muted-foreground">Memuat data...</p>
            </div>
          </div>
        )}

      {/* Empty State */}
      {viewType === "ledger" && selectedAccountId === "all" && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>Silakan pilih akun untuk melihat buku besar</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
