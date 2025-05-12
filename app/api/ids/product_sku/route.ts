import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

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

export async function GET() {
  const cookieStore = await cookies(); // Added await here
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

  for (let i = 0; i < MAX_RETRIES; i++) {
    const randomCode = generateRandomCode();
    const potentialSku = `${SKU_PREFIX}${randomCode}`;

    const { data, error } = await supabase
      .from('products')
      .select('sku')
      .eq('sku', potentialSku)
      .maybeSingle();

    if (error) {
      console.error('Error checking SKU uniqueness:', error);
      return NextResponse.json({ error: 'Database error while checking SKU uniqueness' }, { status: 500 });
    }

    if (!data) { // SKU is unique
      return NextResponse.json({ sku: potentialSku });
    }
    // If data is found, SKU already exists, loop will retry
  }

  console.error('Failed to generate a unique SKU after multiple retries.');
  return NextResponse.json({ error: 'Failed to generate a unique SKU' }, { status: 500 });
}