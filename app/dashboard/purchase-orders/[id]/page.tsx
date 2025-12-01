"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Package, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useRouter } from "next/navigation";
import Link from "next/link";

type ReceiveItem = {
  itemId: Id<"purchaseOrderItems">;
  receivedQuantity: number;
  batchNumber?: string;
  expiredDate?: string;
};

type ReceivingItemState = {
  quantity: number;
  batchNumber: string;
  expiredDate: string;
};

export default function PurchaseOrderDetailPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const router = useRouter();
  const [poId, setPoId] = useState<Id<"purchaseOrders"> | null>(null);

  const [isReceiveDialogOpen, setIsReceiveDialogOpen] = useState(false);

  const [receivingItems, setReceivingItems] = useState<Record<string, ReceivingItemState>>({});

  // Payment State for Receiving
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [paymentRef, setPaymentRef] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [dueDate, setDueDate] = useState<number | undefined>(undefined);

  // Resolve params Promise
  useState(() => {
    params.then((resolvedParams) => {
      setPoId(resolvedParams.id as Id<"purchaseOrders">);
    });
  });

  const po = useQuery(
    api.procurement.purchaseOrders.get,
    poId ? { id: poId } : "skip"
  );
  const receivePO = useMutation(api.procurement.purchaseOrders.receive);
  const submitPO = useMutation(api.procurement.purchaseOrders.submit);
  const cancelPO = useMutation(api.procurement.purchaseOrders.cancel);

  if (!poId || po === undefined) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <p className="text-slate-500">Memuat data...</p>
        </div>
      </div>
    );
  }

  if (po === null) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <p className="text-slate-500">Purchase Order tidak ditemukan</p>
          <Button onClick={() => router.push("/dashboard/purchase-orders")} className="mt-4">
            Kembali ke Daftar PO
          </Button>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Draft":
        return <Badge variant="secondary">Draft</Badge>;
      case "Submitted":
        return <Badge className="bg-blue-500">Submitted</Badge>;
      case "Received":
        return <Badge className="bg-green-500">Received</Badge>;
      case "Cancelled":
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const handleOpenReceiveDialog = () => {
    // Initialize with remaining quantities
    const initialReceiving: Record<string, ReceivingItemState> = {};
    po.items.forEach((item: any) => {
      const remaining = item.quantity - item.receivedQuantity;
      if (remaining > 0) {
        initialReceiving[item._id] = {
          quantity: remaining,
          batchNumber: "",
          expiredDate: "",
        };
      }
    });
    setReceivingItems(initialReceiving);

    // Calculate estimated total for default payment
    const estimatedTotal = po.items.reduce((sum: number, item: any) => {
      const remaining = item.quantity - item.receivedQuantity;
      if (remaining <= 0) return sum;
      // Simple calculation: (price * qty) - discount + tax
      // Note: This assumes discount/tax are per unit or proportional. 
      // If they are fixed amounts for the whole line, this logic might need adjustment.
      // For now, let's assume unitPrice is net or we just use unitPrice * qty.
      // Ideally, we should use the item's subtotal / quantity * remaining.
      const unitCost = item.subtotal / item.quantity;
      return sum + (unitCost * remaining);
    }, 0);

    setPaymentAmount(estimatedTotal);
    setPaymentMethod("CASH");
    setPaymentRef("");
    setPaymentNotes("");
    setDueDate(undefined);
    setIsReceiveDialogOpen(true);
  };

  const handleReceive = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!poId) return;

    const receivedItems: ReceiveItem[] = Object.entries(receivingItems)
      .filter(([_, state]) => state.quantity > 0)
      .map(([itemId, state]) => ({
        itemId: itemId as Id<"purchaseOrderItems">,
        receivedQuantity: state.quantity,
        batchNumber: state.batchNumber || undefined,
        expiredDate: state.expiredDate || undefined,
      }));

    if (receivedItems.length === 0) {
      toast.error("Tidak ada item untuk diterima");
      return;
    }

    try {
      const result = await receivePO({
        purchaseOrderId: poId,
        items: receivedItems,
        payments: paymentAmount > 0 ? [{
          amount: paymentAmount,
          paymentMethod,
          referenceNumber: paymentRef || undefined,
          notes: paymentNotes || undefined,
        }] : [],
        dueDate,
      });

      toast.success(
        result.status === "Received"
          ? "Semua barang berhasil diterima"
          : "Sebagian barang berhasil diterima"
      );
      setIsReceiveDialogOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Terjadi kesalahan");
    }
  };

  const handleSubmitPO = async () => {
    if (!poId) return;
    if (confirm("Submit Purchase Order ini? Status akan berubah menjadi Submitted.")) {
      try {
        await submitPO({ purchaseOrderId: poId });
        toast.success("PO berhasil di-submit");
      } catch (error: any) {
        toast.error(error.message || "Terjadi kesalahan");
      }
    }
  };

  const handleCancelPO = async () => {
    if (!poId) return;
    if (confirm("Cancel Purchase Order ini?")) {
      try {
        await cancelPO({ purchaseOrderId: poId });
        toast.success("PO berhasil dibatalkan");
      } catch (error: any) {
        toast.error(error.message || "Terjadi kesalahan");
      }
    }
  };

  const totalReceived = po.items.reduce((sum: number, item: any) => sum + item.receivedQuantity, 0);
  const totalOrdered = po.items.reduce((sum: number, item: any) => sum + item.quantity, 0);
  const isFullyReceived = totalReceived === totalOrdered;

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link href="/dashboard/purchase-orders">
          <Button variant="ghost" className="gap-2 mb-4">
            <ArrowLeft className="h-4 w-4" />
            Kembali
          </Button>
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{po.poNumber}</h1>
            <p className="text-slate-500 mt-1">Detail Purchase Order</p>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(po.status)}
            {po.status === "Draft" && (
              <Button onClick={handleSubmitPO} className="gap-2">
                Submit PO
              </Button>
            )}
            {po.status === "Submitted" && (
              <>
                <Button onClick={handleOpenReceiveDialog} className="gap-2 bg-green-600 hover:bg-green-700">
                  <CheckCircle className="h-4 w-4" />
                  Terima Barang
                </Button>
                <Button onClick={handleCancelPO} variant="destructive" className="gap-2">
                  <XCircle className="h-4 w-4" />
                  Cancel
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">Supplier</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">{po.supplier?.name}</p>
            <p className="text-sm text-slate-500">{po.supplier?.phone}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">Cabang Tujuan</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">{po.branch?.name}</p>
            <p className="text-sm text-slate-500">{po.branch?.city}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">Total Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(po.totalAmount)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-slate-500">Tanggal Order:</span>
                <span className="font-medium">{formatDate(po.orderDate)}</span>
              </div>
              {po.expectedDeliveryDate && (
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Estimasi Pengiriman:</span>
                  <span className="font-medium">{formatDate(po.expectedDeliveryDate)}</span>
                </div>
              )}
              {po.notes && (
                <div className="pt-2 border-t">
                  <span className="text-sm text-slate-500">Catatan:</span>
                  <p className="text-sm mt-1">{po.notes}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-slate-500">Total Items:</span>
                <span className="font-medium">{po.items.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-500">Total Ordered:</span>
                <span className="font-medium">{totalOrdered}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-500">Total Received:</span>
                <span className="font-medium text-green-600">{totalReceived}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-sm text-slate-500">Progress:</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 transition-all"
                      style={{ width: `${(totalReceived / totalOrdered) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium">
                    {Math.round((totalReceived / totalOrdered) * 100)}%
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Item Purchase Order</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produk</TableHead>
                <TableHead>Varian</TableHead>
                <TableHead className="text-right">Harga Satuan</TableHead>
                <TableHead className="text-right">Qty Order</TableHead>
                <TableHead className="text-right">Qty Diterima</TableHead>
                <TableHead className="text-right">Sisa</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {po.items.map((item: any) => {
                const remaining = item.quantity - item.receivedQuantity;
                return (
                  <TableRow key={item._id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-slate-400" />
                        <div>
                          <p className="font-medium">{item.product?.name}</p>
                          <p className="text-xs text-slate-500">{item.product?.sku}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {item.variant
                        ? `${item.variant.variantName}: ${item.variant.variantValue}`
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                    <TableCell className="text-right font-medium">{item.quantity}</TableCell>
                    <TableCell className="text-right text-green-600 font-medium">
                      {item.receivedQuantity}
                    </TableCell>
                    <TableCell className="text-right">
                      {remaining > 0 ? (
                        <Badge variant="secondary">{remaining}</Badge>
                      ) : (
                        <Badge className="bg-green-500">✓ Complete</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(item.subtotal)}
                    </TableCell>
                  </TableRow>
                );
              })}
              <TableRow>
                <TableCell colSpan={6} className="text-right font-bold">
                  Total:
                </TableCell>
                <TableCell className="text-right font-bold text-green-600">
                  {formatCurrency(po.totalAmount)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Receive Dialog */}
      <Dialog open={isReceiveDialogOpen} onOpenChange={setIsReceiveDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <form onSubmit={handleReceive}>
            <DialogHeader>
              <DialogTitle>Terima Barang</DialogTitle>
              <DialogDescription>
                Masukkan jumlah barang yang diterima untuk setiap item
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 max-h-[60vh] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produk</TableHead>
                    <TableHead className="text-right">Sisa</TableHead>
                    <TableHead className="text-right">Terima</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {po.items
                    .filter((item: any) => item.quantity > item.receivedQuantity)
                    .map((item: any) => {
                      const remaining = item.quantity - item.receivedQuantity;
                      return (
                        <TableRow key={item._id}>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{item.product?.name}</p>
                              {item.variant && (
                                <p className="text-xs text-slate-500">
                                  {item.variant.variantName}: {item.variant.variantValue}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant="secondary">{remaining}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex flex-col gap-2 items-end">
                              <Input
                                type="number"
                                min="0"
                                max={remaining}
                                value={receivingItems[item._id]?.quantity || 0}
                                onChange={(e) =>
                                  setReceivingItems({
                                    ...receivingItems,
                                    [item._id]: {
                                      ...receivingItems[item._id],
                                      quantity: parseFloat(e.target.value) || 0,
                                    },
                                  })
                                }
                                className="w-20 text-right"
                              />
                              {item.product?.hasExpiry && receivingItems[item._id]?.quantity > 0 && (
                                <div className="flex flex-col gap-2 mt-1 w-48">
                                  <Input
                                    placeholder="Batch No"
                                    value={receivingItems[item._id]?.batchNumber || ""}
                                    onChange={(e) =>
                                      setReceivingItems({
                                        ...receivingItems,
                                        [item._id]: {
                                          ...receivingItems[item._id],
                                          batchNumber: e.target.value,
                                        },
                                      })
                                    }
                                    className="text-xs h-8"
                                    required
                                  />
                                  <Input
                                    type="date"
                                    value={receivingItems[item._id]?.expiredDate || ""}
                                    onChange={(e) =>
                                      setReceivingItems({
                                        ...receivingItems,
                                        [item._id]: {
                                          ...receivingItems[item._id],
                                          expiredDate: e.target.value,
                                        },
                                      })
                                    }
                                    className="text-xs h-8"
                                    required
                                  />
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </div>

            <div className="py-4 border-t border-border space-y-4">
              <h3 className="font-medium">Pembayaran (Opsional)</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Metode Pembayaran</Label>
                  <select
                    className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  >
                    <option value="CASH">Tunai</option>
                    <option value="BANK_TRANSFER">Transfer Bank</option>
                    <option value="CREDIT">Kredit (Hutang)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Jumlah Bayar</Label>
                  <Input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>

              {paymentMethod !== "CASH" && (
                <div className="space-y-2">
                  <Label>No. Referensi / Catatan</Label>
                  <Input
                    value={paymentRef}
                    onChange={(e) => setPaymentRef(e.target.value)}
                    placeholder="Contoh: No. Transfer / No. Invoice Supplier"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Jatuh Tempo (Jika Kredit)</Label>
                <Input
                  type="date"
                  value={dueDate ? new Date(dueDate).toISOString().split('T')[0] : ""}
                  onChange={(e) => setDueDate(e.target.value ? new Date(e.target.value).getTime() : undefined)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsReceiveDialogOpen(false)}
              >
                Batal
              </Button>
              <Button type="submit" className="bg-green-600 hover:bg-green-700">
                Terima Barang
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div >
  );
}

