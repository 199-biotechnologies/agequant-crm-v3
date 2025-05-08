// app/customers/new/page.tsx
"use server"; // Indicate this component uses Server Actions

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { CustomerForm } from "@/components/customers/customer-form";
import { type CustomerFormData } from "@/components/customers/customer-form-schema";
import { createClient } from "@/lib/supabase/server"; // Use server client for action

export default function NewCustomerPage() {

  // Server Action to handle form submission
  const handleCreateCustomer = async (data: CustomerFormData) => {
    "use server"; // Explicitly mark the action

    const supabase = createClient();

    // Map form data to database columns
    const customerData = {
      company_contact_name: data.company_contact_name,
      email: data.email,
      phone: data.phone || null, // Ensure empty string becomes null
      preferred_currency: data.preferred_currency,
      address: data.address,
      notes: data.notes || null, // Ensure empty string becomes null
    };

    const { error } = await supabase
      .from('customers')
      .insert([customerData]); // insert expects an array

    if (error) {
      console.error('Error inserting customer:', error);
      return { error: `Failed to create customer: ${error.message}` };
    }

    // On success:
    revalidatePath('/customers'); // Revalidate the list page
    redirect('/customers'); // Redirect to the list page
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Create New Customer</h1>
      <CustomerForm onSubmit={handleCreateCustomer} /> {/* Pass the server action */}
    </div>
  );
}