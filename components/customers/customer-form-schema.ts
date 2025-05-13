// components/customers/customer-form-schema.ts
import { z } from "zod";
import { ALLOWED_CURRENCIES } from "@/lib/constants";

export const customerFormSchema = z.object({
  company_contact_name: z.string().min(1, { message: "Company/Contact Name is required." }).max(120, { message: "Name cannot exceed 120 characters." }),
  email: z.string().email({ message: "Invalid email address." }).optional().or(z.literal('')), // Optional, allow empty string
  phone: z.string().max(50, { message: "Phone number cannot exceed 50 characters." }).optional().or(z.literal('')), // Optional, allow empty string
  preferred_currency: z.enum(ALLOWED_CURRENCIES).optional(), // Optional
  address: z.string().optional().or(z.literal('')), // Optional, allow empty string
  notes: z.string().max(2000, { message: "Notes cannot exceed 2000 characters." }).optional().or(z.literal('')), // Optional, allow empty string
});

export type CustomerFormData = z.infer<typeof customerFormSchema>;