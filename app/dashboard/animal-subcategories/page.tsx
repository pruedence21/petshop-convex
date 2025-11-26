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
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";

type AnimalSubcategory = {
  _id: Id<"animalSubcategories">;
  categoryId: Id<"animalCategories">;
  name: string;
  description?: string;
  isActive: boolean;
};

export default function AnimalSubcategoriesPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSubcategory, setEditingSubcategory] = useState<AnimalSubcategory | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<Id<"animalCategories"> | "all">("all");
  const [formData, setFormData] = useState({
    categoryId: "",
    name: "",
    description: "",
  });

  const subcategories = useQuery(api.clinic.animalSubcategories.list, {
    categoryId: selectedCategory !== "all" ? selectedCategory : undefined,
    includeInactive: false,
  });
  const categories = useQuery(api.clinic.animalCategories.list, { includeInactive: false });
  const createSubcategory = useMutation(api.clinic.animalSubcategories.create);
  const updateSubcategory = useMutation(api.clinic.animalSubcategories.update);
  const deleteSubcategory = useMutation(api.clinic.animalSubcategories.remove);

  const filteredSubcategories = subcategories?.filter((sub) =>
    sub.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenDialog = (subcategory?: AnimalSubcategory) => {
    if (subcategory) {
      setEditingSubcategory(subcategory);
      setFormData({
        categoryId: subcategory.categoryId,
        name: subcategory.name,
        description: subcategory.description || "",
      });
    } else {
      setEditingSubcategory(null);
      setFormData({
        categoryId: "",
        name: "",
        description: "",
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingSubcategory(null);
    setFormData({ categoryId: "", name: "", description: "" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.categoryId) {
      toast.error("Mohon pilih kategori hewan");
      return;
    }

    try {
      if (editingSubcategory) {
        await updateSubcategory({
          id: editingSubcategory._id,
          categoryId: formData.categoryId as Id<"animalCategories">,
          name: formData.name,
          description: formData.description || undefined,
        });
        toast.success("Sub-kategori berhasil diperbarui");
      } else {
        await createSubcategory({
          categoryId: formData.categoryId as Id<"animalCategories">,
          name: formData.name,
          description: formData.description || undefined,
        });
        toast.success("Sub-kategori berhasil ditambahkan");
      }
      handleCloseDialog();
    } catch (error) {
      toast.error("Terjadi kesalahan");
      console.error(error);
    }
  };

  const handleDelete = async (id: Id<"animalSubcategories">) => {
    if (confirm("Apakah Anda yakin ingin menghapus sub-kategori ini?")) {
      try {
        await deleteSubcategory({ id });
        toast.success("Sub-kategori berhasil dihapus");
      } catch (error) {
        toast.error("Terjadi kesalahan");
        console.error(error);
      }
    }
  };

  const getCategoryName = (categoryId: Id<"animalCategories">) => {
    const category = categories?.find((c) => c._id === categoryId);
    return category ? `${category.icon || ""} ${category.name}` : "-";
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Sub-Kategori Hewan</h1>
        <p className="text-slate-500 mt-1">Kelola sub-kategori/ras jenis hewan peliharaan</p>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1">
              <div className="flex-1 max-w-sm relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Cari sub-kategori..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select
                value={selectedCategory === "all" ? "all" : selectedCategory}
                onValueChange={(value) =>
                  setSelectedCategory(value === "all" ? "all" : value as Id<"animalCategories">)
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
              Tambah Sub-Kategori
            </Button>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kategori</TableHead>
              <TableHead>Nama Sub-Kategori</TableHead>
              <TableHead>Deskripsi</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!filteredSubcategories ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                  Memuat data...
                </TableCell>
              </TableRow>
            ) : filteredSubcategories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                  Belum ada data sub-kategori
                </TableCell>
              </TableRow>
            ) : (
              filteredSubcategories.map((subcategory) => (
                <TableRow key={subcategory._id}>
                  <TableCell className="font-medium">
                    {getCategoryName(subcategory.categoryId)}
                  </TableCell>
                  <TableCell>{subcategory.name}</TableCell>
                  <TableCell className="text-slate-600">
                    {subcategory.description || "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={subcategory.isActive ? "default" : "secondary"}>
                      {subcategory.isActive ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialog(subcategory)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(subcategory._id)}
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
                {editingSubcategory ? "Edit Sub-Kategori" : "Tambah Sub-Kategori"}
              </DialogTitle>
              <DialogDescription>
                {editingSubcategory
                  ? "Ubah informasi sub-kategori hewan"
                  : "Tambahkan sub-kategori/ras hewan baru"}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="categoryId">
                  Kategori Hewan <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.categoryId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, categoryId: value })
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
                <Label htmlFor="name">
                  Nama Sub-Kategori <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Contoh: Golden Retriever, Persian, Murai Batu"
                  required
                />
                <p className="text-xs text-slate-500">
                  Isi dengan ras atau jenis spesifik dari kategori hewan
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Deskripsi</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Deskripsi sub-kategori..."
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
                {editingSubcategory ? "Simpan" : "Tambah"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

