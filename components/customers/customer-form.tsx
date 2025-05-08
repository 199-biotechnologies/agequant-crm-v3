// components/customers/customer-form.tsx
"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
// import { z } from "zod"; // No longer needed directly here
import { useState, useTransition } from "react"; // Import useTransition for Server Actions

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
import { customerFormSchema, type CustomerFormData } from "./customer-form-schema"

// Extract allowed currencies from the schema for the dropdown
const allowedCurrencies = customerFormSchema.shape.preferred_currency._def.values;

interface CustomerFormProps {
  initialData?: Partial<CustomerFormData>;
  onSubmit: (data: CustomerFormData) => Promise<void | { error: string }>; // Allow returning error object
}

export function CustomerForm({ initialData, onSubmit }: CustomerFormProps) {
  const [isPending, startTransition] = useTransition(); // Hook for Server Action pending state
  const [error, setError] = useState<string | null>(null); // State for submission errors
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

  // Wrapper function to handle the Server Action transition
  function handleSubmit(data: CustomerFormData) {
    setError(null); // Clear previous errors
    startTransition(async () => {
      const result = await onSubmit(data);
      if (result?.error) {
        console.error("Submission error:", result.error);
        setError(result.error); // Display error to user
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
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

        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : (initialData ? "Update Customer" : "Save Customer")}
        </Button>
        {error && <p className="text-sm font-medium text-destructive">{error}</p>}
      </form>
    </Form>
  )
}