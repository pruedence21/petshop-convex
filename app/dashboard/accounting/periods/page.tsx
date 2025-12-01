"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Lock, Unlock, Plus, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Id } from "@/convex/_generated/dataModel";

export default function AccountingPeriodsPage() {
    const [yearFilter, setYearFilter] = useState<number>(new Date().getFullYear());
    const periods = useQuery(api.finance.accountingPeriods.list, { year: yearFilter });

    const createPeriod = useMutation(api.finance.accountingPeriods.createPeriod);
    const closePeriod = useMutation(api.finance.accountingPeriods.closePeriod);
    const lockPeriod = useMutation(api.finance.accountingPeriods.lockPeriod);
    const reopenPeriod = useMutation(api.finance.accountingPeriods.reopenPeriod);

    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [newPeriodData, setNewPeriodData] = useState({
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1,
    });

    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleDateString("id-ID", {
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "OPEN":
                return <Badge className="bg-green-100 text-green-800">Open</Badge>;
            case "CLOSED":
                return <Badge className="bg-amber-100 text-amber-800">Closed</Badge>;
            case "LOCKED":
                return <Badge className="bg-slate-100 text-slate-800">Locked</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    const handleCreatePeriod = async () => {
        try {
            await createPeriod(newPeriodData);
            toast.success("Periode berhasil dibuat");
            setShowCreateDialog(false);
        } catch (error: any) {
            toast.error(error.message || "Gagal membuat periode");
        }
    };

    const handleClosePeriod = async (id: Id<"accountingPeriods">) => {
        if (!confirm("Yakin ingin menutup periode ini?")) return;
        try {
            await closePeriod({ periodId: id });
            toast.success("Periode berhasil ditutup");
        } catch (error: any) {
            toast.error(error.message || "Gagal menutup periode");
        }
    };

    const handleLockPeriod = async (id: Id<"accountingPeriods">) => {
        if (!confirm("Yakin ingin mengunci periode ini?")) return;
        try {
            await lockPeriod({ periodId: id });
            toast.success("Periode berhasil dikunci");
        } catch (error: any) {
            toast.error(error.message || "Gagal mengunci periode");
        }
    };

    const handleReopenPeriod = async (id: Id<"accountingPeriods">) => {
        if (!confirm("Yakin ingin membuka kembali periode ini?")) return;
        try {
            await reopenPeriod({ periodId: id });
            toast.success("Periode berhasil dibuka kembali");
        } catch (error: any) {
            toast.error(error.message || "Gagal membuka kembali periode");
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Periode Akuntansi</h1>
                    <p className="text-slate-600 mt-1">
                        Kelola periode akuntansi, tutup buku, dan penguncian periode
                    </p>
                </div>
                <Button onClick={() => setShowCreateDialog(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Buat Periode Baru
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>Daftar Periode</CardTitle>
                        <div className="flex items-center gap-2">
                            <Label>Filter Tahun:</Label>
                            <Select
                                value={yearFilter.toString()}
                                onValueChange={(v) => setYearFilter(parseInt(v))}
                            >
                                <SelectTrigger className="w-[100px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {[2023, 2024, 2025, 2026].map((year) => (
                                        <SelectItem key={year} value={year.toString()}>
                                            {year}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Periode</TableHead>
                                <TableHead>Tanggal Mulai</TableHead>
                                <TableHead>Tanggal Selesai</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Jumlah Transaksi</TableHead>
                                <TableHead className="text-right">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {!periods || periods.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                                        <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                        <p>Belum ada periode akuntansi untuk tahun {yearFilter}</p>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                periods.map((period) => (
                                    <TableRow key={period._id}>
                                        <TableCell className="font-medium">{period.periodName}</TableCell>
                                        <TableCell>{formatDate(period.startDate)}</TableCell>
                                        <TableCell>{formatDate(period.endDate)}</TableCell>
                                        <TableCell>{getStatusBadge(period.status)}</TableCell>
                                        <TableCell className="text-right font-mono">
                                            {period.transactionCount}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                {period.status === "OPEN" && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleClosePeriod(period._id)}
                                                        className="text-amber-600 border-amber-200 hover:bg-amber-50"
                                                    >
                                                        Tutup Buku
                                                    </Button>
                                                )}
                                                {period.status === "CLOSED" && (
                                                    <>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleReopenPeriod(period._id)}
                                                        >
                                                            <Unlock className="w-4 h-4 mr-1" />
                                                            Buka
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleLockPeriod(period._id)}
                                                            className="text-slate-600"
                                                        >
                                                            <Lock className="w-4 h-4 mr-1" />
                                                            Kunci
                                                        </Button>
                                                    </>
                                                )}
                                                {period.status === "LOCKED" && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        disabled
                                                        className="text-slate-400"
                                                    >
                                                        <Lock className="w-4 h-4 mr-1" />
                                                        Terkunci
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Buat Periode Baru</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Tahun</Label>
                                <Input
                                    type="number"
                                    value={newPeriodData.year}
                                    onChange={(e) =>
                                        setNewPeriodData({ ...newPeriodData, year: parseInt(e.target.value) })
                                    }
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Bulan</Label>
                                <Select
                                    value={newPeriodData.month.toString()}
                                    onValueChange={(v) =>
                                        setNewPeriodData({ ...newPeriodData, month: parseInt(v) })
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                                            <SelectItem key={m} value={m.toString()}>
                                                {new Date(2000, m - 1, 1).toLocaleString("id-ID", {
                                                    month: "long",
                                                })}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="bg-blue-50 p-3 rounded-md flex gap-2 text-sm text-blue-700">
                            <AlertCircle className="w-4 h-4 mt-0.5" />
                            <p>
                                Periode akan dibuat otomatis dengan tanggal awal dan akhir bulan yang
                                dipilih.
                            </p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                            Batal
                        </Button>
                        <Button onClick={handleCreatePeriod}>Buat Periode</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
