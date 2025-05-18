import { Currency } from "@/lib/constants";
import { getCurrencySymbol } from "@/lib/utils";

/**
 * Formats a date string for display in documents
 */
export function formatDateForDisplay(dateString: string | Date): string {
  const date = typeof dateString === "string" ? new Date(dateString) : dateString;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Formats a currency value for display in documents
 */
export function formatCurrencyForDisplay(
  amount: number, 
  currency: Currency
): string {
  const symbol = getCurrencySymbol(currency);
  
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount).replace(/^/, symbol);
}

/**
 * Returns common styles for document definitions
 */
export function getCommonStyles() {
  return {
    header: {
      fontSize: 20,
      bold: true,
      color: "#4f46e5",
      margin: [0, 0, 0, 10],
    },
    subheader: {
      fontSize: 14,
      bold: true,
      margin: [0, 10, 0, 5],
    },
    tableHeader: {
      bold: true,
      fontSize: 11,
      color: "#4f46e5",
      fillColor: "#f9fafb",
    },
    lineItem: {
      fontSize: 10,
    },
    totals: {
      alignment: "right",
    },
    totalAmount: {
      fontSize: 12,
      bold: true,
    },
    notes: {
      fontSize: 10,
      italics: true,
      color: "#6b7280",
    },
    footer: {
      fontSize: 8,
      color: "#9ca3af",
      alignment: "center",
    },
  };
}