import { notFound } from 'next/navigation';
import { getQuoteById } from '@/app/quotes/actions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';

// TODO: Import ActionButtons and configure for Quote View context

// Define a type for individual line items
interface QuoteLineItem {
  id: string;
  product_id: string;
  product?: { name?: string };
  description: string;
  quantity: number;
  unit_price: number;
}

// Define a type for the main quote object
interface QuoteData {
  id: string;
  quote_number?: string | null;
  issue_date: string;
  expiry_date: string;
  currency_code: string;
  status?: string | null;
  discount_percentage?: number | null;
  tax_percentage?: number | null;
  notes?: string | null;
  customer?: { company_contact_name?: string | null; email?: string | null; phone?: string | null; } | null;
  issuing_entity?: { entity_name?: string | null; } | null;
  line_items?: QuoteLineItem[] | null;
}

// Helper to format currency - reuse or import
function formatCurrency(amount: number, currencyCode: string = 'USD'): string {
    try {
       return new Intl.NumberFormat(undefined, { style: 'currency', currency: currencyCode }).format(amount);
    } catch (_) {
       return `${currencyCode} ${amount.toFixed(2)}`;
    }
}

export default async function QuoteViewPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const result = await getQuoteById(id) as { quote: QuoteData | null; error: string | null };
  const { quote, error } = result;

  if (error || !quote) {
    console.error("Error fetching quote for view:", error);
    notFound();
  }

  // Calculate totals
  const subtotal = quote.line_items?.reduce((sum, item) => sum + (item.quantity * item.unit_price || 0), 0) ?? 0;
  const discountAmount = subtotal * ((quote.discount_percentage || 0) / 100);
  const subtotalAfterDiscount = subtotal - discountAmount;
  const taxAmount = subtotalAfterDiscount * ((quote.tax_percentage || 0) / 100);
  const total = subtotalAfterDiscount + taxAmount;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">
          Quote {quote.quote_number || `#${id.substring(0, 6)}...`} {/* Display quote number if available */}
        </h1>
        {/* TODO: Add ActionButtons component here, configured for Quote View */}
        {/* <ActionButtons context="quoteView" quoteId={id} status={quote.status} /> */}
        <div>Edit/Convert Buttons Placeholder</div>
      </div>

      {/* Quote Details Card */}
      <Card>
        <CardHeader>
          <CardTitle>Quote Details</CardTitle>
          <CardDescription>
            Issued by {quote.issuing_entity?.entity_name || 'N/A'} to {quote.customer?.company_contact_name || 'N/A'}.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Customer</p>
            <p>{quote.customer?.company_contact_name || 'N/A'}</p>
            <p className="text-sm text-muted-foreground">{quote.customer?.email}</p>
            <p className="text-sm text-muted-foreground">{quote.customer?.phone}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Issuing Entity</p>
            <p>{quote.issuing_entity?.entity_name || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Issue Date</p>
            <p>{quote.issue_date ? format(new Date(quote.issue_date), 'PPP') : 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Expiry Date</p>
            <p>{quote.expiry_date ? format(new Date(quote.expiry_date), 'PPP') : 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Currency</p>
            <p>{quote.currency_code || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Status</p>
            <Badge variant={quote.status === 'Accepted' ? 'default' : quote.status === 'Rejected' ? 'destructive' : 'secondary'}>
              {quote.status || 'Draft'}
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
              {quote.line_items && quote.line_items.length > 0 ? (
                quote.line_items.map((item, index) => (
                  <TableRow key={item.id || index}>
                    <TableCell>{item.product?.name || 'N/A'}</TableCell>
                    <TableCell>{item.description}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.unit_price, quote.currency_code)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.quantity * item.unit_price, quote.currency_code)}</TableCell>
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
            <CardTitle>Notes / Terms</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{quote.notes || 'No notes or terms provided.'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(subtotal, quote.currency_code)}</span>
            </div>
             <div className="flex justify-between">
              <span className="text-muted-foreground">Discount ({quote.discount_percentage || 0}%)</span>
              <span>({formatCurrency(discountAmount, quote.currency_code)})</span>
            </div>
             <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal After Discount</span>
              <span>{formatCurrency(subtotalAfterDiscount, quote.currency_code)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax ({quote.tax_percentage || 0}%)</span>
              <span>{formatCurrency(taxAmount, quote.currency_code)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-semibold text-lg">
              <span>Total</span>
              <span>{formatCurrency(total, quote.currency_code)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
