import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

/**
 * Creates and returns a Supabase client for server-side operations.
 * This centralizes the client creation logic that was previously duplicated across action files.
 * 
 * @returns A Supabase client configured for server-side use
 */
export async function getServerSupabaseClient() {
  const cookieStore = cookies();
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { 
          return cookieStore.get(name)?.value 
        },
        set(name: string, value: string, options: CookieOptions) { 
          cookieStore.set({ name, value, ...options }) 
        },
        remove(name: string, options: CookieOptions) { 
          cookieStore.set({ name, value: '', ...options }) 
        },
      },
    }
  );
}