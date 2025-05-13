'use server';

import { revalidatePath } from 'next/cache';
import { getServerSupabaseClient } from '@/lib/supabase/server-client';
import {
  type ActionResponseState,
  type PaymentSource,
  PaymentSourceFormSchema,
} from './types';
import { handleValidationError, handleDatabaseError } from '@/lib/utils/error-handler';

/**
 * Creates a new payment source
 *
 * @param formData - Form data for the payment source
 * @returns Success response with created data or error response
 */
export async function createPaymentSource(
  formData: FormData
): Promise<ActionResponseState<PaymentSource, typeof PaymentSourceFormSchema>> {
  const supabase = await getServerSupabaseClient();

  // Parse form data
  const rawFormData: { [key: string]: string | boolean } = {};
  formData.forEach((value, key) => {
    rawFormData[key] = key === 'is_primary_for_entity' ? value === 'on' : value;
  });

  // Validate the data
  const validatedFields = PaymentSourceFormSchema.safeParse(rawFormData);
  if (!validatedFields.success) {
    return {
      success: false,
      ...handleValidationError(validatedFields.error, 'payment source')
    };
  }

  const { is_primary_for_entity, issuing_entity_id, ...sourceData } = validatedFields.data;
  try {
    // If this is primary, unset other primary payment sources for this entity
    if (is_primary_for_entity) {
      const { error: unsetPrimaryError } = await supabase
        .from('payment_sources')
        .update({ is_primary_for_entity: false })
        .eq('issuing_entity_id', issuing_entity_id)
        .eq('is_primary_for_entity', true);

      if (unsetPrimaryError) {
        return {
          success: false,
          ...handleDatabaseError(unsetPrimaryError, 'update', 'payment source')
        };
      }
    }

    // Insert the new payment source
    const { data, error: insertError } = await supabase
      .from('payment_sources')
      .insert([{ ...sourceData, issuing_entity_id, is_primary_for_entity }])
      .select()
      .single();

    if (insertError) {
      return {
        success: false,
        ...handleDatabaseError(insertError, 'create', 'payment source')
      };
    }

    revalidatePath('/settings/payment-sources');
    return { success: true, data: data ?? undefined };
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    return {
      success: false,
      error: `An unexpected error occurred: ${errorMessage}`
    };
  }
}

/**
 * Retrieves payment sources with optional filtering by issuing entity
 *
 * @param entityId - Optional issuing entity ID to filter by
 * @returns Array of payment sources
 */
export async function getPaymentSources(entityId?: string): Promise<PaymentSource[]> {
  const supabase = await getServerSupabaseClient();

  let query = supabase.from('payment_sources').select('*');
  if (entityId) {
    query = query.eq('issuing_entity_id', entityId);
  }
  query = query.order('name', { ascending: true });

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching payment sources:', error.message);
    return [];
  }

  return data || [];
}

/**
 * Retrieves a payment source by its ID
 *
 * @param id - Payment source ID
 * @returns Payment source or null if not found
 */
export async function getPaymentSourceById(id: string): Promise<PaymentSource | null> {
  if (!id) return null;

  const supabase = await getServerSupabaseClient();
  const { data, error } = await supabase
    .from('payment_sources')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error(`Error fetching payment source by ID (${id}):`, error.message);
    return null;
  }

  return data;
}

/**
 * Updates an existing payment source
 *
 * @param id - Payment source ID to update
 * @param formData - Form data with updated values
 * @returns Success response with updated data or error response
 */
export async function updatePaymentSource(
  id: string,
  formData: FormData
): Promise<ActionResponseState<PaymentSource, typeof PaymentSourceFormSchema>> {
  if (!id) {
    return {
      success: false,
      error: 'Payment source ID is required for an update.'
    };
  }

  const supabase = await getServerSupabaseClient();

  // Parse form data
  const rawFormData: { [key: string]: string | boolean } = {};
  formData.forEach((value, key) => {
    rawFormData[key] = key === 'is_primary_for_entity' ? value === 'on' : value;
  });

  // Validate the data
  const validatedFields = PaymentSourceFormSchema.safeParse(rawFormData);
  if (!validatedFields.success) {
    return {
      success: false,
      ...handleValidationError(validatedFields.error, 'payment source')
    };
  }

  const { is_primary_for_entity, issuing_entity_id, ...sourceData } = validatedFields.data;
  try {
    // If this is primary, unset other primary payment sources for this entity
    if (is_primary_for_entity) {
      const { error: unsetPrimaryError } = await supabase
        .from('payment_sources')
        .update({ is_primary_for_entity: false })
        .eq('issuing_entity_id', issuing_entity_id)
        .eq('is_primary_for_entity', true)
        .neq('id', id);

      if (unsetPrimaryError) {
        return {
          success: false,
          ...handleDatabaseError(unsetPrimaryError, 'update', 'payment source')
        };
      }
    }

    // Update the payment source
    const { data, error: updateError } = await supabase
      .from('payment_sources')
      .update({ ...sourceData, issuing_entity_id, is_primary_for_entity })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return {
        success: false,
        ...handleDatabaseError(updateError, 'update', 'payment source')
      };
    }

    revalidatePath('/settings/payment-sources');
    return { success: true, data: data ?? undefined };
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    return {
      success: false,
      error: `An unexpected error occurred: ${errorMessage}`
    };
  }
}

/**
 * Deletes a payment source
 *
 * @param id - Payment source ID to delete
 * @returns Success response or error response
 */
export async function deletePaymentSource(id: string): Promise<{ success: boolean; error?: string }> {
  if (!id) {
    return {
      success: false,
      error: 'Payment source ID is required for deletion.'
    };
  }

  const supabase = await getServerSupabaseClient();
  const { error } = await supabase
    .from('payment_sources')
    .delete()
    .eq('id', id);

  if (error) {
    const errorResponse = handleDatabaseError(error, 'delete', 'payment source');
    return { success: false, error: errorResponse.error };
  }

  revalidatePath('/settings/payment-sources');
  return { success: true };
}
