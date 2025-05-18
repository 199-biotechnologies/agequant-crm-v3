import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { Currency } from "./constants"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Returns the currency symbol for a given currency code
 * 
 * @param currency Currency code
 * @returns Currency symbol
 */
export function getCurrencySymbol(currency: Currency): string {
  const symbols: Partial<Record<Currency, string>> = {
    USD: "$",
    EUR: "€",
    GBP: "£",
    JPY: "¥",
    AUD: "A$",
    CAD: "C$",
    CHF: "CHF",
    CNY: "¥",
    SGD: "S$",
    HKD: "HK$",
    NZD: "NZ$"
  }
  
  return symbols[currency] || "$"
}
