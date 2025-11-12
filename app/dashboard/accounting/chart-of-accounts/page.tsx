"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Badge } from "@/components/ui/badge";
import {
  ChevronRight,
  ChevronDown,
  Plus,
  Edit,
  Trash2,
  FolderTree,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { Id } from "@/convex/_generated/dataModel";

export default function ChartOfAccountsPage() {
  const accounts = useQuery(api.accounts.list, {});
  const createAccount = useMutation(api.accounts.create);
  const updateAccount = useMutation(api.accounts.update);
  const removeAccount = useMutation(api.accounts.remove);

  const [searchQuery, setSearchQuery] = useState("");
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [showDialog, setShowDialog] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any>(null);
  const [formData, setFormData] = useState({
    accountCode: "",
    accountName: "",
    accountType: "ASSET",
    category: "",
    normalBalance: "DEBIT",
    parentAccountId: undefined as Id<"accounts"> | undefined,
    isHeader: false,
    level: 0,
    description: "",
  });

  if (accounts === undefined) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading chart of accounts...</p>
        </div>
      </div>
    );
  }

  // Filter accounts based on search
  const filteredAccounts = searchQuery
    ? accounts.filter(
        (acc) =>
          acc.accountCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
          acc.accountName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : accounts;

  // Build tree structure
  const buildTree = (parentId: Id<"accounts"> | undefined = undefined) => {
    return filteredAccounts.filter((acc) => acc.parentAccountId === parentId);
  };

  const toggleNode = (accountId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(accountId)) {
      newExpanded.delete(accountId);
    } else {
      newExpanded.add(accountId);
    }
    setExpandedNodes(newExpanded);
  };

  const handleCreate = () => {
    setEditingAccount(null);
    setFormData({
      accountCode: "",
      accountName: "",
      accountType: "ASSET",
      category: "",
      normalBalance: "DEBIT",
      parentAccountId: undefined,
      isHeader: false,
      level: 0,
      description: "",
    });
    setShowDialog(true);
  };

  const handleEdit = (account: any) => {
    setEditingAccount(account);
    setFormData({
      accountCode: account.accountCode,
      accountName: account.accountName,
      accountType: account.accountType,
      category: account.category || "",
      normalBalance: account.normalBalance,
      parentAccountId: account.parentAccountId,
      isHeader: account.isHeader,
      level: account.level || 0,
      description: account.description || "",
    });
    setShowDialog(true);
  };

  const handleSubmit = async () => {
    try {
      if (editingAccount) {
        await updateAccount({
          id: editingAccount._id,
          accountName: formData.accountName,
          category: formData.category,
          description: formData.description,
          isActive: true,
        });
        toast.success("Akun berhasil diperbarui");
      } else {
        await createAccount({
          accountCode: formData.accountCode,
          accountName: formData.accountName,
          accountType: formData.accountType as any,
          category: formData.category,
          normalBalance: formData.normalBalance as any,
          parentAccountId: formData.parentAccountId,
          isHeader: formData.isHeader,
          level: formData.level,
          description: formData.description,
        });
        toast.success("Akun berhasil dibuat");
      }
      setShowDialog(false);
    } catch (error: any) {
      toast.error(error.message || "Gagal menyimpan akun");
    }
  };

  const handleDelete = async (id: Id<"accounts">) => {
    if (!confirm("Yakin ingin menghapus akun ini?")) return;

    try {
      await removeAccount({ id });
      toast.success("Akun berhasil dihapus");
    } catch (error: any) {
      toast.error(error.message || "Gagal menghapus akun");
    }
  };

  const getAccountTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      ASSET: "bg-blue-100 text-blue-800",
      LIABILITY: "bg-red-100 text-red-800",
      EQUITY: "bg-green-100 text-green-800",
      REVENUE: "bg-emerald-100 text-emerald-800",
      EXPENSE: "bg-orange-100 text-orange-800",
    };
    return colors[type] || "bg-slate-100 text-slate-800";
  };

  const renderAccountNode = (account: any, level: number = 0) => {
    const children = buildTree(account._id);
    const hasChildren = children.length > 0;
    const isExpanded = expandedNodes.has(account._id);

    return (
      <div key={account._id}>
        <div
          className={`flex items-center gap-2 py-2 px-3 hover:bg-slate-50 rounded-lg group ${
            level > 0 ? "ml-" + level * 6 : ""
          }`}
          style={{ paddingLeft: `${level * 24 + 12}px` }}
        >
          {/* Expand/Collapse Icon */}
          <div className="w-5 h-5 flex items-center justify-center">
            {hasChildren ? (
              <button
                onClick={() => toggleNode(account._id)}
                className="hover:bg-slate-200 rounded p-0.5"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
            ) : (
              <div className="w-1 h-1 rounded-full bg-slate-300" />
            )}
          </div>

          {/* Account Code */}
          <span className="text-sm font-mono text-slate-600 w-20">
            {account.accountCode}
          </span>

          {/* Account Name */}
          <span
            className={`flex-1 text-sm ${
              account.isHeader ? "font-semibold text-slate-900" : "text-slate-700"
            }`}
          >
            {account.accountName}
          </span>

          {/* Account Type Badge */}
          <Badge className={`text-xs ${getAccountTypeColor(account.accountType)}`}>
            {account.accountType}
          </Badge>

          {/* Normal Balance */}
          <span className="text-xs text-slate-500 w-16">
            {account.normalBalance}
          </span>

          {/* Status */}
          {!account.isActive && (
            <Badge variant="outline" className="text-xs">
              Inactive
            </Badge>
          )}

          {/* Actions */}
          <div className="opacity-0 group-hover:opacity-100 flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEdit(account)}
              className="h-7 px-2"
            >
              <Edit className="w-3 h-3" />
            </Button>
            {!account.isHeader && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(account._id)}
                className="h-7 px-2 text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Render children if expanded */}
        {hasChildren && isExpanded && (
          <div>
            {children.map((child) => renderAccountNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const rootAccounts = buildTree(undefined);

  // Group by account type for better organization
  const groupedAccounts = {
    ASSET: rootAccounts.filter((a) => a.accountType === "ASSET"),
    LIABILITY: rootAccounts.filter((a) => a.accountType === "LIABILITY"),
    EQUITY: rootAccounts.filter((a) => a.accountType === "EQUITY"),
    REVENUE: rootAccounts.filter((a) => a.accountType === "REVENUE"),
    EXPENSE: rootAccounts.filter((a) => a.accountType === "EXPENSE"),
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Bagan Akun (CoA)</h1>
          <p className="text-slate-600 mt-1">
            Daftar akun keuangan untuk sistem pembukuan
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Tambah Akun
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="Cari kode atau nama akun..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => {
                const allIds = new Set(accounts.map((a) => a._id));
                setExpandedNodes(allIds);
              }}
            >
              <FolderTree className="w-4 h-4 mr-2" />
              Expand All
            </Button>
            <Button variant="outline" onClick={() => setExpandedNodes(new Set())}>
              Collapse All
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Account Tree */}
      <Card>
        <CardHeader>
          <CardTitle>Hierarki Akun</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(groupedAccounts).map(([type, accounts]) => (
              <div key={type}>
                {accounts.length > 0 && (
                  <>
                    <h3 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                      <Badge className={getAccountTypeColor(type)}>{type}</Badge>
                    </h3>
                    <div className="space-y-1">
                      {accounts.map((account) => renderAccountNode(account, 0))}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          {filteredAccounts.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <FolderTree className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Tidak ada akun yang ditemukan</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingAccount ? "Edit Akun" : "Tambah Akun Baru"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="accountCode">Kode Akun *</Label>
                <Input
                  id="accountCode"
                  value={formData.accountCode}
                  onChange={(e) =>
                    setFormData({ ...formData, accountCode: e.target.value })
                  }
                  placeholder="1-100"
                  disabled={!!editingAccount}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="accountName">Nama Akun *</Label>
                <Input
                  id="accountName"
                  value={formData.accountName}
                  onChange={(e) =>
                    setFormData({ ...formData, accountName: e.target.value })
                  }
                  placeholder="Kas"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="accountType">Tipe Akun *</Label>
                <Select
                  value={formData.accountType}
                  onValueChange={(value) =>
                    setFormData({ ...formData, accountType: value })
                  }
                  disabled={!!editingAccount}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ASSET">ASSET</SelectItem>
                    <SelectItem value="LIABILITY">LIABILITY</SelectItem>
                    <SelectItem value="EQUITY">EQUITY</SelectItem>
                    <SelectItem value="REVENUE">REVENUE</SelectItem>
                    <SelectItem value="EXPENSE">EXPENSE</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="normalBalance">Normal Balance *</Label>
                <Select
                  value={formData.normalBalance}
                  onValueChange={(value) =>
                    setFormData({ ...formData, normalBalance: value })
                  }
                  disabled={!!editingAccount}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DEBIT">DEBIT</SelectItem>
                    <SelectItem value="CREDIT">CREDIT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Kategori *</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                  placeholder="e.g., Current Asset, Operating Revenue"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="level">Level *</Label>
                <Input
                  id="level"
                  type="number"
                  value={formData.level}
                  onChange={(e) =>
                    setFormData({ ...formData, level: parseInt(e.target.value) || 0 })
                  }
                  placeholder="0"
                  min="0"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="parentAccountId">Parent Account (Optional)</Label>
              <Select
                value={formData.parentAccountId || "none"}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    parentAccountId: value === "none" ? undefined : (value as any),
                  })
                }
                disabled={!!editingAccount}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih parent account" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Tidak ada (Root)</SelectItem>
                  {accounts
                    .filter((a) => a.isHeader)
                    .map((account) => (
                      <SelectItem key={account._id} value={account._id}>
                        {account.accountCode} - {account.accountName}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Deskripsi</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Deskripsi akun (optional)"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isHeader"
                checked={formData.isHeader}
                onChange={(e) =>
                  setFormData({ ...formData, isHeader: e.target.checked })
                }
                disabled={!!editingAccount}
                className="rounded border-slate-300"
              />
              <Label htmlFor="isHeader" className="cursor-pointer">
                Akun Header (Grup/Kategori)
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Batal
            </Button>
            <Button onClick={handleSubmit}>
              {editingAccount ? "Update" : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
