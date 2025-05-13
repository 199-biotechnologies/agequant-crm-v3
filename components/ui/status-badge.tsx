"use client"

import { Badge } from "@/components/ui/badge";
// These types are defined in constants but not directly used in this file
// They're implicitly referenced in the STATUS_CONFIGS
// import { InvoiceStatus, QuoteStatus, ProductStatus } from "@/lib/constants";

type StatusConfigMap = Record<string, {
  label: string;
  variant: "default" | "outline" | "secondary" | "destructive";
  className: string;
}>;

/**
 * Configuration maps for different entity status badges
 */
const STATUS_CONFIGS: Record<string, StatusConfigMap> = {
  invoice: {
    Draft: { label: "Draft", variant: "outline", className: "bg-gray-100 text-gray-800" },
    Sent: { label: "Sent", variant: "outline", className: "bg-blue-100 text-blue-800" },
    Paid: { label: "Paid", variant: "outline", className: "bg-emerald-100 text-emerald-800" },
    Overdue: { label: "Overdue", variant: "outline", className: "bg-rose-100 text-rose-800" },
    Cancelled: { label: "Cancelled", variant: "outline", className: "bg-slate-100 text-slate-800" },
  },
  quote: {
    Draft: { label: "Draft", variant: "outline", className: "bg-gray-100 text-gray-800" },
    Sent: { label: "Sent", variant: "outline", className: "bg-blue-100 text-blue-800" },
    Accepted: { label: "Accepted", variant: "outline", className: "bg-emerald-100 text-emerald-800" },
    Rejected: { label: "Rejected", variant: "outline", className: "bg-rose-100 text-rose-800" },
    Expired: { label: "Expired", variant: "outline", className: "bg-amber-100 text-amber-800" },
  },
  product: {
    Active: { label: "Active", variant: "outline", className: "bg-emerald-100 text-emerald-800" },
    Inactive: { label: "Inactive", variant: "outline", className: "bg-gray-100 text-gray-800" },
  }
};

export interface StatusBadgeProps {
  /**
   * The status value to display
   */
  status: string;

  /**
   * Type of entity this status belongs to (determines styling)
   */
  entityType?: "invoice" | "quote" | "product";

  /**
   * Optional custom status configs for special cases
   */
  customConfigs?: StatusConfigMap;
}

/**
 * A reusable status badge component that standardizes the display of status
 * information across the application with consistent styling.
 */
export function StatusBadge({ 
  status, 
  entityType = "invoice", 
  customConfigs 
}: StatusBadgeProps) {
  // Get the appropriate config map (custom, entity-specific, or a fallback empty object)
  const configs = customConfigs || STATUS_CONFIGS[entityType] || {};
  
  // Get the specific status config or fallback to a default style
  const config = configs[status] || { 
    label: status, 
    variant: "outline", 
    className: "bg-gray-200 text-gray-800" 
  };
  
  return (
    <Badge variant={config.variant} className={config.className}>
      {config.label}
    </Badge>
  );
}