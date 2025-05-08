// app/customers/[id]/edit/page.tsx
import { notFound, redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { CustomerForm } from "@/components/customers/customer-form";
import { type CustomerFormData } from "@/components/customers/customer-form-schema";
import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr' // Import directly
// Removed duplicate imports

interface EditCustomerPageProps {
  params: { id: string };
}

export default async function EditCustomerPage({ params }: EditCustomerPageProps) {
  // Explicitly await the cookie store
  const cookieStore = await cookies();
  // Create client directly within the Server Component
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
  const customerId = params.id;

  // Fetch existing customer data
  const { data: customer, error: fetchError } = await supabase
    .from('customers')
    .select('*')
    .eq('id', customerId)
    .maybeSingle(); // Use maybeSingle() as the customer might not exist

  if (fetchError) {
    console.error("Error fetching customer for edit:", fetchError);
    // Handle error appropriately, maybe show a generic error message
  }

  if (!customer) {
    notFound(); // Render 404 if customer doesn't exist
  }

  // Server Action to handle form submission for updates
  const handleUpdateCustomer = async (data: CustomerFormData) => {
    "use server";

    // No need to get cookieStore again if createClient handles it
    // Server Actions run in their own context, need to get cookies again
    // Explicitly await cookies() inside the Server Action as well
    const cookieStore = await cookies();
    // Create client directly within the Server Action
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

    // Prepare data for update (handle optional fields)
    const customerData = {
      company_contact_name: data.company_contact_name,
      email: data.email,
      phone: data.phone || null,
      preferred_currency: data.preferred_currency,
      address: data.address,
      notes: data.notes || null,
      // updated_at will be handled by the database trigger
    };

    console.log("Updating customer data in Supabase:", customerData);

    const { error } = await supabase
      .from('customers')
      .update(customerData)
      .eq('id', customerId); // Ensure we update the correct customer

    if (error) {
      console.error('Error updating customer:', error);
      // Return error message to the form component
      return { error: `Failed to update customer: ${error.message}` };
    } else {
      console.log("Customer updated successfully.");
      // Revalidate relevant paths
      revalidatePath('/customers');
      revalidatePath(`/customers/${customerId}/edit`); // Revalidate this page too
      // Redirect to the customers list page on success
      redirect('/customers');
    }
  };

  // Map fetched data to form data structure (adjust if needed)
  const initialFormData: Partial<CustomerFormData> = {
    company_contact_name: customer.company_contact_name,
    email: customer.email,
    phone: customer.phone ?? '', // Form expects string or undefined
    preferred_currency: customer.preferred_currency as CustomerFormData['preferred_currency'], // Assert type
    address: customer.address,
    notes: customer.notes ?? '', // Form expects string or undefined
  };


  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Edit Customer</h1>
      <CustomerForm
        onSubmit={handleUpdateCustomer}
        initialData={initialFormData}
      />
    </div>
  );
}