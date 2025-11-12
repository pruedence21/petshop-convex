"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Eye, Calendar } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useRouter } from "next/navigation";

export default function HotelBookingsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedBranch, setSelectedBranch] = useState<string>("all");

  const bookings = useQuery(api.hotelBookings.list, {
    status: selectedStatus !== "all" ? selectedStatus : undefined,
    branchId: selectedBranch !== "all" ? (selectedBranch as Id<"branches">) : undefined,
  });
  const branches = useQuery(api.branches.list, { includeInactive: false });
  const customers = useQuery(api.customers.list, { includeInactive: false });
  const pets = useQuery(api.customerPets.list, {});
  const rooms = useQuery(api.hotelRooms.list, {});

  const filteredBookings = bookings?.filter(
    (booking) =>
      booking.bookingNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  const calculateDuration = (checkIn: number, checkOut: number) => {
    const diffMs = checkOut - checkIn;
    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return days;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Booking Hotel</h1>
          <p className="text-muted-foreground">
            Kelola reservasi dan transaksi pet hotel
          </p>
        </div>
        <Button onClick={() => router.push("/dashboard/hotel/bookings/new")}>
          <Plus className="mr-2 h-4 w-4" />
          Buat Booking
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari nomor booking..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedBranch} onValueChange={setSelectedBranch}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Semua Cabang" />
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
        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Semua Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="Reserved">Dipesan</SelectItem>
            <SelectItem value="CheckedIn">Check-in</SelectItem>
            <SelectItem value="CheckedOut">Selesai</SelectItem>
            <SelectItem value="Cancelled">Dibatalkan</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>No. Booking</TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Pet</TableHead>
              <TableHead>Kandang</TableHead>
              <TableHead>Durasi</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Terbayar</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!filteredBookings && (
              <TableRow>
                <TableCell colSpan={10} className="text-center">
                  Loading...
                </TableCell>
              </TableRow>
            )}
            {filteredBookings && filteredBookings.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="text-center">
                  Tidak ada booking
                </TableCell>
              </TableRow>
            )}
            {filteredBookings?.map((booking) => {
              const customer = customers?.find(
                (c) => c._id === booking.customerId
              );
              const pet = pets?.find((p) => p._id === booking.petId);
              const room = rooms?.find((r) => r._id === booking.roomId);

              return (
                <TableRow key={booking._id}>
                  <TableCell className="font-medium">
                    {booking.bookingNumber}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>Check-in: {formatDate(booking.checkInDate)}</div>
                      <div className="text-muted-foreground">
                        Check-out: {formatDate(booking.checkOutDate)}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{customer?.name || "-"}</TableCell>
                  <TableCell>{pet?.name || "-"}</TableCell>
                  <TableCell>{room?.name || "-"}</TableCell>
                  <TableCell>{booking.numberOfDays} hari</TableCell>
                  <TableCell>{formatCurrency(booking.totalAmount)}</TableCell>
                  <TableCell>{formatCurrency(booking.paidAmount)}</TableCell>
                  <TableCell>{getStatusBadge(booking.status)}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        router.push(
                          `/dashboard/hotel/bookings/${booking._id}`
                        )
                      }
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
