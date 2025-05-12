import { notFound } from 'next/navigation';
import { getInvoiceById, updateInvoice } from '@/app/invoices/actions';
import { InvoiceForm } from '@/components/invoices/invoice-form';
// TODO: Import ActionButtons and configure for Invoice Edit context

export default async function InvoiceEditPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { invoice, error } = await getInvoiceById(id);

  if (error || !invoice) {
    console.error("Error fetching invoice for edit:", error);
    notFound(); // Triggers 404 page
  }

  // Bind the invoice ID to the update action
  const updateInvoiceWithId = updateInvoice.bind(null, id);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">
          Edit Invoice {invoice.invoice_number || `#${id.substring(0, 6)}...`}
        </h1>
        {/* TODO: Add ActionButtons component here, configured for Invoice Edit (e.g., Save, Cancel) */}
        <div>Save/Cancel Buttons Placeholder</div>
      </div>

      {/* Render the form with initial data and the update action */}
      <InvoiceForm
        initialData={invoice}
        onSubmitAction={updateInvoiceWithId}
      />
    </div>
  );
}
