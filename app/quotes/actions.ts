"use server";

import { revalidatePath } from "next/cache";
import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { redirect } from 'next/navigation';
import { z } from "zod";

// --- Quote Schema (Copied from QuoteForm for server-side validation) ---
// TODO: Refactor schema into a shared file (e.g., lib/schemas/quote.ts)
const lineItemSchema = z.object({
  // id: z.string().optional(), // DB ID if needed
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
  // total is calculated, omit from validation
});

const quoteFormSchema = z.object({
  entityId: z.string().uuid("Invalid entity ID format").min(1, "Issuing Entity is required"),
  customerId: z.string().uuid("Invalid customer ID format").min(1, "Customer is required"),
  issueDate: z.string().min(1, "Issue date is required").refine(val => !isNaN(Date.parse(val)), { message: "Invalid issue date" }),
  expiryDate: z.string().min(1, "Expiry date is required").refine(val => !isNaN(Date.parse(val)), { message: "Invalid expiry date" }),
  currency: z.string().length(3, "Currency code must be 3 letters").min(1, "Currency is required"),
  discountPercent: z.preprocess(
    (val) => (typeof val === 'string' ? parseFloat(val) : val),
    z.number().min(0).max(100).optional().default(0)
  ),
  taxPercent: z.preprocess(
    (val) => (typeof val === 'string' ? parseFloat(val) : val),
    z.number().min(0, "Tax cannot be negative").max(100, "Tax cannot exceed 100%").default(0)
  ),
  notes: z.string().max(2000, "Notes/Terms too long").optional(),
  lineItems: z.array(lineItemSchema).min(1, "At least one line item is required"),
  // status: z.enum(['Draft', 'Sent', 'Accepted', 'Rejected']).optional(), // Example if status is part of form
});

type QuoteFormValues = z.infer<typeof quoteFormSchema>;


// --- Shared Types for Quote Data Structure ---
export interface DbQuoteLineItem {
  id: string;
  product_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  product?: { name?: string };
}

export interface DbQuoteData {
  id: string;
  quote_number?: string | null;
  customer_id: string;
  issuing_entity_id: string;
  issue_date: string;
  expiry_date: string;
  currency_code: string;
  discount_percentage?: number | null;
  tax_percentage?: number | null;
  notes?: string | null;
  status?: string | null;
  customer?: { company_contact_name?: string | null; email?: string | null; phone?: string | null; } | null;
  issuing_entity?: { entity_name?: string | null; } | null;
  line_items?: DbQuoteLineItem[] | null;
}
// --- End Shared Types ---
// --- End Schema ---


// --- Helper Function to Get Supabase Client ---
async function getSupabaseClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value },
        set(name: string, value: string, options: CookieOptions) { cookieStore.set({ name, value, ...options }) },
        remove(name: string, options: CookieOptions) { cookieStore.set({ name, value: '', ...options }) },
      },
    }
  );
}

// --- Get Quote By ID ---
// Fetches a single quote with its details for view/edit pages
// NOTE: Assumes internal UUID `id` is passed
export async function getQuoteById(id: string): Promise<{ quote: DbQuoteData | null; error: string | null }> {
  if (!id || typeof id !== 'string') {
    console.error("Invalid Quote ID provided for getQuoteById.");
    return { error: "Invalid Quote ID.", quote: null };
  }

  const supabase = await getSupabaseClient();

  // Fetch quote header and related data
  const { data, error } = await supabase
    .from('quotes')
    .select(`
      id, quote_number, customer_id, issuing_entity_id, issue_date, expiry_date,
      currency_code, discount_percentage, tax_percentage, notes, status,
      customer:customers(company_contact_name, email, phone),
      issuing_entity:issuing_entities(entity_name),
      line_items:quote_line_items(id, product_id, description, quantity, unit_price, product:products(name))
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error(`Error fetching quote with ID ${id}:`, error);
    if (error.code === 'PGRST116') {
      return { error: "Quote not found.", quote: null };
    }
    return { error: `Database error: ${error.message}`, quote: null };
  }

  if (!data) {
    return { error: "Quote not found.", quote: null };
  }

  const quote = data as DbQuoteData;

  return { quote, error: null };
}

// --- Create Quote ---
// TODO: Implement createQuote action
// export async function createQuote(formData: FormData) { ... }


// --- Update Quote ---
export async function updateQuote(id: string, formData: FormData) {
  if (!id || typeof id !== 'string') {
    console.error("Invalid Quote ID provided for update.");
    return { success: false, error: "Invalid Quote ID." };
  }

  const supabase = await getSupabaseClient();

  // 1. Validate formData
  const rawFormData = Object.fromEntries(formData.entries());

  // Handle lineItems JSON string if necessary (same pattern as invoices)
  // TODO: Robust FormData handling for line items
  type ParsedLineItem = z.infer<typeof lineItemSchema>; // Type for individual line items
  let lineItemsForValidation: ParsedLineItem[] = []; // Use this variable

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
      console.error("Failed to parse lineItems JSON for quote:", err.message);
      return { success: false, error: "Invalid line item data format." };
    }
  } else if (Array.isArray(rawFormData.lineItems)) {
     lineItemsForValidation = rawFormData.lineItems;
  }
  // If lineItems is not a string or array, it will default to empty or fail Zod validation.

  const validatedFields = quoteFormSchema.safeParse({
    ...rawFormData,
    lineItems: lineItemsForValidation, // Use the correctly populated array
    discountPercent: rawFormData.discountPercent,
    taxPercent: rawFormData.taxPercent,
  });

  if (!validatedFields.success) {
    console.error("Server Validation Error (Update Quote):", validatedFields.error.flatten().fieldErrors);
    return { success: false, error: "Validation failed.", errors: validatedFields.error.flatten().fieldErrors };
  }

  const validatedData: QuoteFormValues = validatedFields.data;
  const { lineItems, ...quoteHeaderData } = validatedData;

  // Map validated data to database columns for the quote header
  const dbQuoteData = {
    customer_id: quoteHeaderData.customerId,
    issuing_entity_id: quoteHeaderData.entityId,
    issue_date: quoteHeaderData.issueDate,
    expiry_date: quoteHeaderData.expiryDate,
    currency_code: quoteHeaderData.currency,
    discount_percentage: quoteHeaderData.discountPercent,
    tax_percentage: quoteHeaderData.taxPercent,
    notes: quoteHeaderData.notes || null,
    // status: quoteHeaderData.status || 'Draft',
    // updated_at handled by DB
  };

  // Map line items for database insertion
  const dbLineItemsData = lineItems.map(item => ({
    quote_id: id, // Link to the parent quote
    product_id: item.productId,
    description: item.description,
    quantity: item.quantity,
    unit_price: item.unitPrice,
  }));

  // --- Database Operations (Simulated Transaction) ---
  // TODO: Refactor to use an RPC function for atomicity.
  try {
    // 1. Update Quote Header
    const { error: updateHeaderError } = await supabase
      .from('quotes')
      .update(dbQuoteData)
      .eq('id', id);

    if (updateHeaderError) throw new Error(`Failed to update quote header: ${updateHeaderError.message}`);

    // 2. Delete existing line items
    const { error: deleteItemsError } = await supabase
      .from('quote_line_items') // Assuming table name
      .delete()
      .eq('quote_id', id);

    if (deleteItemsError) throw new Error(`Failed to clear existing line items: ${deleteItemsError.message}`);

    // 3. Insert new line items
    if (dbLineItemsData.length > 0) {
      const { error: insertItemsError } = await supabase
        .from('quote_line_items')
        .insert(dbLineItemsData);

      if (insertItemsError) throw new Error(`Failed to insert new line items: ${insertItemsError.message}`);
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Error during quote update transaction simulation:", errorMessage);
    return { success: false, error: errorMessage || "Failed to update quote." };
  }

  // --- Success ---
  console.log(`Quote ${id} updated successfully.`);

  // Revalidate relevant paths
  revalidatePath('/quotes');
  revalidatePath(`/quotes/${id}`);
  revalidatePath(`/quotes/${id}/edit`);

  // Redirect to the view page
  redirect(`/quotes/${id}`);

  return { success: true, error: null };
}

// --- Delete Quote ---
// TODO: Decide if quotes can be deleted (soft delete?) or only marked as void/cancelled/rejected
// export async function deleteQuote(id: string) { ... }
