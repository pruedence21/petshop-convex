"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface AddCategoryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: (id: string) => void;
}

export function AddCategoryDialog({ open, onOpenChange, onSuccess }: AddCategoryDialogProps) {
    const [formData, setFormData] = useState({
        code: "",
        name: "",
        description: "",
        icon: "",
    });

    const createCategory = useMutation(api.inventory.productCategories.create);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const id = await createCategory({
                code: formData.code,
                name: formData.name,
                description: formData.description || undefined,
                icon: formData.icon || undefined,
            });
            toast.success("Kategori produk berhasil ditambahkan");
            onSuccess?.(id);
            onOpenChange(false);
            setFormData({ code: "", name: "", description: "", icon: "" });
        } catch (error: any) {
            toast.error(error.message || "Terjadi kesalahan");
            console.error(error);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Tambah Kategori Baru</DialogTitle>
                        <DialogDescription>
                            Tambahkan kategori produk baru
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="category-code">
                                    Kode Kategori <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="category-code"
                                    value={formData.code}
                                    onChange={(e) =>
                                        setFormData({ ...formData, code: e.target.value.toUpperCase() })
                                    }
                                    placeholder="CAT-001"
                                    required
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="category-icon">Icon (Emoji)</Label>
                                <Input
                                    id="category-icon"
                                    value={formData.icon}
                                    onChange={(e) =>
                                        setFormData({ ...formData, icon: e.target.value })
                                    }
                                    placeholder="🍖"
                                />
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="category-name">
                                Nama Kategori <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="category-name"
                                value={formData.name}
                                onChange={(e) =>
                                    setFormData({ ...formData, name: e.target.value })
                                }
                                placeholder="Makanan"
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="category-description">Deskripsi</Label>
                            <Textarea
                                id="category-description"
                                value={formData.description}
                                onChange={(e) =>
                                    setFormData({ ...formData, description: e.target.value })
                                }
                                placeholder="Deskripsi kategori..."
                                rows={3}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Batal
                        </Button>
                        <Button type="submit">Tambah</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
