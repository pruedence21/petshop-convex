"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export default function ReceivablesPage() {
    const agingReport = useQuery(api.finance.accountsReceivable.getAgingReport, {});

    if (!agingReport) {
        return <div className="p-8 text-center">Memuat data piutang...</div>;
    }

    const totalReceivables = agingReport.summary.totalOutstanding;

    return (
        <div className="p-8 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Piutang Usaha (AR)</h1>
                    <p className="text-muted-foreground">Monitor tagihan pelanggan yang belum lunas</p>
                </div>
                <div className="text-right">
                    <p className="text-sm text-muted-foreground">Total Piutang</p>
                    <p className="text-3xl font-bold text-primary">{formatCurrency(totalReceivables)}</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Laporan Umur Piutang (Aging Report)</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Pelanggan</TableHead>
                                <TableHead className="text-right">Total Tagihan</TableHead>
                                <TableHead className="text-right">0-30 Hari</TableHead>
                                <TableHead className="text-right">31-60 Hari</TableHead>
                                <TableHead className="text-right">61-90 Hari</TableHead>
                                <TableHead className="text-right">&gt; 90 Hari</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {agingReport.customerAging.map((item) => (
                                <TableRow key={item.customerId}>
                                    <TableCell className="font-medium">{item.customerName}</TableCell>
                                    <TableCell className="text-right font-bold">{formatCurrency(item.totalOutstanding)}</TableCell>
                                    <TableCell className="text-right text-muted-foreground">{formatCurrency(item.current)}</TableCell>
                                    <TableCell className="text-right text-yellow-600">{formatCurrency(item.days31to60)}</TableCell>
                                    <TableCell className="text-right text-orange-600">{formatCurrency(item.days61to90)}</TableCell>
                                    <TableCell className="text-right text-red-800 font-bold">{formatCurrency(item.over90days)}</TableCell>
                                    <TableCell>
                                        <Link href={`/dashboard/finance/receivables/${item.customerId}`}>
                                            <Button variant="ghost" size="icon">
                                                <ArrowRight className="h-4 w-4" />
                                            </Button>
                                        </Link>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {agingReport.customerAging.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                                        Tidak ada piutang outstanding.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
