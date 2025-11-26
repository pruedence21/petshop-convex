"use client";

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
import { customerFormSchema, CustomerFormData } from "@/components/forms/customerFormSchema";

interface AddCustomerDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: (id: string) => void;
}

export function AddCustomerDialog({ open, onOpenChange, onSuccess }: AddCustomerDialogProps) {
    const createCustomer = useMutation(api.master_data.customers.create);

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

                const id = await createCustomer(payload);
                toast.success("Pelanggan berhasil ditambahkan");
                onSuccess?.(id);
                onOpenChange(false);
                customerForm.reset();
            } catch (error: any) {
                toast.error(error.message || "Terjadi kesalahan");
                console.error(error);
            }
        },
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                <form onSubmit={customerForm.submit}>
                    <DialogHeader>
                        <DialogTitle>Tambah Pelanggan Baru</DialogTitle>
                        <DialogDescription>
                            Tambahkan pelanggan baru
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
                            onClick={() => onOpenChange(false)}
                        >
                            Batal
                        </Button>
                        <Button type="submit" disabled={!customerForm.isValid}>
                            Tambah
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
