/**
 * Centralized error handling utilities for consistent error management
 * throughout the application.
 */

import { ZodError } from "zod";
import { toast } from "sonner";

/**
 * Error types for better categorization
 */
export enum ErrorType {
  VALIDATION = 'validation',
  DATABASE = 'database',
  NETWORK = 'network',
  AUTH = 'authentication',
  PERMISSION = 'permission',
  NOT_FOUND = 'not_found',
  RATE_LIMIT = 'rate_limit',
  TIMEOUT = 'timeout',
  UNKNOWN = 'unknown'
}

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

/**
 * Standard error response structure for server actions
 */
export interface ErrorResponse {
  error: string;
  code?: string;
  type?: ErrorType;
  severity?: ErrorSeverity;
  fieldErrors?: Record<string, string[]>;
  context?: Record<string, any>;
  help?: string;
}

/**
 * Handles Zod validation errors in a consistent way with improved messaging
 * 
 * @param error - The Zod validation error
 * @param entityName - The name of the entity being validated (e.g., "customer", "invoice")
 * @returns A standardized error response object
 */
export function handleValidationError(error: ZodError, entityName: string): ErrorResponse {
  console.error(`Validation Error (${entityName}):`, error.flatten().fieldErrors);
  
  // Get field count for better messaging
  const fieldCount = Object.keys(error.flatten().fieldErrors).length;
  
  // Generate a more helpful error message based on field count
  let errorMessage = '';
  if (fieldCount === 1) {
    const fieldName = Object.keys(error.flatten().fieldErrors)[0];
    const readableFieldName = fieldName
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .toLowerCase();
    errorMessage = `Please check the ${readableFieldName} field.`;
  } else {
    errorMessage = `Please correct ${fieldCount} invalid fields.`;
  }
  
  return {
    error: `Invalid ${entityName} data. ${errorMessage}`,
    type: ErrorType.VALIDATION,
    severity: ErrorSeverity.WARNING,
    fieldErrors: error.flatten().fieldErrors,
    help: "Review the highlighted fields and correct your input."
  };
}

/**
 * Maps database error codes to user-friendly messages and recovery suggestions
 */
const dbErrorCodeMap: Record<string, { message: string, help: string, severity: ErrorSeverity }> = {
  // Postgres error codes
  '23505': { 
    message: 'already exists with this identifier', 
    help: 'Try using a different name or identifier.',
    severity: ErrorSeverity.WARNING
  },
  '23503': { 
    message: 'is referenced by other records and cannot be modified', 
    help: 'Remove the references to this item first.',
    severity: ErrorSeverity.WARNING
  },
  '23502': { 
    message: 'is missing required data', 
    help: 'Ensure all required fields are filled.',
    severity: ErrorSeverity.WARNING
  },
  '23514': { 
    message: 'violates a constraint', 
    help: 'Check that your data meets all requirements.',
    severity: ErrorSeverity.WARNING
  },
  '42P01': { 
    message: 'references a table that does not exist', 
    help: 'This is a system error. Please contact support.',
    severity: ErrorSeverity.ERROR
  },
  '42703': { 
    message: 'references a column that does not exist', 
    help: 'This is a system error. Please contact support.',
    severity: ErrorSeverity.ERROR
  },
  '28000': { 
    message: 'encountered an authentication error', 
    help: 'Try signing out and back in again.',
    severity: ErrorSeverity.ERROR
  },
  '28P01': { 
    message: 'has invalid credentials', 
    help: 'Try signing out and back in again.',
    severity: ErrorSeverity.ERROR
  },
  '57014': { 
    message: 'operation timed out', 
    help: 'Try again later or with a smaller data set.',
    severity: ErrorSeverity.WARNING
  },
  '08006': { 
    message: 'could not connect to the database', 
    help: 'Check your internet connection and try again.',
    severity: ErrorSeverity.ERROR
  },
  '53100': { 
    message: 'encountered a disk full error', 
    help: 'Please contact support as the server is experiencing issues.',
    severity: ErrorSeverity.CRITICAL
  },
  '53200': { 
    message: 'encountered an out of memory error', 
    help: 'Try again later or with a smaller data set.',
    severity: ErrorSeverity.ERROR
  },
  '53300': { 
    message: 'exceeded the maximum connection limit', 
    help: 'Try again in a few minutes when the system is less busy.',
    severity: ErrorSeverity.WARNING
  },
  '55P03': { 
    message: 'encountered a disk full error', 
    help: 'Please contact support as the server is experiencing issues.',
    severity: ErrorSeverity.CRITICAL
  }
};

/**
 * Handles database operation errors in a consistent way with improved messaging
 * 
 * @param error - The database error object
 * @param operation - The operation being performed (e.g., "create", "update", "delete")
 * @param entityName - The name of the entity being operated on
 * @param context - Additional context information for error reports
 * @returns A standardized error response object
 */
export function handleDatabaseError(
  error: any, 
  operation: string, 
  entityName: string,
  context?: Record<string, any>
): ErrorResponse {
  console.error(`Database Error (${operation} ${entityName}):`, error, context || {});
  
  // Map the operation to a more readable format for the error message
  const readableOperation = mapOperationToReadable(operation);
  
  // Look up error info from the map or use a default
  const errorInfo = error?.code && dbErrorCodeMap[error.code] 
    ? dbErrorCodeMap[error.code]
    : {
        message: 'encountered an error', 
        help: 'Try again or check your input.',
        severity: ErrorSeverity.ERROR
      };
  
  // Create the user-friendly error message
  const userMessage = `Could not ${readableOperation} ${entityName}. The ${entityName} ${errorInfo.message}.`;
  
  // Return standardized error response
  return { 
    error: userMessage,
    code: error?.code,
    type: ErrorType.DATABASE,
    severity: errorInfo.severity,
    help: errorInfo.help,
    context: {
      operation,
      entityName,
      originalMessage: error.message,
      ...(context || {})
    }
  };
}

/**
 * Handles general API errors and unexpected exceptions
 * 
 * @param error - The error object
 * @param action - The action being performed
 * @param context - Additional context information
 * @returns A standardized error response object
 */
export function handleApiError(
  error: any,
  action: string,
  context?: Record<string, any>
): ErrorResponse {
  console.error(`API Error (${action}):`, error, context || {});
  
  // Determine error type based on error properties
  let errorType = ErrorType.UNKNOWN;
  let severity = ErrorSeverity.ERROR;
  let message = "An unexpected error occurred.";
  let help = "Please try again later.";
  
  // Detect network errors
  if (error instanceof TypeError && error.message.includes('network')) {
    errorType = ErrorType.NETWORK;
    message = "Network error. Please check your internet connection.";
    help = "Ensure you're connected to the internet and try again.";
  } 
  // Detect timeout errors
  else if (error.name === 'TimeoutError' || error.message?.includes('timeout')) {
    errorType = ErrorType.TIMEOUT;
    message = "The request timed out.";
    help = "The server is taking too long to respond. Try again later.";
  }
  // Detect authentication errors
  else if (error.status === 401 || error.message?.includes('unauthorized')) {
    errorType = ErrorType.AUTH;
    message = "Authentication error. You may need to sign in again.";
    help = "Try signing out and back in.";
  }
  // Detect permission errors
  else if (error.status === 403 || error.message?.includes('forbidden')) {
    errorType = ErrorType.PERMISSION;
    message = "You don't have permission to perform this action.";
    help = "Contact your administrator if you believe this is an error.";
  }
  // Detect not found errors
  else if (error.status === 404 || error.message?.includes('not found')) {
    errorType = ErrorType.NOT_FOUND;
    message = "The requested resource was not found.";
    help = "The item may have been deleted or moved.";
  }
  // Detect rate limit errors
  else if (error.status === 429 || error.message?.includes('rate limit')) {
    errorType = ErrorType.RATE_LIMIT;
    severity = ErrorSeverity.WARNING;
    message = "Rate limit exceeded.";
    help = "Please wait a moment before trying again.";
  }
  
  return {
    error: `${action} failed. ${message}`,
    type: errorType,
    severity: severity,
    code: error.status?.toString() || error.code,
    help: help,
    context: {
      action,
      originalMessage: error.message,
      ...(context || {})
    }
  };
}

/**
 * Maps operation strings to more readable forms for error messages
 */
function mapOperationToReadable(operation: string): string {
  const operationMap: Record<string, string> = {
    'create': 'create',
    'update': 'update',
    'delete': 'delete',
    'find': 'find',
    'get': 'retrieve',
    'list': 'list',
    'upload': 'upload',
    'download': 'download',
    'send': 'send',
    'process': 'process',
    'validate': 'validate',
    'activate': 'activate',
    'deactivate': 'deactivate',
    'archive': 'archive',
    'restore': 'restore',
    'convert': 'convert'
  };
  
  return operationMap[operation.toLowerCase()] || operation;
}

/**
 * Displays an error message to the user via toast notification
 * with improvements based on error severity and type
 * 
 * @param errorResponse - The error response object
 */
export function showErrorToast(errorResponse: ErrorResponse) {
  // Determine toast duration based on error severity
  let duration = 5000; // default
  if (errorResponse.severity === ErrorSeverity.CRITICAL) {
    duration = 8000;
  } else if (errorResponse.severity === ErrorSeverity.INFO) {
    duration = 3000;
  }
  
  // Construct description with help text if available
  const description = errorResponse.help
    ? errorResponse.help
    : errorResponse.fieldErrors 
      ? "Please correct the highlighted fields." 
      : undefined;
  
  toast.error(errorResponse.error, {
    description,
    duration,
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