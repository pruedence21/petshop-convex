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
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Pencil, Trash2, Shield, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

type Role = {
    _id: Id<"roles">;
    name: string;
    description?: string;
    permissions: string[];
    isActive: boolean;
};

export default function RolesPage() {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<Role | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        permissions: [] as string[],
    });

    const currentUser = useQuery(api.users.userManagement.getCurrentUser);
    const roles = useQuery(api.users.roles.listRoles, { includeInactive: false });
    const allPermissions = useQuery(api.users.roles.getPermissions);

    const createRole = useMutation(api.users.roles.createRole);
    const updateRole = useMutation(api.users.roles.updateRole);
    const deleteRole = useMutation(api.users.roles.deleteRole);

    const handleOpenDialog = (role?: Role) => {
        if (role) {
            setEditingRole(role);
            setFormData({
                name: role.name,
                description: role.description || "",
                permissions: role.permissions,
            });
        } else {
            setEditingRole(null);
            setFormData({
                name: "",
                description: "",
                permissions: [],
            });
        }
        setIsDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setIsDialogOpen(false);
        setEditingRole(null);
        setFormData({
            name: "",
            description: "",
            permissions: [],
        });
    };

    const handlePermissionToggle = (permission: string) => {
        setFormData((prev) => {
            if (prev.permissions.includes(permission)) {
                return {
                    ...prev,
                    permissions: prev.permissions.filter((p) => p !== permission),
                };
            } else {
                return {
                    ...prev,
                    permissions: [...prev.permissions, permission],
                };
            }
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingRole) {
                await updateRole({
                    roleId: editingRole._id,
                    name: formData.name,
                    description: formData.description,
                    permissions: formData.permissions,
                });
                toast.success("Role berhasil diperbarui");
            } else {
                await createRole({
                    name: formData.name,
                    description: formData.description,
                    permissions: formData.permissions,
                });
                toast.success("Role berhasil dibuat");
            }
            handleCloseDialog();
        } catch (error: any) {
            toast.error(error.message || "Terjadi kesalahan");
            console.error(error);
        }
    };

    const handleDelete = async (roleId: Id<"roles">) => {
        if (confirm("Apakah Anda yakin ingin menghapus role ini? Tindakan ini tidak dapat dibatalkan.")) {
            try {
                await deleteRole({ roleId });
                toast.success("Role berhasil dihapus");
            } catch (error: any) {
                toast.error(error.message || "Terjadi kesalahan");
            }
        }
    };

    // Group permissions for better UI
    const groupedPermissions = allPermissions
        ? Object.entries(allPermissions).reduce((acc, [key, value]) => {
            const category = value.split(".")[0];
            if (!acc[category]) {
                acc[category] = [];
            }
            acc[category].push({ key, value });
            return acc;
        }, {} as Record<string, { key: string; value: string }[]>)
        : {};

    // Check permissions
    const canCreate = currentUser?.permissions?.includes("roles.create");
    const canUpdate = currentUser?.permissions?.includes("roles.update");
    const canDelete = currentUser?.permissions?.includes("roles.delete");

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Role Management</h1>
                    <p className="text-muted-foreground">Kelola role dan hak akses sistem</p>
                </div>
                {canCreate && (
                    <Button onClick={() => handleOpenDialog()}>
                        <Plus className="mr-2 h-4 w-4" />
                        Tambah Role
                    </Button>
                )}
            </div>

            <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nama Role</TableHead>
                            <TableHead>Deskripsi</TableHead>
                            <TableHead>Jumlah Permission</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {!roles ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center">
                                    Loading...
                                </TableCell>
                            </TableRow>
                        ) : roles.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center">
                                    Tidak ada data role
                                </TableCell>
                            </TableRow>
                        ) : (
                            roles.map((role) => (
                                <TableRow key={role._id}>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-2">
                                            <Shield className="h-4 w-4 text-muted-foreground" />
                                            {role.name}
                                        </div>
                                    </TableCell>
                                    <TableCell>{role.description || "-"}</TableCell>
                                    <TableCell>
                                        <Badge variant="secondary">
                                            {role.permissions.length} permissions
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={role.isActive ? "default" : "secondary"}>
                                            {role.isActive ? "Aktif" : "Nonaktif"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            {canUpdate && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleOpenDialog(role)}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                            )}
                                            {canDelete && role.name !== "Admin" && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDelete(role._id)}
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

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>{editingRole ? "Edit Role" : "Tambah Role Baru"}</DialogTitle>
                        <DialogDescription>
                            Atur nama role dan hak akses yang diberikan
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto py-4">
                        <form id="role-form" onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Nama Role *</Label>
                                    <Input
                                        id="name"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="description">Deskripsi</Label>
                                    <Input
                                        id="description"
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <Label>Permissions</Label>
                                    <Badge variant="outline">
                                        {formData.permissions.length} Selected
                                    </Badge>
                                </div>

                                <ScrollArea className="h-[400px] border rounded-md p-4">
                                    <div className="space-y-6">
                                        {Object.entries(groupedPermissions).map(([category, perms]) => (
                                            <div key={category} className="space-y-3">
                                                <h4 className="font-medium capitalize text-sm text-muted-foreground border-b pb-1">
                                                    {category.replace("_", " ")}
                                                </h4>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {perms.map((perm) => (
                                                        <div key={perm.value} className="flex items-start space-x-2">
                                                            <Checkbox
                                                                id={perm.value}
                                                                checked={formData.permissions.includes(perm.value)}
                                                                onCheckedChange={() => handlePermissionToggle(perm.value)}
                                                            />
                                                            <label
                                                                htmlFor={perm.value}
                                                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                                            >
                                                                {perm.value}
                                                            </label>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </div>
                        </form>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={handleCloseDialog}>
                            Batal
                        </Button>
                        <Button type="submit" form="role-form">
                            {editingRole ? "Simpan Perubahan" : "Buat Role"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
