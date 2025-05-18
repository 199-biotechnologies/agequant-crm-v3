import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { DataTable } from "@/components/ui/data-table";
import { QuoteColumns, type Quote } from "@/components/quotes/quote-columns";

async function getQuotes(): Promise<Quote[]> {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value },
      },
    }
  );

  const { data, error } = await supabase
    .from('quotes')
    .select(`
      *,
      entity:issuing_entities(id, entity_name),
      customer:customers(id, public_customer_id, company_contact_name)
    `)
    .is('deleted_at', null)
    .order('issue_date', { ascending: false });

  if (error) {
    console.error("Error fetching quotes:", error);
    return [];
  }

  // Transform the data to match the Quote type
  return (data || []).map(quote => {
    // Calculate the total from quote_items if needed
    // This is a simplified version - in a real app you might want to
    // join with quote_items and calculate the total
    const total = formatCurrency(quote.total_amount || 0, quote.currency_code || 'USD');

    return {
      id: quote.quote_number,
      entity: quote.entity?.entity_name || 'Unknown Entity',
      customer: quote.customer?.company_contact_name || 'Unknown Customer',
      issueDate: quote.issue_date,
      expiryDate: quote.expiry_date,
      status: quote.status,
      total,
    };
  });
}

// Helper function to format currency
function formatCurrency(amount: number, currencyCode: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
  }).format(amount);
}

export default async function QuotesPage() {
  const quotes = await getQuotes();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Quotes</h1>
      </div>

      {quotes.length === 0 ? (
        <p className="text-muted-foreground">No quotes found. Create your first quote to get started.</p>
      ) : (
        <DataTable columns={QuoteColumns} data={quotes} />
      )}
    </div>
  );
}
