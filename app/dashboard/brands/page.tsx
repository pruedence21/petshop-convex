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

type Brand = {
  _id: Id<"brands">;
  code: string;
  name: string;
  description?: string;
  logo?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  website?: string;
  isActive: boolean;
};

export default function BrandsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    description: "",
    contactPerson: "",
    phone: "",
    email: "",
    website: "",
  });

  const brands = useQuery(api.inventory.brands.list, { includeInactive: false });
  const createBrand = useMutation(api.inventory.brands.create);
  const updateBrand = useMutation(api.inventory.brands.update);
  const deleteBrand = useMutation(api.inventory.brands.remove);

  const filteredBrands = brands?.filter((brand) =>
    brand.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    brand.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenDialog = (brand?: Brand) => {
    if (brand) {
      setEditingBrand(brand);
      setFormData({
        code: brand.code,
        name: brand.name,
        description: brand.description || "",
        contactPerson: brand.contactPerson || "",
        phone: brand.phone || "",
        email: brand.email || "",
        website: brand.website || "",
      });
    } else {
      setEditingBrand(null);
      setFormData({
        code: "",
        name: "",
        description: "",
        contactPerson: "",
        phone: "",
        email: "",
        website: "",
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingBrand(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingBrand) {
        await updateBrand({
          id: editingBrand._id,
          code: formData.code,
          name: formData.name,
          description: formData.description || undefined,
          contactPerson: formData.contactPerson || undefined,
          phone: formData.phone || undefined,
          email: formData.email || undefined,
          website: formData.website || undefined,
        });
        toast.success("Merek berhasil diperbarui");
      } else {
        await createBrand({
          code: formData.code,
          name: formData.name,
          description: formData.description || undefined,
          contactPerson: formData.contactPerson || undefined,
          phone: formData.phone || undefined,
          email: formData.email || undefined,
          website: formData.website || undefined,
        });
        toast.success("Merek berhasil ditambahkan");
      }
      handleCloseDialog();
    } catch (error) {
      toast.error("Terjadi kesalahan");
      console.error(error);
    }
  };

  const handleDelete = async (id: Id<"brands">) => {
    if (confirm("Apakah Anda yakin ingin menghapus merek ini?")) {
      try {
        await deleteBrand({ id });
        toast.success("Merek berhasil dihapus");
      } catch (error) {
        toast.error("Terjadi kesalahan");
        console.error(error);
      }
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Merek Produk</h1>
        <p className="text-muted-foreground mt-1">Kelola data merek produk</p>
      </div>

      <div className="bg-card rounded-lg border border-border shadow-sm">
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 max-w-sm relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari merek..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button onClick={() => handleOpenDialog()} className="gap-2">
              <Plus className="h-4 w-4" />
              Tambah Merek
            </Button>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kode</TableHead>
              <TableHead>Nama</TableHead>
              <TableHead>Kontak</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!filteredBrands ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Memuat data...
                </TableCell>
              </TableRow>
            ) : filteredBrands.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Belum ada data merek
                </TableCell>
              </TableRow>
            ) : (
              filteredBrands.map((brand) => (
                <TableRow key={brand._id}>
                  <TableCell className="font-medium">{brand.code}</TableCell>
                  <TableCell>{brand.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {brand.contactPerson || "-"}
                    {brand.phone && <div className="text-sm text-muted-foreground">{brand.phone}</div>}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{brand.email || "-"}</TableCell>
                  <TableCell>
                    <Badge variant={brand.isActive ? "default" : "secondary"}>
                      {brand.isActive ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialog(brand)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(brand._id)}
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
        <DialogContent className="sm:max-w-[600px]">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingBrand ? "Edit Merek" : "Tambah Merek"}
              </DialogTitle>
              <DialogDescription>
                {editingBrand
                  ? "Ubah informasi merek produk"
                  : "Tambahkan merek produk baru"}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="code">
                    Kode Merek <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value.toUpperCase() })
                    }
                    placeholder="BRD001"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="name">
                    Nama Merek <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Royal Canin"
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
                  placeholder="Deskripsi merek..."
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="contactPerson">Nama Kontak</Label>
                  <Input
                    id="contactPerson"
                    value={formData.contactPerson}
                    onChange={(e) =>
                      setFormData({ ...formData, contactPerson: e.target.value })
                    }
                    placeholder="John Doe"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone">Telepon</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    placeholder="08123456789"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="contact@brand.com"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={formData.website}
                    onChange={(e) =>
                      setFormData({ ...formData, website: e.target.value })
                    }
                    placeholder="https://brand.com"
                  />
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
                {editingBrand ? "Simpan" : "Tambah"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

