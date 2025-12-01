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
import { useFormSchema } from "@/components/forms/useFormSchema";
import { FormField } from "@/components/forms/FormField";
import { customerFormSchema, CustomerFormData } from "@/components/forms/customerFormSchema";

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

  const customers = useQuery(api.master_data.customers.list, { includeInactive: false });
  const createCustomer = useMutation(api.master_data.customers.create);
  const updateCustomer = useMutation(api.master_data.customers.update);
  const deleteCustomer = useMutation(api.master_data.customers.remove);

  const customerForm = useFormSchema<CustomerFormData>({
    schema: customerFormSchema,
    validateOnChange: true,
    onSubmit: async (values) => {
      try {
        const payload = {
          code: values.code,
          name: values.name,
          phone: values.phone,
          email: values.email || undefined,
          address: values.address || undefined,
          city: values.city || undefined,
          province: values.province || undefined,
          postalCode: values.postalCode || undefined,
          dateOfBirth: values.dateOfBirth
            ? new Date(values.dateOfBirth).getTime()
            : undefined,
          gender: values.gender || undefined,
          idNumber: values.idNumber || undefined,
          notes: values.notes || undefined,
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
        setIsDialogOpen(false);
        setEditingCustomer(null);
      } catch (error) {
        toast.error("Terjadi kesalahan");
        console.error(error);
      }
    },
  });

  const filteredCustomers = customers?.filter((customer) =>
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.phone.includes(searchQuery)
  );

  const handleOpenDialog = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      customerForm.reset({
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
      customerForm.reset();
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingCustomer(null);
    customerForm.reset();
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
        <h1 className="text-3xl font-bold text-foreground">Pelanggan</h1>
        <p className="text-muted-foreground mt-1">Kelola data pelanggan dan hewan peliharaan</p>
      </div>

      <div className="bg-card rounded-lg border border-border shadow-sm">
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 max-w-sm relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Memuat data...
                </TableCell>
              </TableRow>
            ) : filteredCustomers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Belum ada data pelanggan
                </TableCell>
              </TableRow>
            ) : (
              filteredCustomers.map((customer) => (
                <TableRow key={customer._id}>
                  <TableCell className="font-medium">{customer.code}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      {customer.name}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {customer.phone}
                    {customer.email && (
                      <div className="text-sm text-muted-foreground">{customer.email}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
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
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <form onSubmit={customerForm.submit}>
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
                <FormField
                  label={customerFormSchema.code.label}
                  required={customerFormSchema.code.required}
                  error={customerForm.errors.code}
                  touched={customerForm.touched.code}
                >
                  <Input
                    id="code"
                    value={customerForm.values.code}
                    onChange={(e) => customerForm.setField("code", e.target.value)}
                    onBlur={() => customerForm.handleBlur("code")}
                    placeholder="CUST001"
                  />
                </FormField>
                <FormField
                  label={customerFormSchema.name.label}
                  required={customerFormSchema.name.required}
                  error={customerForm.errors.name}
                  touched={customerForm.touched.name}
                >
                  <Input
                    id="name"
                    value={customerForm.values.name}
                    onChange={(e) => customerForm.setField("name", e.target.value)}
                    onBlur={() => customerForm.handleBlur("name")}
                    placeholder="John Doe"
                  />
                </FormField>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  label={customerFormSchema.phone.label}
                  required={customerFormSchema.phone.required}
                  error={customerForm.errors.phone}
                  touched={customerForm.touched.phone}
                >
                  <Input
                    id="phone"
                    value={customerForm.values.phone}
                    onChange={(e) => customerForm.setField("phone", e.target.value)}
                    onBlur={() => customerForm.handleBlur("phone")}
                    placeholder="08123456789"
                  />
                </FormField>
                <FormField
                  label={customerFormSchema.email.label}
                  error={customerForm.errors.email}
                  touched={customerForm.touched.email}
                >
                  <Input
                    id="email"
                    type="email"
                    value={customerForm.values.email}
                    onChange={(e) => customerForm.setField("email", e.target.value)}
                    onBlur={() => customerForm.handleBlur("email")}
                    placeholder="customer@example.com"
                  />
                </FormField>
                <FormField
                  label={customerFormSchema.idNumber.label}
                  error={customerForm.errors.idNumber}
                  touched={customerForm.touched.idNumber}
                >
                  <Input
                    id="idNumber"
                    value={customerForm.values.idNumber}
                    onChange={(e) => customerForm.setField("idNumber", e.target.value)}
                    onBlur={() => customerForm.handleBlur("idNumber")}
                    placeholder="3174..."
                  />
                </FormField>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  label={customerFormSchema.dateOfBirth.label}
                  error={customerForm.errors.dateOfBirth}
                  touched={customerForm.touched.dateOfBirth}
                >
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={customerForm.values.dateOfBirth}
                    onChange={(e) => customerForm.setField("dateOfBirth", e.target.value)}
                    onBlur={() => customerForm.handleBlur("dateOfBirth")}
                  />
                </FormField>
                <FormField
                  label={customerFormSchema.gender.label}
                  error={customerForm.errors.gender}
                  touched={customerForm.touched.gender}
                >
                  <Select
                    value={customerForm.values.gender}
                    onValueChange={(value) => customerForm.setField("gender", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih jenis kelamin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="L">Laki-laki</SelectItem>
                      <SelectItem value="P">Perempuan</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
              </div>
              <FormField
                label={customerFormSchema.address.label}
                error={customerForm.errors.address}
                touched={customerForm.touched.address}
              >
                <Textarea
                  id="address"
                  value={customerForm.values.address}
                  onChange={(e) => customerForm.setField("address", e.target.value)}
                  onBlur={() => customerForm.handleBlur("address")}
                  placeholder="Jl. Raya No. 123"
                  rows={2}
                />
              </FormField>
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  label={customerFormSchema.city.label}
                  error={customerForm.errors.city}
                  touched={customerForm.touched.city}
                >
                  <Input
                    id="city"
                    value={customerForm.values.city}
                    onChange={(e) => customerForm.setField("city", e.target.value)}
                    onBlur={() => customerForm.handleBlur("city")}
                    placeholder="Jakarta"
                  />
                </FormField>
                <FormField
                  label={customerFormSchema.province.label}
                  error={customerForm.errors.province}
                  touched={customerForm.touched.province}
                >
                  <Input
                    id="province"
                    value={customerForm.values.province}
                    onChange={(e) => customerForm.setField("province", e.target.value)}
                    onBlur={() => customerForm.handleBlur("province")}
                    placeholder="DKI Jakarta"
                  />
                </FormField>
                <FormField
                  label={customerFormSchema.postalCode.label}
                  error={customerForm.errors.postalCode}
                  touched={customerForm.touched.postalCode}
                >
                  <Input
                    id="postalCode"
                    value={customerForm.values.postalCode}
                    onChange={(e) => customerForm.setField("postalCode", e.target.value)}
                    onBlur={() => customerForm.handleBlur("postalCode")}
                    placeholder="12345"
                  />
                </FormField>
              </div>
              <FormField
                label={customerFormSchema.notes.label}
                error={customerForm.errors.notes}
                touched={customerForm.touched.notes}
              >
                <Textarea
                  id="notes"
                  value={customerForm.values.notes}
                  onChange={(e) => customerForm.setField("notes", e.target.value)}
                  onBlur={() => customerForm.handleBlur("notes")}
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
              <Button type="submit" disabled={!customerForm.isValid}>
                {editingCustomer ? "Simpan" : "Tambah"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
