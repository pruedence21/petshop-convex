// Structured error mapping utilities.
// Convex mutations should throw domain-specific codes; UI maps them to messages.

export type DomainErrorCode =
  | "SKU_EXISTS"
  | "INVALID_QUANTITY"
  | "NOT_FOUND"
  | "CONFLICT_STATE"
  | "VALIDATION"
  | "STATUS_CONFLICT"
  | "NO_ITEMS"
  | "PAYMENT_EXCEEDS_TOTAL"
  | "INSUFFICIENT_STOCK"
  | "DUPLICATE_ENTRY";

export interface DomainErrorShape {
  code: DomainErrorCode;
  message: string; // Developer oriented
  userMessage?: string; // UI friendly text (can be localized)
  details?: Record<string, any>;
}

export function toUserMessage(code: DomainErrorCode): string {
  switch (code) {
    case "SKU_EXISTS":
      return "SKU sudah digunakan";
    case "INVALID_QUANTITY":
      return "Jumlah tidak valid";
    case "NOT_FOUND":
      return "Data tidak ditemukan";
    case "CONFLICT_STATE":
    case "STATUS_CONFLICT":
      return "Status tidak dapat diubah";
    case "VALIDATION":
      return "Input tidak valid";
    case "NO_ITEMS":
      return "Tidak ada item dalam transaksi";
    case "PAYMENT_EXCEEDS_TOTAL":
      return "Total pembayaran melebihi total transaksi";
    case "INSUFFICIENT_STOCK":
      return "Stok tidak mencukupi";
    case "DUPLICATE_ENTRY":
      return "Data sudah ada";
    default:
      return "Terjadi kesalahan";
  }
}

export function buildError(partial: Omit<DomainErrorShape, "userMessage">): DomainErrorShape {
  return { ...partial, userMessage: toUserMessage(partial.code) };
}
