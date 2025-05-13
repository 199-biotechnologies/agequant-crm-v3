/**
 * Shared schemas for financial documents (invoices and quotes)
 * This centralizes the validation logic and types that were previously
 * duplicated across invoice and quote actions files.
 */

import { z } from "zod";
import { ALLOWED_CURRENCIES, INVOICE_STATUSES, QUOTE_STATUSES } from "@/lib/constants";

/**
 * Schema for line items shared between quotes and invoices
 */
export const lineItemSchema = z.object({
  // Assuming line items from the form might not have an ID if they are new
  id: z.string().optional(), // Database ID of the line item, if exists
  productId: z.string().uuid("Invalid product ID format").min(1, "Product is required"),
  description: z.string().min(1, "Description is required").max(1000, "Description too long"),
  quantity: z.preprocess(
    (val) => (typeof val === 'string' ? parseInt(val, 10) : val),
    z.number().int().min(1, "Quantity must be at least 1")
  ),
  unitPrice: z.preprocess(
    (val) => (typeof val === 'string' ? parseFloat(val) : val),
    z.number().min(0, "Unit price cannot be negative")
  ),
  // Optional FX rate for multi-currency line items
  fxRate: z.preprocess(
    (val) => (val === '' || val === null || val === undefined) ? undefined : (typeof val === 'string' ? parseFloat(val) : val),
    z.number().min(0).optional()
  ),
});

/**
 * Type for line items based on the schema
 */
export type LineItemFormValues = z.infer<typeof lineItemSchema>;

/**
 * Base schema for shared fields between invoice and quote forms
 */
const baseDocumentSchema = z.object({
  // Using issuingEntityId to match database column name pattern (issuing_entity_id)
  issuingEntityId: z.string().uuid("Invalid entity ID format").min(1, "Issuing Entity is required"),
  customerId: z.string().uuid("Invalid customer ID format").min(1, "Customer is required"),
  issueDate: z.string().min(1, "Issue date is required").refine(val => !isNaN(Date.parse(val)), { 
    message: "Invalid issue date" 
  }),
  currency: z.enum(ALLOWED_CURRENCIES, {
    required_error: "Currency is required",
    invalid_type_error: "Invalid currency",
  }),
  paymentSourceId: z.string().uuid("Invalid payment source ID format").min(1, "Payment source is required"),
  taxPercent: z.preprocess(
    (val) => (typeof val === 'string' ? parseFloat(val) : val),
    z.number().min(0, "Tax cannot be negative").max(100, "Tax cannot exceed 100%").default(0)
  ),
  notes: z.string().max(2000, "Notes too long").optional(),
  lineItems: z.array(lineItemSchema).min(1, "At least one line item is required"),
});

/**
 * Invoice form schema
 */
export const invoiceFormSchema = baseDocumentSchema.extend({
  dueDate: z.string().min(1, "Due date is required").refine(val => !isNaN(Date.parse(val)), { 
    message: "Invalid due date" 
  }),
  status: z.enum(INVOICE_STATUSES).optional(),
});

/**
 * Quote form schema
 */
export const quoteFormSchema = baseDocumentSchema.extend({
  expiryDate: z.string().min(1, "Expiry date is required").refine(val => !isNaN(Date.parse(val)), { 
    message: "Invalid expiry date" 
  }),
  discountPercent: z.preprocess(
    (val) => (typeof val === 'string' ? parseFloat(val) : val),
    z.number().min(0).max(100).optional().default(0)
  ),
  status: z.enum(QUOTE_STATUSES).optional(),
});

/**
 * Types for form values
 */
export type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;
export type QuoteFormValues = z.infer<typeof quoteFormSchema>;

/**
 * Database types for entities
 */
export interface DbLineItem {
  id: string;
  product_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  fx_rate?: number;
  total_amount: number;
  created_at: string;
  updated_at: string;
}

export interface DbInvoice {
  id: string;
  invoice_number: string;
  entity_id: string;
  customer_id: string;
  issue_date: string;
  due_date: string;
  currency_code: string;
  payment_source_id: string;
  tax_percentage: number;
  notes?: string;
  status: string;
  subtotal_amount: number;
  tax_amount: number;
  total_amount: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  source_quote_id?: string;
}

export interface DbQuote {
  id: string;
  quote_number: string;
  entity_id: string;
  customer_id: string;
  issue_date: string;
  expiry_date: string;
  currency_code: string;
  payment_source_id: string;
  discount_percentage: number;
  tax_percentage: number;
  notes?: string;
  status: string;
  subtotal_amount: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  converted_invoice_id?: string;
}