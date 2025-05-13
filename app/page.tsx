import { ArrowUp, Clock, Package, Send, RefreshCw } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DashboardKPI } from "@/components/dashboard/dashboard-kpi"
import { DashboardTable } from "@/components/dashboard/dashboard-table"
import { RevenueChart } from "@/components/dashboard/revenue-chart"
import { QuickAddButtons } from "@/components/dashboard/quick-add-buttons"
import { RecentlyUpdated } from "@/components/dashboard/recently-updated"

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <Button variant="outline" size="sm">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* KPI Strip */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <DashboardKPI
          title="Total Sent (MTD)"
          value="$24,780"
          trend="+12.5%"
          trendType="up"
          icon={Send}
          href="/invoices?filter=sent&period=mtd"
        />
        <DashboardKPI
          title="Outstanding"
          value="$8,450"
          trend="-3.2%"
          trendType="down"
          icon={ArrowUp}
          href="/invoices?filter=outstanding"
        />
        <DashboardKPI
          title="Accepted Quotes (30d)"
          value="$15,200"
          trend="+8.1%"
          trendType="up"
          icon={Clock}
          href="/quotes?filter=accepted&period=30d"
        />
        <DashboardKPI
          title="Top Product"
          value="Premium Plan"
          secondaryValue="$5,240"
          icon={Package}
          href="/products/PR-H5K3N"
        />
      </div>

      {/* Main Content */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Overdue Invoices */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Overdue Invoices</CardTitle>
              <CardDescription>Invoices past their due date</CardDescription>
            </CardHeader>
            <CardContent>
              <DashboardTable
                type="invoice"
                data={[
                  {
                    id: "H5K3N",
                    customer: "Acme Corp",
                    date: "2023-05-01",
                    dueDate: "2023-05-15",
                    total: "$1,250.00",
                    status: "Overdue",
                  },
                  {
                    id: "J7M2P",
                    customer: "Globex Inc",
                    date: "2023-05-05",
                    dueDate: "2023-05-20",
                    total: "$3,450.00",
                    status: "Overdue",
                  },
                  {
                    id: "K9R4S",
                    customer: "Initech",
                    date: "2023-05-10",
                    dueDate: "2023-05-25",
                    total: "$2,780.00",
                    status: "Overdue",
                  },
                ]}
              />
            </CardContent>
          </Card>
          
          {/* Expiring Quotes */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Expiring Quotes</CardTitle>
              <CardDescription>Quotes expiring in the next 7 days</CardDescription>
            </CardHeader>
            <CardContent>
              <DashboardTable
                type="quote"
                data={[
                  {
                    id: "Q5K3N",
                    customer: "Wayne Enterprises",
                    date: "2023-05-01",
                    dueDate: "2023-06-01",
                    total: "$4,250.00",
                    status: "Sent",
                  },
                  {
                    id: "Q7M2P",
                    customer: "Stark Industries",
                    date: "2023-05-05",
                    dueDate: "2023-06-05",
                    total: "$7,450.00",
                    status: "Sent",
                  },
                  {
                    id: "Q9R4S",
                    customer: "Umbrella Corp",
                    date: "2023-05-10",
                    dueDate: "2023-06-10",
                    total: "$5,780.00",
                    status: "Sent",
                  },
                ]}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Revenue Trend</CardTitle>
              <CardDescription>Last 6 months</CardDescription>
            </CardHeader>
            <CardContent>
              <RevenueChart />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Quick Add</CardTitle>
              <CardDescription>Create new records</CardDescription>
            </CardHeader>
            <CardContent>
              <QuickAddButtons />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recently Updated Feed */}
      <Card>
        <CardHeader>
          <CardTitle>Recently Updated</CardTitle>
          <CardDescription>Latest 10 changes</CardDescription>
        </CardHeader>
        <CardContent>
          <RecentlyUpdated />
        </CardContent>
      </Card>
    </div>
  )
}
