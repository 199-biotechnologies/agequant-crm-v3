// app/customers/new/page.tsx
// No longer needs "use server" at the top level
import { CustomerForm } from "@/components/customers/customer-form";
import { createCustomer } from "@/app/customers/actions";
import type { CustomerFormData } from "@/components/customers/customer-form-schema";

export default function NewCustomerPage() {
  // The page component itself is a Server Component by default
  // We pass the imported server action directly to the form

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Create New Customer</h1>
      {/* Pass the imported server action */}
      {/* Wrap createCustomer to match the expected onSubmit signature */}
      <CustomerForm onSubmit={async (id: string | null, data: CustomerFormData) => {
        // id will be null here, createCustomer only needs data
        return createCustomer(data);
      }} />
    </div>
  );
}