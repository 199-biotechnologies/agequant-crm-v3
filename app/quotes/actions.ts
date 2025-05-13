"use server";

import { revalidatePath } from "next/cache";
import { redirect } from 'next/navigation';
import { getServerSupabaseClient } from '@/lib/supabase/server-client';
import {
  quoteFormSchema,
  // QuoteFormValues - unused
  DbQuote,
  DbLineItem
} from '@/lib/schemas/financial-documents';
import { 
  handleValidationError, 
  handleDatabaseError, 
  ErrorResponse 
} from '@/lib/utils/error-handler';

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
 * Creates a new quote
 * 
 * @param formData - Form data containing quote details
 * @returns Success or error response
 */
export async function createQuote(formData: FormData) {
  const supabase = await getServerSupabaseClient();

  // Parse and validate form data
  try {
    // Extract line items from the form data
    const rawFormData = Object.fromEntries(formData.entries());
    let lineItemsForValidation: any[] = [];
    
    if (typeof rawFormData.lineItems === 'string') {
      try {
        const parsed = JSON.parse(rawFormData.lineItems);
        if (Array.isArray(parsed)) {
          lineItemsForValidation = parsed;
        } else {
          throw new Error("Parsed lineItems is not an array.");
        }
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        console.error("Failed to parse lineItems JSON:", err.message);
        return { error: "Invalid line item data format." };
      }
    } else if (Array.isArray(rawFormData.lineItems)) {
      lineItemsForValidation = rawFormData.lineItems;
    }
    
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

    // --- Prepare for database insertion ---

    // 1. Calculate totals
    const lineItems = validatedFields.data.lineItems;
    const subtotal = lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const discountAmount = subtotal * (validatedFields.data.discountPercent || 0) / 100;
    const taxableAmount = subtotal - discountAmount;
    const taxAmount = taxableAmount * (validatedFields.data.taxPercent / 100);
    const totalAmount = taxableAmount + taxAmount;

    // 2. Prepare quote data
    const quoteData = {
      entity_id: validatedFields.data.entityId,
      customer_id: validatedFields.data.customerId,
      issue_date: new Date(validatedFields.data.issueDate).toISOString(),
      expiry_date: new Date(validatedFields.data.expiryDate).toISOString(),
      currency_code: validatedFields.data.currency,
      payment_source_id: validatedFields.data.paymentSourceId,
      discount_percentage: validatedFields.data.discountPercent || 0,
      tax_percentage: validatedFields.data.taxPercent,
      notes: validatedFields.data.notes,
      status: 'Draft', // Default status for new quotes
      subtotal_amount: subtotal,
      discount_amount: discountAmount,
      tax_amount: taxAmount,
      total_amount: totalAmount,
    };

    // 3. Start a transaction
    // TODO: Refactor to use an RPC function for atomicity (see comprehensive-implementation-plan.md)
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .insert([quoteData])
      .select('id, quote_number')
      .single();

    if (quoteError) {
      return handleDatabaseError(quoteError, 'create', 'quote');
    }

    // 4. Insert line items
    const lineItemsData = lineItems.map(item => ({
      quote_id: quote.id,
      product_id: item.productId,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      fx_rate: item.fxRate, // Add FX rate if provided
      total_amount: item.quantity * item.unitPrice,
    }));

    const { error: lineItemsError } = await supabase
      .from('quote_items')
      .insert(lineItemsData);

    if (lineItemsError) {
      // This could leave a quote without items if there's an error - should use a true transaction
      return handleDatabaseError(lineItemsError, 'create', 'quote items');
    }

    // Revalidate cache and redirect
    revalidatePath('/quotes');
    redirect(`/quotes/${quote.id}`);

  } catch (error) {
    console.error('Unexpected error creating quote:', error);
    return { 
      error: 'An unexpected error occurred while creating the quote.' 
    };
  }
}

/**
 * Updates an existing quote
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
    // Extract line items from the form data
    const rawFormData = Object.fromEntries(formData.entries());
    let lineItemsForValidation: any[] = [];
    
    if (typeof rawFormData.lineItems === 'string') {
      try {
        const parsed = JSON.parse(rawFormData.lineItems);
        if (Array.isArray(parsed)) {
          lineItemsForValidation = parsed;
        } else {
          throw new Error("Parsed lineItems is not an array.");
        }
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        console.error("Failed to parse lineItems JSON:", err.message);
        return { error: "Invalid line item data format." };
      }
    } else if (Array.isArray(rawFormData.lineItems)) {
      lineItemsForValidation = rawFormData.lineItems;
    }
    
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

    // --- Prepare for database update ---

    // 1. Calculate totals
    const lineItems = validatedFields.data.lineItems;
    const subtotal = lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const discountAmount = subtotal * (validatedFields.data.discountPercent || 0) / 100;
    const taxableAmount = subtotal - discountAmount;
    const taxAmount = taxableAmount * (validatedFields.data.taxPercent / 100);
    const totalAmount = taxableAmount + taxAmount;

    // 2. Prepare quote data update
    const quoteData = {
      entity_id: validatedFields.data.entityId,
      customer_id: validatedFields.data.customerId,
      issue_date: new Date(validatedFields.data.issueDate).toISOString(),
      expiry_date: new Date(validatedFields.data.expiryDate).toISOString(),
      currency_code: validatedFields.data.currency,
      payment_source_id: validatedFields.data.paymentSourceId,
      discount_percentage: validatedFields.data.discountPercent || 0,
      tax_percentage: validatedFields.data.taxPercent,
      notes: validatedFields.data.notes,
      subtotal_amount: subtotal,
      discount_amount: discountAmount,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      // Don't update status here unless explicitly included in the form
      status: validatedFields.data.status || undefined,
    };

    // 3. Update the quote
    const { error: quoteError } = await supabase
      .from('quotes')
      .update(quoteData)
      .eq('id', id);

    if (quoteError) {
      return handleDatabaseError(quoteError, 'update', 'quote');
    }

    // 4. Handle line items
    // First, get existing line items to determine what to update/delete/insert
    const { data: existingItems } = await supabase
      .from('quote_items')
      .select('id')
      .eq('quote_id', id);

    const existingItemIds = existingItems?.map(item => item.id) || [];
    const formItemIds = lineItems
      .filter(item => item.id) // Only consider items with IDs (existing ones)
      .map(item => item.id);

    // Items to delete = existingItemIds - formItemIds
    const itemsToDeleteIds = existingItemIds.filter(id => !formItemIds.includes(id));

    if (itemsToDeleteIds.length > 0) {
      // Delete removed items
      const { error: deleteError } = await supabase
        .from('quote_items')
        .delete()
        .in('id', itemsToDeleteIds);

      if (deleteError) {
        return handleDatabaseError(deleteError, 'delete', 'quote items');
      }
    }

    // Process each line item (update existing, insert new)
    for (const item of lineItems) {
      const itemData = {
        quote_id: id,
        product_id: item.productId,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        fx_rate: item.fxRate,
        total_amount: item.quantity * item.unitPrice,
      };

      if (item.id) {
        // Update existing item
        const { error: updateError } = await supabase
          .from('quote_items')
          .update(itemData)
          .eq('id', item.id);

        if (updateError) {
          return handleDatabaseError(updateError, 'update', 'quote item');
        }
      } else {
        // Insert new item
        const { error: insertError } = await supabase
          .from('quote_items')
          .insert([itemData]);

        if (insertError) {
          return handleDatabaseError(insertError, 'create', 'quote item');
        }
      }
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
 * Converts a quote to an invoice
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
    // 1. Get the quote with all its details
    const quote = await getQuoteById(quoteId);
    if (!quote) {
      return { error: "Quote not found." };
    }

    // 2. Create invoice data based on quote
    const invoiceData = {
      entity_id: quote.entity_id,
      customer_id: quote.customer_id,
      issue_date: new Date().toISOString(),
      due_date: new Date(dueDate).toISOString(),
      currency_code: quote.currency_code,
      payment_source_id: quote.payment_source_id,
      tax_percentage: quote.tax_percentage,
      notes: quote.notes,
      status: 'Draft',
      subtotal_amount: quote.subtotal_amount,
      tax_amount: quote.tax_amount,
      total_amount: quote.total_amount,
      source_quote_id: quoteId,
    };

    // 3. Insert the invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert([invoiceData])
      .select('id, invoice_number')
      .single();

    if (invoiceError) {
      return handleDatabaseError(invoiceError, 'create', 'invoice from quote');
    }

    // 4. Copy line items from quote to invoice
    if (quote.items && quote.items.length > 0) {
      const lineItemsData = quote.items.map((item: any) => ({
        invoice_id: invoice.id,
        product_id: item.product_id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        fx_rate: item.fx_rate,
        total_amount: item.total_amount,
      }));

      const { error: lineItemsError } = await supabase
        .from('invoice_items')
        .insert(lineItemsData);

      if (lineItemsError) {
        return handleDatabaseError(lineItemsError, 'create', 'invoice items from quote');
      }
    }

    // 5. Update quote status and link to invoice
    const { error: updateError } = await supabase
      .from('quotes')
      .update({
        status: 'Accepted',
        converted_invoice_id: invoice.id
      })
      .eq('id', quoteId);

    if (updateError) {
      return handleDatabaseError(updateError, 'update', 'quote status after conversion');
    }

    // Revalidate cache
    revalidatePath('/quotes');
    revalidatePath('/invoices');
    revalidatePath(`/quotes/${quoteId}`);

    return { 
      success: true,
      invoiceId: invoice.id
    };
  } catch (error) {
    console.error('Unexpected error converting quote to invoice:', error);
    return { 
      error: 'An unexpected error occurred during conversion.' 
    };
  }
}