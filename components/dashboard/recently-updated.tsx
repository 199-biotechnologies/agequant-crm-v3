import Link from "next/link"
import { FileText, FileCheck, Users, Package } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

interface RecentItem {
  id: string
  type: string
  title: string
  action: string
  timestamp: string
  user: string
  userInitials: string
}

interface RecentlyUpdatedProps {
  items: RecentItem[]
}

export function RecentlyUpdated({ items }: RecentlyUpdatedProps) {
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

  if (!items || items.length === 0) {
    return (
      <div className="py-4 text-center text-muted-foreground">
        No recent activity found
      </div>
    )
  }
  
  return (
    <div className="space-y-4">
      {items.map((item) => (
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
