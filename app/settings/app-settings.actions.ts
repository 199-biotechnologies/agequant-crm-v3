'use server';

import { revalidatePath } from 'next/cache';
import { getServerSupabaseClient } from '@/lib/supabase/server-client';
import {
  type AppSettings,
  AppSettingsFormSchema,
} from './types';
import { handleValidationError, handleDatabaseError, ErrorResponse } from '@/lib/utils/error-handler';

/**
 * Retrieves application settings from the database
 * 
 * @returns The application settings or null if not found
 */
export async function getAppSettings(): Promise<AppSettings | null> {
  const supabase = await getServerSupabaseClient();

  const { data, error } = await supabase
    .from('app_settings')
    .select('*')
    .single();

  if (error) {
    console.error('Error fetching app settings:', error);
    return null;
  }

  return data;
}

/**
 * Updates application settings
 * 
 * @param formData - Form data containing settings to update
 * @returns Success or error response
 */
export async function updateAppSettings(
  formData: FormData
): Promise<ErrorResponse | { success: true }> {
  const supabase = await getServerSupabaseClient();

  // Parse and validate form data
  const rawFormData = Object.fromEntries(formData.entries());
  
  // Convert string numbers to actual numbers
  if (rawFormData.default_tax_percentage) {
    rawFormData.default_tax_percentage = parseFloat(rawFormData.default_tax_percentage as string);
  }
  if (rawFormData.default_quote_expiry_days) {
    rawFormData.default_quote_expiry_days = parseInt(rawFormData.default_quote_expiry_days as string, 10);
  }
  if (rawFormData.default_invoice_payment_terms_days) {
    rawFormData.default_invoice_payment_terms_days = parseInt(
      rawFormData.default_invoice_payment_terms_days as string, 10
    );
  }

  // Validate with schema
  const validatedFields = AppSettingsFormSchema.safeParse(rawFormData);
  if (!validatedFields.success) {
    return handleValidationError(validatedFields.error, 'app settings');
  }

  // Get current settings to check if they exist
  const { data: existingSettings, error: fetchError } = await supabase
    .from('app_settings')
    .select('id, base_currency')
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = not found
    return handleDatabaseError(fetchError, 'fetch', 'app settings');
  }

  // Prepare settings data
  const settingsData = {
    base_currency: validatedFields.data.base_currency,
    default_tax_percentage: validatedFields.data.default_tax_percentage,
    default_quote_expiry_days: validatedFields.data.default_quote_expiry_days,
    default_invoice_payment_terms_days: validatedFields.data.default_invoice_payment_terms_days,
  };

  // Insert or update settings
  if (existingSettings) {
    // Update existing settings
    const { error: updateError } = await supabase
      .from('app_settings')
      .update(settingsData)
      .eq('id', existingSettings.id);

    if (updateError) {
      return handleDatabaseError(updateError, 'update', 'app settings');
    }
  } else {
    // Create new settings
    const { error: insertError } = await supabase
      .from('app_settings')
      .insert([settingsData]);

    if (insertError) {
      return handleDatabaseError(insertError, 'create', 'app settings');
    }
  }

  // Check if base currency is being changed and warn about potential impacts
  if (existingSettings && existingSettings.base_currency !== validatedFields.data.base_currency) {
    console.warn(
      `Base currency changed from ${existingSettings.base_currency} to ${validatedFields.data.base_currency}. ` +
      'This may affect existing product pricing.'
    );
  }

  revalidatePath('/settings');
  revalidatePath('/settings/defaults');

  return { success: true };
}

/**
 * Gets the system base currency
 * 
 * @returns The base currency or null if not set
 */
export async function getSystemBaseCurrency(): Promise<string | null> {
  const settings = await getAppSettings();
  return settings?.base_currency || null;
}

/**
 * Gets the default tax percentage
 * 
 * @returns The default tax percentage or 0 if not set
 */
export async function getDefaultTaxPercentage(): Promise<number> {
  const settings = await getAppSettings();
  return settings?.default_tax_percentage || 0;
}

/**
 * Gets the default quote expiry days
 * 
 * @returns The default quote expiry days or 30 if not set
 */
export async function getDefaultQuoteExpiryDays(): Promise<number> {
  const settings = await getAppSettings();
  return settings?.default_quote_expiry_days || 30;
}

/**
 * Gets the default invoice payment terms days
 * 
 * @returns The default invoice payment terms days or 30 if not set
 */
export async function getDefaultInvoicePaymentTermsDays(): Promise<number> {
  const settings = await getAppSettings();
  return settings?.default_invoice_payment_terms_days || 30;
}