"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useFormSchema } from "@/components/forms/useFormSchema";
import { FormField } from "@/components/forms/FormField";
import { petFormSchema, PetFormData } from "@/components/forms/petFormSchema";
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

  const pets = useQuery(api.customerPets.list, {
    categoryId: selectedCategory !== "all" ? selectedCategory : undefined,
    includeInactive: false,
  });
  const customers = useQuery(api.customers.list, { includeInactive: false });
  const categories = useQuery(api.animalCategories.list, { includeInactive: false });

  const createPet = useMutation(api.customerPets.create);
  const updatePet = useMutation(api.customerPets.update);
  const deletePet = useMutation(api.customerPets.remove);

  const petForm = useFormSchema<PetFormData>({
    schema: petFormSchema,
    onSubmit: async (values) => {
      if (!values.customerId || !values.categoryId) {
        toast.error("Mohon lengkapi pemilik dan kategori hewan");
        return;
      }

      try {
        const payload = {
          customerId: values.customerId as Id<"customers">,
          name: values.name,
          categoryId: values.categoryId as Id<"animalCategories">,
          subcategoryId: values.subcategoryId
            ? (values.subcategoryId as Id<"animalSubcategories">)
            : undefined,
          breed: values.breed || undefined,
          dateOfBirth: values.dateOfBirth
            ? new Date(values.dateOfBirth).getTime()
            : undefined,
          gender: values.gender || undefined,
          weight: values.weight ? parseFloat(values.weight) : undefined,
          color: values.color || undefined,
          microchipNumber: values.microchipNumber || undefined,
          notes: values.notes || undefined,
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
    },
  });

  const subcategories = useQuery(
    api.animalSubcategories.list,
    petForm.values.categoryId
      ? { categoryId: petForm.values.categoryId as Id<"animalCategories">, includeInactive: false }
      : "skip"
  );

  const filteredPets = pets?.filter((pet) =>
    pet.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    pet.breed?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenDialog = (pet?: Pet) => {
    if (pet) {
      setEditingPet(pet);
      petForm.reset({
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
      petForm.reset();
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingPet(null);
    petForm.reset();
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
          <form onSubmit={petForm.submit}>
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
                <FormField
                  label={petFormSchema.customerId.label}
                  required={petFormSchema.customerId.required}
                  error={petForm.errors.customerId}
                >
                  <Select
                    value={petForm.values.customerId}
                    onValueChange={(value) => {
                      petForm.setField("customerId", value);
                    }}
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
                </FormField>
                <FormField
                  label={petFormSchema.name.label}
                  required={petFormSchema.name.required}
                  error={petForm.errors.name}
                >
                  <Input
                    id="name"
                    value={petForm.values.name}
                    onChange={(e) => petForm.setField("name", e.target.value)}
                    onBlur={() => petForm.handleBlur("name")}
                    placeholder="Buddy"
                  />
                </FormField>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  label={petFormSchema.categoryId.label}
                  required={petFormSchema.categoryId.required}
                  error={petForm.errors.categoryId}
                >
                  <Select
                    value={petForm.values.categoryId}
                    onValueChange={(value) => {
                      petForm.setField("categoryId", value);
                      petForm.setField("subcategoryId", "");
                    }}
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
                </FormField>
                <FormField
                  label={petFormSchema.subcategoryId.label}
                  required={petFormSchema.subcategoryId.required}
                  error={petForm.errors.subcategoryId}
                >
                  <Select
                    value={petForm.values.subcategoryId}
                    onValueChange={(value) => petForm.setField("subcategoryId", value)}
                    disabled={!petForm.values.categoryId}
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
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  label={petFormSchema.breed.label}
                  required={petFormSchema.breed.required}
                  error={petForm.errors.breed}
                >
                  <Input
                    id="breed"
                    value={petForm.values.breed}
                    onChange={(e) => petForm.setField("breed", e.target.value)}
                    onBlur={() => petForm.handleBlur("breed")}
                    placeholder="Golden Retriever, Persian, dll"
                  />
                </FormField>
                <FormField
                  label={petFormSchema.color.label}
                  required={petFormSchema.color.required}
                  error={petForm.errors.color}
                >
                  <Input
                    id="color"
                    value={petForm.values.color}
                    onChange={(e) => petForm.setField("color", e.target.value)}
                    onBlur={() => petForm.handleBlur("color")}
                    placeholder="Coklat, Putih, dll"
                  />
                </FormField>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  label={petFormSchema.dateOfBirth.label}
                  required={petFormSchema.dateOfBirth.required}
                  error={petForm.errors.dateOfBirth}
                >
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={petForm.values.dateOfBirth}
                    onChange={(e) => petForm.setField("dateOfBirth", e.target.value)}
                    onBlur={() => petForm.handleBlur("dateOfBirth")}
                  />
                </FormField>
                <FormField
                  label={petFormSchema.gender.label}
                  required={petFormSchema.gender.required}
                  error={petForm.errors.gender}
                >
                  <Select
                    value={petForm.values.gender}
                    onValueChange={(value) => petForm.setField("gender", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="L">Jantan</SelectItem>
                      <SelectItem value="P">Betina</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField
                  label={petFormSchema.weight.label}
                  required={petFormSchema.weight.required}
                  error={petForm.errors.weight}
                >
                  <Input
                    id="weight"
                    type="number"
                    step="0.1"
                    value={petForm.values.weight}
                    onChange={(e) => petForm.setField("weight", e.target.value)}
                    onBlur={() => petForm.handleBlur("weight")}
                    placeholder="5.5"
                  />
                </FormField>
              </div>
              <FormField
                label={petFormSchema.microchipNumber.label}
                required={petFormSchema.microchipNumber.required}
                error={petForm.errors.microchipNumber}
              >
                <Input
                  id="microchipNumber"
                  value={petForm.values.microchipNumber}
                  onChange={(e) => petForm.setField("microchipNumber", e.target.value)}
                  onBlur={() => petForm.handleBlur("microchipNumber")}
                  placeholder="Nomor microchip jika ada"
                />
              </FormField>
              <FormField
                label={petFormSchema.notes.label}
                required={petFormSchema.notes.required}
                error={petForm.errors.notes}
              >
                <Textarea
                  id="notes"
                  value={petForm.values.notes}
                  onChange={(e) => petForm.setField("notes", e.target.value)}
                  onBlur={() => petForm.handleBlur("notes")}
                  placeholder="Catatan tambahan (alergi, kondisi kesehatan, dll)"
                  rows={3}
                />
              </FormField>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseDialog}
              >
                Batal
              </Button>
              <Button type="submit" disabled={!petForm.isValid}>
                {editingPet ? "Simpan" : "Tambah"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
