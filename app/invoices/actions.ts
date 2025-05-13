"use server";

import { revalidatePath } from "next/cache";
import { redirect } from 'next/navigation';
import { getServerSupabaseClient } from '@/lib/supabase/server-client';
import {
  invoiceFormSchema,
  // InvoiceFormValues - unused
  DbInvoice,
  DbLineItem
} from '@/lib/schemas/financial-documents';
import { 
  handleValidationError, 
  handleDatabaseError, 
  ErrorResponse 
} from '@/lib/utils/error-handler';

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
 * Creates a new invoice
 * 
 * @param formData - Form data containing invoice details
 * @returns Success or error response
 */
export async function createInvoice(formData: FormData) {
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
    const validatedFields = invoiceFormSchema.safeParse(dataForValidation);
    if (!validatedFields.success) {
      return handleValidationError(validatedFields.error, 'invoice');
    }

    // --- Prepare for database insertion ---

    // 1. Calculate totals
    const lineItems = validatedFields.data.lineItems;
    const subtotal = lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const taxAmount = subtotal * (validatedFields.data.taxPercent / 100);
    const totalAmount = subtotal + taxAmount;

    // 2. Prepare invoice data
    const invoiceData = {
      entity_id: validatedFields.data.entityId,
      customer_id: validatedFields.data.customerId,
      issue_date: new Date(validatedFields.data.issueDate).toISOString(),
      due_date: new Date(validatedFields.data.dueDate).toISOString(),
      currency_code: validatedFields.data.currency,
      payment_source_id: validatedFields.data.paymentSourceId,
      tax_percentage: validatedFields.data.taxPercent,
      notes: validatedFields.data.notes,
      status: 'Draft', // Default status for new invoices
      subtotal_amount: subtotal,
      tax_amount: taxAmount,
      total_amount: totalAmount,
    };

    // 3. Start a transaction
    // TODO: Refactor to use an RPC function for atomicity (see comprehensive-implementation-plan.md)
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert([invoiceData])
      .select('id, invoice_number')
      .single();

    if (invoiceError) {
      return handleDatabaseError(invoiceError, 'create', 'invoice');
    }

    // 4. Insert line items
    const lineItemsData = lineItems.map(item => ({
      invoice_id: invoice.id,
      product_id: item.productId,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      fx_rate: item.fxRate, // Add FX rate if provided
      total_amount: item.quantity * item.unitPrice,
    }));

    const { error: lineItemsError } = await supabase
      .from('invoice_items')
      .insert(lineItemsData);

    if (lineItemsError) {
      // This could leave an invoice without items if there's an error - should use a true transaction
      return handleDatabaseError(lineItemsError, 'create', 'invoice items');
    }

    // Revalidate cache and redirect
    revalidatePath('/invoices');
    redirect(`/invoices/${invoice.id}`);

  } catch (error) {
    console.error('Unexpected error creating invoice:', error);
    return { 
      error: 'An unexpected error occurred while creating the invoice.' 
    };
  }
}

/**
 * Updates an existing invoice
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
    const validatedFields = invoiceFormSchema.safeParse(dataForValidation);
    if (!validatedFields.success) {
      return handleValidationError(validatedFields.error, 'invoice');
    }

    // --- Prepare for database update ---

    // 1. Calculate totals
    const lineItems = validatedFields.data.lineItems;
    const subtotal = lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const taxAmount = subtotal * (validatedFields.data.taxPercent / 100);
    const totalAmount = subtotal + taxAmount;

    // 2. Prepare invoice data update
    const invoiceData = {
      entity_id: validatedFields.data.entityId,
      customer_id: validatedFields.data.customerId,
      issue_date: new Date(validatedFields.data.issueDate).toISOString(),
      due_date: new Date(validatedFields.data.dueDate).toISOString(),
      currency_code: validatedFields.data.currency,
      payment_source_id: validatedFields.data.paymentSourceId,
      tax_percentage: validatedFields.data.taxPercent,
      notes: validatedFields.data.notes,
      subtotal_amount: subtotal,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      // Don't update status here unless explicitly included in the form
      status: validatedFields.data.status || undefined,
    };

    // 3. Update the invoice
    const { error: invoiceError } = await supabase
      .from('invoices')
      .update(invoiceData)
      .eq('id', id);

    if (invoiceError) {
      return handleDatabaseError(invoiceError, 'update', 'invoice');
    }

    // 4. Handle line items
    // First, get existing line items to determine what to update/delete/insert
    const { data: existingItems } = await supabase
      .from('invoice_items')
      .select('id')
      .eq('invoice_id', id);

    const existingItemIds = existingItems?.map(item => item.id) || [];
    const formItemIds = lineItems
      .filter(item => item.id) // Only consider items with IDs (existing ones)
      .map(item => item.id);

    // Items to delete = existingItemIds - formItemIds
    const itemsToDeleteIds = existingItemIds.filter(id => !formItemIds.includes(id));

    if (itemsToDeleteIds.length > 0) {
      // Delete removed items
      const { error: deleteError } = await supabase
        .from('invoice_items')
        .delete()
        .in('id', itemsToDeleteIds);

      if (deleteError) {
        return handleDatabaseError(deleteError, 'delete', 'invoice items');
      }
    }

    // Process each line item (update existing, insert new)
    for (const item of lineItems) {
      const itemData = {
        invoice_id: id,
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
          .from('invoice_items')
          .update(itemData)
          .eq('id', item.id);

        if (updateError) {
          return handleDatabaseError(updateError, 'update', 'invoice item');
        }
      } else {
        // Insert new item
        const { error: insertError } = await supabase
          .from('invoice_items')
          .insert([itemData]);

        if (insertError) {
          return handleDatabaseError(insertError, 'create', 'invoice item');
        }
      }
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