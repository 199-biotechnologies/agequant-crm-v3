import Link from "next/link"
import { FileText, FileCheck, Users, Package } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

// Mock data for recently updated items
const recentItems = [
  {
    id: "H5K3N",
    type: "invoice",
    title: "Invoice #H5K3N for Acme Corp",
    action: "created",
    timestamp: "2023-05-28T14:32:00Z",
    user: "John Doe",
    userInitials: "JD",
  },
  {
    id: "Q7M2P",
    type: "quote",
    title: "Quote #Q7M2P for Stark Industries",
    action: "updated",
    timestamp: "2023-05-28T13:15:00Z",
    user: "Jane Smith",
    userInitials: "JS",
  },
  {
    id: "CUST-123",
    type: "customer",
    title: "Wayne Enterprises",
    action: "created",
    timestamp: "2023-05-28T11:45:00Z",
    user: "John Doe",
    userInitials: "JD",
  },
  {
    id: "PR-H5K3N",
    type: "product",
    title: "Premium Plan",
    action: "updated",
    timestamp: "2023-05-28T10:20:00Z",
    user: "Jane Smith",
    userInitials: "JS",
  },
  {
    id: "J7M2P",
    type: "invoice",
    title: "Invoice #J7M2P for Globex Inc",
    action: "marked as paid",
    timestamp: "2023-05-28T09:10:00Z",
    user: "John Doe",
    userInitials: "JD",
  },
]

export function RecentlyUpdated() {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case "invoice":
        return <FileText className="h-4 w-4" />
      case "quote":
        return <FileCheck className="h-4 w-4" />
      case "customer":
        return <Users className="h-4 w-4" />
      case "product":
        return <Package className="h-4 w-4" />
      default:
        return null
    }
  }

  const getTypeUrl = (type: string, id: string) => {
    switch (type) {
      case "invoice":
        return `/invoices/${id}`
      case "quote":
        return `/quotes/${id}`
      case "customer":
        return `/customers/${id}`
      case "product":
        return `/products/${id}`
      default:
        return "/"
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  }

  return (
    <div className="space-y-4">
      {recentItems.map((item) => (
        <div key={`${item.type}-${item.id}`} className="flex items-start gap-4">
          <Avatar className="h-8 w-8">
            <AvatarFallback>{item.userInitials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-muted p-1">{getTypeIcon(item.type)}</span>
              <Link href={getTypeUrl(item.type, item.id)} className="font-medium hover:underline">
                {item.title}
              </Link>
            </div>
            <p className="text-sm text-muted-foreground">
              {item.action} by {item.user} at {formatTimestamp(item.timestamp)}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
