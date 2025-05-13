"use server";

import { revalidatePath } from "next/cache";
import { redirect } from 'next/navigation';
import { getServerSupabaseClient } from '@/lib/supabase/server-client';
import { productFormSchema } from "@/components/products/product-form-schema";
import { getSystemBaseCurrency } from "@/app/settings/actions"; // Import settings action
import { handleValidationError, handleDatabaseError, ErrorResponse } from '@/lib/utils/error-handler';
 
// Placeholder for the actual base URL of the app
const APP_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

/**
 * Creates a new product in the database
 * 
 * @param formData - Form data for the product
 * @returns Success or error response
 */
export async function createProduct(formData: FormData): Promise<ErrorResponse | void> {
  const supabase = await getServerSupabaseClient();

  try {
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
    const rawFormData: Record<string, any> = {}; 
    
    // Process form entries
    for (const [key, value] of formData.entries()) {
      // Handle nested fields for additional prices
      if (key.startsWith('additional_prices.')) {
        if (!rawFormData.additional_prices) {
          rawFormData.additional_prices = [];
        }
        
        const match = key.match(/additional_prices\.(\d+)\.(.+)/);
        if (match) {
          const index = parseInt(match[1], 10);
          const field = match[2];
          
          // Ensure the entry exists
          while (rawFormData.additional_prices.length <= index) {
            rawFormData.additional_prices.push({});
          }
          
          // For ids, they might be empty strings for new items
          if (field === 'id' && value === '') {
            continue;
          }
          
          // Set the field value, handling number conversion for prices
          if (field === 'price') {
            rawFormData.additional_prices[index][field] = parseFloat(value as string);
          } else {
            rawFormData.additional_prices[index][field] = value;
          }
        }
      } else {
        // Handle direct fields
        rawFormData[key] = value;
      }
    }
    
    // Convert numeric fields
    if (rawFormData.base_price) {
      rawFormData.base_price = parseFloat(rawFormData.base_price);
    }
    
    // Validate the processed data
    const validatedFields = productFormSchema.safeParse(rawFormData);
    if (!validatedFields.success) {
      return handleValidationError(validatedFields.error, 'product');
    }
    
    // 3. Get the system base currency for validation
    const baseCurrency = await getSystemBaseCurrency();
    if (!baseCurrency) {
      return { error: 'System base currency is not set. Please configure it in Settings.' };
    }
    
    // 4. Validate that additional prices aren't in the base currency
    if (validatedFields.data.additional_prices?.length) {
      const hasBaseInAdditional = validatedFields.data.additional_prices.some(
        item => item.currency_code === baseCurrency
      );
      
      if (hasBaseInAdditional) {
        return { 
          error: `Additional prices should not include the system base currency (${baseCurrency}). Use the base price field instead.` 
        };
      }
    }
    
    // 5. Insert the main product
    const productData = {
      sku, // Use the generated SKU
      name: validatedFields.data.name,
      description: validatedFields.data.description,
      unit: validatedFields.data.unit,
      base_price: validatedFields.data.base_price,
      base_currency: baseCurrency, // Always use the system base currency
      status: validatedFields.data.status || 'Active',
    };
    
    const { data: newProduct, error: productError } = await supabase
      .from('products')
      .insert([productData])
      .select('id, sku')
      .single();
    
    if (productError) {
      return handleDatabaseError(productError, 'create', 'product');
    }
    
    // 6. Insert additional prices if any
    if (validatedFields.data.additional_prices?.length) {
      const additionalPrices = validatedFields.data.additional_prices.map(item => ({
        product_id: newProduct.id,
        currency_code: item.currency_code,
        price: item.price,
      }));
      
      const { error: pricesError } = await supabase
        .from('product_additional_prices')
        .insert(additionalPrices);
      
      if (pricesError) {
        return handleDatabaseError(pricesError, 'create', 'product prices');
      }
    }
    
    // 7. Revalidate path and redirect
    revalidatePath('/products');
    redirect(`/products/${newProduct.sku}`);
    
  } catch (error) {
    console.error('Unexpected error creating product:', error);
    return { error: 'An unexpected error occurred while creating the product.' };
  }
}

/**
 * Updates an existing product
 * 
 * @param sku - Product SKU to update
 * @param formData - Form data with updated product information
 * @returns Success or error response
 */
export async function updateProduct(
  sku: string, 
  formData: FormData
): Promise<ErrorResponse | void> {
  if (!sku) {
    return { error: 'Product SKU is required.' };
  }
  
  const supabase = await getServerSupabaseClient();
  
  try {
    // 1. Process formData similar to createProduct
    const rawFormData: Record<string, any> = {}; 
    
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('additional_prices.')) {
        if (!rawFormData.additional_prices) {
          rawFormData.additional_prices = [];
        }
        
        const match = key.match(/additional_prices\.(\d+)\.(.+)/);
        if (match) {
          const index = parseInt(match[1], 10);
          const field = match[2];
          
          while (rawFormData.additional_prices.length <= index) {
            rawFormData.additional_prices.push({});
          }
          
          if (field === 'id' && value === '') {
            continue;
          }
          
          if (field === 'price') {
            rawFormData.additional_prices[index][field] = parseFloat(value as string);
          } else {
            rawFormData.additional_prices[index][field] = value;
          }
        }
      } else {
        rawFormData[key] = value;
      }
    }
    
    if (rawFormData.base_price) {
      rawFormData.base_price = parseFloat(rawFormData.base_price);
    }
    
    // 2. Validate the processed data
    const validatedFields = productFormSchema.safeParse(rawFormData);
    if (!validatedFields.success) {
      return handleValidationError(validatedFields.error, 'product');
    }
    
    // 3. Get system base currency
    const baseCurrency = await getSystemBaseCurrency();
    if (!baseCurrency) {
      return { error: 'System base currency is not set. Please configure it in Settings.' };
    }
    
    // 4. Validate additional prices don't include base currency
    if (validatedFields.data.additional_prices?.length) {
      const hasBaseInAdditional = validatedFields.data.additional_prices.some(
        item => item.currency_code === baseCurrency
      );
      
      if (hasBaseInAdditional) {
        return { 
          error: `Additional prices should not include the system base currency (${baseCurrency}). Use the base price field instead.` 
        };
      }
    }
    
    // 5. Get the product ID from SKU
    const { data: existingProduct, error: fetchError } = await supabase
      .from('products')
      .select('id')
      .eq('sku', sku)
      .single();
    
    if (fetchError || !existingProduct) {
      return handleDatabaseError(fetchError, 'find', 'product');
    }
    
    const productId = existingProduct.id;
    
    // 6. Update the main product
    const productData = {
      name: validatedFields.data.name,
      description: validatedFields.data.description,
      unit: validatedFields.data.unit,
      base_price: validatedFields.data.base_price,
      status: validatedFields.data.status,
      // Not updating SKU or base_currency
    };
    
    const { error: updateError } = await supabase
      .from('products')
      .update(productData)
      .eq('id', productId);
    
    if (updateError) {
      return handleDatabaseError(updateError, 'update', 'product');
    }
    
    // 7. Handle additional prices (delete existing and insert new)
    
    // Delete existing prices
    const { error: deleteError } = await supabase
      .from('product_additional_prices')
      .delete()
      .eq('product_id', productId);
    
    if (deleteError) {
      return handleDatabaseError(deleteError, 'delete', 'existing product prices');
    }
    
    // Insert new prices if any
    if (validatedFields.data.additional_prices?.length) {
      const additionalPrices = validatedFields.data.additional_prices.map(item => ({
        product_id: productId,
        currency_code: item.currency_code,
        price: item.price,
      }));
      
      const { error: insertError } = await supabase
        .from('product_additional_prices')
        .insert(additionalPrices);
      
      if (insertError) {
        return handleDatabaseError(insertError, 'create', 'updated product prices');
      }
    }
    
    // 8. Revalidate and redirect
    revalidatePath('/products');
    revalidatePath(`/products/${sku}`);
    revalidatePath(`/products/${sku}/edit`);
    redirect(`/products/${sku}`);
    
  } catch (error) {
    console.error('Unexpected error updating product:', error);
    return { error: 'An unexpected error occurred while updating the product.' };
  }
}

/**
 * Deletes a product (soft delete)
 * 
 * @param formData - Form data containing the product SKU
 * @returns Success or error response
 */
export async function deleteProduct(
  formData: FormData
): Promise<ErrorResponse | { success: true }> {
  const sku = formData.get('sku') as string;
  
  if (!sku) {
    return { error: 'Product SKU is required.' };
  }
  
  const supabase = await getServerSupabaseClient();
  
  try {
    // 1. Get the product ID from SKU
    const { data: product, error: fetchError } = await supabase
      .from('products')
      .select('id, name')
      .eq('sku', sku)
      .single();
    
    if (fetchError || !product) {
      return handleDatabaseError(fetchError, 'find', 'product');
    }
    
    // 2. Perform soft delete
    const { error: deleteError } = await supabase
      .from('products')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', product.id);
    
    if (deleteError) {
      return handleDatabaseError(deleteError, 'delete', 'product');
    }
    
    // 3. Revalidate paths
    revalidatePath('/products');
    
    return { success: true };
    
  } catch (error) {
    console.error('Unexpected error deleting product:', error);
    return { error: 'An unexpected error occurred while deleting the product.' };
  }
}

/**
 * Gets a product by its SKU with additional prices
 * 
 * @param sku - Product SKU
 * @returns The product data or null if not found
 */
export async function getProductBySku(sku: string) {
  if (!sku) return null;
  
  const supabase = await getServerSupabaseClient();
  
  // Get the product with additional prices
  const { data: product, error } = await supabase
    .from('products')
    .select(`
      *,
      additional_prices:product_additional_prices(*)
    `)
    .eq('sku', sku)
    .is('deleted_at', null)
    .single();
  
  if (error || !product) {
    console.error('Error fetching product:', error);
    return null;
  }
  
  return product;
}