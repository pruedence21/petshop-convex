import { FieldSchema, SchemaDefinition } from "./useFormSchema";

export type SupplierFormData = {
  code: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  paymentTerms: string;
  rating: number;
  notes: string;
};

export const supplierFormSchema: SchemaDefinition<SupplierFormData> = {
  code: {
    label: "Kode Supplier",
    required: true,
    parse: (value) => String(value).toUpperCase(),
    validate: (value) => {
      const code = String(value).trim();
      if (code.length < 3) {
        return "Kode minimal 3 karakter";
      }
      if (!/^[A-Z0-9]+$/.test(code)) {
        return "Kode hanya boleh huruf besar dan angka";
      }
      return null;
    },
    defaultValue: "",
  },
  name: {
    label: "Nama Supplier",
    required: true,
    parse: (value) => String(value),
    validate: (value) => {
      const name = String(value).trim();
      if (name.length < 3) {
        return "Nama minimal 3 karakter";
      }
      return null;
    },
    defaultValue: "",
  },
  contactPerson: {
    label: "Nama Kontak",
    required: false,
    parse: (value) => String(value),
    validate: () => null,
    defaultValue: "",
  },
  phone: {
    label: "Telepon",
    required: true,
    parse: (value) => String(value).replace(/\D/g, ""),
    validate: (value) => {
      const phone = String(value).trim();
      if (phone.length < 10) {
        return "Nomor telepon minimal 10 digit";
      }
      return null;
    },
    defaultValue: "",
  },
  email: {
    label: "Email",
    required: false,
    parse: (value) => String(value).toLowerCase().trim(),
    validate: (value) => {
      const email = String(value).trim();
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return "Format email tidak valid";
      }
      return null;
    },
    defaultValue: "",
  },
  address: {
    label: "Alamat",
    required: false,
    parse: (value) => String(value),
    validate: () => null,
    defaultValue: "",
  },
  city: {
    label: "Kota",
    required: false,
    parse: (value) => String(value),
    validate: () => null,
    defaultValue: "",
  },
  province: {
    label: "Provinsi",
    required: false,
    parse: (value) => String(value),
    validate: () => null,
    defaultValue: "",
  },
  postalCode: {
    label: "Kode Pos",
    required: false,
    parse: (value) => String(value).replace(/\D/g, ""),
    validate: (value) => {
      const postalCode = String(value).trim();
      if (postalCode && postalCode.length !== 5) {
        return "Kode pos harus 5 digit";
      }
      return null;
    },
    defaultValue: "",
  },
  paymentTerms: {
    label: "Term Pembayaran",
    required: true,
    parse: (value) => String(value),
    validate: () => null,
    defaultValue: "Net 30",
  },
  rating: {
    label: "Rating (1-5)",
    required: true,
    parse: (value) => Number(value),
    validate: (value) => {
      const rating = Number(value);
      if (rating < 1 || rating > 5) {
        return "Rating harus antara 1-5";
      }
      return null;
    },
    defaultValue: 3,
  },
  notes: {
    label: "Catatan",
    required: false,
    parse: (value) => String(value),
    validate: () => null,
    defaultValue: "",
  },
};
