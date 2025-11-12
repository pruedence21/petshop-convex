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
import { Plus, Pencil, Trash2, Search, Heart } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";

type Pet = {
  _id: Id<"customerPets">;
  customerId: Id<"customers">;
  name: string;
  categoryId: Id<"animalCategories">;
  subcategoryId?: Id<"animalSubcategories">;
  breed?: string;
  dateOfBirth?: number;
  gender?: string;
  weight?: number;
  color?: string;
  microchipNumber?: string;
  notes?: string;
  isActive: boolean;
};

export default function PetsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPet, setEditingPet] = useState<Pet | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<Id<"animalCategories"> | "all">("all");
  const [formData, setFormData] = useState({
    customerId: "",
    name: "",
    categoryId: "",
    subcategoryId: "",
    breed: "",
    dateOfBirth: "",
    gender: "",
    weight: "",
    color: "",
    microchipNumber: "",
    notes: "",
  });

  const pets = useQuery(api.customerPets.list, {
    categoryId: selectedCategory !== "all" ? selectedCategory : undefined,
    includeInactive: false,
  });
  const customers = useQuery(api.customers.list, { includeInactive: false });
  const categories = useQuery(api.animalCategories.list, { includeInactive: false });
  const subcategories = useQuery(
    api.animalSubcategories.list,
    formData.categoryId
      ? { categoryId: formData.categoryId as Id<"animalCategories">, includeInactive: false }
      : "skip"
  );

  const createPet = useMutation(api.customerPets.create);
  const updatePet = useMutation(api.customerPets.update);
  const deletePet = useMutation(api.customerPets.remove);

  const filteredPets = pets?.filter((pet) =>
    pet.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    pet.breed?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenDialog = (pet?: Pet) => {
    if (pet) {
      setEditingPet(pet);
      setFormData({
        customerId: pet.customerId,
        name: pet.name,
        categoryId: pet.categoryId,
        subcategoryId: pet.subcategoryId || "",
        breed: pet.breed || "",
        dateOfBirth: pet.dateOfBirth
          ? new Date(pet.dateOfBirth).toISOString().split("T")[0]
          : "",
        gender: pet.gender || "",
        weight: pet.weight?.toString() || "",
        color: pet.color || "",
        microchipNumber: pet.microchipNumber || "",
        notes: pet.notes || "",
      });
    } else {
      setEditingPet(null);
      setFormData({
        customerId: "",
        name: "",
        categoryId: "",
        subcategoryId: "",
        breed: "",
        dateOfBirth: "",
        gender: "",
        weight: "",
        color: "",
        microchipNumber: "",
        notes: "",
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingPet(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.customerId || !formData.categoryId) {
      toast.error("Mohon lengkapi pelanggan dan kategori hewan");
      return;
    }

    try {
      const payload = {
        customerId: formData.customerId as Id<"customers">,
        name: formData.name,
        categoryId: formData.categoryId as Id<"animalCategories">,
        subcategoryId: formData.subcategoryId
          ? (formData.subcategoryId as Id<"animalSubcategories">)
          : undefined,
        breed: formData.breed || undefined,
        dateOfBirth: formData.dateOfBirth
          ? new Date(formData.dateOfBirth).getTime()
          : undefined,
        gender: formData.gender || undefined,
        weight: formData.weight ? parseFloat(formData.weight) : undefined,
        color: formData.color || undefined,
        microchipNumber: formData.microchipNumber || undefined,
        notes: formData.notes || undefined,
      };

      if (editingPet) {
        await updatePet({
          id: editingPet._id,
          ...payload,
        });
        toast.success("Data hewan berhasil diperbarui");
      } else {
        await createPet(payload);
        toast.success("Data hewan berhasil ditambahkan");
      }
      handleCloseDialog();
    } catch (error) {
      toast.error("Terjadi kesalahan");
      console.error(error);
    }
  };

  const handleDelete = async (id: Id<"customerPets">) => {
    if (confirm("Apakah Anda yakin ingin menghapus data hewan ini?")) {
      try {
        await deletePet({ id });
        toast.success("Data hewan berhasil dihapus");
      } catch (error) {
        toast.error("Terjadi kesalahan");
        console.error(error);
      }
    }
  };

  const getCustomerName = (customerId: Id<"customers">) => {
    return customers?.find((c) => c._id === customerId)?.name || "-";
  };

  const getCategoryName = (categoryId: Id<"animalCategories">) => {
    const category = categories?.find((c) => c._id === categoryId);
    return category ? `${category.icon || ""} ${category.name}` : "-";
  };

  const calculateAge = (dateOfBirth?: number) => {
    if (!dateOfBirth) return "-";
    const now = new Date();
    const birth = new Date(dateOfBirth);
    const years = now.getFullYear() - birth.getFullYear();
    const months = now.getMonth() - birth.getMonth();
    
    if (years === 0) {
      return `${months} bulan`;
    } else if (months < 0) {
      return `${years - 1} tahun ${12 + months} bulan`;
    } else {
      return `${years} tahun ${months} bulan`;
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Data Hewan Peliharaan</h1>
        <p className="text-slate-500 mt-1">Kelola data hewan peliharaan pelanggan</p>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1">
              <div className="flex-1 max-w-sm relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Cari nama hewan..."
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
              Tambah Hewan
            </Button>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama Hewan</TableHead>
              <TableHead>Pemilik</TableHead>
              <TableHead>Jenis</TableHead>
              <TableHead>Ras</TableHead>
              <TableHead>Umur</TableHead>
              <TableHead>Jenis Kelamin</TableHead>
              <TableHead>Berat</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!filteredPets ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-slate-500">
                  Memuat data...
                </TableCell>
              </TableRow>
            ) : filteredPets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-slate-500">
                  Belum ada data hewan
                </TableCell>
              </TableRow>
            ) : (
              filteredPets.map((pet) => (
                <TableRow key={pet._id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Heart className="h-4 w-4 text-pink-400" />
                      {pet.name}
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-600">
                    {getCustomerName(pet.customerId)}
                  </TableCell>
                  <TableCell>{getCategoryName(pet.categoryId)}</TableCell>
                  <TableCell className="text-slate-600">{pet.breed || "-"}</TableCell>
                  <TableCell className="text-slate-600">
                    {calculateAge(pet.dateOfBirth)}
                  </TableCell>
                  <TableCell>
                    {pet.gender === "L" ? "Jantan" : pet.gender === "P" ? "Betina" : "-"}
                  </TableCell>
                  <TableCell className="text-slate-600">
                    {pet.weight ? `${pet.weight} kg` : "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={pet.isActive ? "default" : "secondary"}>
                      {pet.isActive ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialog(pet)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(pet._id)}
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
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingPet ? "Edit Data Hewan" : "Tambah Data Hewan"}
              </DialogTitle>
              <DialogDescription>
                {editingPet
                  ? "Ubah informasi hewan peliharaan"
                  : "Tambahkan data hewan peliharaan baru"}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="customerId">
                    Pemilik <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.customerId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, customerId: value })
                    }
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih pemilik" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers?.map((customer) => (
                        <SelectItem key={customer._id} value={customer._id}>
                          {customer.name} ({customer.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="name">
                    Nama Hewan <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Buddy"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="categoryId">
                    Jenis Hewan <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.categoryId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, categoryId: value, subcategoryId: "" })
                    }
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih jenis" />
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
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="breed">Ras</Label>
                  <Input
                    id="breed"
                    value={formData.breed}
                    onChange={(e) =>
                      setFormData({ ...formData, breed: e.target.value })
                    }
                    placeholder="Golden Retriever, Persian, dll"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="color">Warna</Label>
                  <Input
                    id="color"
                    value={formData.color}
                    onChange={(e) =>
                      setFormData({ ...formData, color: e.target.value })
                    }
                    placeholder="Coklat, Putih, dll"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="dateOfBirth">Tanggal Lahir</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) =>
                      setFormData({ ...formData, dateOfBirth: e.target.value })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="gender">Jenis Kelamin</Label>
                  <Select
                    value={formData.gender}
                    onValueChange={(value) =>
                      setFormData({ ...formData, gender: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="L">Jantan</SelectItem>
                      <SelectItem value="P">Betina</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="weight">Berat (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    step="0.1"
                    value={formData.weight}
                    onChange={(e) =>
                      setFormData({ ...formData, weight: e.target.value })
                    }
                    placeholder="5.5"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="microchipNumber">Nomor Microchip</Label>
                <Input
                  id="microchipNumber"
                  value={formData.microchipNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, microchipNumber: e.target.value })
                  }
                  placeholder="Nomor microchip jika ada"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="notes">Catatan</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="Catatan tambahan (alergi, kondisi kesehatan, dll)"
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
                {editingPet ? "Simpan" : "Tambah"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
