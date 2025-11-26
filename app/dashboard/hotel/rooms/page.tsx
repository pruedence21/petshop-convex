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
import { Plus, Pencil, Trash2, Search, DoorOpen } from "lucide-react";
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
    return (
      <Badge variant={variants[status] || "default"}>
        {status === "Available"
          ? "Tersedia"
          : status === "Occupied"
          ? "Terisi"
          : status === "Reserved"
          ? "Dipesan"
          : "Maintenance"}
      </Badge>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Kandang Hotel</h1>
          <p className="text-muted-foreground">
            Kelola kandang/kamar untuk pet hotel
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Tambah Kandang
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari kandang..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="rounded-md border">
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
              <TableHead>Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!filteredRooms && (
              <TableRow>
                <TableCell colSpan={9} className="text-center">
                  Loading...
                </TableCell>
              </TableRow>
            )}
            {filteredRooms && filteredRooms.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center">
                  Tidak ada kandang
                </TableCell>
              </TableRow>
            )}
            {filteredRooms?.map((room) => (
              <TableRow key={room._id}>
                <TableCell className="font-medium">{room.code}</TableCell>
                <TableCell>{room.name}</TableCell>
                <TableCell>{room.roomType}</TableCell>
                <TableCell>{room.animalCategory}</TableCell>
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
                    <SelectTrigger className="w-32">
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
                <TableCell>
                  <div className="flex gap-2">
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
          </TableBody>
        </Table>
      </div>

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

