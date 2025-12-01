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

export default function CustomerReceivablesPage() {
    const params = useParams();
    const router = useRouter();
    const customerId = params.customerId as Id<"customers">;

    const data = useQuery(api.finance.accountsReceivable.getCustomerOutstanding, {
        customerId,
        includeHistory: true,
    });

    const addPayment = useMutation(api.sales.sales.addPayment);

    const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
    const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState("CASH");
    const [paymentRef, setPaymentRef] = useState("");
    const [paymentNotes, setPaymentNotes] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!data) {
        return <div className="p-8 text-center">Memuat data pelanggan...</div>;
    }

    const handleOpenPayment = (invoice: any) => {
        setSelectedInvoice(invoice);
        setPaymentAmount(invoice.outstandingAmount);
        setPaymentMethod("CASH");
        setPaymentRef("");
        setPaymentNotes("");
        setIsPaymentDialogOpen(true);
    };

    const handleSubmitPayment = async () => {
        if (!selectedInvoice) return;
        if (paymentAmount <= 0) {
            toast.error("Jumlah pembayaran harus lebih dari 0");
            return;
        }
        if (paymentAmount > selectedInvoice.outstandingAmount) {
            toast.error("Jumlah pembayaran melebihi sisa tagihan");
            return;
        }

        setIsSubmitting(true);
        try {
            await addPayment({
                saleId: selectedInvoice.id as Id<"sales">,
                amount: paymentAmount,
                paymentMethod,
                paymentDate: Date.now(),
                referenceNumber: paymentRef || undefined,
                notes: paymentNotes || undefined,
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
                    <h1 className="text-3xl font-bold tracking-tight">{data.customer.name}</h1>
                    <p className="text-muted-foreground">Detail Piutang & Riwayat Pembayaran</p>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Outstanding</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(data.summary.totalOutstanding)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Jumlah Invoice</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.summary.invoiceCount}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Invoice Terlama</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {data.summary.oldestInvoiceDate ? formatDate(data.summary.oldestInvoiceDate) : "-"}
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
                    <CardTitle>Tagihan Belum Lunas</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>No. Invoice</TableHead>
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
                            {data.outstandingInvoices.map((invoice) => (
                                <TableRow key={invoice.id}>
                                    <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                                    <TableCell>{formatDate(invoice.invoiceDate)}</TableCell>
                                    <TableCell>{invoice.dueDate ? formatDate(invoice.dueDate) : "-"}</TableCell>
                                    <TableCell>
                                        <Badge variant={invoice.daysOutstanding > 30 ? "destructive" : "secondary"}>
                                            {invoice.daysOutstanding} Hari
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">{formatCurrency(invoice.totalAmount)}</TableCell>
                                    <TableCell className="text-right text-muted-foreground">{formatCurrency(invoice.paidAmount)}</TableCell>
                                    <TableCell className="text-right font-bold text-primary">{formatCurrency(invoice.outstandingAmount)}</TableCell>
                                    <TableCell>
                                        <Button size="sm" onClick={() => handleOpenPayment(invoice)}>
                                            <CreditCard className="h-4 w-4 mr-1" />
                                            Bayar
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {data.outstandingInvoices.length === 0 && (
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
                        <DialogTitle>Terima Pembayaran</DialogTitle>
                        <DialogDescription>
                            Pembayaran untuk Invoice: {selectedInvoice?.invoiceNumber}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Sisa Tagihan</Label>
                            <div className="col-span-3 font-bold">
                                {selectedInvoice && formatCurrency(selectedInvoice.outstandingAmount)}
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
                                    <SelectItem value="CASH">Tunai</SelectItem>
                                    <SelectItem value="BANK_TRANSFER">Transfer Bank</SelectItem>
                                    <SelectItem value="QRIS">QRIS</SelectItem>
                                    <SelectItem value="DEBIT_CARD">Debit Card</SelectItem>
                                    <SelectItem value="CREDIT_CARD">Credit Card</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="ref" className="text-right">No. Ref</Label>
                            <Input
                                id="ref"
                                value={paymentRef}
                                onChange={(e) => setPaymentRef(e.target.value)}
                                placeholder="Opsional"
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
