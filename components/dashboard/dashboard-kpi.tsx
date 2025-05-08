import Link from "next/link"
import { ArrowUp, ArrowDown, type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"

interface DashboardKPIProps {
  title: string
  value: string
  secondaryValue?: string
  trend?: string
  trendType?: "up" | "down" | "neutral"
  icon: LucideIcon
  href: string
}

export function DashboardKPI({
  title,
  value,
  secondaryValue,
  trend,
  trendType = "neutral",
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
          {trend && (
            <div className="mt-2">
              <span
                className={cn(
                  "inline-flex items-center text-xs font-medium",
                  trendType === "up" && "text-emerald-600",
                  trendType === "down" && "text-rose-600",
                )}
              >
                {trendType === "up" && <ArrowUp className="mr-1 h-3 w-3" />}
                {trendType === "down" && <ArrowDown className="mr-1 h-3 w-3" />}
                {trend}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
