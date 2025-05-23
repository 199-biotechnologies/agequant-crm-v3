// components/customers/customer-data-table-client-wrapper.tsx
"use client";

import { useRouter } from 'next/navigation';
import type { ColumnDef, Row } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import type { Customer } from "./customer-columns"; // Assuming Customer type is exported from customer-columns

interface CustomerDataTableClientWrapperProps {
  columns: ColumnDef<Customer, unknown>[]; // Changed any to unknown
  data: Customer[];
}

export function CustomerDataTableClientWrapper({ columns, data }: CustomerDataTableClientWrapperProps) {
  const router = useRouter();

  const handleRowClick = (row: Row<Customer>) => {
    // Navigate using the public customer ID
    router.push(`/customers/${row.original.public_customer_id}`);
  };

  return (
    <DataTable
      columns={columns}
      data={data}
      onRowClick={handleRowClick}
      filterColumnId="company_contact_name" // Specify column to filter
      filterPlaceholder="Filter by name..." // Custom placeholder
    />
  );
}
