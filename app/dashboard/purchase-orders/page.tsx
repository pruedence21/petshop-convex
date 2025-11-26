"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
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
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  ShoppingCart,
  Eye,
  Package,
  X,
  ArrowLeft,
  Save,
  Send,
  Calendar,
  Building2,
  Truck,
  FileText,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

// -- Types --
type POItem = {
  productId: Id<"products">;
  variantId?: Id<"productVariants">;
  name: string;
  variantName?: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  tax: number;
  notes?: string;
};

export default function PurchaseOrdersPage() {
  const router = useRouter();

  // -- View State --
  const [viewMode, setViewMode] = useState<"list" | "create">("list");

  // -- List View State --
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<Id<"branches"> | "all">("all");

  // -- Create View State --
  const [formData, setFormData] = useState({
    supplierId: "",
    branchId: "",
    orderDate: new Date().toISOString().slice(0, 10),
    expectedDeliveryDate: "",
    notes: "",
  });
  const [items, setItems] = useState<POItem[]>([]);
  const [productSearch, setProductSearch] = useState("");

  // -- Queries --
  const pos = useQuery(api.purchaseOrders.list, {
    status: selectedStatus !== "all" ? selectedStatus : undefined,
    branchId: selectedBranchFilter !== "all" ? selectedBranchFilter : undefined,
  });
  const suppliers = useQuery(api.suppliers.list, { includeInactive: false });
  const branches = useQuery(api.branches.list, { includeInactive: false });
  const products = useQuery(api.products.list, { includeInactive: false });

  // -- Mutations --
  const createPO = useMutation(api.purchaseOrders.create);
  const addItem = useMutation(api.purchaseOrders.addItem);
  const submitPO = useMutation(api.purchaseOrders.submit);
  const cancelPO = useMutation(api.purchaseOrders.cancel);
  const deletePO = useMutation(api.purchaseOrders.remove);

  // -- Effects --
  useEffect(() => {
    if (viewMode === "create" && branches && branches.length > 0 && !formData.branchId) {
      setFormData(prev => ({ ...prev, branchId: branches[0]._id }));
    }
  }, [viewMode, branches]);

  // -- Computed --
  const filteredPOs = useMemo(() => {
    if (!pos) return [];
    return pos.filter((po) =>
      po.poNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      po.supplier?.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [pos, searchQuery]);

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    if (!productSearch) return products.slice(0, 20); // Limit initial display
    return products.filter(p =>
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.sku.toLowerCase().includes(productSearch.toLowerCase())
    ).slice(0, 20);
  }, [products, productSearch]);

  const totals = useMemo(() => {
    return items.reduce((acc, item) => {
      const sub = item.quantity * item.unitPrice;
      const tax = item.tax || 0; // Assuming tax is absolute amount per item for simplicity here, or adjust logic
      const disc = item.discount || 0;
      return {
        subtotal: acc.subtotal + sub,
        tax: acc.tax + tax,
        discount: acc.discount + disc,
        total: acc.total + (sub - disc + tax)
      };
    }, { subtotal: 0, tax: 0, discount: 0, total: 0 });
  }, [items]);

  // -- Handlers --

  const handleCreateNew = () => {
    setFormData({
      supplierId: "",
      branchId: branches?.[0]?._id || "",
      orderDate: new Date().toISOString().slice(0, 10),
      expectedDeliveryDate: "",
      notes: "",
    });
    setItems([]);
    setViewMode("create");
  };

  const handleAddItem = (product: any) => {
    // Check if exists
    const existingIndex = items.findIndex(i => i.productId === product._id && !i.variantId);
    if (existingIndex >= 0) {
      const newItems = [...items];
      newItems[existingIndex].quantity += 1;
      setItems(newItems);
      toast.success(`Quantity updated: ${product.name}`);
    } else {
      setItems([...items, {
        productId: product._id,
        name: product.name,
        quantity: 1,
        unitPrice: product.purchasePrice || 0,
        discount: 0,
        tax: 0,
        notes: ""
      }]);
      toast.success(`Added: ${product.name}`);
    }
  };

  const handleUpdateItem = (index: number, field: keyof POItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmitOrder = async (asDraft: boolean = true) => {
    if (!formData.supplierId || !formData.branchId) {
      toast.error("Mohon lengkapi data supplier dan cabang");
      return;
    }
    if (items.length === 0) {
      toast.error("Minimal 1 item");
      return;
    }

    try {
      // 1. Create Header
      const result = await createPO({
        supplierId: formData.supplierId as Id<"suppliers">,
        branchId: formData.branchId as Id<"branches">,
        orderDate: new Date(formData.orderDate).getTime(),
        expectedDeliveryDate: formData.expectedDeliveryDate ? new Date(formData.expectedDeliveryDate).getTime() : undefined,
        notes: formData.notes,
      });

      // 2. Add Items
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

      // 3. Submit if needed
      if (!asDraft) {
        await submitPO({ purchaseOrderId: result.poId });
        toast.success(`PO ${result.poNumber} berhasil dibuat & disubmit`);
      } else {
        toast.success(`PO ${result.poNumber} disimpan sebagai Draft`);
      }

      setViewMode("list");
    } catch (error: any) {
      toast.error(error.message || "Gagal membuat PO");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Draft": return <Badge variant="secondary" className="bg-slate-200 text-slate-700">Draft</Badge>;
      case "Submitted": return <Badge className="bg-blue-500 hover:bg-blue-600">Submitted</Badge>;
      case "Received": return <Badge className="bg-green-500 hover:bg-green-600">Received</Badge>;
      case "Cancelled": return <Badge variant="destructive">Cancelled</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  // -- RENDER: LIST VIEW --
  if (viewMode === "list") {
    return (
      <div className="p-8 space-y-8 bg-slate-50/50 min-h-screen">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Purchase Orders</h1>
            <p className="text-slate-500 mt-1">Kelola pengadaan barang dari supplier</p>
          </div>
          <Button onClick={handleCreateNew} className="bg-blue-600 hover:bg-blue-700 shadow-sm">
            <Plus className="h-4 w-4 mr-2" />
            Buat Order Baru
          </Button>
        </div>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100 bg-white pb-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Cari No. PO atau Supplier..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-slate-50 border-slate-200"
                />
              </div>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="Submitted">Submitted</SelectItem>
                  <SelectItem value="Received">Received</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedBranchFilter as string} onValueChange={(v) => setSelectedBranchFilter(v as any)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Cabang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Cabang</SelectItem>
                  {branches?.map(b => (
                    <SelectItem key={b._id} value={b._id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-semibold">No. PO</TableHead>
                  <TableHead className="font-semibold">Tanggal</TableHead>
                  <TableHead className="font-semibold">Supplier</TableHead>
                  <TableHead className="font-semibold">Cabang</TableHead>
                  <TableHead className="font-semibold">Total</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="text-right font-semibold">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!filteredPOs ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-slate-500">Memuat data...</TableCell>
                  </TableRow>
                ) : filteredPOs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <FileText className="h-8 w-8 opacity-20" />
                        <p>Tidak ada purchase order ditemukan</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPOs.map((po) => (
                    <TableRow key={po._id} className="hover:bg-slate-50/50 transition-colors">
                      <TableCell className="font-medium text-slate-900">{po.poNumber}</TableCell>
                      <TableCell className="text-slate-500">{formatDate(po.orderDate)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-3 w-3 text-slate-400" />
                          {po.supplier?.name}
                        </div>
                      </TableCell>
                      <TableCell>{po.branch?.name}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(po.totalAmount)}</TableCell>
                      <TableCell>{getStatusBadge(po.status)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => router.push(`/dashboard/purchase-orders/${po._id}`)}>
                          <Eye className="h-4 w-4 text-slate-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  }

  // -- RENDER: CREATE VIEW --
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between flex-shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setViewMode("list")}>
            <ArrowLeft className="h-5 w-5 text-slate-500" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Buat Purchase Order</h1>
            <p className="text-xs text-slate-500">Draft Baru</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right mr-4">
            <p className="text-xs text-slate-500">Total Estimasi</p>
            <p className="text-lg font-bold text-slate-900">{formatCurrency(totals.total)}</p>
          </div>
          <Button variant="outline" onClick={() => handleSubmitOrder(true)}>
            <Save className="h-4 w-4 mr-2" />
            Simpan Draft
          </Button>
          <Button onClick={() => handleSubmitOrder(false)} className="bg-blue-600 hover:bg-blue-700">
            <Send className="h-4 w-4 mr-2" />
            Submit Order
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex">
        {/* LEFT: Product Catalog */}
        <div className="w-[400px] border-r border-slate-200 bg-white flex flex-col">
          <div className="p-4 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Cari produk untuk ditambahkan..."
                className="pl-9 bg-slate-50"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
              />
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div className="divide-y divide-slate-100">
              {filteredProducts?.map(product => (
                <div key={product._id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between group">
                  <div className="flex-1 min-w-0 mr-3">
                    <h4 className="font-medium text-sm truncate" title={product.name}>{product.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-[10px] h-5 font-normal text-slate-500">
                        {product.sku}
                      </Badge>
                      <span className="text-xs text-slate-400">Min Stock: {product.minStock || 0}</span>
                    </div>
                    <p className="text-xs font-medium text-blue-600 mt-1">
                      Beli: {formatCurrency(product.purchasePrice)}
                    </p>
                  </div>
                  <Button size="sm" variant="secondary" className="h-8 w-8 p-0 rounded-full" onClick={() => handleAddItem(product)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {filteredProducts?.length === 0 && (
                <div className="p-8 text-center text-slate-400">
                  <Package className="h-12 w-12 mx-auto mb-2 opacity-20" />
                  <p>Produk tidak ditemukan</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* RIGHT: Order Details */}
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/50">
          <ScrollArea className="flex-1">
            <div className="p-6 max-w-5xl mx-auto space-y-6">

              {/* Order Info Card */}
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3 border-b border-slate-100 bg-white rounded-t-lg">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-500" />
                    Informasi Order
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 grid grid-cols-2 gap-6 bg-white rounded-b-lg">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Supplier <span className="text-red-500">*</span></Label>
                      <Select value={formData.supplierId} onValueChange={(v) => setFormData({ ...formData, supplierId: v })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih Supplier" />
                        </SelectTrigger>
                        <SelectContent>
                          {suppliers?.map(s => (
                            <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Cabang Penerima <span className="text-red-500">*</span></Label>
                      <Select value={formData.branchId} onValueChange={(v) => setFormData({ ...formData, branchId: v })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih Cabang" />
                        </SelectTrigger>
                        <SelectContent>
                          {branches?.map(b => (
                            <SelectItem key={b._id} value={b._id}>{b.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Tanggal Order</Label>
                        <div className="relative">
                          <Input
                            type="date"
                            value={formData.orderDate}
                            onChange={(e) => setFormData({ ...formData, orderDate: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Estimasi Kirim</Label>
                        <div className="relative">
                          <Input
                            type="date"
                            value={formData.expectedDeliveryDate}
                            onChange={(e) => setFormData({ ...formData, expectedDeliveryDate: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Catatan</Label>
                      <Textarea
                        placeholder="Instruksi khusus untuk supplier..."
                        className="h-[38px] min-h-[38px] py-2"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Items Table */}
              <Card className="border-slate-200 shadow-sm min-h-[300px] flex flex-col">
                <CardHeader className="pb-3 border-b border-slate-100 bg-white rounded-t-lg flex flex-row items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4 text-green-500" />
                    Daftar Barang
                  </CardTitle>
                  <Badge variant="secondary">{items.length} Item</Badge>
                </CardHeader>
                <CardContent className="p-0 flex-1 bg-white rounded-b-lg">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="w-[30%]">Produk</TableHead>
                        <TableHead className="w-[12%]">Qty</TableHead>
                        <TableHead className="w-[18%]">Harga Satuan</TableHead>
                        <TableHead className="w-[12%]">Diskon</TableHead>
                        <TableHead className="w-[12%]">Pajak</TableHead>
                        <TableHead className="w-[15%] text-right">Subtotal</TableHead>
                        <TableHead className="w-[5%]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="h-32 text-center text-slate-400">
                            Pilih produk dari panel kiri untuk menambahkan ke order
                          </TableCell>
                        </TableRow>
                      ) : (
                        items.map((item, index) => (
                          <TableRow key={`${item.productId}-${index}`}>
                            <TableCell>
                              <div className="font-medium text-sm">{item.name}</div>
                              {item.variantName && <div className="text-xs text-slate-500">{item.variantName}</div>}
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                className="h-8 w-20"
                                value={item.quantity}
                                onChange={(e) => handleUpdateItem(index, "quantity", parseFloat(e.target.value) || 0)}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                className="h-8 w-full"
                                value={item.unitPrice}
                                onChange={(e) => handleUpdateItem(index, "unitPrice", parseFloat(e.target.value) || 0)}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                className="h-8 w-full"
                                value={item.discount}
                                onChange={(e) => handleUpdateItem(index, "discount", parseFloat(e.target.value) || 0)}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                className="h-8 w-full"
                                value={item.tax}
                                onChange={(e) => handleUpdateItem(index, "tax", parseFloat(e.target.value) || 0)}
                              />
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency((item.quantity * item.unitPrice) - (item.discount || 0) + (item.tax || 0))}
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-500" onClick={() => handleRemoveItem(index)}>
                                <X className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Summary Footer */}
              <div className="flex justify-end">
                <div className="w-80 bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Subtotal</span>
                    <span>{formatCurrency(totals.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Total Diskon</span>
                    <span className="text-red-500">-{formatCurrency(totals.discount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Total Pajak</span>
                    <span>{formatCurrency(totals.tax)}</span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total Order</span>
                    <span className="text-blue-600">{formatCurrency(totals.total)}</span>
                  </div>
                </div>
              </div>

            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
