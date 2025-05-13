import { notFound } from 'next/navigation';
import { getQuoteById } from '@/app/quotes/actions';
import { QuoteForm } from '@/components/quotes/quote-form';
import { getServerSupabaseClient } from '@/lib/supabase/server-client';
import { getAppSettings, getIssuingEntities, getPaymentSources } from '@/app/settings/actions';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Currency } from '@/lib/constants';

export default async function QuoteEditPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const quote = await getQuoteById(id);
  
  // Fetch required data for the form
  const supabase = await getServerSupabaseClient();
  const settings = await getAppSettings();
  const issuingEntities = await getIssuingEntities();
  const paymentSources = await getPaymentSources();

  if (!quote) {
    console.error("Error fetching quote for edit:", id);
    notFound(); // Triggers 404 page
  }

  // Fetch customers
  const { data: customers } = await supabase
    .from('customers')
    .select('id, public_customer_id, company_contact_name, preferred_currency')
    .is('deleted_at', null)
    .order('company_contact_name', { ascending: true });

  // Fetch products
  const { data: products } = await supabase
    .from('products')
    .select(`
      id, 
      sku, 
      name, 
      description, 
      base_price,
      base_currency,
      unit, 
      status,
      additional_prices:product_additional_prices(*)
    `)
    .is('deleted_at', null)
    .order('name', { ascending: true });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">
          Edit Quote {quote.quote_number || `#${id.substring(0, 6)}...`}
        </h1>
        <div>
          <Button asChild variant="outline">
            <Link href={`/quotes/${id}`}>Cancel</Link>
          </Button>
        </div>
      </div>

      {/* Render the form with all required props */}
      <QuoteForm
        quote={quote}
        customers={customers || []}
        issuingEntities={issuingEntities}
        paymentSources={paymentSources}
        products={products || []}
        defaultCurrency={settings?.base_currency as Currency || 'USD'}
        defaultTaxPercentage={settings?.default_tax_percentage || 0}
        defaultDiscountPercentage={settings?.default_discount_percentage || 0}
        defaultExpiryDate={quote.expiry_date}
      />
    </div>
  );
}
