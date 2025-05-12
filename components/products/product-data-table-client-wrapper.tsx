"use client";

import { DataTable } from "@/components/ui/data-table";
import { type ColumnDef } from "@tanstack/react-table";
import { type ProductRow } from "./product-columns"; // Assuming ProductRow is exported from product-columns

interface ProductDataTableClientWrapperProps {
  columns: ColumnDef<ProductRow>[];
  data: ProductRow[];
  // Add any other props needed for DataTable, e.g., onRowClick, filtering state, etc.
  // For now, keeping it simple.
}

export function ProductDataTableClientWrapper({
  columns,
  data,
}: ProductDataTableClientWrapperProps) {
  // You can add client-side logic here if needed, e.g.,
  // - State for client-side filtering/sorting if not handled by server
  // - Specific event handlers for rows/cells that require client context

  // Example: Row click navigation (if products have a view page)
  // const router = useRouter();
  // const handleRowClick = (row: Row<ProductRow>) => {
  //   router.push(`/products/${row.original.sku}`); // Assuming SKU is the identifier
  // };

  return (
    <DataTable
      columns={columns}
      data={data}
      // onRowClick={handleRowClick} // Uncomment and implement if needed
      // You might also pass down filter-related props if you add client-side filtering inputs here
    />
  );
}