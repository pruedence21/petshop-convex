"use client";

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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useFormSchema } from "@/components/forms/useFormSchema";
import { FormField } from "@/components/forms/FormField";
import { petFormSchema, PetFormData } from "@/components/forms/petFormSchema";

interface AddPetDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: (id: string) => void;
    defaultCustomerId?: string;
}

export function AddPetDialog({ open, onOpenChange, onSuccess, defaultCustomerId }: AddPetDialogProps) {
    const createPet = useMutation(api.master_data.customerPets.create);
    const customers = useQuery(api.master_data.customers.list, { includeInactive: false });
    const categories = useQuery(api.clinic.animalCategories.list, { includeInactive: false });

    const petForm = useFormSchema<PetFormData>({
        schema: petFormSchema,
        validateOnChange: true,
        onSubmit: async (values) => {
            if (!values.customerId || !values.categoryId) {
                toast.error("Mohon lengkapi pemilik dan kategori hewan");
                return;
            }

            try {
                const payload = {
                    customerId: values.customerId as Id<"customers">,
                    name: values.name,
                    categoryId: values.categoryId as Id<"animalCategories">,
                    subcategoryId: values.subcategoryId
                        ? (values.subcategoryId as Id<"animalSubcategories">)
                        : undefined,
                    breed: values.breed || undefined,
                    dateOfBirth: values.dateOfBirth
                        ? new Date(values.dateOfBirth).getTime()
                        : undefined,
                    gender: values.gender || undefined,
                    weight: values.weight ? parseFloat(values.weight) : undefined,
                    color: values.color || undefined,
                    microchipNumber: values.microchipNumber || undefined,
                    notes: values.notes || undefined,
                };

                const id = await createPet(payload);
                toast.success("Data hewan berhasil ditambahkan");
                onSuccess?.(id);
                onOpenChange(false);
                petForm.reset();
            } catch (error: any) {
                toast.error(error.message || "Terjadi kesalahan");
                console.error(error);
            }
        },
    });

    const subcategories = useQuery(
        api.clinic.animalSubcategories.list,
        petForm.values.categoryId
            ? { categoryId: petForm.values.categoryId as Id<"animalCategories">, includeInactive: false }
            : "skip"
    );

    // Set default customer if provided
    if (defaultCustomerId && petForm.values.customerId !== defaultCustomerId) {
        petForm.setField("customerId", defaultCustomerId);
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                <form onSubmit={petForm.submit}>
                    <DialogHeader>
                        <DialogTitle>Tambah Hewan Peliharaan Baru</DialogTitle>
                        <DialogDescription>
                            Tambahkan data hewan peliharaan baru
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                label={petFormSchema.customerId.label}
                                required={petFormSchema.customerId.required}
                                error={petForm.errors.customerId}
                            >
                                <Select
                                    value={petForm.values.customerId}
                                    onValueChange={(value) => {
                                        petForm.setField("customerId", value);
                                    }}
                                    disabled={!!defaultCustomerId}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Pilih pemilik" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {customers?.map((customer) => (
                                            <SelectItem key={customer._id} value={customer._id}>
                                                {customer.name} ({customer.code})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </FormField>
                            <FormField
                                label={petFormSchema.name.label}
                                required={petFormSchema.name.required}
                                error={petForm.errors.name}
                            >
                                <Input
                                    id="name"
                                    value={petForm.values.name}
                                    onChange={(e) => petForm.setField("name", e.target.value)}
                                    onBlur={() => petForm.handleBlur("name")}
                                    placeholder="Buddy"
                                />
                            </FormField>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                label={petFormSchema.categoryId.label}
                                required={petFormSchema.categoryId.required}
                                error={petForm.errors.categoryId}
                            >
                                <Select
                                    value={petForm.values.categoryId}
                                    onValueChange={(value) => {
                                        petForm.setField("categoryId", value);
                                        petForm.setField("subcategoryId", "");
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Pilih jenis" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categories?.map((category) => (
                                            <SelectItem key={category._id} value={category._id}>
                                                {category.icon} {category.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </FormField>
                            <FormField
                                label={petFormSchema.subcategoryId.label}
                                required={petFormSchema.subcategoryId.required}
                                error={petForm.errors.subcategoryId}
                            >
                                <Select
                                    value={petForm.values.subcategoryId}
                                    onValueChange={(value) => petForm.setField("subcategoryId", value)}
                                    disabled={!petForm.values.categoryId}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Pilih sub kategori" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {subcategories?.map((sub) => (
                                            <SelectItem key={sub._id} value={sub._id}>
                                                {sub.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </FormField>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                label={petFormSchema.breed.label}
                                required={petFormSchema.breed.required}
                                error={petForm.errors.breed}
                            >
                                <Input
                                    id="breed"
                                    value={petForm.values.breed}
                                    onChange={(e) => petForm.setField("breed", e.target.value)}
                                    onBlur={() => petForm.handleBlur("breed")}
                                    placeholder="Golden Retriever, Persian, dll"
                                />
                            </FormField>
                            <FormField
                                label={petFormSchema.color.label}
                                required={petFormSchema.color.required}
                                error={petForm.errors.color}
                            >
                                <Input
                                    id="color"
                                    value={petForm.values.color}
                                    onChange={(e) => petForm.setField("color", e.target.value)}
                                    onBlur={() => petForm.handleBlur("color")}
                                    placeholder="Coklat, Putih, dll"
                                />
                            </FormField>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <FormField
                                label={petFormSchema.dateOfBirth.label}
                                required={petFormSchema.dateOfBirth.required}
                                error={petForm.errors.dateOfBirth}
                            >
                                <Input
                                    id="dateOfBirth"
                                    type="date"
                                    value={petForm.values.dateOfBirth}
                                    onChange={(e) => petForm.setField("dateOfBirth", e.target.value)}
                                    onBlur={() => petForm.handleBlur("dateOfBirth")}
                                />
                            </FormField>
                            <FormField
                                label={petFormSchema.gender.label}
                                required={petFormSchema.gender.required}
                                error={petForm.errors.gender}
                            >
                                <Select
                                    value={petForm.values.gender}
                                    onValueChange={(value) => petForm.setField("gender", value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Pilih" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="L">Jantan</SelectItem>
                                        <SelectItem value="P">Betina</SelectItem>
                                    </SelectContent>
                                </Select>
                            </FormField>
                            <FormField
                                label={petFormSchema.weight.label}
                                required={petFormSchema.weight.required}
                                error={petForm.errors.weight}
                            >
                                <Input
                                    id="weight"
                                    type="number"
                                    step="0.1"
                                    value={petForm.values.weight}
                                    onChange={(e) => petForm.setField("weight", e.target.value)}
                                    onBlur={() => petForm.handleBlur("weight")}
                                    placeholder="5.5"
                                />
                            </FormField>
                        </div>
                        <FormField
                            label={petFormSchema.microchipNumber.label}
                            required={petFormSchema.microchipNumber.required}
                            error={petForm.errors.microchipNumber}
                        >
                            <Input
                                id="microchipNumber"
                                value={petForm.values.microchipNumber}
                                onChange={(e) => petForm.setField("microchipNumber", e.target.value)}
                                onBlur={() => petForm.handleBlur("microchipNumber")}
                                placeholder="Nomor microchip jika ada"
                            />
                        </FormField>
                        <FormField
                            label={petFormSchema.notes.label}
                            required={petFormSchema.notes.required}
                            error={petForm.errors.notes}
                        >
                            <Textarea
                                id="notes"
                                value={petForm.values.notes}
                                onChange={(e) => petForm.setField("notes", e.target.value)}
                                onBlur={() => petForm.handleBlur("notes")}
                                placeholder="Catatan tambahan (alergi, kondisi kesehatan, dll)"
                                rows={3}
                            />
                        </FormField>
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Batal
                        </Button>
                        <Button type="submit" disabled={!petForm.isValid}>
                            Tambah
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
