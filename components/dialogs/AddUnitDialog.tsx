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

interface AddUnitDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: (id: string) => void;
}

export function AddUnitDialog({ open, onOpenChange, onSuccess }: AddUnitDialogProps) {
    const [formData, setFormData] = useState({
        code: "",
        name: "",
        description: "",
        isBase: false,
    });

    const createUnit = useMutation(api.inventory.units.create);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const id = await createUnit({
                code: formData.code,
                name: formData.name,
                description: formData.description || undefined,
                isBase: formData.isBase,
            });
            toast.success("Satuan berhasil ditambahkan");
            onSuccess?.(id);
            onOpenChange(false);
            setFormData({ code: "", name: "", description: "", isBase: false });
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
                        <DialogTitle>Tambah Satuan Baru</DialogTitle>
                        <DialogDescription>
                            Tambahkan satuan produk baru
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="unit-code">
                                    Kode Satuan <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="unit-code"
                                    value={formData.code}
                                    onChange={(e) =>
                                        setFormData({ ...formData, code: e.target.value.toLowerCase() })
                                    }
                                    placeholder="pcs"
                                    required
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="unit-name">
                                    Nama Satuan <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="unit-name"
                                    value={formData.name}
                                    onChange={(e) =>
                                        setFormData({ ...formData, name: e.target.value })
                                    }
                                    placeholder="Pieces"
                                    required
                                />
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="unit-description">Deskripsi</Label>
                            <Textarea
                                id="unit-description"
                                value={formData.description}
                                onChange={(e) =>
                                    setFormData({ ...formData, description: e.target.value })
                                }
                                placeholder="Deskripsi satuan..."
                                rows={3}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="unit-isBase"
                                checked={formData.isBase}
                                onChange={(e) =>
                                    setFormData({ ...formData, isBase: e.target.checked })
                                }
                                className="w-4 h-4"
                            />
                            <Label htmlFor="unit-isBase" className="cursor-pointer">
                                Satuan Dasar (pcs, kg, liter, dll)
                            </Label>
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
