"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Printer, Banknote, Smartphone, CreditCard } from "lucide-react";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { use } from "react";

export default function SaleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const saleId = id as Id<"sales">;
  
  const sale = useQuery(api.sales.sales.get, { id: saleId });

  if (sale === undefined) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-slate-500">Loading...</div>
        </div>
      </div>
    );
  }

  if (sale === null) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-slate-500">Penjualan tidak ditemukan</div>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Draft":
        return <Badge variant="secondary">Draft</Badge>;
      case "Completed":
        return <Badge className="bg-green-500">Completed</Badge>;
      case "Cancelled":
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case "CASH":
        return <Banknote className="h-4 w-4" />;
      case "QRIS":
        return <Smartphone className="h-4 w-4" />;
      case "CREDIT":
        return <CreditCard className="h-4 w-4" />;
      default:
        return <CreditCard className="h-4 w-4" />;
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      CASH: "Tunai",
      QRIS: "QRIS",
      CREDIT: "Kredit",
      BANK_TRANSFER: "Transfer Bank",
      DEBIT_CARD: "Kartu Debit",
    };
    return labels[method] || method;
  };

  const calculateProfit = () => {
    if (!sale.items) return 0;
    return sale.items.reduce((sum, item) => {
      const revenue = item.subtotal;
      const cost = item.cogs || 0;
      return sum + (revenue - cost);
    }, 0);
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => router.push("/dashboard/sales")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Kembali ke Daftar Penjualan
        </Button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              {sale.saleNumber}
            </h1>
            <p className="text-slate-500 mt-1">
              {formatDateTime(sale.saleDate)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {getStatusBadge(sale.status)}
            <Button variant="outline" className="gap-2">
              <Printer className="h-4 w-4" />
              Cetak
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer & Branch Info */}
          <Card>
            <CardHeader>
              <CardTitle>Informasi Transaksi</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-slate-500">Customer</label>
                  <p className="font-medium">{sale.customer?.name || "-"}</p>
                  {sale.customer?.phone && (
                    <p className="text-sm text-slate-500">{sale.customer.phone}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm text-slate-500">Cabang</label>
                  <p className="font-medium">{sale.branch?.name || "-"}</p>
                  {sale.branch?.address && (
                    <p className="text-sm text-slate-500">{sale.branch.address}</p>
                  )}
                </div>
                {sale.notes && (
                  <div className="col-span-2">
                    <label className="text-sm text-slate-500">Catatan</label>
                    <p className="font-medium">{sale.notes}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Items */}
          <Card>
            <CardHeader>
              <CardTitle>Daftar Item</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produk</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Harga</TableHead>
                    <TableHead className="text-right">Diskon</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                    {sale.status === "Completed" && (
                      <TableHead className="text-right">COGS</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sale.items && sale.items.length > 0 ? (
                    sale.items.map((item) => (
                      <TableRow key={item._id}>
                        <TableCell>
                          <div className="font-medium">{item.product?.name || "-"}</div>
                          {item.variant && (
                            <div className="text-sm text-slate-500">
                              {item.variant.variantName}: {item.variant.variantValue}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.unitPrice)}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.discountAmount > 0 ? (
                            <span className="text-orange-600">
                              {item.discountType === "percent"
                                ? `${item.discountAmount}%`
                                : formatCurrency(item.discountAmount)}
                            </span>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(item.subtotal)}
                        </TableCell>
                        {sale.status === "Completed" && (
                          <TableCell className="text-right text-slate-500">
                            {formatCurrency(item.cogs || 0)}
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={sale.status === "Completed" ? 6 : 5}
                        className="text-center py-8 text-slate-500"
                      >
                        Tidak ada item
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Payments */}
          {sale.payments && sale.payments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Riwayat Pembayaran</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Metode</TableHead>
                      <TableHead>Referensi</TableHead>
                      <TableHead className="text-right">Jumlah</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sale.payments.map((payment) => (
                      <TableRow key={payment._id}>
                        <TableCell>
                          {formatDateTime(payment.paymentDate)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getPaymentMethodIcon(payment.paymentMethod)}
                            {getPaymentMethodLabel(payment.paymentMethod)}
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-500">
                          {payment.referenceNumber || "-"}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(payment.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Summary */}
        <div className="space-y-6">
          {/* Financial Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Ringkasan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Subtotal:</span>
                  <span className="font-medium">
                    {formatCurrency(sale.subtotal)}
                  </span>
                </div>

                {sale.discountAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">
                      Diskon Transaksi
                      {sale.discountType === "percent" && ` (${sale.discountAmount}%)`}:
                    </span>
                    <span className="text-orange-600 font-medium">
                      -{formatCurrency(
                        sale.discountType === "percent"
                          ? sale.subtotal * sale.discountAmount / 100
                          : sale.discountAmount
                      )}
                    </span>
                  </div>
                )}

                {sale.taxAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">
                      Pajak ({sale.taxRate}%):
                    </span>
                    <span className="font-medium">
                      {formatCurrency(sale.taxAmount)}
                    </span>
                  </div>
                )}

                <div className="pt-3 border-t">
                  <div className="flex justify-between">
                    <span className="font-semibold">Total:</span>
                    <span className="font-bold text-lg">
                      {formatCurrency(sale.totalAmount)}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Dibayar:</span>
                  <span className="font-medium text-green-600">
                    {formatCurrency(sale.paidAmount)}
                  </span>
                </div>

                {sale.outstandingAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Sisa Tagihan:</span>
                    <span className="font-medium text-orange-600">
                      {formatCurrency(sale.outstandingAmount)}
                    </span>
                  </div>
                )}

                {sale.status === "Completed" && sale.items && (
                  <>
                    <div className="pt-3 border-t">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Total COGS:</span>
                        <span className="font-medium">
                          {formatCurrency(
                            sale.items.reduce((sum, item) => sum + (item.cogs || 0), 0)
                          )}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold text-blue-600">Profit:</span>
                      <span className="font-bold text-blue-600">
                        {formatCurrency(calculateProfit())}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Status Info */}
          <Card>
            <CardHeader>
              <CardTitle>Status Pembayaran</CardTitle>
            </CardHeader>
            <CardContent>
              {sale.outstandingAmount > 0 ? (
                <div className="text-center py-4">
                  <div className="text-orange-600 font-semibold text-lg mb-2">
                    Belum Lunas
                  </div>
                  <div className="text-sm text-slate-500">
                    Sisa tagihan: {formatCurrency(sale.outstandingAmount)}
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <div className="text-green-600 font-semibold text-lg mb-2">
                    Lunas
                  </div>
                  <div className="text-sm text-slate-500">
                    Semua pembayaran telah diterima
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

