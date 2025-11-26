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
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, Search, User, UserCheck, UserX, Shield } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";

type UserProfile = {
  _id: Id<"userProfiles">;
  userId: string;
  name: string;
  email: string;
  phone?: string;
  branchId?: Id<"branches">;
  roleId?: Id<"roles">;
  isActive: boolean;
  lastLoginAt?: number;
  branchName?: string;
  roleName?: string;
};

export default function UsersPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterBranch, setFilterBranch] = useState<string>("all");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    branchId: "",
    roleId: "",
  });

  const currentUser = useQuery(api.users.userManagement.getCurrentUser);
  const users = useQuery(api.users.userManagement.listUsers, {
    branchId: filterBranch !== "all" ? (filterBranch as Id<"branches">) : undefined,
    roleId: filterRole !== "all" ? (filterRole as Id<"roles">) : undefined,
    isActive: filterStatus === "all" ? undefined : filterStatus === "active",
    searchQuery: searchQuery || undefined,
  });
  const branches = useQuery(api.master_data.branches.list, { includeInactive: false });
  const roles = useQuery(api.users.roles.listRoles, {});

  const createUser = useMutation(api.users.userManagement.createUser);
  const updateUser = useMutation(api.users.userManagement.updateUser);
  const toggleUserStatus = useMutation(api.users.userManagement.toggleUserStatus);
  const deleteUser = useMutation(api.users.userManagement.deleteUser);

  const handleOpenDialog = (user?: UserProfile) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        name: user.name,
        email: user.email,
        phone: user.phone || "",
        branchId: user.branchId || "",
        roleId: user.roleId || "",
      });
    } else {
      setEditingUser(null);
      setFormData({
        name: "",
        email: "",
        phone: "",
        branchId: "",
        roleId: "",
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingUser(null);
    setFormData({
      name: "",
      email: "",
      phone: "",
      branchId: "",
      roleId: "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await updateUser({
          profileId: editingUser._id,
          name: formData.name,
          phone: formData.phone || undefined,
          branchId: formData.branchId ? (formData.branchId as Id<"branches">) : undefined,
          roleId: formData.roleId ? (formData.roleId as Id<"roles">) : undefined,
        });
        toast.success("User berhasil diperbarui");
      } else {
        await createUser({
          email: formData.email,
          name: formData.name,
          phone: formData.phone || undefined,
          branchId: formData.branchId ? (formData.branchId as Id<"branches">) : undefined,
          roleId: formData.roleId ? (formData.roleId as Id<"roles">) : undefined,
        });
        toast.success("Undangan user berhasil dibuat. User dapat mendaftar dengan email ini.");
      }
      handleCloseDialog();
    } catch (error: any) {
      toast.error(error.message || "Terjadi kesalahan");
      console.error(error);
    }
  };

  const handleToggleStatus = async (profileId: Id<"userProfiles">, currentStatus: boolean) => {
    try {
      await toggleUserStatus({
        profileId,
        isActive: !currentStatus,
      });
      toast.success(currentStatus ? "User berhasil dinonaktifkan" : "User berhasil diaktifkan");
    } catch (error: any) {
      toast.error(error.message || "Terjadi kesalahan");
    }
  };

  const handleDelete = async (profileId: Id<"userProfiles">) => {
    if (confirm("Apakah Anda yakin ingin menghapus user ini? Tindakan ini tidak dapat dibatalkan.")) {
      try {
        await deleteUser({ profileId });
        toast.success("User berhasil dihapus");
      } catch (error: any) {
        toast.error(error.message || "Terjadi kesalahan");
      }
    }
  };

  // Check if current user has permission
  const hasPermission = (permission: string) => {
    return currentUser?.permissions?.includes(permission) || false;
  };

  const canCreate = hasPermission("users.create");
  const canUpdate = hasPermission("users.update");
  const canDelete = hasPermission("users.delete");

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">Kelola user dan akses sistem</p>
        </div>
        {canCreate && (
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            Tambah User
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-end">
        <div className="flex-1">
          <Label htmlFor="search">Cari</Label>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="search"
              placeholder="Cari nama atau email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <div className="w-[200px]">
          <Label htmlFor="branch">Cabang</Label>
          <Select value={filterBranch} onValueChange={setFilterBranch}>
            <SelectTrigger id="branch">
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
        <div className="w-[200px]">
          <Label htmlFor="role">Role</Label>
          <Select value={filterRole} onValueChange={setFilterRole}>
            <SelectTrigger id="role">
              <SelectValue placeholder="Semua Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Role</SelectItem>
              {roles?.map((role) => (
                <SelectItem key={role._id} value={role._id}>
                  {role.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-[150px]">
          <Label htmlFor="status">Status</Label>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger id="status">
              <SelectValue placeholder="Semua" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua</SelectItem>
              <SelectItem value="active">Aktif</SelectItem>
              <SelectItem value="inactive">Nonaktif</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Users Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Cabang</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Login</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!users ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center">
                  {currentUser === null ? (
                    <div className="space-y-2">
                      <p className="font-medium">Belum ada profil user yang terdaftar.</p>
                      <p className="text-sm text-muted-foreground">
                        Untuk memulai, buat Super Admin pertama melalui Convex Dashboard: jalankan fungsi
                        <code className="px-1 py-0.5 rounded bg-muted">internal.adminSeed.createSuperAdminProfile</code>{" "}
                        dengan parameter <code className="px-1 py-0.5 rounded bg-muted">userId</code> (identity Anda), <code className="px-1 py-0.5 rounded bg-muted">email</code>, dan <code className="px-1 py-0.5 rounded bg-muted">name</code>. Lihat panduan di <code className="px-1 py-0.5 rounded bg-muted">RBAC_SETUP_GUIDE.md</code>.
                      </p>
                    </div>
                  ) : (
                    "Tidak ada data user"
                  )}
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user._id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      {user.name}
                      {user.userId.startsWith("pending:") && (
                        <Badge variant="secondary" className="text-xs">Pending</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    {user.roleName ? (
                      <Badge variant="outline" className="gap-1">
                        <Shield className="h-3 w-3" />
                        {user.roleName}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.branchName || <span className="text-muted-foreground">-</span>}
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.isActive ? "default" : "secondary"}>
                      {user.isActive ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.lastLoginAt ? (
                      formatDate(user.lastLoginAt)
                    ) : (
                      <span className="text-muted-foreground">Belum login</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {canUpdate && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDialog(user)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleStatus(user._id, user.isActive)}
                          >
                            {user.isActive ? (
                              <UserX className="h-4 w-4" />
                            ) : (
                              <UserCheck className="h-4 w-4" />
                            )}
                          </Button>
                        </>
                      )}
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(user._id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
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
            <DialogTitle>{editingUser ? "Edit User" : "Tambah User Baru"}</DialogTitle>
            <DialogDescription>
              {editingUser
                ? "Perbarui informasi user"
                : "Buat profil user baru. User akan diminta mendaftar dengan email yang didaftarkan."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nama Lengkap *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    disabled={!!editingUser}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">No. Telepon</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="branch">Cabang</Label>
                  <Select
                    value={formData.branchId}
                    onValueChange={(value) => setFormData({ ...formData, branchId: value })}
                  >
                    <SelectTrigger id="branch">
                      <SelectValue placeholder="Pilih Cabang" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Tidak ada</SelectItem>
                      {branches?.map((branch) => (
                        <SelectItem key={branch._id} value={branch._id}>
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role *</Label>
                <Select
                  value={formData.roleId}
                  onValueChange={(value) => setFormData({ ...formData, roleId: value })}
                  required
                >
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Pilih Role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles?.map((role) => (
                      <SelectItem key={role._id} value={role._id}>
                        <div className="flex items-center gap-2">
                          <Shield className="h-3 w-3" />
                          {role.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Batal
              </Button>
              <Button type="submit">
                {editingUser ? "Simpan Perubahan" : "Buat User"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
