import { ArrowUp, Clock, Package, Send, RefreshCw } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DashboardKPI } from "@/components/dashboard/dashboard-kpi"
import { DashboardTable } from "@/components/dashboard/dashboard-table"
import { RevenueChart } from "@/components/dashboard/revenue-chart"
import { QuickAddButtons } from "@/components/dashboard/quick-add-buttons"
import { RecentlyUpdated } from "@/components/dashboard/recently-updated"
import { 
  getOverdueInvoices,
  getExpiringQuotes,
  getTotalSentMTD,
  getOutstandingAmount,
  getAcceptedQuotes30d,
  getTopProduct,
  getRecentlyUpdated
} from "./dashboard/actions"

export default async function Dashboard() {
  // Fetch all dashboard data
  const [
    overdueInvoices,
    expiringQuotes,
    totalSentMTD,
    outstandingAmount,
    acceptedQuotes30d,
    topProduct,
    recentlyUpdated
  ] = await Promise.all([
    getOverdueInvoices(),
    getExpiringQuotes(),
    getTotalSentMTD(),
    getOutstandingAmount(),
    getAcceptedQuotes30d(),
    getTopProduct(),
    getRecentlyUpdated()
  ])
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <form action={async () => { 
          "use server" 
          // Import in the action to prevent server component issues
          const { refreshDashboard } = await import('./dashboard/refresh-action')
          await refreshDashboard()
        }}>
          <Button type="submit" variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh Data
          </Button>
        </form>
      </div>

      {/* KPI Strip */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <DashboardKPI
          title="Total Sent (MTD)"
          value={totalSentMTD.value}
          icon={Send}
          href="/invoices?filter=sent&period=mtd"
        />
        <DashboardKPI
          title="Outstanding"
          value={outstandingAmount.value}
          icon={ArrowUp}
          href="/invoices?filter=outstanding"
        />
        <DashboardKPI
          title="Accepted Quotes (30d)"
          value={acceptedQuotes30d.value}
          icon={Clock}
          href="/quotes?filter=accepted&period=30d"
        />
        <DashboardKPI
          title="Top Product"
          value={topProduct.name}
          secondaryValue={topProduct.value}
          icon={Package}
          href={`/products/${topProduct.sku}`}
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
                data={overdueInvoices}
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
                data={expiringQuotes}
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
          <RecentlyUpdated items={recentlyUpdated} />
        </CardContent>
      </Card>
    </div>
  )
}
