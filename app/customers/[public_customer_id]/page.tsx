// Will be renamed to: app/customers/[public_customer_id]/page.tsx
import { cookies } from 'next/headers'; // Import cookies
import { notFound } from 'next/navigation';
import { createServerClient, type CookieOptions } from '@supabase/ssr' // Import directly
// No longer importing the helper
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge"; // Assuming you might want badges, e.g., for currency

interface ViewCustomerPageProps {
  params: { public_customer_id: string }; // Renamed param
}

// Helper function to format data for display
function formatDisplayValue(value: string | null | undefined): string {
  return value || "-"; // Display '-' for null or empty values
}

// Destructure params directly in the function signature
export default async function ViewCustomerPage({ params: { public_customer_id } }: ViewCustomerPageProps) {
  // Explicitly await the cookie store
  const cookieStore = await cookies();
  // Create client directly within the Server Component
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value },
        // No need for set/remove in read-only page component
      },
    }
  );
  // const publicCustomerId = params.public_customer_id; // No longer needed, use destructured prop

  // Fetch customer data by public_customer_id
  const { data: customer, error } = await supabase
    .from('customers')
    .select('*') // Select all fields including the UUID 'id' and 'public_customer_id'
    .eq('public_customer_id', public_customer_id) // Use destructured prop
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
          {/* Display public ID as Customer ID, UUID as Internal Ref */}
          <CardDescription>
            Customer ID: <span className="font-mono">{customer.public_customer_id || 'N/A'}</span> | Internal Ref: {customer.id}
          </CardDescription>
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