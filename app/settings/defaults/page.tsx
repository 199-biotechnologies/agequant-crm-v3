'use client';

import { useEffect, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { getAppSettings, updateAppSettings } from '@/app/settings/actions';
import { type AppSettings, ALLOWED_CURRENCIES } from '@/app/settings/types'; // Import from types.ts
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast'; // Assuming use-toast is set up

// Helper component for submit button state
function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Saving...' : 'Save Settings'}
    </Button>
  );
}

export function DefaultsSettingsPage() {
  // We'll fetch initial settings on client for simplicity here,
  // or this could be passed as a prop if fetched by a parent server component.
  const [initialSettings, setInitialSettings] = useState<AppSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Form state for server action
  const [state, formAction] = useFormState(updateAppSettings, { success: false });

  useEffect(() => {
    async function fetchSettings() {
      setIsLoading(true);
      const settings = await getAppSettings();
      setInitialSettings(settings);
      setIsLoading(false);
    }
    fetchSettings();
  }, []);

  useEffect(() => {
    if (state.success) {
      toast({ title: 'Success', description: 'Application settings updated successfully.' });
      // Optionally re-fetch or update initialSettings if needed, though revalidatePath should handle data refresh
    } else if (state.error) {
      toast({ title: 'Error', description: state.error, variant: 'destructive' });
    }
    // Handle fieldErrors if you want to display them next to fields
    // console.log(state.fieldErrors);
  }, [state]);

  if (isLoading) {
    return <p>Loading default settings...</p>;
  }

  if (!initialSettings && !isLoading) {
    return <p>Could not load application settings. Please ensure they are configured in the database.</p>;
  }
  
  // TODO: Build the actual form using initialSettings to populate defaultValues
  // and AppSettingsFormSchema for validation guidance.

  return (
    <Card>
      <CardHeader>
        <CardTitle>Application Defaults</CardTitle>
        <CardDescription>Manage default settings for the application. These values affect new documents and system behavior.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-6">
          {/* Base Currency */}
          <div className="space-y-2">
            <Label htmlFor="base_currency">Base Currency</Label>
            <Select name="base_currency" defaultValue={initialSettings?.base_currency}>
              <SelectTrigger id="base_currency">
                 <SelectValue placeholder="Select base currency" />
               </SelectTrigger>
               <SelectContent>
                 {ALLOWED_CURRENCIES.map((currency: typeof ALLOWED_CURRENCIES[number]) => (
                   <SelectItem key={currency} value={currency}>
                     {currency}
                   </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {state.fieldErrors?.base_currency && <p className="text-sm text-red-500">{state.fieldErrors.base_currency.join(', ')}</p>}
            <p className="text-sm text-muted-foreground">The primary currency for all financial calculations and reporting.</p>
          </div>

          {/* Default Tax Percentage */}
          <div className="space-y-2">
            <Label htmlFor="default_tax_percentage">Default Tax Percentage (%)</Label>
            <Input
              id="default_tax_percentage"
              name="default_tax_percentage"
              type="number"
              step="0.01"
              min="0"
              max="100"
              defaultValue={initialSettings?.default_tax_percentage ?? 0}
              className="max-w-xs"
            />
            {state.fieldErrors?.default_tax_percentage && <p className="text-sm text-red-500">{state.fieldErrors.default_tax_percentage.join(', ')}</p>}
            <p className="text-sm text-muted-foreground">Default tax rate applied to new quotes and invoices.</p>
          </div>

          {/* Default Quote Expiry Days */}
          <div className="space-y-2">
            <Label htmlFor="default_quote_expiry_days">Default Quote Expiry (Days)</Label>
            <Input
              id="default_quote_expiry_days"
              name="default_quote_expiry_days"
              type="number"
              min="0"
              defaultValue={initialSettings?.default_quote_expiry_days ?? 30}
              className="max-w-xs"
            />
            {state.fieldErrors?.default_quote_expiry_days && <p className="text-sm text-red-500">{state.fieldErrors.default_quote_expiry_days.join(', ')}</p>}
            <p className="text-sm text-muted-foreground">Default validity period for new quotes.</p>
          </div>

          {/* Default Invoice Payment Terms Days */}
          <div className="space-y-2">
            <Label htmlFor="default_invoice_payment_terms_days">Default Invoice Payment Terms (Days)</Label>
            <Input
              id="default_invoice_payment_terms_days"
              name="default_invoice_payment_terms_days"
              type="number"
              min="0"
              defaultValue={initialSettings?.default_invoice_payment_terms_days ?? 30}
              className="max-w-xs"
            />
            {state.fieldErrors?.default_invoice_payment_terms_days && <p className="text-sm text-red-500">{state.fieldErrors.default_invoice_payment_terms_days.join(', ')}</p>}
            <p className="text-sm text-muted-foreground">Default payment due period for new invoices.</p>
          </div>

          {/* Default Quote Notes */}
          <div className="space-y-2">
            <Label htmlFor="default_quote_notes">Default Quote Notes</Label>
            <Textarea
              id="default_quote_notes"
              name="default_quote_notes"
              defaultValue={initialSettings?.default_quote_notes ?? ''}
              placeholder="Enter default notes for new quotes (e.g., terms and conditions)"
              rows={4}
            />
            {state.fieldErrors?.default_quote_notes && <p className="text-sm text-red-500">{state.fieldErrors.default_quote_notes.join(', ')}</p>}
          </div>

          {/* Default Invoice Notes */}
          <div className="space-y-2">
            <Label htmlFor="default_invoice_notes">Default Invoice Notes</Label>
            <Textarea
              id="default_invoice_notes"
              name="default_invoice_notes"
              defaultValue={initialSettings?.default_invoice_notes ?? ''}
              placeholder="Enter default notes for new invoices (e.g., payment instructions summary)"
              rows={4}
            />
            {state.fieldErrors?.default_invoice_notes && <p className="text-sm text-red-500">{state.fieldErrors.default_invoice_notes.join(', ')}</p>}
          </div>
          
          <SubmitButton />
        </form>
      </CardContent>
    </Card>
  );
}

// This makes the component usable in app/settings/page.tsx via import
// If this file itself becomes a route segment, this export default might change.
export default DefaultsSettingsPage;
