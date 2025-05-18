/**
 * Utilities for financial documents (invoices and quotes)
 * This centralizes the calculation logic and utilities that are common
 * to both invoices and quotes to avoid duplication.
 */

import type { 
  LineItemFormValues, 
  InvoiceFormValues, 
  QuoteFormValues 
} from "@/lib/schemas/financial-documents";
import { Currency } from "@/lib/constants";

/**
 * Calculates the total amount for a line item
 *
 * @param quantity - Quantity of items
 * @param unitPrice - Price per unit
 * @returns Total amount for the line item
 */
export function calculateLineItemTotal(
  quantity: number, 
  unitPrice: number
): number {
  return quantity * unitPrice;
}

/**
 * Calculates subtotal from line items
 * 
 * @param lineItems - Array of line items
 * @returns Subtotal amount
 */
export function calculateSubtotal(lineItems: LineItemFormValues[]): number {
  return lineItems.reduce(
    (sum, item) => sum + calculateLineItemTotal(item.quantity, item.unitPrice),
    0
  );
}

/**
 * Calculates tax amount
 * 
 * @param amount - Amount to calculate tax on
 * @param taxPercentage - Tax percentage (0-100)
 * @returns Tax amount
 */
export function calculateTax(amount: number, taxPercentage: number): number {
  return amount * (taxPercentage / 100);
}

/**
 * Calculates discount amount
 * 
 * @param amount - Amount to calculate discount on
 * @param discountPercentage - Discount percentage (0-100)
 * @returns Discount amount
 */
export function calculateDiscount(amount: number, discountPercentage: number): number {
  return amount * (discountPercentage / 100);
}

/**
 * Calculates all totals for an invoice
 * 
 * @param data - Invoice form data
 * @returns Object containing calculated totals
 */
export function calculateInvoiceTotals(data: InvoiceFormValues) {
  const subtotal = calculateSubtotal(data.lineItems);
  const taxAmount = calculateTax(subtotal, data.taxPercent);
  const totalAmount = subtotal + taxAmount;

  return {
    subtotalAmount: subtotal,
    taxAmount,
    totalAmount
  };
}

/**
 * Calculates all totals for a quote
 * 
 * @param data - Quote form data
 * @returns Object containing calculated totals
 */
export function calculateQuoteTotals(data: QuoteFormValues) {
  const subtotal = calculateSubtotal(data.lineItems);
  const discountAmount = calculateDiscount(subtotal, data.discountPercent || 0);
  const taxableAmount = subtotal - discountAmount;
  const taxAmount = calculateTax(taxableAmount, data.taxPercent);
  const totalAmount = taxableAmount + taxAmount;

  return {
    subtotalAmount: subtotal,
    discountAmount,
    taxAmount,
    totalAmount
  };
}

/**
 * Extracts and parses line items from form data
 * Handles both string JSON and array formats for backwards compatibility
 * 
 * @param formData - Raw form data object
 * @returns Array of parsed line items
 */
export function extractLineItemsFromFormData(formData: Record<string, any>): any[] {
  if (typeof formData.lineItems === 'string') {
    try {
      const parsed = JSON.parse(formData.lineItems);
      if (Array.isArray(parsed)) {
        return parsed;
      }
      throw new Error("Parsed lineItems is not an array.");
    } catch (e) {
      console.error("Failed to parse lineItems JSON:", e);
      return [];
    }
  } else if (Array.isArray(formData.lineItems)) {
    return formData.lineItems;
  }
  return [];
}

/**
 * Format currency amount for display
 * 
 * @param amount - Numeric amount
 * @param currency - Currency code
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number, currency: Currency): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

/**
 * Format date for display
 * 
 * @param dateString - Date string
 * @returns Formatted date string
 */
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Convert date to ISO string format for database
 * 
 * @param dateString - Date string
 * @returns ISO date string
 */
export function toISODate(dateString: string): string {
  return new Date(dateString).toISOString();
}