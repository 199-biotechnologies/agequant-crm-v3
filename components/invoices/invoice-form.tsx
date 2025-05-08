"use client"

import type React from "react"
import { useEffect } from "react"
// import { useRouter } from "next/navigation" // Removed as _router is not used
import { Trash2 } from "lucide-react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label" // Keep for non-RHF labels if any, or remove if all are FormLabel
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"

// Mock data (can be replaced with API calls later)
const entities = [
  { id: "1", name: "AgeQuant LLC" },
  { id: "2", name: "AgeQuant Europe GmbH" },
]

const customers = [
  { id: "1", name: "Acme Corp" },
  { id: "2", name: "Globex Inc" },
  { id: "3", name: "Initech" },
  { id: "4", name: "Wayne Enterprises" },
  { id: "5", name: "Stark Industries" },
]

const paymentSources = [
  { id: "1", name: "Primary USD Account", entityId: "1" },
  { id: "2", name: "Secondary USD Account", entityId: "1" },
  { id: "3", name: "EUR Account", entityId: "2" },
]

const products = [
  { id: "PR-H5K3N", name: "Basic Plan", description: "Basic subscription plan", price: 99.0 },
  { id: "PR-J7M2P", name: "Premium Plan", description: "Premium subscription with advanced features", price: 199.0 },
  { id: "PR-K9R4S", name: "Enterprise Plan", description: "Enterprise-grade solution with dedicated support", price: 499.0 },
  { id: "PR-L2T6V", name: "Consulting (hourly)", description: "Professional consulting services", price: 150.0 },
]

const currencies = [
  { code: "USD", symbol: "$" }, { code: "GBP", symbol: "£" }, { code: "EUR", symbol: "€" },
  { code: "CHF", symbol: "CHF" }, { code: "SGD", symbol: "S$" }, { code: "HKD", symbol: "HK$" },
  { code: "CNY", symbol: "¥" }, { code: "JPY", symbol: "¥" }, { code: "CAD", symbol: "C$" },
  { code: "AUD", symbol: "A$" }, { code: "NZD", symbol: "NZ$" },
]

const defaultPaymentInstructions = `
Bank Name: International Bank
Account Name: AgeQuant LLC
Account #: 123456789
SWIFT/IBAN: INTLUS12345
Routing #: 987654321
`

const lineItemSchema = z.object({
  id: z.string().optional(), // For react-hook-form's key management
  productId: z.string().min(1, "Product is required"),
  description: z.string().min(1, "Description is required"),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  unitPrice: z.number().min(0, "Unit price cannot be negative"),
  total: z.number(),
})

const invoiceFormSchema = z.object({
  entityId: z.string().min(1, "Issuing Entity is required"),
  customerId: z.string().min(1, "Customer is required"),
  issueDate: z.string().min(1, "Issue date is required"),
  dueDate: z.string().min(1, "Due date is required"),
  currency: z.string().min(1, "Currency is required"),
  paymentSourceId: z.string().min(1, "Payment source is required"),
  taxPercent: z.number().min(0, "Tax cannot be negative").max(100, "Tax cannot exceed 100%").default(0),
  notes: z.string().optional(),
  lineItems: z.array(lineItemSchema).min(1, "At least one line item is required"),
})

type InvoiceFormValues = z.infer<typeof invoiceFormSchema>

export function InvoiceForm() {
  // const _router = useRouter() // Removed as it's not used after refactor
  const today = new Date().toISOString().split("T")[0]
  const defaultDueDate = new Date()
  defaultDueDate.setDate(defaultDueDate.getDate() + 30)
  const formattedDueDate = defaultDueDate.toISOString().split("T")[0]

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      entityId: entities[0]?.id || "",
      customerId: "",
      issueDate: today,
      dueDate: formattedDueDate,
      currency: "USD",
      paymentSourceId: paymentSources.find(ps => ps.entityId === (entities[0]?.id || ""))?.id || "",
      taxPercent: 0,
      notes: "",
      lineItems: [{ productId: "", description: "", quantity: 1, unitPrice: 0, total: 0 }],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lineItems",
  })

  const watchedLineItems = form.watch("lineItems")
  const watchedTaxPercent = form.watch("taxPercent")
  const watchedCurrency = form.watch("currency")
  const watchedEntityId = form.watch("entityId")

  useEffect(() => {
    // Update totals when line items or tax percent change
    watchedLineItems.forEach((item, index) => {
      const newTotal = item.quantity * item.unitPrice
      if (item.total !== newTotal) {
        form.setValue(`lineItems.${index}.total`, newTotal, { shouldValidate: true })
      }
    })
  }, [watchedLineItems, form])
  
  useEffect(() => {
    // Reset payment source if entity changes and current payment source is not valid for new entity
    const currentPaymentSource = paymentSources.find(ps => ps.id === form.getValues("paymentSourceId"));
    if (currentPaymentSource && currentPaymentSource.entityId !== watchedEntityId) {
      const firstValidSourceForEntity = paymentSources.find(ps => ps.entityId === watchedEntityId);
      form.setValue("paymentSourceId", firstValidSourceForEntity?.id || "", { shouldValidate: true });
    } else if (!currentPaymentSource && watchedEntityId) {
      // If no payment source is selected, or current is invalid, pick the first valid one for the new entity
      const firstValidSourceForEntity = paymentSources.find(ps => ps.entityId === watchedEntityId);
      if (firstValidSourceForEntity) {
        form.setValue("paymentSourceId", firstValidSourceForEntity.id, { shouldValidate: true });
      }
    }
  }, [watchedEntityId, form]);


  const subtotal = watchedLineItems.reduce((sum, item) => sum + (item.total || 0), 0)
  const taxAmount = subtotal * ((watchedTaxPercent || 0) / 100)
  const total = subtotal + taxAmount

  const formatCurrency = (amount: number) => {
    const currencySymbol = currencies.find((c) => c.code === watchedCurrency)?.symbol || "$"
    return `${currencySymbol}${amount.toFixed(2)}`
  }

  const handleProductChange = (index: number, productId: string) => {
    const selectedProduct = products.find((p) => p.id === productId)
    if (selectedProduct) {
      form.setValue(`lineItems.${index}.description`, selectedProduct.description, { shouldValidate: true })
      form.setValue(`lineItems.${index}.unitPrice`, selectedProduct.price, { shouldValidate: true })
      // Total will be recalculated by useEffect
    }
  }

  function onSubmit(data: InvoiceFormValues) {
    console.log("Form submitted:", data)
    // router.push("/invoices") // Navigate after successful submission to backend
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card>
          <CardContent className="pt-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <FormField
                control={form.control}
                name="entityId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Issuing Entity <span className="text-red-500">*</span></FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select entity" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {entities.map((entity) => (
                          <SelectItem key={entity.id} value={entity.id}>
                            {entity.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="customerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer <span className="text-red-500">*</span></FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select customer" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {customers.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="issueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Issue Date <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency <span className="text-red-500">*</span></FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {currencies.map((currency) => (
                          <SelectItem key={currency.code} value={currency.code}>
                            {currency.code} ({currency.symbol})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="paymentSourceId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Source <span className="text-red-500">*</span></FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select payment source" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {paymentSources
                          .filter((source) => source.entityId === watchedEntityId)
                          .map((source) => (
                            <SelectItem key={source.id} value={source.id}>
                              {source.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <h3 className="mb-4 text-lg font-medium">Line Items</h3>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-[100px]">Qty</TableHead>
                    <TableHead className="w-[150px]">Unit Price</TableHead>
                    <TableHead className="w-[150px]">Total</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.map((field, index) => (
                    <TableRow key={field.id}>
                      <TableCell>
                        <FormField
                          control={form.control}
                          name={`lineItems.${index}.productId`}
                          render={({ field: itemField }) => (
                            <FormItem>
                              <Select
                                onValueChange={(value) => {
                                  itemField.onChange(value)
                                  handleProductChange(index, value)
                                }}
                                defaultValue={itemField.value}
                                value={itemField.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select product" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {products.map((product) => (
                                    <SelectItem key={product.id} value={product.id}>
                                      {product.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        <FormField
                          control={form.control}
                          name={`lineItems.${index}.description`}
                          render={({ field: itemField }) => (
                            <FormItem>
                              <FormControl>
                                <Input placeholder="Description" {...itemField} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        <FormField
                          control={form.control}
                          name={`lineItems.${index}.quantity`}
                          render={({ field: itemField }) => (
                            <FormItem>
                              <FormControl>
                                <Input
                                  type="number"
                                  {...itemField}
                                  onChange={(e) => itemField.onChange(Number.parseInt(e.target.value) || 0)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        <FormField
                          control={form.control}
                          name={`lineItems.${index}.unitPrice`}
                          render={({ field: itemField }) => (
                            <FormItem>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.01"
                                  {...itemField}
                                  onChange={(e) => itemField.onChange(Number.parseFloat(e.target.value) || 0)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </TableCell>
                      <TableCell>{formatCurrency(watchedLineItems[index]?.total || 0)}</TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => fields.length > 1 && remove(index)}
                          disabled={fields.length === 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => append({ productId: "", description: "", quantity: 1, unitPrice: 0, total: 0 })}
            >
              Add Line Item
            </Button>

            <div className="mt-6 space-y-4">
              <div className="flex justify-end">
                <div className="w-[300px] space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                     <Label htmlFor="taxPercentInput" className="mr-2">Tax (%):</Label> {/* Using Label for clarity */}
                    <FormField
                      control={form.control}
                      name="taxPercent"
                      render={({ field }) => (
                        <FormItem className="flex-grow">
                           {/* Removed FormLabel here as it's outside */}
                          <FormControl>
                            <Input
                              id="taxPercentInput"
                              type="number"
                              step="0.01"
                              className="w-full" // Make input take available space
                              {...field}
                              onChange={(e) => field.onChange(Number.parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold">
                    <span>Total:</span>
                    <span>{formatCurrency(total)}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter any additional notes or information"
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <h3 className="mb-2 text-lg font-medium">Payment Instructions</h3>
            <div className="rounded-md bg-muted p-4">
              <pre className="whitespace-pre-wrap text-sm">{defaultPaymentInstructions}</pre>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              <a href="/settings/payment-sources" className="underline">
                Manage in Settings → Payment Sources
              </a>
            </p>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Saving..." : "Save Invoice"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
