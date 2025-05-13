import Link from "next/link"
import { Send, FileText } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

interface DashboardTableProps {
  type: "invoice" | "quote"
  data: {
    id: string
    customer: string
    date: string
    dueDate: string
    total: string
    status: string
  }[]
}

export function DashboardTable({ type, data }: DashboardTableProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "paid":
        return "bg-emerald-100 text-emerald-800"
      case "overdue":
        return "bg-rose-100 text-rose-800"
      case "sent":
        return "bg-blue-100 text-blue-800"
      case "draft":
        return "bg-gray-100 text-gray-800"
      case "accepted":
        return "bg-emerald-100 text-emerald-800"
      case "rejected":
        return "bg-rose-100 text-rose-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getActionButton = (itemType: string /*, _id: string */) => {
    if (itemType === "invoice") {
      return (
        <Button size="sm" variant="outline">
          <Send className="mr-1 h-3 w-3" />
          Send Reminder
        </Button>
      )
    }

    if (itemType === "quote") {
      return (
        <Button size="sm" variant="outline">
          <FileText className="mr-1 h-3 w-3" />
          Convert to Invoice
        </Button>
      )
    }

    return null
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{type === "invoice" ? "Invoice #" : "Quote #"}</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>{type === "invoice" ? "Due Date" : "Expiry Date"}</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length > 0 ? (
            data.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">
                  <Link href={`/${type}s/${item.id}`} className="hover:underline">
                    {item.id}
                  </Link>
                </TableCell>
                <TableCell>{item.customer}</TableCell>
                <TableCell>{formatDate(item.dueDate)}</TableCell>
                <TableCell>{item.total}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={cn("font-normal", getStatusColor(item.status))}>
                    {item.status}
                  </Badge>
                </TableCell>
                <TableCell>{getActionButton(type /*, item.id */)}</TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center">
                No {type === "invoice" ? "overdue invoices" : "expiring quotes"} found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
