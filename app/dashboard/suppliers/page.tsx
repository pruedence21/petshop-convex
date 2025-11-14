"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useFormSchema } from "@/components/forms/useFormSchema";
import { supplierFormSchema, SupplierFormData } from "@/components/forms/supplierFormSchema";
import { FormField } from "@/components/forms/FormField";
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

  const suppliers = useQuery(api.suppliers.list, { includeInactive: false });
  const createSupplier = useMutation(api.suppliers.create);
  const updateSupplier = useMutation(api.suppliers.update);
  const deleteSupplier = useMutation(api.suppliers.remove);

  const supplierForm = useFormSchema<SupplierFormData>({
    schema: supplierFormSchema,
    onSubmit: async (values) => {
      try {
        if (editingSupplier) {
          await updateSupplier({
            id: editingSupplier._id,
            code: values.code,
            name: values.name,
            contactPerson: values.contactPerson || undefined,
            phone: values.phone,
            email: values.email || undefined,
            address: values.address || undefined,
            city: values.city || undefined,
            province: values.province || undefined,
            postalCode: values.postalCode || undefined,
            paymentTerms: values.paymentTerms,
            rating: values.rating,
            notes: values.notes || undefined,
          });
          toast.success("Supplier berhasil diperbarui");
        } else {
          await createSupplier({
            code: values.code,
            name: values.name,
            contactPerson: values.contactPerson || undefined,
            phone: values.phone,
            email: values.email || undefined,
            address: values.address || undefined,
            city: values.city || undefined,
            province: values.province || undefined,
            postalCode: values.postalCode || undefined,
            paymentTerms: values.paymentTerms,
            rating: values.rating,
            notes: values.notes || undefined,
          });
          toast.success("Supplier berhasil ditambahkan");
        }
        handleCloseDialog();
      } catch (error) {
        toast.error("Terjadi kesalahan");
        console.error(error);
      }
    },
  });

  const filteredSuppliers = suppliers?.filter((supplier) =>
    supplier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    supplier.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    supplier.city?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenDialog = (supplier?: Supplier) => {
    if (supplier) {
      setEditingSupplier(supplier);
      supplierForm.reset({
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
      supplierForm.reset();
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingSupplier(null);
    supplierForm.reset();
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
          <form onSubmit={supplierForm.submit}>
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
                <FormField
                  label={supplierFormSchema.code.label}
                  required={supplierFormSchema.code.required}
                  error={supplierForm.errors.code}
                >
                  <Input
                    id="code"
                    value={supplierForm.values.code}
                    onChange={(e) => supplierForm.setField("code", e.target.value)}
                    onBlur={() => supplierForm.handleBlur("code")}
                    placeholder="SUP001"
                  />
                </FormField>
                <FormField
                  label={supplierFormSchema.name.label}
                  required={supplierFormSchema.name.required}
                  error={supplierForm.errors.name}
                >
                  <Input
                    id="name"
                    value={supplierForm.values.name}
                    onChange={(e) => supplierForm.setField("name", e.target.value)}
                    onBlur={() => supplierForm.handleBlur("name")}
                    placeholder="PT Supplier Petshop"
                  />
                </FormField>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  label={supplierFormSchema.contactPerson.label}
                  required={supplierFormSchema.contactPerson.required}
                  error={supplierForm.errors.contactPerson}
                >
                  <Input
                    id="contactPerson"
                    value={supplierForm.values.contactPerson}
                    onChange={(e) => supplierForm.setField("contactPerson", e.target.value)}
                    onBlur={() => supplierForm.handleBlur("contactPerson")}
                    placeholder="John Doe"
                  />
                </FormField>
                <FormField
                  label={supplierFormSchema.phone.label}
                  required={supplierFormSchema.phone.required}
                  error={supplierForm.errors.phone}
                >
                  <Input
                    id="phone"
                    value={supplierForm.values.phone}
                    onChange={(e) => supplierForm.setField("phone", e.target.value)}
                    onBlur={() => supplierForm.handleBlur("phone")}
                    placeholder="08123456789"
                  />
                </FormField>
              </div>
              <FormField
                label={supplierFormSchema.email.label}
                required={supplierFormSchema.email.required}
                error={supplierForm.errors.email}
              >
                <Input
                  id="email"
                  type="email"
                  value={supplierForm.values.email}
                  onChange={(e) => supplierForm.setField("email", e.target.value)}
                  onBlur={() => supplierForm.handleBlur("email")}
                  placeholder="supplier@example.com"
                />
              </FormField>
              <FormField
                label={supplierFormSchema.address.label}
                required={supplierFormSchema.address.required}
                error={supplierForm.errors.address}
              >
                <Textarea
                  id="address"
                  value={supplierForm.values.address}
                  onChange={(e) => supplierForm.setField("address", e.target.value)}
                  onBlur={() => supplierForm.handleBlur("address")}
                  placeholder="Jl. Raya No. 123"
                  rows={2}
                />
              </FormField>
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  label={supplierFormSchema.city.label}
                  required={supplierFormSchema.city.required}
                  error={supplierForm.errors.city}
                >
                  <Input
                    id="city"
                    value={supplierForm.values.city}
                    onChange={(e) => supplierForm.setField("city", e.target.value)}
                    onBlur={() => supplierForm.handleBlur("city")}
                    placeholder="Jakarta"
                  />
                </FormField>
                <FormField
                  label={supplierFormSchema.province.label}
                  required={supplierFormSchema.province.required}
                  error={supplierForm.errors.province}
                >
                  <Input
                    id="province"
                    value={supplierForm.values.province}
                    onChange={(e) => supplierForm.setField("province", e.target.value)}
                    onBlur={() => supplierForm.handleBlur("province")}
                    placeholder="DKI Jakarta"
                  />
                </FormField>
                <FormField
                  label={supplierFormSchema.postalCode.label}
                  required={supplierFormSchema.postalCode.required}
                  error={supplierForm.errors.postalCode}
                >
                  <Input
                    id="postalCode"
                    value={supplierForm.values.postalCode}
                    onChange={(e) => supplierForm.setField("postalCode", e.target.value)}
                    onBlur={() => supplierForm.handleBlur("postalCode")}
                    placeholder="12345"
                  />
                </FormField>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  label={supplierFormSchema.paymentTerms.label}
                  required={supplierFormSchema.paymentTerms.required}
                  error={supplierForm.errors.paymentTerms}
                >
                  <Select
                    value={supplierForm.values.paymentTerms}
                    onValueChange={(value) => supplierForm.setField("paymentTerms", value)}
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
                </FormField>
                <FormField
                  label={supplierFormSchema.rating.label}
                  required={supplierFormSchema.rating.required}
                  error={supplierForm.errors.rating}
                >
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => supplierForm.setField("rating", star)}
                        className="focus:outline-none"
                      >
                        <Star
                          className={`h-6 w-6 cursor-pointer transition-colors ${
                            star <= supplierForm.values.rating
                              ? "fill-yellow-400 text-yellow-400"
                              : "fill-slate-200 text-slate-200 hover:fill-yellow-200 hover:text-yellow-200"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </FormField>
              </div>
              <FormField
                label={supplierFormSchema.notes.label}
                required={supplierFormSchema.notes.required}
                error={supplierForm.errors.notes}
              >
                <Textarea
                  id="notes"
                  value={supplierForm.values.notes}
                  onChange={(e) => supplierForm.setField("notes", e.target.value)}
                  onBlur={() => supplierForm.handleBlur("notes")}
                  placeholder="Catatan tambahan..."
                  rows={2}
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
              <Button type="submit" disabled={!supplierForm.isValid}>
                {editingSupplier ? "Simpan" : "Tambah"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
