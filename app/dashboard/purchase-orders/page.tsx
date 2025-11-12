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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, Search, ShoppingCart, Eye, Package, X } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useRouter } from "next/navigation";

type POItem = {
  productId: Id<"products">;
  variantId?: Id<"productVariants">;
  quantity: number;
  unitPrice: number;
  discount?: number;
  tax?: number;
  notes?: string;
};

export default function PurchaseOrdersPage() {
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedBranch, setSelectedBranch] = useState<Id<"branches"> | "all">("all");
  
  const [formData, setFormData] = useState({
    supplierId: "",
    branchId: "",
    orderDate: new Date().toISOString().slice(0, 10),
    expectedDeliveryDate: "",
    notes: "",
  });

  const [items, setItems] = useState<POItem[]>([]);
  const [currentItem, setCurrentItem] = useState<POItem>({
    productId: "" as Id<"products">,
    variantId: undefined,
    quantity: 1,
    unitPrice: 0,
    discount: 0,
    tax: 0,
    notes: "",
  });

  const pos = useQuery(api.purchaseOrders.list, {
    status: selectedStatus !== "all" ? selectedStatus : undefined,
    branchId: selectedBranch !== "all" ? selectedBranch : undefined,
  });
  const suppliers = useQuery(api.suppliers.list, { includeInactive: false });
  const branches = useQuery(api.branches.list, { includeInactive: false });
  const products = useQuery(api.products.list, { includeInactive: false });
  const variants = useQuery(
    api.products.getVariants,
    currentItem.productId && currentItem.productId !== ("" as Id<"products">)
      ? { productId: currentItem.productId }
      : "skip"
  );

  const createPO = useMutation(api.purchaseOrders.create);
  const addItem = useMutation(api.purchaseOrders.addItem);
  const submitPO = useMutation(api.purchaseOrders.submit);
  const cancelPO = useMutation(api.purchaseOrders.cancel);
  const deletePO = useMutation(api.purchaseOrders.remove);

  const filteredPOs = pos?.filter((po) =>
    po.poNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    po.supplier?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenDialog = () => {
    setFormData({
      supplierId: "",
      branchId: "",
      orderDate: new Date().toISOString().slice(0, 10),
      expectedDeliveryDate: "",
      notes: "",
    });
    setItems([]);
    setCurrentItem({
      productId: "" as Id<"products">,
      variantId: undefined,
      quantity: 1,
      unitPrice: 0,
      discount: 0,
      tax: 0,
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

    setItems([...items, { ...currentItem }]);
    setCurrentItem({
      productId: "" as Id<"products">,
      variantId: undefined,
      quantity: 1,
      unitPrice: 0,
      discount: 0,
      tax: 0,
      notes: "",
    });
    toast.success("Item ditambahkan");
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
    toast.success("Item dihapus");
  };

  const calculateSubtotal = (item: POItem) => {
    const discount = item.discount || 0;
    const tax = item.tax || 0;
    return item.quantity * item.unitPrice - discount + tax;
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + calculateSubtotal(item), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.supplierId || !formData.branchId) {
      toast.error("Mohon lengkapi semua field yang wajib");
      return;
    }

    if (items.length === 0) {
      toast.error("Tambahkan minimal 1 item");
      return;
    }

    try {
      // Create PO
      const result = await createPO({
        supplierId: formData.supplierId as Id<"suppliers">,
        branchId: formData.branchId as Id<"branches">,
        orderDate: new Date(formData.orderDate).getTime(),
        expectedDeliveryDate: formData.expectedDeliveryDate
          ? new Date(formData.expectedDeliveryDate).getTime()
          : undefined,
        notes: formData.notes || undefined,
      });

      // Add items
      for (const item of items) {
        await addItem({
          purchaseOrderId: result.poId,
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount,
          tax: item.tax,
          notes: item.notes,
        });
      }

      toast.success(`Purchase Order ${result.poNumber} berhasil dibuat`);
      handleCloseDialog();
    } catch (error) {
      toast.error("Terjadi kesalahan");
      console.error(error);
    }
  };

  const handleSubmitPO = async (poId: Id<"purchaseOrders">) => {
    if (confirm("Submit Purchase Order ini? Status akan berubah menjadi Submitted.")) {
      try {
        await submitPO({ purchaseOrderId: poId });
        toast.success("PO berhasil di-submit");
      } catch (error: any) {
        toast.error(error.message || "Terjadi kesalahan");
      }
    }
  };

  const handleCancelPO = async (poId: Id<"purchaseOrders">) => {
    if (confirm("Cancel Purchase Order ini?")) {
      try {
        await cancelPO({ purchaseOrderId: poId });
        toast.success("PO berhasil dibatalkan");
      } catch (error: any) {
        toast.error(error.message || "Terjadi kesalahan");
      }
    }
  };

  const handleDeletePO = async (poId: Id<"purchaseOrders">) => {
    if (confirm("Hapus Purchase Order ini? Hanya PO Draft atau Cancelled yang bisa dihapus.")) {
      try {
        await deletePO({ id: poId });
        toast.success("PO berhasil dihapus");
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
    const allVariants = products?.flatMap((p) => 
      variants || []
    );
    const variant = allVariants?.find((v) => v._id === variantId);
    return variant ? `${variant.variantName}: ${variant.variantValue}` : "";
  };

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

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Purchase Orders</h1>
        <p className="text-slate-500 mt-1">Kelola pembelian dari supplier</p>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1">
              <div className="flex-1 max-w-sm relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Cari PO..."
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
                  <SelectItem value="Submitted">Submitted</SelectItem>
                  <SelectItem value="Received">Received</SelectItem>
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
              Buat PO
            </Button>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>No. PO</TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Cabang</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!filteredPOs ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                  Memuat data...
                </TableCell>
              </TableRow>
            ) : filteredPOs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                  Belum ada purchase order
                </TableCell>
              </TableRow>
            ) : (
              filteredPOs.map((po) => (
                <TableRow key={po._id}>
                  <TableCell className="font-medium">{po.poNumber}</TableCell>
                  <TableCell>{formatDate(po.orderDate)}</TableCell>
                  <TableCell>{po.supplier?.name || "-"}</TableCell>
                  <TableCell>{po.branch?.name || "-"}</TableCell>
                  <TableCell className="font-medium text-green-600">
                    {formatCurrency(po.totalAmount)}
                  </TableCell>
                  <TableCell className="text-slate-600">
                    {po.itemCount} item(s)
                  </TableCell>
                  <TableCell>{getStatusBadge(po.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/dashboard/purchase-orders/${po._id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {po.status === "Draft" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSubmitPO(po._id)}
                          className="text-blue-600"
                        >
                          Submit
                        </Button>
                      )}
                      {(po.status === "Draft" || po.status === "Submitted") && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCancelPO(po._id)}
                          className="text-orange-600"
                        >
                          Cancel
                        </Button>
                      )}
                      {(po.status === "Draft" || po.status === "Cancelled") && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeletePO(po._id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Buat Purchase Order</DialogTitle>
              <DialogDescription>
                Buat purchase order baru untuk pembelian dari supplier
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="supplierId">
                    Supplier <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.supplierId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, supplierId: value })
                    }
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers?.map((supplier) => (
                        <SelectItem key={supplier._id} value={supplier._id}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="branchId">
                    Cabang Tujuan <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.branchId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, branchId: value })
                    }
                    required
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
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="orderDate">
                    Tanggal Order <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="orderDate"
                    type="date"
                    value={formData.orderDate}
                    onChange={(e) =>
                      setFormData({ ...formData, orderDate: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="expectedDeliveryDate">
                    Estimasi Pengiriman
                  </Label>
                  <Input
                    id="expectedDeliveryDate"
                    type="date"
                    value={formData.expectedDeliveryDate}
                    onChange={(e) =>
                      setFormData({ ...formData, expectedDeliveryDate: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="notes">Catatan</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="Catatan tambahan..."
                  rows={2}
                />
              </div>

              <div className="border-t pt-4 mt-2">
                <h3 className="font-semibold mb-4">Item Purchase Order</h3>
                
                {/* Add Item Form */}
                <div className="bg-slate-50 p-4 rounded-lg mb-4">
                  <div className="grid grid-cols-12 gap-2 mb-2">
                    <div className="col-span-3">
                      <Label className="text-xs">Produk</Label>
                      <Select
                        value={currentItem.productId}
                        onValueChange={(value) =>
                          setCurrentItem({
                            ...currentItem,
                            productId: value as Id<"products">,
                            variantId: undefined,
                            unitPrice: products?.find((p) => p._id === value)?.purchasePrice || 0,
                          })
                        }
                      >
                        <SelectTrigger className="h-9">
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
                    <div className="col-span-2">
                      <Label className="text-xs">Varian</Label>
                      <Select
                        value={currentItem.variantId || ""}
                        onValueChange={(value) =>
                          setCurrentItem({
                            ...currentItem,
                            variantId: value ? (value as Id<"productVariants">) : undefined,
                          })
                        }
                        disabled={!currentItem.productId || !products?.find((p) => p._id === currentItem.productId)?.hasVariants}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Pilih" />
                        </SelectTrigger>
                        <SelectContent>
                          {variants?.map((variant: any) => (
                            <SelectItem key={variant._id} value={variant._id}>
                              {variant.variantName}: {variant.variantValue}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-1">
                      <Label className="text-xs">Qty</Label>
                      <Input
                        type="number"
                        value={currentItem.quantity}
                        onChange={(e) =>
                          setCurrentItem({ ...currentItem, quantity: parseFloat(e.target.value) || 0 })
                        }
                        className="h-9"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Harga</Label>
                      <Input
                        type="number"
                        value={currentItem.unitPrice}
                        onChange={(e) =>
                          setCurrentItem({ ...currentItem, unitPrice: parseFloat(e.target.value) || 0 })
                        }
                        className="h-9"
                      />
                    </div>
                    <div className="col-span-1">
                      <Label className="text-xs">Diskon</Label>
                      <Input
                        type="number"
                        value={currentItem.discount || 0}
                        onChange={(e) =>
                          setCurrentItem({ ...currentItem, discount: parseFloat(e.target.value) || 0 })
                        }
                        className="h-9"
                      />
                    </div>
                    <div className="col-span-1">
                      <Label className="text-xs">Pajak</Label>
                      <Input
                        type="number"
                        value={currentItem.tax || 0}
                        onChange={(e) =>
                          setCurrentItem({ ...currentItem, tax: parseFloat(e.target.value) || 0 })
                        }
                        className="h-9"
                      />
                    </div>
                    <div className="col-span-2 flex items-end">
                      <Button
                        type="button"
                        onClick={handleAddItem}
                        size="sm"
                        className="w-full"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Tambah
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Items Table */}
                {items.length > 0 && (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Produk</TableHead>
                          <TableHead>Qty</TableHead>
                          <TableHead>Harga</TableHead>
                          <TableHead>Diskon</TableHead>
                          <TableHead>Pajak</TableHead>
                          <TableHead className="text-right">Subtotal</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <div className="font-medium">{getProductName(item.productId)}</div>
                              {item.variantId && (
                                <div className="text-xs text-slate-500">{getVariantName(item.variantId)}</div>
                              )}
                            </TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>{formatCurrency(item.unitPrice)}</TableCell>
                            <TableCell>{formatCurrency(item.discount || 0)}</TableCell>
                            <TableCell>{formatCurrency(item.tax || 0)}</TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(calculateSubtotal(item))}
                            </TableCell>
                            <TableCell>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveItem(index)}
                              >
                                <X className="h-4 w-4 text-red-500" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow>
                          <TableCell colSpan={5} className="text-right font-bold">
                            Total:
                          </TableCell>
                          <TableCell className="text-right font-bold text-green-600">
                            {formatCurrency(calculateTotal())}
                          </TableCell>
                          <TableCell></TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseDialog}
              >
                Batal
              </Button>
              <Button type="submit" disabled={items.length === 0}>
                Buat PO
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
