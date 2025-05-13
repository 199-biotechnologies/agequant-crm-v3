"use client"

import React from "react"
import { AlertCircle, AlertTriangle, Info, XCircle } from "lucide-react"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { 
  ErrorResponse, 
  ErrorSeverity,
  ErrorType
} from "@/lib/utils/error-handler"

interface FormErrorProps {
  error?: ErrorResponse;
  title?: string;
  className?: string;
}

/**
 * Enhanced form error component that displays contextual error messages
 * with appropriate icons and styling based on error severity
 */
export function FormError({ error, title, className }: FormErrorProps) {
  if (!error) return null;
  
  // If no error is provided, don't render anything
  if (!error.error) return null;
  
  // Determine the appropriate variant based on error severity
  const variant = error.severity ? mapSeverityToVariant(error.severity) : "destructive";
  
  // Get the appropriate icon based on error type
  const Icon = getIconForError(error);
  
  return (
    <Alert variant={variant} className={className}>
      {Icon && <Icon className="h-4 w-4" />}
      <AlertTitle>{title || getErrorTitle(error)}</AlertTitle>
      <AlertDescription className="mt-1">
        {error.error}
        {error.help && (
          <p className="text-sm mt-2 font-normal">
            {error.help}
          </p>
        )}
      </AlertDescription>
    </Alert>
  )
}

/**
 * Maps error severity to alert variant
 */
function mapSeverityToVariant(severity: ErrorSeverity): "default" | "destructive" | "secondary" {
  switch (severity) {
    case ErrorSeverity.CRITICAL:
    case ErrorSeverity.ERROR:
      return "destructive";
    case ErrorSeverity.WARNING:
      return "secondary";
    case ErrorSeverity.INFO:
    default:
      return "default";
  }
}

/**
 * Gets the appropriate icon based on error type and severity
 */
function getIconForError(error: ErrorResponse) {
  if (error.severity === ErrorSeverity.CRITICAL) {
    return XCircle;
  }
  
  if (error.severity === ErrorSeverity.ERROR) {
    return AlertCircle;
  }
  
  if (error.severity === ErrorSeverity.WARNING) {
    return AlertTriangle;
  }
  
  if (error.severity === ErrorSeverity.INFO) {
    return Info;
  }
  
  // Default icon based on error type
  switch (error.type) {
    case ErrorType.VALIDATION:
      return AlertTriangle;
    case ErrorType.DATABASE:
    case ErrorType.NETWORK:
      return AlertCircle;
    default:
      return AlertCircle;
  }
}

/**
 * Generates an appropriate title based on error type
 */
function getErrorTitle(error: ErrorResponse): string {
  // Use severity for titles if available
  if (error.severity === ErrorSeverity.CRITICAL) {
    return "Critical Error";
  }
  
  // Otherwise use error type
  switch (error.type) {
    case ErrorType.VALIDATION:
      return "Validation Error";
    case ErrorType.DATABASE:
      return "Data Error";
    case ErrorType.NETWORK:
      return "Network Error";
    case ErrorType.AUTH:
      return "Authentication Error";
    case ErrorType.PERMISSION:
      return "Permission Error";
    case ErrorType.NOT_FOUND:
      return "Not Found";
    case ErrorType.RATE_LIMIT:
      return "Rate Limit Exceeded";
    case ErrorType.TIMEOUT:
      return "Request Timeout";
    default:
      return "Error";
  }
}