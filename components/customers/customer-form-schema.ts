// components/customers/customer-form-schema.ts
import { z } from "zod";

// Define the list of allowed currencies based on the spec
export const allowedCurrencies = [
  'USD', 'GBP', 'EUR', 'CHF', 'SGD', 'HKD',
  'CNY', 'JPY', 'CAD', 'AUD', 'NZD'
] as const; // Use 'as const' for literal types

export const customerFormSchema = z.object({
  company_contact_name: z.string().min(1, { message: "Company/Contact Name is required." }).max(120, { message: "Name cannot exceed 120 characters." }),
  email: z.string().email({ message: "Invalid email address." }).optional().or(z.literal('')), // Optional, allow empty string
  phone: z.string().max(50, { message: "Phone number cannot exceed 50 characters." }).optional().or(z.literal('')), // Optional, allow empty string
  preferred_currency: z.enum(allowedCurrencies).optional(), // Optional
  address: z.string().optional().or(z.literal('')), // Optional, allow empty string
  notes: z.string().max(2000, { message: "Notes cannot exceed 2000 characters." }).optional().or(z.literal('')), // Optional, allow empty string
});

export type CustomerFormData = z.infer<typeof customerFormSchema>;