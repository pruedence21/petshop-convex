"use client";

import { use, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Plus,
  Trash2,
  Save,
  CheckCircle,
  X,
  FileText,
  LogIn,
  LogOut as LogOutIcon,
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";

export default function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<
    "info" | "services" | "consumables" | "payments" | "invoice"
  >("info");
  const [isServiceDialogOpen, setIsServiceDialogOpen] = useState(false);
  const [isConsumableDialogOpen, setIsConsumableDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isCheckoutDialogOpen, setIsCheckoutDialogOpen] = useState(false);

  const bookingId = resolvedParams.id as Id<"hotelBookings">;
  const booking = useQuery(api.hotel.hotelBookings.get, { id: bookingId });
  const services = useQuery(api.hotel.hotelBookingServices.list, { bookingId });
  const consumables = useQuery(api.hotel.hotelConsumables.list, { bookingId });
  const payments = useQuery(api.hotel.hotelPayments.list, { bookingId });
  
  // Conditional queries - use "skip" string when condition is false
  const invoice = useQuery(
    api.hotel.hotelBookings.generateInvoice,
    booking?.status === "CheckedOut" || booking?.status === "CheckedIn"
      ? {
          id: bookingId,
          invoiceType: booking?.status === "CheckedOut" ? "final" : "proforma",
        }
      : "skip"
  );

  const customer = useQuery(
    api.master_data.customers.get,
    booking ? { id: booking.customerId } : "skip"
  );
  const pet = useQuery(
    api.master_data.customerPets.get,
    booking ? { id: booking.petId } : "skip"
  );
  const room = useQuery(
    api.hotel.hotelRooms.get,
    booking ? { id: booking.roomId } : "skip"
  );

  const serviceProducts = useQuery(api.inventory.products.list, {
    includeInactive: false,
  })?.filter((p) => p.type === "service");
  const consumableProducts = useQuery(api.inventory.products.list, {
    includeInactive: false,
  })?.filter((p) => p.type === "product");

  const checkIn = useMutation(api.hotel.hotelBookings.checkIn);
  const checkOut = useMutation(api.hotel.hotelBookings.checkOut);
  const cancelBooking = useMutation(api.hotel.hotelBookings.cancel);
  const addService = useMutation(api.hotel.hotelBookingServices.add);
  const removeService = useMutation(api.hotel.hotelBookingServices.remove);
  const addConsumable = useMutation(api.hotel.hotelConsumables.add);
  const removeConsumable = useMutation(api.hotel.hotelConsumables.remove);
  const addPayment = useMutation(api.hotel.hotelPayments.add);

  const [serviceForm, setServiceForm] = useState({
    serviceId: "",
    serviceDate: new Date().toISOString().slice(0, 10),
    quantity: 1,
    unitPrice: 0,
    discountAmount: 0,
    discountType: "nominal" as "percent" | "nominal",
    notes: "",
  });

  const [consumableForm, setConsumableForm] = useState({
    productId: "",
    consumptionDate: new Date().toISOString().slice(0, 10),
    quantity: 0,
    notes: "",
  });

  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    paymentMethod: "CASH" as
      | "CASH"
      | "QRIS"
      | "CREDIT"
      | "BANK_TRANSFER"
      | "DEBIT_CARD",
    referenceNumber: "",
    notes: "",
  });

  const [checkoutPayments, setCheckoutPayments] = useState<
    Array<{
      amount: number;
      paymentMethod: string;
      referenceNumber?: string;
      notes?: string;
    }>
  >([]);

  const handleCheckIn = async () => {
    if (!booking) return;
    try {
      await checkIn({ id: bookingId });
      toast.success("Check-in berhasil");
    } catch (error: any) {
      toast.error(error.message || "Gagal check-in");
    }
  };

  const handleCancel = async () => {
    if (!confirm("Yakin ingin membatalkan booking ini?")) return;
    try {
      await cancelBooking({ id: bookingId });
      toast.success("Booking dibatalkan");
      router.push("/dashboard/hotel/bookings");
    } catch (error: any) {
      toast.error(error.message || "Gagal membatalkan");
    }
  };

  const handleAddService = async () => {
    try {
      await addService({
        bookingId,
        serviceId: serviceForm.serviceId as Id<"products">,
        serviceDate: new Date(serviceForm.serviceDate).getTime(),
        quantity: serviceForm.quantity,
        unitPrice: serviceForm.unitPrice,
        discountAmount: serviceForm.discountAmount,
        discountType: serviceForm.discountType,
        notes: serviceForm.notes || undefined,
      });
      toast.success("Layanan ditambahkan");
      setIsServiceDialogOpen(false);
      setServiceForm({
        serviceId: "",
        serviceDate: new Date().toISOString().slice(0, 10),
        quantity: 1,
        unitPrice: 0,
        discountAmount: 0,
        discountType: "nominal",
        notes: "",
      });
    } catch (error: any) {
      toast.error(error.message || "Gagal menambah layanan");
    }
  };

  const handleAddConsumable = async () => {
    if (booking?.ownFood) {
      toast.error("Customer membawa pakan sendiri");
      return;
    }
    try {
      await addConsumable({
        bookingId,
        productId: consumableForm.productId as Id<"products">,
        consumptionDate: new Date(consumableForm.consumptionDate).getTime(),
        quantity: consumableForm.quantity,
        notes: consumableForm.notes || undefined,
      });
      toast.success("Konsumsi ditambahkan");
      setIsConsumableDialogOpen(false);
      setConsumableForm({
        productId: "",
        consumptionDate: new Date().toISOString().slice(0, 10),
        quantity: 0,
        notes: "",
      });
    } catch (error: any) {
      toast.error(error.message || "Gagal menambah konsumsi");
    }
  };

  const handleAddPayment = async () => {
    try {
      await addPayment({
        bookingId,
        paymentType: "Partial",
        amount: paymentForm.amount,
        paymentMethod: paymentForm.paymentMethod,
        referenceNumber: paymentForm.referenceNumber || undefined,
        notes: paymentForm.notes || undefined,
      });
      toast.success("Pembayaran ditambahkan");
      setIsPaymentDialogOpen(false);
      setPaymentForm({
        amount: 0,
        paymentMethod: "CASH",
        referenceNumber: "",
        notes: "",
      });
    } catch (error: any) {
      toast.error(error.message || "Gagal menambah pembayaran");
    }
  };

  const handleCheckout = async () => {
    try {
      await checkOut({
        id: bookingId,
        payments: checkoutPayments,
      });
      toast.success("Check-out berhasil");
      setIsCheckoutDialogOpen(false);
      router.push("/dashboard/hotel/bookings");
    } catch (error: any) {
      toast.error(error.message || "Gagal check-out");
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<
      string,
      "default" | "secondary" | "destructive" | "outline"
    > = {
      Reserved: "secondary",
      CheckedIn: "default",
      CheckedOut: "outline",
      Cancelled: "destructive",
    };
    return (
      <Badge variant={variants[status] || "default"}>
        {status === "Reserved"
          ? "Dipesan"
          : status === "CheckedIn"
          ? "Check-in"
          : status === "CheckedOut"
          ? "Selesai"
          : "Dibatalkan"}
      </Badge>
    );
  };

  if (!booking) {
    return (
      <div className="p-6">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Kembali
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{booking.bookingNumber}</h1>
            <p className="text-muted-foreground">
              Detail booking pet hotel
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {booking.status === "Reserved" && (
            <>
              <Button onClick={handleCheckIn}>
                <LogIn className="h-4 w-4 mr-2" />
                Check-in
              </Button>
              <Button variant="destructive" onClick={handleCancel}>
                <X className="h-4 w-4 mr-2" />
                Batal
              </Button>
            </>
          )}
          {booking.status === "CheckedIn" && (
            <Button onClick={() => setIsCheckoutDialogOpen(true)}>
              <LogOutIcon className="h-4 w-4 mr-2" />
              Check-out
            </Button>
          )}
        </div>
      </div>

      {/* Status Badge */}
      <div>{getStatusBadge(booking.status)}</div>

      {/* Tabs */}
      <div className="border-b">
        <div className="flex gap-4">
          {["info", "services", "consumables", "payments", "invoice"].map(
            (tab) => (
              <button
                key={tab}
                onClick={() =>
                  setActiveTab(
                    tab as "info" | "services" | "consumables" | "payments" | "invoice"
                  )
                }
                className={`px-4 py-2 border-b-2 transition-colors ${
                  activeTab === tab
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent hover:text-blue-600"
                }`}
              >
                {tab === "info"
                  ? "Info Booking"
                  : tab === "services"
                  ? "Layanan"
                  : tab === "consumables"
                  ? "Konsumsi"
                  : tab === "payments"
                  ? "Pembayaran"
                  : "Invoice"}
              </button>
            )
          )}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "info" && (
        <div className="grid grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Informasi Customer & Pet</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Customer</Label>
                <div className="font-medium">{customer?.name}</div>
                <div className="text-sm text-muted-foreground">
                  {customer?.phone}
                </div>
              </div>
              <div>
                <Label>Pet</Label>
                <div className="font-medium">{pet?.name}</div>
                <div className="text-sm text-muted-foreground">
                  {pet?.breed || "-"}
                </div>
              </div>
              <div>
                <Label>Kontak Darurat</Label>
                <div>{booking.emergencyContact || "-"}</div>
              </div>
              <div>
                <Label>Permintaan Khusus</Label>
                <div>{booking.specialRequests || "-"}</div>
              </div>
              <div>
                <Label>Bawa Pakan Sendiri</Label>
                <div>{booking.ownFood ? "Ya" : "Tidak"}</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Detail Booking</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Kandang</Label>
                <div className="font-medium">{room?.name}</div>
                <div className="text-sm text-muted-foreground">
                  {room?.roomType} - {room?.size}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Check-in</Label>
                  <div>{formatDate(booking.checkInDate)}</div>
                  {booking.actualCheckInDate && (
                    <div className="text-sm text-muted-foreground">
                      Aktual: {formatDateTime(booking.actualCheckInDate)}
                    </div>
                  )}
                </div>
                <div>
                  <Label>Check-out</Label>
                  <div>{formatDate(booking.checkOutDate)}</div>
                  {booking.actualCheckOutDate && (
                    <div className="text-sm text-muted-foreground">
                      Aktual: {formatDateTime(booking.actualCheckOutDate)}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <Label>Durasi</Label>
                <div>{booking.numberOfDays} hari</div>
              </div>
              <div>
                <Label>Tarif per Hari</Label>
                <div>{formatCurrency(booking.dailyRate)}</div>
              </div>
            </CardContent>
          </Card>

          <Card className="col-span-2">
            <CardHeader>
              <CardTitle>Ringkasan Biaya</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span>Biaya Kandang ({booking.numberOfDays} hari)</span>
                <span>{formatCurrency(booking.roomTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Layanan Tambahan</span>
                <span>{formatCurrency(booking.servicesTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Konsumsi</span>
                <span>{formatCurrency(booking.consumablesTotal)}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Subtotal</span>
                <span>{formatCurrency(booking.subtotal)}</span>
              </div>
              <div className="flex justify-between text-red-600">
                <span>Diskon</span>
                <span>-{formatCurrency(booking.discountAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span>Pajak ({booking.taxRate}%)</span>
                <span>{formatCurrency(booking.taxAmount)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-2 border-t">
                <span>Total</span>
                <span>{formatCurrency(booking.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-green-600">
                <span>Terbayar</span>
                <span>{formatCurrency(booking.paidAmount)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold text-red-600">
                <span>Sisa</span>
                <span>{formatCurrency(booking.outstandingAmount)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "services" && (
        <div className="space-y-4">
          {booking.status === "CheckedIn" && (
            <Button onClick={() => setIsServiceDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Tambah Layanan
            </Button>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Layanan</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Harga</TableHead>
                <TableHead>Diskon</TableHead>
                <TableHead>Subtotal</TableHead>
                {booking.status === "CheckedIn" && <TableHead>Aksi</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {services?.map((service: any) => {
                const product = serviceProducts?.find(
                  (p) => p._id === service.serviceId
                );
                return (
                  <TableRow key={service._id}>
                    <TableCell>{formatDate(service.serviceDate)}</TableCell>
                    <TableCell>{product?.name || "-"}</TableCell>
                    <TableCell>{service.quantity}</TableCell>
                    <TableCell>{formatCurrency(service.unitPrice)}</TableCell>
                    <TableCell>
                      {formatCurrency(service.discountAmount)}
                    </TableCell>
                    <TableCell>{formatCurrency(service.subtotal)}</TableCell>
                    {booking.status === "CheckedIn" && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            if (confirm("Hapus layanan ini?")) {
                              await removeService({ id: service._id });
                              toast.success("Layanan dihapus");
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
              {!services || services.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={booking.status === "CheckedIn" ? 7 : 6}
                    className="text-center"
                  >
                    Belum ada layanan
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      )}

      {activeTab === "consumables" && (
        <div className="space-y-4">
          {booking.status === "CheckedIn" && !booking.ownFood && (
            <Button onClick={() => setIsConsumableDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Tambah Konsumsi
            </Button>
          )}

          {booking.ownFood && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              Customer membawa pakan sendiri. Tidak ada biaya konsumsi.
            </div>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Produk</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Harga</TableHead>
                <TableHead>Subtotal</TableHead>
                {booking.status === "CheckedIn" && <TableHead>Aksi</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {consumables?.map((consumable: any) => {
                const product = consumableProducts?.find(
                  (p) => p._id === consumable.productId
                );
                return (
                  <TableRow key={consumable._id}>
                    <TableCell>
                      {formatDate(consumable.consumptionDate)}
                    </TableCell>
                    <TableCell>{product?.name || "-"}</TableCell>
                    <TableCell>{consumable.quantity}</TableCell>
                    <TableCell>
                      {formatCurrency(consumable.unitPrice)}
                    </TableCell>
                    <TableCell>
                      {formatCurrency(consumable.subtotal)}
                    </TableCell>
                    {booking.status === "CheckedIn" && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            if (
                              confirm(
                                "Hapus konsumsi ini? (Stok sudah dikurangi)"
                              )
                            ) {
                              await removeConsumable({ id: consumable._id });
                              toast.success("Konsumsi dihapus");
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
              {!consumables || consumables.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={booking.status === "CheckedIn" ? 6 : 5}
                    className="text-center"
                  >
                    Belum ada konsumsi
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      )}

      {activeTab === "payments" && (
        <div className="space-y-4">
          {(booking.status === "Reserved" || booking.status === "CheckedIn") && (
            <Button onClick={() => setIsPaymentDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Tambah Pembayaran
            </Button>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead>Metode</TableHead>
                <TableHead>Jumlah</TableHead>
                <TableHead>Referensi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments?.map((payment: any) => (
                <TableRow key={payment._id}>
                  <TableCell>{formatDateTime(payment.paymentDate)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{payment.paymentType}</Badge>
                  </TableCell>
                  <TableCell>{payment.paymentMethod}</TableCell>
                  <TableCell>{formatCurrency(payment.amount)}</TableCell>
                  <TableCell>{payment.referenceNumber || "-"}</TableCell>
                </TableRow>
              ))}
              {!payments || payments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    Belum ada pembayaran
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      )}

      {activeTab === "invoice" && invoice && (
        <Card>
          <CardHeader>
            <CardTitle>
              Invoice {invoice.booking.status === "CheckedOut" ? "Final" : "Pro-forma"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="font-bold">Customer:</div>
                <div>{invoice.customer.name}</div>
                <div className="text-sm">{invoice.customer.phone}</div>
                <div className="text-sm">{invoice.customer.address}</div>
              </div>
              <div>
                <div className="font-bold">Pet:</div>
                <div>{invoice.pet.name}</div>
                <div className="text-sm">
                  {invoice.pet.categoryName} - {invoice.pet.breed}
                </div>
              </div>
            </div>

            <div>
              <div className="font-bold mb-2">Detail:</div>
              <div className="text-sm space-y-1">
                <div>Booking: {invoice.booking.bookingNumber}</div>
                <div>
                  Check-in: {formatDate(invoice.booking.checkInDate)}
                </div>
                <div>
                  Check-out: {formatDate(invoice.booking.checkOutDate)}
                </div>
                <div>Kandang: {invoice.room.name}</div>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Harga</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>{invoice.lineItems.room.description}</TableCell>
                  <TableCell className="text-right">
                    {invoice.lineItems.room.quantity}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(invoice.lineItems.room.unitPrice)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(invoice.lineItems.room.subtotal)}
                  </TableCell>
                </TableRow>
                {invoice.lineItems.services.map((service: any, idx: number) => (
                  <TableRow key={`service-${idx}`}>
                    <TableCell>{service.serviceName}</TableCell>
                    <TableCell className="text-right">
                      {service.quantity}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(service.unitPrice)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(service.subtotal)}
                    </TableCell>
                  </TableRow>
                ))}
                {invoice.lineItems.consumables.map((consumable: any, idx: number) => (
                  <TableRow key={`consumable-${idx}`}>
                    <TableCell>{consumable.productName}</TableCell>
                    <TableCell className="text-right">
                      {consumable.quantity}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(consumable.unitPrice)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(consumable.subtotal)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="space-y-2 border-t pt-4">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatCurrency(invoice.totals.subtotal)}</span>
              </div>
              <div className="flex justify-between text-red-600">
                <span>Diskon</span>
                <span>-{formatCurrency(invoice.totals.discountAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span>Pajak</span>
                <span>{formatCurrency(invoice.totals.taxAmount)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>{formatCurrency(invoice.totals.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-green-600">
                <span>Terbayar</span>
                <span>{formatCurrency(invoice.totals.paidAmount)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold text-red-600">
                <span>Sisa</span>
                <span>{formatCurrency(invoice.totals.outstandingAmount)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <Dialog open={isServiceDialogOpen} onOpenChange={setIsServiceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Layanan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Layanan</Label>
              <Select
                value={serviceForm.serviceId}
                onValueChange={(value) => {
                  const product = serviceProducts?.find((p) => p._id === value);
                  setServiceForm({
                    ...serviceForm,
                    serviceId: value,
                    unitPrice: product?.sellingPrice || 0,
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih layanan" />
                </SelectTrigger>
                <SelectContent>
                  {serviceProducts?.map((product) => (
                    <SelectItem key={product._id} value={product._id}>
                      {product.name} - {formatCurrency(product.sellingPrice)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tanggal</Label>
                <Input
                  type="date"
                  value={serviceForm.serviceDate}
                  onChange={(e) =>
                    setServiceForm({ ...serviceForm, serviceDate: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Qty</Label>
                <Input
                  type="number"
                  value={serviceForm.quantity}
                  onChange={(e) =>
                    setServiceForm({
                      ...serviceForm,
                      quantity: parseInt(e.target.value) || 1,
                    })
                  }
                  min="1"
                />
              </div>
            </div>
            <div>
              <Label>Harga</Label>
              <Input
                type="number"
                value={serviceForm.unitPrice}
                onChange={(e) =>
                  setServiceForm({
                    ...serviceForm,
                    unitPrice: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsServiceDialogOpen(false)}
            >
              Batal
            </Button>
            <Button onClick={handleAddService}>Tambah</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isConsumableDialogOpen}
        onOpenChange={setIsConsumableDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Konsumsi</DialogTitle>
            <DialogDescription>
              Stok akan langsung dikurangi
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Produk</Label>
              <Select
                value={consumableForm.productId}
                onValueChange={(value) =>
                  setConsumableForm({ ...consumableForm, productId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih produk" />
                </SelectTrigger>
                <SelectContent>
                  {consumableProducts?.map((product) => (
                    <SelectItem key={product._id} value={product._id}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tanggal</Label>
                <Input
                  type="date"
                  value={consumableForm.consumptionDate}
                  onChange={(e) =>
                    setConsumableForm({
                      ...consumableForm,
                      consumptionDate: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <Label>Qty</Label>
                <Input
                  type="number"
                  value={consumableForm.quantity}
                  onChange={(e) =>
                    setConsumableForm({
                      ...consumableForm,
                      quantity: parseFloat(e.target.value) || 0,
                    })
                  }
                  step="0.1"
                  min="0"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsConsumableDialogOpen(false)}
            >
              Batal
            </Button>
            <Button onClick={handleAddConsumable}>Tambah</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Pembayaran</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Jumlah</Label>
              <Input
                type="number"
                value={paymentForm.amount}
                onChange={(e) =>
                  setPaymentForm({
                    ...paymentForm,
                    amount: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>
            <div>
              <Label>Metode Pembayaran</Label>
              <Select
                value={paymentForm.paymentMethod}
                onValueChange={(value: any) =>
                  setPaymentForm({ ...paymentForm, paymentMethod: value })
                }
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
            {paymentForm.paymentMethod !== "CASH" && (
              <div>
                <Label>No. Referensi</Label>
                <Input
                  value={paymentForm.referenceNumber}
                  onChange={(e) =>
                    setPaymentForm({
                      ...paymentForm,
                      referenceNumber: e.target.value,
                    })
                  }
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsPaymentDialogOpen(false)}
            >
              Batal
            </Button>
            <Button onClick={handleAddPayment}>Tambah</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCheckoutDialogOpen} onOpenChange={setIsCheckoutDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Check-out</DialogTitle>
            <DialogDescription>
              Proses pembayaran final dan check-out
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Ringkasan Biaya</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span>Total</span>
                  <span className="font-bold">
                    {formatCurrency(booking.totalAmount)}
                  </span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>Sudah Dibayar</span>
                  <span>{formatCurrency(booking.paidAmount)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-red-600">
                  <span>Sisa yang Harus Dibayar</span>
                  <span>{formatCurrency(booking.outstandingAmount)}</span>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-2">
              <Label>Tambah Pembayaran</Label>
              <div className="grid grid-cols-3 gap-2">
                <Input
                  type="number"
                  placeholder="Jumlah"
                  value={paymentForm.amount}
                  onChange={(e) =>
                    setPaymentForm({
                      ...paymentForm,
                      amount: parseFloat(e.target.value) || 0,
                    })
                  }
                />
                <Select
                  value={paymentForm.paymentMethod}
                  onValueChange={(value: any) =>
                    setPaymentForm({ ...paymentForm, paymentMethod: value })
                  }
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
                <Button
                  onClick={() => {
                    if (paymentForm.amount > 0) {
                      setCheckoutPayments([...checkoutPayments, paymentForm]);
                      setPaymentForm({
                        amount: 0,
                        paymentMethod: "CASH",
                        referenceNumber: "",
                        notes: "",
                      });
                    }
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {checkoutPayments.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Pembayaran Baru</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableBody>
                      {checkoutPayments.map((payment, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{payment.paymentMethod}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(payment.amount)}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setCheckoutPayments(
                                  checkoutPayments.filter((_, i) => i !== idx)
                                )
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="mt-4 flex justify-between font-bold">
                    <span>Total Pembayaran Baru</span>
                    <span>
                      {formatCurrency(
                        checkoutPayments.reduce((sum, p) => sum + p.amount, 0)
                      )}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCheckoutDialogOpen(false);
                setCheckoutPayments([]);
              }}
            >
              Batal
            </Button>
            <Button onClick={handleCheckout}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Proses Check-out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

