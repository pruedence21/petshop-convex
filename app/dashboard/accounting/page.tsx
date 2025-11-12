"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileText,
  AlertCircle,
  Calendar,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

export default function AccountingDashboard() {
  // Calculate dates once (stable across renders)
  const { today, firstDayOfMonth } = useMemo(() => {
    const now = new Date();
    return {
      today: now.getTime(),
      firstDayOfMonth: new Date(now.getFullYear(), now.getMonth(), 1).getTime(),
    };
  }, []);

  // Fetch balance sheet for current balances
  const balanceSheet = useQuery(api.financialReports.getBalanceSheet, {
    asOfDate: today,
  });

  // Fetch income statement for current month
  const incomeStatement = useQuery(api.financialReports.getIncomeStatement, {
    startDate: firstDayOfMonth,
    endDate: today,
  });

  // Fetch AR aging summary
  const arAging = useQuery(api.accountsReceivable.getAgingReport, {
    asOfDate: today,
  });

  // Fetch bank balance summary
  const bankBalances = useQuery(api.bankAccounts.getBalanceSummary, {});

  // Fetch current period
  const currentPeriod = useQuery(api.accountingPeriods.getCurrentPeriod, {});

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercent = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "percent",
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(value / 100);
  };

  // Loading state
  const isLoading =
    balanceSheet === undefined ||
    incomeStatement === undefined ||
    arAging === undefined ||
    bankBalances === undefined;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading accounting dashboard...</p>
        </div>
      </div>
    );
  }

  // Calculate key metrics
  const totalAssets = balanceSheet?.assets?.totalAssets || 0;
  const totalLiabilities = balanceSheet?.liabilities?.totalLiabilities || 0;
  const totalEquity = balanceSheet?.equity?.totalEquity || 0;
  const netIncome = incomeStatement?.netIncome || 0;
  const totalRevenue = incomeStatement?.revenue?.totalRevenue || 0;
  const totalExpenses = incomeStatement?.expenses?.totalExpenses || 0;
  const arTotal = arAging?.summary?.totalOutstanding || 0;
  const arOverdue = (arAging?.summary?.days61to90 || 0) + (arAging?.summary?.over90days || 0);
  const bankTotal = bankBalances?.totalBalance || 0;

  // Calculate profit margin
  const profitMargin = totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Dashboard Akuntansi</h1>
          <p className="text-slate-600 mt-1">
            Overview keuangan dan laporan periode berjalan
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/accounting/reports">
            <Button variant="outline">
              <FileText className="w-4 h-4 mr-2" />
              Laporan
            </Button>
          </Link>
          <Link href="/dashboard/accounting/journal-entries">
            <Button>
              <FileText className="w-4 h-4 mr-2" />
              Buat Jurnal
            </Button>
          </Link>
        </div>
      </div>

      {/* Period Status Alert */}
      {currentPeriod && currentPeriod.status !== "OPEN" && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-amber-900">
              Periode {currentPeriod.periodName} berstatus {currentPeriod.status}
            </p>
            <p className="text-sm text-amber-700 mt-1">
              {currentPeriod.status === "CLOSED"
                ? "Periode ditutup. Transaksi tidak dapat diubah."
                : "Periode terkunci. Hubungi administrator untuk membuka."}
            </p>
          </div>
        </div>
      )}

      {/* Key Metrics - Top Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Assets */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Total Aset
            </CardTitle>
            <Wallet className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {formatCurrency(totalAssets)}
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Liabilitas: {formatCurrency(totalLiabilities)}
            </p>
          </CardContent>
        </Card>

        {/* Net Income */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Laba Bersih (Bulan Ini)
            </CardTitle>
            {netIncome >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                netIncome >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {formatCurrency(netIncome)}
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Margin: {formatPercent(profitMargin)}
            </p>
          </CardContent>
        </Card>

        {/* Bank Balance */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Saldo Bank
            </CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {formatCurrency(bankTotal)}
            </div>
            <p className="text-xs text-slate-600 mt-1">
              {bankBalances?.byBank.length || 0} rekening aktif
            </p>
          </CardContent>
        </Card>

        {/* Accounts Receivable */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Piutang Usaha
            </CardTitle>
            <FileText className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {formatCurrency(arTotal)}
            </div>
            <p className="text-xs text-red-600 mt-1">
              Overdue: {formatCurrency(arOverdue)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Financial Overview - Middle Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income Statement Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Laporan Laba Rugi</span>
              <Link href="/dashboard/accounting/reports/income-statement">
                <Button variant="ghost" size="sm">
                  Lihat Detail
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center pb-3 border-b">
              <span className="text-slate-600">Pendapatan</span>
              <span className="font-semibold text-green-600">
                {formatCurrency(totalRevenue)}
              </span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b">
              <span className="text-slate-600">Beban Pokok Penjualan</span>
              <span className="font-semibold text-slate-900">
                {formatCurrency(incomeStatement?.cogs?.totalCogs || 0)}
              </span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b">
              <span className="text-slate-600">Laba Kotor</span>
              <span className="font-semibold text-slate-900">
                {formatCurrency(incomeStatement?.grossProfit || 0)}
              </span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b">
              <span className="text-slate-600">Beban Operasional</span>
              <span className="font-semibold text-slate-900">
                {formatCurrency(totalExpenses)}
              </span>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="font-semibold text-slate-900">Laba Bersih</span>
              <span
                className={`font-bold text-lg ${
                  netIncome >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {formatCurrency(netIncome)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Balance Sheet Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Neraca</span>
              <Link href="/dashboard/accounting/reports/balance-sheet">
                <Button variant="ghost" size="sm">
                  Lihat Detail
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-600 font-medium">ASET</span>
                <span className="font-semibold text-blue-600">
                  {formatCurrency(totalAssets)}
                </span>
              </div>
              <div className="pl-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Aset Lancar</span>
                  <span>{formatCurrency(balanceSheet?.assets?.totalCurrentAssets || 0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Aset Tetap</span>
                  <span>{formatCurrency(balanceSheet?.assets?.totalFixedAssets || 0)}</span>
                </div>
              </div>
            </div>

            <div className="border-t pt-3 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-600 font-medium">LIABILITAS</span>
                <span className="font-semibold text-red-600">
                  {formatCurrency(totalLiabilities)}
                </span>
              </div>
              <div className="pl-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Liabilitas Lancar</span>
                  <span>
                    {formatCurrency(balanceSheet?.liabilities?.totalCurrentLiabilities || 0)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Liabilitas Jangka Panjang</span>
                  <span>
                    {formatCurrency(balanceSheet?.liabilities?.totalLongTermLiabilities || 0)}
                  </span>
                </div>
              </div>
            </div>

            <div className="border-t pt-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-600 font-medium">EKUITAS</span>
                <span className="font-semibold text-green-600">
                  {formatCurrency(totalEquity)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AR Aging & Quick Actions - Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AR Aging Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Umur Piutang</span>
              <Link href="/dashboard/accounting/receivables">
                <Button variant="ghost" size="sm">
                  Lihat Semua
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-600">0-30 hari</span>
              <span className="font-semibold">
                {formatCurrency(arAging?.summary?.current || 0)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">31-60 hari</span>
              <span className="font-semibold">
                {formatCurrency(arAging?.summary?.days31to60 || 0)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">61-90 hari</span>
              <span className="font-semibold text-amber-600">
                {formatCurrency(arAging?.summary?.days61to90 || 0)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">&gt; 90 hari</span>
              <span className="font-semibold text-red-600">
                {formatCurrency(arAging?.summary?.over90days || 0)}
              </span>
            </div>
            <div className="pt-3 border-t flex justify-between items-center">
              <span className="font-semibold text-slate-900">Total Piutang</span>
              <span className="font-bold text-lg">{formatCurrency(arTotal)}</span>
            </div>
            <p className="text-sm text-slate-600 mt-2">
              {arAging?.summary?.customersWithBalance || 0} pelanggan dengan saldo piutang
            </p>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Akses Cepat</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <Link href="/dashboard/accounting/chart-of-accounts">
              <Button variant="outline" className="w-full justify-start">
                <FileText className="w-4 h-4 mr-2" />
                Bagan Akun
              </Button>
            </Link>
            <Link href="/dashboard/accounting/journal-entries">
              <Button variant="outline" className="w-full justify-start">
                <FileText className="w-4 h-4 mr-2" />
                Jurnal Umum
              </Button>
            </Link>
            <Link href="/dashboard/accounting/bank-accounts">
              <Button variant="outline" className="w-full justify-start">
                <Wallet className="w-4 h-4 mr-2" />
                Bank
              </Button>
            </Link>
            <Link href="/dashboard/accounting/expenses">
              <Button variant="outline" className="w-full justify-start">
                <TrendingDown className="w-4 h-4 mr-2" />
                Beban
              </Button>
            </Link>
            <Link href="/dashboard/accounting/reports">
              <Button variant="outline" className="w-full justify-start">
                <FileText className="w-4 h-4 mr-2" />
                Laporan
              </Button>
            </Link>
            <Link href="/dashboard/accounting/periods">
              <Button variant="outline" className="w-full justify-start">
                <Calendar className="w-4 h-4 mr-2" />
                Periode
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
