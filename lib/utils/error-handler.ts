/**
 * Centralized error handling utilities for consistent error management
 * throughout the application.
 */

import { ZodError } from "zod";
import { toast } from "sonner";

/**
 * Standard error response structure for server actions
 */
export interface ErrorResponse {
  error: string;
  code?: string;
  fieldErrors?: Record<string, string[]>;
}

/**
 * Handles Zod validation errors in a consistent way
 * 
 * @param error - The Zod validation error
 * @param entityName - The name of the entity being validated (e.g., "customer", "invoice")
 * @returns A standardized error response object
 */
export function handleValidationError(error: ZodError, entityName: string): ErrorResponse {
  console.error(`Validation Error (${entityName}):`, error.flatten().fieldErrors);
  
  return {
    error: `Invalid ${entityName} data. Please check the fields.`,
    fieldErrors: error.flatten().fieldErrors,
  };
}

/**
 * Handles database operation errors in a consistent way
 * 
 * @param error - The database error object
 * @param operation - The operation being performed (e.g., "create", "update", "delete")
 * @param entityName - The name of the entity being operated on
 * @returns A standardized error response object
 */
export function handleDatabaseError(
  error: any, 
  operation: string, 
  entityName: string
): ErrorResponse {
  console.error(`Database Error (${operation} ${entityName}):`, error);
  
  // Handle common database errors with user-friendly messages
  if (error?.code === '23505') {
    return { 
      error: `This ${entityName} already exists. Please try a different name or identifier.`,
      code: error.code
    };
  }
  
  if (error?.code === '23503') {
    return { 
      error: `This ${entityName} is referenced by other records and cannot be ${operation}d.`,
      code: error.code
    };
  }
  
  // Default error message
  return { 
    error: `Database Error: ${error.message || "An unexpected error occurred"}`,
    code: error.code
  };
}

/**
 * Displays an error message to the user via toast notification
 * 
 * @param errorResponse - The error response object
 */
export function showErrorToast(errorResponse: ErrorResponse) {
  toast.error(errorResponse.error, {
    description: errorResponse.fieldErrors 
      ? "Please correct the highlighted fields." 
      : undefined,
    duration: 5000,
  });
}

/**
 * Displays a success message to the user via toast notification
 * 
 * @param message - The success message
 * @param description - Optional description for the toast
 */
export function showSuccessToast(message: string, description?: string) {
  toast.success(message, {
    description,
    duration: 3000,
  });
}