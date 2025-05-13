"use server";

import { revalidatePath } from "next/cache";
import { redirect } from 'next/navigation';
import { z } from "zod";
import { getServerSupabaseClient } from '@/lib/supabase/server-client';
import { customerFormSchema } from "@/components/customers/customer-form-schema";
import { handleValidationError, handleDatabaseError, ErrorResponse } from '@/lib/utils/error-handler';

// Schema for validating the public customer ID (short code)
const DeleteCustomerSchema = z.object({
  publicCustomerId: z.string().min(1, { message: "Customer ID is required." }),
});

/**
 * Soft deletes a customer by marking it as deleted
 * 
 * @param formData - Form data containing the customer ID to delete
 * @returns Success or error response
 */
export async function deleteCustomer(formData: FormData): Promise<ErrorResponse | { success: true }> {
  const supabase = await getServerSupabaseClient();

  // Validate the customer ID
  const validatedFields = DeleteCustomerSchema.safeParse({
    publicCustomerId: formData.get('publicCustomerId'),
  });

  if (!validatedFields.success) {
    return handleValidationError(validatedFields.error, 'customer');
  }

  const { publicCustomerId } = validatedFields.data;

  // 1. Fetch the customer by public_customer_id to get its internal UUID id
  const { data: customer, error: fetchError } = await supabase
    .from('customers')
    .select('id, company_contact_name')
    .eq('public_customer_id', publicCustomerId)
    .single();

  if (fetchError || !customer) {
    return handleDatabaseError(fetchError, 'find', 'customer', { 
      publicCustomerId,
      operation: 'delete' // Add context about the operation
    });
  }

  const internalId = customer.id;
  console.log(`Attempting to soft delete customer with public ID: ${publicCustomerId} (Internal UUID: ${internalId}, Name: ${customer.company_contact_name})`);

  // 2. Perform the soft delete using the internal UUID id
  const { error: deleteError } = await supabase
    .from("customers")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", internalId);

  if (deleteError) {
    return handleDatabaseError(deleteError, 'delete', 'customer', {
      publicCustomerId,
      internalId,
      customerName: customer.company_contact_name
    });
  }

  console.log(`Customer with public ID ${publicCustomerId} (Name: ${customer.company_contact_name}) soft deleted successfully.`);
  
  // Revalidate the customers list page cache
  revalidatePath("/customers");

  return { success: true };
}

/**
 * Updates an existing customer
 * 
 * @param publicCustomerId - Public ID of the customer to update
 * @param formData - Form data with updated customer information
 * @returns Success or error response
 */
export async function updateCustomer(
  publicCustomerId: string, 
  formData: FormData
): Promise<ErrorResponse | void> {
  try {
    // Validate publicCustomerId
    if (!publicCustomerId || typeof publicCustomerId !== 'string') {
      return { 
        error: "Invalid Customer ID provided for update.",
        type: ErrorType.VALIDATION,
        severity: ErrorSeverity.WARNING,
        help: "The customer ID appears to be invalid. Please try again with a valid customer."
      };
    }

    const supabase = await getServerSupabaseClient();

    // Extract data from FormData and validate using the schema
    const rawFormData = Object.fromEntries(formData.entries());
    const validatedFields = customerFormSchema.safeParse(rawFormData);

    if (!validatedFields.success) {
      return handleValidationError(validatedFields.error, 'customer');
    }

    // 1. Fetch customer by publicCustomerId to get internal UUID
    const { data: existingCustomer, error: fetchErr } = await supabase
      .from('customers')
      .select('id')
      .eq('public_customer_id', publicCustomerId)
      .single();

    if (fetchErr || !existingCustomer) {
      return handleDatabaseError(fetchErr, 'find', 'customer', {
        publicCustomerId,
        operation: 'update'
      });
    }
    
    const internalId = existingCustomer.id;

    // 2. Prepare data for update (handle optional fields)
    const customerData = {
      company_contact_name: validatedFields.data.company_contact_name,
      email: validatedFields.data.email || null,
      phone: validatedFields.data.phone || null,
      preferred_currency: validatedFields.data.preferred_currency || null,
      address: validatedFields.data.address || null,
      notes: validatedFields.data.notes || null,
    };

    // 3. Perform the update using the internal UUID id
    const { error: updateError } = await supabase
      .from('customers')
      .update(customerData)
      .eq('id', internalId);

    if (updateError) {
      return handleDatabaseError(updateError, 'update', 'customer', {
        publicCustomerId,
        internalId,
        customerName: customerData.company_contact_name
      });
    }

    // On success:
    revalidatePath('/customers');
    revalidatePath(`/customers/${publicCustomerId}`);
    revalidatePath(`/customers/${publicCustomerId}/edit`);
    redirect('/customers');
  } catch (error) {
    // Handle unexpected errors (network errors, etc.)
    return handleApiError(error, 'Updating customer', {
      publicCustomerId,
      formData: Object.fromEntries(formData.entries())
    });
  }
}

/**
 * Creates a new customer
 * 
 * @param formData - Form data containing customer information
 * @returns Success or error response
 */
export async function createCustomer(formData: FormData): Promise<ErrorResponse | void> {
  const supabase = await getServerSupabaseClient();

  try {
    // Extract data from FormData and validate using the schema
    const rawFormData = Object.fromEntries(formData.entries());
    const validatedFields = customerFormSchema.safeParse(rawFormData);
    
    if (!validatedFields.success) {
      return handleValidationError(validatedFields.error, 'customer');
    }

    // Map validated data to database columns
    const customerData = {
      company_contact_name: validatedFields.data.company_contact_name,
      email: validatedFields.data.email || null,
      phone: validatedFields.data.phone || null,
      preferred_currency: validatedFields.data.preferred_currency || 'USD', // Default to USD
      address: validatedFields.data.address || null,
      notes: validatedFields.data.notes || null,
    };

    const { error } = await supabase
      .from('customers')
      .insert([customerData]);

    if (error) {
      return handleDatabaseError(error, 'create', 'customer', {
        companyName: customerData.company_contact_name,
        email: customerData.email
      });
    }

    // On success:
    revalidatePath('/customers');
    redirect('/customers');
  } catch (error) {
    // Handle unexpected errors (network errors, etc.)
    return handleApiError(error, 'Creating customer', {
      formData: Object.fromEntries(formData.entries())
    });
  }
}