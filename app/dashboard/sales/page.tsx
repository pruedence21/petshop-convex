"use client";

import { useState, useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Search, ShoppingCart, Eye, CreditCard, Banknote, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { useRouter } from "next/navigation";

type SaleItem = {
  productId: Id<"products">;
  variantId?: Id<"productVariants">;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  discountType: "percent" | "nominal";
  notes?: string;
};

type PaymentItem = {
  amount: number;
  paymentMethod: "CASH" | "QRIS" | "CREDIT" | "BANK_TRANSFER" | "DEBIT_CARD";
  referenceNumber?: string;
  notes?: string;
};

export default function SalesPage() {
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedBranch, setSelectedBranch] = useState<Id<"branches"> | "all">("all");
  const [currentSaleId, setCurrentSaleId] = useState<Id<"sales"> | null>(null);
  
  const [formData, setFormData] = useState({
    customerId: "",
    branchId: "",
    saleDate: new Date().toISOString().slice(0, 10),
    notes: "",
    discountAmount: 0,
    discountType: "nominal" as "percent" | "nominal",
    taxRate: 0,
  });

  const [items, setItems] = useState<SaleItem[]>([]);
  const [currentItem, setCurrentItem] = useState<SaleItem>({
    productId: "" as Id<"products">,
    variantId: undefined,
    quantity: 1,
    unitPrice: 0,
    discountAmount: 0,
    discountType: "nominal",
    notes: "",
  });

  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [currentPayment, setCurrentPayment] = useState<PaymentItem>({
    amount: 0,
    paymentMethod: "CASH",
    referenceNumber: "",
    notes: "",
  });

  const sales = useQuery(api.sales.list, {
    status: selectedStatus !== "all" ? selectedStatus : undefined,
    branchId: selectedBranch !== "all" ? selectedBranch : undefined,
  });
  const customers = useQuery(api.customers.list, { includeInactive: false });
  const umumCustomer = useQuery(api.customers.getOrCreateDefault, {});
  const branches = useQuery(api.branches.list, { includeInactive: false });
  const products = useQuery(api.products.list, { includeInactive: false });
  const variants = useQuery(
    api.productVariants.listByProduct,
    currentItem.productId && currentItem.productId !== ("" as Id<"products">)
      ? { productId: currentItem.productId, includeInactive: false }
      : "skip"
  );

  const createSale = useMutation(api.sales.create);
  const addItem = useMutation(api.sales.addItem);
  const updateDiscountAndTax = useMutation(api.sales.updateDiscountAndTax);
  const submitSale = useMutation(api.sales.submitSale);
  const cancelSale = useMutation(api.sales.cancel);
  const deleteSale = useMutation(api.sales.remove);
  const createDefaultCustomer = useMutation(api.customers.createDefaultCustomer);

  // Auto-seed UMUM customer if not exists
  useEffect(() => {
    if (customers !== undefined && umumCustomer === null) {
      // UMUM customer doesn't exist, create it
      createDefaultCustomer({})
        .then((result) => {
          console.log("Default customer created:", result.message);
        })
        .catch((error) => {
          console.error("Failed to create default customer:", error);
        });
    }
  }, [customers, umumCustomer, createDefaultCustomer]);

  // Auto-select UMUM customer if available
  useEffect(() => {
    if (umumCustomer && !formData.customerId) {
      setFormData(prev => ({ ...prev, customerId: umumCustomer._id }));
    }
  }, [umumCustomer]);

  // Auto-fill price when product/variant selected
  useEffect(() => {
    if (currentItem.productId && currentItem.productId !== ("" as Id<"products">)) {
      const product = products?.find((p) => p._id === currentItem.productId);
      
      if (currentItem.variantId) {
        const variant = variants?.find((v) => v._id === currentItem.variantId);
        if (variant) {
          setCurrentItem(prev => ({ ...prev, unitPrice: variant.sellingPrice }));
        }
      } else if (product) {
        setCurrentItem(prev => ({ ...prev, unitPrice: product.sellingPrice }));
      }
    }
  }, [currentItem.productId, currentItem.variantId, products, variants]);

  const filteredSales = sales?.filter((sale) =>
    sale.saleNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sale.customer?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenDialog = () => {
    setFormData({
      customerId: umumCustomer?._id || "",
      branchId: "",
      saleDate: new Date().toISOString().slice(0, 10),
      notes: "",
      discountAmount: 0,
      discountType: "nominal",
      taxRate: 0,
    });
    setItems([]);
    setCurrentItem({
      productId: "" as Id<"products">,
      variantId: undefined,
      quantity: 1,
      unitPrice: 0,
      discountAmount: 0,
      discountType: "nominal",
      notes: "",
    });
    setPayments([]);
    setCurrentPayment({
      amount: 0,
      paymentMethod: "CASH",
      referenceNumber: "",
      notes: "",
    });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
  };

  const handleAddItem = () => {
    if (!currentItem.productId || currentItem.productId === ("" as Id<"products">)) {
      toast.error("Pilih produk terlebih dahulu");
      return;
    }

    const product = products?.find((p) => p._id === currentItem.productId);
    if (product?.hasVariants && !currentItem.variantId) {
      toast.error("Pilih varian produk");
      return;
    }

    if (currentItem.quantity <= 0) {
      toast.error("Jumlah harus lebih dari 0");
      return;
    }

    if (currentItem.unitPrice <= 0) {
      toast.error("Harga harus lebih dari 0");
      return;
    }

    setItems([...items, { ...currentItem }]);
    setCurrentItem({
      productId: "" as Id<"products">,
      variantId: undefined,
      quantity: 1,
      unitPrice: 0,
      discountAmount: 0,
      discountType: "nominal",
      notes: "",
    });
    toast.success("Item ditambahkan");
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
    toast.success("Item dihapus");
  };

  const calculateItemSubtotal = (item: SaleItem) => {
    const baseAmount = item.quantity * item.unitPrice;
    
    if (item.discountType === "percent") {
      return baseAmount - (baseAmount * item.discountAmount / 100);
    } else {
      return baseAmount - item.discountAmount;
    }
  };

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + calculateItemSubtotal(item), 0);
  };

  const calculateTransactionDiscount = () => {
    const subtotal = calculateSubtotal();
    
    if (formData.discountType === "percent") {
      return subtotal * formData.discountAmount / 100;
    } else {
      return formData.discountAmount;
    }
  };

  const calculateTax = () => {
    const subtotal = calculateSubtotal();
    const discount = calculateTransactionDiscount();
    const afterDiscount = subtotal - discount;
    
    return formData.taxRate > 0 ? afterDiscount * formData.taxRate / 100 : 0;
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const discount = calculateTransactionDiscount();
    const tax = calculateTax();
    
    return subtotal - discount + tax;
  };

  const handleAddPayment = () => {
    if (currentPayment.amount <= 0) {
      toast.error("Jumlah pembayaran harus lebih dari 0");
      return;
    }

    if (currentPayment.paymentMethod === "QRIS" && !currentPayment.referenceNumber) {
      toast.error("Masukkan nomor referensi QRIS");
      return;
    }

    setPayments([...payments, { ...currentPayment }]);
    setCurrentPayment({
      amount: 0,
      paymentMethod: "CASH",
      referenceNumber: "",
      notes: "",
    });
    toast.success("Pembayaran ditambahkan");
  };

  const handleRemovePayment = (index: number) => {
    setPayments(payments.filter((_, i) => i !== index));
    toast.success("Pembayaran dihapus");
  };

  const calculateTotalPayments = () => {
    return payments.reduce((sum, payment) => sum + payment.amount, 0);
  };

  const calculateChange = () => {
    const total = calculateTotal();
    const paid = calculateTotalPayments();
    return Math.max(0, paid - total);
  };

  const calculateOutstanding = () => {
    const total = calculateTotal();
    const paid = calculateTotalPayments();
    return Math.max(0, total - paid);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.customerId || !formData.branchId) {
      toast.error("Mohon lengkapi semua field yang wajib");
      return;
    }

    if (items.length === 0) {
      toast.error("Tambahkan minimal 1 item");
      return;
    }

    try {
      // Create Sale
      const result = await createSale({
        customerId: formData.customerId as Id<"customers">,
        branchId: formData.branchId as Id<"branches">,
        saleDate: new Date(formData.saleDate).getTime(),
        notes: formData.notes || undefined,
      });

      // Add items
      for (const item of items) {
        await addItem({
          saleId: result.saleId,
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountAmount: item.discountAmount,
          discountType: item.discountType,
          notes: item.notes,
        });
      }

      // Update transaction discount and tax
      await updateDiscountAndTax({
        saleId: result.saleId,
        discountAmount: formData.discountAmount,
        discountType: formData.discountType,
        taxRate: formData.taxRate,
      });

      setCurrentSaleId(result.saleId);
      handleCloseDialog();
      setIsPaymentDialogOpen(true);
      
      toast.success(`Penjualan ${result.saleNumber} berhasil dibuat`);
    } catch (error: any) {
      toast.error(error.message || "Terjadi kesalahan");
      console.error(error);
    }
  };

  const handleSubmitSale = async () => {
    if (!currentSaleId) return;

    if (payments.length === 0) {
      toast.error("Tambahkan minimal 1 metode pembayaran");
      return;
    }

    try {
      const result = await submitSale({
        saleId: currentSaleId,
        payments: payments.map(p => ({
          amount: p.amount,
          paymentMethod: p.paymentMethod,
          referenceNumber: p.referenceNumber || undefined,
          notes: p.notes || undefined,
        })),
      });

      setIsPaymentDialogOpen(false);
      setCurrentSaleId(null);
      setPayments([]);

      // Show success message with change if any
      if (result.change > 0) {
        toast.success(
          `Penjualan berhasil! Kembalian: ${formatCurrency(result.change)}`
        );
      } else if (result.outstandingAmount > 0) {
        toast.success(
          `Penjualan berhasil! Sisa tagihan: ${formatCurrency(result.outstandingAmount)}`
        );
      } else {
        toast.success("Penjualan berhasil!");
      }
    } catch (error: any) {
      toast.error(error.message || "Terjadi kesalahan");
    }
  };

  const handleCancelSale = async (saleId: Id<"sales">) => {
    if (confirm("Cancel penjualan ini?")) {
      try {
        await cancelSale({ saleId });
        toast.success("Penjualan berhasil dibatalkan");
      } catch (error: any) {
        toast.error(error.message || "Terjadi kesalahan");
      }
    }
  };

  const handleDeleteSale = async (saleId: Id<"sales">) => {
    if (confirm("Hapus penjualan ini? Hanya penjualan Draft atau Cancelled yang bisa dihapus.")) {
      try {
        await deleteSale({ id: saleId });
        toast.success("Penjualan berhasil dihapus");
      } catch (error: any) {
        toast.error(error.message || "Terjadi kesalahan");
      }
    }
  };

  const getProductName = (productId: Id<"products">) => {
    return products?.find((p) => p._id === productId)?.name || "-";
  };

  const getVariantName = (variantId?: Id<"productVariants">) => {
    if (!variantId) return "";
    const variant = variants?.find((v) => v._id === variantId);
    return variant ? `${variant.variantName}: ${variant.variantValue}` : "";
  };

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

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Penjualan</h1>
        <p className="text-slate-500 mt-1">Kelola transaksi penjualan</p>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1">
              <div className="flex-1 max-w-sm relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Cari penjualan..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select
                value={selectedStatus}
                onValueChange={setSelectedStatus}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Semua Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={selectedBranch === "all" ? "all" : selectedBranch}
                onValueChange={(value) =>
                  setSelectedBranch(value === "all" ? "all" : value as Id<"branches">)
                }
              >
                <SelectTrigger className="w-48">
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
            <Button onClick={handleOpenDialog} className="gap-2">
              <Plus className="h-4 w-4" />
              Transaksi Baru
            </Button>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>No. Invoice</TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Cabang</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Dibayar</TableHead>
              <TableHead>Sisa</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSales === undefined ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : filteredSales.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-slate-500">
                  Tidak ada data penjualan
                </TableCell>
              </TableRow>
            ) : (
              filteredSales.map((sale) => (
                <TableRow key={sale._id}>
                  <TableCell className="font-medium">{sale.saleNumber}</TableCell>
                  <TableCell>{formatDate(sale.saleDate)}</TableCell>
                  <TableCell>{sale.customer?.name || "-"}</TableCell>
                  <TableCell>{sale.branch?.name || "-"}</TableCell>
                  <TableCell>{formatCurrency(sale.totalAmount)}</TableCell>
                  <TableCell>{formatCurrency(sale.paidAmount)}</TableCell>
                  <TableCell>
                    {sale.outstandingAmount > 0 ? (
                      <span className="text-orange-600 font-medium">
                        {formatCurrency(sale.outstandingAmount)}
                      </span>
                    ) : (
                      <span className="text-green-600">Lunas</span>
                    )}
                  </TableCell>
                  <TableCell>{sale.itemCount} item</TableCell>
                  <TableCell>{getStatusBadge(sale.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/dashboard/sales/${sale._id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {sale.status === "Draft" && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCancelSale(sale._id)}
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteSale(sale._id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create Sale Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="!max-w-[95vw] w-4xl !max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Transaksi Penjualan Baru</DialogTitle>
            <DialogDescription>
              Isi informasi transaksi dan tambahkan item yang dijual
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="grid gap-6">
              {/* Header Information */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customer">
                    Customer <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.customerId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, customerId: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers?.map((customer) => (
                        <SelectItem key={customer._id} value={customer._id}>
                          {customer.name} {customer.code === "UMUM" && "(Walk-in)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="branch">
                    Cabang <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.branchId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, branchId: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih cabang" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches?.map((branch) => (
                        <SelectItem key={branch._id} value={branch._id}>
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="saleDate">Tanggal Penjualan</Label>
                  <Input
                    type="date"
                    value={formData.saleDate}
                    onChange={(e) =>
                      setFormData({ ...formData, saleDate: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Catatan</Label>
                  <Input
                    placeholder="Catatan tambahan"
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                  />
                </div>
              </div>

              {/* Add Item Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Tambah Item</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-5 gap-3">
                    <div className="space-y-2">
                      <Label>Produk</Label>
                      <Select
                        value={currentItem.productId}
                        onValueChange={(value) =>
                          setCurrentItem({
                            ...currentItem,
                            productId: value as Id<"products">,
                            variantId: undefined,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih" />
                        </SelectTrigger>
                        <SelectContent>
                          {products?.map((product) => (
                            <SelectItem key={product._id} value={product._id}>
                              {product.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {currentItem.productId && 
                     products?.find((p) => p._id === currentItem.productId)?.hasVariants && (
                      <div className="space-y-2">
                        <Label>Varian</Label>
                        <Select
                          value={currentItem.variantId || ""}
                          onValueChange={(value) =>
                            setCurrentItem({
                              ...currentItem,
                              variantId: value as Id<"productVariants">,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih" />
                          </SelectTrigger>
                          <SelectContent>
                            {variants?.map((variant) => (
                              <SelectItem key={variant._id} value={variant._id}>
                                {variant.variantValue}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>Qty</Label>
                      <Input
                        type="number"
                        min="1"
                        value={currentItem.quantity}
                        onChange={(e) =>
                          setCurrentItem({
                            ...currentItem,
                            quantity: parseInt(e.target.value) || 1,
                          })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Harga</Label>
                      <Input
                        type="number"
                        min="0"
                        value={currentItem.unitPrice}
                        onChange={(e) =>
                          setCurrentItem({
                            ...currentItem,
                            unitPrice: parseFloat(e.target.value) || 0,
                          })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Diskon</Label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={currentItem.discountAmount}
                          onChange={(e) =>
                            setCurrentItem({
                              ...currentItem,
                              discountAmount: parseFloat(e.target.value) || 0,
                            })
                          }
                        />
                        <Select
                          value={currentItem.discountType}
                          onValueChange={(value: "percent" | "nominal") =>
                            setCurrentItem({
                              ...currentItem,
                              discountType: value,
                            })
                          }
                        >
                          <SelectTrigger className="w-20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="nominal">Rp</SelectItem>
                            <SelectItem value="percent">%</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex items-end">
                      <Button
                        type="button"
                        onClick={handleAddItem}
                        className="w-full"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Tambah
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Items Table */}
              {items.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Daftar Item</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Produk</TableHead>
                          <TableHead>Qty</TableHead>
                          <TableHead>Harga</TableHead>
                          <TableHead>Diskon</TableHead>
                          <TableHead>Subtotal</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              {getProductName(item.productId)}
                              {item.variantId && (
                                <div className="text-sm text-slate-500">
                                  {getVariantName(item.variantId)}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>{formatCurrency(item.unitPrice)}</TableCell>
                            <TableCell>
                              {item.discountAmount > 0 && (
                                <span>
                                  {item.discountType === "percent"
                                    ? `${item.discountAmount}%`
                                    : formatCurrency(item.discountAmount)}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="font-medium">
                              {formatCurrency(calculateItemSubtotal(item))}
                            </TableCell>
                            <TableCell>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveItem(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {/* Transaction Discount and Tax */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Diskon & Pajak Transaksi</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Diskon Transaksi</Label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={formData.discountAmount}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              discountAmount: parseFloat(e.target.value) || 0,
                            })
                          }
                        />
                        <Select
                          value={formData.discountType}
                          onValueChange={(value: "percent" | "nominal") =>
                            setFormData({
                              ...formData,
                              discountType: value,
                            })
                          }
                        >
                          <SelectTrigger className="w-20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="nominal">Rp</SelectItem>
                            <SelectItem value="percent">%</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Pajak (%)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        placeholder="0"
                        value={formData.taxRate}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            taxRate: parseFloat(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Summary */}
              {items.length > 0 && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Subtotal:</span>
                        <span className="font-medium">
                          {formatCurrency(calculateSubtotal())}
                        </span>
                      </div>
                      {formData.discountAmount > 0 && (
                        <div className="flex justify-between text-sm text-orange-600">
                          <span>Diskon Transaksi:</span>
                          <span>
                            -{formatCurrency(calculateTransactionDiscount())}
                          </span>
                        </div>
                      )}
                      {formData.taxRate > 0 && (
                        <div className="flex justify-between text-sm">
                          <span>Pajak ({formData.taxRate}%):</span>
                          <span>{formatCurrency(calculateTax())}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-lg font-bold pt-2 border-t">
                        <span>Total:</span>
                        <span>{formatCurrency(calculateTotal())}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Batal
              </Button>
              <Button type="submit" disabled={items.length === 0}>
                Lanjut ke Pembayaran
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Pembayaran</DialogTitle>
            <DialogDescription>
              Total: {formatCurrency(calculateTotal())}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Add Payment */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Tambah Pembayaran</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Metode</Label>
                    <Select
                      value={currentPayment.paymentMethod}
                      onValueChange={(value: any) =>
                        setCurrentPayment({
                          ...currentPayment,
                          paymentMethod: value,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CASH">Tunai</SelectItem>
                        <SelectItem value="QRIS">QRIS</SelectItem>
                        <SelectItem value="CREDIT">Kredit</SelectItem>
                        <SelectItem value="BANK_TRANSFER">Transfer Bank</SelectItem>
                        <SelectItem value="DEBIT_CARD">Kartu Debit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Jumlah</Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={currentPayment.amount || ""}
                      onChange={(e) =>
                        setCurrentPayment({
                          ...currentPayment,
                          amount: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>

                  {currentPayment.paymentMethod === "QRIS" && (
                    <div className="space-y-2">
                      <Label>No. Referensi</Label>
                      <Input
                        placeholder="Nomor transaksi QRIS"
                        value={currentPayment.referenceNumber || ""}
                        onChange={(e) =>
                          setCurrentPayment({
                            ...currentPayment,
                            referenceNumber: e.target.value,
                          })
                        }
                      />
                    </div>
                  )}

                  <div className="flex items-end">
                    <Button
                      type="button"
                      onClick={handleAddPayment}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Tambah
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payments List */}
            {payments.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Daftar Pembayaran</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Metode</TableHead>
                        <TableHead>Jumlah</TableHead>
                        <TableHead>Referensi</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map((payment, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getPaymentMethodIcon(payment.paymentMethod)}
                              {getPaymentMethodLabel(payment.paymentMethod)}
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">
                            {formatCurrency(payment.amount)}
                          </TableCell>
                          <TableCell className="text-sm text-slate-500">
                            {payment.referenceNumber || "-"}
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemovePayment(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Payment Summary */}
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total Tagihan:</span>
                    <span>{formatCurrency(calculateTotal())}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Dibayar:</span>
                    <span className="font-medium">
                      {formatCurrency(calculateTotalPayments())}
                    </span>
                  </div>
                  {calculateChange() > 0 && (
                    <div className="flex justify-between text-green-600 font-bold">
                      <span>Kembalian:</span>
                      <span>{formatCurrency(calculateChange())}</span>
                    </div>
                  )}
                  {calculateOutstanding() > 0 && (
                    <div className="flex justify-between text-orange-600 font-bold">
                      <span>Sisa Tagihan (Kredit):</span>
                      <span>{formatCurrency(calculateOutstanding())}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsPaymentDialogOpen(false);
                setCurrentSaleId(null);
                setPayments([]);
              }}
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleSubmitSale}
              disabled={payments.length === 0}
            >
              Selesaikan Penjualan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
