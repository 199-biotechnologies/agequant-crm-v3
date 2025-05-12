'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
// No uuid needed for payment sources unless they also get file uploads
import { getSupabaseClient } from './app-settings.actions'; // Import the shared client
import {
  type ActionResponseState,
  type PaymentSource,
  PaymentSourceFormSchema,
} from './types';

export async function createPaymentSource(
  formData: FormData
): Promise<ActionResponseState<PaymentSource, typeof PaymentSourceFormSchema>> {
  const cookieStore = cookies();
  const supabase = getSupabaseClient(cookieStore);
  const rawFormData: { [key: string]: string | boolean } = {};
  formData.forEach((value, key) => { rawFormData[key] = key === 'is_primary_for_entity' ? value === 'on' : value; });
  
  const validatedFields = PaymentSourceFormSchema.safeParse(rawFormData);
  if (!validatedFields.success) {
    return { success: false, error: 'Invalid data provided.', fieldErrors: validatedFields.error.flatten().fieldErrors };
  }

  const { is_primary_for_entity, issuing_entity_id, ...sourceData } = validatedFields.data;
  try {
    if (is_primary_for_entity) {
      const { error: unsetPrimaryError } = await supabase.from('payment_sources').update({ is_primary_for_entity: false }).eq('issuing_entity_id', issuing_entity_id).eq('is_primary_for_entity', true);
      if (unsetPrimaryError) return { success: false, error: `Database Error: ${unsetPrimaryError.message}` };
     }
     const { data, error: insertError } = await supabase.from('payment_sources').insert([{ ...sourceData, issuing_entity_id, is_primary_for_entity }]).select().single();
     if (insertError) return { success: false, error: `Database Error: ${insertError.message}` };
    revalidatePath('/settings/payment-sources');
    return { success: true, data: data ?? undefined };
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    return { success: false, error: `An unexpected error occurred: ${errorMessage}` };
  }
}

export async function getPaymentSources(entityId?: string): Promise<PaymentSource[]> {
  const cookieStore = cookies();
  const supabase = getSupabaseClient(cookieStore);
  let query = supabase.from('payment_sources').select('*');
  if (entityId) query = query.eq('issuing_entity_id', entityId);
  query = query.order('name', { ascending: true });
  const { data, error } = await query;
  if (error) { console.error('Error fetching payment sources:', error.message); return []; }
  return data || [];
}

export async function getPaymentSourceById(id: string): Promise<PaymentSource | null> {
  if (!id) return null;
  const cookieStore = cookies();
  const supabase = getSupabaseClient(cookieStore);
   const { data, error } = await supabase.from('payment_sources').select('*').eq('id', id).single();
   if (error) { console.error(`Error fetching payment source by ID (${id}):`, error.message); return null; }
  return data;
}

export async function updatePaymentSource(
  id: string,
  formData: FormData
): Promise<ActionResponseState<PaymentSource, typeof PaymentSourceFormSchema>> {
  if (!id) return { success: false, error: 'Payment source ID is required for an update.' };
  const cookieStore = cookies();
  const supabase = getSupabaseClient(cookieStore);
  const rawFormData: { [key: string]: string | boolean } = {};
  formData.forEach((value, key) => { rawFormData[key] = key === 'is_primary_for_entity' ? value === 'on' : value; });
  
  const validatedFields = PaymentSourceFormSchema.safeParse(rawFormData);
  if (!validatedFields.success) {
    return { success: false, error: 'Invalid data provided.', fieldErrors: validatedFields.error.flatten().fieldErrors };
  }

  const { is_primary_for_entity, issuing_entity_id, ...sourceData } = validatedFields.data;
  try {
    if (is_primary_for_entity) {
      const { error: unsetPrimaryError } = await supabase.from('payment_sources').update({ is_primary_for_entity: false }).eq('issuing_entity_id', issuing_entity_id).eq('is_primary_for_entity', true).neq('id', id);
      if (unsetPrimaryError) return { success: false, error: `Database Error: ${unsetPrimaryError.message}` };
      }
      const { data, error: updateError } = await supabase.from('payment_sources').update({ ...sourceData, issuing_entity_id, is_primary_for_entity }).eq('id', id).select().single();
     if (updateError) return { success: false, error: `Database Error: ${updateError.message}` };
    revalidatePath('/settings/payment-sources');
    return { success: true, data: data ?? undefined };
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    return { success: false, error: `An unexpected error occurred: ${errorMessage}` };
  }
}

export async function deletePaymentSource(id: string): Promise<{ success: boolean; error?: string }> {
  if (!id) return { success: false, error: 'Payment source ID is required for deletion.' };
  const cookieStore = cookies();
  const supabase = getSupabaseClient(cookieStore);
  const { error } = await supabase.from('payment_sources').delete().eq('id', id);
  if (error) return { success: false, error: `Database Error: ${error.message}` };
  revalidatePath('/settings/payment-sources');
  return { success: true };
}
