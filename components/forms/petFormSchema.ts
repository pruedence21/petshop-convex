import { SchemaDefinition } from "./useFormSchema";
import { Id } from "@/convex/_generated/dataModel";

export type PetFormData = {
  customerId: string;
  name: string;
  categoryId: string;
  subcategoryId: string;
  breed: string;
  dateOfBirth: string;
  gender: string;
  weight: string;
  color: string;
  microchipNumber: string;
  notes: string;
};

export const petFormSchema: SchemaDefinition<PetFormData> = {
  customerId: {
    label: "Pemilik",
    required: true,
    parse: (value) => String(value),
    validate: (value) => {
      const id = String(value).trim();
      if (!id) {
        return "Wajib pilih pemilik";
      }
      return null;
    },
    defaultValue: "",
  },
  name: {
    label: "Nama Hewan",
    required: true,
    parse: (value) => String(value),
    validate: (value) => {
      const name = String(value).trim();
      if (name.length < 2) {
        return "Nama minimal 2 karakter";
      }
      return null;
    },
    defaultValue: "",
  },
  categoryId: {
    label: "Jenis Hewan",
    required: true,
    parse: (value) => String(value),
    validate: (value) => {
      const id = String(value).trim();
      if (!id) {
        return "Wajib pilih jenis hewan";
      }
      return null;
    },
    defaultValue: "",
  },
  subcategoryId: {
    label: "Sub Kategori",
    required: false,
    parse: (value) => String(value),
    validate: () => null,
    defaultValue: "",
  },
  breed: {
    label: "Ras",
    required: false,
    parse: (value) => String(value),
    validate: () => null,
    defaultValue: "",
  },
  dateOfBirth: {
    label: "Tanggal Lahir",
    required: false,
    parse: (value) => String(value),
    validate: () => null,
    defaultValue: "",
  },
  gender: {
    label: "Jenis Kelamin",
    required: false,
    parse: (value) => String(value),
    validate: (value) => {
      const gender = String(value).trim();
      if (gender && !["L", "P"].includes(gender)) {
        return "Pilih Jantan atau Betina";
      }
      return null;
    },
    defaultValue: "",
  },
  weight: {
    label: "Berat (kg)",
    required: false,
    parse: (value) => String(value),
    validate: (value) => {
      const weight = String(value).trim();
      if (weight && isNaN(parseFloat(weight))) {
        return "Berat harus berupa angka";
      }
      if (weight && parseFloat(weight) < 0) {
        return "Berat tidak boleh negatif";
      }
      return null;
    },
    defaultValue: "",
  },
  color: {
    label: "Warna",
    required: false,
    parse: (value) => String(value),
    validate: () => null,
    defaultValue: "",
  },
  microchipNumber: {
    label: "Nomor Microchip",
    required: false,
    parse: (value) => String(value),
    validate: () => null,
    defaultValue: "",
  },
  notes: {
    label: "Catatan",
    required: false,
    parse: (value) => String(value),
    validate: () => null,
    defaultValue: "",
  },
};
