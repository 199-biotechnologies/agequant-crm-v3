"use server";

import { revalidatePath } from "next/cache";
import { redirect } from 'next/navigation';
import { getServerSupabaseClient } from '@/lib/supabase/server-client';
import {
  invoiceFormSchema,
  DbInvoice,
  DbLineItem
} from '@/lib/schemas/financial-documents';
import { 
  handleValidationError, 
  handleDatabaseError, 
  ErrorResponse 
} from '@/lib/utils/error-handler';
import {
  extractLineItemsFromFormData,
  calculateInvoiceTotals,
  toISODate
} from '@/lib/utils/financial-document-utils';

// --- Shared Types for Invoice Data Structure ---
export interface DbInvoiceWithItems extends DbInvoice {
  items: DbLineItem[];
}

export interface InvoiceWithRelations extends DbInvoice {
  customer: {
    id: string;
    public_customer_id: string;
    company_contact_name: string;
  };
  entity: {
    id: string;
    name: string;
  };
  payment_source: {
    id: string;
    name: string;
  };
  items: DbLineItem[];
}

/**
 * Retrieves an invoice by its ID with all related data
 * 
 * @param id - The invoice ID (UUID)
 * @returns The invoice with its related data, or null if not found
 */
export async function getInvoiceById(id: string): Promise<InvoiceWithRelations | null> {
  if (!id) return null;

  const supabase = await getServerSupabaseClient();

  const { data: invoice, error } = await supabase
    .from('invoices')
    .select(`
      *,
      customer:customers(id, public_customer_id, company_contact_name),
      entity:issuing_entities(id, name),
      payment_source:payment_sources(id, name),
      items:invoice_items(*)
    `)
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (error || !invoice) {
    console.error('Error fetching invoice:', error);
    return null;
  }

  return invoice as unknown as InvoiceWithRelations;
}

/**
 * Creates a new invoice using the atomic transaction RPC function
 * 
 * @param formData - Form data containing invoice details
 * @returns Success or error response
 */
export async function createInvoice(formData: FormData) {
  const supabase = await getServerSupabaseClient();

  // Parse and validate form data
  try {
    // Extract and transform form data
    const rawFormData = Object.fromEntries(formData.entries());
    const lineItemsForValidation = extractLineItemsFromFormData(rawFormData);
    
    // Create a complete form data object with parsed line items
    const dataForValidation = {
      ...rawFormData,
      lineItems: lineItemsForValidation,
    };

    // Validate with Zod schema
    const validatedFields = invoiceFormSchema.safeParse(dataForValidation);
    if (!validatedFields.success) {
      return handleValidationError(validatedFields.error, 'invoice');
    }

    // Calculate totals
    const { subtotalAmount, taxAmount, totalAmount } = calculateInvoiceTotals(validatedFields.data);

    // Prepare line items in the format expected by our RPC function
    const lineItemsForDb = validatedFields.data.lineItems.map(item => ({
      product_id: item.productId,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      fx_rate: item.fxRate,
      total_amount: item.quantity * item.unitPrice
    }));

    // Call the RPC function to create the invoice with line items atomically
    const { data, error } = await supabase.rpc('create_invoice_with_items', {
      p_entity_id: validatedFields.data.issuingEntityId,
      p_customer_id: validatedFields.data.customerId,
      p_issue_date: toISODate(validatedFields.data.issueDate),
      p_due_date: toISODate(validatedFields.data.dueDate),
      p_currency_code: validatedFields.data.currency,
      p_payment_source_id: validatedFields.data.paymentSourceId,
      p_tax_percentage: validatedFields.data.taxPercent,
      p_notes: validatedFields.data.notes || null,
      p_status: 'Draft', // Default status for new invoices
      p_source_quote_id: null, // No source quote for manually created invoices
      p_subtotal_amount: subtotalAmount,
      p_tax_amount: taxAmount,
      p_total_amount: totalAmount,
      p_line_items: JSON.stringify(lineItemsForDb)
    });

    if (error || (data && !data.success)) {
      const errMessage = data?.error || error?.message || 'Failed to create invoice';
      console.error('Error creating invoice:', errMessage);
      return { error: errMessage };
    }

    // Revalidate cache and redirect
    revalidatePath('/invoices');
    redirect(`/invoices/${data.id}`);

  } catch (error) {
    console.error('Unexpected error creating invoice:', error);
    return { 
      error: 'An unexpected error occurred while creating the invoice.' 
    };
  }
}

/**
 * Updates an existing invoice using the atomic transaction RPC function
 * 
 * @param id - Invoice ID to update
 * @param formData - Form data containing updated invoice details
 * @returns Success or error response
 */
export async function updateInvoice(id: string, formData: FormData): Promise<ErrorResponse | void> {
  if (!id) {
    return { error: "Invalid invoice ID." };
  }

  const supabase = await getServerSupabaseClient();

  // Parse and validate form data (similar to createInvoice)
  try {
    // Extract and transform form data
    const rawFormData = Object.fromEntries(formData.entries());
    const lineItemsForValidation = extractLineItemsFromFormData(rawFormData);
    
    // Create a complete form data object with parsed line items
    const dataForValidation = {
      ...rawFormData,
      lineItems: lineItemsForValidation,
    };

    // Validate with Zod schema
    const validatedFields = invoiceFormSchema.safeParse(dataForValidation);
    if (!validatedFields.success) {
      return handleValidationError(validatedFields.error, 'invoice');
    }

    // Calculate totals
    const { subtotalAmount, taxAmount, totalAmount } = calculateInvoiceTotals(validatedFields.data);

    // Prepare line items in the format expected by our RPC function
    const lineItemsForDb = validatedFields.data.lineItems.map(item => ({
      product_id: item.productId,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      fx_rate: item.fxRate,
      total_amount: item.quantity * item.unitPrice
    }));

    // Call the RPC function to update the invoice with line items atomically
    const { data, error } = await supabase.rpc('update_invoice_with_items', {
      p_invoice_id: id,
      p_entity_id: validatedFields.data.issuingEntityId,
      p_customer_id: validatedFields.data.customerId,
      p_issue_date: toISODate(validatedFields.data.issueDate),
      p_due_date: toISODate(validatedFields.data.dueDate),
      p_currency_code: validatedFields.data.currency,
      p_payment_source_id: validatedFields.data.paymentSourceId,
      p_tax_percentage: validatedFields.data.taxPercent,
      p_notes: validatedFields.data.notes || null,
      p_status: validatedFields.data.status || null, // Don't update status if not provided
      p_subtotal_amount: subtotalAmount,
      p_tax_amount: taxAmount,
      p_total_amount: totalAmount,
      p_line_items: JSON.stringify(lineItemsForDb)
    });

    if (error || (data && !data.success)) {
      const errMessage = data?.error || error?.message || 'Failed to update invoice';
      console.error('Error updating invoice:', errMessage);
      return { error: errMessage };
    }

    // Revalidate cache and redirect
    revalidatePath('/invoices');
    revalidatePath(`/invoices/${id}`);
    redirect(`/invoices/${id}`);

  } catch (error) {
    console.error('Unexpected error updating invoice:', error);
    return { 
      error: 'An unexpected error occurred while updating the invoice.' 
    };
  }
}

/**
 * Deletes an invoice by marking it as deleted
 * 
 * @param id - Invoice ID to delete
 * @returns Success or error response
 */
export async function deleteInvoice(id: string): Promise<ErrorResponse | { success: true }> {
  if (!id) {
    return { error: "Invalid invoice ID." };
  }

  const supabase = await getServerSupabaseClient();

  // Soft delete by setting deleted_at
  const { error } = await supabase
    .from('invoices')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    return handleDatabaseError(error, 'delete', 'invoice');
  }

  // Revalidate cache
  revalidatePath('/invoices');
  return { success: true };
}

/**
 * Updates the status of an invoice
 * 
 * @param id - Invoice ID to update
 * @param status - New status value
 * @returns Success or error response
 */
export async function updateInvoiceStatus(
  id: string, 
  status: 'Draft' | 'Sent' | 'Paid' | 'Overdue' | 'Cancelled'
): Promise<ErrorResponse | { success: true }> {
  if (!id) {
    return { error: "Invalid invoice ID." };
  }

  const supabase = await getServerSupabaseClient();

  const { error } = await supabase
    .from('invoices')
    .update({ status })
    .eq('id', id);

  if (error) {
    return handleDatabaseError(error, 'update status', 'invoice');
  }

  // Revalidate cache
  revalidatePath('/invoices');
  revalidatePath(`/invoices/${id}`);
  return { success: true };
}