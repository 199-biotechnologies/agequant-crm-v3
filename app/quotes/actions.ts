"use server";

import { revalidatePath } from "next/cache";
import { redirect } from 'next/navigation';
import { getServerSupabaseClient } from '@/lib/supabase/server-client';
import {
  quoteFormSchema,
  DbQuote,
  DbLineItem
} from '@/lib/schemas/financial-documents';
import { 
  handleValidationError, 
  handleDatabaseError, 
  ErrorResponse 
} from '@/lib/utils/error-handler';
import {
  extractLineItemsFromFormData,
  calculateQuoteTotals,
  toISODate
} from '@/lib/utils/financial-document-utils';

// --- Shared Types for Quote Data Structure ---
export interface DbQuoteWithItems extends DbQuote {
  items: DbLineItem[];
}

export interface QuoteWithRelations extends DbQuote {
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
 * Retrieves a quote by its ID with all related data
 * 
 * @param id - The quote ID (UUID)
 * @returns The quote with its related data, or null if not found
 */
export async function getQuoteById(id: string): Promise<QuoteWithRelations | null> {
  if (!id) return null;

  const supabase = await getServerSupabaseClient();

  const { data: quote, error } = await supabase
    .from('quotes')
    .select(`
      *,
      customer:customers(id, public_customer_id, company_contact_name),
      entity:issuing_entities(id, name),
      payment_source:payment_sources(id, name),
      items:quote_items(*)
    `)
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (error || !quote) {
    console.error('Error fetching quote:', error);
    return null;
  }

  return quote as unknown as QuoteWithRelations;
}

/**
 * Creates a new quote using the atomic transaction RPC function
 * 
 * @param formData - Form data containing quote details
 * @returns Success or error response
 */
export async function createQuote(formData: FormData) {
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
    const validatedFields = quoteFormSchema.safeParse(dataForValidation);
    if (!validatedFields.success) {
      return handleValidationError(validatedFields.error, 'quote');
    }

    // Calculate totals
    const { subtotalAmount, discountAmount, taxAmount, totalAmount } = calculateQuoteTotals(validatedFields.data);

    // Prepare line items in the format expected by our RPC function
    const lineItemsForDb = validatedFields.data.lineItems.map(item => ({
      product_id: item.productId,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      fx_rate: item.fxRate,
      total_amount: item.quantity * item.unitPrice
    }));

    // Call the RPC function to create the quote with line items atomically
    const { data, error } = await supabase.rpc('create_quote_with_items', {
      p_entity_id: validatedFields.data.issuingEntityId,
      p_customer_id: validatedFields.data.customerId,
      p_issue_date: toISODate(validatedFields.data.issueDate),
      p_expiry_date: toISODate(validatedFields.data.expiryDate),
      p_currency_code: validatedFields.data.currency,
      p_payment_source_id: validatedFields.data.paymentSourceId,
      p_discount_percentage: validatedFields.data.discountPercent || 0,
      p_tax_percentage: validatedFields.data.taxPercent,
      p_notes: validatedFields.data.notes || null,
      p_status: 'Draft', // Default status for new quotes
      p_subtotal_amount: subtotalAmount,
      p_discount_amount: discountAmount,
      p_tax_amount: taxAmount,
      p_total_amount: totalAmount,
      p_line_items: JSON.stringify(lineItemsForDb)
    });

    if (error || (data && !data.success)) {
      const errMessage = data?.error || error?.message || 'Failed to create quote';
      console.error('Error creating quote:', errMessage);
      return { error: errMessage };
    }

    // Revalidate cache and redirect
    revalidatePath('/quotes');
    redirect(`/quotes/${data.id}`);

  } catch (error) {
    console.error('Unexpected error creating quote:', error);
    return { 
      error: 'An unexpected error occurred while creating the quote.' 
    };
  }
}

/**
 * Updates an existing quote using the atomic transaction RPC function
 * 
 * @param id - Quote ID to update
 * @param formData - Form data containing updated quote details
 * @returns Success or error response
 */
export async function updateQuote(id: string, formData: FormData): Promise<ErrorResponse | void> {
  if (!id) {
    return { error: "Invalid quote ID." };
  }

  const supabase = await getServerSupabaseClient();

  // Parse and validate form data (similar to createQuote)
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
    const validatedFields = quoteFormSchema.safeParse(dataForValidation);
    if (!validatedFields.success) {
      return handleValidationError(validatedFields.error, 'quote');
    }

    // Calculate totals
    const { subtotalAmount, discountAmount, taxAmount, totalAmount } = calculateQuoteTotals(validatedFields.data);

    // Prepare line items in the format expected by our RPC function
    const lineItemsForDb = validatedFields.data.lineItems.map(item => ({
      product_id: item.productId,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      fx_rate: item.fxRate,
      total_amount: item.quantity * item.unitPrice
    }));

    // Call the RPC function to update the quote with line items atomically
    const { data, error } = await supabase.rpc('update_quote_with_items', {
      p_quote_id: id,
      p_entity_id: validatedFields.data.issuingEntityId,
      p_customer_id: validatedFields.data.customerId,
      p_issue_date: toISODate(validatedFields.data.issueDate),
      p_expiry_date: toISODate(validatedFields.data.expiryDate),
      p_currency_code: validatedFields.data.currency,
      p_payment_source_id: validatedFields.data.paymentSourceId,
      p_discount_percentage: validatedFields.data.discountPercent || 0,
      p_tax_percentage: validatedFields.data.taxPercent,
      p_notes: validatedFields.data.notes || null,
      p_status: validatedFields.data.status || null, // Don't update status if not provided
      p_subtotal_amount: subtotalAmount,
      p_discount_amount: discountAmount,
      p_tax_amount: taxAmount,
      p_total_amount: totalAmount,
      p_line_items: JSON.stringify(lineItemsForDb)
    });

    if (error || (data && !data.success)) {
      const errMessage = data?.error || error?.message || 'Failed to update quote';
      console.error('Error updating quote:', errMessage);
      return { error: errMessage };
    }

    // Revalidate cache and redirect
    revalidatePath('/quotes');
    revalidatePath(`/quotes/${id}`);
    redirect(`/quotes/${id}`);

  } catch (error) {
    console.error('Unexpected error updating quote:', error);
    return { 
      error: 'An unexpected error occurred while updating the quote.' 
    };
  }
}

/**
 * Deletes a quote by marking it as deleted
 * 
 * @param id - Quote ID to delete
 * @returns Success or error response
 */
export async function deleteQuote(id: string): Promise<ErrorResponse | { success: true }> {
  if (!id) {
    return { error: "Invalid quote ID." };
  }

  const supabase = await getServerSupabaseClient();

  // Soft delete by setting deleted_at
  const { error } = await supabase
    .from('quotes')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    return handleDatabaseError(error, 'delete', 'quote');
  }

  // Revalidate cache
  revalidatePath('/quotes');
  return { success: true };
}

/**
 * Updates the status of a quote
 * 
 * @param id - Quote ID to update
 * @param status - New status value
 * @returns Success or error response
 */
export async function updateQuoteStatus(
  id: string, 
  status: 'Draft' | 'Sent' | 'Accepted' | 'Rejected' | 'Expired'
): Promise<ErrorResponse | { success: true }> {
  if (!id) {
    return { error: "Invalid quote ID." };
  }

  const supabase = await getServerSupabaseClient();

  const { error } = await supabase
    .from('quotes')
    .update({ status })
    .eq('id', id);

  if (error) {
    return handleDatabaseError(error, 'update status', 'quote');
  }

  // Revalidate cache
  revalidatePath('/quotes');
  revalidatePath(`/quotes/${id}`);
  return { success: true };
}

/**
 * Converts a quote to an invoice using the atomic RPC function
 * 
 * @param quoteId - ID of the quote to convert
 * @param dueDate - Due date for the created invoice
 * @returns Success or error response with the new invoice ID
 */
export async function convertQuoteToInvoice(
  quoteId: string,
  dueDate: string
): Promise<ErrorResponse | { success: true; invoiceId: string }> {
  if (!quoteId) {
    return { error: "Invalid quote ID." };
  }

  const supabase = await getServerSupabaseClient();

  try {
    // Use the RPC function for atomic conversion
    const { data, error } = await supabase.rpc('convert_quote_to_invoice', {
      p_quote_id: quoteId,
      p_due_date: toISODate(dueDate)
    });

    if (error || (data && !data.success)) {
      const errMessage = data?.error || error?.message || 'Failed to convert quote to invoice';
      console.error('Error converting quote to invoice:', errMessage);
      return { error: errMessage };
    }

    // Revalidate cache
    revalidatePath('/quotes');
    revalidatePath('/invoices');
    revalidatePath(`/quotes/${quoteId}`);

    return { 
      success: true,
      invoiceId: data.invoice_id
    };
  } catch (error) {
    console.error('Unexpected error converting quote to invoice:', error);
    return { 
      error: 'An unexpected error occurred during conversion.' 
    };
  }
}