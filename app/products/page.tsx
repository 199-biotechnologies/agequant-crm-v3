 import { cookies } from 'next/headers';
 import { createServerClient, type CookieOptions } from '@supabase/ssr'; // Re-added CookieOptions
 // Removed AppLayout import
 import { productColumns, type ProductRow } from "@/components/products/product-columns";
 import { ProductDataTableClientWrapper } from "@/components/products/product-data-table-client-wrapper";
 // Removed unused Button, Link, PlusCircle imports

 async function getProducts(): Promise<ProductRow[]> {
   const cookieStore = await cookies(); // Added await here
   const supabase = createServerClient(
     process.env.NEXT_PUBLIC_SUPABASE_URL!,
     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
     {
       cookies: {
         get(name: string) { return cookieStore.get(name)?.value },
         // Set and remove are not strictly needed for a read-only operation like getProducts
         // but keeping them doesn't hurt and aligns with a general client setup.
         set(name: string, value: string, options: CookieOptions) { cookieStore.set({ name, value, ...options }) },
         remove(name: string, options: CookieOptions) { cookieStore.set({ name, value: '', ...options }) },
       },
     }
   );

  const { data, error } = await supabase
    .from('products')
    .select('id, sku, name, unit, base_price, status') // Select fields for ProductRow
    .is('deleted_at', null) // Filter out soft-deleted products
    .order('name', { ascending: true });

  if (error) {
    console.error("Error fetching products:", error);
    // Consider throwing an error or returning an empty array with a message
    return [];
  }
  return data || [];
}


export default async function ProductsPage() {
  const products = await getProducts();

  return (
    // Removed AppLayout wrapper
    <div className="space-y-4 py-6"> {/* Added padding and spacing */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Products</h1>
          {/* "New Product" button is handled by global ActionButtons via layout,
              but if you need a page-specific one, it would go here.
              For now, assuming global button is sufficient as per recent refactor.
              If a page-specific button is desired:
          <Button asChild>
            <Link href="/products/new">
              <PlusCircle className="mr-2 h-4 w-4" /> New Product
            </Link>
          </Button>
          */}
        </div>
        <ProductDataTableClientWrapper columns={productColumns} data={products} />
      </div>
    // Removed AppLayout wrapper
  );
}
