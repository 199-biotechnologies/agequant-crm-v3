// app/customers/[id]/edit/page.tsx
import { notFound, redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { CustomerForm } from "@/components/customers/customer-form";
import { type CustomerFormData } from "@/components/customers/customer-form-schema";
import { createClient } from "@/lib/supabase/server";

interface EditCustomerPageProps {
  params: { id: string };
}

export default async function EditCustomerPage({ params }: EditCustomerPageProps) {
  const supabase = createClient();
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

    const supabase = createClient();

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