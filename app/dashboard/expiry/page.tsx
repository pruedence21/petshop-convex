"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, AlertTriangle, Calendar, Package } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

export default function ExpiryDashboardPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [daysThreshold, setDaysThreshold] = useState(90); // Default 3 months

    const expiringItems = useQuery(api.inventory.expiry.getExpiringItems, {
        daysThreshold,
        branchId: undefined, // All branches
    });

    const filteredItems = expiringItems?.filter((item) =>
        item.product?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.batchNumber.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getExpiryStatus = (days: number) => {
        if (days < 0) return <Badge variant="destructive">Expired</Badge>;
        if (days <= 30) return <Badge className="bg-red-500">Critical</Badge>;
        if (days <= 60) return <Badge className="bg-orange-500">Warning</Badge>;
        return <Badge className="bg-yellow-500">Upcoming</Badge>;
    };

    return (
        <div className="p-8 space-y-8">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Monitoring Kadaluarsa</h1>
                    <p className="text-slate-500 mt-1">Pantau stok obat dan produk yang akan kadaluarsa</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Item Expired</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">
                            {expiringItems?.filter(i => i.daysUntilExpiry < 0).length || 0}
                        </div>
                        <p className="text-xs text-slate-500">Sudah melewati tanggal kadaluarsa</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Critical ({"<"} 30 Hari)</CardTitle>
                        <Calendar className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">
                            {expiringItems?.filter(i => i.daysUntilExpiry >= 0 && i.daysUntilExpiry <= 30).length || 0}
                        </div>
                        <p className="text-xs text-slate-500">Perlu tindakan segera</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Upcoming ({"<"} {daysThreshold} Hari)</CardTitle>
                        <Package className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">
                            {expiringItems?.length || 0}
                        </div>
                        <p className="text-xs text-slate-500">Total item dalam pantauan</p>
                    </CardContent>
                </Card>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
                <div className="p-6 border-b border-slate-200">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 flex-1">
                            <div className="relative flex-1 max-w-md">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    placeholder="Cari produk atau batch number..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-slate-500 whitespace-nowrap">Threshold (Hari):</span>
                                <Input
                                    type="number"
                                    value={daysThreshold}
                                    onChange={(e) => setDaysThreshold(parseInt(e.target.value) || 0)}
                                    className="w-20"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Produk</TableHead>
                            <TableHead>Batch Number</TableHead>
                            <TableHead>Cabang</TableHead>
                            <TableHead>Tanggal Kadaluarsa</TableHead>
                            <TableHead>Sisa Hari</TableHead>
                            <TableHead className="text-right">Stok</TableHead>
                            <TableHead>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {!filteredItems ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                                    Memuat data...
                                </TableCell>
                            </TableRow>
                        ) : filteredItems.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                                    Tidak ada item yang mendekati kadaluarsa
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredItems.map((item) => (
                                <TableRow key={item._id}>
                                    <TableCell className="font-medium">
                                        {item.product?.name}
                                        {item.variant && (
                                            <span className="text-slate-500 font-normal ml-1">
                                                ({item.variant.variantName}: {item.variant.variantValue})
                                            </span>
                                        )}
                                    </TableCell>
                                    <TableCell className="font-mono text-sm">{item.batchNumber}</TableCell>
                                    <TableCell>{item.branch?.name}</TableCell>
                                    <TableCell>{formatDateTime(item.expiredDate).split(',')[0]}</TableCell>
                                    <TableCell>
                                        <span className={item.daysUntilExpiry < 0 ? "text-red-600 font-bold" : ""}>
                                            {item.daysUntilExpiry} Hari
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right font-medium">{item.quantity}</TableCell>
                                    <TableCell>{getExpiryStatus(item.daysUntilExpiry)}</TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
