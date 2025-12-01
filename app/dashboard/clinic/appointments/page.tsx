"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Plus,
  Calendar,
  Search,
  Eye,
  X,
  Stethoscope,
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function AppointmentsPage() {
  const [mounted, setMounted] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedBranch, setSelectedBranch] = useState<
    Id<"branches"> | "all"
  >("all");

  useEffect(() => {
    setMounted(true);
  }, []);

  const [formData, setFormData] = useState({
    branchId: "",
    petId: "",
    customerId: "",
    staffId: "",
    appointmentDate: new Date().toISOString().slice(0, 10),
    appointmentTime: "09:00",
    notes: "",
  });

  const appointments = useQuery(api.clinic.clinicAppointments.list, {
    status: selectedStatus !== "all" ? selectedStatus : undefined,
    branchId: selectedBranch !== "all" ? selectedBranch : undefined,
  });
  const branches = useQuery(api.master_data.branches.list, { includeInactive: false });
  const customers = useQuery(api.master_data.customers.list, { includeInactive: false });
  const pets = useQuery(api.master_data.customerPets.list, {
    customerId: formData.customerId
      ? (formData.customerId as Id<"customers">)
      : undefined,
  });
  const staff = useQuery(api.clinic.clinicStaff.list, {
    branchId: formData.branchId
      ? (formData.branchId as Id<"branches">)
      : undefined,
    includeInactive: false,
  });
  const services = useQuery(api.inventory.products.list, { type: "service", includeInactive: false });

  const createAppointment = useMutation(api.clinic.clinicAppointments.create);
  const cancelAppointment = useMutation(api.clinic.clinicAppointments.cancel);

  const filteredAppointments = appointments?.filter(
    (apt) =>
      apt.appointmentNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      apt.customer?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      apt.pet?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenDialog = () => {
    setFormData({
      branchId: "",
      petId: "",
      customerId: "",
      staffId: "",
      appointmentDate: new Date().toISOString().slice(0, 10),
      appointmentTime: "09:00",
      notes: "",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.branchId ||
      !formData.petId ||
      !formData.customerId ||
      !formData.staffId
    ) {
      toast.error("Mohon lengkapi semua field yang wajib");
      return;
    }

    try {
      const appointmentDate = new Date(formData.appointmentDate).getTime();

      const result = await createAppointment({
        branchId: formData.branchId as Id<"branches">,
        petId: formData.petId as Id<"customerPets">,
        customerId: formData.customerId as Id<"customers">,
        staffId: formData.staffId as Id<"clinicStaff">,
        appointmentDate,
        appointmentTime: formData.appointmentTime,
        notes: formData.notes || undefined,
      });

      toast.success(
        `Appointment ${result.appointmentNumber} berhasil dibuat`
      );
      setIsDialogOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Terjadi kesalahan");
      console.error(error);
    }
  };

  const handleCancel = async (appointmentId: Id<"clinicAppointments">) => {
    if (confirm("Batalkan appointment ini?")) {
      try {
        await cancelAppointment({ appointmentId });
        toast.success("Appointment berhasil dibatalkan");
      } catch (error: any) {
        toast.error(error.message || "Terjadi kesalahan");
      }
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Scheduled":
        return <Badge className="bg-blue-500">Terjadwal</Badge>;
      case "Completed":
        return <Badge className="bg-green-500">Selesai</Badge>;
      case "Cancelled":
        return <Badge variant="destructive">Batal</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Generate time slots (08:00 - 17:00, every 30 minutes)
  const timeSlots = [];
  for (let hour = 8; hour <= 17; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      if (hour === 17 && minute > 0) break;
      const time = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
      timeSlots.push(time);
    }
  }

  if (!mounted) return null;

  return (
    <div className="p-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Appointments</h1>
          <p className="text-muted-foreground mt-1">
            Kelola jadwal appointment klinik
          </p>
        </div>
        <Button onClick={handleOpenDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Buat Appointment
        </Button>
      </div>

      <div className="bg-card rounded-lg border border-border shadow-sm">
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 max-w-sm relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari appointment..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-muted/50 border-border"
              />
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={selectedStatus}
                onValueChange={setSelectedStatus}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="Scheduled">Terjadwal</SelectItem>
                  <SelectItem value="Completed">Selesai</SelectItem>
                  <SelectItem value="Cancelled">Batal</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={selectedBranch === "all" ? "all" : selectedBranch}
                onValueChange={(v) => setSelectedBranch(v as Id<"branches"> | "all")}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Cabang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Cabang</SelectItem>
                  {branches?.map((branch) => (
                    <SelectItem key={branch._id} value={branch._id}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>No. Apt</TableHead>
              <TableHead>Tanggal & Waktu</TableHead>
              <TableHead>Pasien</TableHead>
              <TableHead>Dokter</TableHead>
              <TableHead>Cabang</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!filteredAppointments ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Memuat data...
                </TableCell>
              </TableRow>
            ) : filteredAppointments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Tidak ada appointment ditemukan
                </TableCell>
              </TableRow>
            ) : (
              filteredAppointments.map((apt) => (
                <TableRow key={apt._id} className="hover:bg-muted/50 transition-colors">
                  <TableCell className="font-medium text-foreground">
                    {apt.appointmentNumber}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <div className="flex flex-col">
                      <span>{formatDate(apt.appointmentDate)}</span>
                      <span className="text-xs">{apt.appointmentTime}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground">{apt.pet?.name}</span>
                      <span className="text-xs text-muted-foreground">{apt.customer?.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {apt.staff?.name}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {apt.branch?.name}
                  </TableCell>
                  <TableCell>{getStatusBadge(apt.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                        <Eye className="h-4 w-4" />
                      </Button>
                      {apt.status === "Scheduled" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleCancel(apt._id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Buat Appointment Baru</DialogTitle>
            <DialogDescription>
              Isi informasi appointment untuk layanan klinik
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="branch">
                    Cabang <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.branchId}
                    onValueChange={(value) => {
                      setFormData({ ...formData, branchId: value, staffId: "" });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih cabang" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches?.map((branch) => (
                        <SelectItem key={branch._id} value={branch._id}>
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customer">
                    Pemilik <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.customerId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, customerId: value, petId: "" })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih pemilik" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers?.map((customer) => (
                        <SelectItem key={customer._id} value={customer._id}>
                          {customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pet">
                    Hewan Peliharaan <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.petId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, petId: value })
                    }
                    disabled={!formData.customerId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih hewan peliharaan" />
                    </SelectTrigger>
                    <SelectContent>
                      {pets?.map((pet) => (
                        <SelectItem key={pet._id} value={pet._id}>
                          {pet.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="staff">
                    Staff/Dokter <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.staffId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, staffId: value })
                    }
                    disabled={!formData.branchId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih staff" />
                    </SelectTrigger>
                    <SelectContent>
                      {staff?.map((s) => (
                        <SelectItem key={s._id} value={s._id}>
                          {s.name} ({s.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date">Tanggal</Label>
                  <Input
                    type="date"
                    value={formData.appointmentDate}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        appointmentDate: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="time">Waktu</Label>
                  <Select
                    value={formData.appointmentTime}
                    onValueChange={(value) =>
                      setFormData({ ...formData, appointmentTime: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timeSlots.map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Catatan</Label>
                <Input
                  placeholder="Catatan tambahan"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                />
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Batal
              </Button>
              <Button type="submit">Buat Appointment</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
