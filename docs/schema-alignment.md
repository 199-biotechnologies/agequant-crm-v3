# Schema Alignment Documentation

This document outlines the schema alignment fixes implemented to ensure consistency between database schemas and frontend validation schemas.

## Issues Fixed

### 1. Invoice Status Constraints

**Issue:** The `invoices` table CHECK constraint did not include the 'Cancelled' status, which was defined in the `INVOICE_STATUSES` constant in the frontend code.

**Fix:** Added the 'Cancelled' status to the CHECK constraint on the `invoices` table to allow saving invoices with this status.

```sql
ALTER TABLE invoices
  DROP CONSTRAINT IF EXISTS invoices_status_check;

ALTER TABLE invoices
  ADD CONSTRAINT invoices_status_check 
  CHECK (status IN ('Draft', 'Sent', 'Paid', 'Overdue', 'Cancelled'));
```

### 2. Quote Status Constraints

**Issue:** The `quotes` table CHECK constraint did not include the 'Expired' status, which was defined in the `QUOTE_STATUSES` constant in the frontend code.

**Fix:** Added the 'Expired' status to the CHECK constraint on the `quotes` table to allow saving quotes with this status.

```sql
ALTER TABLE quotes
  DROP CONSTRAINT IF EXISTS quotes_status_check;

ALTER TABLE quotes
  ADD CONSTRAINT quotes_status_check 
  CHECK (status IN ('Draft', 'Sent', 'Accepted', 'Rejected', 'Expired'));
```

### 3. Naming Inconsistency Between Frontend and Database

**Issue:** The Zod validation schemas used `entityId` while the database tables used `issuing_entity_id`, causing confusion and mapping errors.

**Fix:** 
- Updated Zod schemas to use `issuingEntityId` instead of `entityId` to better match the database column naming pattern
- Updated the form components and server actions to use the new field name

## Migration

A SQL migration file was created to apply these changes to the database:

- Migration file: `20251205195700_update_status_constraints.sql`

## Documentation

Added comments to the database constraints to document the alignment with frontend constants:

```sql
COMMENT ON CONSTRAINT invoices_status_check ON invoices IS 
  'Aligns with INVOICE_STATUSES constant in lib/constants.ts';

COMMENT ON CONSTRAINT quotes_status_check ON quotes IS 
  'Aligns with QUOTE_STATUSES constant in lib/constants.ts';
```

## Checking for Future Schema Alignment Issues

When adding new fields or constraints, ensure:

1. Database column names match or have clear mappings to Zod schema field names
2. Database CHECK constraints include all valid values defined in frontend constants
3. Document any intentional differences between database and frontend schemas
4. Server actions correctly map between frontend and database field names

Regular schema audits are recommended to prevent similar issues in the future.