import { describe, it, expect } from 'vitest';
import { calculateLine, calculateTotals, formatCurrency } from '../finance';

describe('calculateLine', () => {
  it('should calculate line with quantity and unit price only', () => {
    const result = calculateLine({
      quantity: 10,
      unitPrice: 100,
      discountAmount: 0,
      discountPercent: 0,
      taxPercent: 0,
    });

    expect(result.gross).toBe(1000);
    expect(result.discountAmount).toBe(0);
    expect(result.netBeforeTax).toBe(1000);
    expect(result.taxAmount).toBe(0);
    expect(result.net).toBe(1000);
  });

  it('should calculate line with absolute discount', () => {
    const result = calculateLine({
      quantity: 10,
      unitPrice: 100,
      discountAmount: 50,
      discountPercent: 0,
      taxPercent: 0,
    });

    expect(result.gross).toBe(1000);
    expect(result.discountAmount).toBe(50);
    expect(result.netBeforeTax).toBe(950);
    expect(result.taxAmount).toBe(0);
    expect(result.net).toBe(950);
  });

  it('should calculate line with percentage discount', () => {
    const result = calculateLine({
      quantity: 10,
      unitPrice: 100,
      discountAmount: 0,
      discountPercent: 10,
      taxPercent: 0,
    });

    expect(result.gross).toBe(1000);
    expect(result.discountAmount).toBe(100); // 10% of 1000
    expect(result.netBeforeTax).toBe(900);
    expect(result.taxAmount).toBe(0);
    expect(result.net).toBe(900);
  });

  it('should calculate line with both discount types (percentage first)', () => {
    const result = calculateLine({
      quantity: 10,
      unitPrice: 100,
      discountAmount: 50,
      discountPercent: 10,
      taxPercent: 0,
    });

    expect(result.gross).toBe(1000);
    // Absolute discount first: 1000 - 50 = 950
    // Then 10% of 950 = 95
    // Total discount = 50 + 95 = 145
    expect(result.discountAmount).toBe(145);
    expect(result.netBeforeTax).toBe(855);
    expect(result.taxAmount).toBe(0);
    expect(result.net).toBe(855);
  });

  it('should calculate line with tax on net before tax', () => {
    const result = calculateLine({
      quantity: 10,
      unitPrice: 100,
      discountAmount: 0,
      discountPercent: 10,
      taxPercent: 11,
    });

    expect(result.gross).toBe(1000);
    expect(result.discountAmount).toBe(100);
    expect(result.netBeforeTax).toBe(900);
    expect(result.taxAmount).toBe(99); // 11% of 900
    expect(result.net).toBe(999);
  });

  it('should handle zero quantity', () => {
    const result = calculateLine({
      quantity: 0,
      unitPrice: 100,
      discountAmount: 0,
      discountPercent: 0,
      taxPercent: 0,
    });

    expect(result.gross).toBe(0);
    expect(result.net).toBe(0);
  });

  it('should handle negative prices correctly', () => {
    const result = calculateLine({
      quantity: 1,
      unitPrice: -100,
      discountAmount: 0,
      discountPercent: 0,
      taxPercent: 0,
    });

    expect(result.gross).toBe(-100);
    expect(result.net).toBe(-100);
  });

  it('should round to 2 decimal places', () => {
    const result = calculateLine({
      quantity: 3,
      unitPrice: 10.333,
      discountAmount: 0,
      discountPercent: 10,
      taxPercent: 11,
    });

    // quantity = floor(3) = 3
    // gross = 3 * 10.33 (rounded) = 30.99
    expect(result.gross).toBe(30.99);
    // 10% discount of 30.99 = 3.10
    expect(result.discountAmount).toBe(3.1);
    // netBeforeTax = 30.99 - 3.10 = 27.89
    expect(result.netBeforeTax).toBe(27.89);
    // tax = 27.89 * 0.11 = 3.07
    expect(result.taxAmount).toBe(3.07);
    // net = 27.89 + 3.07 = 30.96
    expect(result.net).toBe(30.96);
  });

  it('should not allow discount to exceed gross', () => {
    const result = calculateLine({
      quantity: 10,
      unitPrice: 100,
      discountAmount: 500, // absolute
      discountPercent: 100, // 100%
      taxPercent: 0,
    });

    // gross = 1000
    // percent discount = 1000 (100%)
    // absolute discount = 500
    // total discount would be 1500, but should be capped at 1000
    expect(result.gross).toBe(1000);
    expect(result.netBeforeTax).toBe(0); // Cannot go negative
    expect(result.net).toBe(0);
  });
});

describe('calculateTotals', () => {
  it('should aggregate multiple line items', () => {
    const lines = [
      {
        quantity: 10,
        unitPrice: 100,
        discountAmount: 50,
        discountPercent: 0,
        taxPercent: 0,
      },
      {
        quantity: 5,
        unitPrice: 200,
        discountAmount: 0,
        discountPercent: 10,
        taxPercent: 0,
      },
    ];

    const result = calculateTotals(lines);

    // Line 1: gross 1000, discount 50, net 950
    // Line 2: gross 1000, discount 100, net 900
    expect(result.totalGross).toBe(2000);
    expect(result.totalDiscount).toBe(150);
    expect(result.totalNet).toBe(1850);
  });

  it('should handle empty array', () => {
    const result = calculateTotals([]);

    expect(result.totalGross).toBe(0);
    expect(result.totalDiscount).toBe(0);
    expect(result.totalTax).toBe(0);
    expect(result.totalNet).toBe(0);
  });

  it('should aggregate tax amounts correctly', () => {
    const lines = [
      {
        quantity: 10,
        unitPrice: 100,
        discountAmount: 0,
        discountPercent: 0,
        taxPercent: 11,
      },
      {
        quantity: 5,
        unitPrice: 200,
        discountAmount: 0,
        discountPercent: 0,
        taxPercent: 11,
      },
    ];

    const result = calculateTotals(lines);

    // Line 1: gross 1000, tax 110, net 1110
    // Line 2: gross 1000, tax 110, net 1110
    expect(result.totalGross).toBe(2000);
    expect(result.totalTax).toBe(220);
    expect(result.totalNet).toBe(2220);
  });
});

describe('formatCurrency', () => {
  it('should format currency with default locale (ID)', () => {
    const result = formatCurrency(1234567.89);
    expect(result).toContain('1.234.567,89');
  });

  it('should format zero', () => {
    const result = formatCurrency(0);
    expect(result).toContain('0,00');
  });

  it('should format negative numbers', () => {
    const result = formatCurrency(-1000);
    // Format includes currency symbol
    expect(result).toMatch(/-.*1\.000,00/);
  });

  it('should handle very small numbers', () => {
    const result = formatCurrency(0.01);
    expect(result).toContain('0,01');
  });

  it('should round to 2 decimals', () => {
    const result = formatCurrency(123.456);
    expect(result).toContain('123,46');
  });
});

describe('Edge cases and business rules', () => {
  it('should apply discount before tax (standard accounting practice)', () => {
    const result = calculateLine({
      quantity: 1,
      unitPrice: 1000,
      discountAmount: 0,
      discountPercent: 10,
      taxPercent: 11,
    });

    // Discount first: 1000 - 100 = 900
    // Tax on discounted amount: 900 * 0.11 = 99
    expect(result.netBeforeTax).toBe(900);
    expect(result.taxAmount).toBe(99);
    expect(result.net).toBe(999);
  });

  it('should handle 100% discount', () => {
    const result = calculateLine({
      quantity: 10,
      unitPrice: 100,
      discountAmount: 0,
      discountPercent: 100,
      taxPercent: 11,
    });

    expect(result.netBeforeTax).toBe(0);
    expect(result.taxAmount).toBe(0); // No tax on zero amount
    expect(result.net).toBe(0);
  });

  it('should handle fractional quantities', () => {
    const result = calculateLine({
      quantity: 2.5,
      unitPrice: 100,
      discountAmount: 0,
      discountPercent: 0,
      taxPercent: 0,
    });

    // Quantity is floored to 2
    expect(result.quantity).toBe(2);
    expect(result.gross).toBe(200);
    expect(result.net).toBe(200);
  });

  it('should apply percentage discount after absolute discount', () => {
    // This tests the specific order of operations in the implementation
    const result = calculateLine({
      quantity: 1,
      unitPrice: 1000,
      discountAmount: 100,
      discountPercent: 20,
      taxPercent: 0,
    });

    // Step 1: gross = 1000
    // Step 2: absolute discount = 100
    // Step 3: percent discount = 20% of (1000-100) = 180
    // Total discount = 100 + 180 = 280
    // Net = 720
    expect(result.gross).toBe(1000);
    expect(result.discountAmount).toBe(280);
    expect(result.net).toBe(720);
  });
});
