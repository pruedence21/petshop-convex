// Central enums for consistent usage across UI & Convex.
export const PaymentMethods = [
  "cash",
  "transfer",
  "debit",
  "credit",
  "ewallet",
] as const;
export type PaymentMethod = typeof PaymentMethods[number];

export const SaleStatuses = [
  "draft",
  "submitted",
  "partially_paid",
  "paid",
  "cancelled",
] as const;
export type SaleStatus = typeof SaleStatuses[number];

export const BookingStatuses = [
  "reserved",
  "checked_in",
  "in_house",
  "checked_out",
  "cancelled",
] as const;
export type BookingStatus = typeof BookingStatuses[number];

export const ClinicVisitStatuses = [
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
] as const;
export type ClinicVisitStatus = typeof ClinicVisitStatuses[number];
