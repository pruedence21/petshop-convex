import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { formatErrorMessage } from "./error-handling";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(timestamp: number | undefined): string {
  if (!timestamp) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(timestamp));
}

export function formatDateTime(timestamp: number | undefined): string {
  if (!timestamp) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp));
}

export function generateCode(prefix: string, number: number): string {
  return `${prefix}${String(number).padStart(6, '0')}`;
}

/**
 * @deprecated Use formatErrorMessage from @/lib/error-handling instead
 */
export function parseErrorMessage(error: any): string {
  return formatErrorMessage(error);
}
