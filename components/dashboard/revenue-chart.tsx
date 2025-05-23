"use client"

import { useEffect, useState } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

interface RevenueChartProps {
  data: {
    month: string
    monthFull?: string
    revenue: number
  }[]
  currencySymbol?: string
}

export function RevenueChart({ data, currencySymbol = "$" }: RevenueChartProps) {
  const [mounted, setMounted] = useState(false)

  // Prevent hydration errors with SSR
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="flex h-[200px] w-full items-center justify-center rounded-md border border-dashed">
        <div className="h-full w-full animate-pulse bg-muted/50"></div>
      </div>
    )
  }

  return (
    <div className="h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="month" tickLine={false} axisLine={false} />
          <YAxis 
            tickFormatter={(value) => `${currencySymbol}${value}`} 
            tickLine={false} 
            axisLine={false} 
            width={60} 
          />
          <Tooltip
            formatter={(value, name, props) => {
              return [`${currencySymbol}${value}`, props.payload.monthFull ? props.payload.monthFull : "Revenue"]
            }}
            contentStyle={{
              borderRadius: "6px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
            }}
          />
          <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={30} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
