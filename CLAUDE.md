# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AgeQuant CRM v3 is a customer relationship management system built with Next.js, TypeScript, Tailwind CSS, and Shadcn/ui components. The application manages customers, products, quotes, and invoices with features for dashboard metrics and responsive design.

## Development Commands

### Basic Commands

```bash
# Start development server
npm run dev

# Build the application
npm run build

# Start production server
npm run start

# Run linter
npm run lint
```

### Testing Commands

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run a specific test file
npm run test:file __tests__/path/to/test.ts

# Generate coverage report
npm test -- --coverage
```

## Architecture

### Database

The application uses Supabase as its database and backend service. Key tables include:

- `customers` - Customer information with soft delete support
- `products` - Product catalog with pricing information
- `invoices` - Invoice records with line items
- `quotes` - Quote records with line items
- `issuing_entities` - Entities that can issue invoices/quotes
- `payment_sources` - Payment methods for customers
- `app_settings` - Application-wide settings including base currency

Database connections are managed through:
- `/lib/supabase/client.ts` - Browser client for client-side operations
- `/lib/supabase/server-client.ts` - Server client for server actions

Data fetching is primarily done in server components using the Supabase server client.

### Application Structure

- `/app` - Next.js app directory with pages and server actions
- `/components` - Reusable UI components organized by feature
- `/hooks` - Custom React hooks
- `/lib` - Utility functions, constants, and schemas
- `/supabase` - Database migrations and configuration

### Key Patterns

1. **Server Actions**: All database operations are performed through server actions in `/app/*/actions.ts` files.

2. **Form Handling**: Forms use React Hook Form with Zod validation schemas:
   - Form schemas are defined in `/components/*/[entity]-form-schema.ts`
   - Forms are implemented in `/components/*/[entity]-form.tsx`

3. **Data Tables**: Tables use TanStack Table with column definitions in `/components/*/[entity]-columns.tsx`

4. **Error Handling**: Centralized error handling through `/lib/utils/error-handler.ts`

5. **Type Safety**: Zod schemas define and validate data structures

## Workflow Patterns

### Creating/Updating Records

1. Forms collect user input (`[entity]-form.tsx`)
2. Input is validated using Zod schemas (`[entity]-form-schema.ts`)
3. Server action processes the validated data (`actions.ts`)
4. Server action interacts with the database via Supabase
5. On success, the cache is revalidated and the user is redirected
6. On error, formatted error messages are returned to the user

### Database Operations

Database operations follow this pattern:
1. Get Supabase client with `getServerSupabaseClient()`
2. Validate input data with Zod schemas
3. Map validated data to database columns
4. Perform database operation
5. Handle any errors using `handleDatabaseError`
6. Revalidate paths as needed with `revalidatePath`

## Best Practices

1. Use server actions for all database operations
2. Handle form validation with Zod schemas
3. Follow the established error handling patterns
4. Maintain type safety throughout the application
5. Keep UI components modular and reusable
6. Use shared utility functions instead of duplicating code
7. Write tests for new functionality

## Testing

The application uses Jest and React Testing Library for testing. All tests are located in the `__tests__` directory, organized to mirror the project structure.

### Types of Tests

1. **Unit Tests**: Test individual functions and utilities in isolation
   - Located in `__tests__/lib`
   - Focus on input/output relationships and edge cases

2. **Component Tests**: Test React components
   - Located in `__tests__/components`
   - Focus on rendering, user interactions, and component behavior

3. **Integration Tests**: Test integration between components and services
   - Located in `__tests__/app`
   - Test server actions and form submissions

### Testing Patterns

1. **Component Testing**:
   - Test component rendering with `render`
   - Find elements using accessible queries like `getByRole` or `getByText`
   - Simulate user actions with `userEvent`
   - Verify component state and behavior with `expect`

2. **Server Action Testing**:
   - Mock Supabase client with `jest.mock`
   - Test successful operations and error handling
   - Verify redirects and cache revalidation

3. **Test Organization**:
   - Group related tests with `describe`
   - Reset mocks with `beforeEach`
   - Use specific assertions for clarity

### CI/CD

Tests run automatically on pull requests through GitHub Actions. The CI pipeline will:
1. Install dependencies
2. Run linting
3. Run tests
4. Generate and upload code coverage reports