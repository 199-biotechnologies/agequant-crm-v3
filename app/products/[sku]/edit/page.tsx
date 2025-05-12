import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { ProductForm } from "@/components/products/product-form";
import { updateProduct } from '@/app/products/actions';
// Removed AppLayout import
import type { ProductFormData, AdditionalPriceFormData } from '@/components/products/product-form-schema';

interface EditProductPageProps {
  params: { sku: string };
}

async function getProductForEdit(sku: string): Promise<(ProductFormData & { sku: string; additional_prices: AdditionalPriceFormData[] }) | null> {
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

  const { data: product, error } = await supabase
    .from('products')
    .select(`
      sku,
      name,
      unit,
      base_price,
      status,
      description,
      product_additional_prices (
        currency_code,
        price
      )
    `)
    .eq('sku', sku)
    .is('deleted_at', null)
    .single();

  if (error) {
    console.error(`Error fetching product SKU ${sku} for edit:`, error);
    return null;
  }
  if (!product) return null;

  // Transform data for the form
  return {
    sku: product.sku,
    name: product.name,
    unit: product.unit as ProductFormData['unit'], // Cast to ensure type compatibility
    base_price: product.base_price,
    status: product.status as ProductFormData['status'], // Cast
    description: product.description || '',
    additional_prices: product.product_additional_prices.map(ap => ({
      currency_code: ap.currency_code as AdditionalPriceFormData['currency_code'], // Cast
      price: ap.price,
    })) || [], // This was fine, the error is likely in the map's object literal
  };
}

export default async function EditProductPage({ params }: EditProductPageProps) {
  const productData = await getProductForEdit(params.sku);

  if (!productData) {
    notFound();
  }

  // Bind the SKU to the updateProduct server action
  const updateProductWithSku = updateProduct.bind(null, params.sku);

  return (
    // Removed AppLayout wrapper
    <div className="space-y-6 py-6">
      <h1 className="text-3xl font-bold tracking-tight">Edit Product</h1>
        <ProductForm
          initialData={productData}
          serverAction={updateProductWithSku}
        />
      </div>
    // Removed AppLayout wrapper
  );
}