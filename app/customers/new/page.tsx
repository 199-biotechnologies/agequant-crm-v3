// app/customers/new/page.tsx
import { CustomerForm } from "@/components/customers/customer-form";

export default function NewCustomerPage() {
  // TODO: Implement the actual submission logic that calls the Supabase API
  const handleCreateCustomer = async (data: any /* CustomerFormData */) => {
    "use server"; // Example if using Server Actions
    console.log("Submitting new customer data:", data);
    // Replace with actual API call to Supabase
    // e.g., const { data: customer, error } = await supabase.from('customers').insert([data]).select();
    // Handle success/error, maybe redirect or show toast
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
    console.log("Simulated submission complete.");
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Create New Customer</h1>
      <CustomerForm onSubmit={handleCreateCustomer} />
    </div>
  );
}