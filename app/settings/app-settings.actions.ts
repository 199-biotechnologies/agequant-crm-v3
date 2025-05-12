'use server';

import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { revalidatePath } from 'next/cache';
import {
  ALLOWED_CURRENCIES,
  type AppSettings,
  AppSettingsFormSchema,
  type ActionResponseState,
} from './types';

export async function getSupabaseClient(cookieStoreInstance: ReturnType<typeof cookies>) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: async (name: string) => {
          // If cookieStoreInstance.get() is (or is typed as) a Promise
          const cookie = await cookieStoreInstance.get(name);
          return cookie?.value;
        },
        set: async (name: string, value: string, options: CookieOptions) => {
          try {
            await cookieStoreInstance.set(name, value, options);
          } catch (_) {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
        remove: async (name: string, options: CookieOptions) => {
          try {
            await cookieStoreInstance.set(name, '', options);
          } catch (_) {
            // The `delete` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
};

export async function getAppSettings(): Promise<AppSettings | null> {
  const cookieStore = cookies(); // This is synchronous
  // const supabase = getSupabaseClient(cookieStore); // Bypass helper for this function

  // Direct inlining of createServerClient
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set(name, value, options);
          } catch (_) {
            // Ignore if called from Server Component
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set(name, '', options);
          } catch (_) {
            // Ignore if called from Server Component
          }
        },
      },
    }
  );

  const { data, error } = await supabase.from('app_settings').select('*').limit(1).single();
  if (error) {
    console.error('Error fetching app settings:', error.message);
    return null;
  }
  return data;
}

export async function updateAppSettings(
  prevState: ActionResponseState<AppSettings, typeof AppSettingsFormSchema>,
  formData: FormData
): Promise<ActionResponseState<AppSettings, typeof AppSettingsFormSchema>> {
  const cookieStore = cookies(); // This is synchronous
  const supabase = getSupabaseClient(cookieStore);
  const rawFormData: { [key: string]: string | File } = {};
  formData.forEach((value, key) => { rawFormData[key] = value; });
  const validatedFields = AppSettingsFormSchema.safeParse(rawFormData);

  if (!validatedFields.success) {
    return { success: false, error: 'Invalid data provided.', fieldErrors: validatedFields.error.flatten().fieldErrors };
  }
  const currentSettings = await getAppSettings();
  if (!currentSettings) {
    return { success: false, error: 'Application settings not found.' };
   }
   const { data, error } = await supabase.from('app_settings').update(validatedFields.data).eq('id', currentSettings.id).select().single();
  if (error) {
    return { success: false, error: `Database Error: ${error.message}` };
  }
  revalidatePath('/settings/defaults');
  return { success: true, data: data ?? undefined };
 }

export async function getSystemBaseCurrency(): Promise<typeof ALLOWED_CURRENCIES[number] | null> {
   const settings = await getAppSettings();
   return settings?.base_currency ?? null;
}
export async function getDefaultTaxPercentage(): Promise<number | null> {
  const settings = await getAppSettings();
  return settings?.default_tax_percentage ?? null;
}
export async function getDefaultQuoteExpiryDays(): Promise<number | null> {
  const settings = await getAppSettings();
  return settings?.default_quote_expiry_days ?? null;
}
export async function getDefaultInvoicePaymentTermsDays(): Promise<number | null> {
  const settings = await getAppSettings();
  return settings?.default_invoice_payment_terms_days ?? null;
}
export async function getDefaultQuoteNotes(): Promise<string | null> {
  const settings = await getAppSettings();
  return settings?.default_quote_notes ?? null;
}
export async function getDefaultInvoiceNotes(): Promise<string | null> {
  const settings = await getAppSettings();
  return settings?.default_invoice_notes ?? null;
}
