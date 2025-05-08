import { DataTable } from "@/components/ui/data-table"
import { QuoteColumns, type Quote } from "@/components/quotes/quote-columns"

// Mock data for quotes
const quotes: Quote[] = [
  {
    id: "Q5K3N",
    entity: "AgeQuant LLC",
    customer: "Wayne Enterprises",
    issueDate: "2023-05-01",
    expiryDate: "2023-06-01",
    status: "Sent",
    total: "$4,250.00",
  },
  {
    id: "Q7M2P",
    entity: "AgeQuant LLC",
    customer: "Stark Industries",
    issueDate: "2023-05-05",
    expiryDate: "2023-06-05",
    status: "Sent",
    total: "$7,450.00",
  },
  {
    id: "Q9R4S",
    entity: "AgeQuant LLC",
    customer: "Umbrella Corp",
    issueDate: "2023-05-10",
    expiryDate: "2023-06-10",
    status: "Sent",
    total: "$5,780.00",
  },
  {
    id: "Q2T6V",
    entity: "AgeQuant LLC",
    customer: "Acme Corp",
    issueDate: "2023-05-15",
    expiryDate: "2023-06-15",
    status: "Draft",
    total: "$3,250.00",
  },
  {
    id: "Q4Y8X",
    entity: "AgeQuant LLC",
    customer: "Globex Inc",
    issueDate: "2023-05-20",
    expiryDate: "2023-06-20",
    status: "Accepted",
    total: "$6,450.00",
  },
  {
    id: "Q6Z2C",
    entity: "AgeQuant LLC",
    customer: "Initech",
    issueDate: "2023-05-25",
    expiryDate: "2023-06-25",
    status: "Rejected",
    total: "$2,780.00",
  },
]

export default function QuotesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Quotes</h1>
      </div>

      <DataTable columns={QuoteColumns} data={quotes} />
    </div>
  )
}
