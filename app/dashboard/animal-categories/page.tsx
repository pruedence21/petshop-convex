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

type AnimalCategory = {
  _id: Id<"animalCategories">;
  _creationTime: number;
  name: string;
  description?: string;
  icon?: string;
  isActive: boolean;
  deletedAt?: number;
};

export default function AnimalCategoriesPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<AnimalCategory | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    icon: "",
  });

  const categories = useQuery(api.clinic.animalCategories.list, { includeInactive: false });
  const createCategory = useMutation(api.clinic.animalCategories.create);
  const updateCategory = useMutation(api.clinic.animalCategories.update);
  const deleteCategory = useMutation(api.clinic.animalCategories.remove);

  const filteredCategories = categories?.filter((cat) =>
    cat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenDialog = (category?: AnimalCategory) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        description: category.description || "",
        icon: category.icon || "",
      });
    } else {
      setEditingCategory(null);
      setFormData({ name: "", description: "", icon: "" });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingCategory(null);
    setFormData({ name: "", description: "", icon: "" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingCategory) {
        await updateCategory({
          id: editingCategory._id,
          name: formData.name,
          description: formData.description || undefined,
          icon: formData.icon || undefined,
        });
        toast.success("Kategori berhasil diperbarui");
      } else {
        await createCategory({
          name: formData.name,
          description: formData.description || undefined,
          icon: formData.icon || undefined,
        });
        toast.success("Kategori berhasil ditambahkan");
      }
      handleCloseDialog();
    } catch (error) {
      toast.error("Terjadi kesalahan");
      console.error(error);
    }
  };

  const handleDelete = async (id: Id<"animalCategories">) => {
    if (confirm("Apakah Anda yakin ingin menghapus kategori ini?")) {
      try {
        await deleteCategory({ id });
        toast.success("Kategori berhasil dihapus");
      } catch (error) {
        toast.error("Terjadi kesalahan");
        console.error(error);
      }
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Jenis Hewan</h1>
        <p className="text-muted-foreground mt-1">Kelola kategori jenis hewan peliharaan</p>
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
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Memuat data...
                </TableCell>
              </TableRow>
            ) : filteredCategories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Belum ada data kategori
                </TableCell>
              </TableRow>
            ) : (
              filteredCategories.map((category) => (
                <TableRow key={category._id}>
                  <TableCell className="font-medium">{category.name}</TableCell>
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
                {editingCategory ? "Edit Kategori" : "Tambah Kategori"}
              </DialogTitle>
              <DialogDescription>
                {editingCategory
                  ? "Ubah informasi kategori jenis hewan"
                  : "Tambahkan kategori jenis hewan baru"}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">
                  Nama Kategori <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Contoh: Anjing, Kucing, Burung"
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
                  placeholder="🐕 🐈 🐦 🐠"
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

