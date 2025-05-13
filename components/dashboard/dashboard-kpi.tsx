import Link from "next/link"
import { type LucideIcon } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"

interface DashboardKPIProps {
  title: string
  value: string
  secondaryValue?: string
  icon: LucideIcon
  href: string
}

export function DashboardKPI({
  title,
  value,
  secondaryValue,
  icon: Icon,
  href,
}: DashboardKPIProps) {
  return (
    <Link href={href}>
      <Card className="transition-all hover:shadow-md">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-2 flex items-baseline">
            <h3 className="text-2xl font-bold">{value}</h3>
            {secondaryValue && <span className="ml-2 text-sm text-muted-foreground">{secondaryValue}</span>}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
