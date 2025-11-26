"use client";

import { useState, useEffect } from "react";
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
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Edit, Trash2, UserCog } from "lucide-react";
import { toast } from "sonner";

type StaffFormData = {
  code: string;
  name: string;
  role: string;
  specialization: string;
  phone: string;
  email: string;
  branchId: string;
};

export default function ClinicStaffPage() {
  const [mounted, setMounted] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<Id<"clinicStaff"> | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBranch, setSelectedBranch] = useState<Id<"branches"> | "all">("all");
  const [selectedRole, setSelectedRole] = useState<string>("all");

  useEffect(() => {
    setMounted(true);
  }, []);

  const [formData, setFormData] = useState<StaffFormData>({
    code: "",
    name: "",
    role: "Veterinarian",
    specialization: "",
    phone: "",
    email: "",
    branchId: "",
  });

  const staff = useQuery(api.clinic.clinicStaff.list, {
    branchId: selectedBranch !== "all" ? selectedBranch : undefined,
    role: selectedRole !== "all" ? selectedRole : undefined,
    includeInactive: false,
  });
  const branches = useQuery(api.master_data.branches.list, { includeInactive: false });

  const createStaff = useMutation(api.clinic.clinicStaff.create);
  const updateStaff = useMutation(api.clinic.clinicStaff.update);
  const deleteStaff = useMutation(api.clinic.clinicStaff.remove);

  const filteredStaff = staff?.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenDialog = (editStaff?: any) => {
    if (editStaff) {
      setIsEditMode(true);
      setEditingId(editStaff._id);
      setFormData({
        code: editStaff.code,
        name: editStaff.name,
        role: editStaff.role,
        specialization: editStaff.specialization || "",
        phone: editStaff.phone || "",
        email: editStaff.email || "",
        branchId: editStaff.branchId,
      });
    } else {
      setIsEditMode(false);
      setEditingId(null);
      setFormData({
        code: "",
        name: "",
        role: "Veterinarian",
        specialization: "",
        phone: "",
        email: "",
        branchId: "",
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.code || !formData.name || !formData.role || !formData.branchId) {
      toast.error("Mohon lengkapi semua field yang wajib");
      return;
    }

    try {
      if (isEditMode && editingId) {
        await updateStaff({
          id: editingId,
          code: formData.code,
          name: formData.name,
          role: formData.role,
          specialization: formData.specialization || undefined,
          phone: formData.phone || undefined,
          email: formData.email || undefined,
          branchId: formData.branchId as Id<"branches">,
        });
        toast.success("Staff berhasil diupdate");
      } else {
        await createStaff({
          code: formData.code,
          name: formData.name,
          role: formData.role,
          specialization: formData.specialization || undefined,
          phone: formData.phone || undefined,
          email: formData.email || undefined,
          branchId: formData.branchId as Id<"branches">,
        });
        toast.success("Staff berhasil ditambahkan");
      }
      setIsDialogOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Terjadi kesalahan");
    }
  };

  const handleDelete = async (id: Id<"clinicStaff">) => {
    if (confirm("Hapus staff ini?")) {
      try {
        await deleteStaff({ id });
        toast.success("Staff berhasil dihapus");
      } catch (error: any) {
        toast.error(error.message || "Terjadi kesalahan");
      }
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "Veterinarian":
        return <Badge className="bg-blue-500">Dokter Hewan</Badge>;
      case "Groomer":
        return <Badge className="bg-purple-500">Groomer</Badge>;
      case "Nurse":
        return <Badge className="bg-green-500">Perawat</Badge>;
      default:
        return <Badge>{role}</Badge>;
    }
  };

  if (!mounted) {
    return null; // Avoid hydration mismatch
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Staff Klinik</h1>
        <p className="text-slate-500 mt-1">
          Kelola dokter hewan, groomer, dan staff klinik
        </p>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1">
              <div className="flex-1 max-w-sm relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Cari staff..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Semua Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Role</SelectItem>
                  <SelectItem value="Veterinarian">Dokter Hewan</SelectItem>
                  <SelectItem value="Groomer">Groomer</SelectItem>
                  <SelectItem value="Nurse">Perawat</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={selectedBranch === "all" ? "all" : selectedBranch}
                onValueChange={(value) =>
                  setSelectedBranch(value === "all" ? "all" : (value as Id<"branches">))
                }
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Semua Cabang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Cabang</SelectItem>
                  {branches?.map((branch) => (
                    <SelectItem key={branch._id} value={branch._id}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => handleOpenDialog()} className="gap-2">
              <Plus className="h-4 w-4" />
              Tambah Staff
            </Button>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kode</TableHead>
              <TableHead>Nama</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Spesialisasi</TableHead>
              <TableHead>Cabang</TableHead>
              <TableHead>Telepon</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStaff === undefined ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : filteredStaff.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                  Tidak ada data staff
                </TableCell>
              </TableRow>
            ) : (
              filteredStaff.map((s) => (
                <TableRow key={s._id}>
                  <TableCell className="font-medium">{s.code}</TableCell>
                  <TableCell>{s.name}</TableCell>
                  <TableCell>{getRoleBadge(s.role)}</TableCell>
                  <TableCell>{s.specialization || "-"}</TableCell>
                  <TableCell>{s.branch?.name || "-"}</TableCell>
                  <TableCell>{s.phone || "-"}</TableCell>
                  <TableCell>{s.email || "-"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialog(s)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(s._id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? "Edit Staff" : "Tambah Staff Baru"}
            </DialogTitle>
            <DialogDescription>
              Isi informasi staff klinik
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="code">
                    Kode <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="code"
                    placeholder="DRH001"
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">
                    Nama <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    placeholder="drh. Budi Santoso"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">
                    Role <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) =>
                      setFormData({ ...formData, role: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Veterinarian">Dokter Hewan</SelectItem>
                      <SelectItem value="Groomer">Groomer</SelectItem>
                      <SelectItem value="Nurse">Perawat</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="specialization">Spesialisasi</Label>
                  <Input
                    id="specialization"
                    placeholder="Small Animals"
                    value={formData.specialization}
                    onChange={(e) =>
                      setFormData({ ...formData, specialization: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="branch">
                    Cabang <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.branchId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, branchId: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih cabang" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches?.map((branch) => (
                        <SelectItem key={branch._id} value={branch._id}>
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Telepon</Label>
                  <Input
                    id="phone"
                    placeholder="08123456789"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2 col-span-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="dokter@petshop.com"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Batal
              </Button>
              <Button type="submit">
                {isEditMode ? "Update" : "Tambah"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

