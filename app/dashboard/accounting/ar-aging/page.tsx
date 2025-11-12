"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  TrendingUp,
  AlertTriangle,
  Download,
  Eye,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Id } from "@/convex/_generated/dataModel";

export default function ARAgingReportPage() {
  const agingReport = useQuery(api.accountsReceivable.getAgingReport, {});
  
  const [selectedCustomerId, setSelectedCustomerId] = useState<Id<"customers"> | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

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

  const viewCustomerDetail = (customerId: Id<"customers">) => {
    setSelectedCustomerId(customerId);
    setShowDetailDialog(true);
  };

  if (agingReport === undefined) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading AR dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Laporan Umur Piutang (AR Aging)
          </h1>
          <p className="text-slate-600 mt-1">
            Analisis piutang berdasarkan umur dan pelanggan
          </p>
        </div>
        <Button onClick={handleExport}>
          <Download className="w-4 h-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Piutang
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(agingReport.summary.totalOutstanding)}
            </div>
            <p className="text-xs text-slate-600 mt-1">Outstanding balance</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Jumlah Pelanggan
            </CardTitle>
            <Users className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {agingReport.summary.customersWithBalance}
            </div>
            <p className="text-xs text-slate-600 mt-1">Dengan outstanding</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(agingReport.summary.days31to60 + agingReport.summary.days61to90 + agingReport.summary.over90days)}
            </div>
            <p className="text-xs text-slate-600 mt-1">&gt;30 hari</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg Days Outstanding
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-slate-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(
                agingReport.customerAging.reduce((sum, c) => {
                  const days = c.current * 15 + c.days31to60 * 45 + c.days61to90 * 75 + c.over90days * 120;
                  return sum + days;
                }, 0) / Math.max(agingReport.summary.totalOutstanding, 1)
              )}
            </div>
            <p className="text-xs text-slate-600 mt-1">hari</p>
          </CardContent>
        </Card>
      </div>

      {/* AR Aging Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Aging Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* 0-30 days */}
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <div>
                <p className="font-semibold text-green-900">0-30 Hari</p>
                <p className="text-sm text-green-700">Current</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-green-900">
                  {formatCurrency(agingReport.summary.current)}
                </p>
                <p className="text-sm text-green-700">
                  {((agingReport.summary.current / Math.max(agingReport.summary.totalOutstanding, 1)) * 100).toFixed(1)}%
                </p>
              </div>
            </div>

            {/* 31-60 days */}
            <div className="flex items-center justify-between p-4 bg-amber-50 rounded-lg">
              <div>
                <p className="font-semibold text-amber-900">31-60 Hari</p>
                <p className="text-sm text-amber-700">Slightly overdue</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-amber-900">
                  {formatCurrency(agingReport.summary.days31to60)}
                </p>
                <p className="text-sm text-amber-700">
                  {((agingReport.summary.days31to60 / Math.max(agingReport.summary.totalOutstanding, 1)) * 100).toFixed(1)}%
                </p>
              </div>
            </div>

            {/* 61-90 days */}
            <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg">
              <div>
                <p className="font-semibold text-orange-900">61-90 Hari</p>
                <p className="text-sm text-orange-700">Overdue</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-orange-900">
                  {formatCurrency(agingReport.summary.days61to90)}
                </p>
                <p className="text-sm text-orange-700">
                  {((agingReport.summary.days61to90 / Math.max(agingReport.summary.totalOutstanding, 1)) * 100).toFixed(1)}%
                </p>
              </div>
            </div>

            {/* >90 days */}
            <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border-2 border-red-200">
              <div>
                <p className="font-semibold text-red-900">&gt;90 Hari</p>
                <p className="text-sm text-red-700">Critically overdue</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-red-900">
                  {formatCurrency(agingReport.summary.over90days)}
                </p>
                <p className="text-sm text-red-700">
                  {((agingReport.summary.over90days / Math.max(agingReport.summary.totalOutstanding, 1)) * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customer Outstanding List */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Piutang Per Pelanggan</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pelanggan</TableHead>
                <TableHead className="text-right">0-30</TableHead>
                <TableHead className="text-right">31-60</TableHead>
                <TableHead className="text-right">61-90</TableHead>
                <TableHead className="text-right">&gt;90</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agingReport.customerAging.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center py-12 text-slate-500"
                  >
                    <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Tidak ada piutang outstanding</p>
                  </TableCell>
                </TableRow>
              ) : (
                agingReport.customerAging.map((item) => {
                  const hasOverdue = item.over90days > 0 || item.days61to90 > 0;
                  
                  return (
                    <TableRow key={item.customerId}>
                      <TableCell className="font-medium">
                        {item.customerName}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatCurrency(item.current)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatCurrency(item.days31to60)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm text-orange-600">
                        {formatCurrency(item.days61to90)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm text-red-600 font-semibold">
                        {formatCurrency(item.over90days)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold">
                        {formatCurrency(item.totalOutstanding)}
                      </TableCell>
                      <TableCell className="text-center">
                        {hasOverdue ? (
                          <Badge className="bg-red-100 text-red-800">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Overdue
                          </Badge>
                        ) : (
                          <Badge className="bg-green-100 text-green-800">
                            Current
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => viewCustomerDetail(item.customerId)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Collection Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Days Sales Outstanding (DSO)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {Math.round(
                agingReport.customerAging.reduce((sum, c) => {
                  const days = c.current * 15 + c.days31to60 * 45 + c.days61to90 * 75 + c.over90days * 120;
                  return sum + days;
                }, 0) / Math.max(agingReport.summary.totalOutstanding, 1)
              )}
            </div>
            <p className="text-xs text-slate-600 mt-1">
              hari rata-rata untuk menerima pembayaran
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Collection Effectiveness</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              N/A
            </div>
            <p className="text-xs text-slate-600 mt-1">
              dari total piutang tertagih dalam periode
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Overdue Percentage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              {(
                ((agingReport.summary.days31to60 + agingReport.summary.days61to90 + agingReport.summary.over90days) /
                  Math.max(agingReport.summary.totalOutstanding, 1)) *
                100
              ).toFixed(1)}
              %
            </div>
            <p className="text-xs text-slate-600 mt-1">
              piutang yang sudah lewat jatuh tempo
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Customer Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Detail Piutang Pelanggan</DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <div className="text-center py-12 text-slate-500">
              <p>Detail transaksi pelanggan akan ditampilkan di sini</p>
              <p className="text-sm mt-2">
                (Implementasi query detail invoice per customer)
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
