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
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";

type Unit = {
  _id: Id<"units">;
  code: string;
  name: string;
  description?: string;
  isBase: boolean;
  isActive: boolean;
};

export default function UnitsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    description: "",
    isBase: false,
  });

  const units = useQuery(api.inventory.units.list, { includeInactive: false });
  const createUnit = useMutation(api.inventory.units.create);
  const updateUnit = useMutation(api.inventory.units.update);
  const deleteUnit = useMutation(api.inventory.units.remove);

  const filteredUnits = units?.filter((unit) =>
    unit.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    unit.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenDialog = (unit?: Unit) => {
    if (unit) {
      setEditingUnit(unit);
      setFormData({
        code: unit.code,
        name: unit.name,
        description: unit.description || "",
        isBase: unit.isBase,
      });
    } else {
      setEditingUnit(null);
      setFormData({
        code: "",
        name: "",
        description: "",
        isBase: false,
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingUnit(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingUnit) {
        await updateUnit({
          id: editingUnit._id,
          code: formData.code,
          name: formData.name,
          description: formData.description || undefined,
          isBase: formData.isBase,
        });
        toast.success("Satuan berhasil diperbarui");
      } else {
        await createUnit({
          code: formData.code,
          name: formData.name,
          description: formData.description || undefined,
          isBase: formData.isBase,
        });
        toast.success("Satuan berhasil ditambahkan");
      }
      handleCloseDialog();
    } catch (error) {
      toast.error("Terjadi kesalahan");
      console.error(error);
    }
  };

  const handleDelete = async (id: Id<"units">) => {
    if (confirm("Apakah Anda yakin ingin menghapus satuan ini?")) {
      try {
        await deleteUnit({ id });
        toast.success("Satuan berhasil dihapus");
      } catch (error) {
        toast.error("Terjadi kesalahan");
        console.error(error);
      }
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Satuan Produk</h1>
        <p className="text-muted-foreground mt-1">Kelola satuan produk (pcs, kg, liter, box, dll)</p>
      </div>

      <div className="bg-card rounded-lg border border-border shadow-sm">
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 max-w-sm relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari satuan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button onClick={() => handleOpenDialog()} className="gap-2">
              <Plus className="h-4 w-4" />
              Tambah Satuan
            </Button>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kode</TableHead>
              <TableHead>Nama</TableHead>
              <TableHead>Deskripsi</TableHead>
              <TableHead>Tipe</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!filteredUnits ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Memuat data...
                </TableCell>
              </TableRow>
            ) : filteredUnits.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Belum ada data satuan
                </TableCell>
              </TableRow>
            ) : (
              filteredUnits.map((unit) => (
                <TableRow key={unit._id}>
                  <TableCell className="font-medium">{unit.code}</TableCell>
                  <TableCell>{unit.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {unit.description || "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={unit.isBase ? "default" : "outline"}>
                      {unit.isBase ? "Satuan Dasar" : "Satuan Turunan"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={unit.isActive ? "default" : "secondary"}>
                      {unit.isActive ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialog(unit)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(unit._id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
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
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingUnit ? "Edit Satuan" : "Tambah Satuan"}
              </DialogTitle>
              <DialogDescription>
                {editingUnit
                  ? "Ubah informasi satuan produk"
                  : "Tambahkan satuan produk baru"}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="code">
                    Kode Satuan <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value.toLowerCase() })
                    }
                    placeholder="pcs, kg, liter"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="name">
                    Nama Satuan <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Pieces, Kilogram"
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
                  placeholder="Deskripsi satuan..."
                  rows={2}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isBase"
                  checked={formData.isBase}
                  onChange={(e) =>
                    setFormData({ ...formData, isBase: e.target.checked })
                  }
                  className="w-4 h-4"
                />
                <Label htmlFor="isBase" className="cursor-pointer">
                  Satuan Dasar (pcs, kg, liter, dll)
                </Label>
              </div>
              <p className="text-sm text-muted-foreground">
                * Satuan dasar tidak bisa dikonversi ke satuan lain. Satuan turunan (box, pack) bisa dikonversi ke satuan dasar.
              </p>
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
                {editingUnit ? "Simpan" : "Tambah"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
