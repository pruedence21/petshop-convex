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
import { Search, Package, AlertTriangle, Plus, Minus, ArrowRightLeft } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { formatErrorMessage } from "@/lib/error-handling";

type DialogType = "adjust" | "transfer" | null;

export default function StockPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBranch, setSelectedBranch] = useState<Id<"branches"> | "">("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [dialogType, setDialogType] = useState<DialogType>(null);
  const [selectedStock, setSelectedStock] = useState<any>(null);

  const [adjustForm, setAdjustForm] = useState({
    quantity: 0,
    notes: "",
    batchNumber: "",
    expiredDate: "",
  });

  const [transferForm, setTransferForm] = useState({
    toBranchId: "",
    quantity: 0,
    notes: "",
  });

  const branches = useQuery(api.master_data.branches.list, { includeInactive: false });
  const stocks = useQuery(
    api.inventory.productStock.getByBranch,
    selectedBranch
      ? { branchId: selectedBranch, lowStockOnly }
      : "skip"
  );

  const adjustStock = useMutation(api.inventory.productStock.adjustStock);
  const transferStock = useMutation(api.inventory.productStock.transferStock);

  const filteredStocks = stocks?.filter((stock: any) =>
    stock.product?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    stock.product?.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
    stock.variant?.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenAdjustDialog = (stock: any) => {
    setSelectedStock(stock);
    setAdjustForm({ quantity: 0, notes: "", batchNumber: "", expiredDate: "" });
    setDialogType("adjust");
  };

  const handleOpenTransferDialog = (stock: any) => {
    setSelectedStock(stock);
    setTransferForm({ toBranchId: "", quantity: 0, notes: "" });
    setDialogType("transfer");
  };

  const handleCloseDialog = () => {
    setDialogType(null);
    setSelectedStock(null);
  };

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedStock || !selectedBranch) return;

    if (adjustForm.quantity === 0) {
      toast.error("Jumlah tidak boleh 0");
      return;
    }

    try {
      await adjustStock({
        branchId: selectedBranch,
        productId: selectedStock.productId,
        variantId: selectedStock.variantId,
        quantity: adjustForm.quantity,
        notes: adjustForm.notes || undefined,
        batchNumber: adjustForm.batchNumber || undefined,
        expiredDate: adjustForm.expiredDate ? new Date(adjustForm.expiredDate).getTime() : undefined,
      });

      toast.success("Stok berhasil disesuaikan");
      handleCloseDialog();
    } catch (error: any) {
      toast.error(formatErrorMessage(error));
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedStock || !selectedBranch) return;

    if (!transferForm.toBranchId) {
      toast.error("Pilih cabang tujuan");
      return;
    }

    if (transferForm.quantity <= 0) {
      toast.error("Jumlah harus lebih dari 0");
      return;
    }

    try {
      await transferStock({
        fromBranchId: selectedBranch,
        toBranchId: transferForm.toBranchId as Id<"branches">,
        productId: selectedStock.productId,
        variantId: selectedStock.variantId,
        quantity: transferForm.quantity,
        notes: transferForm.notes || undefined,
      });

      toast.success("Stok berhasil ditransfer");
      handleCloseDialog();
    } catch (error: any) {
      toast.error(formatErrorMessage(error));
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Manajemen Stok</h1>
        <p className="text-slate-500 mt-1">Kelola stok produk per cabang</p>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between gap-4 mb-4">
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
                value={selectedBranch}
                onValueChange={(value) => setSelectedBranch(value as Id<"branches">)}
              >
                <SelectTrigger className="w-64">
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
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="lowStockOnly"
                  checked={lowStockOnly}
                  onChange={(e) => setLowStockOnly(e.target.checked)}
                  className="w-4 h-4"
                />
                <Label htmlFor="lowStockOnly" className="cursor-pointer text-sm">
                  Stok Rendah Saja
                </Label>
              </div>
            </div>
          </div>

          {!selectedBranch && (
            <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg">
              <p className="text-sm">Pilih cabang untuk melihat stok</p>
            </div>
          )}
        </div>

        {selectedBranch && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produk</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Varian</TableHead>
                <TableHead className="text-right">Stok</TableHead>
                <TableHead className="text-right">Avg Cost</TableHead>
                <TableHead className="text-right">Min/Max</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Update</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!filteredStocks ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-slate-500">
                    Memuat data...
                  </TableCell>
                </TableRow>
              ) : filteredStocks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-slate-500">
                    Belum ada data stok
                  </TableCell>
                </TableRow>
              ) : (
                filteredStocks.map((stock: any) => (
                  <TableRow key={stock._id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-slate-400" />
                        <span className="font-medium">{stock.product?.name || "-"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {stock.variant?.sku || stock.product?.sku || "-"}
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {stock.variant
                        ? `${stock.variant.variantName}: ${stock.variant.variantValue}`
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {stock.quantity}
                    </TableCell>
                    <TableCell className="text-right text-slate-600">
                      {formatCurrency(stock.averageCost)}
                    </TableCell>
                    <TableCell className="text-right text-xs text-slate-500">
                      {stock.product?.minStock} / {stock.product?.maxStock}
                    </TableCell>
                    <TableCell>
                      {stock.isLowStock ? (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Low Stock
                        </Badge>
                      ) : (
                        <Badge variant="default">Normal</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {formatDateTime(stock.lastUpdated)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenAdjustDialog(stock)}
                          className="gap-1"
                        >
                          <Plus className="h-3 w-3" />
                          Adjust
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenTransferDialog(stock)}
                          className="gap-1"
                        >
                          <ArrowRightLeft className="h-3 w-3" />
                          Transfer
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Adjust Stock Dialog */}
      <Dialog open={dialogType === "adjust"} onOpenChange={() => handleCloseDialog()}>
        <DialogContent>
          <form onSubmit={handleAdjust}>
            <DialogHeader>
              <DialogTitle>Penyesuaian Stok</DialogTitle>
              <DialogDescription>
                Produk: <strong>{selectedStock?.product?.name}</strong>
                {selectedStock?.variant && (
                  <> - {selectedStock.variant.variantName}: {selectedStock.variant.variantValue}</>
                )}
                <br />
                Stok Saat Ini: <strong>{selectedStock?.quantity || 0}</strong>
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="quantity">
                  Jumlah Penyesuaian <span className="text-red-500">*</span>
                </Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setAdjustForm({ ...adjustForm, quantity: adjustForm.quantity - 1 })}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    id="quantity"
                    type="number"
                    value={adjustForm.quantity}
                    onChange={(e) =>
                      setAdjustForm({ ...adjustForm, quantity: parseFloat(e.target.value) || 0 })
                    }
                    placeholder="0"
                    className="text-center font-semibold"
                    required
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setAdjustForm({ ...adjustForm, quantity: adjustForm.quantity + 1 })}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-slate-500">
                  Positif untuk menambah, negatif untuk mengurangi stok
                </p>
              </div>

              {selectedStock?.product?.hasExpiry && adjustForm.quantity > 0 && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="batchNumber">
                      Nomor Batch <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="batchNumber"
                      value={adjustForm.batchNumber}
                      onChange={(e) =>
                        setAdjustForm({ ...adjustForm, batchNumber: e.target.value })
                      }
                      placeholder="BATCH-001"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="expiredDate">
                      Tanggal Kadaluarsa <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="expiredDate"
                      type="date"
                      value={adjustForm.expiredDate}
                      onChange={(e) =>
                        setAdjustForm({ ...adjustForm, expiredDate: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>
              )}
              <div className="grid gap-2">
                <Label htmlFor="notes">Catatan</Label>
                <Textarea
                  id="notes"
                  value={adjustForm.notes}
                  onChange={(e) =>
                    setAdjustForm({ ...adjustForm, notes: e.target.value })
                  }
                  placeholder="Alasan penyesuaian..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Batal
              </Button>
              <Button type="submit">Simpan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Transfer Stock Dialog */}
      <Dialog open={dialogType === "transfer"} onOpenChange={() => handleCloseDialog()}>
        <DialogContent>
          <form onSubmit={handleTransfer}>
            <DialogHeader>
              <DialogTitle>Transfer Stok Antar Cabang</DialogTitle>
              <DialogDescription>
                Produk: <strong>{selectedStock?.product?.name}</strong>
                {selectedStock?.variant && (
                  <> - {selectedStock.variant.variantName}: {selectedStock.variant.variantValue}</>
                )}
                <br />
                Stok Tersedia: <strong>{selectedStock?.quantity || 0}</strong>
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="toBranchId">
                  Cabang Tujuan <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={transferForm.toBranchId}
                  onValueChange={(value) =>
                    setTransferForm({ ...transferForm, toBranchId: value })
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih cabang tujuan" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches
                      ?.filter((b) => b._id !== selectedBranch)
                      .map((branch) => (
                        <SelectItem key={branch._id} value={branch._id}>
                          {branch.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="transferQty">
                  Jumlah Transfer <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="transferQty"
                  type="number"
                  value={transferForm.quantity}
                  onChange={(e) =>
                    setTransferForm({ ...transferForm, quantity: parseFloat(e.target.value) || 0 })
                  }
                  placeholder="0"
                  max={selectedStock?.quantity || 0}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="transferNotes">Catatan</Label>
                <Textarea
                  id="transferNotes"
                  value={transferForm.notes}
                  onChange={(e) =>
                    setTransferForm({ ...transferForm, notes: e.target.value })
                  }
                  placeholder="Alasan transfer..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Batal
              </Button>
              <Button type="submit">Transfer</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
