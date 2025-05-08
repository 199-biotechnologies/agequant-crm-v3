// components/customers/customer-columns.tsx
"use client"

import { type ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, MoreHorizontal } from "lucide-react"
import Link from "next/link"; // Import Link
import { toast } from "sonner"; // Import toast
import { useTransition } from "react"; // For pending state

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { deleteCustomer } from "@/app/customers/actions"; // Import the server action

// Define a separate component for the actions cell to correctly use hooks
function CustomerActionsCell({ customer }: { customer: Customer }) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      const formData = new FormData();
      formData.append('customerId', customer.id);
      // Explicitly type the expected result from the server action
      const result: { error?: string; success?: boolean } | undefined = await deleteCustomer(formData);
      if (result?.error) {
        toast.error(`Failed to delete customer: ${result.error}`);
      } else {
        toast.success(`Customer '${customer.company_contact_name}' deleted successfully.`);
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
          <DropdownMenuItem
            onClick={() => navigator.clipboard.writeText(customer.id)}
          >
            Copy customer ID
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <Link href={`/customers/${customer.id}`} passHref legacyBehavior>
            <DropdownMenuItem>View customer</DropdownMenuItem>
          </Link>
          <Link href={`/customers/${customer.id}/edit`} passHref legacyBehavior>
            <DropdownMenuItem>Edit customer</DropdownMenuItem>
          </Link>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <DropdownMenuItem
                className="text-destructive"
                onSelect={(e) => e.preventDefault()}
              >
                Delete customer
              </DropdownMenuItem>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action will mark the customer '{customer.company_contact_name}' as deleted. This cannot be undone easily.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
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

// Define the shape of our customer data based on the Supabase table
// TODO: Refine this type based on actual Supabase schema if needed (e.g., nullability)
export type Customer = {
  id: string // UUID
  company_contact_name: string
  email: string
  phone: string | null
  preferred_currency: string
  address: string
  notes: string | null
  created_at: string // ISO timestamp string
  updated_at: string // ISO timestamp string
}

export const CustomerColumns: ColumnDef<Customer>[] = [
  {
    accessorKey: "company_contact_name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => <div className="font-medium">{row.getValue("company_contact_name")}</div>,
  },
  {
    accessorKey: "email",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Email
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
  },
  {
    accessorKey: "phone",
    header: "Phone",
    cell: ({ row }) => row.getValue("phone") || "-", // Display '-' if phone is null/empty
  },
  {
    accessorKey: "preferred_currency",
    header: ({ column }) => {
       return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Currency
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => <div className="text-center">{row.getValue("preferred_currency")}</div>,
  },
  // TODO: Add Address and Notes columns if needed, or keep them for detail view?
  // {
  //   accessorKey: "address",
  //   header: "Address",
  // },
  {
    id: "actions",
    cell: ({ row }) => {
      return <CustomerActionsCell customer={row.original} />;
    },
  },
]