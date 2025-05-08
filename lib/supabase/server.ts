// lib/supabase/server.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Attempting to await cookies() before use
export function createClient() {
  const cookieStore = cookies() // Get the cookie store instance

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // Make the handlers async to await cookieStore operations if needed
        // Although get/set on the store itself might be synchronous after initial await
        get: async (name: string) => {
          // Await might not be needed here if cookieStore is resolved, but doesn't hurt
          // const store = await cookieStore;
          return cookieStore.get(name)?.value
        },
        set: async (name: string, value: string, options: CookieOptions) => {
          try {
            // const store = await cookieStore;
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // Ignore errors if called from Server Component
          }
        },
        remove: async (name: string, options: CookieOptions) => {
          try {
            // const store = await cookieStore;
            cookieStore.set({ name, value: '', ...options }) // Use set with empty value
          } catch (error) {
            // Ignore errors if called from Server Component
          }
        },
      },
    }
  )
}