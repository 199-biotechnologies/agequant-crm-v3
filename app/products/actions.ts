"use server";

 import { revalidatePath } from "next/cache";
 import { cookies } from 'next/headers';
  import { createServerClient, type CookieOptions } from '@supabase/ssr';
  import { redirect } from 'next/navigation';
  import { productFormSchema, type ProductFormData } from "@/components/products/product-form-schema"; // Re-added ProductFormData
 import { getSystemBaseCurrency } from "@/app/settings/actions"; // Import settings action

 // Placeholder for the actual base URL of the app
const APP_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function createProduct(formData: FormData) {
  const cookieStore = await cookies();
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

  // 1. Get a unique SKU
  let sku = '';
  try {
    const skuResponse = await fetch(`${APP_BASE_URL}/api/ids/product_sku`);
    if (!skuResponse.ok) {
      const errorData = await skuResponse.json();
      console.error('Error fetching SKU:', errorData);
      return { error: `Failed to generate SKU: ${errorData.error || skuResponse.statusText}` };
    }
    const skuData = await skuResponse.json();
    sku = skuData.sku;
  } catch (e) {
    console.error('Network or other error fetching SKU:', e);
    return { error: 'Failed to generate SKU due to network error.' };
  }

  if (!sku) {
    return { error: 'Could not retrieve a unique SKU.' };
  }

   // 2. Validate formData
   // FormData needs careful parsing for nested arrays like additional_prices
   // eslint-disable-next-line @typescript-eslint/no-explicit-any
   const rawFormData: Record<string, any> = {}; 
   const additionalPricesRaw: { currency_code?: string; price?: string }[] = [];

   formData.forEach((value, key) => {
    const match = key.match(/additional_prices\[(\d+)\]\.(currency_code|price)/);
    if (match) {
      const index = parseInt(match[1], 10);
      const field = match[2];
      if (!additionalPricesRaw[index]) {
        additionalPricesRaw[index] = {};
      }
      additionalPricesRaw[index][field as 'currency_code' | 'price'] = value as string;
    } else {
      rawFormData[key] = value;
   }
 });
  
  const parsedFormData: {
    base_price?: number;
    additional_prices?: { currency_code?: string; price?: number }[];
    [key: string]: any; // To allow other properties from rawFormData
  } = {
    ...rawFormData,
    base_price: rawFormData.base_price ? parseFloat(rawFormData.base_price as string) : undefined,
    additional_prices: additionalPricesRaw
      .filter(ap => ap && (ap.currency_code || ap.price)) // Filter out potentially empty array entries
      .map(ap => ({
        currency_code: ap.currency_code,
        price: ap.price ? parseFloat(ap.price) : undefined,
      })),
  };

  const validatedFields = productFormSchema.safeParse(parsedFormData);

  if (!validatedFields.success) {
    console.error("Server Validation Error (Create Product):", validatedFields.error.flatten().fieldErrors);
    // TODO: Improve error feedback to the form, potentially returning fieldErrors
     return { error: "Invalid product data. Please check the fields." , fieldErrors: validatedFields.error.flatten().fieldErrors};
   }
  
   // eslint-disable-next-line @typescript-eslint/no-explicit-any
   const { additional_prices, ...productData } = validatedFields.data as ProductFormData;

   // Fetch base currency for validation
   const baseCurrency = await getSystemBaseCurrency();
   if (!baseCurrency) {
     // This should ideally not happen if settings are configured, but handle defensively
     return { error: "System base currency is not configured. Cannot validate additional prices." };
   }

   // Validate additional prices against base currency
   const validAdditionalPrices = (additional_prices || []).filter(ap => ap.currency_code !== baseCurrency);
   if (additional_prices && validAdditionalPrices.length !== additional_prices.length) {
     // Return an error if any additional price matched the base currency
     return {
       error: `Additional prices cannot use the system base currency (${baseCurrency}). Please remove or change the currency for the affected price(s).`,
       fieldErrors: { additional_prices: [`Cannot use base currency (${baseCurrency}) for additional prices.`] } // Basic field error
     };
   }


   // 3. Insert main product data
  const { data: newProduct, error: insertError } = await supabase
    .from('products')
    .insert([{
      sku: sku,
      name: productData.name,
      unit: productData.unit,
      base_price: productData.base_price,
      status: productData.status,
      description: productData.description || null, // Ensure null if empty
    }])
    .select()
    .single();

  if (insertError || !newProduct) {
    console.error('Error inserting product:', insertError);
    if (insertError?.message.includes('duplicate key value violates unique constraint "products_sku_key"')) {
        return { error: `Database Error: SKU ${sku} already exists. This should not happen if SKU generation is correct.` };
    }
    return { error: `Database Error: Failed to create product. ${insertError?.message}` };
  }
 
   // 4. Handle VALID additional_prices
   if (validAdditionalPrices.length > 0) {
     const pricesToInsert = validAdditionalPrices.map(ap => ({
       product_id: newProduct.id,
       currency_code: ap.currency_code, // currency_code should be defined here due to schema validation
      price: ap.price,
    }));
    const { error: additionalPricesError } = await supabase
      .from('product_additional_prices')
      .insert(pricesToInsert);
    if (additionalPricesError) {
      console.error('Error inserting additional prices:', additionalPricesError);
      // Potentially rollback product creation or log this as a partial success/failure
      // For now, we'll return an error indicating partial success.
      return {
        error: `Product created (SKU: ${sku}), but failed to add some/all additional prices: ${additionalPricesError.message}. Please edit the product to verify prices.`,
        createdSku: sku // So user can find the product
      };
    }
  }

  revalidatePath('/products');
  redirect('/products');
  // No explicit success return needed due to redirect
}

export async function updateProduct(sku: string, formData: FormData) {
  const cookieStore = await cookies();
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

  if (!sku) {
    return { error: "SKU is required for updating a product." };
  }

   // Parse FormData for validation
   // eslint-disable-next-line @typescript-eslint/no-explicit-any
   const rawFormData: Record<string, any> = {};
   const additionalPricesRaw: { currency_code?: string; price?: string }[] = [];
   formData.forEach((value, key) => {
     const match = key.match(/additional_prices\[(\d+)\]\.(currency_code|price)/);
    if (match) {
      const index = parseInt(match[1], 10);
      const field = match[2];
      if (!additionalPricesRaw[index]) {
        additionalPricesRaw[index] = {};
      }
      additionalPricesRaw[index][field as 'currency_code' | 'price'] = value as string;
    } else if (key !== 'sku') { // Exclude SKU from form data to be validated by productFormSchema
      rawFormData[key] = value;
   }
 });
  
  const parsedFormData: {
    base_price?: number;
    additional_prices?: { currency_code?: string; price?: number }[];
    [key: string]: any; // To allow other properties from rawFormData
  } = {
    ...rawFormData,
    base_price: rawFormData.base_price ? parseFloat(rawFormData.base_price as string) : undefined,
    additional_prices: additionalPricesRaw
      .filter(ap => ap && (ap.currency_code || typeof ap.price !== 'undefined'))
      .map(ap => ({
        currency_code: ap.currency_code,
        price: ap.price ? parseFloat(ap.price) : undefined,
      })),
  };

  const validatedFields = productFormSchema.safeParse(parsedFormData);

  if (!validatedFields.success) {
    console.error("Server Validation Error (Update Product):", validatedFields.error.flatten().fieldErrors);
     return { error: "Invalid product data. Please check the fields.", fieldErrors: validatedFields.error.flatten().fieldErrors };
   }
  
   // eslint-disable-next-line @typescript-eslint/no-explicit-any
   const { additional_prices, ...productUpdateData } = validatedFields.data as ProductFormData;
 
   // Fetch base currency for validation
   const baseCurrency = await getSystemBaseCurrency();
   if (!baseCurrency) {
     return { error: "System base currency is not configured. Cannot validate additional prices." };
   }
 
   // Validate additional prices against base currency
   const validAdditionalPrices = (additional_prices || []).filter(ap => ap.currency_code !== baseCurrency);
   if (additional_prices && validAdditionalPrices.length !== additional_prices.length) {
     return {
       error: `Additional prices cannot use the system base currency (${baseCurrency}). Please remove or change the currency for the affected price(s).`,
       fieldErrors: { additional_prices: [`Cannot use base currency (${baseCurrency}) for additional prices.`] }
     };
   }
 
    // 1. Fetch product by SKU to get internal UUID
  const { data: existingProduct, error: fetchError } = await supabase
    .from('products')
    .select('id')
    .eq('sku', sku)
    .is('deleted_at', null) // Ensure we are updating a non-deleted product
    .single();

  if (fetchError || !existingProduct) {
    console.error(`Error fetching product with SKU ${sku} for update:`, fetchError);
    return { error: `Product with SKU ${sku} not found or database error.` };
  }
  const productId = existingProduct.id;

  // 2. Update main product data
  const { error: updateError } = await supabase
    .from('products')
    .update({
      name: productUpdateData.name,
      unit: productUpdateData.unit,
      base_price: productUpdateData.base_price,
      status: productUpdateData.status,
      description: productUpdateData.description || null,
      // updated_at is handled by trigger
    })
    .eq('id', productId);

  if (updateError) {
    console.error('Error updating product:', updateError);
    return { error: `Database Error: Failed to update product. ${updateError.message}` };
  }

  // 3. Manage additional_prices: Delete existing and insert new ones
  // This is a simpler strategy than diffing.
  const { error: deleteOldPricesError } = await supabase
    .from('product_additional_prices')
    .delete()
     .eq('product_id', productId);
 
   if (deleteOldPricesError) {
     console.error('Error deleting old additional prices:', deleteOldPricesError);
     return { error: `Product updated, but failed to clear old additional prices: ${deleteOldPricesError.message}` };
   }
 
   // Insert the VALID additional prices
   if (validAdditionalPrices.length > 0) {
     const pricesToInsert = validAdditionalPrices
       // Schema validation already ensures currency_code and price exist if the entry is present
       .map(ap => ({
        product_id: productId,
        currency_code: ap.currency_code,
        price: ap.price,
      }));
    
    if (pricesToInsert.length > 0) {
      const { error: additionalPricesError } = await supabase
        .from('product_additional_prices')
        .insert(pricesToInsert);
      if (additionalPricesError) {
        console.error('Error inserting new additional prices:', additionalPricesError);
        return { error: `Product updated, but failed to add new additional prices: ${additionalPricesError.message}` };
      }
    }
  }

  revalidatePath('/products');
  revalidatePath(`/products/${sku}`); // Revalidate view page
  revalidatePath(`/products/${sku}/edit`); // Revalidate edit page
  redirect(`/products/${sku}`); // Redirect to the product's view page
}

export async function deleteProduct(formData: FormData) {
  const cookieStore = await cookies();
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

  const sku = formData.get('sku') as string;

  if (!sku) {
    console.error("SKU not provided for delete operation.");
    return { error: "SKU is required for deleting a product." };
  }

  // 1. Fetch product by SKU to get internal UUID (optional, but good for confirming existence and logging)
  const { data: existingProduct, error: fetchError } = await supabase
    .from('products')
    .select('id, name') // Select name for logging/confirmation
    .eq('sku', sku)
    .is('deleted_at', null) // Ensure we are deleting a non-deleted product
    .single();

  if (fetchError || !existingProduct) {
    console.error(`Error fetching product with SKU ${sku} for delete:`, fetchError);
    return { error: `Product with SKU ${sku} not found or already deleted.` };
  }
  const productId = existingProduct.id;
  const productName = existingProduct.name;

  // 2. Perform soft delete
  const { error: deleteError } = await supabase
    .from('products')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', productId);

  if (deleteError) {
    console.error(`Error soft deleting product '${productName}' (SKU: ${sku}):`, deleteError);
    return { error: `Database Error: Failed to delete product ${productName} (SKU: ${sku}). ${deleteError.message}` };
  }

  console.log(`Product '${productName}' (SKU: ${sku}) soft deleted successfully.`);
  
  revalidatePath('/products');
  // No redirect needed from action, client-side should handle UI update (e.g., toast, table refresh)
  return { success: true };
}
