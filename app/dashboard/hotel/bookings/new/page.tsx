"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function NewBookingPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    branchId: "" as Id<"branches"> | "",
    customerId: "" as Id<"customers"> | "",
    petId: "" as Id<"customerPets"> | "",
    roomId: "" as Id<"hotelRooms"> | "",
    checkInDate: "",
    checkOutDate: "",
    specialRequests: "",
    emergencyContact: "",
    ownFood: false,
    notes: "",
  });

  const branches = useQuery(api.master_data.branches.list, { includeInactive: false });
  const customers = useQuery(api.master_data.customers.list, { includeInactive: false });
  const allPets = useQuery(api.master_data.customerPets.list, {});
  
  // Filter pets by selected customer
  const pets = formData.customerId
    ? allPets?.filter((p) => p.customerId === formData.customerId)
    : [];

  // Get available rooms based on selected dates and branch
  const availableRooms = useQuery(
    api.hotel.hotelRooms.getAvailableRooms,
    formData.branchId && formData.checkInDate && formData.checkOutDate
      ? {
          branchId: formData.branchId as Id<"branches">,
          checkInDate: new Date(formData.checkInDate).getTime(),
          checkOutDate: new Date(formData.checkOutDate).getTime(),
        }
      : "skip"
  );

  const createBooking = useMutation(api.hotel.hotelBookings.create);
  const addPayment = useMutation(api.hotel.hotelPayments.add);

  const [depositAmount, setDepositAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<
    "CASH" | "QRIS" | "CREDIT" | "BANK_TRANSFER" | "DEBIT_CARD"
  >("CASH");

  const selectedRoom = availableRooms?.find((r: any) => r._id === formData.roomId);
  const numberOfDays =
    formData.checkInDate && formData.checkOutDate
      ? Math.ceil(
          (new Date(formData.checkOutDate).getTime() -
            new Date(formData.checkInDate).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : 0;
  const estimatedTotal = selectedRoom
    ? numberOfDays * selectedRoom.dailyRate
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.branchId || !formData.customerId || !formData.petId || !formData.roomId) {
      toast.error("Lengkapi semua field yang wajib diisi");
      return;
    }

    if (!formData.checkInDate || !formData.checkOutDate) {
      toast.error("Tanggal check-in dan check-out harus diisi");
      return;
    }

    if (new Date(formData.checkInDate) >= new Date(formData.checkOutDate)) {
      toast.error("Tanggal check-out harus setelah check-in");
      return;
    }

    try {
      // Create booking
      const result = await createBooking({
        branchId: formData.branchId,
        customerId: formData.customerId,
        petId: formData.petId,
        roomId: formData.roomId,
        checkInDate: new Date(formData.checkInDate).getTime(),
        checkOutDate: new Date(formData.checkOutDate).getTime(),
        specialRequests: formData.specialRequests || undefined,
        emergencyContact: formData.emergencyContact || undefined,
        ownFood: formData.ownFood,
        notes: formData.notes || undefined,
      });

      // Add deposit payment if any
      if (depositAmount > 0) {
        await addPayment({
          bookingId: result.bookingId,
          paymentType: "Deposit",
          amount: depositAmount,
          paymentMethod: paymentMethod,
        });
      }

      toast.success(`Booking berhasil dibuat: ${result.bookingNumber}`);
      router.push(`/dashboard/hotel/bookings/${result.bookingId}`);
    } catch (error: any) {
      toast.error(error.message || "Gagal membuat booking");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Kembali
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Buat Booking Baru</h1>
          <p className="text-muted-foreground">Reservasi pet hotel</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Informasi Customer & Pet</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customerId">Customer *</Label>
                <Select
                  value={formData.customerId}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      customerId: value as Id<"customers">,
                      petId: "", // Reset pet when customer changes
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers?.map((customer) => (
                      <SelectItem key={customer._id} value={customer._id}>
                        {customer.name} - {customer.phone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="petId">Pet *</Label>
                <Select
                  value={formData.petId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, petId: value as Id<"customerPets"> })
                  }
                  disabled={!formData.customerId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih pet" />
                  </SelectTrigger>
                  <SelectContent>
                    {pets?.map((pet) => (
                      <SelectItem key={pet._id} value={pet._id}>
                        {pet.name} {pet.breed ? `(${pet.breed})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="emergencyContact">Kontak Darurat</Label>
                <Input
                  id="emergencyContact"
                  value={formData.emergencyContact}
                  onChange={(e) =>
                    setFormData({ ...formData, emergencyContact: e.target.value })
                  }
                  placeholder="Nomor telepon darurat"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.ownFood}
                    onChange={(e) =>
                      setFormData({ ...formData, ownFood: e.target.checked })
                    }
                  />
                  Bawa Pakan Sendiri
                </Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="specialRequests">Permintaan Khusus</Label>
              <Textarea
                id="specialRequests"
                value={formData.specialRequests}
                onChange={(e) =>
                  setFormData({ ...formData, specialRequests: e.target.value })
                }
                placeholder="Contoh: Alergi makanan ayam, takut petir, dll"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Detail Booking</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="branchId">Cabang *</Label>
              <Select
                value={formData.branchId}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    branchId: value as Id<"branches">,
                    roomId: "", // Reset room when branch changes
                  })
                }
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="checkInDate">Tanggal Check-in *</Label>
                <Input
                  id="checkInDate"
                  type="date"
                  value={formData.checkInDate}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      checkInDate: e.target.value,
                      roomId: "", // Reset room when dates change
                    })
                  }
                  min={new Date().toISOString().split("T")[0]}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="checkOutDate">Tanggal Check-out *</Label>
                <Input
                  id="checkOutDate"
                  type="date"
                  value={formData.checkOutDate}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      checkOutDate: e.target.value,
                      roomId: "", // Reset room when dates change
                    })
                  }
                  min={
                    formData.checkInDate ||
                    new Date().toISOString().split("T")[0]
                  }
                  required
                />
              </div>
            </div>

            {numberOfDays > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <span className="font-medium">Durasi: {numberOfDays} hari</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="roomId">Kandang *</Label>
              <Select
                value={formData.roomId}
                onValueChange={(value) =>
                  setFormData({ ...formData, roomId: value as Id<"hotelRooms"> })
                }
                disabled={
                  !formData.branchId ||
                  !formData.checkInDate ||
                  !formData.checkOutDate
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kandang" />
                </SelectTrigger>
                <SelectContent>
                  {availableRooms?.map((room: any) => (
                    <SelectItem key={room._id} value={room._id}>
                      {room.name} - {room.roomType} ({room.size}) -{" "}
                      {formatCurrency(room.dailyRate)}/hari
                    </SelectItem>
                  ))}
                  {availableRooms && availableRooms.length === 0 && (
                    <SelectItem value="none" disabled>
                      Tidak ada kandang tersedia
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {estimatedTotal > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Estimasi Total:</span>
                  <span className="text-xl font-bold text-green-700">
                    {formatCurrency(estimatedTotal)}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {numberOfDays} hari × {formatCurrency(selectedRoom!.dailyRate)}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Catatan</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="Catatan tambahan"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Deposit (Opsional)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="depositAmount">Jumlah Deposit</Label>
                <Input
                  id="depositAmount"
                  type="number"
                  value={depositAmount}
                  onChange={(e) =>
                    setDepositAmount(parseFloat(e.target.value) || 0)
                  }
                  min="0"
                  step="1000"
                  placeholder="0 = Bayar saat check-out"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="paymentMethod">Metode Pembayaran</Label>
                <Select
                  value={paymentMethod}
                  onValueChange={(value: any) => setPaymentMethod(value)}
                  disabled={depositAmount === 0}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="QRIS">QRIS</SelectItem>
                    <SelectItem value="CREDIT">Kartu Kredit</SelectItem>
                    <SelectItem value="BANK_TRANSFER">Transfer Bank</SelectItem>
                    <SelectItem value="DEBIT_CARD">Kartu Debit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {depositAmount > 0 && (
              <div className="text-sm text-muted-foreground">
                Sisa pembayaran: {formatCurrency(estimatedTotal - depositAmount)}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Batal
          </Button>
          <Button type="submit">
            <Save className="h-4 w-4 mr-2" />
            Buat Booking
          </Button>
        </div>
      </form>
    </div>
  );
}

