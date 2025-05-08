// app/customers/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr' // Import directly
// No longer importing the helper
import { redirect } from 'next/navigation'; // Keep redirect for createCustomer
import { z } from "zod";
import { customerFormSchema, type CustomerFormData } from "@/components/customers/customer-form-schema"; // Import schema and type

// Schema for validating the customer ID
const DeleteCustomerSchema = z.object({
  id: z.string().uuid({ message: "Invalid customer ID." }),
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
    id: formData.get('customerId'),
  });

  if (!validatedFields.success) {
    console.error("Validation Error:", validatedFields.error.flatten().fieldErrors);
    return {
      error: "Invalid customer ID provided.",
    };
  }

  const { id } = validatedFields.data;

  console.log(`Attempting to soft delete customer with ID: ${id}`);

  const { error } = await supabase
    .from("customers")
    .update({ deleted_at: new Date().toISOString() }) // Set deleted_at timestamp
    .eq("id", id);

  if (error) {
    console.error("Error soft deleting customer:", error);
    return { error: `Database Error: Failed to delete customer. ${error.message}` };
  }

  console.log(`Customer ${id} soft deleted successfully.`);
  // Explicitly return success before revalidation/redirect
  // Although the client might not receive this due to redirect, it satisfies TS
  const result = { success: true };

  // Revalidate the customers list page cache
  revalidatePath("/customers");

  return result; // Return the success object
}

// New Server Action for creating a customer
export async function createCustomer(data: CustomerFormData) {
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

  // Validate the data again on the server side (optional but recommended)
  const validatedFields = customerFormSchema.safeParse(data);
  if (!validatedFields.success) {
    console.error("Server Validation Error:", validatedFields.error.flatten().fieldErrors);
    return {
      error: "Invalid data provided.",
    };
  }

  // Map validated data to database columns
  const customerData = {
    company_contact_name: validatedFields.data.company_contact_name,
    email: validatedFields.data.email,
    phone: validatedFields.data.phone || null,
    preferred_currency: validatedFields.data.preferred_currency || 'USD', // Default to USD if not provided
    address: validatedFields.data.address,
    notes: validatedFields.data.notes || null,
  };

  const { error } = await supabase
    .from('customers')
    .insert([customerData]);

  if (error) {
    console.error('Error inserting customer:', error);
    return { error: `Failed to create customer: ${error.message}` };
  }

  // On success:
  revalidatePath('/customers'); // Revalidate the list page
  redirect('/customers'); // Redirect to the list page
  // Note: redirect() throws an error, so code after it won't run,
  // hence no explicit { success: true } return is needed here for the client.

}