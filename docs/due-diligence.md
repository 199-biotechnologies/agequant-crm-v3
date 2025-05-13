# AgeQuant CRM Due Diligence Report

## Project Overview

This document provides a comprehensive analysis of the AgeQuant CRM v3 codebase, examining its structure, file organization, and implementation details. The application is a full-stack CRM built with Next.js, Supabase, and TailwindCSS, offering functionality for managing customers, products, quotes, and invoices.

## Project Structure

```
- /app/ - Next.js app directory containing pages and API routes
  - /api/ - Backend API endpoints
  - /customers/ - Customer management pages
  - /invoices/ - Invoice management pages
  - /products/ - Product management pages
  - /quotes/ - Quote management pages
  - /settings/ - Application settings pages
- /components/ - Reusable React components
  - /customers/ - Customer-specific components
  - /dashboard/ - Dashboard widgets
  - /invoices/ - Invoice-specific components
  - /layout/ - Layout components
  - /products/ - Product-specific components
  - /quotes/ - Quote-specific components
  - /settings/ - Settings-specific components
  - /ui/ - Generic UI components
- /docs/ - Documentation files
- /hooks/ - Custom React hooks
- /lib/ - Utility functions and shared code
  - /supabase/ - Supabase client configuration
- /public/ - Static assets
- /styles/ - Global CSS
- /supabase/ - Database migrations and configurations
```

## Key TypeScript/TSX Files Analysis

### Core Infrastructure

#### `/lib/utils.ts` (6 lines)
Tiny utility file exporting a single `cn()` function that combines class names using clsx and tailwind-merge for efficient Tailwind CSS class handling.

#### `/lib/supabase/client.ts` (10 lines)
Creates and exports a Supabase browser client using environment credentials, enabling frontend components to interact with Supabase services.

#### `/hooks/use-toast.ts` (194 lines)
Comprehensive React hook implementing a toast notification system with state management for creating, updating, and removing notifications.

#### `/hooks/use-mobile.tsx` (20 lines)
Simple React hook that detects if the current viewport is mobile-sized based on a 768px breakpoint using media queries.

### Application Layout

#### `/app/layout.tsx` (30 lines)
Root layout component that wraps the entire application with theme provider and app layout, configuring global settings like fonts and metadata.

#### `/app/page.tsx` (170 lines)
Main dashboard page displaying KPIs, overdue invoices, expiring quotes, revenue chart, and recently updated records with interactive elements.

#### `/components/layout/app-layout.tsx` (63 lines)
Client-side application layout component organizing the app structure with sidebar navigation, topbar, and main content area.

#### `/components/layout/sidebar.tsx` (51 lines)
Client-side sidebar with responsive collapsible navigation links and icons.

#### `/components/layout/top-bar.tsx` (38 lines)
Client-side component with menu toggle for mobile, conditional back button, and contextual action buttons.

### Customer Management

#### `/app/customers/page.tsx` (55 lines)
Server component that fetches customer data from Supabase and renders the customer listing page with data table component.

#### `/app/customers/actions.ts` (218 lines)
Server actions implementing CRUD operations for customer management with Supabase, including validation and error handling.

#### `/components/customers/customer-form.tsx` (356 lines)
Form component for creating and editing customers with validation and field management.

#### `/components/customers/customer-columns.tsx` (202 lines)
Defines table column configuration for customer listings with sorting, formatting, and row actions.

#### `/components/customers/customer-form-schema.ts` (19 lines)
Zod schema defining validation rules for customer forms with support for optional fields.

#### `/components/customers/customer-data-table-client-wrapper.tsx` (36 lines)
Client-side wrapper for the data table component to handle customer data display.

### Product Management

#### `/app/products/actions.ts` (358 lines)
Server actions handling product CRUD operations with support for SKU generation and multi-currency pricing.

#### `/components/products/product-form.tsx` (356 lines)
Form component for products with real-time FX rate functionality for price suggestions across currencies.

#### `/components/products/product-columns.tsx` (168 lines)
Column definitions for product tables with sorting and row actions including view, edit, and delete.

#### `/components/products/product-form-schema.ts` (48 lines)
Validation schemas for products with constraints on required fields and pricing information.

#### `/components/products/product-data-table-client-wrapper.tsx` (36 lines)
Client-side wrapper for the product data table component.

### Invoice Management

#### `/app/invoices/actions.ts` (473 lines)
Comprehensive server actions for invoice CRUD operations with complex validation and database transaction handling.

#### `/components/invoices/invoice-form.tsx` (771 lines)
Extensive form component for invoice creation and editing with dynamic line items, tax calculations, and totals.

#### `/components/invoices/invoice-columns.tsx` (184 lines)
Column definitions for invoice tables with status badges, date formatting, and contextual actions.

#### `/components/invoices/invoice-table-skeleton.tsx` (38 lines)
Loading skeleton component for invoice tables to improve perceived performance.

### Quote Management

#### `/app/quotes/actions.ts` (410 lines)
Server actions for quote management with similar structure to invoices but with quote-specific logic.

#### `/components/quotes/quote-form.tsx` (695 lines)
Form component for quotes with similar structure to invoice form but with quote-specific fields like expiry date.

#### `/components/quotes/quote-columns.tsx` (182 lines)
Column definitions for quote tables with status badges and actions including conversion to invoice.

### Settings Management

#### `/app/settings/types.ts` (118 lines)
Type definitions and validation schemas for settings-related data structures.

#### `/app/settings/actions.ts` (6 lines)
Simple re-export file for settings-related server actions.

#### `/app/settings/app-settings.actions.ts` (134 lines)
Server actions for application settings management including base currency and tax rates.

#### `/app/settings/issuing-entities.actions.ts` (242 lines)
Server actions for issuing entities with file upload handling for logos.

#### `/components/settings/issuing-entity-form-dialog.tsx` (287 lines)
Dialog form component for creating and editing issuing entities with file upload support.

### API Routes

#### `/app/api/fx/route.ts` (231 lines)
API endpoint for currency exchange rates with European Central Bank integration and caching.

#### `/app/api/ids/product_sku/route.ts` (55 lines)
API endpoint for generating unique product SKU identifiers with database collision checking.

### UI Components

#### `/components/ui/data-table.tsx` (116 lines)
Reusable data table component built on TanStack Table with sorting, filtering, and pagination.

#### `/components/dashboard/dashboard-kpi.tsx` (58 lines)
Dashboard KPI component for displaying metrics with trend indicators and icons.

#### `/components/dashboard/revenue-chart.tsx` (53 lines)
Bar chart component for visualizing monthly revenue using Recharts.

## Key Non-TypeScript Files

#### `/next.config.mjs`
Next.js configuration file setting up build options and feature flags.

#### `/components.json`
Configuration for shadcn/ui component system with style settings.

#### `/tailwind.config.ts`
Tailwind CSS configuration defining colors, animations, and responsive styling.

#### `/supabase/migrations/20250508123220_create_customers_table.sql`
Database migration creating the customers table with tracking fields and triggers.

#### `/supabase/migrations/20251205195500_create_invoices_and_items.sql`
Migration establishing invoices and line items tables with relationships.

#### `/supabase/migrations/20251205195600_create_quotes_and_items.sql`
Migration creating quotes and line items with similar structure to invoices.

#### `/docs/front-end-ui.md`
Detailed UI specification document for all screens and components.

## Summary Statistics

- **Total TypeScript/TSX Files:** ~120
- **Largest Files:**
  - `/components/invoices/invoice-form.tsx` (771 lines)
  - `/components/quotes/quote-form.tsx` (695 lines)
  - `/app/invoices/actions.ts` (473 lines)
  - `/app/quotes/actions.ts` (410 lines)
  - `/app/products/actions.ts` (358 lines)
- **Core Functionality Areas:**
  - Customer Management (~650 lines)
  - Product Management (~970 lines)
  - Invoice Management (~1,500 lines)
  - Quote Management (~1,300 lines)
  - Settings Management (~790 lines)
  - UI Components (~3,000 lines across 50+ components)

## Architecture Observations

1. **Next.js App Router Pattern** - The application follows Next.js 13+ app router pattern with server components for data fetching and client components for interactivity.

2. **Server Actions** - Extensive use of Next.js server actions for database operations with Supabase.

3. **Form Management** - Consistent pattern of Zod schemas for validation paired with React Hook Form.

4. **UI Component Library** - Built on shadcn/ui with consistent styling and behavior.

5. **Database Design** - Uses Supabase with soft deletion patterns and timestamp tracking.

6. **Multi-currency Support** - Built-in support for multiple currencies with exchange rate functionality.

The application follows modern React patterns with a clear separation of concerns between server and client components, data fetching, and UI rendering. The codebase is well-structured with consistent patterns across different modules.