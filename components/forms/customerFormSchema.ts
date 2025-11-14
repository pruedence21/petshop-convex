// Customer form schema for useFormSchema
// This demonstrates the pattern for refactoring forms to use schema-driven validation

import { SchemaDefinition } from "@/components/forms/useFormSchema";

export type CustomerFormData = {
  code: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  dateOfBirth: string;
  gender: string;
  idNumber: string;
  notes: string;
};

export const customerFormSchema: SchemaDefinition<CustomerFormData> = {
  code: {
    label: "Kode Pelanggan",
    required: true,
    parse: (v) => String(v || "").toUpperCase(),
    validate: (v) => {
      if (!v || v.length < 3) return "Kode minimal 3 karakter";
      if (!/^[A-Z0-9]+$/.test(v)) return "Kode hanya boleh huruf dan angka";
      return null;
    },
    defaultValue: "",
  },
  name: {
    label: "Nama Lengkap",
    required: true,
    parse: (v) => String(v || "").trim(),
    validate: (v) => {
      if (!v || v.length < 2) return "Nama minimal 2 karakter";
      return null;
    },
    defaultValue: "",
  },
  phone: {
    label: "Telepon",
    required: true,
    parse: (v) => String(v || "").replace(/\D/g, ""),
    validate: (v) => {
      if (!v || v.length < 10) return "Nomor telepon minimal 10 digit";
      if (!/^[0-9]+$/.test(v)) return "Nomor telepon hanya boleh angka";
      return null;
    },
    defaultValue: "",
  },
  email: {
    label: "Email",
    parse: (v) => String(v || "").toLowerCase().trim(),
    validate: (v) => {
      if (v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
        return "Format email tidak valid";
      }
      return null;
    },
    defaultValue: "",
  },
  address: {
    label: "Alamat",
    parse: (v) => String(v || "").trim(),
    validate: () => null,
    defaultValue: "",
  },
  city: {
    label: "Kota",
    parse: (v) => String(v || "").trim(),
    validate: () => null,
    defaultValue: "",
  },
  province: {
    label: "Provinsi",
    parse: (v) => String(v || "").trim(),
    validate: () => null,
    defaultValue: "",
  },
  postalCode: {
    label: "Kode Pos",
    parse: (v) => String(v || "").replace(/\D/g, ""),
    validate: (v) => {
      if (v && v.length !== 5) return "Kode pos harus 5 digit";
      return null;
    },
    defaultValue: "",
  },
  dateOfBirth: {
    label: "Tanggal Lahir",
    parse: (v) => String(v || ""),
    validate: () => null,
    defaultValue: "",
  },
  gender: {
    label: "Jenis Kelamin",
    parse: (v) => String(v || ""),
    validate: () => null,
    defaultValue: "",
  },
  idNumber: {
    label: "No. KTP",
    parse: (v) => String(v || "").replace(/\D/g, ""),
    validate: (v) => {
      if (v && v.length !== 16) return "No. KTP harus 16 digit";
      return null;
    },
    defaultValue: "",
  },
  notes: {
    label: "Catatan",
    parse: (v) => String(v || "").trim(),
    validate: () => null,
    defaultValue: "",
  },
};
