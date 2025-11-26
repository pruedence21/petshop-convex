"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Search,
  Eye,
  Calendar,
  CheckCircle2,
  LogOut,
  LogIn,
  Clock,
  MoreHorizontal,
  XCircle,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function HotelBookingsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("active");
  const [selectedBranch, setSelectedBranch] = useState<string>("all");

  const bookings = useQuery(api.hotel.hotelBookings.list, {
    branchId: selectedBranch !== "all" ? (selectedBranch as Id<"branches">) : undefined,
  });
  const branches = useQuery(api.master_data.branches.list, { includeInactive: false });
  const customers = useQuery(api.master_data.customers.list, { includeInactive: false });
  const pets = useQuery(api.master_data.customerPets.list, {});
  const rooms = useQuery(api.hotel.hotelRooms.list, {});

  // Helper to check if date is today
  const isToday = (timestamp: number) => {
    const date = new Date(timestamp);
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  // Filter logic based on Tab
  const filteredBookings = bookings?.filter((booking) => {
    const matchesSearch = booking.bookingNumber.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

    if (activeTab === "active") return booking.status === "CheckedIn";
    if (activeTab === "upcoming") return booking.status === "Reserved";
    if (activeTab === "history") return booking.status === "CheckedOut" || booking.status === "Cancelled";
    
    return true;
  });

  // Stats Calculation
  const stats = {
    activeGuests: bookings?.filter(b => b.status === "CheckedIn").length || 0,
    checkInsToday: bookings?.filter(b => b.status === "Reserved" && isToday(b.checkInDate)).length || 0,
    checkOutsToday: bookings?.filter(b => b.status === "CheckedIn" && isToday(b.checkOutDate)).length || 0,
    upcoming: bookings?.filter(b => b.status === "Reserved").length || 0,
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      Reserved: "secondary",
      CheckedIn: "default",
      CheckedOut: "outline",
      Cancelled: "destructive",
    };
    
    const labels: Record<string, string> = {
      Reserved: "Dipesan",
      CheckedIn: "Check-in",
      CheckedOut: "Selesai",
      Cancelled: "Dibatalkan",
    };

    return (
      <Badge variant={variants[status] || "default"}>
        {labels[status] || status}
      </Badge>
    );
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Booking Hotel</h1>
          <p className="text-muted-foreground mt-1">
            Kelola reservasi, check-in, dan check-out tamu hotel
          </p>
        </div>
        <Button onClick={() => router.push("/dashboard/hotel/bookings/new")} size="lg" className="shadow-sm">
          <Plus className="mr-2 h-4 w-4" />
          Buat Booking
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-800">Tamu Aktif</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">{stats.activeGuests}</div>
            <p className="text-xs text-blue-600 mt-1">Sedang menginap</p>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-800">Check-in Hari Ini</CardTitle>
            <LogIn className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900">{stats.checkInsToday}</div>
            <p className="text-xs text-green-600 mt-1">Jadwal masuk hari ini</p>
          </CardContent>
        </Card>
        <Card className="bg-orange-50 border-orange-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-800">Check-out Hari Ini</CardTitle>
            <LogOut className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-900">{stats.checkOutsToday}</div>
            <p className="text-xs text-orange-600 mt-1">Jadwal keluar hari ini</p>
          </CardContent>
        </Card>
        <Card className="bg-purple-50 border-purple-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-800">Reservasi Mendatang</CardTitle>
            <Calendar className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900">{stats.upcoming}</div>
            <p className="text-xs text-purple-600 mt-1">Booking belum check-in</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Tabs */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
            <TabsList>
              <TabsTrigger value="active">Aktif (Check-in)</TabsTrigger>
              <TabsTrigger value="upcoming">Akan Datang</TabsTrigger>
              <TabsTrigger value="history">Riwayat</TabsTrigger>
              <TabsTrigger value="all">Semua</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cari booking..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-background"
              />
            </div>
            <Select value={selectedBranch} onValueChange={setSelectedBranch}>
              <SelectTrigger className="w-[180px]">
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
          </div>
        </div>

        {/* Bookings Table */}
        <div className="rounded-md border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Booking Info</TableHead>
                <TableHead>Tamu (Pet & Owner)</TableHead>
                <TableHead>Kandang</TableHead>
                <TableHead>Jadwal</TableHead>
                <TableHead>Pembayaran</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!filteredBookings && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Loading data...
                  </TableCell>
                </TableRow>
              )}
              {filteredBookings && filteredBookings.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <Calendar className="h-12 w-12 mb-4 opacity-20" />
                      <p>Tidak ada data booking ditemukan</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {filteredBookings?.map((booking) => {
                const customer = customers?.find((c) => c._id === booking.customerId);
                const pet = pets?.find((p) => p._id === booking.petId);
                const room = rooms?.find((r) => r._id === booking.roomId);

                return (
                  <TableRow key={booking._id} className="group">
                    <TableCell>
                      <div className="font-medium">{booking.bookingNumber}</div>
                      <div className="text-xs text-muted-foreground">
                        {booking.numberOfDays} Hari
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{pet?.name || "-"}</div>
                      <div className="text-xs text-muted-foreground">
                        {customer?.name || "-"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal">
                        {room?.code || "-"}
                      </Badge>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {room?.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm space-y-1">
                        <div className="flex items-center gap-2">
                          <LogIn className="h-3 w-3 text-green-600" />
                          <span className="text-xs">{formatDate(booking.checkInDate)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <LogOut className="h-3 w-3 text-orange-600" />
                          <span className="text-xs">{formatDate(booking.checkOutDate)}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{formatCurrency(booking.totalAmount)}</div>
                      <div className={`text-xs ${booking.outstandingAmount > 0 ? "text-red-500" : "text-green-600"}`}>
                        {booking.outstandingAmount > 0 
                          ? `Sisa: ${formatCurrency(booking.outstandingAmount)}`
                          : "Lunas"}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(booking.status)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => router.push(`/dashboard/hotel/bookings/${booking._id}`)}>
                            <Eye className="mr-2 h-4 w-4" /> Detail
                          </DropdownMenuItem>
                          {booking.status === "Reserved" && (
                            <DropdownMenuItem onClick={() => router.push(`/dashboard/hotel/bookings/${booking._id}/check-in`)}>
                              <LogIn className="mr-2 h-4 w-4 text-green-600" /> Check-in
                            </DropdownMenuItem>
                          )}
                          {booking.status === "CheckedIn" && (
                            <DropdownMenuItem onClick={() => router.push(`/dashboard/hotel/bookings/${booking._id}/check-out`)}>
                              <LogOut className="mr-2 h-4 w-4 text-orange-600" /> Check-out
                            </DropdownMenuItem>
                          )}
                          {booking.status === "Reserved" && (
                            <DropdownMenuItem className="text-red-600">
                              <XCircle className="mr-2 h-4 w-4" /> Batalkan
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
