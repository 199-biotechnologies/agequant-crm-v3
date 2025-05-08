// app/customers/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

// Schema for validating the customer ID
const DeleteCustomerSchema = z.object({
  id: z.string().uuid({ message: "Invalid customer ID." }),
});

export async function deleteCustomer(formData: FormData) {
  const supabase = createClient();

  const validatedFields = DeleteCustomerSchema.safeParse({
    id: formData.get('customerId'),
  });

  if (!validatedFields.success) {
    console.error("Validation Error:", validatedFields.error.flatten().fieldErrors);
    return {
      error: "Invalid customer ID provided.",
    };
  }

  const { id } = validatedFields.data;

  console.log(`Attempting to soft delete customer with ID: ${id}`);

  const { error } = await supabase
    .from("customers")
    .update({ deleted_at: new Date().toISOString() }) // Set deleted_at timestamp
    .eq("id", id);

  if (error) {
    console.error("Error soft deleting customer:", error);
    return { error: `Database Error: Failed to delete customer. ${error.message}` };
  }

  console.log(`Customer ${id} soft deleted successfully.`);
  // Revalidate the customers list page cache
  revalidatePath("/customers");

  // Optionally return success, though revalidation handles UI update
  return { success: true };
}