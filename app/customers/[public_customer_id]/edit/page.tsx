// Path: app/customers/[id]/edit/page.tsx (where [id] is public_customer_id)
import { notFound, redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { CustomerForm } from "@/components/customers/customer-form";
import { type CustomerFormData } from "@/components/customers/customer-form-schema";
import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr' // Import directly
// Removed duplicate imports

interface EditCustomerPageProps {
  params: { id: string }; // This 'id' is the public_customer_id from the route
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
  const publicCustomerId = params.id; // Treat the param as the public ID

  // Fetch existing customer data using public_customer_id
  const { data: customer, error: fetchError } = await supabase
    .from('customers')
    .select('*') // Select all fields including the internal UUID 'id'
    .eq('public_customer_id', publicCustomerId) // Query by the public ID
    .maybeSingle(); // Use maybeSingle() as the customer might not exist

  if (fetchError) {
    console.error("Error fetching customer for edit:", fetchError);
    // Handle error appropriately, maybe show a generic error message
  }

  if (!customer) {
    notFound(); // Render 404 if customer doesn't exist
  }

  // Server Action to handle form submission for updates
  // Server Action needs the publicCustomerId to find the record
  const handleUpdateCustomer = async (publicId: string, data: CustomerFormData) => {
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

    // 1. Fetch customer by publicId to get internal UUID
    const { data: existingCustomer, error: fetchErr } = await supabase
      .from('customers')
      .select('id') // Only need the internal id
      .eq('public_customer_id', publicId)
      .single();

    if (fetchErr || !existingCustomer) {
      console.error(`Error fetching customer by public ID ${publicId} for update:`, fetchErr);
      return { error: "Customer not found or database error during update lookup." };
    }
    const internalId = existingCustomer.id; // The UUID to use for the update

    // 2. Prepare data for update (handle optional fields)
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
      .eq('id', internalId); // Ensure we update using the internal UUID

    if (error) {
      console.error('Error updating customer:', error);
      // Return error message to the form component
      return { error: `Failed to update customer: ${error.message}` };
    } else {
      console.log("Customer updated successfully.");
      // Revalidate relevant paths
      revalidatePath('/customers');
      revalidatePath(`/customers/${publicId}/edit`); // Revalidate using the public ID
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
        // Pass the publicCustomerId to the onSubmit handler
        // Ensure the function passed matches the expected (id: string | null, data: CustomerFormData) signature
        onSubmit={(id, formData) => {
          // id here is the one passed by the form component (public_customer_id or null)
          // We already have publicCustomerId from params, which we know is not null here.
          // Call the server action with the correct public ID and form data.
          return handleUpdateCustomer(publicCustomerId, formData);
        }}
        // Pass public_customer_id in initialData so the form knows it's an update
        initialData={{ ...initialFormData, public_customer_id: customer.public_customer_id }}
      />
    </div>
  );
}