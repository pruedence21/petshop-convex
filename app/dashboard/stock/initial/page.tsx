"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Search, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function InitialStockPage() {
    const [selectedBranch, setSelectedBranch] = useState<Id<"branches"> | "">("");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [selectedVariant, setSelectedVariant] = useState<any>(null);
    const [form, setForm] = useState({
        quantity: 0,
        unitCost: 0,
        batchNumber: "",
        expiredDate: "",
        notes: "",
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const branches = useQuery(api.master_data.branches.list, { includeInactive: false });
    // FIX: Use api.inventory instead of api.master_data
    const products = useQuery(api.inventory.products.list, { includeInactive: false });

    // Filter products based on search
    const filteredProducts = products?.filter((p: any) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 10); // Limit to 10 for performance in dropdown

    const variants = useQuery(
        api.inventory.productVariants.listByProduct,
        selectedProduct ? { productId: selectedProduct._id } : "skip"
    );

    const addInitialStock = useMutation(api.inventory.productStock.addInitialStock);

    const handleProductSelect = (productId: string) => {
        // FIX: Add type annotation or cast
        const product = products?.find((p: any) => p._id === productId);
        setSelectedProduct(product);
        setSelectedVariant(null);
        setForm(prev => ({
            ...prev,
            unitCost: product?.purchasePrice || 0
        }));
    };

    const handleVariantSelect = (variantId: string) => {
        // FIX: Add type annotation or cast
        const variant = variants?.find((v: any) => v._id === variantId);
        setSelectedVariant(variant);
        if (variant) {
            setForm(prev => ({
                ...prev,
                unitCost: variant.purchasePrice || selectedProduct?.purchasePrice || 0
            }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedBranch || !selectedProduct) {
            toast.error("Mohon lengkapi data");
            return;
        }

        if (form.quantity <= 0) {
            toast.error("Jumlah harus lebih dari 0");
            return;
        }

        if (selectedProduct.hasVariants && !selectedVariant) {
            toast.error("Mohon pilih varian produk");
            return;
        }

        if (selectedProduct.hasExpiry && (!form.batchNumber || !form.expiredDate)) {
            toast.error("Produk ini memerlukan nomor batch dan tanggal kadaluarsa");
            return;
        }

        setIsSubmitting(true);
        try {
            await addInitialStock({
                branchId: selectedBranch as Id<"branches">,
                productId: selectedProduct._id,
                variantId: selectedVariant?._id,
                quantity: form.quantity,
                unitCost: form.unitCost,
                batchNumber: form.batchNumber || undefined,
                expiredDate: form.expiredDate ? new Date(form.expiredDate).getTime() : undefined,
                notes: form.notes || undefined,
            });

            toast.success("Stok awal berhasil ditambahkan");
            // Reset form but keep branch
            setForm({
                quantity: 0,
                unitCost: 0,
                batchNumber: "",
                expiredDate: "",
                notes: "",
            });
            setSelectedProduct(null);
            setSelectedVariant(null);
            setSearchQuery("");
        } catch (error: any) {
            toast.error(error.message || "Gagal menambahkan stok awal");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="p-8 max-w-3xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900">Input Stok Awal</h1>
                <p className="text-slate-500 mt-1">
                    Masukkan stok awal produk (Modal Awal). Transaksi ini akan menambah stok dan modal.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Form Stok Awal</CardTitle>
                    <CardDescription>Isi detail produk dan stok awal</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Branch Selection */}
                        <div className="space-y-2">
                            <Label>Cabang <span className="text-red-500">*</span></Label>
                            <Select
                                value={selectedBranch}
                                onValueChange={(val) => setSelectedBranch(val as Id<"branches">)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Pilih Cabang" />
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

                        {/* Product Search & Selection */}
                        <div className="space-y-2">
                            <Label>Cari Produk <span className="text-red-500">*</span></Label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    placeholder="Ketik nama atau SKU produk..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                            {searchQuery && filteredProducts && filteredProducts.length > 0 && !selectedProduct && (
                                <div className="border rounded-md mt-1 max-h-48 overflow-y-auto bg-white shadow-sm absolute z-10 w-full max-w-[calc(100%-4rem)]">
                                    {filteredProducts.map((product: any) => (
                                        <div
                                            key={product._id}
                                            className="p-2 hover:bg-slate-50 cursor-pointer border-b last:border-0"
                                            onClick={() => {
                                                handleProductSelect(product._id);
                                                setSearchQuery(product.name);
                                            }}
                                        >
                                            <div className="font-medium">{product.name}</div>
                                            <div className="text-xs text-slate-500">{product.sku}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {selectedProduct && (
                                <div className="bg-blue-50 p-3 rounded-md flex justify-between items-center mt-2">
                                    <div>
                                        <div className="font-bold text-blue-700">{selectedProduct.name}</div>
                                        <div className="text-sm text-blue-600">{selectedProduct.sku}</div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-blue-600 hover:text-blue-800"
                                        onClick={() => {
                                            setSelectedProduct(null);
                                            setSelectedVariant(null);
                                            setSearchQuery("");
                                        }}
                                    >
                                        Ganti
                                    </Button>
                                </div>
                            )}
                        </div>

                        {/* Variant Selection (if applicable) */}
                        {selectedProduct?.hasVariants && (
                            <div className="space-y-2">
                                <Label>Varian <span className="text-red-500">*</span></Label>
                                <Select
                                    value={selectedVariant?._id || ""}
                                    onValueChange={handleVariantSelect}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Pilih Varian" />
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
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            {/* Quantity */}
                            <div className="space-y-2">
                                <Label>Jumlah Stok <span className="text-red-500">*</span></Label>
                                <Input
                                    type="number"
                                    min="1"
                                    value={form.quantity}
                                    onChange={(e) => setForm({ ...form, quantity: parseFloat(e.target.value) || 0 })}
                                    className="font-semibold"
                                />
                            </div>

                            {/* Unit Cost */}
                            <div className="space-y-2">
                                <Label>Harga Pokok (Per Unit) <span className="text-red-500">*</span></Label>
                                <Input
                                    type="number"
                                    min="0"
                                    value={form.unitCost}
                                    onChange={(e) => setForm({ ...form, unitCost: parseFloat(e.target.value) || 0 })}
                                />
                                <p className="text-xs text-slate-500">
                                    Total Modal: {formatCurrency(form.quantity * form.unitCost)}
                                </p>
                            </div>
                        </div>

                        {/* Batch & Expiry (if applicable) */}
                        {selectedProduct?.hasExpiry && (
                            <div className="grid grid-cols-2 gap-4 p-4 bg-yellow-50 rounded-md border border-yellow-100">
                                <div className="space-y-2">
                                    <Label>Nomor Batch <span className="text-red-500">*</span></Label>
                                    <Input
                                        value={form.batchNumber}
                                        onChange={(e) => setForm({ ...form, batchNumber: e.target.value })}
                                        placeholder="Contoh: BATCH-001"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Tanggal Kadaluarsa <span className="text-red-500">*</span></Label>
                                    <Input
                                        type="date"
                                        value={form.expiredDate}
                                        onChange={(e) => setForm({ ...form, expiredDate: e.target.value })}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Notes */}
                        <div className="space-y-2">
                            <Label>Catatan</Label>
                            <Textarea
                                value={form.notes}
                                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                                placeholder="Catatan tambahan..."
                                rows={3}
                            />
                        </div>

                        <Button type="submit" className="w-full" disabled={isSubmitting}>
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Menyimpan...
                                </>
                            ) : (
                                "Simpan Stok Awal"
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
