"use client"

import React from "react";
import { Card, CardContent, CardDescription,
  // CardFooter is not used in this file
  // CardFooter,
  CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Props for FormSection component
 */
interface FormSectionProps {
  /** Section title */
  title: string;
  /** Optional section description */
  description?: string;
  /** Content of the section */
  children: React.ReactNode;
  /** Optional className to apply to the Card component */
  className?: string;
  /** Optional collapsible state */
  collapsed?: boolean;
  /** Optional callback when toggle collapse state */
  onToggleCollapse?: () => void;
}

/**
 * A form section component with consistent styling
 */
export function FormSection({
  title,
  description,
  children,
  className,
  collapsed = false,
  onToggleCollapse,
}: FormSectionProps) {
  return (
    <Card className={cn("mb-6", className)}>
      <CardHeader className={onToggleCollapse ? "cursor-pointer" : undefined} onClick={onToggleCollapse}>
        <CardTitle className="text-xl flex items-center justify-between">
          {title}
          {onToggleCollapse && (
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <span className="sr-only">{collapsed ? "Expand" : "Collapse"} section</span>
              {collapsed ? "+" : "−"}
            </Button>
          )}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      {!collapsed && <CardContent className="space-y-6">{children}</CardContent>}
    </Card>
  );
}

/**
 * Props for FormRow component
 */
interface FormRowProps {
  /** Content of the row */
  children: React.ReactNode;
  /** Number of columns for the row */
  cols?: 1 | 2 | 3 | 4;
  /** Optional className to apply to the row div */
  className?: string;
}

/**
 * A responsive grid layout for form fields
 */
export function FormRow({
  children,
  cols = 2,
  className,
}: FormRowProps) {
  const colClasses = {
    1: "grid-cols-1",
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
  };
  
  return (
    <div className={cn(`grid ${colClasses[cols]} gap-6`, className)}>
      {children}
    </div>
  );
}

/**
 * Props for FormActions component
 */
interface FormActionsProps {
  /** Cancel action handler */
  cancelAction?: () => void;
  /** Text for submit button */
  submitLabel?: string;
  /** Text for cancel button */
  cancelLabel?: string;
  /** Whether form submission is in progress */
  isSubmitting?: boolean;
  /** Optional alignment for buttons */
  align?: "left" | "center" | "right" | "between";
  /** Optional className to apply to the actions div */
  className?: string;
  /** Optional extra actions to be displayed alongside submit/cancel */
  extraActions?: React.ReactNode;
}

/**
 * A consistent action button layout for forms
 */
export function FormActions({
  cancelAction,
  submitLabel = "Save",
  cancelLabel = "Cancel",
  isSubmitting = false,
  align = "right",
  className,
  extraActions,
}: FormActionsProps) {
  const alignmentClasses = {
    left: "justify-start",
    center: "justify-center",
    right: "justify-end",
    between: "justify-between",
  };
  
  return (
    <div className={cn(`flex items-center space-x-4 mt-8 ${alignmentClasses[align]}`, className)}>
      {align === "between" && extraActions}
      
      {cancelAction && (
        <Button type="button" variant="outline" onClick={cancelAction}>
          {cancelLabel}
        </Button>
      )}
      
      {extraActions && align !== "between" && extraActions}
      
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Saving..." : submitLabel}
      </Button>
    </div>
  );
}

/**
 * Props for FormContainer component
 */
interface FormContainerProps {
  /** Form content */
  children: React.ReactNode;
  /** Form submission handler */
  onSubmit: (e: React.FormEvent) => void;
  /** Optional className to apply to the form element */
  className?: string;
}

/**
 * A wrapper for form elements with standard styling
 */
export function FormContainer({
  children,
  onSubmit,
  className,
}: FormContainerProps) {
  return (
    <form onSubmit={onSubmit} className={cn("space-y-6", className)}>
      {children}
    </form>
  );
}

/**
 * Props for ReadOnlyField component
 */
interface ReadOnlyFieldProps {
  /** Field label */
  label: string;
  /** Field value */
  value: React.ReactNode;
  /** Optional className to apply */
  className?: string;
}

/**
 * A component for displaying read-only fields in forms
 */
export function ReadOnlyField({ label, value, className }: ReadOnlyFieldProps) {
  return (
    <div className={cn("space-y-1", className)}>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <div className="font-medium">{value || "—"}</div>
    </div>
  );
}