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

type Branch = {
  _id: Id<"branches">;
  code: string;
  name: string;
  address?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  phone?: string;
  email?: string;
  isActive: boolean;
};

export default function BranchesPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    address: "",
    city: "",
    province: "",
    postalCode: "",
    phone: "",
    email: "",
  });

  const branches = useQuery(api.master_data.branches.list, { includeInactive: false });
  const createBranch = useMutation(api.master_data.branches.create);
  const updateBranch = useMutation(api.master_data.branches.update);
  const deleteBranch = useMutation(api.master_data.branches.remove);

  const filteredBranches = branches?.filter((branch) =>
    branch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    branch.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    branch.city?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenDialog = (branch?: Branch) => {
    if (branch) {
      setEditingBranch(branch);
      setFormData({
        code: branch.code,
        name: branch.name,
        address: branch.address || "",
        city: branch.city || "",
        province: branch.province || "",
        postalCode: branch.postalCode || "",
        phone: branch.phone || "",
        email: branch.email || "",
      });
    } else {
      setEditingBranch(null);
      setFormData({
        code: "",
        name: "",
        address: "",
        city: "",
        province: "",
        postalCode: "",
        phone: "",
        email: "",
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingBranch(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingBranch) {
        await updateBranch({
          id: editingBranch._id,
          code: formData.code,
          name: formData.name,
          address: formData.address || undefined,
          city: formData.city || undefined,
          province: formData.province || undefined,
          postalCode: formData.postalCode || undefined,
          phone: formData.phone || undefined,
          email: formData.email || undefined,
        });
        toast.success("Cabang berhasil diperbarui");
      } else {
        await createBranch({
          code: formData.code,
          name: formData.name,
          address: formData.address || undefined,
          city: formData.city || undefined,
          province: formData.province || undefined,
          postalCode: formData.postalCode || undefined,
          phone: formData.phone || undefined,
          email: formData.email || undefined,
        });
        toast.success("Cabang berhasil ditambahkan");
      }
      handleCloseDialog();
    } catch (error) {
      toast.error("Terjadi kesalahan");
      console.error(error);
    }
  };

  const handleDelete = async (id: Id<"branches">) => {
    if (confirm("Apakah Anda yakin ingin menghapus cabang ini?")) {
      try {
        await deleteBranch({ id });
        toast.success("Cabang berhasil dihapus");
      } catch (error) {
        toast.error("Terjadi kesalahan");
        console.error(error);
      }
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Cabang Toko</h1>
        <p className="text-muted-foreground mt-1">Kelola data cabang/lokasi toko</p>
      </div>

      <div className="bg-card rounded-lg border border-border shadow-sm">
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 max-w-sm relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari cabang..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button onClick={() => handleOpenDialog()} className="gap-2">
              <Plus className="h-4 w-4" />
              Tambah Cabang
            </Button>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kode</TableHead>
              <TableHead>Nama</TableHead>
              <TableHead>Lokasi</TableHead>
              <TableHead>Kontak</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!filteredBranches ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Memuat data...
                </TableCell>
              </TableRow>
            ) : filteredBranches.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Belum ada data cabang
                </TableCell>
              </TableRow>
            ) : (
              filteredBranches.map((branch) => (
                <TableRow key={branch._id}>
                  <TableCell className="font-medium">{branch.code}</TableCell>
                  <TableCell>{branch.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {branch.city && branch.province
                      ? `${branch.city}, ${branch.province}`
                      : branch.city || branch.province || "-"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {branch.phone || "-"}
                    {branch.email && (
                      <div className="text-sm text-muted-foreground">{branch.email}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={branch.isActive ? "default" : "secondary"}>
                      {branch.isActive ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialog(branch)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(branch._id)}
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
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingBranch ? "Edit Cabang" : "Tambah Cabang"}
              </DialogTitle>
              <DialogDescription>
                {editingBranch
                  ? "Ubah informasi cabang toko"
                  : "Tambahkan cabang toko baru"}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="code">
                    Kode Cabang <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value.toUpperCase() })
                    }
                    placeholder="CAB001"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="name">
                    Nama Cabang <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Petshop Pusat"
                    required
                  />
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
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="phone">Telepon</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    placeholder="021-12345678"
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
                    placeholder="cabang@petshop.com"
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
                {editingBranch ? "Simpan" : "Tambah"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
