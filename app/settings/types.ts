import { z } from 'zod';

export const ALLOWED_CURRENCIES = [
  'USD', 'GBP', 'EUR', 'CHF', 'SGD', 'HKD',
  'CNY', 'JPY', 'CAD', 'AUD', 'NZD',
] as const;

// --- App Settings ---

export interface AppSettings {
  id: string; // UUID
  base_currency: typeof ALLOWED_CURRENCIES[number];
  default_tax_percentage: number;
  default_quote_expiry_days: number;
  default_invoice_payment_terms_days: number;
  default_quote_notes: string | null;
  default_invoice_notes: string | null;
  created_at: string;
  updated_at: string;
}

export const AppSettingsFormSchema = z.object({
  base_currency: z.enum(ALLOWED_CURRENCIES),
  default_tax_percentage: z.preprocess(
    (val) => (typeof val === 'string' ? parseFloat(val) : val),
    z.number().min(0).max(100)
  ),
  default_quote_expiry_days: z.preprocess(
    (val) => (typeof val === 'string' ? parseInt(val, 10) : val),
    z.number().int().min(0)
  ),
  default_invoice_payment_terms_days: z.preprocess(
    (val) => (typeof val === 'string' ? parseInt(val, 10) : val),
    z.number().int().min(0)
  ),
  default_quote_notes: z.string().nullable().optional(),
  default_invoice_notes: z.string().nullable().optional(),
});

export type AppSettingsUpdateData = z.infer<typeof AppSettingsFormSchema>;

// --- Issuing Entities ---

export interface IssuingEntity {
  id: string; // UUID
  entity_name: string;
  registration_number: string | null;
  address: string | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  logo_url: string | null;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export const IssuingEntityFormSchema = z.object({
  entity_name: z.string().min(1, { message: "Entity name is required." }),
  registration_number: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  website: z.string().url({ message: "Please enter a valid URL." }).nullable().or(z.literal('')).optional(),
  email: z.string().email({ message: "Please enter a valid email." }).nullable().or(z.literal('')).optional(),
  phone: z.string().nullable().optional(),
  logo_url: z.string().url().nullable().or(z.literal('')).optional(), // Assuming URL for now, actual upload later
  is_primary: z.boolean().default(false).optional(),
});

export type IssuingEntityFormData = z.infer<typeof IssuingEntityFormSchema>;

// --- Payment Sources ---

export interface PaymentSource {
  id: string; // UUID
  name: string;
  currency_code: typeof ALLOWED_CURRENCIES[number];
  issuing_entity_id: string; // UUID, FK to issuing_entities
  bank_name: string | null;
  account_holder_name: string | null;
  account_number: string | null;
  iban: string | null;
  swift_bic: string | null;
  routing_number_us: string | null;
  sort_code_uk: string | null;
  additional_details: string | null;
  is_primary_for_entity: boolean;
  created_at: string;
  updated_at: string;
}

export const PaymentSourceFormSchema = z.object({
  name: z.string().min(1, { message: "Payment source name is required." }),
  currency_code: z.enum(ALLOWED_CURRENCIES),
  issuing_entity_id: z.string().uuid({ message: "Valid issuing entity ID is required." }),
  bank_name: z.string().nullable().optional(),
  account_holder_name: z.string().nullable().optional(),
  account_number: z.string().nullable().optional(),
  iban: z.string().nullable().optional(),
  swift_bic: z.string().nullable().optional(),
  routing_number_us: z.string().nullable().optional(),
  sort_code_uk: z.string().nullable().optional(),
  additional_details: z.string().nullable().optional(),
  is_primary_for_entity: z.boolean().default(false).optional(),
});

export type PaymentSourceFormData = z.infer<typeof PaymentSourceFormSchema>;


// --- Common Types ---

// Common type for Server Action responses
export type ActionResponseState<DataType, SchemaType extends z.ZodTypeAny> = {
  success: boolean;
  data?: DataType;
  error?: string;
  fieldErrors?: z.inferFlattenedErrors<SchemaType>['fieldErrors'];
  message?: string; // General message, e.g. for success
};
