// components/customers/customer-form.tsx
"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
// import { z } from "zod"; // No longer needed directly here
// Remove useState, useTransition - will rely on form action

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { customerFormSchema, type CustomerFormData, allowedCurrencies } from "./customer-form-schema"

// allowedCurrencies is now imported directly

interface CustomerFormProps {
  // initialData might need to include the public ID if we are editing
  initialData?: Partial<CustomerFormData> & { public_customer_id?: string | null }; // Keep initialData structure
  // Replace onSubmit with serverAction prop
  serverAction: (formData: FormData) => Promise<void | { error?: string; fieldErrors?: any }>;
}

export function CustomerForm({ initialData, serverAction }: CustomerFormProps) {
  // Remove useTransition and error state for now.
  // Consider useFormState for more complex feedback later if needed.
  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      company_contact_name: "",
      email: "",
      phone: "",
      preferred_currency: undefined, // Or set a default like 'USD' if desired
      address: "",
      notes: "",
      ...initialData, // Merge initialData here if provided
    },
  })

  // No longer need the handleSubmit wrapper or startTransition

  return (
    <Form {...form}>
      {/* Use the action prop for the server action */}
      {/* Remove onSubmit={form.handleSubmit(handleSubmit)} */}
      <form action={serverAction} className="space-y-8">
        {/* Add hidden input for publicCustomerId when editing */}
        {initialData?.public_customer_id && (
          <input type="hidden" name="publicCustomerId" value={initialData.public_customer_id} />
        )}
        {/* Company / Contact Name */}
        <FormField
          control={form.control}
          name="company_contact_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Company / Contact Name</FormLabel>
              <FormControl>
                <Input placeholder="Acme Corp / John Doe" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Email */}
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="contact@acme.com" {...field} />
              </FormControl>
              <FormDescription>
                Used for sending invoices and quotes.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Phone */}
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="+1 555-123-4567" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Preferred Currency */}
        <FormField
          control={form.control}
          name="preferred_currency"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Preferred Currency</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a currency" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {allowedCurrencies.map((currency) => (
                    <SelectItem key={currency} value={currency}>
                      {currency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Address */}
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="123 Main St&#10;Anytown, CA 91234&#10;USA"
                  className="resize-none" // Optional: prevent resizing
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Appears on invoices and quotes.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Notes */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Internal Notes (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Any internal notes about this customer..."
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Button type is submit, disabled state might need useFormStatus later */}
        <Button type="submit">
          {initialData ? "Update Customer" : "Save Customer"}
        </Button>
        {/* Error display needs rethinking with form actions, maybe useFormState */}
      </form>
    </Form>
  )
}