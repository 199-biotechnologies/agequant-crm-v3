/**
 * Shared constants for the AgeQuant CRM application
 */

/**
 * Allowed currencies for the application
 */
export const ALLOWED_CURRENCIES = [
  'USD', 'GBP', 'EUR', 'CHF', 'SGD', 'HKD',
  'CNY', 'JPY', 'CAD', 'AUD', 'NZD'
] as const;

/**
 * Type representation of allowed currencies
 */
export type Currency = typeof ALLOWED_CURRENCIES[number];

/**
 * Units of measurement for products
 */
export const PRODUCT_UNITS = [
  'pc', 'box', 'kit', 'kg', 'hr'
] as const;

/**
 * Type representation of product units
 */
export type ProductUnit = typeof PRODUCT_UNITS[number];

/**
 * Product status options
 */
export const PRODUCT_STATUSES = [
  'Active', 'Inactive'
] as const;

/**
 * Type representation of product statuses
 */
export type ProductStatus = typeof PRODUCT_STATUSES[number];

/**
 * Invoice status options
 */
export const INVOICE_STATUSES = [
  'Draft', 'Sent', 'Paid', 'Overdue', 'Cancelled'
] as const;

/**
 * Type representation of invoice statuses
 */
export type InvoiceStatus = typeof INVOICE_STATUSES[number];

/**
 * Quote status options
 */
export const QUOTE_STATUSES = [
  'Draft', 'Sent', 'Accepted', 'Rejected', 'Expired'
] as const;

/**
 * Type representation of quote statuses
 */
export type QuoteStatus = typeof QUOTE_STATUSES[number];