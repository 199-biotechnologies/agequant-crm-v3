// components/customers/customer-columns.tsx
"use client"

import { type ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, MoreHorizontal } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

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
      const customer = row.original

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
              <DropdownMenuItem>View customer</DropdownMenuItem> {/* TODO: Link to /customers/:id */}
              <DropdownMenuItem>Edit customer</DropdownMenuItem> {/* TODO: Link to /customers/:id/edit */}
              <DropdownMenuItem className="text-destructive">Delete customer</DropdownMenuItem> {/* TODO: Implement delete */}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )
    },
  },
]