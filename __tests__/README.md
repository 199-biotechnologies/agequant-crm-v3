# AgeQuant CRM v3 Tests

This directory contains tests for the AgeQuant CRM v3 application, organized by type and component structure.

## Directory Structure

- `__tests__/app/` - Tests for server actions and API endpoints
- `__tests__/components/` - Tests for React components
- `__tests__/lib/` - Tests for utility functions and helpers

## Running Tests

To run all tests:

```bash
pnpm test
```

To run tests in watch mode during development:

```bash
pnpm test:watch
```

To generate a coverage report:

```bash
pnpm test -- --coverage
```

## Testing Tools

- Jest - Test runner and assertion library
- React Testing Library - Component testing utilities
- User Event - Simulating user interactions
- Jest DOM - DOM testing assertions

## Writing Tests

### Component Tests

Component tests should focus on user interaction and rendered output, not implementation details:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '@/components/ui/button'

test('calls onClick when clicked', async () => {
  const handleClick = jest.fn()
  const user = userEvent.setup()
  
  render(<Button onClick={handleClick}>Click me</Button>)
  
  await user.click(screen.getByRole('button', { name: /click me/i }))
  
  expect(handleClick).toHaveBeenCalledTimes(1)
})
```

### Utility Tests

Utility function tests should test the API contract and various edge cases:

```tsx
import { formatCurrency } from '@/lib/utils'

test('formats currency correctly', () => {
  expect(formatCurrency(1000, 'USD')).toBe('$1,000.00')
  expect(formatCurrency(1000, 'EUR')).toBe('€1,000.00')
  expect(formatCurrency(0, 'USD')).toBe('$0.00')
})
```

### Server Action Tests

Server action tests should mock database calls and test error handling:

```tsx
import { createCustomer } from '@/app/customers/actions'
import { getServerSupabaseClient } from '@/lib/supabase/server-client'

// Mock dependencies
jest.mock('@/lib/supabase/server-client')

test('creates customer correctly', async () => {
  // Mock implementation
  (getServerSupabaseClient as jest.Mock).mockResolvedValue({
    from: jest.fn().mockReturnThis(),
    insert: jest.fn().mockResolvedValue({ data: { id: '123' }, error: null })
  })
  
  const formData = new FormData()
  formData.append('name', 'Test Customer')
  
  const result = await createCustomer(formData)
  
  expect(result).toEqual({ success: true })
})
```

## Continuous Integration

Tests are automatically run in the CI pipeline via GitHub Actions on pushes to the main branch and pull requests. See the `.github/workflows/test.yml` file for configuration details.