"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
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
import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  ArrowLeft,
  Printer,
  Ban,
  Edit,
  CreditCard,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function SaleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const saleId = params.id as string;

  // Helper to check if string looks like a valid ID (prevent "page", "create" etc)
  const isValidId = saleId && saleId !== "page" && saleId !== "create" && saleId.length > 8;

  const sale = useQuery(api.sales.sales.get, isValidId ? { id: saleId as Id<"sales"> } : "skip");
  const cancelSale = useMutation(api.sales.sales.cancel);

  if (!isValidId) {
    return null; // Or redirect to list
  }

  if (sale === undefined) {
    return <div className="p-8 text-center text-slate-500">Memuat data transaksi...</div>;
  }

  if (sale === null) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold text-red-600">Transaksi tidak ditemukan</h2>
        <Button variant="outline" onClick={() => router.back()} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Kembali
        </Button>
      </div>
    );
  }

  const handleCancel = async () => {
    try {
      await cancelSale({ saleId });
      toast.success("Transaksi berhasil dibatalkan");
    } catch (error: any) {
      toast.error("Gagal membatalkan transaksi: " + error.message);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header Actions */}
      <div className="flex items-center justify-between print:hidden">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Kembali
        </Button>
        <div className="flex gap-2">
          {sale.status === "Draft" && (
            <Button variant="outline" onClick={() => router.push(`/dashboard/sales/create?edit=${sale._id}`)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" />
            Cetak Invoice
          </Button>
          {sale.status !== "Cancelled" && sale.status !== "Completed" && (
             <AlertDialog>
             <AlertDialogTrigger asChild>
               <Button variant="destructive">
                 <Ban className="h-4 w-4 mr-2" />
                 Batalkan
               </Button>
             </AlertDialogTrigger>
             <AlertDialogContent>
               <AlertDialogHeader>
                 <AlertDialogTitle>Batalkan Transaksi?</AlertDialogTitle>
                 <AlertDialogDescription>
                   Tindakan ini tidak dapat dibatalkan. Transaksi akan ditandai sebagai batal.
                 </AlertDialogDescription>
               </AlertDialogHeader>
               <AlertDialogFooter>
                 <AlertDialogCancel>Batal</AlertDialogCancel>
                 <AlertDialogAction onClick={handleCancel} className="bg-red-600 hover:bg-red-700">
                   Ya, Batalkan
                 </AlertDialogAction>
               </AlertDialogFooter>
             </AlertDialogContent>
           </AlertDialog>
          )}
        </div>
      </div>

      {/* Invoice Content */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden print:shadow-none print:border-none">
        {/* Header Section */}
        <div className="p-8 border-b border-slate-100">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Invoice</h1>
              <p className="text-slate-500 mt-1">#{sale.saleNumber}</p>
              <div className="mt-4 space-y-1 text-sm">
                <div className="flex gap-2">
                  <span className="text-slate-500 w-24">Tanggal:</span>
                  <span className="font-medium">{formatDate(sale.saleDate)}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-slate-500 w-24">Status:</span>
                  <Badge variant={sale.status === "Completed" ? "default" : sale.status === "Cancelled" ? "destructive" : "secondary"}>
                    {sale.status}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <span className="text-slate-500 w-24">Kasir:</span>
                  <span>-</span> {/* TODO: Add user info */}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-bold text-xl text-blue-600">PetShop</div>
              <div className="text-sm text-slate-500 mt-1 max-w-[200px]">
                {sale.branch?.address || "Alamat Cabang"}
              </div>
              <div className="text-sm text-slate-500">
                {sale.branch?.phone}
              </div>
            </div>
          </div>
        </div>

        {/* Customer Section */}
        <div className="p-8 bg-slate-50/50 border-b border-slate-100 flex flex-col md:flex-row gap-8">
          <div className="flex-1">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Bill To</h3>
            <div className="font-medium text-slate-900">{sale.customer?.name}</div>
            <div className="text-sm text-slate-500 mt-1">{sale.customer?.address || "-"}</div>
            <div className="text-sm text-slate-500 mt-1">{sale.customer?.phone || "-"}</div>
          </div>
          <div className="flex-1">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Payment Details</h3>
             {/* Payment Summary */}
             <div className="space-y-1 text-sm">
               {sale.payments?.map((p: any, i: number) => (
                 <div key={i} className="flex justify-between border-b border-slate-200/50 pb-1 mb-1 last:border-0">
                    <span>{p.paymentMethod}</span>
                    <span className="font-medium">{formatCurrency(p.amount)}</span>
                 </div>
               ))}
               {(!sale.payments || sale.payments.length === 0) && (
                 <div className="text-slate-400 italic">Belum ada pembayaran</div>
               )}
             </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="pl-8">Produk</TableHead>
                <TableHead className="text-right">Harga</TableHead>
                <TableHead className="text-center">Qty</TableHead>
                <TableHead className="text-right">Diskon</TableHead>
                <TableHead className="text-right pr-8">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sale.items?.map((item: any) => (
                <TableRow key={item._id}>
                  <TableCell className="pl-8">
                    <div className="font-medium">{item.product?.name}</div>
                    {item.variant && (
                      <div className="text-xs text-slate-500">
                        {item.variant.variantName}: {item.variant.variantValue}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(item.unitPrice)}
                  </TableCell>
                  <TableCell className="text-center">
                    {item.quantity}
                  </TableCell>
                  <TableCell className="text-right text-red-500">
                    {item.discountAmount > 0 && (
                      <>
                        -{formatCurrency(item.discountType === "percent" 
                          ? (item.unitPrice * item.quantity * (item.discountAmount/100)) 
                          : item.discountAmount)}
                      </>
                    )}
                  </TableCell>
                  <TableCell className="text-right pr-8 font-medium">
                    {formatCurrency(item.subtotal)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Totals */}
        <div className="p-8 border-t border-slate-100">
          <div className="flex flex-col items-end space-y-2">
            <div className="flex justify-between w-full md:w-1/3 text-sm">
              <span className="text-slate-500">Subtotal</span>
              <span>{formatCurrency(sale.subtotal)}</span>
            </div>
            {sale.discountAmount > 0 && (
              <div className="flex justify-between w-full md:w-1/3 text-sm text-red-500">
                <span>Diskon {sale.discountType === "percent" ? `(${sale.discountAmount}%)` : ""}</span>
                <span>-{formatCurrency(sale.discountType === "percent" ? (sale.subtotal * sale.discountAmount / 100) : sale.discountAmount)}</span>
              </div>
            )}
             {sale.taxAmount > 0 && (
              <div className="flex justify-between w-full md:w-1/3 text-sm">
                <span className="text-slate-500">Pajak ({sale.taxRate}%)</span>
                <span>{formatCurrency(sale.taxAmount)}</span>
              </div>
            )}
            <Separator className="w-full md:w-1/3 my-2" />
            <div className="flex justify-between w-full md:w-1/3 text-lg font-bold">
              <span>Total</span>
              <span className="text-blue-600">{formatCurrency(sale.totalAmount)}</span>
            </div>
            <div className="flex justify-between w-full md:w-1/3 text-sm pt-2">
              <span className="text-slate-500">Dibayar</span>
              <span>{formatCurrency(sale.paidAmount)}</span>
            </div>
             <div className="flex justify-between w-full md:w-1/3 text-sm font-medium">
              <span>{sale.outstandingAmount > 0 ? "Sisa Tagihan" : "Kembalian"}</span>
              <span className={sale.outstandingAmount > 0 ? "text-red-600" : "text-green-600"}>
                {formatCurrency(sale.outstandingAmount > 0 ? sale.outstandingAmount : (sale.paidAmount - sale.totalAmount))}
              </span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {sale.notes && (
          <div className="p-8 bg-slate-50 border-t border-slate-100">
             <h4 className="text-sm font-medium text-slate-900 mb-1">Catatan</h4>
             <p className="text-sm text-slate-500">{sale.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}