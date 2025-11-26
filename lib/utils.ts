import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

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

export function parseErrorMessage(error: any): string {
  const defaultMessage = "Terjadi kesalahan";
  if (!error) return defaultMessage;

  let message = error.message || defaultMessage;

  try {
    // Check for JSON pattern in the message
    const jsonStartIndex = message.indexOf('{"code"');
    if (jsonStartIndex !== -1) {
      const jsonString = message.substring(jsonStartIndex);
      const errorData = JSON.parse(jsonString);

      if (errorData.userMessage) {
        // Extract prefix if any (e.g. "Product Name: ")
        const prefix = message.substring(0, jsonStartIndex).trim();
        const cleanPrefix = prefix
          .replace(/Server Error/g, "")
          .replace(/Uncaught Error/g, "")
          .replace(/^:\s*/, "")
          .replace(/:\s*$/, "")
          .trim();

        if (cleanPrefix) {
          return `${cleanPrefix}: ${errorData.userMessage}`;
        } else {
          return errorData.userMessage;
        }
      }
    }
  } catch (e) {
    // Parsing failed, return original message
  }

  return message;
}
