"use client"

import type React from "react";
import { useEffect, useState, useMemo } from "react";
import { Trash2 } from "lucide-react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, parseISO } from 'date-fns'; // Added parseISO

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/use-toast";

// Import Server Actions and Types
import {
  getAppSettings,
  getIssuingEntities,
} from "@/app/settings/actions";
import {
  type AppSettings,
  type IssuingEntity,
  ALLOWED_CURRENCIES
} from "@/app/settings/types";
import { type DbQuoteData, type DbQuoteLineItem } from "@/app/quotes/actions";

// TODO: Import actual customer/product fetching actions and types
type Customer = { id: string; name: string; preferred_currency?: string | null };
type Product = { id: string; sku: string; name: string; description: string | null; base_price: number; unit: string; status: string };
async function getCustomers(): Promise<Customer[]> { console.warn("getCustomers not implemented, returning mock data."); return [{ id: "cust_1", name: "Placeholder Customer 1" }, { id: "cust_2", name: "Placeholder Customer 2" }]; }
async function getProducts(): Promise<Product[]> { console.warn("getProducts not implemented, returning mock data."); return [{ id: "prod_1", sku: "P-1", name: "Placeholder Product", description: "Desc", base_price: 100, unit: 'pc', status: 'Active' }]; }


// --- Schema Definition (Matches schema in actions.ts) ---
const lineItemSchema = z.object({
  // id: z.string().optional(),
  productId: z.string().uuid("Invalid product ID format").min(1, "Product is required"),
  description: z.string().min(1, "Description is required").max(1000, "Description too long"),
  quantity: z.preprocess(
    (val) => (typeof val === 'string' ? parseInt(val, 10) : val),
    z.number().int().min(1, "Quantity must be at least 1")
  ),
  unitPrice: z.preprocess(
    (val) => (typeof val === 'string' ? parseFloat(val) : val),
    z.number().min(0, "Unit price cannot be negative")
  ),
  // total is calculated, omit
});

const quoteFormSchema = z.object({
  entityId: z.string().uuid("Invalid entity ID format").min(1, "Issuing Entity is required"),
  customerId: z.string().uuid("Invalid customer ID format").min(1, "Customer is required"),
  issueDate: z.string().min(1, "Issue date is required").refine(val => !isNaN(Date.parse(val)), { message: "Invalid issue date" }),
  expiryDate: z.string().min(1, "Expiry date is required").refine(val => !isNaN(Date.parse(val)), { message: "Invalid expiry date" }),
  currency: z.string().length(3, "Currency code must be 3 letters").min(1, "Currency is required"),
  discountPercent: z.preprocess(
    (val) => (typeof val === 'string' ? parseFloat(val) : val),
    z.number().min(0).max(100).optional().default(0)
  ),
  taxPercent: z.preprocess(
    (val) => (typeof val === 'string' ? parseFloat(val) : val),
    z.number().min(0, "Tax cannot be negative").max(100, "Tax cannot exceed 100%").default(0)
  ),
  notes: z.string().max(2000, "Notes/Terms too long").optional(),
  lineItems: z.array(lineItemSchema).min(1, "At least one line item is required"),
});

type QuoteFormValues = z.infer<typeof quoteFormSchema>;

// Type for line items as expected by the form's Zod schema (derived from local schema)
type FormLineItemFields = z.infer<typeof lineItemSchema>;

// Type for the initialData prop is now directly DbQuoteData
type InitialQuoteData = DbQuoteData;

// --- Helper Functions ---
// (Keep calculateExpiryDate helper as is)
function calculateExpiryDate(issueDateStr: string, expiryDays: number | null | undefined): string {
  try {
    const issueDate = new Date(issueDateStr);
    const days = expiryDays ?? 30; // Default to 30 days if not set
    issueDate.setDate(issueDate.getDate() + days);
    return format(issueDate, 'yyyy-MM-dd');
  } catch (e) {
    console.error("Error calculating expiry date:", e);
    const fallbackDate = new Date();
    fallbackDate.setDate(fallbackDate.getDate() + 30);
    return format(fallbackDate, 'yyyy-MM-dd');
  }
}

// --- Component ---
interface QuoteFormProps {
  initialData?: InitialQuoteData | null;
  onSubmitAction: (formData: FormData) => Promise<{ error?: string }>;
}

export function QuoteForm({ initialData = null, onSubmitAction }: QuoteFormProps) {
  const [isLoading, setIsLoading] = useState(true); // For fetching lists
  const [error, setError] = useState<string | null>(null);
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null); // For defaults
  const [issuingEntities, setIssuingEntities] = useState<IssuingEntity[]>([]); // For dropdown
  const [customers, setCustomers] = useState<Customer[]>([]); // For dropdown
  const [products, setProducts] = useState<Product[]>([]); // For dropdown

  // --- Form Initialization ---
  const form = useForm<QuoteFormValues>({
    resolver: zodResolver(quoteFormSchema),
    /* eslint-disable @typescript-eslint/no-explicit-any */
    defaultValues: useMemo(() => {
      if (initialData) {
        // Map initialData (from DB) to form values
        return {
          entityId: initialData.issuing_entity_id || "",
          customerId: initialData.customer_id || "",
          issueDate: initialData.issue_date ? format(parseISO(initialData.issue_date), 'yyyy-MM-dd') : "",
          expiryDate: initialData.expiry_date ? format(parseISO(initialData.expiry_date), 'yyyy-MM-dd') : "",
          currency: initialData.currency_code || "USD",
          discountPercent: initialData.discount_percentage ?? 0,
          taxPercent: initialData.tax_percentage ?? 0,
          notes: initialData.notes || "",
          lineItems: (initialData.line_items as DbQuoteLineItem[] | undefined | null)?.map(
            (item: DbQuoteLineItem): FormLineItemFields => ({
              productId: item.product_id || "",
              description: item.description || "",
              quantity: item.quantity || 1,
              unitPrice: item.unit_price || 0,
            })
          ) || [{ productId: "", description: "", quantity: 1, unitPrice: 0 }],
        };
      } else {
        // Default values for a *new* quote (refined by useEffect)
        return {
          entityId: "",
          customerId: "",
          issueDate: format(new Date(), 'yyyy-MM-dd'),
          expiryDate: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
          currency: "USD",
          discountPercent: 0,
          taxPercent: 0,
          notes: "",
          lineItems: [{ productId: "", description: "", quantity: 1, unitPrice: 0 }],
        };
      }
    }, [initialData]),
    /* eslint-enable @typescript-eslint/no-explicit-any */
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lineItems",
  });

  // --- Data Fetching for Dropdowns & Defaults ---
  useEffect(() => {
    let isMounted = true;
    async function loadDropdownDataAndDefaults() {
      setIsLoading(true);
      setError(null);
      try {
        const [
          settings,
          entities,
          fetchedCustomers,
          fetchedProducts
        ]: [
          AppSettings | null,
          IssuingEntity[],
          Customer[],
          Product[]
        ] = await Promise.all([
          getAppSettings(),
          getIssuingEntities(),
          getCustomers(),
          getProducts(),
        ]);

        if (!isMounted) return;

        setAppSettings(settings);
        setIssuingEntities(entities);
        setCustomers(fetchedCustomers);
        setProducts(fetchedProducts);

        // Set Defaults ONLY IF creating a NEW quote
        if (!initialData) {
          const primaryEntity = entities.find(e => e.is_primary) || entities[0];
          const defaultExpiryDays = settings?.default_quote_expiry_days;
          const defaultTax = settings?.default_tax_percentage;
          const defaultNotes = settings?.default_quote_notes;
          const baseCurrency = settings?.base_currency || "USD";

          const today = format(new Date(), 'yyyy-MM-dd');
          const initialExpiryDate = calculateExpiryDate(today, defaultExpiryDays);

          form.reset({
            ...form.getValues(),
            entityId: form.getValues('entityId') || primaryEntity?.id || "",
            issueDate: form.getValues('issueDate') || today,
            expiryDate: form.getValues('expiryDate') || initialExpiryDate,
            currency: form.getValues('currency') || baseCurrency,
            taxPercent: form.getValues('taxPercent') ?? defaultTax ?? 0,
            notes: form.getValues('notes') || defaultNotes || "",
            discountPercent: form.getValues('discountPercent') ?? 0,
          }, { keepDefaultValues: false });
        }

      } catch (e) {
        console.error("Failed to load initial data for quote form:", e);
        if (isMounted) {
          setError("Failed to load required data. Please try again later.");
          toast({ title: "Error", description: "Could not load necessary data.", variant: "destructive" });
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadDropdownDataAndDefaults();
    return () => { isMounted = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData, form.reset, form.getValues]);

  // --- Watched Values & Derived State ---
  // (Keep watched values and derived state logic as is)
  const watchedLineItems = form.watch("lineItems");
  const watchedTaxPercent = form.watch("taxPercent");
  const watchedDiscountPercent = form.watch("discountPercent");
  const watchedCurrency = form.watch("currency");
  const watchedIssueDate = form.watch("issueDate");

  const subtotal = useMemo(() => watchedLineItems.reduce((sum, item) => sum + ((item.quantity || 0) * (item.unitPrice || 0)), 0), [watchedLineItems]);
  const discountAmount = useMemo(() => subtotal * ((watchedDiscountPercent || 0) / 100), [subtotal, watchedDiscountPercent]);
  const subtotalAfterDiscount = useMemo(() => subtotal - discountAmount, [subtotal, discountAmount]);
  const taxAmount = useMemo(() => subtotalAfterDiscount * ((watchedTaxPercent || 0) / 100), [subtotalAfterDiscount, watchedTaxPercent]);
  const total = useMemo(() => subtotalAfterDiscount + taxAmount, [subtotalAfterDiscount, taxAmount]);

  // --- Effects ---
  // Update line item totals effect removed as total is display-only

  // Recalculate expiry date effect (keep, but only for new quotes)
  useEffect(() => {
    if (!initialData && watchedIssueDate) {
      const defaultExpiryDays = appSettings?.default_quote_expiry_days;
      const newExpiryDate = calculateExpiryDate(watchedIssueDate, defaultExpiryDays);
      if (newExpiryDate !== form.getValues('expiryDate')) {
          form.setValue('expiryDate', newExpiryDate, { shouldValidate: true });
      }
    }
  }, [watchedIssueDate, appSettings, form, initialData]);

  // --- Handlers ---
  // (Keep formatCurrency and handleProductChange handlers as is)
  const formatCurrency = (amount: number) => {
    try {
       return new Intl.NumberFormat(undefined, { style: 'currency', currency: watchedCurrency || 'USD' }).format(amount);
    } catch (_) {
       return `${watchedCurrency || '$'}${amount.toFixed(2)}`;
    }
  };

  const handleProductChange = (index: number, productId: string) => {
    const selectedProduct = products.find((p) => p.id === productId || p.sku === productId);
    if (selectedProduct) {
      form.setValue(`lineItems.${index}.description`, selectedProduct.description || selectedProduct.name, { shouldValidate: true });
      // TODO: Implement multi-currency price logic
      form.setValue(`lineItems.${index}.unitPrice`, selectedProduct.base_price, { shouldValidate: true });
    }
  };

  // Use the passed server action for submission
  async function handleFormSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await form.handleSubmit(async (data) => {
      console.log("Quote form data validated:", data);
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (key === 'lineItems') {
          formData.append(key, JSON.stringify(value));
        } else if (value !== null && value !== undefined) {
          formData.append(key, String(value));
        }
      });

      try {
        const result = await onSubmitAction(formData);
        if (result?.error) {
          toast({ title: "Submission Error", description: result.error, variant: "destructive" });
        } else {
          toast({ title: "Success", description: `Quote ${initialData ? 'updated' : 'created'} successfully.` });
          // Redirect handled by server action
        }
      } catch (error) {
        console.error("Quote submission failed:", error);
        toast({ title: "Submission Error", description: "An unexpected error occurred.", variant: "destructive" });
      }
    })(event);
  }

  // --- Render Logic ---
  // (Keep Skeleton and error rendering as is)
   if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-1/4" />
        <Card><CardContent className="pt-6 space-y-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></CardContent></Card>
        <Card><CardContent className="pt-6 space-y-4"><Skeleton className="h-20 w-full" /></CardContent></Card>
        <Card><CardContent className="pt-6 space-y-4"><Skeleton className="h-16 w-full" /></CardContent></Card>
      </div>
    );
  }

  if (error) {
    return <p className="text-red-500 p-4">{error}</p>;
  }

  return (
    <Form {...form}>
      <form onSubmit={handleFormSubmit} className="space-y-8">
        {/* Header Fields Card */}
        <Card>
          <CardContent className="pt-6">
            {/* Keep FormField definitions, add keys */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <FormField
                control={form.control}
                name="entityId"
                key={`entityId-${form.formState.defaultValues?.entityId}`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Issuing Entity <span className="text-red-500">*</span></FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select entity" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {issuingEntities.map((entity) => (
                          <SelectItem key={entity.id} value={entity.id}>
                            {entity.entity_name} {entity.is_primary ? '(Primary)' : ''}
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
                key={`customerId-${form.formState.defaultValues?.customerId}`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer <span className="text-red-500">*</span></FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
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
                key={`issueDate-${form.formState.defaultValues?.issueDate}`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Issue Date <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="expiryDate"
                key={`expiryDate-${form.formState.defaultValues?.expiryDate}`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expiry Date <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="currency"
                key={`currency-${form.formState.defaultValues?.currency}`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency <span className="text-red-500">*</span></FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ALLOWED_CURRENCIES.map((currencyCode) => (
                          <SelectItem key={currencyCode} value={currencyCode}>
                            {currencyCode}
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

        {/* Line Items Card */}
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
                          key={`${field.id}-productId`}
                          render={({ field: itemField }) => (
                            <FormItem>
                              <Select
                                onValueChange={(value) => {
                                  itemField.onChange(value);
                                  handleProductChange(index, value);
                                }}
                                value={itemField.value}
                                defaultValue={itemField.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select product" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {products.map((product) => (
                                    <SelectItem key={product.id} value={product.id}>
                                      {product.name} ({product.sku})
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
                          key={`${field.id}-description`}
                          render={({ field: itemField }) => (
                            <FormItem>
                              <FormControl>
                                <Input placeholder="Description" {...itemField} value={itemField.value || ''} />
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
                          key={`${field.id}-quantity`}
                          render={({ field: itemField }) => (
                            <FormItem>
                              <FormControl>
                                <Input
                                  type="number"
                                  {...itemField}
                                  value={itemField.value ?? 1}
                                  onChange={(e) => itemField.onChange(Number.parseInt(e.target.value) || 1)}
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
                          key={`${field.id}-unitPrice`}
                          render={({ field: itemField }) => (
                            <FormItem>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.01"
                                  {...itemField}
                                  value={itemField.value ?? 0}
                                  onChange={(e) => itemField.onChange(Number.parseFloat(e.target.value) || 0)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency((watchedLineItems[index]?.quantity || 0) * (watchedLineItems[index]?.unitPrice || 0))}
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => fields.length > 1 && remove(index)}
                          disabled={fields.length === 1}
                          aria-label="Remove line item"
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
              onClick={() => append({ productId: "", description: "", quantity: 1, unitPrice: 0 })}
            >
              Add Line Item
            </Button>

            {/* Totals Section */}
            <div className="mt-6 space-y-4">
              <div className="flex justify-end">
                <div className="w-full max-w-xs space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                   <div className="flex items-center justify-between">
                     <Label htmlFor="discountPercentInput" className="mr-2 shrink-0">Discount (%):</Label>
                    <FormField
                      control={form.control}
                      name="discountPercent"
                      key={`discountPercent-${form.formState.defaultValues?.discountPercent}`}
                      render={({ field }) => (
                        <FormItem className="flex-grow">
                          <FormControl>
                            <Input
                              id="discountPercentInput"
                              type="number"
                              step="0.01"
                              min="0"
                              max="100"
                              className="w-full text-right"
                              {...field}
                              value={field.value ?? 0}
                              onChange={(e) => field.onChange(Number.parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                   <div className="flex justify-between text-muted-foreground text-sm">
                     <span>Discount Amount:</span>
                     <span>({formatCurrency(discountAmount)})</span>
                   </div>
                   <div className="flex justify-between font-medium">
                     <span>Subtotal After Discount:</span>
                     <span>{formatCurrency(subtotalAfterDiscount)}</span>
                   </div>
                  <div className="flex items-center justify-between">
                     <Label htmlFor="taxPercentInput" className="mr-2 shrink-0">Tax (%):</Label>
                    <FormField
                      control={form.control}
                      name="taxPercent"
                      key={`taxPercent-${form.formState.defaultValues?.taxPercent}`}
                      render={({ field }) => (
                        <FormItem className="flex-grow">
                          <FormControl>
                            <Input
                              id="taxPercentInput"
                              type="number"
                              step="0.01"
                              min="0"
                              max="100"
                              className="w-full text-right"
                              {...field}
                              value={field.value ?? 0}
                              onChange={(e) => field.onChange(Number.parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                   <div className="flex justify-between text-muted-foreground text-sm">
                     <span>Tax Amount:</span>
                     <span>{formatCurrency(taxAmount)}</span>
                   </div>
                  <Separator />
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total:</span>
                    <span>{formatCurrency(total)}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes Card */}
        <Card>
          <CardContent className="pt-6">
            <FormField
              control={form.control}
              name="notes"
              key={`notes-${form.formState.defaultValues?.notes}`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes / Terms</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter any additional notes or terms and conditions"
                      rows={4}
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end">
          {/* TODO: Add Cancel button */}
          <Button type="submit" disabled={form.formState.isSubmitting || isLoading}>
            {form.formState.isSubmitting ? "Saving..." : (initialData ? "Update Quote" : "Create Quote")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
