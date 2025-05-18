import { notFound } from 'next/navigation';
import { getQuoteById } from '@/app/quotes/actions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from 'date-fns';
import Link from 'next/link';
import { DocumentStatusUpdater } from '@/components/shared/document-status-updater';

// Item type is inferred from the data structure

// Define the quote type based on actual data structure from getQuoteById

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
  const quote = await getQuoteById(id);

  if (!quote) {
    console.error("Error fetching quote for view:", id);
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
          Quote {quote.quote_number || `#${id.substring(0, 6)}...`}
        </h1>
        <div className="flex gap-2">
          {/* Download PDF button */}
          <Button asChild variant="outline">
            <Link 
              href={`/api/pdf/quote/${id}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                className="lucide lucide-file-down"
              >
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                <polyline points="14 2 14 8 20 8"/>
                <path d="M12 18v-6"/>
                <path d="m9 15 3 3 3-3"/>
              </svg>
              Download PDF
            </Link>
          </Button>
          
          {/* Edit button */}
          <Button asChild variant="outline">
            <Link href={`/quotes/${id}/edit`}>Edit</Link>
          </Button>
          
          {/* Status management and conversion */}
          <DocumentStatusUpdater 
            id={id} 
            currentStatus={quote.status || 'Draft'} 
            type="quote" 
          />
        </div>
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
            <Badge variant={quote.status === 'Accepted' ? 'default' : 
                           quote.status === 'Rejected' ? 'destructive' : 
                           quote.status === 'Expired' ? 'outline' : 'secondary'}>
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
                    <TableCell>{item.product?.name || item.product_id || 'N/A'}</TableCell>
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