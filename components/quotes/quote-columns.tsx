"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, MoreHorizontal } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { StatusBadge } from "@/components/ui/status-badge"
import { QuoteStatus } from "@/lib/constants"

// Define the quote data type
export type Quote = {
  id: string
  entity: string
  customer: string
  issueDate: string
  expiryDate: string
  status: QuoteStatus
  total: string
}

// Format date strings
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

// Define the columns
export const QuoteColumns: ColumnDef<Quote>[] = [
  {
    accessorKey: "id",
    header: "Quote #",
    cell: ({ row }) => (
      <Link href={`/quotes/${row.original.id}`} className="font-medium hover:underline">
        {row.original.id}
      </Link>
    ),
  },
  {
    accessorKey: "entity",
    header: ({ column }) => {
      return (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Entity
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
  },
  {
    accessorKey: "customer",
    header: ({ column }) => {
      return (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Customer
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
  },
  {
    accessorKey: "issueDate",
    header: ({ column }) => {
      return (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Issue Date
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => formatDate(row.original.issueDate),
  },
  {
    accessorKey: "expiryDate",
    header: ({ column }) => {
      return (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Expiry Date
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => formatDate(row.original.expiryDate),
  },
  {
    accessorKey: "status",
    header: ({ column }) => {
      return (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Status
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => <StatusBadge status={row.original.status} entityType="quote" />,
  },
  {
    accessorKey: "total",
    header: ({ column }) => {
      return (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Total
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => <div className="font-medium">{row.original.total}</div>,
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const quote = row.original

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => navigator.clipboard.writeText(quote.id)}>Copy Quote ID</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={`/quotes/${quote.id}`}>View</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/quotes/${quote.id}/edit`}>Edit</Link>
            </DropdownMenuItem>
            <DropdownMenuItem>Send Email</DropdownMenuItem>
            <DropdownMenuItem>Download PDF</DropdownMenuItem>
            {quote.status === "Sent" && <DropdownMenuItem>Convert to Invoice</DropdownMenuItem>}
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]