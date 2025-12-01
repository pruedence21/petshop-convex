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
import { Plus, Pencil, Trash2, Search, Package } from "lucide-react";
import { toast } from "sonner";

type ProductCategory = {
  _id: Id<"productCategories">;
  code: string;
  name: string;
  description?: string;
  icon?: string;
  isActive: boolean;
};

export default function ProductCategoriesPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    description: "",
    icon: "",
  });

  const categories = useQuery(api.inventory.productCategories.list, { includeInactive: false });
  const createCategory = useMutation(api.inventory.productCategories.create);
  const updateCategory = useMutation(api.inventory.productCategories.update);
  const deleteCategory = useMutation(api.inventory.productCategories.remove);

  const filteredCategories = categories?.filter((cat) =>
    cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cat.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenDialog = (category?: ProductCategory) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        code: category.code,
        name: category.name,
        description: category.description || "",
        icon: category.icon || "",
      });
    } else {
      setEditingCategory(null);
      setFormData({ code: "", name: "", description: "", icon: "" });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingCategory(null);
    setFormData({ code: "", name: "", description: "", icon: "" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingCategory) {
        await updateCategory({
          id: editingCategory._id,
          code: formData.code,
          name: formData.name,
          description: formData.description || undefined,
          icon: formData.icon || undefined,
        });
        toast.success("Kategori produk berhasil diperbarui");
      } else {
        await createCategory({
          code: formData.code,
          name: formData.name,
          description: formData.description || undefined,
          icon: formData.icon || undefined,
        });
        toast.success("Kategori produk berhasil ditambahkan");
      }
      handleCloseDialog();
    } catch (error) {
      toast.error("Terjadi kesalahan");
      console.error(error);
    }
  };

  const handleDelete = async (id: Id<"productCategories">) => {
    if (confirm("Apakah Anda yakin ingin menghapus kategori ini?")) {
      try {
        await deleteCategory({ id });
        toast.success("Kategori produk berhasil dihapus");
      } catch (error) {
        toast.error("Terjadi kesalahan");
        console.error(error);
      }
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Kategori Produk</h1>
        <p className="text-muted-foreground mt-1">Kelola kategori produk petshop (Makanan, Mainan, Aksesoris, dll)</p>
      </div>

      <div className="bg-card rounded-lg border border-border shadow-sm">
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 max-w-sm relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari kategori..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button onClick={() => handleOpenDialog()} className="gap-2">
              <Plus className="h-4 w-4" />
              Tambah Kategori
            </Button>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kode</TableHead>
              <TableHead>Nama</TableHead>
              <TableHead>Deskripsi</TableHead>
              <TableHead>Icon</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!filteredCategories ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Memuat data...
                </TableCell>
              </TableRow>
            ) : filteredCategories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Belum ada data kategori
                </TableCell>
              </TableRow>
            ) : (
              filteredCategories.map((category) => (
                <TableRow key={category._id}>
                  <TableCell className="font-medium">{category.code}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      {category.name}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {category.description || "-"}
                  </TableCell>
                  <TableCell>
                    {category.icon ? (
                      <span className="text-2xl">{category.icon}</span>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={category.isActive ? "default" : "secondary"}>
                      {category.isActive ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialog(category)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(category._id)}
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
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingCategory ? "Edit Kategori" : "Tambah Kategori"}
              </DialogTitle>
              <DialogDescription>
                {editingCategory
                  ? "Ubah informasi kategori produk"
                  : "Tambahkan kategori produk baru"}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="code">
                    Kode Kategori <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value.toUpperCase() })
                    }
                    placeholder="CAT-001"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="icon">Icon (Emoji)</Label>
                  <Input
                    id="icon"
                    value={formData.icon}
                    onChange={(e) =>
                      setFormData({ ...formData, icon: e.target.value })
                    }
                    placeholder="🍖 🧸 🎾"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="name">
                  Nama Kategori <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Makanan, Mainan, Aksesoris, dll"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Deskripsi</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Deskripsi kategori..."
                  rows={3}
                />
              </div>
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>Contoh Kategori:</strong><br />
                  • Makanan & Minuman<br />
                  • Mainan & Permainan<br />
                  • Aksesoris & Pakaian<br />
                  • Kesehatan & Obat-obatan<br />
                  • Perawatan & Grooming<br />
                  • Kandang & Tempat Tidur
                </p>
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
                {editingCategory ? "Simpan" : "Tambah"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
