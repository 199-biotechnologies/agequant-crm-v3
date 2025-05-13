# Code Refactoring Recommendations

After thorough analysis of the AgeQuant CRM v3 codebase, I've identified several patterns of code duplication and opportunities for refactoring. This document outlines specific recommendations to improve code quality, maintainability, and consistency.

## Backend & Data Layer Refactoring

### 1. Centralize Supabase Client Initialization

**Issue:** The Supabase client creation code is duplicated across multiple server action files.

**Files Affected:**
- `/app/customers/actions.ts`
- `/app/products/actions.ts`
- `/app/invoices/actions.ts`
- `/app/quotes/actions.ts`
- `/app/settings/app-settings.actions.ts`

**Recommendation:**
Create a shared utility for server-side Supabase client initialization.

```typescript
// lib/supabase/server-client.ts
import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export async function getServerSupabaseClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value },
        set(name: string, value: string, options: CookieOptions) { cookieStore.set({ name, value, ...options }) },
        remove(name: string, options: CookieOptions) { cookieStore.set({ name, value: '', ...options }) },
      },
    }
  );
}
```

### 2. Create a Generic CRUD Action Factory

**Issue:** All entity action files follow similar CRUD patterns with substantial code duplication.

**Files Affected:**
- `/app/customers/actions.ts`
- `/app/products/actions.ts`
- `/app/invoices/actions.ts`
- `/app/quotes/actions.ts`

**Recommendation:**
Create a generic CRUD action factory to reduce duplication.

```typescript
// lib/actions/entity-actions.ts
import { revalidatePath } from "next/cache";
import { redirect } from 'next/navigation';
import { ZodSchema } from "zod";
import { getServerSupabaseClient } from '@/lib/supabase/server-client';

export type EntityActionOptions<T> = {
  table: string;
  schema: ZodSchema<T>;
  paths: {
    list: string;
    detail: (id: string) => string;
    edit?: (id: string) => string;
  };
  softDelete?: boolean;
  idField?: string;
  transformForDb?: (data: T) => Record<string, any>;
  afterCreate?: (id: string, data: T) => Promise<void>;
};

export function createEntityActions<T extends Record<string, any>>(options: EntityActionOptions<T>) {
  // Implementation from previous analysis
}
```

### 3. Centralize Shared Schema Components

**Issue:** Form schemas for quotes and invoices have nearly identical structure and validation patterns.

**Files Affected:**
- `/app/invoices/actions.ts`
- `/app/quotes/actions.ts`

**Recommendation:**
Create reusable schema components in a central location.

```typescript
// lib/schemas/shared.ts
import { z } from "zod";

// Common currency and validation patterns
export const allowedCurrencies = [
  'USD', 'GBP', 'EUR', 'CHF', 'SGD', 'HKD',
  'CNY', 'JPY', 'CAD', 'AUD', 'NZD'
] as const;

// Base line item schema shared between quotes and invoices
export const baseLineItemSchema = z.object({
  // Implementation details
});

// Base document schema for both quotes and invoices
export const baseDocumentSchema = {
  // Implementation details
};
```

### 4. Move Shared Constants to a Central Location

**Issue:** Currency and unit constants are duplicated across multiple form schemas.

**Files Affected:**
- `/components/customers/customer-form-schema.ts`
- `/components/products/product-form-schema.ts`

**Recommendation:**
Centralize common constants.

```typescript
// lib/constants.ts
export const ALLOWED_CURRENCIES = [
  'USD', 'GBP', 'EUR', 'CHF', 'SGD', 'HKD',
  'CNY', 'JPY', 'CAD', 'AUD', 'NZD'
] as const;

export const PRODUCT_UNITS = [
  'pc', 'box', 'kit', 'kg', 'hr'
] as const;

export const PRODUCT_STATUSES = [
  'Active', 'Inactive'
] as const;
```

### 5. Create Shared Form Data Parsing Utilities

**Issue:** Similar code for parsing line items from form data is duplicated between quotes and invoices.

**Files Affected:**
- `/app/invoices/actions.ts`
- `/app/quotes/actions.ts`

**Recommendation:**
Create a shared utility for parsing complex nested form data.

```typescript
// lib/utils/form-data.ts
export function parseLineItemsFromFormData(formData: FormData | Record<string, any>) {
  // Implementation details
}
```

### 6. Standardize Error Handling

**Issue:** Similar patterns for handling validation and database errors are repeated.

**Files Affected:**
- All server action files

**Recommendation:**
Create a shared utility for consistent error handling.

```typescript
// lib/utils/error-handler.ts
import { ZodError } from "zod";

export function handleValidationError(error: ZodError, entity: string) {
  // Implementation details
}

export function handleDatabaseError(error: any, operation: string, entity: string) {
  // Implementation details
}
```

## UI Component Refactoring

### 1. Create Reusable Table Column Factory

**Issue:** Every entity has a similar column definition file with duplicated patterns for sorting, formatting, and actions.

**Files Affected:**
- `/components/customers/customer-columns.tsx`
- `/components/products/product-columns.tsx`
- `/components/quotes/quote-columns.tsx`
- `/components/invoices/invoice-columns.tsx`

**Recommendation:**
Create a reusable column factory.

```tsx
// components/common/table/create-entity-columns.tsx
import { type ColumnDef } from "@tanstack/react-table"
// Implementation details
```

### 2. Create Reusable Entity Actions Cell

**Issue:** Each entity has its own actions cell implementation with very similar dropdown menus and functionality.

**Files Affected:**
- `/components/customers/customer-columns.tsx`
- `/components/products/product-columns.tsx`
- `/components/quotes/quote-columns.tsx`
- `/components/invoices/invoice-columns.tsx`

**Recommendation:**
Create a shared EntityActionsCell component.

```tsx
// components/common/table/entity-actions-cell.tsx
// Implementation details
```

### 3. Create Shared Status Badge Component

**Issue:** Similar status badge implementations for quotes and invoices.

**Files Affected:**
- `/components/quotes/quote-columns.tsx`
- `/components/invoices/invoice-columns.tsx`

**Recommendation:**
Create a reusable StatusBadge component.

```tsx
// components/common/status-badge.tsx
import { Badge } from "@/components/ui/badge";
// Implementation details
```

### 4. Generic Table Skeleton Component

**Issue:** Only invoices have a table skeleton, but all entities need loading states.

**Files Affected:**
- `/components/invoices/invoice-table-skeleton.tsx`

**Recommendation:**
Create a generic table skeleton component that's configurable for any entity.

```tsx
// components/common/table/entity-table-skeleton.tsx
// Implementation details
```

### 5. Reusable Form Field Components

**Issue:** Forms repeat similar UI patterns for inputs, selects, and textareas.

**Files Affected:**
- All form components

**Recommendation:**
Create reusable form field components.

```tsx
// components/common/form/form-fields.tsx
// Various field implementations
```

### 6. Generic Entity Form Dialog

**Issue:** Dialog-based forms follow similar patterns but with duplicated structure.

**Files Affected:**
- `/components/settings/payment-source-form-dialog.tsx`
- `/components/settings/issuing-entity-form-dialog.tsx`

**Recommendation:**
Create a configurable entity form dialog component.

```tsx
// components/common/form/entity-form-dialog.tsx
// Implementation details
```

### 7. Form Layout Components

**Issue:** Forms follow similar layout patterns with sections, field grouping, and action buttons.

**Files Affected:**
- All form components

**Recommendation:**
Create a reusable form layout system.

```tsx
// components/common/form/form-layout.tsx
// Implementation details for FormSection, FormRow, FormActions
```

## Benefits of Refactoring

Implementing these recommendations would result in several key benefits:

1. **Reduced Code Duplication**: Cutting total code size by an estimated 30-40% by eliminating repetition.

2. **Improved Maintainability**: Changes to common patterns would only need to be made in one place.

3. **Consistency**: Users would experience consistent UI patterns and behavior throughout the application.

4. **Faster Development**: New features could leverage existing components rather than implementing from scratch.

5. **Better Testing**: Centralized components can be tested once and used with confidence throughout the application.

## Implementation Strategy

For minimal disruption, I recommend:

1. Start with the backend utilities that don't affect the UI (Supabase client, schemas, constants)
2. Create the UI component library in parallel without modifying existing code
3. Gradually refactor one entity at a time to use the new components
4. Add comprehensive tests for the shared components

This approach allows the team to make progress while maintaining a functional application throughout the refactoring process.