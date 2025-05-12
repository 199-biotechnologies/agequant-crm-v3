'use server';
import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export async function performTestSupabaseInit() {
  console.log('Attempting to initialize Supabase client in test action...');
  const cookieStore = cookies(); // Synchronous call

  try {
    // Attempt to access a method to see if TypeScript complains here
    const testCookieValue = cookieStore.get('any_cookie_name_for_test');
    console.log('Successfully called cookieStore.get() directly. Value:', testCookieValue);

    // Initialize the Supabase client
    const _supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set(name, value, options);
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.set(name, '', options);
          },
        },
      }
    );
    console.log('Supabase client initialized successfully in test action.');
    
    // Optional: Test a simple query
    // const { data, error } = await supabase.from('app_settings').select('id').limit(1);
    // if(error) console.error("Test query error:", error.message); else console.log("Test query data:", data);

    return { success: true, message: "Test client initialized." };
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    console.error("Error in performTestSupabaseInit:", errorMessage);
    return { success: false, error: errorMessage };
  }
}
