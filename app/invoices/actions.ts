"use server";

import { revalidatePath } from "next/cache";
import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { redirect } from 'next/navigation';
import { z } from "zod";

// --- Invoice Schema (Copied from InvoiceForm for server-side validation) ---
// TODO: Refactor schema into a shared file (e.g., lib/schemas/invoice.ts)
const lineItemSchema = z.object({
  // Assuming line items from the form might not have an ID if they are new
  // The database ID isn't strictly needed for validation here, but useful for updates if kept
  // id: z.string().optional(), // Database ID of the line item, if exists
  productId: z.string().uuid("Invalid product ID format").min(1, "Product is required"), // Assuming product IDs are UUIDs
  description: z.string().min(1, "Description is required").max(1000, "Description too long"), // Added max length
  quantity: z.preprocess(
    (val) => (typeof val === 'string' ? parseInt(val, 10) : val),
    z.number().int().min(1, "Quantity must be at least 1")
  ),
  unitPrice: z.preprocess(
    (val) => (typeof val === 'string' ? parseFloat(val) : val),
    z.number().min(0, "Unit price cannot be negative")
  ),
  // 'total' is calculated, not submitted directly, so omit from validation schema for form data
  // total: z.number(),
});

const invoiceFormSchema = z.object({
  entityId: z.string().uuid("Invalid entity ID format").min(1, "Issuing Entity is required"),
  customerId: z.string().uuid("Invalid customer ID format").min(1, "Customer is required"),
  // Use z.coerce.date() for better date handling if needed, but string is fine from form
  issueDate: z.string().min(1, "Issue date is required").refine(val => !isNaN(Date.parse(val)), { message: "Invalid issue date" }),
  dueDate: z.string().min(1, "Due date is required").refine(val => !isNaN(Date.parse(val)), { message: "Invalid due date" }),
  currency: z.string().length(3, "Currency code must be 3 letters").min(1, "Currency is required"), // Assuming 3-letter codes
  paymentSourceId: z.string().uuid("Invalid payment source ID format").min(1, "Payment source is required"),
  taxPercent: z.preprocess(
    (val) => (typeof val === 'string' ? parseFloat(val) : val),
    z.number().min(0, "Tax cannot be negative").max(100, "Tax cannot exceed 100%").default(0)
  ),
  notes: z.string().max(2000, "Notes too long").optional(), // Added max length
  lineItems: z.array(lineItemSchema).min(1, "At least one line item is required"),
  // Add other fields if they exist in the form and need validation (e.g., status?)
  // status: z.enum(['Draft', 'Sent', 'Paid', 'Overdue']).optional(), // Example if status is part of the form
});

type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;


// --- Shared Types for Invoice Data Structure ---
// These types should ideally live in a shared location (e.g., app/invoices/types.ts)

export interface DbInvoiceLineItem { // Export if needed by other server components/actions
  id: string; // Assuming UUID from DB
  product_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  // Include other fields from invoice_line_items table if selected
  product?: { name?: string }; // If joining product name
}

export interface DbInvoiceData { // Export if needed
  id: string; // Assuming UUID from DB
  invoice_number?: string | null;
  customer_id: string;
  issuing_entity_id: string;
  payment_source_id: string;
  issue_date: string;
  due_date: string;
  currency_code: string;
  tax_percentage?: number | null;
  notes?: string | null;
  status?: string | null;
  // Relations
  customer?: { company_contact_name?: string | null; email?: string | null; phone?: string | null; } | null;
  issuing_entity?: { entity_name?: string | null; } | null;
  payment_source?: { name?: string; bank_name?: string; account_holder_name?: string; account_number?: string; iban?: string; swift_bic?: string; routing_number_us?: string; sort_code_uk?: string; additional_details?: string | null; } | null; // Simplified PaymentSource
  line_items?: DbInvoiceLineItem[] | null;
}
// --- End Shared Types ---
// --- End Schema ---


// --- Helper Function to Get Supabase Client ---
// Encapsulates client creation logic
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

// --- Get Invoice By ID ---
// Fetches a single invoice with its details for view/edit pages
// NOTE: Assumes internal UUID `id` is passed, not the user-facing `invoice_number`
export async function getInvoiceById(id: string): Promise<{ invoice: DbInvoiceData | null; error: string | null }> {
  if (!id || typeof id !== 'string') {
    console.error("Invalid Invoice ID provided for getInvoiceById.");
    return { error: "Invalid Invoice ID.", invoice: null };
  }

  const supabase = await getSupabaseClient();

  // Fetch invoice header and related data in one go
  const { data, error } = await supabase
    .from('invoices')
    .select(`
      id, invoice_number, customer_id, issuing_entity_id, payment_source_id,
      issue_date, due_date, currency_code, tax_percentage, notes, status,
      customer:customers(company_contact_name, email, phone),
      issuing_entity:issuing_entities(entity_name),
      payment_source:payment_sources(name, bank_name, account_holder_name, account_number, iban, swift_bic, routing_number_us, sort_code_uk, additional_details),
      line_items:invoice_line_items(id, product_id, description, quantity, unit_price, product:products(name))
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error(`Error fetching invoice with ID ${id}:`, error);
    if (error.code === 'PGRST116') {
      return { error: "Invoice not found.", invoice: null };
    }
    return { error: `Database error: ${error.message}`, invoice: null };
  }

  if (!data) {
    return { error: "Invoice not found.", invoice: null };
  }
  
  // Cast the data to DbInvoiceData to ensure type conformity
  const invoice = data as DbInvoiceData;

  return { invoice, error: null };
}

// --- Create Invoice ---
// TODO: Implement createInvoice action
// export async function createInvoice(formData: FormData) {
//   const supabase = await getSupabaseClient();
//   // 1. Validate formData using invoiceFormSchema
//   // 2. Generate Invoice Number (requires a separate mechanism/API call)
//   // 3. Prepare data for 'invoices' table insert
//   // 4. Prepare data for 'invoice_line_items' table insert
//   // 5. Insert into 'invoices' and 'invoice_line_items' (ideally in a transaction)
//   // 6. Handle errors
//   // 7. Revalidate '/invoices' path
//   // 8. Redirect to '/invoices' or the new invoice page
// }


// --- Update Invoice ---
// --- Update Invoice ---
export async function updateInvoice(id: string, formData: FormData) {
  if (!id || typeof id !== 'string') {
    console.error("Invalid Invoice ID provided for update.");
    // TODO: Return structured error for form state
    return { success: false, error: "Invalid Invoice ID." };
  }

  const supabase = await getSupabaseClient();

  // 1. Validate formData
  const rawFormData = Object.fromEntries(formData.entries());

  // Need to handle lineItems specially as they are stringified JSON in FormData usually.
  // A hidden input field stringifying the lineItems state is a common pattern.
  type ParsedLineItem = z.infer<typeof lineItemSchema>; // Type for individual line items
  let lineItemsForValidation: ParsedLineItem[] = []; // Use this variable

  if (typeof rawFormData.lineItems === 'string') {
    try {
      const parsed = JSON.parse(rawFormData.lineItems);
      if (Array.isArray(parsed)) {
        // TODO: Add runtime check for each item structure if necessary before Zod validation
        lineItemsForValidation = parsed;
      } else {
        throw new Error("Parsed lineItems is not an array.");
      }
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      console.error("Failed to parse lineItems JSON:", err.message);
      return { success: false, error: "Invalid line item data format." };
    }
  } else if (Array.isArray(rawFormData.lineItems)) {
     // This case might not happen with standard FormData but good to have
     lineItemsForValidation = rawFormData.lineItems;
  }
  // If lineItems is not a string or array, it will default to empty or fail Zod validation, which is fine.

  const validatedFields = invoiceFormSchema.safeParse({
    ...rawFormData,
    lineItems: lineItemsForValidation, // Use the correctly populated array
    taxPercent: rawFormData.taxPercent,
  });

  if (!validatedFields.success) {
    console.error("Server Validation Error (Update Invoice):", validatedFields.error.flatten().fieldErrors);
    // TODO: Return detailed errors for form state
    return { success: false, error: "Validation failed.", errors: validatedFields.error.flatten().fieldErrors };
  }

  // Now validatedFields.data is of type InvoiceFormValues
  const validatedData: InvoiceFormValues = validatedFields.data;
  const { lineItems, ...invoiceHeaderData } = validatedData;


  // Map validated data to database columns for the invoice header
  const dbInvoiceData = {
    customer_id: invoiceHeaderData.customerId,
    issuing_entity_id: invoiceHeaderData.entityId,
    payment_source_id: invoiceHeaderData.paymentSourceId,
    issue_date: invoiceHeaderData.issueDate,
    due_date: invoiceHeaderData.dueDate,
    currency_code: invoiceHeaderData.currency,
    tax_percentage: invoiceHeaderData.taxPercent,
    notes: invoiceHeaderData.notes || null,
    // Assuming status is managed separately or defaults correctly in DB
    // status: invoiceHeaderData.status || 'Draft',
    // updated_at will likely be handled by DB trigger
  };

  // Map line items for database insertion
  const dbLineItemsData = lineItems.map(item => ({
    invoice_id: id, // Link to the parent invoice
    product_id: item.productId,
    description: item.description,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    // Add other line item fields if necessary (e.g., tax_rate_used, fx_rate_used)
  }));

  // --- Database Operations (Ideally in a Transaction) ---
  // Supabase Edge Functions or RPC calls are needed for true transactions.
  // Simulating sequential operations here, which is NOT atomic.
  // TODO: Refactor to use an RPC function for atomicity.

  try {
    // 1. Update Invoice Header
    const { error: updateHeaderError } = await supabase
      .from('invoices')
      .update(dbInvoiceData)
      .eq('id', id);

    if (updateHeaderError) {
      console.error("Error updating invoice header:", updateHeaderError);
      throw new Error(`Failed to update invoice header: ${updateHeaderError.message}`);
    }

    // 2. Delete existing line items for this invoice
    const { error: deleteItemsError } = await supabase
      .from('invoice_line_items') // Assuming table name
      .delete()
      .eq('invoice_id', id);

    if (deleteItemsError) {
      console.error("Error deleting existing invoice line items:", deleteItemsError);
      throw new Error(`Failed to clear existing line items: ${deleteItemsError.message}`);
    }

    // 3. Insert new line items
    if (dbLineItemsData.length > 0) {
      const { error: insertItemsError } = await supabase
        .from('invoice_line_items')
        .insert(dbLineItemsData);

      if (insertItemsError) {
        console.error("Error inserting new invoice line items:", insertItemsError);
        throw new Error(`Failed to insert new line items: ${insertItemsError.message}`);
      }
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Error during invoice update transaction simulation:", errorMessage);
    return { success: false, error: errorMessage || "Failed to update invoice." };
  }

  // --- Success ---
  console.log(`Invoice ${id} updated successfully.`);

  // Revalidate relevant paths
  revalidatePath('/invoices');
  revalidatePath(`/invoices/${id}`); // Assuming view page uses internal ID
  revalidatePath(`/invoices/${id}/edit`);

  // Redirect to the view page after successful update
  // Note: redirect() throws an error, so code after it might not execute in the same flow.
  // Consider returning success and letting the client handle redirect if needed.
  redirect(`/invoices/${id}`); // Redirect based on internal ID

  // This return might not be reached due to redirect, but satisfies function signature
  return { success: true, error: null };
}


// --- Delete Invoice ---
// TODO: Decide if invoices can be deleted (soft delete?) or only marked as void/cancelled
// export async function deleteInvoice(id: string) { ... }
