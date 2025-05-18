import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { DataTable } from "@/components/ui/data-table";
import { InvoiceColumns, type Invoice } from "@/components/invoices/invoice-columns";

async function getInvoices(): Promise<Invoice[]> {
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
    .from('invoices')
    .select(`
      *,
      entity:issuing_entities(id, entity_name),
      customer:customers(id, public_customer_id, company_contact_name)
    `)
    .is('deleted_at', null)
    .order('issue_date', { ascending: false });

  if (error) {
    console.error("Error fetching invoices:", error);
    return [];
  }

  // Transform the data to match the Invoice type
  return (data || []).map(invoice => {
    // Calculate the total from invoice_items if needed
    // This is a simplified version - in a real app you might want to
    // join with invoice_items and calculate the total
    const total = formatCurrency(invoice.total_amount || 0, invoice.currency_code || 'USD');

    return {
      id: invoice.invoice_number,
      entity: invoice.entity?.entity_name || 'Unknown Entity',
      customer: invoice.customer?.company_contact_name || 'Unknown Customer',
      issueDate: invoice.issue_date,
      dueDate: invoice.due_date,
      status: invoice.status,
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

export default async function InvoicesPage() {
  const invoices = await getInvoices();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
      </div>

      {invoices.length === 0 ? (
        <p className="text-muted-foreground">No invoices found. Create your first invoice to get started.</p>
      ) : (
        <DataTable columns={InvoiceColumns} data={invoices} />
      )}
    </div>
  );
}
