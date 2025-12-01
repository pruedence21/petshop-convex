"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  FileText,
  Plus,
  Eye,
  XCircle,
  CheckCircle,
  Filter,
  Calendar,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Id } from "@/convex/_generated/dataModel";

export default function JournalEntriesPage() {
  const journalEntries = useQuery(api.finance.journalEntries.list, {});
  const accounts = useQuery(api.finance.accounts.list, {});
  const branches = useQuery(api.master_data.branches.list, {});

  const createEntry = useMutation(api.finance.journalEntries.create);
  const postEntry = useMutation(api.finance.journalEntries.post);
  const voidEntry = useMutation(api.finance.journalEntries.voidEntry);

  const [showDialog, setShowDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [formData, setFormData] = useState({
    journalDate: new Date().toISOString().split("T")[0],
    description: "",
    lines: [] as Array<{
      accountId: string;
      branchId: string;
      description: string;
      debitAmount: number;
      creditAmount: number;
    }>,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { className: string; label: string }> = {
      Draft: { className: "bg-muted text-muted-foreground", label: "Draft" },
      Posted: { className: "bg-green-100 text-green-800", label: "Posted" },
      Voided: { className: "bg-red-100 text-red-800", label: "Void" },
    };
    const variant = variants[status] || variants.Draft;
    return (
      <Badge className={variant.className}>
        {variant.label}
      </Badge>
    );
  };

  const addLine = () => {
    setFormData({
      ...formData,
      lines: [
        ...formData.lines,
        {
          accountId: "",
          branchId: branches?.[0]?._id || "",
          description: "",
          debitAmount: 0,
          creditAmount: 0,
        },
      ],
    });
  };

  const removeLine = (index: number) => {
    setFormData({
      ...formData,
      lines: formData.lines.filter((_, i) => i !== index),
    });
  };

  const updateLine = (index: number, field: string, value: any) => {
    const newLines = [...formData.lines];
    newLines[index] = { ...newLines[index], [field]: value };
    setFormData({ ...formData, lines: newLines });
  };

  const getTotalDebit = () => {
    return formData.lines.reduce((sum, line) => sum + line.debitAmount, 0);
  };

  const getTotalCredit = () => {
    return formData.lines.reduce((sum, line) => sum + line.creditAmount, 0);
  };

  const isBalanced = () => {
    return Math.abs(getTotalDebit() - getTotalCredit()) < 0.01;
  };

  const handleSubmit = async () => {
    if (!isBalanced()) {
      toast.error("Total debit dan credit harus sama!");
      return;
    }

    if (formData.lines.length < 2) {
      toast.error("Minimal 2 baris diperlukan untuk jurnal entry");
      return;
    }

    try {
      await createEntry({
        journalDate: new Date(formData.journalDate).getTime(),
        description: formData.description,
        sourceType: "MANUAL",
        lines: formData.lines.map((line) => ({
          accountId: line.accountId as Id<"accounts">,
          branchId: line.branchId as Id<"branches">,
          description: line.description,
          debitAmount: line.debitAmount,
          creditAmount: line.creditAmount,
        })),
      });
      toast.success("Jurnal entry berhasil dibuat");
      setShowDialog(false);
      setFormData({
        journalDate: new Date().toISOString().split("T")[0],
        description: "",
        lines: [],
      });
    } catch (error: any) {
      toast.error(error.message || "Gagal membuat jurnal entry");
    }
  };

  const handlePost = async (id: Id<"journalEntries">) => {
    try {
      await postEntry({ journalEntryId: id });
      toast.success("Jurnal entry berhasil diposting");
    } catch (error: any) {
      toast.error(error.message || "Gagal memposting jurnal entry");
    }
  };

  const handleVoid = async (id: Id<"journalEntries">) => {
    const reason = prompt("Alasan void:");
    if (!reason) return;

    try {
      await voidEntry({ journalEntryId: id, voidReason: reason });
      toast.success("Jurnal entry berhasil divoid");
    } catch (error: any) {
      toast.error(error.message || "Gagal void jurnal entry");
    }
  };

  const viewDetails = (entry: any) => {
    setSelectedEntry(entry);
    setShowDetailDialog(true);
  };

  if (journalEntries === undefined || accounts === undefined || branches === undefined) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading journal entries...</p>
        </div>
      </div>
    );
  }

  const filteredEntries =
    statusFilter === "all"
      ? journalEntries
      : journalEntries.filter((e) => e.status === statusFilter);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Jurnal Umum</h1>
          <p className="text-muted-foreground mt-1">
            Daftar transaksi jurnal dan entry manual
          </p>
        </div>
        <Button onClick={() => setShowDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Buat Jurnal Manual
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 items-center">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Label>Status:</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua</SelectItem>
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="Posted">Posted</SelectItem>
                  <SelectItem value="Voided">Void</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Journal Entries List */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Jurnal Entry</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nomor Jurnal</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Deskripsi</TableHead>
                <TableHead>Sumber</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Credit</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEntries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Belum ada jurnal entry</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredEntries.map((entry) => (
                  <TableRow key={entry._id}>
                    <TableCell className="font-mono text-sm">
                      {entry.journalNumber}
                    </TableCell>
                    <TableCell>{formatDate(entry.journalDate)}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {entry.description}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{entry.sourceType}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(entry.totalDebit)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(entry.totalCredit)}
                    </TableCell>
                    <TableCell>{getStatusBadge(entry.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => viewDetails(entry)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {entry.status === "Draft" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePost(entry._id)}
                            className="text-green-600"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                        )}
                        {entry.status === "Posted" && entry.sourceType === "MANUAL" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleVoid(entry._id)}
                            className="text-red-600"
                          >
                            <XCircle className="w-4 h-4" />
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

      {/* Create Journal Entry Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Buat Jurnal Entry Manual</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="journalDate">Tanggal *</Label>
                <Input
                  id="journalDate"
                  type="date"
                  value={formData.journalDate}
                  onChange={(e) =>
                    setFormData({ ...formData, journalDate: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Deskripsi *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Deskripsi transaksi..."
                rows={2}
              />
            </div>

            {/* Journal Lines */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>Baris Jurnal</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addLine}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Tambah Baris
                </Button>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">Akun</TableHead>
                      <TableHead className="w-[120px]">Cabang</TableHead>
                      <TableHead>Keterangan</TableHead>
                      <TableHead className="w-[120px]">Debit</TableHead>
                      <TableHead className="w-[120px]">Credit</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formData.lines.map((line, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Select
                            value={line.accountId}
                            onValueChange={(value) =>
                              updateLine(index, "accountId", value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih akun" />
                            </SelectTrigger>
                            <SelectContent>
                              {accounts
                                .filter((a) => !a.isHeader && a.isActive)
                                .map((account) => (
                                  <SelectItem key={account._id} value={account._id}>
                                    {account.accountCode} - {account.accountName}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={line.branchId}
                            onValueChange={(value) =>
                              updateLine(index, "branchId", value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {branches.map((branch) => (
                                <SelectItem key={branch._id} value={branch._id}>
                                  {branch.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            value={line.description}
                            onChange={(e) =>
                              updateLine(index, "description", e.target.value)
                            }
                            placeholder="Keterangan..."
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={line.debitAmount || ""}
                            onChange={(e) =>
                              updateLine(
                                index,
                                "debitAmount",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            placeholder="0"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={line.creditAmount || ""}
                            onChange={(e) =>
                              updateLine(
                                index,
                                "creditAmount",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            placeholder="0"
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeLine(index)}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Totals */}
              <div className="flex justify-end gap-8 p-4 bg-muted/50 rounded-lg">
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Total Debit</p>
                  <p className="text-lg font-semibold">
                    {formatCurrency(getTotalDebit())}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Total Credit</p>
                  <p className="text-lg font-semibold">
                    {formatCurrency(getTotalCredit())}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Selisih</p>
                  <p
                    className={`text-lg font-semibold ${isBalanced() ? "text-green-600" : "text-red-600"
                      }`}
                  >
                    {formatCurrency(Math.abs(getTotalDebit() - getTotalCredit()))}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Batal
            </Button>
            <Button onClick={handleSubmit} disabled={!isBalanced()}>
              Simpan Jurnal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      {selectedEntry && (
        <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Detail Jurnal Entry</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Nomor Jurnal</Label>
                  <p className="font-mono font-semibold">
                    {selectedEntry.journalNumber}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedEntry.status)}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Tanggal</Label>
                  <p>{formatDate(selectedEntry.journalDate)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Sumber</Label>
                  <Badge variant="outline">{selectedEntry.sourceType}</Badge>
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground">Deskripsi</Label>
                <p>{selectedEntry.description}</p>
              </div>

              {selectedEntry.voidReason && (
                <div className="bg-red-50 p-3 rounded">
                  <Label className="text-red-800">Alasan Void</Label>
                  <p className="text-red-700">{selectedEntry.voidReason}</p>
                </div>
              )}

              <div>
                <Label className="mb-2 block">Baris Jurnal</Label>
                <div className="text-sm text-muted-foreground mb-2">
                  (Detail lines akan ditampilkan setelah query ready)
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={() => setShowDetailDialog(false)}>Tutup</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
