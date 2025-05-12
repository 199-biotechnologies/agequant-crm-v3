import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
// Removed AppLayout import
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';

interface ViewProductPageProps {
  params: { sku: string };
}

// Helper function to format display data (can be moved to utils if used elsewhere)
function formatDisplayValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return "-";
  if (typeof value === 'number') return value.toString(); // Or more complex number formatting
  return value;
}

// TODO: Create a shared currency formatting utility
function formatPrice(amount: number | null | undefined, currencyCode: string = "USD") {
  if (amount === null || amount === undefined) return "-";
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode }).format(amount);
}


async function getProductForView(sku: string) {
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
      created_at,
      updated_at,
      product_additional_prices (
        currency_code,
        price
      )
    `)
    .eq('sku', sku)
    .is('deleted_at', null)
    .single();

  if (error) {
    console.error(`Error fetching product SKU ${sku} for view:`, error);
    return null;
  }
  return product;
}

export default async function ViewProductPage({ params }: ViewProductPageProps) {
  const product = await getProductForView(params.sku);

  if (!product) {
    notFound();
  }

  return (
    // Removed AppLayout wrapper
    <div className="space-y-6 py-6">
      <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Product Details</h1>
          <Button asChild variant="outline">
            <Link href={`/products/${product.sku}/edit`}>
              <Pencil className="mr-2 h-4 w-4" /> Edit Product
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{product.name}</CardTitle>
            <CardDescription>SKU: <span className="font-mono">{product.sku}</span></CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Unit</h3>
                <p>{formatDisplayValue(product.unit)}</p>
              </div>
              <div>
                {/* Updated Label */}
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Base Price (USD)</h3>
                <p><Badge variant="secondary">{formatPrice(product.base_price, "USD")}</Badge></p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Status</h3>
                <p><Badge variant={product.status === 'Active' ? 'default' : 'outline'}>{product.status}</Badge></p>
              </div>
            </div>
            {product.description && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Description</h3>
                <p className="whitespace-pre-wrap">{product.description}</p>
              </div>
            )}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Created At</h3>
                    <p>{new Date(product.created_at).toLocaleString()}</p>
                </div>
                <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Last Updated</h3>
                    <p>{new Date(product.updated_at).toLocaleString()}</p>
                </div>
            </div>
          </CardContent>
        </Card>

        {product.product_additional_prices && product.product_additional_prices.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Additional Prices</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Currency</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {product.product_additional_prices.map((ap, index) => (
                    <TableRow key={index}>
                      <TableCell>{ap.currency_code}</TableCell>
                      <TableCell className="text-right">{formatPrice(ap.price, ap.currency_code)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    // Removed AppLayout wrapper
  );
}