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
import { Plus, Pencil, Trash2, Search, Star } from "lucide-react";
import { toast } from "sonner";

type Supplier = {
  _id: Id<"suppliers">;
  code: string;
  name: string;
  contactPerson?: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  paymentTerms: string;
  rating: number;
  notes?: string;
  isActive: boolean;
};

const PAYMENT_TERMS = [
  { value: "COD", label: "Cash on Delivery (COD)" },
  { value: "Net 7", label: "Net 7 Hari" },
  { value: "Net 14", label: "Net 14 Hari" },
  { value: "Net 30", label: "Net 30 Hari" },
  { value: "Net 60", label: "Net 60 Hari" },
  { value: "Net 90", label: "Net 90 Hari" },
];

export default function SuppliersPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    contactPerson: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    province: "",
    postalCode: "",
    paymentTerms: "Net 30",
    rating: 3,
    notes: "",
  });

  const suppliers = useQuery(api.suppliers.list, { includeInactive: false });
  const createSupplier = useMutation(api.suppliers.create);
  const updateSupplier = useMutation(api.suppliers.update);
  const deleteSupplier = useMutation(api.suppliers.remove);

  const filteredSuppliers = suppliers?.filter((supplier) =>
    supplier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    supplier.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    supplier.city?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenDialog = (supplier?: Supplier) => {
    if (supplier) {
      setEditingSupplier(supplier);
      setFormData({
        code: supplier.code,
        name: supplier.name,
        contactPerson: supplier.contactPerson || "",
        phone: supplier.phone,
        email: supplier.email || "",
        address: supplier.address || "",
        city: supplier.city || "",
        province: supplier.province || "",
        postalCode: supplier.postalCode || "",
        paymentTerms: supplier.paymentTerms,
        rating: supplier.rating,
        notes: supplier.notes || "",
      });
    } else {
      setEditingSupplier(null);
      setFormData({
        code: "",
        name: "",
        contactPerson: "",
        phone: "",
        email: "",
        address: "",
        city: "",
        province: "",
        postalCode: "",
        paymentTerms: "Net 30",
        rating: 3,
        notes: "",
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingSupplier(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingSupplier) {
        await updateSupplier({
          id: editingSupplier._id,
          code: formData.code,
          name: formData.name,
          contactPerson: formData.contactPerson || undefined,
          phone: formData.phone,
          email: formData.email || undefined,
          address: formData.address || undefined,
          city: formData.city || undefined,
          province: formData.province || undefined,
          postalCode: formData.postalCode || undefined,
          paymentTerms: formData.paymentTerms,
          rating: formData.rating,
          notes: formData.notes || undefined,
        });
        toast.success("Supplier berhasil diperbarui");
      } else {
        await createSupplier({
          code: formData.code,
          name: formData.name,
          contactPerson: formData.contactPerson || undefined,
          phone: formData.phone,
          email: formData.email || undefined,
          address: formData.address || undefined,
          city: formData.city || undefined,
          province: formData.province || undefined,
          postalCode: formData.postalCode || undefined,
          paymentTerms: formData.paymentTerms,
          rating: formData.rating,
          notes: formData.notes || undefined,
        });
        toast.success("Supplier berhasil ditambahkan");
      }
      handleCloseDialog();
    } catch (error) {
      toast.error("Terjadi kesalahan");
      console.error(error);
    }
  };

  const handleDelete = async (id: Id<"suppliers">) => {
    if (confirm("Apakah Anda yakin ingin menghapus supplier ini?")) {
      try {
        await deleteSupplier({ id });
        toast.success("Supplier berhasil dihapus");
      } catch (error) {
        toast.error("Terjadi kesalahan");
        console.error(error);
      }
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating
                ? "fill-yellow-400 text-yellow-400"
                : "fill-slate-200 text-slate-200"
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Supplier</h1>
        <p className="text-slate-500 mt-1">Kelola data supplier/pemasok produk</p>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 max-w-sm relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Cari supplier..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button onClick={() => handleOpenDialog()} className="gap-2">
              <Plus className="h-4 w-4" />
              Tambah Supplier
            </Button>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kode</TableHead>
              <TableHead>Nama</TableHead>
              <TableHead>Kontak</TableHead>
              <TableHead>Lokasi</TableHead>
              <TableHead>Term</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!filteredSuppliers ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                  Memuat data...
                </TableCell>
              </TableRow>
            ) : filteredSuppliers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                  Belum ada data supplier
                </TableCell>
              </TableRow>
            ) : (
              filteredSuppliers.map((supplier) => (
                <TableRow key={supplier._id}>
                  <TableCell className="font-medium">{supplier.code}</TableCell>
                  <TableCell>{supplier.name}</TableCell>
                  <TableCell className="text-slate-600">
                    {supplier.contactPerson || "-"}
                    <div className="text-sm text-slate-500">{supplier.phone}</div>
                  </TableCell>
                  <TableCell className="text-slate-600">
                    {supplier.city || "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{supplier.paymentTerms}</Badge>
                  </TableCell>
                  <TableCell>{renderStars(supplier.rating)}</TableCell>
                  <TableCell>
                    <Badge variant={supplier.isActive ? "default" : "secondary"}>
                      {supplier.isActive ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialog(supplier)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(supplier._id)}
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
                {editingSupplier ? "Edit Supplier" : "Tambah Supplier"}
              </DialogTitle>
              <DialogDescription>
                {editingSupplier
                  ? "Ubah informasi supplier"
                  : "Tambahkan supplier baru"}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="code">
                    Kode Supplier <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value.toUpperCase() })
                    }
                    placeholder="SUP001"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="name">
                    Nama Supplier <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="PT Supplier Petshop"
                    required
                  />
                </div>
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
                  <Label htmlFor="phone">
                    Telepon <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    placeholder="08123456789"
                    required
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="supplier@example.com"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="address">Alamat</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  placeholder="Jl. Raya No. 123"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="city">Kota</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) =>
                      setFormData({ ...formData, city: e.target.value })
                    }
                    placeholder="Jakarta"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="province">Provinsi</Label>
                  <Input
                    id="province"
                    value={formData.province}
                    onChange={(e) =>
                      setFormData({ ...formData, province: e.target.value })
                    }
                    placeholder="DKI Jakarta"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="postalCode">Kode Pos</Label>
                  <Input
                    id="postalCode"
                    value={formData.postalCode}
                    onChange={(e) =>
                      setFormData({ ...formData, postalCode: e.target.value })
                    }
                    placeholder="12345"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="paymentTerms">Term Pembayaran</Label>
                  <Select
                    value={formData.paymentTerms}
                    onValueChange={(value) =>
                      setFormData({ ...formData, paymentTerms: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_TERMS.map((term) => (
                        <SelectItem key={term.value} value={term.value}>
                          {term.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="rating">Rating (1-5)</Label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setFormData({ ...formData, rating: star })}
                        className="focus:outline-none"
                      >
                        <Star
                          className={`h-6 w-6 cursor-pointer transition-colors ${
                            star <= formData.rating
                              ? "fill-yellow-400 text-yellow-400"
                              : "fill-slate-200 text-slate-200 hover:fill-yellow-200 hover:text-yellow-200"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="notes">Catatan</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="Catatan tambahan..."
                  rows={2}
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
                {editingSupplier ? "Simpan" : "Tambah"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
