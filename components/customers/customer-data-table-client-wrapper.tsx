// components/customers/customer-data-table-client-wrapper.tsx
"use client";

import { useRouter } from 'next/navigation';
import type { ColumnDef, Row } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import type { Customer } from "./customer-columns"; // Assuming Customer type is exported from customer-columns

interface CustomerDataTableClientWrapperProps {
  columns: ColumnDef<Customer, any>[]; // Use 'any' for TValue or refine if known
  data: Customer[];
}

export function CustomerDataTableClientWrapper({ columns, data }: CustomerDataTableClientWrapperProps) {
  const router = useRouter();

  const handleRowClick = (row: Row<Customer>) => {
    router.push(`/customers/${row.original.id}`);
  };

  return <DataTable columns={columns} data={data} onRowClick={handleRowClick} />;
}