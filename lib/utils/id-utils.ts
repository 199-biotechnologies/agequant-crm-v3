"use server"; 

// We will use the type of the client returned by getServerSupabaseClient
import type { getServerSupabaseClient } from '@/lib/supabase/server-client';

// Define the Supabase client type based on what getServerSupabaseClient returns
type AppSupabaseClient = Awaited<ReturnType<typeof getServerSupabaseClient>>;

const SKU_CHARACTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excludes O, I, 0, 1
const SKU_LENGTH = 5;
const SKU_PREFIX = 'PR-';
const MAX_RETRIES = 10; // Max attempts to find a unique SKU

function generateRandomCode(): string {
  let result = '';
  for (let i = 0; i < SKU_LENGTH; i++) {
    result += SKU_CHARACTERS.charAt(Math.floor(Math.random() * SKU_CHARACTERS.length));
  }
  return result;
}

/**
 * Generates a unique product SKU.
 * 
 * @param supabase - A Supabase client instance, expected to be of type AppSupabaseClient.
 * @returns A promise that resolves to an object with the SKU or an error.
 */
export async function generateUniqueProductSku(supabase: AppSupabaseClient): Promise<{ sku?: string; error?: string }> {
  if (!supabase) {
    console.error("Supabase client was not provided to generateUniqueProductSku.");
    return { error: "Supabase client is required for SKU generation." };
  }

  for (let i = 0; i < MAX_RETRIES; i++) {
    const randomCode = generateRandomCode();
    const potentialSku = `${SKU_PREFIX}${randomCode}`;

    const { data, error } = await supabase
      .from('products')
      .select('sku')
      .eq('sku', potentialSku)
      .maybeSingle();

    if (error) {
      console.error('Error checking SKU uniqueness in utility:', error);
      return { error: 'Database error while checking SKU uniqueness.' };
    }

    if (!data) { // SKU is unique
      return { sku: potentialSku };
    }
    // If data is found, SKU already exists, loop will retry
  }

  console.error('Failed to generate a unique SKU after multiple retries in utility.');
  return { error: 'Failed to generate a unique SKU after multiple retries.' };
}
