 // Path: app/customers/[id]/edit/page.tsx (where [id] is public_customer_id)
 import { notFound } from 'next/navigation'; // Removed redirect
 // Removed revalidatePath
 // Removed React import as it's not strictly needed for this Server Component
 import { CustomerForm } from "@/components/customers/customer-form";
 import { type CustomerFormData } from "@/components/customers/customer-form-schema";
import { updateCustomer } from '@/app/customers/actions'; // Import the update action
import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr' // Import directly
// Removed duplicate imports


// Properly typed props for dynamic route pages
interface PageParams {
  public_customer_id: string;
}

interface EditCustomerPageProps {
  params: PageParams;
  searchParams?: { [key: string]: string | string[] | undefined };
}

export default async function EditCustomerPage({ params }: EditCustomerPageProps) {
  const { public_customer_id } = params; // Destructure here
  // No need to await cookies() as it's synchronous
  const cookieStore = cookies();
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
  // const publicCustomerId = params.id; // Use the destructured prop

  // Fetch existing customer data using public_customer_id
  const { data: customer, error: fetchError } = await supabase
    .from('customers')
    .select('*') // Select all fields including the internal UUID 'id'
    .eq('public_customer_id', public_customer_id) // Query by the destructured prop
    .maybeSingle(); // Use maybeSingle() as the customer might not exist

  if (fetchError) {
    console.error("Error fetching customer for edit:", fetchError);
    // Handle error appropriately, maybe show a generic error message
  }

  if (!customer) {
    notFound(); // Render 404 if customer doesn't exist
  }

  // Bind the publicCustomerId to the updateCustomer server action
  // The form action will only pass FormData, so the first arg (publicCustomerId) needs to be bound here.
  const updateCustomerWithId = updateCustomer.bind(null, public_customer_id); // Bind the destructured prop

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
        // Pass the bound server action
        serverAction={updateCustomerWithId}
        // Pass public_customer_id in initialData so the form knows it's an update
        // and can include the hidden input field
        initialData={{ ...initialFormData, public_customer_id: customer.public_customer_id }}
      />
    </div>
  );
}
