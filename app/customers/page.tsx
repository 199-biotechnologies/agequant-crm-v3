// app/customers/page.tsx
import { DataTable } from "@/components/ui/data-table"
import { CustomerColumns, type Customer } from "@/components/customers/customer-columns"
import { createClient } from "@/lib/supabase/server"; // Import the original helper name

// This page is now implicitly a Server Component due to async/await
export default async function CustomersPage() {
  // Create a Supabase client instance specifically for this server component request
  // createClient calls cookies() internally now
  const supabase = createClient();

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
      <DataTable columns={CustomerColumns} data={customers || []} />
      {error && <p className="text-red-500">Could not fetch customer data.</p>}
    </div>
  )
}