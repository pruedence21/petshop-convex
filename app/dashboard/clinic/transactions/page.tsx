"use client";

import { useState, useEffect, useMemo } from "react";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
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
  User,
  Search,
  AlertCircle,
  Clock,
  Calendar,
  X
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, formatDate, parseErrorMessage } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { AddCustomerDialog } from "@/components/dialogs/AddCustomerDialog";
import { AddPetDialog } from "@/components/dialogs/AddPetDialog";

// -- Types --
type VitalSignProps = {
  icon: React.ElementType;
  label: string;
  value: string;
  unit: string;
  onChange: (val: string) => void;
  min?: number;
  max?: number;
  placeholder?: string;
};

const VitalSignInput = ({ icon: Icon, label, value, unit, onChange, min, max, placeholder }: VitalSignProps) => {
  const numVal = parseFloat(value);
  const isOutOfRange = (min !== undefined && numVal < min) || (max !== undefined && numVal > max);

  return (
    <div className="relative">
      <Label className="text-xs text-slate-500 mb-1.5 flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </Label>
      <div className="relative">
        <Input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`pr-8 ${isOutOfRange ? "border-red-300 bg-red-50 text-red-700" : ""}`}
          placeholder={placeholder}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium">
          {unit}
        </span>
      </div>
      {isOutOfRange && (
        <p className="text-[10px] text-red-500 mt-1 font-medium flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          Nilai tidak normal ({min}-{max})
        </p>
      )}
    </div>
  );
};

export default function ClinicTransactionPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  // -- State --
  const [appointmentId, setAppointmentId] = useState<Id<"clinicAppointments"> | null>(null);
  const [activeTab, setActiveTab] = useState("clinical");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Customer Selection (Initial Dialog)
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<Id<"customers"> | "">("");
  const [selectedPet, setSelectedPet] = useState<Id<"customerPets"> | "">("");
  const [selectedStaff, setSelectedStaff] = useState<Id<"clinicStaff"> | "">("");
  const [selectedBranch, setSelectedBranch] = useState<Id<"branches"> | "">("");
  const [initialComplaint, setInitialComplaint] = useState("");
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [isAddPetOpen, setIsAddPetOpen] = useState(false);

  // Clinical Data Form
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

  // Service/Medicine Command Palette
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [selectedServiceType, setSelectedServiceType] = useState<"service" | "medicine" | null>(null);

  // Payment State
  const [paymentList, setPaymentList] = useState<Array<{
    amount: number;
    paymentMethod: string;
    referenceNumber?: string;
    notes?: string;
  }>>([]);
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    paymentMethod: "CASH",
    referenceNumber: "",
    notes: "",
  });

  const branches = useQuery(api.master_data.branches.list, { includeInactive: false });
  const customers = useQuery(api.master_data.customers.list, { includeInactive: false });
  const pets = useQuery(api.master_data.customerPets.list, {});
  const staff = useQuery(api.clinic.clinicStaff.list, { includeInactive: false });
  const allProducts = useQuery(api.inventory.products.list, { includeInactive: false });

  const appointment = useQuery(
    api.clinic.clinicAppointments.get,
    appointmentId ? { id: appointmentId } : "skip"
  );

  const appointmentServices = useQuery(
    api.clinic.clinicAppointmentServices.list,
    appointmentId ? { appointmentId } : "skip"
  );

  // -- Mutations --
  const createAppointment = useMutation(api.clinic.clinicAppointments.create);
  const startExamination = useMutation(api.clinic.clinicAppointments.startExamination);
  const updateClinicalData = useMutation(api.clinic.clinicAppointments.updateClinicalData);
  const addService = useMutation(api.clinic.clinicAppointmentServices.create);
  const removeService = useMutation(api.clinic.clinicAppointmentServices.remove);
  const submitAppointment = useMutation(api.clinic.clinicAppointments.submitAppointment);

  // -- Effects --
  useEffect(() => {
    setMounted(true);
    if (branches && branches.length > 0 && !selectedBranch) {
      setSelectedBranch(branches[0]._id);
    }
  }, [branches]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsCommandOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Sync clinical form with loaded appointment data
  useEffect(() => {
    if (appointment) {
      setClinicalForm(prev => ({
        ...prev,
        chiefComplaint: appointment.chiefComplaint || prev.chiefComplaint,
        temperature: appointment.temperature?.toString() || prev.temperature,
        weight: appointment.weight?.toString() || prev.weight,
        heartRate: appointment.heartRate?.toString() || prev.heartRate,
        respiratoryRate: appointment.respiratoryRate?.toString() || prev.respiratoryRate,
        bloodPressureSystolic: appointment.bloodPressureSystolic?.toString() || prev.bloodPressureSystolic,
        bloodPressureDiastolic: appointment.bloodPressureDiastolic?.toString() || prev.bloodPressureDiastolic,
        physicalExamination: appointment.physicalExamination || prev.physicalExamination,
        diagnosis: appointment.diagnosis || prev.diagnosis,
        treatmentPlan: appointment.treatmentPlan || prev.treatmentPlan,
        notes: appointment.notes || prev.notes,
      }));
    }
  }, [appointment]);

  // -- Handlers --

  const handleStartSession = async () => {
    if (!selectedCustomer || !selectedPet || !selectedStaff || !selectedBranch || !initialComplaint) {
      toast.error("Mohon lengkapi semua data awal");
      return;
    }

    try {
      const result = await createAppointment({
        branchId: selectedBranch as Id<"branches">,
        customerId: selectedCustomer as Id<"customers">,
        petId: selectedPet as Id<"customerPets">,
        staffId: selectedStaff as Id<"clinicStaff">,
        appointmentDate: Date.now(),
        appointmentTime: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        notes: "Walk-in Session",
      });

      await startExamination({
        appointmentId: result.appointmentId,
        chiefComplaint: initialComplaint,
      });

      setAppointmentId(result.appointmentId);
      setClinicalForm(prev => ({ ...prev, chiefComplaint: initialComplaint }));
      setIsCustomerDialogOpen(false);
      toast.success("Sesi pemeriksaan dimulai");
    } catch (error: any) {
      toast.error(parseErrorMessage(error));
    }
  };

  const handleSaveClinical = async () => {
    if (!appointmentId) return;
    try {
      await updateClinicalData({
        appointmentId,
        chiefComplaint: clinicalForm.chiefComplaint,
        temperature: parseFloat(clinicalForm.temperature) || undefined,
        weight: parseFloat(clinicalForm.weight) || undefined,
        heartRate: parseFloat(clinicalForm.heartRate) || undefined,
        respiratoryRate: parseFloat(clinicalForm.respiratoryRate) || undefined,
        bloodPressureSystolic: parseFloat(clinicalForm.bloodPressureSystolic) || undefined,
        bloodPressureDiastolic: parseFloat(clinicalForm.bloodPressureDiastolic) || undefined,
        physicalExamination: clinicalForm.physicalExamination,
        diagnosis: clinicalForm.diagnosis,
        treatmentPlan: clinicalForm.treatmentPlan,
        notes: clinicalForm.notes,
      });
      toast.success("Data klinis tersimpan");
    } catch (error: any) {
      toast.error("Gagal menyimpan data klinis");
    }
  };

  const handleAddServiceItem = async (product: any) => {
    if (!appointmentId) return;

    // Determine type based on product type
    const isPrescription = product.type === "medicine";

    try {
      await addService({
        appointmentId,
        serviceId: product._id, // Using product ID as service ID for simplicity in this unified model
        productId: product._id,
        quantity: 1,
        unitPrice: product.sellingPrice,
        discountAmount: 0,
        discountType: "nominal",
        isPrescription,
        notes: "",
      });
      toast.success(`${product.name} ditambahkan`);
      setIsCommandOpen(false);
    } catch (error: any) {
      toast.error("Gagal menambahkan item");
    }
  };

  const handleRemoveServiceItem = async (id: Id<"clinicAppointmentServices">) => {
    try {
      await removeService({ id });
      toast.success("Item dihapus");
    } catch (error) {
      toast.error("Gagal menghapus item");
    }
  };

  const handleAddPayment = () => {
    const amount = parseFloat(paymentForm.amount);
    if (!amount || amount <= 0) return;

    setPaymentList([...paymentList, {
      amount,
      paymentMethod: paymentForm.paymentMethod,
      referenceNumber: paymentForm.referenceNumber,
      notes: paymentForm.notes
    }]);
    setPaymentForm({ ...paymentForm, amount: "", referenceNumber: "", notes: "" });
  };

  const handleFinishTransaction = async () => {
    if (!appointmentId) return;
    if (paymentList.length === 0) {
      toast.error("Belum ada pembayaran");
      return;
    }

    setIsSubmitting(true);
    try {
      await submitAppointment({
        appointmentId,
        payments: paymentList
      });
      toast.success("Transaksi Selesai!");
      router.push("/dashboard/clinic/appointments");
    } catch (error: any) {
      toast.error(parseErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  // -- Computed --
  const totalBill = appointment?.totalAmount || 0;
  const totalPaid = paymentList.reduce((sum, p) => sum + p.amount, 0);
  const remaining = Math.max(0, totalBill - totalPaid);

  if (!mounted) return null;

  // Initial Dialog
  if (!appointmentId) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl shadow-xl">
          <CardHeader className="border-b border-slate-100 bg-white rounded-t-xl">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Stethoscope className="h-6 w-6 text-blue-600" />
              Mulai Sesi Pemeriksaan
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Cabang</Label>
                  <Select value={selectedBranch as string} onValueChange={(v) => setSelectedBranch(v as Id<"branches">)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih Cabang" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches?.map(b => (
                        <SelectItem key={b._id} value={b._id}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Dokter Pemeriksa</Label>
                  <Select value={selectedStaff as string} onValueChange={(v) => setSelectedStaff(v as Id<"clinicStaff">)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih Dokter" />
                    </SelectTrigger>
                    <SelectContent>
                      {staff?.map(s => (
                        <SelectItem key={s._id} value={s._id}>{s.name} - {s.role}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Pemilik Hewan</Label>
                  <Select
                    value={selectedCustomer as string}
                    onValueChange={(v) => {
                      if (v === "ADD_NEW") {
                        setIsAddCustomerOpen(true);
                        return;
                      }
                      setSelectedCustomer(v as Id<"customers">);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Cari Customer..." />
                    </SelectTrigger>
                    <SelectContent>
                      {customers?.map(c => (
                        <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
                      ))}
                      <SelectItem value="ADD_NEW" className="font-medium text-blue-600 border-t mt-1 pt-1">
                        + Tambah Pelanggan Baru
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Hewan Peliharaan</Label>
                  <Select
                    value={selectedPet as string}
                    onValueChange={(v) => {
                      if (v === "ADD_NEW") {
                        setIsAddPetOpen(true);
                        return;
                      }
                      setSelectedPet(v as Id<"customerPets">);
                    }}
                    disabled={!selectedCustomer}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={selectedCustomer ? "Pilih Hewan" : "Pilih Customer Dulu"} />
                    </SelectTrigger>
                    <SelectContent>
                      {pets?.map(p => (
                        <SelectItem key={p._id} value={p._id}>{p.name} ({p.gender})</SelectItem>
                      ))}
                      <SelectItem value="ADD_NEW" className="font-medium text-blue-600 border-t mt-1 pt-1">
                        + Tambah Hewan Baru
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Keluhan Utama (Chief Complaint)</Label>
              <Textarea
                placeholder="Jelaskan keluhan utama pasien saat datang..."
                className="min-h-[100px] text-base"
                value={initialComplaint}
                onChange={(e) => setInitialComplaint(e.target.value)}
              />
            </div>

            <Button
              size="lg"
              className="w-full bg-blue-600 hover:bg-blue-700 text-lg h-12"
              onClick={handleStartSession}
            >
              Mulai Pemeriksaan
            </Button>
          </CardContent>
        </Card>
        <AddCustomerDialog
          open={isAddCustomerOpen}
          onOpenChange={setIsAddCustomerOpen}
          onSuccess={(id) => setSelectedCustomer(id as Id<"customers">)}
        />
        <AddPetDialog
          open={isAddPetOpen}
          onOpenChange={setIsAddPetOpen}
          onSuccess={(id) => setSelectedPet(id as Id<"customerPets">)}
          defaultCustomerId={selectedCustomer as string}
        />
      </div>
    );
  }

  // Main Workspace
  return (
    <div className="h-[calc(100vh-4rem)] flex overflow-hidden bg-slate-50">
      {/* LEFT SIDEBAR: Patient Context (Sticky) */}
      <div className="w-80 bg-white border-r border-slate-200 flex flex-col h-full shadow-sm z-10">
        <div className="p-6 border-b border-slate-100 text-center">
          <div className="w-20 h-20 bg-blue-100 rounded-full mx-auto mb-4 flex items-center justify-center text-blue-600">
            <Heart className="h-10 w-10" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">{appointment?.pet?.name}</h2>
          <p className="text-sm text-slate-500">{appointment?.pet?.breed} • {appointment?.pet?.gender}</p>
          <Badge variant="outline" className="mt-2 bg-slate-50">
            {appointment?.customer?.name}
          </Badge>
        </div>

        <ScrollArea className="flex-1 p-6">
          <div className="space-y-6">
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <AlertCircle className="h-3 w-3" />
                Alerts & Notes
              </h3>
              <div className="bg-yellow-50 border border-yellow-100 rounded-md p-3 text-sm text-yellow-800">
                <p className="font-medium">Alergi: Seafood</p>
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-md p-3 text-sm text-blue-800">
                <p>Vaksinasi terakhir: 12 Jan 2024</p>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Clock className="h-3 w-3" />
                Riwayat Kunjungan
              </h3>
              {[1, 2, 3].map((_, i) => (
                <div key={i} className="flex gap-3 items-start text-sm">
                  <div className="mt-1 min-w-[4px] h-[4px] rounded-full bg-slate-300" />
                  <div>
                    <p className="font-medium text-slate-700">10 Okt 2024</p>
                    <p className="text-slate-500 text-xs">Vaksinasi Rabies</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>

        <div className="p-4 border-t border-slate-200 bg-slate-50">
          <Button variant="outline" className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => router.push("/dashboard/clinic/appointments")}>
            <X className="h-4 w-4 mr-2" />
            Tutup Sesi
          </Button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center gap-4">
            <Badge variant="secondary" className="h-8 px-3 text-sm font-medium">
              {appointment?.appointmentNumber}
            </Badge>
            <div className="h-4 w-[1px] bg-slate-200" />
            <p className="text-sm text-slate-500 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {formatDate(appointment?.appointmentDate || 0)}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <p className="text-sm font-medium text-slate-600 mr-2">
              Total: <span className="text-slate-900 text-lg">{formatCurrency(totalBill)}</span>
            </p>
            <Button
              variant="default"
              className="bg-blue-600 hover:bg-blue-700 shadow-sm"
              onClick={() => setActiveTab("payment")}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Memproses..." : "Selesaikan & Bayar"}
            </Button>
          </div>
        </header>

        {/* Workspace Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 pt-4 bg-white border-b border-slate-200">
            <TabsList className="bg-transparent p-0 h-auto gap-6">
              <TabsTrigger
                value="clinical"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none px-2 py-3 text-slate-500 data-[state=active]:text-blue-600 transition-all"
              >
                Data Klinis
              </TabsTrigger>
              <TabsTrigger
                value="services"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none px-2 py-3 text-slate-500 data-[state=active]:text-blue-600 transition-all"
              >
                Tindakan & Resep
              </TabsTrigger>
              <TabsTrigger
                value="payment"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none px-2 py-3 text-slate-500 data-[state=active]:text-blue-600 transition-all"
              >
                Pembayaran
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-hidden bg-slate-50/50">
            <ScrollArea className="h-full">
              <div className="p-6 max-w-5xl mx-auto pb-20">

                {/* TAB: CLINICAL DATA */}
                <TabsContent value="clinical" className="space-y-6 mt-0">
                  {/* Subjective */}
                  <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                      <CardTitle className="text-base flex items-center gap-2">
                        <FileText className="h-4 w-4 text-blue-500" />
                        Anamnesa (Subjective)
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="space-y-2">
                        <Label>Keluhan Utama</Label>
                        <Textarea
                          value={clinicalForm.chiefComplaint}
                          onChange={(e) => setClinicalForm({ ...clinicalForm, chiefComplaint: e.target.value })}
                          className="min-h-[80px] bg-yellow-50/30 border-yellow-200 focus:border-yellow-400 focus:ring-yellow-200"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Objective (Vitals) */}
                  <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Activity className="h-4 w-4 text-green-500" />
                        Pemeriksaan Fisik (Objective)
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <VitalSignInput
                          icon={Thermometer} label="Suhu Tubuh" unit="°C"
                          value={clinicalForm.temperature}
                          onChange={(v) => setClinicalForm({ ...clinicalForm, temperature: v })}
                          min={37.5} max={39.5} placeholder="38.5"
                        />
                        <VitalSignInput
                          icon={Weight} label="Berat Badan" unit="kg"
                          value={clinicalForm.weight}
                          onChange={(v) => setClinicalForm({ ...clinicalForm, weight: v })}
                          placeholder="5.0"
                        />
                        <VitalSignInput
                          icon={Heart} label="Detak Jantung" unit="bpm"
                          value={clinicalForm.heartRate}
                          onChange={(v) => setClinicalForm({ ...clinicalForm, heartRate: v })}
                          min={60} max={140} placeholder="100"
                        />
                        <VitalSignInput
                          icon={Activity} label="Pernapasan" unit="/mnt"
                          value={clinicalForm.respiratoryRate}
                          onChange={(v) => setClinicalForm({ ...clinicalForm, respiratoryRate: v })}
                          min={10} max={30} placeholder="20"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Catatan Pemeriksaan Fisik</Label>
                        <Textarea
                          placeholder="Hasil pemeriksaan head-to-tail..."
                          value={clinicalForm.physicalExamination}
                          onChange={(e) => setClinicalForm({ ...clinicalForm, physicalExamination: e.target.value })}
                          className="min-h-[100px]"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Assessment & Plan */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="border-slate-200 shadow-sm">
                      <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Stethoscope className="h-4 w-4 text-purple-500" />
                          Diagnosa (Assessment)
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6">
                        <Textarea
                          placeholder="Diagnosa sementara/definitif..."
                          value={clinicalForm.diagnosis}
                          onChange={(e) => setClinicalForm({ ...clinicalForm, diagnosis: e.target.value })}
                          className="min-h-[150px] border-0 focus-visible:ring-0 resize-none p-0"
                        />
                      </CardContent>
                    </Card>

                    <Card className="border-slate-200 shadow-sm">
                      <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Pill className="h-4 w-4 text-orange-500" />
                          Rencana Terapi (Plan)
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6">
                        <Textarea
                          placeholder="Rencana pengobatan dan tindakan..."
                          value={clinicalForm.treatmentPlan}
                          onChange={(e) => setClinicalForm({ ...clinicalForm, treatmentPlan: e.target.value })}
                          className="min-h-[150px] border-0 focus-visible:ring-0 resize-none p-0"
                        />
                      </CardContent>
                    </Card>
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button onClick={handleSaveClinical} className="bg-blue-600 hover:bg-blue-700 min-w-[150px]">
                      <Save className="h-4 w-4 mr-2" />
                      Simpan Data
                    </Button>
                  </div>
                </TabsContent>

                {/* TAB: SERVICES & MEDS */}
                <TabsContent value="services" className="space-y-6 mt-0">
                  <div className="flex items-center justify-between bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <div>
                      <h3 className="font-bold text-blue-900">Command Palette</h3>
                      <p className="text-sm text-blue-700">Tekan <kbd className="bg-white px-1.5 py-0.5 rounded border border-blue-200 text-xs font-mono mx-1">Cmd + K</kbd> untuk menambah layanan atau obat dengan cepat</p>
                    </div>
                    <Button onClick={() => setIsCommandOpen(true)} variant="secondary" className="bg-white text-blue-600 hover:bg-blue-50 border border-blue-200">
                      <Search className="h-4 w-4 mr-2" />
                      Cari Item
                    </Button>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle>Daftar Tindakan & Obat</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      {appointmentServices?.length === 0 ? (
                        <div className="p-8 text-center text-slate-400">
                          <Pill className="h-12 w-12 mx-auto mb-3 opacity-20" />
                          <p>Belum ada item ditambahkan</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-100">
                          {appointmentServices?.map((item: any) => (
                            <div key={item._id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                              <div className="flex items-center gap-4">
                                <div className={`h-10 w-10 rounded-full flex items-center justify-center ${item.isPrescription ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                                  {item.isPrescription ? <Pill className="h-5 w-5" /> : <Syringe className="h-5 w-5" />}
                                </div>
                                <div>
                                  <h4 className="font-medium text-slate-900">{item.service?.name || item.product?.name}</h4>
                                  <div className="flex items-center gap-2 text-sm text-slate-500">
                                    <span>{item.quantity} x {formatCurrency(item.unitPrice)}</span>
                                    {item.isPrescription && (
                                      <Badge variant="outline" className="text-[10px] h-5">Resep</Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-6">
                                <span className="font-bold text-slate-700">{formatCurrency(item.subtotal)}</span>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                  onClick={() => handleRemoveServiceItem(item._id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* TAB: PAYMENT */}
                <TabsContent value="payment" className="space-y-6 mt-0">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 space-y-6">
                      <Card>
                        <CardHeader>
                          <CardTitle>Rincian Tagihan</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                          <div className="divide-y divide-slate-100">
                            {appointmentServices?.map((item: any) => (
                              <div key={item._id} className="p-4 flex justify-between text-sm">
                                <span>{item.service?.name || item.product?.name} <span className="text-slate-400">x{item.quantity}</span></span>
                                <span className="font-medium">{formatCurrency(item.subtotal)}</span>
                              </div>
                            ))}
                            <div className="p-4 bg-slate-50 flex justify-between font-bold text-lg border-t border-slate-200">
                              <span>Total Tagihan</span>
                              <span className="text-blue-600">{formatCurrency(totalBill)}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle>Pembayaran</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Metode</Label>
                              <Select
                                value={paymentForm.paymentMethod}
                                onValueChange={(v) => setPaymentForm({ ...paymentForm, paymentMethod: v })}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="CASH">Tunai</SelectItem>
                                  <SelectItem value="QRIS">QRIS</SelectItem>
                                  <SelectItem value="DEBIT">Debit Card</SelectItem>
                                  <SelectItem value="CREDIT">Credit Card</SelectItem>
                                  <SelectItem value="TRANSFER">Transfer</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Jumlah</Label>
                              <Input
                                type="number"
                                value={paymentForm.amount}
                                onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                                placeholder="0"
                              />
                            </div>
                          </div>
                          <Button onClick={handleAddPayment} variant="secondary" className="w-full">
                            Tambah Pembayaran
                          </Button>

                          {paymentList.length > 0 && (
                            <div className="bg-slate-50 rounded-lg p-4 space-y-2 border border-slate-200">
                              {paymentList.map((p, i) => (
                                <div key={i} className="flex justify-between text-sm">
                                  <span>{p.paymentMethod}</span>
                                  <span>{formatCurrency(p.amount)}</span>
                                </div>
                              ))}
                              <Separator className="my-2" />
                              <div className="flex justify-between font-bold">
                                <span>Total Dibayar</span>
                                <span>{formatCurrency(totalPaid)}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span>Sisa Tagihan</span>
                                <span className={remaining > 0 ? "text-red-600" : "text-green-600"}>
                                  {formatCurrency(remaining)}
                                </span>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>

                    <div>
                      <Button
                        size="lg"
                        className="w-full h-14 text-lg bg-green-600 hover:bg-green-700 shadow-lg shadow-green-200"
                        disabled={remaining > 0}
                        onClick={handleFinishTransaction}
                      >
                        <CheckCircle className="h-6 w-6 mr-2" />
                        Selesaikan Transaksi
                      </Button>
                      <p className="text-xs text-center text-slate-400 mt-4">
                        Pastikan semua data klinis dan pembayaran sudah benar sebelum menyelesaikan transaksi.
                      </p>
                    </div>
                  </div>
                </TabsContent>

              </div>
            </ScrollArea>
          </div>
        </Tabs>
      </div>

      {/* COMMAND PALETTE */}
      <CommandDialog open={isCommandOpen} onOpenChange={setIsCommandOpen}>
        <CommandInput placeholder="Cari layanan, obat, atau tindakan..." />
        <CommandList>
          <CommandEmpty>Tidak ditemukan.</CommandEmpty>
          <CommandGroup heading="Layanan & Tindakan">
            {allProducts?.filter((p: any) => p.type === "service" || p.type === "procedure").map((product: any) => (
              <CommandItem key={product._id} onSelect={() => handleAddServiceItem(product)}>
                <Syringe className="mr-2 h-4 w-4 text-blue-500" />
                <span>{product.name}</span>
                <span className="ml-auto font-medium text-slate-500">{formatCurrency(product.sellingPrice)}</span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Obat-obatan">
            {allProducts?.filter((p: any) => p.type === "medicine").map((product: any) => (
              <CommandItem key={product._id} onSelect={() => handleAddServiceItem(product)}>
                <Pill className="mr-2 h-4 w-4 text-green-500" />
                <span>{product.name}</span>
                <span className="ml-auto font-medium text-slate-500">{formatCurrency(product.sellingPrice)}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </div>
  );
}
