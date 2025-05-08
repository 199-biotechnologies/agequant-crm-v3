// app/customers/[id]/page.tsx
import { notFound } from 'next/navigation';
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge"; // Assuming you might want badges, e.g., for currency

interface ViewCustomerPageProps {
  params: { id: string };
}

// Helper function to format data for display
function formatDisplayValue(value: string | null | undefined): string {
  return value || "-"; // Display '-' for null or empty values
}

export default async function ViewCustomerPage({ params }: ViewCustomerPageProps) {
  const supabase = createClient();
  const customerId = params.id;

  // Fetch customer data
  const { data: customer, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', customerId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching customer for view:", error);
    // Consider showing an error message instead of 404
    notFound();
  }

  if (!customer) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Customer Details</h1>

      <Card>
        <CardHeader>
          <CardTitle>{customer.company_contact_name}</CardTitle>
          <CardDescription>ID: {customer.id}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Email</h3>
              <p>{formatDisplayValue(customer.email)}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Phone</h3>
              <p>{formatDisplayValue(customer.phone)}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Preferred Currency</h3>
              <p>
                <Badge variant="outline">{formatDisplayValue(customer.preferred_currency)}</Badge>
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Address</h3>
              <p className="whitespace-pre-wrap">{formatDisplayValue(customer.address)}</p> {/* Preserve line breaks */}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Internal Notes</h3>
            <p className="whitespace-pre-wrap">{formatDisplayValue(customer.notes)}</p> {/* Preserve line breaks */}
          </div>
           <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Created At</h3>
              <p>{new Date(customer.created_at).toLocaleString()}</p>
            </div>
             <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Last Updated</h3>
              <p>{new Date(customer.updated_at).toLocaleString()}</p>
            </div>
        </CardContent>
        {/* TODO: Add footer with link to Edit page? */}
      </Card>
    </div>
  );
}