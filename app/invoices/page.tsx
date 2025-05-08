import { DataTable } from "@/components/ui/data-table"
import { InvoiceColumns, type Invoice } from "@/components/invoices/invoice-columns"

// Mock data for invoices
const invoices: Invoice[] = [
  {
    id: "H5K3N",
    entity: "AgeQuant LLC",
    customer: "Acme Corp",
    issueDate: "2023-05-01",
    dueDate: "2023-05-15",
    status: "Overdue",
    total: "$1,250.00",
  },
  {
    id: "J7M2P",
    entity: "AgeQuant LLC",
    customer: "Globex Inc",
    issueDate: "2023-05-05",
    dueDate: "2023-05-20",
    status: "Overdue",
    total: "$3,450.00",
  },
  {
    id: "K9R4S",
    entity: "AgeQuant LLC",
    customer: "Initech",
    issueDate: "2023-05-10",
    dueDate: "2023-05-25",
    status: "Overdue",
    total: "$2,780.00",
  },
  {
    id: "L2T6V",
    entity: "AgeQuant LLC",
    customer: "Wayne Enterprises",
    issueDate: "2023-05-15",
    dueDate: "2023-05-30",
    status: "Sent",
    total: "$4,250.00",
  },
  {
    id: "M4Y8X",
    entity: "AgeQuant LLC",
    customer: "Stark Industries",
    issueDate: "2023-05-20",
    dueDate: "2023-06-05",
    status: "Sent",
    total: "$7,450.00",
  },
  {
    id: "N6Z2C",
    entity: "AgeQuant LLC",
    customer: "Umbrella Corp",
    issueDate: "2023-05-25",
    dueDate: "2023-06-10",
    status: "Draft",
    total: "$5,780.00",
  },
  {
    id: "P8B4V",
    entity: "AgeQuant LLC",
    customer: "Cyberdyne Systems",
    issueDate: "2023-05-28",
    dueDate: "2023-06-12",
    status: "Paid",
    total: "$6,320.00",
  },
]

export default function InvoicesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
      </div>

      <DataTable columns={InvoiceColumns} data={invoices} />
    </div>
  )
}
