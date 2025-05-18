// components/customers/customer-form.tsx
"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
// The Button component is used within FormActions, so we don't need to import it here
// import { Button } from "@/components/ui/button"
import { Form } from "@/components/ui/form"
import { customerFormSchema, type CustomerFormData } from "./customer-form-schema"
import { ALLOWED_CURRENCIES } from "@/lib/constants"
import { useRouter } from "next/navigation"
import { ErrorResponse } from "@/lib/utils/error-handler"

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

// Import new form error component
import { FormError } from "@/components/ui/form-error"

interface CustomerFormProps {
  initialData?: Partial<CustomerFormData> & { public_customer_id?: string | null };
  // Updated serverAction return type to accommodate the new success object from createCustomer
  serverAction: (formData: FormData) => Promise<ErrorResponse | { success: true; newCustomerId?: string } | void>;
}

export function CustomerForm({ initialData, serverAction }: CustomerFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<ErrorResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
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
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => { // Changed type of e
    e.preventDefault();
    
    // Clear any previous errors
    setServerError(null);
    setIsSubmitting(true);
    
    try {
      // Get the form data
      const formData = new FormData(e.currentTarget as HTMLFormElement); // Added type assertion
      
      // Submit the form data to the server action
      const result = await serverAction(formData);
      
      // Check if the result is an error
      if (result && 'error' in result && result.error) { // Check for result.error to be defensive
        setServerError(result as ErrorResponse);
        setIsSubmitting(false);
        
        if (result.fieldErrors) {
          Object.entries(result.fieldErrors).forEach(([field, errors]) => {
            if (errors && errors.length > 0) {
              form.setError(field as keyof CustomerFormData, {
                type: 'server',
                message: errors[0]
              });
            }
          });
        }
      } else if (result && 'success' in result && result.success) {
        // On success, redirect to the main customers page
        // Optionally, could redirect to the new customer's page if newCustomerId is available:
        // router.push(result.newCustomerId ? `/customers/${result.newCustomerId}` : '/customers');
        router.push('/customers');
        // No need to setIsSubmitting(false) as we are navigating away
      } else {
        // Handle cases where the action completes but doesn't return a known success/error structure
        // This might happen if an action using internal redirect (like updateCustomer still does) is called
        // or if an action has a void return on success and no redirect.
        // If initialData exists, it's an update, assume redirect happened in action or revalidation is enough.
        if (initialData?.public_customer_id) {
          // For updates, if no error, assume success and Next.js handles re-render or redirect from action
          // router.refresh(); // could also just refresh
        } else {
          // This case should ideally not be hit for createCustomer now.
          // If it is, it means createCustomer didn't return {success: true}
           console.warn("Server action finished without a clear success/error state for create operation.");
           setIsSubmitting(false);
        }
      }
    } catch (error) {
      console.error("Form submission error:", error);
      setServerError({
        error: "An unexpected error occurred. Please try again.",
      });
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <FormContainer onSubmit={handleSubmit}>
        {initialData?.public_customer_id && (
          <input type="hidden" name="publicCustomerId" value={initialData.public_customer_id} />
        )}
        
        {/* Display server errors at the top of the form */}
        {serverError && (
          <FormError 
            error={serverError} 
            className="mb-6"
          />
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
          isSubmitting={form.formState.isSubmitting || isSubmitting}
        />
        
        {/* Hidden form action */}
        <input type="hidden" name="formAction" value={serverAction.name} />
      </FormContainer>
    </Form>
  )
}
