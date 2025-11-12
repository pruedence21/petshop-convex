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
import { Plus, Pencil, Trash2, Search, User } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";

type Customer = {
  _id: Id<"customers">;
  code: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  dateOfBirth?: number;
  gender?: string;
  idNumber?: string;
  notes?: string;
  isActive: boolean;
};

export default function CustomersPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    province: "",
    postalCode: "",
    dateOfBirth: "",
    gender: "",
    idNumber: "",
    notes: "",
  });

  const customers = useQuery(api.customers.list, { includeInactive: false });
  const createCustomer = useMutation(api.customers.create);
  const updateCustomer = useMutation(api.customers.update);
  const deleteCustomer = useMutation(api.customers.remove);

  const filteredCustomers = customers?.filter((customer) =>
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.phone.includes(searchQuery)
  );

  const handleOpenDialog = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData({
        code: customer.code,
        name: customer.name,
        phone: customer.phone,
        email: customer.email || "",
        address: customer.address || "",
        city: customer.city || "",
        province: customer.province || "",
        postalCode: customer.postalCode || "",
        dateOfBirth: customer.dateOfBirth
          ? new Date(customer.dateOfBirth).toISOString().split("T")[0]
          : "",
        gender: customer.gender || "",
        idNumber: customer.idNumber || "",
        notes: customer.notes || "",
      });
    } else {
      setEditingCustomer(null);
      setFormData({
        code: "",
        name: "",
        phone: "",
        email: "",
        address: "",
        city: "",
        province: "",
        postalCode: "",
        dateOfBirth: "",
        gender: "",
        idNumber: "",
        notes: "",
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingCustomer(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const payload = {
        code: formData.code,
        name: formData.name,
        phone: formData.phone,
        email: formData.email || undefined,
        address: formData.address || undefined,
        city: formData.city || undefined,
        province: formData.province || undefined,
        postalCode: formData.postalCode || undefined,
        dateOfBirth: formData.dateOfBirth
          ? new Date(formData.dateOfBirth).getTime()
          : undefined,
        gender: formData.gender || undefined,
        idNumber: formData.idNumber || undefined,
        notes: formData.notes || undefined,
      };

      if (editingCustomer) {
        await updateCustomer({
          id: editingCustomer._id,
          ...payload,
        });
        toast.success("Pelanggan berhasil diperbarui");
      } else {
        await createCustomer(payload);
        toast.success("Pelanggan berhasil ditambahkan");
      }
      handleCloseDialog();
    } catch (error) {
      toast.error("Terjadi kesalahan");
      console.error(error);
    }
  };

  const handleDelete = async (id: Id<"customers">) => {
    if (confirm("Apakah Anda yakin ingin menghapus pelanggan ini?")) {
      try {
        await deleteCustomer({ id });
        toast.success("Pelanggan berhasil dihapus");
      } catch (error) {
        toast.error("Terjadi kesalahan");
        console.error(error);
      }
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Pelanggan</h1>
        <p className="text-slate-500 mt-1">Kelola data pelanggan dan hewan peliharaan</p>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 max-w-sm relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Cari pelanggan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button onClick={() => handleOpenDialog()} className="gap-2">
              <Plus className="h-4 w-4" />
              Tambah Pelanggan
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
              <TableHead>Jenis Kelamin</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!filteredCustomers ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                  Memuat data...
                </TableCell>
              </TableRow>
            ) : filteredCustomers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                  Belum ada data pelanggan
                </TableCell>
              </TableRow>
            ) : (
              filteredCustomers.map((customer) => (
                <TableRow key={customer._id}>
                  <TableCell className="font-medium">{customer.code}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-slate-400" />
                      {customer.name}
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-600">
                    {customer.phone}
                    {customer.email && (
                      <div className="text-sm text-slate-500">{customer.email}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-slate-600">
                    {customer.city || "-"}
                  </TableCell>
                  <TableCell>
                    {customer.gender === "L" ? "Laki-laki" : customer.gender === "P" ? "Perempuan" : "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={customer.isActive ? "default" : "secondary"}>
                      {customer.isActive ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialog(customer)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(customer._id)}
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
                {editingCustomer ? "Edit Pelanggan" : "Tambah Pelanggan"}
              </DialogTitle>
              <DialogDescription>
                {editingCustomer
                  ? "Ubah informasi pelanggan"
                  : "Tambahkan pelanggan baru"}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="code">
                    Kode Pelanggan <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value.toUpperCase() })
                    }
                    placeholder="CUST001"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="name">
                    Nama Lengkap <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="John Doe"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
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
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="customer@example.com"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="idNumber">No. KTP</Label>
                  <Input
                    id="idNumber"
                    value={formData.idNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, idNumber: e.target.value })
                    }
                    placeholder="3174..."
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
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
                      <SelectValue placeholder="Pilih jenis kelamin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="L">Laki-laki</SelectItem>
                      <SelectItem value="P">Perempuan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
                {editingCustomer ? "Simpan" : "Tambah"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
