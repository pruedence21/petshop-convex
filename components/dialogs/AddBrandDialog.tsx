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

interface AddBrandDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: (id: string) => void;
}

export function AddBrandDialog({ open, onOpenChange, onSuccess }: AddBrandDialogProps) {
    const [formData, setFormData] = useState({
        code: "",
        name: "",
        description: "",
    });

    const createBrand = useMutation(api.inventory.brands.create);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const id = await createBrand({
                code: formData.code,
                name: formData.name,
                description: formData.description || undefined,
            });
            toast.success("Merek berhasil ditambahkan");
            onSuccess?.(id);
            onOpenChange(false);
            setFormData({ code: "", name: "", description: "" });
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
                        <DialogTitle>Tambah Merek Baru</DialogTitle>
                        <DialogDescription>
                            Tambahkan merek produk baru
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="brand-code">
                                    Kode Merek <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="brand-code"
                                    value={formData.code}
                                    onChange={(e) =>
                                        setFormData({ ...formData, code: e.target.value.toUpperCase() })
                                    }
                                    placeholder="BRD-001"
                                    required
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="brand-name">
                                    Nama Merek <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="brand-name"
                                    value={formData.name}
                                    onChange={(e) =>
                                        setFormData({ ...formData, name: e.target.value })
                                    }
                                    placeholder="Royal Canin"
                                    required
                                />
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="brand-description">Deskripsi</Label>
                            <Textarea
                                id="brand-description"
                                value={formData.description}
                                onChange={(e) =>
                                    setFormData({ ...formData, description: e.target.value })
                                }
                                placeholder="Deskripsi merek..."
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
