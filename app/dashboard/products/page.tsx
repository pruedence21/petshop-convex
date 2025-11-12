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
  const [formData, setFormData] = useState({
    sku: "",
    name: "",
    description: "",
    categoryId: "",
    subcategoryId: "",
    brandId: "",
    unitId: "",
    purchasePrice: "",
    sellingPrice: "",
    minStock: "",
    maxStock: "",
    hasVariants: false,
  });

  const [variantFormData, setVariantFormData] = useState({
    variantName: "",
    variantValue: "",
    sku: "",
    purchasePrice: "",
    sellingPrice: "",
  });

  const products = useQuery(api.products.list, {
    categoryId: selectedCategory !== "all" ? selectedCategory : undefined,
    includeInactive: false,
  });
  const categories = useQuery(api.productCategories.list, { includeInactive: false });
  const subcategories = useQuery(
    api.productSubcategories.list,
    formData.categoryId
      ? { categoryId: formData.categoryId as Id<"productCategories">, includeInactive: false }
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

  const handleOpenDialog = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        sku: product.sku,
        name: product.name,
        description: product.description || "",
        categoryId: product.categoryId,
        subcategoryId: product.subcategoryId || "",
        brandId: product.brandId,
        unitId: product.unitId,
        purchasePrice: product.purchasePrice.toString(),
        sellingPrice: product.sellingPrice.toString(),
        minStock: product.minStock.toString(),
        maxStock: product.maxStock.toString(),
        hasVariants: product.hasVariants,
      });
    } else {
      setEditingProduct(null);
      setFormData({
        sku: "",
        name: "",
        description: "",
        categoryId: "",
        subcategoryId: "",
        brandId: "",
        unitId: "",
        purchasePrice: "",
        sellingPrice: "",
        minStock: "10",
        maxStock: "100",
        hasVariants: false,
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingProduct(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.categoryId || !formData.brandId || !formData.unitId) {
      toast.error("Mohon lengkapi semua field yang wajib");
      return;
    }

    try {
      const payload = {
        sku: formData.sku,
        name: formData.name,
        description: formData.description || undefined,
        categoryId: formData.categoryId as Id<"productCategories">,
        subcategoryId: formData.subcategoryId
          ? (formData.subcategoryId as Id<"productSubcategories">)
          : undefined,
        brandId: formData.brandId as Id<"brands">,
        unitId: formData.unitId as Id<"units">,
        purchasePrice: parseFloat(formData.purchasePrice),
        sellingPrice: parseFloat(formData.sellingPrice),
        minStock: parseFloat(formData.minStock),
        maxStock: parseFloat(formData.maxStock),
        hasVariants: formData.hasVariants,
      };

      if (editingProduct) {
        await updateProduct({
          id: editingProduct._id,
          ...payload,
        });
        toast.success("Produk berhasil diperbarui");
      } else {
        await createProduct(payload);
        toast.success("Produk berhasil ditambahkan");
      }
      handleCloseDialog();
    } catch (error) {
      toast.error("Terjadi kesalahan");
      console.error(error);
    }
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
      setVariantFormData({
        variantName: variant.variantName,
        variantValue: variant.variantValue,
        sku: variant.sku,
        purchasePrice: variant.purchasePrice.toString(),
        sellingPrice: variant.sellingPrice.toString(),
      });
    } else {
      setEditingVariant(null);
      setVariantFormData({
        variantName: "",
        variantValue: "",
        sku: "",
        purchasePrice: product.purchasePrice.toString(),
        sellingPrice: product.sellingPrice.toString(),
      });
    }
    setIsVariantDialogOpen(true);
  };

  const handleCloseVariantDialog = () => {
    setIsVariantDialogOpen(false);
    setEditingVariant(null);
    setSelectedProductForVariants(null);
  };

  const handleSubmitVariant = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProductForVariants) return;

    try {
      const payload = {
        variantName: variantFormData.variantName,
        variantValue: variantFormData.variantValue,
        sku: variantFormData.sku,
        purchasePrice: parseFloat(variantFormData.purchasePrice),
        sellingPrice: parseFloat(variantFormData.sellingPrice),
      };

      if (editingVariant) {
        await updateVariant({
          id: editingVariant._id,
          ...payload,
        });
        toast.success("Varian berhasil diperbarui");
      } else {
        await createVariant({
          productId: selectedProductForVariants._id,
          ...payload,
        });
        toast.success("Varian berhasil ditambahkan");
      }
      handleCloseVariantDialog();
    } catch (error: any) {
      toast.error(error.message || "Terjadi kesalahan");
      console.error(error);
    }
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
                      {category.icon} {category.name}
                    </SelectItem>
                  ))}
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
                <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                  Memuat data...
                </TableCell>
              </TableRow>
            ) : filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-slate-500">
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
                <div className="grid gap-2">
                  <Label htmlFor="sku">
                    SKU <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="sku"
                    value={formData.sku}
                    onChange={(e) =>
                      setFormData({ ...formData, sku: e.target.value.toUpperCase() })
                    }
                    placeholder="PRD-001"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="name">
                    Nama Produk <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Royal Canin Adult 2kg"
                    required
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Deskripsi</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Deskripsi produk..."
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="categoryId">
                    Kategori <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.categoryId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, categoryId: value, subcategoryId: "" })
                    }
                    required
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
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="subcategoryId">Sub Kategori</Label>
                  <Select
                    value={formData.subcategoryId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, subcategoryId: value })
                    }
                    disabled={!formData.categoryId}
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
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="brandId">
                    Merek <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.brandId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, brandId: value })
                    }
                    required
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
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="unitId">
                    Satuan <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.unitId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, unitId: value })
                    }
                    required
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
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="purchasePrice">
                    Harga Beli <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="purchasePrice"
                    type="number"
                    value={formData.purchasePrice}
                    onChange={(e) =>
                      setFormData({ ...formData, purchasePrice: e.target.value })
                    }
                    placeholder="50000"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="sellingPrice">
                    Harga Jual <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="sellingPrice"
                    type="number"
                    value={formData.sellingPrice}
                    onChange={(e) =>
                      setFormData({ ...formData, sellingPrice: e.target.value })
                    }
                    placeholder="75000"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="minStock">
                    Stok Minimum <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="minStock"
                    type="number"
                    value={formData.minStock}
                    onChange={(e) =>
                      setFormData({ ...formData, minStock: e.target.value })
                    }
                    placeholder="10"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="maxStock">
                    Stok Maximum <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="maxStock"
                    type="number"
                    value={formData.maxStock}
                    onChange={(e) =>
                      setFormData({ ...formData, maxStock: e.target.value })
                    }
                    placeholder="100"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label>&nbsp;</Label>
                  <div className="flex items-center gap-2 h-10">
                    <input
                      type="checkbox"
                      id="hasVariants"
                      checked={formData.hasVariants}
                      onChange={(e) =>
                        setFormData({ ...formData, hasVariants: e.target.checked })
                      }
                      className="w-4 h-4"
                    />
                    <Label htmlFor="hasVariants" className="cursor-pointer">
                      Memiliki Varian
                    </Label>
                  </div>
                </div>
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
              <Button type="submit">
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
                <div className="grid gap-2">
                  <Label htmlFor="variantName">
                    Nama Varian <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="variantName"
                    value={variantFormData.variantName}
                    onChange={(e) =>
                      setVariantFormData({ ...variantFormData, variantName: e.target.value })
                    }
                    placeholder="Berat/Ukuran/Warna"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="variantValue">
                    Nilai Varian <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="variantValue"
                    value={variantFormData.variantValue}
                    onChange={(e) =>
                      setVariantFormData({ ...variantFormData, variantValue: e.target.value })
                    }
                    placeholder="1kg/Merah/S"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="variantSku">
                    SKU <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="variantSku"
                    value={variantFormData.sku}
                    onChange={(e) =>
                      setVariantFormData({ ...variantFormData, sku: e.target.value.toUpperCase() })
                    }
                    placeholder="PRD-001-1KG"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="variantPurchasePrice">Harga Beli</Label>
                  <Input
                    id="variantPurchasePrice"
                    type="number"
                    value={variantFormData.purchasePrice}
                    onChange={(e) =>
                      setVariantFormData({ ...variantFormData, purchasePrice: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="variantSellingPrice">Harga Jual</Label>
                  <Input
                    id="variantSellingPrice"
                    type="number"
                    value={variantFormData.sellingPrice}
                    onChange={(e) =>
                      setVariantFormData({ ...variantFormData, sellingPrice: e.target.value })
                    }
                    required
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <Button type="submit" size="sm">
                  {editingVariant ? "Update Varian" : "Tambah Varian"}
                </Button>
                {editingVariant && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingVariant(null);
                      setVariantFormData({
                        variantName: "",
                        variantValue: "",
                        sku: "",
                        purchasePrice: selectedProductForVariants?.purchasePrice.toString() || "",
                        sellingPrice: selectedProductForVariants?.sellingPrice.toString() || "",
                      });
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
