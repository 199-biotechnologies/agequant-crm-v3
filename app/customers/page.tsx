 // app/customers/page.tsx
 import { cookies } from 'next/headers';
 import { createServerClient } from '@supabase/ssr' // Import directly, removed CookieOptions
 // DataTable will be used by the client wrapper
 import { CustomerColumns } from "@/components/customers/customer-columns"
import { CustomerDataTableClientWrapper } from "@/components/customers/customer-data-table-client-wrapper";
// No longer importing the helper

// This page is now implicitly a Server Component due to async/await
export default async function CustomersPage() {
  // Explicitly await the cookie store
  const cookieStore = await cookies()

  // Create client directly within the Server Component
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        // No need for set/remove in read-only page component
      },
    }
  )

  // Fetch customer data
  // Ensure RLS policies allow reads for the 'anon' key or authenticated user
  // Only fetch non-deleted customers
  const { data: customers, error } = await supabase
    .from('customers')
    .select('*')
    .is('deleted_at', null) // Filter out soft-deleted records
    .order('company_contact_name', { ascending: true });

  if (error) {
    console.error("Error fetching customers:", error);
    // Optionally render an error state
    // customers = []; // Ensure customers is an empty array on error
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
        {/* The "New Customer" button will be rendered by ActionButtons in the TopBar */}
      </div>

      {/* Render the data table */}
      <CustomerDataTableClientWrapper columns={CustomerColumns} data={customers || []} />
      {error && <p className="text-red-500">Could not fetch customer data.</p>}
    </div>
  )
}
