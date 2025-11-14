// Central finance calculation utilities: discounts, taxes, totals.
// This module consolidates duplicated logic found across sales, purchases, bookings, clinic, etc.
// All monetary values are assumed to be in smallest currency unit (e.g., Rupiah integer) to avoid FP errors.
// If you pass floating numbers, they will be rounded to 2 decimals then scaled.

export type LineItemInput = {
  quantity: number; // positive integer
  unitPrice: number; // in major currency units
  discountAmount?: number; // absolute discount per line (major units)
  discountPercent?: number; // percentage discount 0-100 applied after absolute discount
  taxPercent?: number; // percentage tax 0-100 applied after discounts
};

export type NormalizedLineItem = {
  quantity: number;
  unitPrice: number; // major units
  gross: number; // quantity * unitPrice
  discountAmount: number; // absolute discount (after percent)
  percentDiscountAmount: number; // discount from percent
  netBeforeTax: number; // gross - all discounts
  taxAmount: number; // applied on netBeforeTax
  net: number; // netBeforeTax + taxAmount
};

export type TotalsResult = {
  items: NormalizedLineItem[];
  totalGross: number;
  totalDiscount: number; // absolute + percent portions aggregated
  totalTax: number;
  totalNet: number;
};

function toFixed2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function sanitizePercent(p?: number): number {
  if (p == null || isNaN(p)) return 0;
  return Math.min(100, Math.max(0, p));
}

function sanitizeMoney(m?: number): number {
  if (m == null || isNaN(m)) return 0;
  return toFixed2(m);
}

export function calculateLine(item: LineItemInput): NormalizedLineItem {
  const quantity = Math.max(0, Math.floor(item.quantity || 0));
  const unitPrice = sanitizeMoney(item.unitPrice);
  const gross = toFixed2(quantity * unitPrice);

  const absDiscount = sanitizeMoney(item.discountAmount);
  const percent = sanitizePercent(item.discountPercent);
  const percentDiscountAmount = toFixed2((gross - absDiscount) * (percent / 100));
  const discountAmount = toFixed2(absDiscount + percentDiscountAmount);
  const netBeforeTax = toFixed2(gross - discountAmount);

  const taxPercent = sanitizePercent(item.taxPercent);
  const taxAmount = toFixed2(netBeforeTax * (taxPercent / 100));
  const net = toFixed2(netBeforeTax + taxAmount);

  return {
    quantity,
    unitPrice,
    gross,
    percentDiscountAmount,
    discountAmount,
    netBeforeTax,
    taxAmount,
    net,
  };
}

export function calculateTotals(items: LineItemInput[]): TotalsResult {
  const normalized = items.map(calculateLine);
  const totalGross = toFixed2(normalized.reduce((a, i) => a + i.gross, 0));
  const totalDiscount = toFixed2(normalized.reduce((a, i) => a + i.discountAmount, 0));
  const totalTax = toFixed2(normalized.reduce((a, i) => a + i.taxAmount, 0));
  const totalNet = toFixed2(normalized.reduce((a, i) => a + i.net, 0));
  return { items: normalized, totalGross, totalDiscount, totalTax, totalNet };
}

// Helper for single-value UI summary
export function summarize(items: LineItemInput[]) {
  const { totalGross, totalDiscount, totalTax, totalNet } = calculateTotals(items);
  return { totalGross, totalDiscount, totalTax, totalNet };
}

// Currency formatting (can be replaced with i18n later)
export function formatCurrency(value: number, locale: string = 'id-ID', currency: string = 'IDR') {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value);
}
