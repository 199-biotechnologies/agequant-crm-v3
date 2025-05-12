"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger, // Added AlertDialogTrigger here
} from "@/components/ui/alert-dialog";
import { deleteProduct } from "@/app/products/actions"; // Import the actual action

// Define the shape of Product data based on what's displayed in the table
// This should align with the data fetched and passed to the table.
export type ProductRow = {
  id: string; // Internal UUID
  sku: string;
  name: string;
  unit: string;
  base_price: number;
  status: string;
  // created_at: string; // Potentially for display or sorting
  // deleted_at: string | null; // For filtering out soft-deleted items if not done by query
};


function ProductActionsCell({ product }: { product: ProductRow }) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      const formData = new FormData();
      formData.append('sku', product.sku);
       const result = await deleteProduct(formData); // Call the actual server action
       if (result?.error) {
         toast.error(`Failed to delete product: ${result.error}`);
       } else if (result?.success) {
         // eslint-disable-next-line react/no-unescaped-entities
         toast.success(`Product '${product.name}' (SKU: ${product.sku}) marked as deleted.`);
         // Revalidation is handled by the server action, client just shows feedback
       }
     });
  };

  return (
    <div className="text-right">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => navigator.clipboard.writeText(product.sku)}>
            Copy SKU
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <Link href={`/products/${product.sku}`} passHref legacyBehavior>
            <DropdownMenuItem>View Product</DropdownMenuItem>
          </Link>
          <Link href={`/products/${product.sku}/edit`} passHref legacyBehavior>
            <DropdownMenuItem>Edit Product</DropdownMenuItem>
          </Link>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <DropdownMenuItem
                className="text-destructive"
                onSelect={(e) => e.preventDefault()} // Prevent closing menu before dialog opens
              >
                Delete Product
              </DropdownMenuItem>
            </AlertDialogTrigger>
             <AlertDialogContent>
               <AlertDialogHeader>
                 <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                 {/* eslint-disable-next-line react/no-unescaped-entities */}
                 <AlertDialogDescription>
                   This action will mark the product '{product.name}' (SKU: {product.sku}) as deleted.
                   This cannot be undone easily.
                 </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                {/* Using a form to trigger the server action via button click */}
                <form action={handleDelete}>
                   <AlertDialogAction type="submit" disabled={isPending}>
                    {isPending ? "Deleting..." : "Continue"}
                  </AlertDialogAction>
                </form>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export const productColumns: ColumnDef<ProductRow>[] = [
  {
    accessorKey: "sku",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        SKU <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => <div className="font-mono">{row.getValue("sku")}</div>,
  },
  {
    accessorKey: "name",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Name <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => <div className="font-medium">{row.getValue("name")}</div>,
  },
  {
    accessorKey: "unit",
    header: "Unit",
  },
  {
    accessorKey: "base_price",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Base Price (USD) <ArrowUpDown className="ml-2 h-4 w-4" /> {/* Updated Header Label */}
      </Button>
    ),
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("base_price"));
      // TODO: Use a proper currency formatting utility that respects system's base currency
      const formatted = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD", // Placeholder: Should be dynamic based on system base currency
      }).format(amount);
      return <div className="text-right font-medium">{formatted}</div>;
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    // TODO: Potentially add filtering for status
  },
  {
    id: "actions",
    cell: ({ row }) => <ProductActionsCell product={row.original} />,
  },
];
