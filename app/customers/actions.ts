// app/customers/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr' // Import directly
// No longer importing the helper
 import { redirect } from 'next/navigation'; // Keep redirect for createCustomer
 import { z } from "zod";
 import { customerFormSchema } from "@/components/customers/customer-form-schema"; // Import schema and type, removed CustomerFormData

 // Schema for validating the public customer ID (short code)
const DeleteCustomerSchema = z.object({
  publicCustomerId: z.string().min(1, { message: "Customer ID is required." }), // Basic validation, DB handles format/uniqueness
});

export async function deleteCustomer(formData: FormData) {
  // Explicitly await cookies() inside the Server Action
  const cookieStore = await cookies();
  // Create client directly within the Server Action
  const supabase = createServerClient(
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

  const validatedFields = DeleteCustomerSchema.safeParse({
    publicCustomerId: formData.get('publicCustomerId'), // Expecting the short ID from the form
  });

  if (!validatedFields.success) {
    console.error("Validation Error:", validatedFields.error.flatten().fieldErrors);
    return {
      error: "Invalid Customer ID provided.",
    };
  }

  const { publicCustomerId } = validatedFields.data;

  // 1. Fetch the customer by public_customer_id to get its internal UUID id
  const { data: customer, error: fetchError } = await supabase
    .from('customers')
    .select('id, company_contact_name') // Select id and name for logging/confirmation
    .eq('public_customer_id', publicCustomerId)
    .single();

  if (fetchError || !customer) {
    console.error(`Error fetching customer by public_customer_id ${publicCustomerId}:`, fetchError);
    return { error: "Customer not found or database error." };
  }

  const internalId = customer.id; // The UUID
  console.log(`Attempting to soft delete customer with public ID: ${publicCustomerId} (Internal UUID: ${internalId}, Name: ${customer.company_contact_name})`);

  // 2. Perform the soft delete using the internal UUID id
  const { error: deleteError } = await supabase
    .from("customers")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", internalId); // Use the UUID for the actual delete operation

  if (deleteError) {
    console.error("Error soft deleting customer:", deleteError);
    return { error: `Database Error: Failed to delete customer. ${deleteError.message}` };
  }

  console.log(`Customer with public ID ${publicCustomerId} (Name: ${customer.company_contact_name}) soft deleted successfully.`);
  // Explicitly return success before revalidation/redirect
  // Although the client might not receive this due to redirect, it satisfies TS
  const result = { success: true };

  // Revalidate the customers list page cache
  revalidatePath("/customers");

  return result; // Return the success object
}
// New Server Action for updating a customer
export async function updateCustomer(publicCustomerId: string, formData: FormData) {
  // Validate publicCustomerId (basic check, could enhance later)
  // Basic validation - might throw error or handle differently with useFormState
  if (!publicCustomerId || typeof publicCustomerId !== 'string') {
    console.error("Invalid Public Customer ID provided for update.");
    // Returning void for now to satisfy form action type
    return;
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
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

  // Extract data from FormData and validate using the schema
  const rawFormData = Object.fromEntries(formData.entries());
  // console.log("Raw form data for update:", rawFormData); // Debugging
  const validatedFields = customerFormSchema.safeParse(rawFormData);

  if (!validatedFields.success) {
    console.error("Server Validation Error (Update):", validatedFields.error.flatten().fieldErrors);
    // TODO: Improve error feedback to the form
    // Returning void for now. Consider useFormState for detailed errors.
    return;
  }
  // console.log("Validated data for update:", validatedFields.data); // Debugging


  // 1. Fetch customer by publicCustomerId to get internal UUID
  const { data: existingCustomer, error: fetchErr } = await supabase
    .from('customers')
    .select('id') // Only need the internal id
    .eq('public_customer_id', publicCustomerId)
    .single();

  if (fetchErr || !existingCustomer) {
    console.error(`Error fetching customer by public ID ${publicCustomerId} for update:`, fetchErr);
    // Returning void for now.
    return;
  }
  const internalId = existingCustomer.id; // The UUID to use for the update

  // 2. Prepare data for update (handle optional fields)
  const customerData = {
    company_contact_name: validatedFields.data.company_contact_name,
    email: validatedFields.data.email || null, // Ensure null if empty/undefined
    phone: validatedFields.data.phone || null,
    preferred_currency: validatedFields.data.preferred_currency || null, // Ensure null if empty/undefined
    address: validatedFields.data.address || null,
    notes: validatedFields.data.notes || null,
    // updated_at will be handled by the database trigger
  };
   // console.log("Data to update in DB:", customerData); // Debugging


  // 3. Perform the update using the internal UUID id
  const { error: updateError } = await supabase
    .from('customers')
    .update(customerData)
    .eq('id', internalId);

  if (updateError) {
    console.error('Error updating customer:', updateError);
    // Returning void for now.
    return;
  }

  // On success:
  revalidatePath('/customers'); // Revalidate the list page
  revalidatePath(`/customers/${publicCustomerId}`); // Revalidate view page
  revalidatePath(`/customers/${publicCustomerId}/edit`); // Revalidate edit page
  redirect('/customers'); // Redirect to the list page
  // Note: redirect() throws an error, no explicit success return needed for client.
}

// New Server Action for creating a customer
export async function createCustomer(formData: FormData) {
  // Explicitly await cookies() inside the Server Action
  const cookieStore = await cookies();
   // Create client directly within the Server Action
  const supabase = createServerClient(
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

  // Extract data from FormData and validate using the schema
  const rawFormData = Object.fromEntries(formData.entries());
  const validatedFields = customerFormSchema.safeParse(rawFormData);
  if (!validatedFields.success) {
    console.error("Server Validation Error:", validatedFields.error.flatten().fieldErrors);
    // Returning void for now. Consider useFormState for detailed errors.
    return;
  }

  // Map validated data to database columns
  const customerData = {
    company_contact_name: validatedFields.data.company_contact_name,
    email: validatedFields.data.email || null, // Ensure null if empty/undefined
    phone: validatedFields.data.phone || null,
    preferred_currency: validatedFields.data.preferred_currency || 'USD', // Default to USD
    address: validatedFields.data.address || null,
    notes: validatedFields.data.notes || null,
  };

  const { error } = await supabase
    .from('customers')
    .insert([customerData]);

  if (error) {
    console.error('Error inserting customer:', error);
    // Returning void for now.
    return;
  }

  // On success:
  revalidatePath('/customers'); // Revalidate the list page
  redirect('/customers'); // Redirect to the list page
  // Note: redirect() throws an error, so code after it won't run,
  // hence no explicit { success: true } return is needed here for the client.

}
