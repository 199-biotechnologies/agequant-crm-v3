// components/customers/customer-form.tsx
"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
// The Button component is used within FormActions, so we don't need to import it here
// import { Button } from "@/components/ui/button"
import { Form } from "@/components/ui/form"
import { customerFormSchema, type CustomerFormData } from "./customer-form-schema"
import { ALLOWED_CURRENCIES } from "@/lib/constants"
import { useRouter } from "next/navigation"

// Import our new form components
import { 
  FormInputField, 
  FormSelectField, 
  FormTextareaField 
} from "@/components/ui/form-fields"

import { 
  FormContainer, 
  FormSection, 
  FormRow, 
  FormActions 
} from "@/components/ui/form-layout"

interface CustomerFormProps {
  initialData?: Partial<CustomerFormData> & { public_customer_id?: string | null };
  serverAction: (formData: FormData) => void | Promise<void>;
}

export function CustomerForm({ initialData, serverAction }: CustomerFormProps) {
  const router = useRouter();
  
  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      company_contact_name: "",
      email: "",
      phone: "",
      preferred_currency: undefined,
      address: "",
      notes: "",
      ...initialData,
    },
  });

  // Create cancel handler
  const handleCancel = () => {
    router.push('/customers');
  };

  return (
    <Form {...form}>
      <FormContainer onSubmit={() => {
        // Let the native form submission handle it
        // This preserves the server action
      }}>
        {initialData?.public_customer_id && (
          <input type="hidden" name="publicCustomerId" value={initialData.public_customer_id} />
        )}
        
        <FormSection 
          title="Basic Information" 
          description="Enter the customer's contact information."
        >
          <FormRow>
            <FormInputField
              control={form.control}
              name="company_contact_name"
              label="Company / Contact Name"
              placeholder="Acme Corp / John Doe"
              required={true}
            />

            <FormInputField
              control={form.control}
              name="email"
              label="Email"
              placeholder="contact@acme.com"
              type="email"
              description="Used for sending invoices and quotes."
            />
          </FormRow>
          
          <FormRow>
            <FormInputField
              control={form.control}
              name="phone"
              label="Phone"
              placeholder="+1 555-123-4567"
            />

            <FormSelectField
              control={form.control}
              name="preferred_currency"
              label="Preferred Currency"
              placeholder="Select a currency"
              options={ALLOWED_CURRENCIES.map((currency) => ({
                value: currency,
                label: currency
              }))}
            />
          </FormRow>
        </FormSection>
        
        <FormSection 
          title="Additional Information" 
          description="Add shipping address and notes for internal reference."
        >
          <FormTextareaField
            control={form.control}
            name="address"
            label="Address"
            placeholder="123 Main St&#10;Anytown, CA 91234&#10;USA"
            description="Appears on invoices and quotes."
            rows={3}
          />
          
          <FormTextareaField
            control={form.control}
            name="notes"
            label="Internal Notes"
            placeholder="Any internal notes about this customer..."
            rows={4}
          />
        </FormSection>

        {/* Use FormActions for consistent button layout */}
        <FormActions
          submitLabel={initialData ? "Update Customer" : "Save Customer"}
          cancelAction={handleCancel}
          cancelLabel="Cancel"
          isSubmitting={form.formState.isSubmitting}
        />
        
        {/* Hidden form action */}
        <input type="hidden" name="formAction" value={serverAction.name} />
      </FormContainer>
    </Form>
  )
}