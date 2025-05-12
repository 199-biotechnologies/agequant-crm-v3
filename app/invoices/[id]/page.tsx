import { notFound } from 'next/navigation';
import { getInvoiceById } from '@/app/invoices/actions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';
import type { PaymentSource } from "@/app/settings/types"; // Import PaymentSource type

// TODO: Import ActionButtons and configure for Invoice View context

// Define a type for individual line items based on expected data
interface InvoiceLineItem {
  id: string; // Assuming 'id' is present
  product_id: string; // Or the actual field name for product reference
  product?: { name?: string }; // Optional: if product details like name are joined
  description: string;
  quantity: number;
  unit_price: number;
  // Add other fields if present, e.g., total (though often calculated)
}

// Define a type for the main invoice object, including typed relations
interface InvoiceData {
  id: string;
  invoice_number?: string | null;
  issue_date: string; // Assuming string date from DB
  due_date: string;   // Assuming string date from DB
  currency_code: string;
  status?: string | null;
  tax_percentage?: number | null;
  notes?: string | null;
  customer?: { company_contact_name?: string | null; email?: string | null; phone?: string | null; } | null;
  issuing_entity?: { entity_name?: string | null; } | null;
  payment_source?: PaymentSource | null; // Use imported PaymentSource type
  line_items?: InvoiceLineItem[] | null;
  // Add other invoice header fields as needed
}


// Helper to format currency - reuse or import from a shared util
// For now, defining locally based on form component logic
function formatCurrency(amount: number, currencyCode: string = 'USD'): string {
    try {
       return new Intl.NumberFormat(undefined, { style: 'currency', currency: currencyCode }).format(amount);
    } catch (_) {
       // Fallback for invalid currency codes
       return `${currencyCode} ${amount.toFixed(2)}`;
    }
}

// Helper to generate payment instructions - reuse or import
function generatePaymentInstructions(source: PaymentSource | null | undefined): string {
  if (!source) return "Payment details not available.";
  let instructions = `Payment Method: ${source.name}\n`;
  if (source.bank_name) instructions += `Bank: ${source.bank_name}\n`;
  if (source.account_holder_name) instructions += `Account Name: ${source.account_holder_name}\n`;
  if (source.account_number) instructions += `Account #: ${source.account_number}\n`;
  if (source.iban) instructions += `IBAN: ${source.iban}\n`;
  if (source.swift_bic) instructions += `SWIFT/BIC: ${source.swift_bic}\n`;
  if (source.routing_number_us) instructions += `Routing (US): ${source.routing_number_us}\n`;
  if (source.sort_code_uk) instructions += `Sort Code (UK): ${source.sort_code_uk}\n`;
  if (source.additional_details) instructions += `\n${source.additional_details}\n`;
  return instructions.trim();
}


export default async function InvoiceViewPage({ params }: { params: { id: string } }) {
  const { id } = params;
  // Explicitly type the result from getInvoiceById
  const result = await getInvoiceById(id) as { invoice: InvoiceData | null; error: string | null };
  const { invoice, error } = result;

  if (error || !invoice) {
    // TODO: Show a more user-friendly error message?
    console.error("Error fetching invoice for view:", error);
    notFound(); // Triggers 404 page
  }

  // Calculate totals (now using typed invoice and line_items)
  const subtotal = invoice.line_items?.reduce((sum, item) => sum + (item.quantity * item.unit_price || 0), 0) ?? 0;
  const taxAmount = subtotal * ((invoice.tax_percentage || 0) / 100);
  const total = subtotal + taxAmount;

  const paymentInstructions = generatePaymentInstructions(invoice.payment_source);

  return (
    <div className="space-y-6">
      {/* Page Header - Title and Actions */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">
          Invoice {invoice.invoice_number || `#${id.substring(0, 6)}...`} {/* Display invoice number if available */}
        </h1>
        {/* TODO: Add ActionButtons component here, configured for Invoice View */}
        {/* <ActionButtons context="invoiceView" invoiceId={id} status={invoice.status} /> */}
        <div>Edit Button Placeholder</div>
      </div>

      {/* Invoice Details Card */}
      <Card>
        <CardHeader>
          <CardTitle>Invoice Details</CardTitle>
          <CardDescription>
            Issued by {invoice.issuing_entity?.entity_name || 'N/A'} to {invoice.customer?.company_contact_name || 'N/A'}.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Customer</p>
            <p>{invoice.customer?.company_contact_name || 'N/A'}</p>
            <p className="text-sm text-muted-foreground">{invoice.customer?.email}</p>
            <p className="text-sm text-muted-foreground">{invoice.customer?.phone}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Issuing Entity</p>
            <p>{invoice.issuing_entity?.entity_name || 'N/A'}</p>
            {/* Add more entity details if needed */}
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Issue Date</p>
            <p>{invoice.issue_date ? format(new Date(invoice.issue_date), 'PPP') : 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Due Date</p>
            <p>{invoice.due_date ? format(new Date(invoice.due_date), 'PPP') : 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Currency</p>
            <p>{invoice.currency_code || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Status</p>
            <Badge variant={invoice.status === 'Paid' ? 'default' : invoice.status === 'Overdue' ? 'destructive' : 'secondary'}>
              {invoice.status || 'Draft'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Line Items Card */}
      <Card>
        <CardHeader>
          <CardTitle>Line Items</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.line_items && invoice.line_items.length > 0 ? (
                invoice.line_items.map((item, index) => (
                  <TableRow key={item.id || index}>
                    <TableCell>{item.product?.name || 'N/A'}</TableCell>
                    <TableCell>{item.description}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.unit_price, invoice.currency_code)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.quantity * item.unit_price, invoice.currency_code)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">No line items found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Totals & Notes Card */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{invoice.notes || 'No notes provided.'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(subtotal, invoice.currency_code)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax ({invoice.tax_percentage || 0}%)</span>
              <span>{formatCurrency(taxAmount, invoice.currency_code)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-semibold text-lg">
              <span>Total</span>
              <span>{formatCurrency(total, invoice.currency_code)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Instructions Card */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md bg-muted p-4">
            <pre className="whitespace-pre-wrap text-sm font-mono">{paymentInstructions}</pre>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Based on payment source: {invoice.payment_source?.name || 'N/A'}
          </p>
        </CardContent>
      </Card>

    </div>
  );
}
