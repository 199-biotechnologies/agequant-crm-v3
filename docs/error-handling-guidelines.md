# Error Handling Guidelines

This document outlines the error handling patterns and best practices implemented in the AgeQuant CRM application.

## Core Principles

1. **User-Friendly Messages**: All error messages are designed to be understandable by users without technical knowledge.
2. **Helpful Recovery Suggestions**: Error messages include guidance on how to resolve issues.
3. **Contextual Severity**: Errors are categorized by severity to indicate their impact and urgency.
4. **Consistent Format**: A standard error response structure is used throughout the application.
5. **Detailed Logging**: Errors are logged with contextual information for troubleshooting.

## Error Response Structure

The application uses a standardized `ErrorResponse` interface:

```typescript
interface ErrorResponse {
  error: string;             // User-friendly error message
  code?: string;             // Error code (e.g., database error code)
  type?: ErrorType;          // Categorized error type
  severity?: ErrorSeverity;  // Error severity level
  fieldErrors?: Record<string, string[]>; // Form validation errors by field
  context?: Record<string, any>; // Additional context for logging
  help?: string;             // Recovery suggestion for users
}
```

## Error Types

Errors are categorized into specific types:

```typescript
enum ErrorType {
  VALIDATION = 'validation',   // Input validation errors
  DATABASE = 'database',       // Database operation errors
  NETWORK = 'network',         // Network connectivity issues
  AUTH = 'authentication',     // Authentication errors
  PERMISSION = 'permission',   // Permission/authorization errors
  NOT_FOUND = 'not_found',     // Resource not found errors
  RATE_LIMIT = 'rate_limit',   // Rate limiting errors
  TIMEOUT = 'timeout',         // Request timeout errors
  UNKNOWN = 'unknown'          // Uncategorized errors
}
```

## Error Severity Levels

Errors are assigned severity levels to indicate their impact:

```typescript
enum ErrorSeverity {
  INFO = 'info',           // Informational messages
  WARNING = 'warning',     // Warning conditions
  ERROR = 'error',         // Error conditions
  CRITICAL = 'critical'    // Critical errors requiring immediate attention
}
```

## Error Handling Utilities

### Validation Error Handling

For handling form validation errors:

```typescript
// Example usage
if (!validatedFields.success) {
  return handleValidationError(validatedFields.error, 'customer');
}
```

The `handleValidationError` function:
- Creates user-friendly error messages based on field count
- Maps field names to readable formats
- Includes help text for resolution
- Returns a standardized error response

### Database Error Handling

For handling database operation errors:

```typescript
// Example usage
if (error) {
  return handleDatabaseError(error, 'create', 'customer', {
    companyName: customerData.company_contact_name
  });
}
```

The `handleDatabaseError` function:
- Maps database error codes to user-friendly messages
- Includes help text for recovery
- Sets appropriate severity levels
- Adds operational context for logging
- Returns a standardized error response

### API Error Handling

For handling network and API errors:

```typescript
// Example usage
try {
  // API operation
} catch (error) {
  return handleApiError(error, 'Fetching customer data', {
    customerId: id
  });
}
```

The `handleApiError` function:
- Detects error types based on error properties
- Creates appropriate user messages based on error type
- Sets helpful recovery suggestions
- Returns a standardized error response

## Error Display Components

### Form Error Component

The `FormError` component provides consistent error display with:
- Visual styling based on error severity
- Appropriate icons for different error types
- Contextual titles based on error type
- Display of both error message and help text

```tsx
// Example usage
{serverError && (
  <FormError 
    error={serverError} 
    className="mb-6"
  />
)}
```

### Toast Notifications

For transient error notifications, the `showErrorToast` function:
- Displays toast notifications with appropriate styling
- Adjusts duration based on error severity
- Includes help text when available

```typescript
// Example usage
showErrorToast(errorResponse);
```

## Best Practices

1. **Always Use Standard Utilities**: Use the provided error handling utilities rather than creating custom error handling.

2. **Add Context to Errors**: Include relevant context information when handling errors:
   ```typescript
   handleDatabaseError(error, 'update', 'customer', {
     customerId: id,
     attemptedOperation: 'status change'
   });
   ```

3. **Use Try/Catch Blocks**: Wrap server actions in try/catch blocks to handle unexpected errors:
   ```typescript
   try {
     // Operation
   } catch (error) {
     return handleApiError(error, 'Operation description');
   }
   ```

4. **Map Form Errors to Fields**: When handling validation errors in forms, map server-side errors to the appropriate fields:
   ```typescript
   if (result.fieldErrors) {
     Object.entries(result.fieldErrors).forEach(([field, errors]) => {
       if (errors && errors.length > 0) {
         form.setError(field as any, {
           type: 'server',
           message: errors[0]
         });
       }
     });
   }
   ```

5. **Be Specific with Error Messages**: Provide clear, specific error messages that help the user understand what went wrong.

6. **Always Provide Help Text**: Include suggestions on how to resolve the error whenever possible.

## Implementation Examples

### Server Action Example

```typescript
export async function createCustomer(formData: FormData): Promise<ErrorResponse | void> {
  const supabase = await getServerSupabaseClient();

  try {
    // Validate form data
    const validatedFields = customerFormSchema.safeParse(rawFormData);
    if (!validatedFields.success) {
      return handleValidationError(validatedFields.error, 'customer');
    }

    // Database operation
    const { error } = await supabase.from('customers').insert([customerData]);
    if (error) {
      return handleDatabaseError(error, 'create', 'customer', {
        companyName: customerData.company_contact_name
      });
    }

    // Success path
    revalidatePath('/customers');
    redirect('/customers');
  } catch (error) {
    // Handle unexpected errors
    return handleApiError(error, 'Creating customer', {
      formData: Object.fromEntries(formData.entries())
    });
  }
}
```

### Form Component Example

```tsx
export function CustomerForm({ serverAction }: Props) {
  const [serverError, setServerError] = useState<ErrorResponse | null>(null);
  
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setServerError(null);
    
    try {
      const formData = new FormData(e.currentTarget);
      const result = await serverAction(formData);
      
      if (result && 'error' in result) {
        setServerError(result as ErrorResponse);
        
        // Map field errors to form fields
        if (result.fieldErrors) {
          Object.entries(result.fieldErrors).forEach(([field, errors]) => {
            if (errors && errors.length > 0) {
              form.setError(field as any, {
                type: 'server',
                message: errors[0]
              });
            }
          });
        }
      }
    } catch (error) {
      setServerError({
        error: "An unexpected error occurred. Please try again.",
      });
    }
  };
  
  return (
    <Form {...form}>
      <FormContainer onSubmit={handleSubmit}>
        {serverError && (
          <FormError error={serverError} className="mb-6" />
        )}
        
        {/* Form fields */}
      </FormContainer>
    </Form>
  );
}
```