"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface ColumnConfig {
  /**
   * The header text for the column
   */
  header: string;
  
  /**
   * Optional width class for the skeleton
   */
  width?: string;
  
  /**
   * Type of content to determine skeleton appearance
   */
  type?: "text" | "badge" | "button" | "avatar" | "number" | "date";
}

export interface TableSkeletonProps {
  /**
   * Column configuration to determine headers and skeleton types
   */
  columns: ColumnConfig[];
  
  /**
   * Number of skeleton rows to show
   */
  rowCount?: number;
  
  /**
   * Optional caption for the table
   */
  caption?: string;
}

/**
 * A reusable table skeleton component for displaying loading states.
 * Can be configured to match the structure of any entity table.
 */
export function TableSkeleton({ 
  columns, 
  rowCount = 5,
  caption
}: TableSkeletonProps) {
  return (
    <div className="rounded-md border">
      <Table>
        {caption && (
          <caption className="p-4 text-sm text-muted-foreground">
            <Skeleton className="h-4 w-40" />
          </caption>
        )}
        <TableHeader>
          <TableRow>
            {columns.map((col, idx) => (
              <TableHead key={idx} style={col.width ? { width: col.width } : undefined}>
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rowCount }).map((_, rowIndex) => (
            <TableRow key={rowIndex}>
              {columns.map((col, colIndex) => (
                <TableCell key={colIndex}>
                  {getSkeletonForType(col.type || "text", col.width)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

/**
 * Returns the appropriate skeleton based on content type
 */
function getSkeletonForType(type: string, width?: string): React.ReactNode {
  const skeletonWidth = width || "w-full max-w-[120px]";
  
  switch (type) {
    case "badge":
      return <Skeleton className="h-6 w-16 rounded-full" />;
    case "button":
      return <Skeleton className="h-8 w-8 rounded-full" />;
    case "avatar":
      return <Skeleton className="h-8 w-8 rounded-full" />;
    case "number":
      return <Skeleton className={`h-4 w-12 ${width || ""}`} />;
    case "date":
      return <Skeleton className={`h-4 w-24 ${width || ""}`} />;
    case "text":
    default:
      return <Skeleton className={`h-4 ${skeletonWidth}`} />;
  }
}

/**
 * Pre-configured table skeleton for invoices table
 */
export function InvoiceTableSkeleton() {
  return (
    <TableSkeleton
      columns={[
        { header: "Number", type: "text", width: "w-20" },
        { header: "Customer", type: "text" },
        { header: "Issue Date", type: "date" },
        { header: "Due Date", type: "date" },
        { header: "Amount", type: "number", width: "w-24" },
        { header: "Status", type: "badge" },
        { header: "", type: "button", width: "w-10" }
      ]}
      rowCount={5}
    />
  );
}

/**
 * Pre-configured table skeleton for quotes table
 */
export function QuoteTableSkeleton() {
  return (
    <TableSkeleton
      columns={[
        { header: "Number", type: "text", width: "w-20" },
        { header: "Customer", type: "text" },
        { header: "Issue Date", type: "date" },
        { header: "Expiry Date", type: "date" },
        { header: "Amount", type: "number", width: "w-24" },
        { header: "Status", type: "badge" },
        { header: "", type: "button", width: "w-10" }
      ]}
      rowCount={5}
    />
  );
}

/**
 * Pre-configured table skeleton for customers table
 */
export function CustomerTableSkeleton() {
  return (
    <TableSkeleton
      columns={[
        { header: "ID", type: "text", width: "w-20" },
        { header: "Name", type: "text" },
        { header: "Email", type: "text" },
        { header: "Phone", type: "text" },
        { header: "Currency", type: "text", width: "w-16" },
        { header: "", type: "button", width: "w-10" }
      ]}
      rowCount={5}
    />
  );
}

/**
 * Pre-configured table skeleton for products table
 */
export function ProductTableSkeleton() {
  return (
    <TableSkeleton
      columns={[
        { header: "SKU", type: "text", width: "w-24" },
        { header: "Name", type: "text" },
        { header: "Price", type: "number", width: "w-24" },
        { header: "Status", type: "badge" },
        { header: "", type: "button", width: "w-10" }
      ]}
      rowCount={5}
    />
  );
}