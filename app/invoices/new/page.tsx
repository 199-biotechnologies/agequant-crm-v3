import { InvoiceForm } from "@/components/invoices/invoice-form"

export default function NewInvoicePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Create New Invoice</h1>
      <InvoiceForm />
    </div>
  )
}
