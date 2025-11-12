"use client";

import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, FileText, Eye, Calendar, User, Stethoscope } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default function MedicalRecordsPage() {
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPet, setSelectedPet] = useState<Id<"customerPets"> | "all">("all");
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const records = useQuery(api.petMedicalRecords.list, {
    petId: selectedPet !== "all" ? selectedPet : undefined,
  });

  const pets = useQuery(api.customerPets.list, { includeInactive: false });

  useEffect(() => {
    setMounted(true);
  }, []);

  const filteredRecords = records?.filter((record: any) =>
    record.pet?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    record.customer?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    record.diagnosis?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    record.veterinarian?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleViewDetail = (record: any) => {
    setSelectedRecord(record);
    setIsDetailOpen(true);
  };

  if (!mounted) return null;

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Rekam Medis</h1>
        <p className="text-slate-500 mt-1">Riwayat kesehatan dan pemeriksaan hewan</p>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center gap-4">
            <div className="flex-1 max-w-sm relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Cari nama hewan, pemilik, diagnosis..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select
              value={selectedPet === "all" ? "all" : selectedPet}
              onValueChange={(value) =>
                setSelectedPet(value === "all" ? "all" : value as Id<"customerPets">)
              }
            >
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Semua Hewan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Hewan</SelectItem>
                {pets?.map((pet: any) => (
                  <SelectItem key={pet._id} value={pet._id}>
                    {pet.name} - {pet.customer?.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tanggal</TableHead>
              <TableHead>Hewan</TableHead>
              <TableHead>Pemilik</TableHead>
              <TableHead>Diagnosis</TableHead>
              <TableHead>Dokter Hewan</TableHead>
              <TableHead>Klinik</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!filteredRecords ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                  Memuat data...
                </TableCell>
              </TableRow>
            ) : filteredRecords.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                  Belum ada rekam medis
                </TableCell>
              </TableRow>
            ) : (
              filteredRecords.map((record: any) => (
                <TableRow key={record._id}>
                  <TableCell className="font-medium">
                    {formatDate(record.recordDate)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-slate-400" />
                      <div>
                        <p className="font-medium">{record.pet?.name}</p>
                        <p className="text-xs text-slate-500">
                          {record.pet?.species} - {record.pet?.breed}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{record.customer?.name || "-"}</TableCell>
                  <TableCell>
                    {record.diagnosis ? (
                      <span className="text-sm">{record.diagnosis}</span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Stethoscope className="h-4 w-4 text-slate-400" />
                      {record.veterinarian || "-"}
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-600">
                    {record.clinic || "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewDetail(record)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Detail Rekam Medis
            </DialogTitle>
            <DialogDescription>
              {selectedRecord && formatDate(selectedRecord.recordDate)}
            </DialogDescription>
          </DialogHeader>

          {selectedRecord && (
            <div className="space-y-6">
              {/* Patient Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Informasi Pasien</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-slate-500">Nama Hewan</p>
                      <p className="font-medium">{selectedRecord.pet?.name}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Pemilik</p>
                      <p className="font-medium">{selectedRecord.customer?.name}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Spesies/Ras</p>
                      <p className="font-medium">
                        {selectedRecord.pet?.species} - {selectedRecord.pet?.breed}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Usia</p>
                      <p className="font-medium">{selectedRecord.pet?.age || "-"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Medical Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Informasi Medis</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedRecord.diagnosis && (
                    <div>
                      <p className="text-sm font-medium text-slate-700 mb-1">
                        Diagnosis
                      </p>
                      <Badge className="bg-red-500">{selectedRecord.diagnosis}</Badge>
                    </div>
                  )}

                  {selectedRecord.treatment && (
                    <div>
                      <p className="text-sm font-medium text-slate-700 mb-1">
                        Tindakan/Treatment
                      </p>
                      <p className="text-sm text-slate-600">{selectedRecord.treatment}</p>
                    </div>
                  )}

                  {selectedRecord.prescription && (
                    <div>
                      <p className="text-sm font-medium text-slate-700 mb-1">
                        Resep/Prescription
                      </p>
                      <div className="bg-slate-50 p-3 rounded border border-slate-200">
                        <pre className="text-xs whitespace-pre-wrap text-slate-700">
                          {selectedRecord.prescription}
                        </pre>
                      </div>
                    </div>
                  )}

                  {selectedRecord.notes && (
                    <div>
                      <p className="text-sm font-medium text-slate-700 mb-1">
                        Catatan Lengkap
                      </p>
                      <div className="bg-slate-50 p-4 rounded border border-slate-200">
                        <pre className="text-sm whitespace-pre-wrap text-slate-700">
                          {selectedRecord.notes}
                        </pre>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Provider Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Informasi Pemeriksa</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-slate-500">Dokter Hewan</p>
                      <p className="font-medium flex items-center gap-2">
                        <Stethoscope className="h-4 w-4" />
                        {selectedRecord.veterinarian}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Klinik</p>
                      <p className="font-medium">{selectedRecord.clinic}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Tanggal Pemeriksaan</p>
                      <p className="font-medium flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {formatDate(selectedRecord.recordDate)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
