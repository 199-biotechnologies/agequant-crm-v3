"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import { Trash2, Loader2 } from "lucide-react";
import React, { useState, useEffect, useCallback } from "react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { productFormSchema, type ProductFormData } from "./product-form-schema";
import { ALLOWED_CURRENCIES, PRODUCT_UNITS, PRODUCT_STATUSES } from "@/lib/constants";

// Debounce function moved outside the component for stable reference
// R: Return type of the debounced function, T: Argument types of the debounced function
const debounce = <T extends unknown[], R>(
  func: (...args: T) => Promise<R>,
  delay: number
): ((...args: T) => Promise<R>) => {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: T): Promise<R> => {
    return new Promise((resolve) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(async () => {
        resolve(await func(...args));
      }, delay);
    });
  };
};

interface ProductFormProps {
  initialData?: Partial<ProductFormData> & { sku?: string | null };
  serverAction: (formData: FormData) => Promise<void | { error?: string; fieldErrors?: Record<string, string[] | undefined>; createdSku?: string }>;
  baseCurrency: string; // Make baseCurrency required or handle default more robustly
}

// Remove hardcoded BASE_CURRENCY constant
// const BASE_CURRENCY = "USD";

export function ProductForm({ initialData, serverAction, baseCurrency = "USD" }: ProductFormProps) { // Provide a fallback default if needed
  // Filter allowed currencies based on the passed baseCurrency
  const additionalCurrencies = ALLOWED_CURRENCIES.filter(c => c !== baseCurrency);

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: initialData?.name || "",
      unit: initialData?.unit || PRODUCT_UNITS[0],
      base_price: initialData?.base_price || 0,
      status: initialData?.status || "Active",
      description: initialData?.description || "",
      additional_prices: initialData?.additional_prices && initialData.additional_prices.length > 0
                         ? initialData.additional_prices
                         : [],
    },
  });

  const [suggestedPrices, setSuggestedPrices] = useState<Record<string, { price: number | string; loading: boolean }>>({});
  const watchedBasePrice = form.watch("base_price");

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "additional_prices",
  });

  const fetchFxRate = useCallback(async (base: string, target: string): Promise<number | null> => {
    if (!base || !target || base === target) return null;
    try {
      const response = await fetch(`/api/fx?base=${base}&target=${target}`);
      if (!response.ok) {
        console.error(`Failed to fetch FX rate for ${target} from ${base}`);
        return null;
      }
      const data = await response.json();
      return data.rate as number | null;
    } catch (error) {
      console.error(`Error fetching FX rate for ${target} from ${base}:`, error);
      return null;
     }
   }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedFetchFxRate = useCallback(debounce(fetchFxRate, 750), [fetchFxRate]);

   useEffect(() => {
     // Use the baseCurrency prop for FX fetching
     if (typeof watchedBasePrice === 'number' && watchedBasePrice > 0 && baseCurrency) {
      const newSuggestedPrices: Record<string, { price: number | string; loading: boolean }> = {};

      fields.forEach(async (fieldItem, index) => {
        const targetCurrency = form.getValues(`additional_prices.${index}.currency_code`);
        // Ensure target is not the base currency before fetching
        if (targetCurrency && targetCurrency !== baseCurrency) {
          setSuggestedPrices(prev => ({
            ...prev,
            [targetCurrency]: { price: prev[targetCurrency]?.price || '', loading: true }
          }));
          // Fetch rate using the dynamic baseCurrency
          const rate = await debouncedFetchFxRate(baseCurrency, targetCurrency);
          if (typeof rate === 'number') {
            const suggested = parseFloat((watchedBasePrice * rate).toFixed(2));
            newSuggestedPrices[targetCurrency] = { price: suggested, loading: false };
          } else {
            newSuggestedPrices[targetCurrency] = { price: 'N/A', loading: false };
          }
          setSuggestedPrices(prev => ({ ...prev, ...newSuggestedPrices }));
        }
      });
    } else {
      setSuggestedPrices({});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedBasePrice, fields.length, form, debouncedFetchFxRate]); // Added form and debouncedFetchFxRate to deps

  async function onSubmit(data: ProductFormData) {
    const processedData = {
      ...data,
      additional_prices: data.additional_prices?.filter(
        ap => ap.currency_code && typeof ap.price === 'number' && !isNaN(ap.price)
      ) || [],
    };

    const formData = new FormData();
    (Object.keys(data) as Array<keyof ProductFormData>).forEach((key) => {
      if (key === 'additional_prices') {
        processedData.additional_prices?.forEach((ap, index) => {
          formData.append(`additional_prices[${index}].currency_code`, ap.currency_code);
          if (typeof ap.price === 'number') {
            formData.append(`additional_prices[${index}].price`, ap.price.toString());
          }
        });
      } else if (processedData[key] !== null && processedData[key] !== undefined) {
        formData.append(key, processedData[key]!.toString());
      }
    });

    if (initialData?.sku) {
      formData.append('sku', initialData.sku);
    }
    
    const result = await serverAction(formData);
    if (result?.error) {
      console.error("Server action error:", result.error, result.fieldErrors);
      alert(`Error: ${result.error}`);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {initialData?.sku && (
          <Card>
            <CardHeader><CardTitle>Product SKU</CardTitle></CardHeader>
            <CardContent>
              <p className="text-lg font-mono">{initialData.sku}</p>
              <FormDescription>The unique SKU for this product (auto-generated).</FormDescription>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle>Product Details</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product Name <span className="text-red-500">*</span></FormLabel>
                  <FormControl><Input placeholder="e.g., Premium Subscription" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit <span className="text-red-500">*</span></FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select unit" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {PRODUCT_UNITS.map(unit => <SelectItem key={unit} value={unit}>{unit}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="base_price"
                render={({ field }) => (
            <FormItem>
              {/* Use the baseCurrency prop in the label */}
              <FormLabel>Base Price ({baseCurrency}) <span className="text-red-500">*</span></FormLabel>
              <FormControl><Input type="number" step="0.01" placeholder="e.g., 99.99" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl>
              <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status <span className="text-red-500">*</span></FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {PRODUCT_STATUSES.map(status => <SelectItem key={status} value={status}>{status}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl><Textarea placeholder="Detailed description of the product..." {...field} rows={5} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Additional Prices (Multi-Currency)</CardTitle></CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Currency <span className="text-red-500">*</span></TableHead>
                    <TableHead>Price <span className="text-red-500">*</span></TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.map((item, index) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <FormField
                          control={form.control}
                          name={`additional_prices.${index}.currency_code`}
                          render={({ field }) => (
                            <FormItem>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Select currency" /></SelectTrigger></FormControl>
                                <SelectContent>
                                  {additionalCurrencies.map(currency => <SelectItem key={currency} value={currency}>{currency}</SelectItem>)}
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
                          name={`additional_prices.${index}.price`}
                          render={({ field }) => {
                           const currencyCode = form.watch(`additional_prices.${index}.currency_code`);
                           const suggestion = suggestedPrices[currencyCode];
                           const placeholderText = suggestion?.loading ? "Loading..." :
                                                   typeof suggestion?.price === 'number' ? `Suggest: ${suggestion.price}` :
                                                   suggestion?.price === 'N/A' ? "Rate N/A" : "e.g., 89.99";
                           return (
                            <FormItem>
                              <FormControl>
                                <div className="relative">
                                  <Input
                                    type="number"
                                    step="0.01"
                                    placeholder={placeholderText}
                                    {...field}
                                    onChange={e => field.onChange(parseFloat(e.target.value))}
                                    onFocus={(e) => {
                                       if (typeof suggestion?.price === 'number' && e.target.value === '') {
                                          form.setValue(`additional_prices.${index}.price`, suggestion.price);
                                       }
                                    }}
                                  />
                                  {suggestion?.loading && <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />}
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          );
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} disabled={fields.length === 0}>
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
                onClick={() => {
                  const usedCurrencies = new Set(fields.map(f => f.currency_code));
                  const nextCurrency = additionalCurrencies.find(ac => !usedCurrencies.has(ac));
                  append({ currency_code: nextCurrency || additionalCurrencies[0], price: 0 }); 
                }}
                disabled={fields.length >= additionalCurrencies.length}
              >
              Add Additional Price
            </Button>
            <FormDescription className="mt-2">
              {/* Use the baseCurrency prop in the description */}
              Add specific prices for currencies other than the base currency ({baseCurrency}).
            </FormDescription>
          </CardContent>
        </Card>

        <Button type="submit" disabled={form.formState.isSubmitting}>
          {initialData?.sku ? "Update Product" : "Save Product"}
        </Button>
      </form>
    </Form>
  );
}
