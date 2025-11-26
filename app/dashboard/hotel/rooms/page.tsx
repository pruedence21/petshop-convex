"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  LayoutGrid,
  List as ListIcon,
  Dog,
  Cat,
  Bird,
  Fish,
  Home,
  Wrench,
  CheckCircle2,
  XCircle,
  MoreVertical,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

type HotelRoom = {
  _id: Id<"hotelRooms">;
  code: string;
  name: string;
  branchId: Id<"branches">;
  roomType: string;
  animalCategory: string;
  size: string;
  dailyRate: number;
  capacity: number;
  amenities: string[];
  description?: string;
  status: string;
  isActive: boolean;
};

const ROOM_TYPES = ["Cage", "Room", "Suite"];
const SIZES = ["Small", "Medium", "Large"];
const STATUSES = ["Available", "Occupied", "Reserved", "Maintenance"];
const AMENITIES_OPTIONS = [
  "AC",
  "CCTV",
  "Outdoor Access",
  "Indoor",
  "Heater",
  "Fan",
  "Toys",
  "Water Bowl",
  "Food Bowl",
];

export default function HotelRoomsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<HotelRoom | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    branchId: "" as Id<"branches"> | "",
    roomType: "Cage",
    animalCategory: "",
    size: "Medium",
    dailyRate: 0,
    capacity: 1,
    amenities: [] as string[],
    description: "",
  });

  const rooms = useQuery(api.hotel.hotelRooms.list, {});
  const branches = useQuery(api.master_data.branches.list, { includeInactive: false });
  const animalCategories = useQuery(api.clinic.animalCategories.list, {});
  const createRoom = useMutation(api.hotel.hotelRooms.create);
  const updateRoom = useMutation(api.hotel.hotelRooms.update);
  const updateRoomStatus = useMutation(api.hotel.hotelRooms.updateStatus);
  const deleteRoom = useMutation(api.hotel.hotelRooms.remove);

  const filteredRooms = rooms?.filter(
    (room) =>
      room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      room.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      room.roomType.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Summary Statistics
  const stats = {
    total: rooms?.length || 0,
    available: rooms?.filter((r) => r.status === "Available").length || 0,
    occupied: rooms?.filter((r) => r.status === "Occupied").length || 0,
    maintenance: rooms?.filter((r) => r.status === "Maintenance").length || 0,
  };

  const handleOpenDialog = (room?: HotelRoom) => {
    if (room) {
      setEditingRoom(room);
      setFormData({
        code: room.code,
        name: room.name,
        branchId: room.branchId,
        roomType: room.roomType,
        animalCategory: room.animalCategory,
        size: room.size,
        dailyRate: room.dailyRate,
        capacity: room.capacity,
        amenities: room.amenities,
        description: room.description || "",
      });
    } else {
      setEditingRoom(null);
      setFormData({
        code: "",
        name: "",
        branchId: "",
        roomType: "Cage",
        animalCategory: "",
        size: "Medium",
        dailyRate: 0,
        capacity: 1,
        amenities: [],
        description: "",
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingRoom(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.branchId) {
      toast.error("Pilih cabang");
      return;
    }

    try {
      if (editingRoom) {
        await updateRoom({
          id: editingRoom._id,
          code: formData.code,
          name: formData.name,
          branchId: formData.branchId,
          roomType: formData.roomType,
          animalCategory: formData.animalCategory,
          size: formData.size,
          dailyRate: formData.dailyRate,
          capacity: formData.capacity,
          amenities: formData.amenities,
          description: formData.description || undefined,
        });
        toast.success("Kandang berhasil diperbarui");
      } else {
        await createRoom({
          code: formData.code,
          name: formData.name,
          branchId: formData.branchId,
          roomType: formData.roomType,
          animalCategory: formData.animalCategory,
          size: formData.size,
          dailyRate: formData.dailyRate,
          capacity: formData.capacity,
          amenities: formData.amenities,
          description: formData.description || undefined,
          isActive: true,
        });
        toast.success("Kandang berhasil ditambahkan");
      }
      handleCloseDialog();
    } catch (error) {
      toast.error("Terjadi kesalahan");
      console.error(error);
    }
  };

  const handleDelete = async (id: Id<"hotelRooms">) => {
    if (confirm("Apakah Anda yakin ingin menghapus kandang ini?")) {
      try {
        await deleteRoom({ id });
        toast.success("Kandang berhasil dihapus");
      } catch (error: any) {
        toast.error(error.message || "Terjadi kesalahan");
        console.error(error);
      }
    }
  };

  const handleStatusChange = async (id: Id<"hotelRooms">, status: string) => {
    try {
      await updateRoomStatus({ id, status });
      toast.success("Status kandang diperbarui");
    } catch (error) {
      toast.error("Terjadi kesalahan");
      console.error(error);
    }
  };

  const toggleAmenity = (amenity: string) => {
    setFormData((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter((a) => a !== amenity)
        : [...prev.amenities, amenity],
    }));
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      Available: "default",
      Occupied: "destructive",
      Reserved: "secondary",
      Maintenance: "secondary",
    };
    
    const labels: Record<string, string> = {
      Available: "Tersedia",
      Occupied: "Terisi",
      Reserved: "Dipesan",
      Maintenance: "Maintenance",
    };

    return (
      <Badge variant={variants[status] || "default"}>
        {labels[status] || status}
      </Badge>
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Available": return "bg-green-500";
      case "Occupied": return "bg-red-500";
      case "Reserved": return "bg-yellow-500";
      case "Maintenance": return "bg-gray-500";
      default: return "bg-gray-500";
    }
  };

  const getAnimalIcon = (category: string) => {
    const lower = category.toLowerCase();
    if (lower.includes("anjing") || lower.includes("dog")) return <Dog className="h-4 w-4" />;
    if (lower.includes("kucing") || lower.includes("cat")) return <Cat className="h-4 w-4" />;
    if (lower.includes("burung") || lower.includes("bird")) return <Bird className="h-4 w-4" />;
    if (lower.includes("ikan") || lower.includes("fish")) return <Fish className="h-4 w-4" />;
    return <Home className="h-4 w-4" />;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Kandang Hotel</h1>
          <p className="text-muted-foreground mt-1">
            Kelola inventaris kandang dan kamar untuk layanan pet hotel
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()} size="lg" className="shadow-sm">
          <Plus className="mr-2 h-4 w-4" />
          Tambah Kandang
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4 flex items-center justify-between bg-card shadow-sm border-l-4 border-l-blue-500">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total Kandang</p>
            <h2 className="text-2xl font-bold">{stats.total}</h2>
          </div>
          <Home className="h-8 w-8 text-blue-500 opacity-20" />
        </Card>
        <Card className="p-4 flex items-center justify-between bg-card shadow-sm border-l-4 border-l-green-500">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Tersedia</p>
            <h2 className="text-2xl font-bold">{stats.available}</h2>
          </div>
          <CheckCircle2 className="h-8 w-8 text-green-500 opacity-20" />
        </Card>
        <Card className="p-4 flex items-center justify-between bg-card shadow-sm border-l-4 border-l-red-500">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Terisi</p>
            <h2 className="text-2xl font-bold">{stats.occupied}</h2>
          </div>
          <Home className="h-8 w-8 text-red-500 opacity-20" />
        </Card>
        <Card className="p-4 flex items-center justify-between bg-card shadow-sm border-l-4 border-l-gray-500">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Maintenance</p>
            <h2 className="text-2xl font-bold">{stats.maintenance}</h2>
          </div>
          <Wrench className="h-8 w-8 text-gray-500 opacity-20" />
        </Card>
      </div>

      {/* Filters and View Toggle */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-muted/20 p-4 rounded-lg border">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari kandang, kode, atau tipe..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-background"
          />
        </div>
        
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "grid" | "list")} className="w-auto">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="grid"><LayoutGrid className="h-4 w-4 mr-2" /> Grid</TabsTrigger>
            <TabsTrigger value="list"><ListIcon className="h-4 w-4 mr-2" /> List</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Content Area */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredRooms?.map((room) => (
            <Card key={room._id} className="overflow-hidden transition-all hover:shadow-md group">
              <div className={`h-2 w-full ${getStatusColor(room.status)}`} />
              <CardHeader className="pb-2 flex flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    {room.code}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">{room.name}</p>
                </div>
                <Badge variant="outline" className="flex items-center gap-1">
                  {getAnimalIcon(room.animalCategory)}
                  {room.animalCategory}
                </Badge>
              </CardHeader>
              <CardContent className="pb-2">
                <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                  <div className="text-muted-foreground">Tipe: <span className="font-medium text-foreground">{room.roomType}</span></div>
                  <div className="text-muted-foreground">Ukuran: <span className="font-medium text-foreground">{room.size}</span></div>
                  <div className="text-muted-foreground">Kap: <span className="font-medium text-foreground">{room.capacity} ekor</span></div>
                  <div className="text-muted-foreground">Tarif: <span className="font-medium text-foreground">{formatCurrency(room.dailyRate)}</span></div>
                </div>
                
                {room.amenities.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {room.amenities.slice(0, 3).map((a, i) => (
                      <span key={i} className="text-[10px] bg-secondary px-1.5 py-0.5 rounded text-secondary-foreground">
                        {a}
                      </span>
                    ))}
                    {room.amenities.length > 3 && (
                      <span className="text-[10px] bg-secondary px-1.5 py-0.5 rounded text-secondary-foreground">
                        +{room.amenities.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </CardContent>
              <CardFooter className="pt-2 flex items-center justify-between border-t bg-muted/10">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${getStatusColor(room.status)}`} />
                  <span className="text-sm font-medium">{
                    room.status === "Available" ? "Tersedia" : 
                    room.status === "Occupied" ? "Terisi" :
                    room.status === "Reserved" ? "Dipesan" : "Maintenance"
                  }</span>
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleOpenDialog(room)}>
                      <Pencil className="mr-2 h-4 w-4" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDelete(room._id)} className="text-red-600">
                      <Trash2 className="mr-2 h-4 w-4" /> Hapus
                    </DropdownMenuItem>
                    <div className="border-t my-1" />
                    <DropdownMenuItem disabled className="text-xs text-muted-foreground">Ubah Status:</DropdownMenuItem>
                    {STATUSES.map((s) => (
                      <DropdownMenuItem 
                        key={s} 
                        onClick={() => handleStatusChange(room._id, s)}
                        className={room.status === s ? "bg-accent" : ""}
                      >
                        {s}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardFooter>
            </Card>
          ))}
          {!filteredRooms && <div className="col-span-full text-center p-8">Loading...</div>}
          {filteredRooms && filteredRooms.length === 0 && (
            <div className="col-span-full text-center p-12 border rounded-lg border-dashed">
              <Home className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-4" />
              <h3 className="text-lg font-medium">Tidak ada kandang ditemukan</h3>
              <p className="text-muted-foreground">Coba ubah kata kunci pencarian atau tambah kandang baru.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kode</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Ukuran</TableHead>
                <TableHead>Kapasitas</TableHead>
                <TableHead>Tarif/Hari</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRooms?.map((room) => (
                <TableRow key={room._id}>
                  <TableCell className="font-medium">{room.code}</TableCell>
                  <TableCell>{room.name}</TableCell>
                  <TableCell>{room.roomType}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {getAnimalIcon(room.animalCategory)}
                      {room.animalCategory}
                    </div>
                  </TableCell>
                  <TableCell>{room.size}</TableCell>
                  <TableCell>{room.capacity}</TableCell>
                  <TableCell>{formatCurrency(room.dailyRate)}</TableCell>
                  <TableCell>
                    <Select
                      value={room.status}
                      onValueChange={(value) =>
                        handleStatusChange(room._id, value)
                      }
                    >
                      <SelectTrigger className="w-32 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status === "Available"
                              ? "Tersedia"
                              : status === "Occupied"
                              ? "Terisi"
                              : status === "Reserved"
                              ? "Dipesan"
                              : "Maintenance"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialog(room)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(room._id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredRooms && filteredRooms.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    Tidak ada kandang
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRoom ? "Edit Kandang" : "Tambah Kandang"}
            </DialogTitle>
            <DialogDescription>
              {editingRoom
                ? "Perbarui informasi kandang"
                : "Tambahkan kandang baru untuk pet hotel"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">Kode Kandang</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value })
                  }
                  placeholder="ROOM-A1"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Nama Kandang</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Room A1 - Large Dog"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="branchId">Cabang</Label>
                <Select
                  value={formData.branchId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, branchId: value as Id<"branches"> })
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
              <div className="space-y-2">
                <Label htmlFor="roomType">Tipe Kandang</Label>
                <Select
                  value={formData.roomType}
                  onValueChange={(value) =>
                    setFormData({ ...formData, roomType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROOM_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="animalCategory">Kategori Hewan</Label>
                <Select
                  value={formData.animalCategory}
                  onValueChange={(value) =>
                    setFormData({ ...formData, animalCategory: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    {animalCategories?.map((cat) => (
                      <SelectItem key={cat._id} value={cat.name}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="size">Ukuran</Label>
                <Select
                  value={formData.size}
                  onValueChange={(value) =>
                    setFormData({ ...formData, size: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SIZES.map((size) => (
                      <SelectItem key={size} value={size}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dailyRate">Tarif per Hari (Rp)</Label>
                <Input
                  id="dailyRate"
                  type="number"
                  value={formData.dailyRate}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      dailyRate: parseFloat(e.target.value) || 0,
                    })
                  }
                  min="0"
                  step="1000"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="capacity">Kapasitas (jumlah hewan)</Label>
                <Input
                  id="capacity"
                  type="number"
                  value={formData.capacity}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      capacity: parseInt(e.target.value) || 1,
                    })
                  }
                  min="1"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Fasilitas</Label>
              <div className="grid grid-cols-3 gap-2">
                {AMENITIES_OPTIONS.map((amenity) => (
                  <button
                    key={amenity}
                    type="button"
                    onClick={() => toggleAmenity(amenity)}
                    className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                      formData.amenities.includes(amenity)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background hover:bg-accent"
                    }`}
                  >
                    {amenity}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Deskripsi (Opsional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Deskripsi tambahan tentang kandang"
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseDialog}
              >
                Batal
              </Button>
              <Button type="submit">
                {editingRoom ? "Perbarui" : "Tambah"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

