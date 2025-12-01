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

export default function PayablesPage() {
    const agingReport = useQuery(api.finance.accountsPayable.getAgingReport, {});

    if (!agingReport) {
        return <div className="p-8 text-center">Memuat data hutang...</div>;
    }

    const totalPayables = agingReport.summary.totalOutstanding;

    return (
        <div className="p-8 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Hutang Usaha (AP)</h1>
                    <p className="text-muted-foreground">Monitor tagihan supplier yang harus dibayar</p>
                </div>
                <div className="text-right">
                    <p className="text-sm text-muted-foreground">Total Hutang</p>
                    <p className="text-3xl font-bold text-red-600">{formatCurrency(totalPayables)}</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Laporan Umur Hutang (Aging Report)</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Supplier</TableHead>
                                <TableHead className="text-right">Total Hutang</TableHead>
                                <TableHead className="text-right">Belum Jatuh Tempo</TableHead>
                                <TableHead className="text-right">1-30 Hari</TableHead>
                                <TableHead className="text-right">31-60 Hari</TableHead>
                                <TableHead className="text-right">61-90 Hari</TableHead>
                                <TableHead className="text-right">&gt; 90 Hari</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {agingReport.supplierAging.map((item) => (
                                <TableRow key={item.supplierId}>
                                    <TableCell className="font-medium">{item.supplierName}</TableCell>
                                    <TableCell className="text-right font-bold">{formatCurrency(item.totalOutstanding)}</TableCell>
                                    <TableCell className="text-right text-muted-foreground">{formatCurrency(0)}</TableCell>
                                    <TableCell className="text-right text-yellow-600">{formatCurrency(item.current)}</TableCell>
                                    <TableCell className="text-right text-orange-600">{formatCurrency(item.days31to60)}</TableCell>
                                    <TableCell className="text-right text-red-600">{formatCurrency(item.days61to90)}</TableCell>
                                    <TableCell className="text-right text-red-800 font-bold">{formatCurrency(item.over90days)}</TableCell>
                                    <TableCell>
                                        <Link href={`/dashboard/finance/payables/${item.supplierId}`}>
                                            <Button variant="ghost" size="icon">
                                                <ArrowRight className="h-4 w-4" />
                                            </Button>
                                        </Link>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {agingReport.supplierAging.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                                        Tidak ada hutang outstanding.
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
