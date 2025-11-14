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
import { Plus, Pencil, Trash2, Search, Package, Settings } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { useFormSchema } from "@/components/forms/useFormSchema";
import { FormField } from "@/components/forms/FormField";
import { NumericInput } from "@/components/forms/NumericInput";

type Product = {
  _id: Id<"products">;
  sku: string;
  name: string;
  description?: string;
  categoryId: Id<"productCategories">;
  subcategoryId?: Id<"productSubcategories">;
  brandId: Id<"brands">;
  unitId: Id<"units">;
  purchasePrice: number;
  sellingPrice: number;
  minStock: number;
  maxStock: number;
  hasVariants: boolean;
  isActive: boolean;
};

type ProductVariant = {
  _id: Id<"productVariants">;
  productId: Id<"products">;
  variantName: string;
  variantValue: string;
  sku: string;
  purchasePrice: number;
  sellingPrice: number;
  isActive: boolean;
};

export default function ProductsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isVariantDialogOpen, setIsVariantDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedProductForVariants, setSelectedProductForVariants] = useState<Product | null>(null);
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<Id<"productCategories"> | "all">("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const productForm = useFormSchema({
    schema: {
      sku: { label: "SKU", required: true, parse: (v) => String(v).toUpperCase(), validate: (v) => (String(v).length < 3 ? "Minimal 3 karakter" : null), defaultValue: "" },
      name: { label: "Nama Produk", required: true, validate: (v) => (String(v).length < 3 ? "Nama terlalu pendek" : null), defaultValue: "" },
      description: { label: "Deskripsi", defaultValue: "" },
      categoryId: { label: "Kategori", required: true, defaultValue: "" },
      subcategoryId: { label: "Sub Kategori", defaultValue: "" },
      brandId: { label: "Merek", required: true, defaultValue: "" },
      unitId: { label: "Satuan", required: true, defaultValue: "" },
      purchasePrice: { label: "Harga Beli", required: true, parse: (v) => Number(v), validate: (v) => (v <= 0 ? "Harus > 0" : null), defaultValue: 0 },
      sellingPrice: { label: "Harga Jual", required: true, parse: (v) => Number(v), validate: (v) => (v <= 0 ? "Harus > 0" : null), defaultValue: 0 },
      minStock: { label: "Stok Minimum", required: true, parse: (v) => Number(v), validate: (v) => (v < 0 ? "Tidak boleh negatif" : null), defaultValue: 10 },
      maxStock: { label: "Stok Maximum", required: true, parse: (v) => Number(v), validate: (v) => (v < 0 ? "Tidak boleh negatif" : null), defaultValue: 100 },
      hasVariants: { label: "Memiliki Varian", parse: (v) => Boolean(v), defaultValue: false },
      type: { label: "Tipe Produk", required: true, defaultValue: "product" },
      serviceDuration: { label: "Durasi (Menit)", parse: (v) => (v ? Number(v) : ""), defaultValue: "" },
    },
    onSubmit: async (values) => {
      try {
        if (editingProduct) {
          await updateProduct({
            id: editingProduct._id,
            sku: values.sku,
            name: values.name,
            description: values.description || undefined,
            categoryId: values.categoryId as any,
            subcategoryId: values.subcategoryId ? (values.subcategoryId as any) : undefined,
            brandId: values.brandId as any,
            unitId: values.unitId as any,
            purchasePrice: values.purchasePrice as any,
            sellingPrice: values.sellingPrice as any,
            minStock: values.minStock as any,
            maxStock: values.maxStock as any,
            hasVariants: values.hasVariants as any,
            type: values.type as any,
            serviceDuration: values.serviceDuration ? (values.serviceDuration as any) : undefined,
          });
          toast.success("Produk berhasil diperbarui");
        } else {
          await createProduct({
            sku: values.sku,
            name: values.name,
            description: values.description || undefined,
            categoryId: values.categoryId as any,
            subcategoryId: values.subcategoryId ? (values.subcategoryId as any) : undefined,
            brandId: values.brandId as any,
            unitId: values.unitId as any,
            purchasePrice: values.purchasePrice as any,
            sellingPrice: values.sellingPrice as any,
            minStock: values.minStock as any,
            maxStock: values.maxStock as any,
            hasVariants: values.hasVariants as any,
            type: values.type as any,
            serviceDuration: values.serviceDuration ? (values.serviceDuration as any) : undefined,
          });
          toast.success("Produk berhasil ditambahkan");
        }
        setIsDialogOpen(false);
        setEditingProduct(null);
        productForm.reset();
      } catch (e: any) {
        let msg = e.message || "Gagal menyimpan";
        try {
          const parsed = JSON.parse(e.message);
          msg = parsed.userMessage || msg;
        } catch {}
        toast.error(msg);
      }
    },
  });

  const variantForm = useFormSchema({
    schema: {
      variantName: { label: "Nama Varian", required: true, validate: (v) => (String(v).length < 2 ? "Minimal 2 karakter" : null), defaultValue: "" },
      variantValue: { label: "Nilai Varian", required: true, validate: (v) => (String(v).length < 1 ? "Wajib diisi" : null), defaultValue: "" },
      sku: { label: "SKU", required: true, parse: (v) => String(v).toUpperCase(), validate: (v) => (String(v).length < 3 ? "Minimal 3 karakter" : null), defaultValue: "" },
      purchasePrice: { label: "Harga Beli", required: true, parse: (v) => Number(v), validate: (v) => (v <= 0 ? "Harus > 0" : null), defaultValue: 0 },
      sellingPrice: { label: "Harga Jual", required: true, parse: (v) => Number(v), validate: (v) => (v <= 0 ? "Harus > 0" : null), defaultValue: 0 },
    },
    onSubmit: async (values) => {
      if (!selectedProductForVariants) return;
      try {
        if (editingVariant) {
          await updateVariant({
            id: editingVariant._id,
            variantName: values.variantName,
            variantValue: values.variantValue,
            sku: values.sku,
            purchasePrice: values.purchasePrice as any,
            sellingPrice: values.sellingPrice as any,
          });
          toast.success("Varian berhasil diperbarui");
        } else {
          await createVariant({
            productId: selectedProductForVariants._id,
            variantName: values.variantName,
            variantValue: values.variantValue,
            sku: values.sku,
            purchasePrice: values.purchasePrice as any,
            sellingPrice: values.sellingPrice as any,
          });
          toast.success("Varian berhasil ditambahkan");
        }
        setIsVariantDialogOpen(false);
        setEditingVariant(null);
        variantForm.reset();
      } catch (e: any) {
        let msg = e.message || "Gagal menyimpan";
        try {
          const parsed = JSON.parse(e.message);
          msg = parsed.userMessage || msg;
        } catch {}
        toast.error(msg);
      }
    },
  });

  const products = useQuery(api.products.list, {
    categoryId: selectedCategory !== "all" ? selectedCategory : undefined,
    type: selectedType !== "all" ? selectedType : undefined,
    includeInactive: false,
  });
  const categories = useQuery(api.productCategories.list, { includeInactive: false });
  const subcategories = useQuery(
    api.productSubcategories.list,
    productForm.values.categoryId
      ? { categoryId: productForm.values.categoryId as Id<"productCategories">, includeInactive: false }
      : "skip"
  );
  const brands = useQuery(api.brands.list, { includeInactive: false });
  const units = useQuery(api.units.list, { includeInactive: false });

  const createProduct = useMutation(api.products.create);
  const updateProduct = useMutation(api.products.update);
  const deleteProduct = useMutation(api.products.remove);

  const variants = useQuery(
    api.productVariants.listByProduct,
    selectedProductForVariants ? { productId: selectedProductForVariants._id } : "skip"
  );
  const createVariant = useMutation(api.productVariants.create);
  const updateVariant = useMutation(api.productVariants.update);
  const deleteVariant = useMutation(api.productVariants.remove);

  const filteredProducts = products?.filter((product) =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTypeBadge = (type?: string) => {
    switch (type) {
      case "medicine":
        return <Badge className="bg-green-500">Obat</Badge>;
      case "procedure":
        return <Badge className="bg-purple-500">Tindakan</Badge>;
      case "service":
        return <Badge className="bg-blue-500">Layanan</Badge>;
      default:
        return <Badge variant="outline">Produk</Badge>;
    }
  };

  const handleOpenDialog = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      productForm.reset();
      productForm.setField("sku", product.sku);
      productForm.setField("name", product.name);
      productForm.setField("description", product.description || "");
      productForm.setField("categoryId", product.categoryId as any);
      productForm.setField("subcategoryId", (product.subcategoryId || "") as any);
      productForm.setField("brandId", product.brandId as any);
      productForm.setField("unitId", product.unitId as any);
      productForm.setField("purchasePrice", product.purchasePrice as any);
      productForm.setField("sellingPrice", product.sellingPrice as any);
      productForm.setField("minStock", product.minStock as any);
      productForm.setField("maxStock", product.maxStock as any);
      productForm.setField("hasVariants", product.hasVariants as any);
      productForm.setField("type", ((product as any).type || "product") as any);
      productForm.setField("serviceDuration", ((product as any).serviceDuration || "") as any);
    } else {
      setEditingProduct(null);
      productForm.reset();
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingProduct(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    productForm.submit();
  };

  const handleDelete = async (id: Id<"products">) => {
    if (confirm("Apakah Anda yakin ingin menghapus produk ini?")) {
      try {
        await deleteProduct({ id });
        toast.success("Produk berhasil dihapus");
      } catch (error) {
        toast.error("Terjadi kesalahan");
        console.error(error);
      }
    }
  };

  const getCategoryName = (categoryId: Id<"productCategories">) => {
    return categories?.find((c) => c._id === categoryId)?.name || "-";
  };

  const getBrandName = (brandId: Id<"brands">) => {
    return brands?.find((b) => b._id === brandId)?.name || "-";
  };

  const getUnitName = (unitId: Id<"units">) => {
    return units?.find((u) => u._id === unitId)?.code || "-";
  };

  const handleOpenVariantDialog = (product: Product, variant?: ProductVariant) => {
    setSelectedProductForVariants(product);
    if (variant) {
      setEditingVariant(variant);
      variantForm.reset();
      variantForm.setField("variantName", variant.variantName);
      variantForm.setField("variantValue", variant.variantValue);
      variantForm.setField("sku", variant.sku);
      variantForm.setField("purchasePrice", variant.purchasePrice as any);
      variantForm.setField("sellingPrice", variant.sellingPrice as any);
    } else {
      setEditingVariant(null);
      variantForm.reset();
      variantForm.setField("purchasePrice", product.purchasePrice as any);
      variantForm.setField("sellingPrice", product.sellingPrice as any);
    }
    setIsVariantDialogOpen(true);
  };

  const handleCloseVariantDialog = () => {
    setIsVariantDialogOpen(false);
    setEditingVariant(null);
    setSelectedProductForVariants(null);
  };

  const handleSubmitVariant = (e: React.FormEvent) => {
    e.preventDefault();
    variantForm.submit();
  };

  const handleDeleteVariant = async (id: Id<"productVariants">) => {
    if (confirm("Apakah Anda yakin ingin menghapus varian ini?")) {
      try {
        await deleteVariant({ id });
        toast.success("Varian berhasil dihapus");
      } catch (error) {
        toast.error("Terjadi kesalahan");
        console.error(error);
      }
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Katalog Produk</h1>
        <p className="text-slate-500 mt-1">Kelola katalog produk petshop</p>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1">
              <div className="flex-1 max-w-sm relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Cari produk..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select
                value={selectedCategory === "all" ? "all" : selectedCategory}
                onValueChange={(value) =>
                  setSelectedCategory(value === "all" ? "all" : value as Id<"productCategories">)
                }
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Semua Kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kategori</SelectItem>
                  {categories?.map((category) => (
                    <SelectItem key={category._id} value={category._id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Semua Tipe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Tipe</SelectItem>
                  <SelectItem value="product">Produk</SelectItem>
                  <SelectItem value="medicine">Obat</SelectItem>
                  <SelectItem value="procedure">Tindakan</SelectItem>
                  <SelectItem value="service">Layanan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => handleOpenDialog()} className="gap-2">
              <Plus className="h-4 w-4" />
              Tambah Produk
            </Button>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Nama Produk</TableHead>
              <TableHead>Tipe</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead>Merek</TableHead>
              <TableHead>Harga Jual</TableHead>
              <TableHead>Satuan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!filteredProducts ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-slate-500">
                  Memuat data...
                </TableCell>
              </TableRow>
            ) : filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-slate-500">
                  Belum ada data produk
                </TableCell>
              </TableRow>
            ) : (
              filteredProducts.map((product) => (
                <TableRow key={product._id}>
                  <TableCell className="font-medium">{product.sku}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-slate-400" />
                      {product.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    {getTypeBadge((product as any).type)}
                  </TableCell>
                  <TableCell className="text-slate-600">
                    {getCategoryName(product.categoryId)}
                  </TableCell>
                  <TableCell className="text-slate-600">
                    {getBrandName(product.brandId)}
                  </TableCell>
                  <TableCell className="font-medium text-green-600">
                    {formatCurrency(product.sellingPrice)}
                  </TableCell>
                  <TableCell className="text-slate-600">
                    {getUnitName(product.unitId)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant={product.isActive ? "default" : "secondary"}>
                        {product.isActive ? "Aktif" : "Nonaktif"}
                      </Badge>
                      {product.hasVariants && (
                        <Badge variant="outline" className="text-xs">
                          Varian
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {product.hasVariants && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedProductForVariants(product);
                            setIsVariantDialogOpen(true);
                          }}
                          title="Kelola Varian"
                        >
                          <Settings className="h-4 w-4 text-blue-500" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialog(product)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(product._id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? "Edit Produk" : "Tambah Produk"}
              </DialogTitle>
              <DialogDescription>
                {editingProduct
                  ? "Ubah informasi produk"
                  : "Tambahkan produk baru ke katalog"}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField label="SKU" required error={productForm.errors.sku || null}>
                  <Input
                    id="sku"
                    value={productForm.values.sku as any}
                    onChange={(e) => productForm.setField("sku", e.target.value)}
                    onBlur={() => productForm.handleBlur("sku")}
                    placeholder="PRD-001"
                  />
                </FormField>
                <FormField label="Nama Produk" required error={productForm.errors.name || null}>
                  <Input
                    id="name"
                    value={productForm.values.name as any}
                    onChange={(e) => productForm.setField("name", e.target.value)}
                    onBlur={() => productForm.handleBlur("name")}
                    placeholder="Royal Canin Adult 2kg"
                  />
                </FormField>
              </div>
              <FormField label="Deskripsi" error={productForm.errors.description || null}>
                <Textarea
                  id="description"
                  value={productForm.values.description as any}
                  onChange={(e) => productForm.setField("description", e.target.value)}
                  onBlur={() => productForm.handleBlur("description")}
                  placeholder="Deskripsi produk..."
                  rows={2}
                />
              </FormField>
              <div className="grid grid-cols-3 gap-4">
                <FormField label="Tipe Produk" required error={productForm.errors.type || null}>
                  <Select
                    value={productForm.values.type as any}
                    onValueChange={(value) => productForm.setField("type", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="product">Produk</SelectItem>
                      <SelectItem value="medicine">Obat</SelectItem>
                      <SelectItem value="procedure">Tindakan</SelectItem>
                      <SelectItem value="service">Layanan</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="Kategori" required error={productForm.errors.categoryId || null}>
                  <Select
                    value={productForm.values.categoryId as any}
                    onValueChange={(value) => {
                      productForm.setField("categoryId", value);
                      productForm.setField("subcategoryId", "");
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih kategori" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories?.map((category) => (
                        <SelectItem key={category._id} value={category._id}>
                          {category.icon} {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="Sub Kategori" error={productForm.errors.subcategoryId || null}>
                  <Select
                    value={productForm.values.subcategoryId as any}
                    onValueChange={(value) => productForm.setField("subcategoryId", value)}
                    disabled={!productForm.values.categoryId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih sub kategori" />
                    </SelectTrigger>
                    <SelectContent>
                      {subcategories?.map((sub) => (
                        <SelectItem key={sub._id} value={sub._id}>
                          {sub.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="Merek" required error={productForm.errors.brandId || null}>
                  <Select
                    value={productForm.values.brandId as any}
                    onValueChange={(value) => productForm.setField("brandId", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih merek" />
                    </SelectTrigger>
                    <SelectContent>
                      {brands?.map((brand) => (
                        <SelectItem key={brand._id} value={brand._id}>
                          {brand.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <FormField label="Satuan" required error={productForm.errors.unitId || null}>
                  <Select
                    value={productForm.values.unitId as any}
                    onValueChange={(value) => productForm.setField("unitId", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih satuan" />
                    </SelectTrigger>
                    <SelectContent>
                      {units?.map((unit) => (
                        <SelectItem key={unit._id} value={unit._id}>
                          {unit.code} - {unit.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="Harga Beli" required error={productForm.errors.purchasePrice || null}>
                  <Input
                    id="purchasePrice"
                    type="number"
                    value={productForm.values.purchasePrice as any}
                    onChange={(e) => productForm.setField("purchasePrice", e.target.value)}
                    onBlur={() => productForm.handleBlur("purchasePrice")}
                    placeholder="50000"
                  />
                </FormField>
                <FormField label="Harga Jual" required error={productForm.errors.sellingPrice || null}>
                  <Input
                    id="sellingPrice"
                    type="number"
                    value={productForm.values.sellingPrice as any}
                    onChange={(e) => productForm.setField("sellingPrice", e.target.value)}
                    onBlur={() => productForm.handleBlur("sellingPrice")}
                    placeholder="75000"
                  />
                </FormField>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <FormField label="Stok Minimum" required error={productForm.errors.minStock || null}>
                  <Input
                    id="minStock"
                    type="number"
                    value={productForm.values.minStock as any}
                    onChange={(e) => productForm.setField("minStock", e.target.value)}
                    onBlur={() => productForm.handleBlur("minStock")}
                    placeholder="10"
                  />
                </FormField>
                <FormField label="Stok Maximum" required error={productForm.errors.maxStock || null}>
                  <Input
                    id="maxStock"
                    type="number"
                    value={productForm.values.maxStock as any}
                    onChange={(e) => productForm.setField("maxStock", e.target.value)}
                    onBlur={() => productForm.handleBlur("maxStock")}
                    placeholder="100"
                  />
                </FormField>
                <FormField label="Memiliki Varian" error={productForm.errors.hasVariants || null}>
                  <div className="flex items-center gap-2 h-10">
                    <input
                      type="checkbox"
                      id="hasVariants"
                      checked={productForm.values.hasVariants as any}
                      onChange={(e) => productForm.setField("hasVariants", e.target.checked)}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="hasVariants" className="cursor-pointer">
                      Memiliki Varian
                    </Label>
                  </div>
                </FormField>
              </div>
              {(productForm.values.type === "service" || productForm.values.type === "procedure") && (
                <div className="grid gap-2">
                  <Label htmlFor="serviceDuration">
                    Durasi (Menit) {productForm.values.type === "service" || productForm.values.type === "procedure" ? <span className="text-red-500">*</span> : ""}
                  </Label>
                  <Input
                    id="serviceDuration"
                    type="number"
                    value={productForm.values.serviceDuration as any}
                    onChange={(e) => productForm.setField("serviceDuration", e.target.value)}
                    placeholder="30"
                  />
                  <p className="text-xs text-slate-500">
                    Durasi waktu untuk layanan/tindakan dalam menit
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseDialog}
              >
                Batal
              </Button>
              <Button type="submit" disabled={!productForm.isValid}>
                {editingProduct ? "Simpan" : "Tambah"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Kelola Varian */}
      <Dialog open={isVariantDialogOpen} onOpenChange={setIsVariantDialogOpen}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Kelola Varian Produk
              {selectedProductForVariants && (
                <span className="text-sm font-normal text-slate-500 ml-2">
                  {selectedProductForVariants.name}
                </span>
              )}
            </DialogTitle>
            <DialogDescription>
              Tambah dan kelola varian produk (ukuran, warna, berat, dll)
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {/* Form Tambah/Edit Varian */}
            <form onSubmit={handleSubmitVariant} className="border rounded-lg p-4 mb-4 bg-slate-50">
              <h3 className="font-semibold mb-3">
                {editingVariant ? "Edit Varian" : "Tambah Varian Baru"}
              </h3>
              <div className="grid grid-cols-5 gap-3">
                <FormField label="Nama Varian" required error={variantForm.errors.variantName || null}>
                  <Input
                    id="variantName"
                    value={variantForm.values.variantName as any}
                    onChange={(e) => variantForm.setField("variantName", e.target.value)}
                    onBlur={() => variantForm.handleBlur("variantName")}
                    placeholder="Berat/Ukuran/Warna"
                  />
                </FormField>
                <FormField label="Nilai Varian" required error={variantForm.errors.variantValue || null}>
                  <Input
                    id="variantValue"
                    value={variantForm.values.variantValue as any}
                    onChange={(e) => variantForm.setField("variantValue", e.target.value)}
                    onBlur={() => variantForm.handleBlur("variantValue")}
                    placeholder="1kg/Merah/S"
                  />
                </FormField>
                <FormField label="SKU" required error={variantForm.errors.sku || null}>
                  <Input
                    id="variantSku"
                    value={variantForm.values.sku as any}
                    onChange={(e) => variantForm.setField("sku", e.target.value)}
                    onBlur={() => variantForm.handleBlur("sku")}
                    placeholder="PRD-001-1KG"
                  />
                </FormField>
                <FormField label="Harga Beli" required error={variantForm.errors.purchasePrice || null}>
                  <NumericInput
                    id="variantPurchasePrice"
                    value={variantForm.values.purchasePrice as any}
                    onChange={(val) => variantForm.setField("purchasePrice", val)}
                    min={0}
                    decimals={0}
                    placeholder="50000"
                  />
                </FormField>
                <FormField label="Harga Jual" required error={variantForm.errors.sellingPrice || null}>
                  <NumericInput
                    id="variantSellingPrice"
                    value={variantForm.values.sellingPrice as any}
                    onChange={(val) => variantForm.setField("sellingPrice", val)}
                    min={0}
                    decimals={0}
                    placeholder="75000"
                  />
                </FormField>
              </div>
              <div className="flex gap-2 mt-3">
                <Button type="submit" size="sm" disabled={!variantForm.isValid}>
                  {editingVariant ? "Update Varian" : "Tambah Varian"}
                </Button>
                {editingVariant && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingVariant(null);
                      variantForm.reset();
                      if (selectedProductForVariants) {
                        variantForm.setField("purchasePrice", selectedProductForVariants.purchasePrice as any);
                        variantForm.setField("sellingPrice", selectedProductForVariants.sellingPrice as any);
                      }
                    }}
                  >
                    Batal Edit
                  </Button>
                )}
              </div>
            </form>

            {/* Daftar Varian */}
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Varian</TableHead>
                    <TableHead>Nilai</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Harga Beli</TableHead>
                    <TableHead>Harga Jual</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!variants ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                        Memuat varian...
                      </TableCell>
                    </TableRow>
                  ) : variants.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                        Belum ada varian. Tambahkan varian di form di atas.
                      </TableCell>
                    </TableRow>
                  ) : (
                    variants.map((variant) => (
                      <TableRow key={variant._id}>
                        <TableCell className="font-medium">{variant.variantName}</TableCell>
                        <TableCell>{variant.variantValue}</TableCell>
                        <TableCell className="font-mono text-sm">{variant.sku}</TableCell>
                        <TableCell className="text-slate-600">
                          {formatCurrency(variant.purchasePrice)}
                        </TableCell>
                        <TableCell className="font-medium text-green-600">
                          {formatCurrency(variant.sellingPrice)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={variant.isActive ? "default" : "secondary"}>
                            {variant.isActive ? "Aktif" : "Nonaktif"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenVariantDialog(selectedProductForVariants!, variant)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteVariant(variant._id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseVariantDialog}
            >
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
