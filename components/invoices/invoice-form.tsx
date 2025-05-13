'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { 
  InvoiceFormValues, 
  invoiceFormSchema,
  DbInvoice
} from '@/lib/schemas/financial-documents'
import { Form } from '@/components/ui/form'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { LineItemEditor } from '@/components/shared/line-item-editor'
import { 
  CustomerSelector, 
  IssuingEntitySelector, 
  PaymentSourceSelector,
  Customer,
  IssuingEntity,
  PaymentSource
} from '@/components/shared/entity-selectors'
import { createInvoice, updateInvoice } from '@/app/invoices/actions'
import { useToast } from '@/components/ui/use-toast'
import { Currency, ALLOWED_CURRENCIES } from '@/lib/constants'
import { Label } from '@/components/ui/label'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from '@/components/ui/select'
import { calculateInvoiceTotals, formatCurrency } from '@/lib/utils/financial-document-utils'

interface InvoiceFormProps {
  invoice?: Partial<DbInvoice> & { items?: Record<string, unknown>[] }
  customers: Customer[]
  issuingEntities: IssuingEntity[]
  paymentSources: PaymentSource[]
  products: Product[]
  defaultCurrency: Currency
  defaultTaxPercentage: number
  defaultDueDate: string
}

interface Product {
  id: string
  sku: string
  name: string
  base_price: number
  base_currency: string
  unit: string
  additional_prices?: {
    currency_code: string
    price: number
  }[]
}

export function InvoiceForm({
  invoice,
  customers,
  issuingEntities,
  paymentSources,
  products,
  defaultCurrency,
  defaultTaxPercentage,
  defaultDueDate
}: InvoiceFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [submitting, setSubmitting] = useState(false)
  const [currency, setCurrency] = useState<Currency>(
    (invoice?.currency_code as Currency) || defaultCurrency
  )
  
  // Get customer preferred currency
  const getCustomerCurrency = (customerId: string): Currency => {
    const customer = customers.find(c => c.id === customerId)
    return customer?.preferred_currency || defaultCurrency
  }

  // Set up form with default values
  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      entityId: invoice?.entity_id || '',
      customerId: invoice?.customer_id || '',
      issueDate: invoice?.issue_date 
        ? new Date(invoice.issue_date).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0],
      dueDate: invoice?.due_date
        ? new Date(invoice.due_date).toISOString().split('T')[0]
        : defaultDueDate,
      currency: (invoice?.currency_code as Currency) || defaultCurrency,
      paymentSourceId: invoice?.payment_source_id || '',
      taxPercent: invoice?.tax_percentage || defaultTaxPercentage,
      notes: invoice?.notes || '',
      lineItems: invoice?.items?.map(item => ({
        id: item.id,
        productId: item.product_id,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        fxRate: item.fx_rate
      })) || [
        // Default empty line item if none provided
        {
          productId: '',
          description: '',
          quantity: 1,
          unitPrice: 0
        }
      ]
    }
  })
  
  // Extract form values for calculations
  const formValues = form.getValues()
  
  // Calculate totals based on current form values
  const { subtotalAmount, taxAmount, totalAmount } = calculateInvoiceTotals(formValues)

  // Handle customer change to update currency
  const handleCustomerChange = (customerId: string) => {
    form.setValue('customerId', customerId)
    // Update currency to match customer's preferred currency
    const newCurrency = getCustomerCurrency(customerId)
    form.setValue('currency', newCurrency)
    setCurrency(newCurrency)
  }
  
  // Handle currency change
  const handleCurrencyChange = (value: string) => {
    const newCurrency = value as Currency
    form.setValue('currency', newCurrency)
    setCurrency(newCurrency)
  }

  // Handle form submission
  const onSubmit = async (data: InvoiceFormValues) => {
    setSubmitting(true)
    
    try {
      // Create FormData object for server action
      const formData = new FormData()
      
      // Add basic fields
      formData.append('entityId', data.entityId)
      formData.append('customerId', data.customerId)
      formData.append('issueDate', data.issueDate)
      formData.append('dueDate', data.dueDate)
      formData.append('currency', data.currency)
      formData.append('paymentSourceId', data.paymentSourceId)
      formData.append('taxPercent', data.taxPercent.toString())
      
      if (data.notes) {
        formData.append('notes', data.notes)
      }
      
      // Add line items as JSON string
      formData.append('lineItems', JSON.stringify(data.lineItems))
      
      let result
      if (invoice?.id) {
        // Update existing invoice
        result = await updateInvoice(invoice.id, formData)
      } else {
        // Create new invoice
        result = await createInvoice(formData)
      }
      
      if (result?.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive"
        })
        setSubmitting(false)
      }
      
      // Server action handles redirect on success
      
    } catch (error) {
      console.error("Form submission error:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      })
      setSubmitting(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic information */}
        <Card>
          <CardHeader>
            <CardTitle>
              {invoice?.id ? 'Edit Invoice' : 'New Invoice'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Entity, customer and payment source selectors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="entity-selector">Issuing Entity</Label>
                <IssuingEntitySelector
                  value={form.getValues('entityId')}
                  onValueChange={(value) => form.setValue('entityId', value)}
                  items={issuingEntities}
                  disabled={submitting}
                />
                {form.formState.errors.entityId && (
                  <p className="text-sm text-red-500">{form.formState.errors.entityId.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="customer-selector">Customer</Label>
                <CustomerSelector
                  value={form.getValues('customerId')}
                  onValueChange={handleCustomerChange}
                  items={customers}
                  disabled={submitting}
                />
                {form.formState.errors.customerId && (
                  <p className="text-sm text-red-500">{form.formState.errors.customerId.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="payment-source-selector">Payment Source</Label>
                <PaymentSourceSelector
                  value={form.getValues('paymentSourceId')}
                  onValueChange={(value) => form.setValue('paymentSourceId', value)}
                  items={paymentSources}
                  disabled={submitting}
                />
                {form.formState.errors.paymentSourceId && (
                  <p className="text-sm text-red-500">{form.formState.errors.paymentSourceId.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="currency-selector">Currency</Label>
                <Select
                  value={currency}
                  onValueChange={handleCurrencyChange}
                  disabled={submitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {ALLOWED_CURRENCIES.map((currency) => (
                      <SelectItem key={currency} value={currency}>
                        {currency}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.currency && (
                  <p className="text-sm text-red-500">{form.formState.errors.currency.message}</p>
                )}
              </div>
            </div>
            
            {/* Dates and tax */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="issue-date">Issue Date</Label>
                <Input
                  id="issue-date"
                  type="date"
                  {...form.register('issueDate')}
                  disabled={submitting}
                />
                {form.formState.errors.issueDate && (
                  <p className="text-sm text-red-500">{form.formState.errors.issueDate.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="due-date">Due Date</Label>
                <Input
                  id="due-date"
                  type="date"
                  {...form.register('dueDate')}
                  disabled={submitting}
                />
                {form.formState.errors.dueDate && (
                  <p className="text-sm text-red-500">{form.formState.errors.dueDate.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="tax-percent">Tax %</Label>
                <Input
                  id="tax-percent"
                  type="number"
                  step={0.01}
                  min={0}
                  max={100}
                  {...form.register('taxPercent', { valueAsNumber: true })}
                  disabled={submitting}
                />
                {form.formState.errors.taxPercent && (
                  <p className="text-sm text-red-500">{form.formState.errors.taxPercent.message}</p>
                )}
              </div>
            </div>
            
            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                {...form.register('notes')}
                disabled={submitting}
                placeholder="Optional notes or additional information..."
              />
              {form.formState.errors.notes && (
                <p className="text-sm text-red-500">{form.formState.errors.notes.message}</p>
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* Line items */}
        <Card>
          <CardHeader>
            <CardTitle>Line Items</CardTitle>
          </CardHeader>
          <CardContent>
            <LineItemEditor
              value={form.getValues('lineItems')}
              onChange={(items) => form.setValue('lineItems', items)}
              currency={currency}
              products={products}
              disabled={submitting}
            />
            {form.formState.errors.lineItems && (
              <p className="text-sm text-red-500 mt-2">
                {form.formState.errors.lineItems.message}
              </p>
            )}
          </CardContent>
        </Card>
        
        {/* Totals and submission */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatCurrency(subtotalAmount, currency)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax ({form.getValues('taxPercent')}%):</span>
                <span>{formatCurrency(taxAmount, currency)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Total:</span>
                <span>{formatCurrency(totalAmount, currency)}</span>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : invoice?.id ? 'Update Invoice' : 'Create Invoice'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  )
}