"use client";

import { useState, useMemo } from "react";
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
  FileText,
  Download,
  TrendingUp,
  DollarSign,
  Calendar,
} from "lucide-react";

export default function FinancialReportsPage() {
  const [reportType, setReportType] = useState("balance-sheet");
  const [asOfDate, setAsOfDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split("T")[0]
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const branches = useQuery(api.master_data.branches.list, {});

  // Balance Sheet Query
  const balanceSheet = useQuery(
    api.finance.financialReports.getBalanceSheet,
    reportType === "balance-sheet"
      ? {
        asOfDate: new Date(asOfDate).getTime(),
      }
      : "skip"
  );

  // Income Statement Query
  const incomeStatement = useQuery(
    api.finance.financialReports.getIncomeStatement,
    reportType === "income-statement"
      ? {
        startDate: new Date(startDate).getTime(),
        endDate: new Date(endDate).getTime(),
      }
      : "skip"
  );

  // Cash Flow Query
  const cashFlow = useQuery(
    api.finance.financialReports.getCashFlowStatement,
    reportType === "cash-flow"
      ? {
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
    // TODO: Implement PDF/Excel export
    alert("Export feature coming soon!");
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Laporan Keuangan
          </h1>
          <p className="text-slate-600 mt-1">
            Balance Sheet, Income Statement, dan Cash Flow Statement
          </p>
        </div>
        <Button onClick={handleExport}>
          <Download className="w-4 h-4 mr-2" />
          Export PDF
        </Button>
      </div>

      {/* Report Selection */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Jenis Laporan</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="balance-sheet">Balance Sheet</SelectItem>
                  <SelectItem value="income-statement">
                    Income Statement
                  </SelectItem>
                  <SelectItem value="cash-flow">Cash Flow</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {reportType === "balance-sheet" && (
              <div className="space-y-2">
                <Label>Per Tanggal</Label>
                <Input
                  type="date"
                  value={asOfDate}
                  onChange={(e) => setAsOfDate(e.target.value)}
                />
              </div>
            )}

            {(reportType === "income-statement" ||
              reportType === "cash-flow") && (
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
          </div>
        </CardContent>
      </Card>

      {/* Balance Sheet */}
      {reportType === "balance-sheet" && balanceSheet && (
        <Card>
          <CardHeader>
            <CardTitle className="text-center text-2xl">
              NERACA (BALANCE SHEET)
            </CardTitle>
            <p className="text-center text-slate-600">
              Per {formatDate(asOfDate)}
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* ASSETS */}
              <div>
                <h3 className="font-bold text-lg mb-3 text-blue-900">ASET</h3>

                {/* Current Assets */}
                <div className="ml-4 space-y-2">
                  <p className="font-semibold text-slate-700">Aset Lancar</p>
                  {balanceSheet.assets?.currentAssets?.map((item: any) => (
                    <div
                      key={item.accountCode}
                      className="flex justify-between ml-4 text-sm"
                    >
                      <span className="text-slate-600">
                        {item.accountName}
                      </span>
                      <span className="font-mono">
                        {formatCurrency(item.balance)}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between ml-4 font-semibold border-t pt-2">
                    <span>Total Aset Lancar</span>
                    <span className="font-mono">
                      {formatCurrency(
                        balanceSheet.assets?.totalCurrentAssets || 0
                      )}
                    </span>
                  </div>
                </div>

                {/* Fixed Assets */}
                <div className="ml-4 space-y-2 mt-4">
                  <p className="font-semibold text-slate-700">Aset Tetap</p>
                  {balanceSheet.assets?.fixedAssets?.map((item: any) => (
                    <div
                      key={item.accountCode}
                      className="flex justify-between ml-4 text-sm"
                    >
                      <span className="text-slate-600">
                        {item.accountName}
                      </span>
                      <span className="font-mono">
                        {formatCurrency(item.balance)}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between ml-4 font-semibold border-t pt-2">
                    <span>Total Aset Tetap</span>
                    <span className="font-mono">
                      {formatCurrency(
                        balanceSheet.assets?.totalFixedAssets || 0
                      )}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between font-bold text-lg border-t-2 border-slate-300 pt-3 mt-3">
                  <span className="text-blue-900">TOTAL ASET</span>
                  <span className="font-mono text-blue-900">
                    {formatCurrency(balanceSheet.assets?.totalAssets || 0)}
                  </span>
                </div>
              </div>

              {/* LIABILITIES */}
              <div className="mt-8">
                <h3 className="font-bold text-lg mb-3 text-red-900">
                  KEWAJIBAN
                </h3>

                {/* Current Liabilities */}
                <div className="ml-4 space-y-2">
                  <p className="font-semibold text-slate-700">
                    Kewajiban Lancar
                  </p>
                  {balanceSheet.liabilities?.currentLiabilities?.map(
                    (item: any) => (
                      <div
                        key={item.accountCode}
                        className="flex justify-between ml-4 text-sm"
                      >
                        <span className="text-slate-600">
                          {item.accountName}
                        </span>
                        <span className="font-mono">
                          {formatCurrency(item.balance)}
                        </span>
                      </div>
                    )
                  )}
                  <div className="flex justify-between ml-4 font-semibold border-t pt-2">
                    <span>Total Kewajiban Lancar</span>
                    <span className="font-mono">
                      {formatCurrency(
                        balanceSheet.liabilities?.totalCurrentLiabilities || 0
                      )}
                    </span>
                  </div>
                </div>

                {/* Long-term Liabilities */}
                {balanceSheet.liabilities?.longTermLiabilities?.length >
                  0 && (
                    <div className="ml-4 space-y-2 mt-4">
                      <p className="font-semibold text-slate-700">
                        Kewajiban Jangka Panjang
                      </p>
                      {balanceSheet.liabilities?.longTermLiabilities?.map(
                        (item: any) => (
                          <div
                            key={item.accountCode}
                            className="flex justify-between ml-4 text-sm"
                          >
                            <span className="text-slate-600">
                              {item.accountName}
                            </span>
                            <span className="font-mono">
                              {formatCurrency(item.balance)}
                            </span>
                          </div>
                        )
                      )}
                      <div className="flex justify-between ml-4 font-semibold border-t pt-2">
                        <span>Total Kewajiban Jangka Panjang</span>
                        <span className="font-mono">
                          {formatCurrency(
                            balanceSheet.liabilities?.totalLongTermLiabilities ||
                            0
                          )}
                        </span>
                      </div>
                    </div>
                  )}

                <div className="flex justify-between font-bold text-lg border-t-2 border-slate-300 pt-3 mt-3">
                  <span className="text-red-900">TOTAL KEWAJIBAN</span>
                  <span className="font-mono text-red-900">
                    {formatCurrency(
                      balanceSheet.liabilities?.totalLiabilities || 0
                    )}
                  </span>
                </div>
              </div>

              {/* EQUITY */}
              <div className="mt-8">
                <h3 className="font-bold text-lg mb-3 text-green-900">
                  EKUITAS
                </h3>
                <div className="ml-4 space-y-2">
                  {balanceSheet.equity?.items?.map((item: any) => (
                    <div
                      key={item.accountCode}
                      className="flex justify-between text-sm"
                    >
                      <span className="text-slate-600">{item.accountName}</span>
                      <span className="font-mono">
                        {formatCurrency(item.balance)}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between font-bold text-lg border-t-2 border-slate-300 pt-3">
                    <span className="text-green-900">TOTAL EKUITAS</span>
                    <span className="font-mono text-green-900">
                      {formatCurrency(balanceSheet.equity?.totalEquity || 0)}
                    </span>
                  </div>
                </div>
              </div>

              {/* TOTAL */}
              <div className="flex justify-between font-bold text-xl border-t-4 border-slate-900 pt-4 mt-6">
                <span>TOTAL KEWAJIBAN & EKUITAS</span>
                <span className="font-mono">
                  {formatCurrency(
                    balanceSheet.totalLiabilitiesAndEquity || 0
                  )}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Income Statement */}
      {reportType === "income-statement" && incomeStatement && (
        <Card>
          <CardHeader>
            <CardTitle className="text-center text-2xl">
              LAPORAN LABA RUGI (INCOME STATEMENT)
            </CardTitle>
            <p className="text-center text-slate-600">
              Periode {formatDate(startDate)} - {formatDate(endDate)}
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* REVENUE */}
              <div>
                <h3 className="font-bold text-lg mb-3">PENDAPATAN</h3>
                <div className="ml-4 space-y-2">
                  {incomeStatement.revenue?.operatingRevenue?.map((item: any) => (
                    <div
                      key={item.accountCode}
                      className="flex justify-between text-sm"
                    >
                      <span className="text-slate-600">{item.accountName}</span>
                      <span className="font-mono">
                        {formatCurrency(item.amount)}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between font-semibold border-t pt-2">
                    <span>Total Pendapatan</span>
                    <span className="font-mono">
                      {formatCurrency(incomeStatement.revenue?.totalRevenue || 0)}
                    </span>
                  </div>
                </div>
              </div>

              {/* COGS */}
              <div>
                <h3 className="font-bold text-lg mb-3">
                  HARGA POKOK PENJUALAN
                </h3>
                <div className="ml-4 space-y-2">
                  {incomeStatement.cogs?.items?.map((item: any) => (
                    <div
                      key={item.accountCode}
                      className="flex justify-between text-sm"
                    >
                      <span className="text-slate-600">{item.accountName}</span>
                      <span className="font-mono">
                        {formatCurrency(item.amount)}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between font-semibold border-t pt-2">
                    <span>Total HPP</span>
                    <span className="font-mono">
                      {formatCurrency(incomeStatement.cogs?.totalCogs || 0)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Gross Profit */}
              <div className="flex justify-between font-bold text-lg border-t-2 border-slate-300 pt-3">
                <span className="text-green-700">LABA KOTOR</span>
                <span className="font-mono text-green-700">
                  {formatCurrency(incomeStatement.grossProfit || 0)}
                </span>
              </div>
              <div className="text-right text-sm text-slate-600">
                Margin: {formatPercent(incomeStatement.grossProfitMargin || 0)}
              </div>

              {/* EXPENSES */}
              <div>
                <h3 className="font-bold text-lg mb-3">BEBAN OPERASIONAL</h3>
                <div className="ml-4 space-y-2">
                  {incomeStatement.expenses?.operating?.map((item: any) => (
                    <div
                      key={item.accountCode}
                      className="flex justify-between text-sm"
                    >
                      <span className="text-slate-600">{item.accountName}</span>
                      <span className="font-mono">
                        {formatCurrency(item.amount)}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between font-semibold border-t pt-2">
                    <span>Total Beban</span>
                    <span className="font-mono">
                      {formatCurrency(
                        incomeStatement.expenses?.totalExpenses || 0
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Net Income */}
              <div className="flex justify-between font-bold text-xl border-t-4 border-slate-900 pt-4">
                <span
                  className={
                    (incomeStatement.netIncome || 0) >= 0
                      ? "text-green-700"
                      : "text-red-700"
                  }
                >
                  LABA BERSIH
                </span>
                <span
                  className={`font-mono ${(incomeStatement.netIncome || 0) >= 0
                      ? "text-green-700"
                      : "text-red-700"
                    }`}
                >
                  {formatCurrency(incomeStatement.netIncome || 0)}
                </span>
              </div>
              <div className="text-right text-sm text-slate-600">
                Net Margin: {formatPercent(incomeStatement.netProfitMargin || 0)}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cash Flow Statement */}
      {reportType === "cash-flow" && cashFlow && (
        <Card>
          <CardHeader>
            <CardTitle className="text-center text-2xl">
              LAPORAN ARUS KAS (CASH FLOW STATEMENT)
            </CardTitle>
            <p className="text-center text-slate-600">
              Periode {formatDate(startDate)} - {formatDate(endDate)}
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Operating Activities */}
              <div>
                <h3 className="font-bold text-lg mb-3">
                  AKTIVITAS OPERASIONAL
                </h3>
                <div className="ml-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Laba Bersih</span>
                    <span className="font-mono">
                      {formatCurrency(
                        cashFlow.operatingActivities?.netIncome || 0
                      )}
                    </span>
                  </div>
                  {cashFlow.operatingActivities?.adjustments?.map(
                    (item: any, idx: number) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span className="text-slate-600 ml-4">{item.description}</span>
                        <span className="font-mono">
                          {formatCurrency(item.amount)}
                        </span>
                      </div>
                    )
                  )}
                  <div className="flex justify-between font-semibold border-t pt-2">
                    <span>Kas dari Aktivitas Operasional</span>
                    <span className="font-mono">
                      {formatCurrency(
                        cashFlow.operatingActivities?.netCashFromOperating || 0
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Investing Activities */}
              {cashFlow.investingActivities?.items?.length > 0 && (
                <div>
                  <h3 className="font-bold text-lg mb-3">
                    AKTIVITAS INVESTASI
                  </h3>
                  <div className="ml-4 space-y-2">
                    {cashFlow.investingActivities?.items?.map(
                      (item: any, idx: number) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span className="text-slate-600">{item.description}</span>
                          <span className="font-mono">
                            {formatCurrency(item.amount)}
                          </span>
                        </div>
                      )
                    )}
                    <div className="flex justify-between font-semibold border-t pt-2">
                      <span>Kas dari Aktivitas Investasi</span>
                      <span className="font-mono">
                        {formatCurrency(
                          cashFlow.investingActivities?.netCashFromInvesting ||
                          0
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Financing Activities */}
              {cashFlow.financingActivities?.items?.length > 0 && (
                <div>
                  <h3 className="font-bold text-lg mb-3">
                    AKTIVITAS PENDANAAN
                  </h3>
                  <div className="ml-4 space-y-2">
                    {cashFlow.financingActivities?.items?.map(
                      (item: any, idx: number) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span className="text-slate-600">{item.description}</span>
                          <span className="font-mono">
                            {formatCurrency(item.amount)}
                          </span>
                        </div>
                      )
                    )}
                    <div className="flex justify-between font-semibold border-t pt-2">
                      <span>Kas dari Aktivitas Pendanaan</span>
                      <span className="font-mono">
                        {formatCurrency(
                          cashFlow.financingActivities?.netCashFromFinancing ||
                          0
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Net Change */}
              <div className="border-t-2 border-slate-300 pt-4 space-y-2">
                <div className="flex justify-between font-bold text-lg">
                  <span>Kenaikan/(Penurunan) Kas</span>
                  <span className="font-mono">
                    {formatCurrency(cashFlow.netCashChange || 0)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Kas Awal Periode</span>
                  <span className="font-mono">
                    {formatCurrency(cashFlow.cashBeginning || 0)}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-xl border-t-4 border-slate-900 pt-3">
                  <span>Kas Akhir Periode</span>
                  <span className="font-mono">
                    {formatCurrency(cashFlow.cashEnding || 0)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {(balanceSheet === undefined ||
        incomeStatement === undefined ||
        cashFlow === undefined) && (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-slate-600">Memuat laporan...</p>
            </div>
          </div>
        )}
    </div>
  );
}
