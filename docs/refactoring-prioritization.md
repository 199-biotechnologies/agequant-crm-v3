# Refactoring Prioritization: Easy to Hard

This document prioritizes the refactoring recommendations from easiest to implement (low risk) to most complex (high risk of breaking existing code).

## Tier 1: Low Risk, High Reward (Quick Wins)

These refactorings are isolated, don't affect existing functionality, and provide immediate benefits.

### 1. Move Shared Constants to a Central Location

**Difficulty:** Very Easy
**Risk:** Minimal
**Files Affected:**
- `/components/customers/customer-form-schema.ts`
- `/components/products/product-form-schema.ts`

**Implementation:**
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

export type Currency = typeof ALLOWED_CURRENCIES[number];
export type ProductUnit = typeof PRODUCT_UNITS[number];
export type ProductStatus = typeof PRODUCT_STATUSES[number];
```

Then simply import these constants in the schema files. This is a straightforward find-and-replace operation with minimal risk.

### 2. Create Shared Status Badge Component

**Difficulty:** Easy
**Risk:** Low
**Files Affected:**
- `/components/quotes/quote-columns.tsx`
- `/components/invoices/invoice-columns.tsx`

This component can be implemented alongside existing code and gradually adopted. The implementation is self-contained and doesn't affect form submission or data handling.

### 3. Centralize Supabase Client Initialization

**Difficulty:** Easy
**Risk:** Low
**Files Affected:**
- `/app/customers/actions.ts`
- `/app/products/actions.ts`
- `/app/invoices/actions.ts`
- `/app/quotes/actions.ts`

This refactoring only extracts the identical client initialization code without changing its behavior. Good test coverage would be to simply verify that the client is properly initialized with the same parameters.

### 4. Create Generic Table Skeleton

**Difficulty:** Easy
**Risk:** Low
**Files Affected:**
- `/components/invoices/invoice-table-skeleton.tsx`

Creating a generic skeleton component has no impact on existing functionality and can be adopted gradually. It's a purely visual component with no data dependencies.

## Tier 2: Medium Risk, Good Value (Next Steps)

These refactorings involve moderate changes to existing code but are still relatively safe.

### 5. Standardize Error Handling

**Difficulty:** Medium-Easy
**Risk:** Low-Medium
**Files Affected:**
- All server action files

Creating shared error handling utilities can be done incrementally, file by file, making it a safer refactoring. Since error handling is not part of the happy path, there's less risk of breaking core functionality.

### 6. Form Layout Components

**Difficulty:** Medium
**Risk:** Medium
**Files Affected:**
- All form components

This refactoring involves creating layout components (FormSection, FormRow, FormActions) that can be adopted gradually. The changes are mainly structural and don't affect form functionality.

### 7. Centralize Shared Schema Components

**Difficulty:** Medium
**Risk:** Medium
**Files Affected:**
- `/app/invoices/actions.ts`
- `/app/quotes/actions.ts`

Moving schema definitions to a central location requires careful validation to ensure that all field definitions remain exactly the same. The risk comes from potentially missing subtle differences between schemas.

## Tier 3: Higher Risk, High Value (Careful Planning Required)

These refactorings involve significant changes to core components and require thorough testing.

### 8. Reusable Form Field Components

**Difficulty:** Medium-Hard
**Risk:** Medium
**Files Affected:**
- All form components

Creating reusable form field components requires careful handling of props, validation, and state management. While beneficial, this refactoring touches critical user input handling code.

### 9. Create Form Data Parsing Utilities

**Difficulty:** Medium-Hard
**Risk:** Medium-High
**Files Affected:**
- `/app/invoices/actions.ts`
- `/app/quotes/actions.ts`

Form data parsing is critical to the application's functionality. Changes here require thorough testing to ensure data is correctly processed, especially for complex nested structures like line items.

### 10. Create Reusable Entity Actions Cell

**Difficulty:** Hard
**Risk:** Medium-High
**Files Affected:**
- All entity column definition files

This refactoring touches important user interaction points. The implementation must handle various action types, permissions, and state management correctly to avoid breaking user workflows.

## Tier 4: Complex, High Risk (Requires Comprehensive Testing)

These are the most invasive refactorings that affect core application logic.

### 11. Create Reusable Table Column Factory

**Difficulty:** Hard
**Risk:** High
**Files Affected:**
- All entity column definition files

Table columns are fundamental to the application's UI. This refactoring touches complex configuration that determines how data is displayed, sorted, and interacted with.

### 12. Generic Entity Form Dialog

**Difficulty:** Hard
**Risk:** High
**Files Affected:**
- Dialog-based forms

Form dialogs combine complex state management, validation, and API interactions. Refactoring these requires careful handling of dialog state, form submission, and error handling.

### 13. Create a Generic CRUD Action Factory

**Difficulty:** Very Hard
**Risk:** Very High
**Files Affected:**
- All server action files

This is the most invasive refactoring as it touches the core data operations of the application. While it offers significant benefits in terms of code reduction, it also poses the highest risk of introducing bugs in critical functionality.

## Implementation Strategy

To minimize risk while maximizing value:

1. **Phase 1 (Immediate):** Implement Tier 1 refactorings as quick wins
   - Create shared constants
   - Implement status badge component
   - Centralize Supabase client
   - Create generic table skeleton

2. **Phase 2 (Short-term):** Address Tier 2 refactorings
   - Standardize error handling
   - Create form layout components
   - Centralize schema components

3. **Phase 3 (Medium-term):** Carefully implement Tier 3 with thorough testing
   - Create reusable form fields
   - Implement form data parsing utilities
   - Build entity actions cell

4. **Phase 4 (Long-term):** Plan comprehensive refactoring for Tier 4
   - Table column factory
   - Entity form dialog
   - CRUD action factory

Each phase should include:
- Thorough test coverage before and after changes
- Careful review of changes
- Documentation of the new patterns
- Gradual adoption where possible (implement alongside existing code)

This approach balances immediate improvements with long-term maintainability while managing risk appropriately.