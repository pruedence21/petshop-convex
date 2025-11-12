"use client";

import { use, useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Heart,
  Activity,
  Thermometer,
  Weight,
  Stethoscope,
  FileText,
  Save,
  CheckCircle,
  Plus,
  Trash2,
  Pill,
  Syringe,
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function AppointmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"clinical" | "services" | "payment">("clinical");
  const [isServiceDialogOpen, setIsServiceDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);

  const appointmentId = resolvedParams.id as Id<"clinicAppointments">;
  const appointment = useQuery(api.clinicAppointments.get, { id: appointmentId });
  const clinicalData = useQuery(api.clinicAppointments.getClinicalData, { appointmentId });
  const services = useQuery(api.clinicAppointmentServices.list, { appointmentId });
  const payments = useQuery(api.clinicPayments.list, { appointmentId });
  
  // Get products for services and medicines
  const allProducts = useQuery(api.products.list, { includeInactive: false });
  const serviceProducts = allProducts?.filter((p: any) => 
    p.type === "service" || p.type === "procedure"
  );
  const medicineProducts = allProducts?.filter((p: any) => p.type === "medicine");

  const [serviceForm, setServiceForm] = useState({
    serviceId: "",
    productId: "",
    variantId: "",
    quantity: "1",
    unitPrice: "",
    discountAmount: "0",
    discountType: "nominal",
    isPrescription: false,
    prescriptionDosage: "",
    notes: "",
  });

  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    paymentMethod: "CASH",
    referenceNumber: "",
    notes: "",
  });

  const [paymentList, setPaymentList] = useState<Array<{
    amount: number;
    paymentMethod: string;
    referenceNumber?: string;
    notes?: string;
  }>>([]);

  const [clinicalForm, setClinicalForm] = useState({
    chiefComplaint: "",
    temperature: "",
    weight: "",
    heartRate: "",
    respiratoryRate: "",
    bloodPressureSystolic: "",
    bloodPressureDiastolic: "",
    physicalExamination: "",
    diagnosis: "",
    treatmentPlan: "",
    notes: "",
  });

  const startExamination = useMutation(api.clinicAppointments.startExamination);
  const updateClinicalData = useMutation(api.clinicAppointments.updateClinicalData);
  const addService = useMutation(api.clinicAppointmentServices.create);
  const deleteService = useMutation(api.clinicAppointmentServices.remove);
  const submitAppointment = useMutation(api.clinicAppointments.submitAppointment);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (clinicalData) {
      setClinicalForm({
        chiefComplaint: clinicalData.chiefComplaint || "",
        temperature: clinicalData.temperature?.toString() || "",
        weight: clinicalData.weight?.toString() || "",
        heartRate: clinicalData.heartRate?.toString() || "",
        respiratoryRate: clinicalData.respiratoryRate?.toString() || "",
        bloodPressureSystolic: clinicalData.bloodPressureSystolic?.toString() || "",
        bloodPressureDiastolic: clinicalData.bloodPressureDiastolic?.toString() || "",
        physicalExamination: clinicalData.physicalExamination || "",
        diagnosis: clinicalData.diagnosis || "",
        treatmentPlan: clinicalData.treatmentPlan || "",
        notes: clinicalData.notes || "",
      });
    }
  }, [clinicalData]);

  const handleStartExamination = async () => {
    if (!clinicalForm.chiefComplaint.trim()) {
      toast.error("Keluhan utama harus diisi");
      return;
    }

    try {
      await startExamination({
        appointmentId,
        chiefComplaint: clinicalForm.chiefComplaint,
      });
      toast.success("Pemeriksaan dimulai");
    } catch (error: any) {
      toast.error(error.message || "Gagal memulai pemeriksaan");
    }
  };

  const handleSaveClinicalData = async () => {
    try {
      await updateClinicalData({
        appointmentId,
        chiefComplaint: clinicalForm.chiefComplaint || undefined,
        temperature: clinicalForm.temperature ? parseFloat(clinicalForm.temperature) : undefined,
        weight: clinicalForm.weight ? parseFloat(clinicalForm.weight) : undefined,
        heartRate: clinicalForm.heartRate ? parseFloat(clinicalForm.heartRate) : undefined,
        respiratoryRate: clinicalForm.respiratoryRate ? parseFloat(clinicalForm.respiratoryRate) : undefined,
        bloodPressureSystolic: clinicalForm.bloodPressureSystolic ? parseFloat(clinicalForm.bloodPressureSystolic) : undefined,
        bloodPressureDiastolic: clinicalForm.bloodPressureDiastolic ? parseFloat(clinicalForm.bloodPressureDiastolic) : undefined,
        physicalExamination: clinicalForm.physicalExamination || undefined,
        diagnosis: clinicalForm.diagnosis || undefined,
        treatmentPlan: clinicalForm.treatmentPlan || undefined,
        notes: clinicalForm.notes || undefined,
      });
      toast.success("Data klinis tersimpan");
    } catch (error: any) {
      toast.error(error.message || "Gagal menyimpan data");
    }
  };

  const handleAddService = async () => {
    if (!serviceForm.serviceId || !serviceForm.quantity || !serviceForm.unitPrice) {
      toast.error("Mohon lengkapi semua field yang wajib");
      return;
    }

    try {
      await addService({
        appointmentId,
        serviceId: serviceForm.serviceId as Id<"products">,
        productId: serviceForm.productId ? (serviceForm.productId as Id<"products">) : undefined,
        variantId: serviceForm.variantId ? (serviceForm.variantId as Id<"productVariants">) : undefined,
        quantity: parseFloat(serviceForm.quantity),
        unitPrice: parseFloat(serviceForm.unitPrice),
        discountAmount: parseFloat(serviceForm.discountAmount),
        discountType: serviceForm.discountType,
        isPrescription: serviceForm.isPrescription,
        prescriptionDosage: serviceForm.prescriptionDosage || undefined,
        notes: serviceForm.notes || undefined,
      });
      
      toast.success("Tindakan/Obat berhasil ditambahkan");
      setIsServiceDialogOpen(false);
      setServiceForm({
        serviceId: "",
        productId: "",
        variantId: "",
        quantity: "1",
        unitPrice: "",
        discountAmount: "0",
        discountType: "nominal",
        isPrescription: false,
        prescriptionDosage: "",
        notes: "",
      });
    } catch (error: any) {
      toast.error(error.message || "Gagal menambahkan");
    }
  };

  const handleDeleteService = async (serviceId: Id<"clinicAppointmentServices">) => {
    if (!confirm("Hapus item ini?")) return;
    
    try {
      await deleteService({ id: serviceId });
      toast.success("Item berhasil dihapus");
    } catch (error: any) {
      toast.error(error.message || "Gagal menghapus");
    }
  };

  const handleAddPayment = () => {
    if (!paymentForm.amount) {
      toast.error("Jumlah pembayaran harus diisi");
      return;
    }

    const amount = parseFloat(paymentForm.amount);
    if (amount <= 0) {
      toast.error("Jumlah harus lebih dari 0");
      return;
    }

    setPaymentList([
      ...paymentList,
      {
        amount,
        paymentMethod: paymentForm.paymentMethod,
        referenceNumber: paymentForm.referenceNumber || undefined,
        notes: paymentForm.notes || undefined,
      },
    ]);

    setPaymentForm({
      amount: "",
      paymentMethod: "CASH",
      referenceNumber: "",
      notes: "",
    });
  };

  const handleRemovePayment = (index: number) => {
    setPaymentList(paymentList.filter((_, i) => i !== index));
  };

  const handleSubmitPayment = async () => {
    if (paymentList.length === 0) {
      toast.error("Tambahkan minimal 1 pembayaran");
      return;
    }

    try {
      const result = await submitAppointment({
        appointmentId,
        payments: paymentList,
      });

      toast.success("Pembayaran berhasil diproses");
      
      if (result.medicalRecordId) {
        toast.success("Medical record berhasil dibuat");
      }

      setIsPaymentDialogOpen(false);
      setPaymentList([]);
      
      // Redirect to list after 1 second
      setTimeout(() => {
        router.push("/dashboard/clinic/appointments");
      }, 1000);
    } catch (error: any) {
      toast.error(error.message || "Gagal memproses pembayaran");
    }
  };

  const totalPayments = paymentList.reduce((sum, p) => sum + p.amount, 0);
  const change = appointment ? Math.max(0, totalPayments - appointment.totalAmount) : 0;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Scheduled":
        return <Badge className="bg-blue-500">Terjadwal</Badge>;
      case "InProgress":
        return <Badge className="bg-yellow-500">Dalam Pemeriksaan</Badge>;
      case "Completed":
        return <Badge className="bg-green-500">Selesai</Badge>;
      case "Cancelled":
        return <Badge variant="destructive">Batal</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (!mounted) return null;

  if (appointment === undefined) {
    return (
      <div className="p-8 flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="p-8">
        <p>Appointment tidak ditemukan</p>
      </div>
    );
  }

  const canEdit = appointment.status === "Scheduled" || appointment.status === "InProgress";

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/dashboard/clinic/appointments")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Kembali
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              {appointment.appointmentNumber}
            </h1>
            <p className="text-slate-500 mt-1">
              {formatDate(appointment.appointmentDate)} - {appointment.appointmentTime}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {getStatusBadge(appointment.status)}
          {appointment.status === "Scheduled" && (
            <Button onClick={handleStartExamination}>
              <Activity className="h-4 w-4 mr-2" />
              Mulai Pemeriksaan
            </Button>
          )}
        </div>
      </div>

      {/* Patient Info Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            Informasi Pasien
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-slate-500">Nama Hewan</p>
              <p className="font-medium">{appointment.pet?.name}</p>
            </div>
            <div>
              <p className="text-slate-500">Pemilik</p>
              <p className="font-medium">{appointment.customer?.name}</p>
            </div>
            <div>
              <p className="text-slate-500">Dokter</p>
              <p className="font-medium">{appointment.staff?.name}</p>
            </div>
            <div>
              <p className="text-slate-500">Cabang</p>
              <p className="font-medium">{appointment.branch?.name}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="mb-6 flex gap-2 border-b border-slate-200">
        <button
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "clinical"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-slate-600 hover:text-slate-900"
          }`}
          onClick={() => setActiveTab("clinical")}
        >
          Data Klinis
        </button>
        <button
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "services"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-slate-600 hover:text-slate-900"
          }`}
          onClick={() => setActiveTab("services")}
        >
          Tindakan & Obat
        </button>
        <button
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "payment"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-slate-600 hover:text-slate-900"
          }`}
          onClick={() => setActiveTab("payment")}
        >
          Pembayaran
        </button>
      </div>

      {/* Clinical Data Tab */}
      {activeTab === "clinical" && (
        <div className="space-y-6">
          {/* Keluhan Utama */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Keluhan Utama & Anamnesa
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="chiefComplaint">
                    Keluhan Utama <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="chiefComplaint"
                    placeholder="Keluhan pasien (misal: Lemas, tidak mau makan sejak 2 hari yang lalu)"
                    value={clinicalForm.chiefComplaint}
                    onChange={(e) =>
                      setClinicalForm({ ...clinicalForm, chiefComplaint: e.target.value })
                    }
                    disabled={!canEdit}
                    rows={3}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Vital Signs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Tanda-Tanda Vital
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="temperature" className="flex items-center gap-2">
                    <Thermometer className="h-4 w-4" />
                    Suhu Tubuh (°C)
                  </Label>
                  <Input
                    id="temperature"
                    type="number"
                    step="0.1"
                    placeholder="38.5"
                    value={clinicalForm.temperature}
                    onChange={(e) =>
                      setClinicalForm({ ...clinicalForm, temperature: e.target.value })
                    }
                    disabled={!canEdit}
                  />
                </div>
                <div>
                  <Label htmlFor="weight" className="flex items-center gap-2">
                    <Weight className="h-4 w-4" />
                    Berat Badan (kg)
                  </Label>
                  <Input
                    id="weight"
                    type="number"
                    step="0.1"
                    placeholder="5.2"
                    value={clinicalForm.weight}
                    onChange={(e) =>
                      setClinicalForm({ ...clinicalForm, weight: e.target.value })
                    }
                    disabled={!canEdit}
                  />
                </div>
                <div>
                  <Label htmlFor="heartRate" className="flex items-center gap-2">
                    <Heart className="h-4 w-4" />
                    Detak Jantung (bpm)
                  </Label>
                  <Input
                    id="heartRate"
                    type="number"
                    placeholder="120"
                    value={clinicalForm.heartRate}
                    onChange={(e) =>
                      setClinicalForm({ ...clinicalForm, heartRate: e.target.value })
                    }
                    disabled={!canEdit}
                  />
                </div>
                <div>
                  <Label htmlFor="respiratoryRate">Laju Pernapasan (/menit)</Label>
                  <Input
                    id="respiratoryRate"
                    type="number"
                    placeholder="30"
                    value={clinicalForm.respiratoryRate}
                    onChange={(e) =>
                      setClinicalForm({ ...clinicalForm, respiratoryRate: e.target.value })
                    }
                    disabled={!canEdit}
                  />
                </div>
                <div>
                  <Label htmlFor="bloodPressureSystolic">Tekanan Darah Sistolik (mmHg)</Label>
                  <Input
                    id="bloodPressureSystolic"
                    type="number"
                    placeholder="120"
                    value={clinicalForm.bloodPressureSystolic}
                    onChange={(e) =>
                      setClinicalForm({ ...clinicalForm, bloodPressureSystolic: e.target.value })
                    }
                    disabled={!canEdit}
                  />
                </div>
                <div>
                  <Label htmlFor="bloodPressureDiastolic">Tekanan Darah Diastolik (mmHg)</Label>
                  <Input
                    id="bloodPressureDiastolic"
                    type="number"
                    placeholder="80"
                    value={clinicalForm.bloodPressureDiastolic}
                    onChange={(e) =>
                      setClinicalForm({ ...clinicalForm, bloodPressureDiastolic: e.target.value })
                    }
                    disabled={!canEdit}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Physical Examination */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Stethoscope className="h-5 w-5" />
                Pemeriksaan Fisik
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Hasil pemeriksaan fisik (misal: Mata cekung, membran mukosa pucat, dehidrasi ringan)"
                value={clinicalForm.physicalExamination}
                onChange={(e) =>
                  setClinicalForm({ ...clinicalForm, physicalExamination: e.target.value })
                }
                disabled={!canEdit}
                rows={4}
              />
            </CardContent>
          </Card>

          {/* Diagnosis & Treatment Plan */}
          <div className="grid grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Diagnosis</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Diagnosis penyakit (misal: Gastroenteritis akut)"
                  value={clinicalForm.diagnosis}
                  onChange={(e) =>
                    setClinicalForm({ ...clinicalForm, diagnosis: e.target.value })
                  }
                  disabled={!canEdit}
                  rows={4}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Rencana Pengobatan</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Rencana terapi (misal: Infus RL 100ml, Injeksi antiemetik)"
                  value={clinicalForm.treatmentPlan}
                  onChange={(e) =>
                    setClinicalForm({ ...clinicalForm, treatmentPlan: e.target.value })
                  }
                  disabled={!canEdit}
                  rows={4}
                />
              </CardContent>
            </Card>
          </div>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Catatan Tambahan</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Catatan lainnya..."
                value={clinicalForm.notes}
                onChange={(e) =>
                  setClinicalForm({ ...clinicalForm, notes: e.target.value })
                }
                disabled={!canEdit}
                rows={3}
              />
            </CardContent>
          </Card>

          {/* Save Button */}
          {canEdit && (
            <div className="flex justify-end">
              <Button onClick={handleSaveClinicalData} className="gap-2">
                <Save className="h-4 w-4" />
                Simpan Data Klinis
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Services Tab - TODO: Implement services list and add */}
      {activeTab === "services" && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Tindakan & Obat</CardTitle>
              {canEdit && (
                <Button onClick={() => setIsServiceDialogOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Tambah Item
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {!services || services.length === 0 ? (
                <p className="text-slate-500 text-center py-8">Belum ada tindakan/obat</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Harga</TableHead>
                      <TableHead>Diskon</TableHead>
                      <TableHead>Subtotal</TableHead>
                      <TableHead>Keterangan</TableHead>
                      {canEdit && <TableHead className="text-right">Aksi</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {services.map((item: any) => (
                      <TableRow key={item._id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {item.isPrescription ? (
                              <Pill className="h-4 w-4 text-green-500" />
                            ) : (
                              <Syringe className="h-4 w-4 text-blue-500" />
                            )}
                            <div>
                              <p className="font-medium">{item.service?.name}</p>
                              {item.isPrescription && item.prescriptionDosage && (
                                <p className="text-xs text-slate-500">{item.prescriptionDosage}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{formatCurrency(item.unitPrice)}</TableCell>
                        <TableCell>
                          {item.discountAmount > 0 && (
                            <span>
                              {item.discountType === "percent" 
                                ? `${item.discountAmount}%` 
                                : formatCurrency(item.discountAmount)
                              }
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(item.subtotal)}
                        </TableCell>
                        <TableCell className="text-sm text-slate-600">
                          {item.notes || "-"}
                        </TableCell>
                        {canEdit && (
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteService(item._id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Summary */}
          {appointment && (
            <Card>
              <CardHeader>
                <CardTitle>Ringkasan Biaya</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(appointment.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Diskon:</span>
                    <span className="text-red-500">
                      - {formatCurrency(appointment.discountAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pajak ({appointment.taxRate}%):</span>
                    <span>{formatCurrency(appointment.taxAmount)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold pt-2 border-t">
                    <span>Total:</span>
                    <span>{formatCurrency(appointment.totalAmount)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Payment Tab - TODO: Implement payment flow */}
      {activeTab === "payment" && (
        <div className="space-y-6">
          {/* Payment Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Ringkasan Tagihan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-2xl font-bold">
                  <span>Total Tagihan:</span>
                  <span>{formatCurrency(appointment?.totalAmount || 0)}</span>
                </div>
                <div className="flex justify-between text-lg">
                  <span>Sudah Dibayar:</span>
                  <span className="text-green-600">
                    {formatCurrency(appointment?.paidAmount || 0)}
                  </span>
                </div>
                <div className="flex justify-between text-lg font-semibold pt-2 border-t">
                  <span>Sisa Tagihan:</span>
                  <span className="text-red-600">
                    {formatCurrency(appointment?.outstandingAmount || 0)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Existing Payments */}
          {payments && payments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Riwayat Pembayaran</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Metode</TableHead>
                      <TableHead>Ref. Number</TableHead>
                      <TableHead>Jumlah</TableHead>
                      <TableHead>Keterangan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment: any) => (
                      <TableRow key={payment._id}>
                        <TableCell>{formatDate(payment.paymentDate)}</TableCell>
                        <TableCell>
                          <Badge>{payment.paymentMethod}</Badge>
                        </TableCell>
                        <TableCell>{payment.referenceNumber || "-"}</TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(payment.amount)}
                        </TableCell>
                        <TableCell className="text-sm text-slate-600">
                          {payment.notes || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Process Payment Button */}
          {appointment?.status !== "Completed" && appointment?.status !== "Cancelled" && (
            <Card>
              <CardHeader>
                <CardTitle>Proses Pembayaran</CardTitle>
              </CardHeader>
              <CardContent>
                <Button 
                  className="w-full gap-2" 
                  size="lg"
                  onClick={() => setIsPaymentDialogOpen(true)}
                  disabled={!appointment || appointment.totalAmount === 0}
                >
                  <CheckCircle className="h-5 w-5" />
                  Bayar Sekarang
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Add Service Dialog */}
      <Dialog open={isServiceDialogOpen} onOpenChange={setIsServiceDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Tambah Tindakan / Obat</DialogTitle>
            <DialogDescription>
              Pilih layanan/tindakan atau obat untuk pasien
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="serviceId">
                  Layanan/Tindakan <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={serviceForm.serviceId}
                  onValueChange={(value) => {
                    const product = allProducts?.find((p: any) => p._id === value);
                    setServiceForm({
                      ...serviceForm,
                      serviceId: value,
                      unitPrice: product?.sellingPrice.toString() || "",
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih layanan" />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="px-2 py-1.5 text-xs font-semibold text-slate-500">
                      Layanan/Tindakan
                    </div>
                    {serviceProducts?.map((product: any) => (
                      <SelectItem key={product._id} value={product._id}>
                        {product.name} - {formatCurrency(product.sellingPrice)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity">
                  Qty <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="quantity"
                  type="number"
                  value={serviceForm.quantity}
                  onChange={(e) =>
                    setServiceForm({ ...serviceForm, quantity: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="unitPrice">
                  Harga Satuan <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="unitPrice"
                  type="number"
                  value={serviceForm.unitPrice}
                  onChange={(e) =>
                    setServiceForm({ ...serviceForm, unitPrice: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="discountAmount">Diskon</Label>
                <div className="flex gap-2">
                  <Input
                    id="discountAmount"
                    type="number"
                    value={serviceForm.discountAmount}
                    onChange={(e) =>
                      setServiceForm({ ...serviceForm, discountAmount: e.target.value })
                    }
                  />
                  <Select
                    value={serviceForm.discountType}
                    onValueChange={(value) =>
                      setServiceForm({ ...serviceForm, discountType: value })
                    }
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nominal">Rp</SelectItem>
                      <SelectItem value="percent">%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isPrescription"
                  checked={serviceForm.isPrescription}
                  onChange={(e) =>
                    setServiceForm({ ...serviceForm, isPrescription: e.target.checked })
                  }
                  className="w-4 h-4"
                />
                <Label htmlFor="isPrescription" className="cursor-pointer">
                  Resep Obat (Ambil Nanti)
                </Label>
              </div>
            </div>

            {serviceForm.isPrescription && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="productId">Obat</Label>
                  <Select
                    value={serviceForm.productId}
                    onValueChange={(value) =>
                      setServiceForm({ ...serviceForm, productId: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih obat" />
                    </SelectTrigger>
                    <SelectContent>
                      {medicineProducts?.map((product: any) => (
                        <SelectItem key={product._id} value={product._id}>
                          {product.name} - {formatCurrency(product.sellingPrice)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="prescriptionDosage">Dosis & Aturan Pakai</Label>
                  <Input
                    id="prescriptionDosage"
                    placeholder="Contoh: 2x sehari, 1 tablet, 7 hari"
                    value={serviceForm.prescriptionDosage}
                    onChange={(e) =>
                      setServiceForm({ ...serviceForm, prescriptionDosage: e.target.value })
                    }
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Catatan</Label>
              <Textarea
                id="notes"
                placeholder="Catatan tambahan..."
                value={serviceForm.notes}
                onChange={(e) =>
                  setServiceForm({ ...serviceForm, notes: e.target.value })
                }
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsServiceDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleAddService}>Tambah</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Proses Pembayaran</DialogTitle>
            <DialogDescription>
              Tambahkan pembayaran untuk appointment ini
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Summary */}
            <div className="bg-slate-50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between text-lg font-semibold">
                <span>Total Tagihan:</span>
                <span>{formatCurrency(appointment?.totalAmount || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>Sudah Dibayar:</span>
                <span className="text-green-600">
                  {formatCurrency(appointment?.paidAmount || 0)}
                </span>
              </div>
              <div className="flex justify-between font-semibold border-t pt-2">
                <span>Sisa:</span>
                <span>{formatCurrency(appointment?.outstandingAmount || 0)}</span>
              </div>
            </div>

            {/* Add Payment Form */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="paymentAmount">Jumlah Bayar</Label>
                <Input
                  id="paymentAmount"
                  type="number"
                  placeholder="0"
                  value={paymentForm.amount}
                  onChange={(e) =>
                    setPaymentForm({ ...paymentForm, amount: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentMethod">Metode Pembayaran</Label>
                <Select
                  value={paymentForm.paymentMethod}
                  onValueChange={(value) =>
                    setPaymentForm({ ...paymentForm, paymentMethod: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">Tunai</SelectItem>
                    <SelectItem value="QRIS">QRIS</SelectItem>
                    <SelectItem value="DEBIT_CARD">Kartu Debit</SelectItem>
                    <SelectItem value="CREDIT_CARD">Kartu Kredit</SelectItem>
                    <SelectItem value="BANK_TRANSFER">Transfer Bank</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 col-span-2">
                <Label htmlFor="referenceNumber">Nomor Referensi</Label>
                <Input
                  id="referenceNumber"
                  placeholder="Nomor transaksi/referensi"
                  value={paymentForm.referenceNumber}
                  onChange={(e) =>
                    setPaymentForm({ ...paymentForm, referenceNumber: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2 col-span-2">
                <Label htmlFor="paymentNotes">Catatan</Label>
                <Input
                  id="paymentNotes"
                  placeholder="Catatan pembayaran"
                  value={paymentForm.notes}
                  onChange={(e) =>
                    setPaymentForm({ ...paymentForm, notes: e.target.value })
                  }
                />
              </div>
            </div>

            <Button onClick={handleAddPayment} variant="outline" className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Tambah Pembayaran
            </Button>

            {/* Payment List */}
            {paymentList.length > 0 && (
              <div className="space-y-2">
                <Label>Daftar Pembayaran:</Label>
                <div className="border rounded-lg divide-y">
                  {paymentList.map((payment, index) => (
                    <div key={index} className="p-3 flex items-center justify-between">
                      <div>
                        <p className="font-medium">
                          {formatCurrency(payment.amount)} - {payment.paymentMethod}
                        </p>
                        {payment.referenceNumber && (
                          <p className="text-xs text-slate-500">
                            Ref: {payment.referenceNumber}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemovePayment(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="bg-blue-50 p-4 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span>Total Pembayaran:</span>
                    <span className="font-semibold">
                      {formatCurrency(totalPayments)}
                    </span>
                  </div>
                  {change > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Kembalian:</span>
                      <span className="font-semibold">{formatCurrency(change)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>
              Batal
            </Button>
            <Button 
              onClick={handleSubmitPayment}
              disabled={paymentList.length === 0}
              className="gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              Selesaikan Pembayaran
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
