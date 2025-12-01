"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate, formatErrorMessage } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CreditCard } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Id } from "@/convex/_generated/dataModel";

export default function SupplierPayablesPage() {
    const params = useParams();
    const router = useRouter();
    const supplierId = params.supplierId as Id<"suppliers">;

    const data = useQuery(api.finance.accountsPayable.getSupplierOutstanding, {
        supplierId,
        includeHistory: true,
    });

    const addPayment = useMutation(api.procurement.purchaseOrders.addPayment);

    const [selectedBill, setSelectedBill] = useState<any>(null);
    const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState("BANK_TRANSFER");
    const [paymentRef, setPaymentRef] = useState("");
    const [paymentNotes, setPaymentNotes] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!data) {
        return <div className="p-8 text-center">Memuat data supplier...</div>;
    }

    const handleOpenPayment = (bill: any) => {
        setSelectedBill(bill);
        setPaymentAmount(bill.outstandingAmount);
        setPaymentMethod("BANK_TRANSFER");
        setPaymentRef("");
        setPaymentNotes("");
        setIsPaymentDialogOpen(true);
    };

    const handleSubmitPayment = async () => {
        if (!selectedBill) return;
        if (paymentAmount <= 0) {
            toast.error("Jumlah pembayaran harus lebih dari 0");
            return;
        }
        if (paymentAmount > selectedBill.outstandingAmount) {
            toast.error("Jumlah pembayaran melebihi sisa tagihan");
            return;
        }

        setIsSubmitting(true);
        try {
            await addPayment({
                purchaseOrderId: selectedBill.id as Id<"purchaseOrders">,
                amount: paymentAmount,
                paymentMethod,
                referenceNumber: paymentRef || undefined,
                notes: paymentNotes || undefined,
                paymentDate: Date.now(),
            });
            toast.success("Pembayaran berhasil dicatat");
            setIsPaymentDialogOpen(false);
        } catch (error) {
            toast.error(formatErrorMessage(error));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="p-8 space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{data.supplier.name}</h1>
                    <p className="text-muted-foreground">Detail Hutang & Riwayat Pembayaran</p>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Outstanding</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{formatCurrency(data.summary.totalOutstanding)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Jumlah Bill</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.summary.billCount}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Bill Terlama</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {data.summary.oldestBillDate ? formatDate(data.summary.oldestBillDate) : "-"}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Rata-rata Outstanding</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{Math.round(data.summary.averageDaysOutstanding)} Hari</div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Tagihan Belum Lunas (Unpaid Bills)</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>No. PO</TableHead>
                                <TableHead>Tanggal</TableHead>
                                <TableHead>Jatuh Tempo</TableHead>
                                <TableHead>Umur (Hari)</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                                <TableHead className="text-right">Sudah Bayar</TableHead>
                                <TableHead className="text-right">Sisa Tagihan</TableHead>
                                <TableHead className="w-[100px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.outstandingBills.map((bill) => (
                                <TableRow key={bill.id}>
                                    <TableCell className="font-medium">{bill.billNumber}</TableCell>
                                    <TableCell>{formatDate(bill.billDate)}</TableCell>
                                    <TableCell>{bill.dueDate ? formatDate(bill.dueDate) : "-"}</TableCell>
                                    <TableCell>
                                        <Badge variant={bill.daysOutstanding > 30 ? "destructive" : "secondary"}>
                                            {bill.daysOutstanding} Hari
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">{formatCurrency(bill.totalAmount)}</TableCell>
                                    <TableCell className="text-right text-muted-foreground">{formatCurrency(bill.paidAmount)}</TableCell>
                                    <TableCell className="text-right font-bold text-red-600">{formatCurrency(bill.outstandingAmount)}</TableCell>
                                    <TableCell>
                                        <Button size="sm" onClick={() => handleOpenPayment(bill)} variant="outline">
                                            <CreditCard className="h-4 w-4 mr-1" />
                                            Bayar
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {data.outstandingBills.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                                        Tidak ada tagihan outstanding.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Bayar Hutang</DialogTitle>
                        <DialogDescription>
                            Pembayaran untuk PO: {selectedBill?.billNumber}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Sisa Tagihan</Label>
                            <div className="col-span-3 font-bold text-red-600">
                                {selectedBill && formatCurrency(selectedBill.outstandingAmount)}
                            </div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="amount" className="text-right">Jumlah Bayar</Label>
                            <Input
                                id="amount"
                                type="number"
                                value={paymentAmount}
                                onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="method" className="text-right">Metode</Label>
                            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="BANK_TRANSFER">Transfer Bank</SelectItem>
                                    <SelectItem value="CASH">Tunai</SelectItem>
                                    <SelectItem value="CHECK">Cek / Giro</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="ref" className="text-right">No. Ref</Label>
                            <Input
                                id="ref"
                                value={paymentRef}
                                onChange={(e) => setPaymentRef(e.target.value)}
                                placeholder="No. Bukti Transfer"
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="notes" className="text-right">Catatan</Label>
                            <Input
                                id="notes"
                                value={paymentNotes}
                                onChange={(e) => setPaymentNotes(e.target.value)}
                                placeholder="Opsional"
                                className="col-span-3"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>Batal</Button>
                        <Button onClick={handleSubmitPayment} disabled={isSubmitting}>
                            {isSubmitting ? "Memproses..." : "Simpan Pembayaran"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
