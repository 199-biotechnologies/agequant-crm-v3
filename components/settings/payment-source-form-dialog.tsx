'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { type PaymentSource, PaymentSourceFormSchema, type IssuingEntity } from '@/app/settings/types';
import { createPaymentSource, updatePaymentSource, getIssuingEntities } from '@/app/settings/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { ALLOWED_CURRENCIES } from '@/app/settings/types'; // For currency dropdown

interface PaymentSourceFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  source?: PaymentSource | null;
  onSuccess: () => void;
}

// Ensure z is imported for z.infer
import { z } from 'zod';

type PaymentSourceFormData = z.infer<typeof PaymentSourceFormSchema>;

export function PaymentSourceFormDialog({
  isOpen,
  onClose,
  source,
  onSuccess,
}: PaymentSourceFormDialogProps) {
  const [issuingEntities, setIssuingEntities] = useState<IssuingEntity[]>([]);

  const form = useForm<PaymentSourceFormData>({
    resolver: zodResolver(PaymentSourceFormSchema),
    defaultValues: {
      name: '',
      // Ensure currency_code default is one of the allowed values or undefined if the schema allows.
      // If currency_code is required, it must be a valid one.
      currency_code: ALLOWED_CURRENCIES.length > 0 ? ALLOWED_CURRENCIES[0] : undefined,
      issuing_entity_id: '',
      bank_name: '',
      account_holder_name: '',
      account_number: '',
      iban: '',
      swift_bic: '',
      routing_number_us: '',
      sort_code_uk: '',
      additional_details: '',
      is_primary_for_entity: false,
    },
  });

  useEffect(() => {
    async function fetchEntities() {
      try {
        const entities = await getIssuingEntities();
        setIssuingEntities(entities);
      } catch (error) {
        console.error("Failed to fetch issuing entities for dialog:", error);
        toast({ title: "Error", description: "Could not load issuing entities.", variant: "destructive" });
      }
    }
    if (isOpen) { // Fetch only when dialog is open
      fetchEntities();
    }
  }, [isOpen]);

  useEffect(() => {
    if (source) {
      form.reset({
        name: source.name || '',
        currency_code: source.currency_code || '',
        issuing_entity_id: source.issuing_entity_id || '',
        bank_name: source.bank_name || '',
        account_holder_name: source.account_holder_name || '',
        account_number: source.account_number || '',
        iban: source.iban || '',
        swift_bic: source.swift_bic || '',
        routing_number_us: source.routing_number_us || '',
        sort_code_uk: source.sort_code_uk || '',
        additional_details: source.additional_details || '',
        is_primary_for_entity: source.is_primary_for_entity || false,
      });
    } else {
      form.reset({ // Default for new source
        name: '',
        currency_code: ALLOWED_CURRENCIES.length > 0 ? ALLOWED_CURRENCIES[0] : undefined,
        issuing_entity_id: issuingEntities.find(e => e.is_primary)?.id || issuingEntities[0]?.id || '',
        bank_name: '',
        account_holder_name: '',
        account_number: '',
        iban: '',
        swift_bic: '',
        routing_number_us: '',
        sort_code_uk: '',
        additional_details: '',
        is_primary_for_entity: false,
      });
    }
  }, [source, form, isOpen, issuingEntities]);

  const onSubmit = async (data: PaymentSourceFormData) => {
    const formData = new FormData();
    Object.keys(data).forEach((key) => {
        const K = key as keyof PaymentSourceFormData;
        const value = data[K];
        if (K === 'is_primary_for_entity') {
            formData.append(K, value ? 'on' : '');
        } else if (value !== null && value !== undefined) {
            // Ensure the key used for append is a string.
            // While Object.keys returns strings, being explicit can satisfy stricter TS checks.
            formData.append(String(K), String(value));
        }
    });
    // Ensure issuing_entity_id is appended if not already (e.g. if it was part of defaultValues but not changed)
    if (!formData.has('issuing_entity_id') && data.issuing_entity_id) {
        formData.append('issuing_entity_id', data.issuing_entity_id);
    }


    let result;
    if (source?.id) {
      result = await updatePaymentSource(source.id, formData);
    } else {
      result = await createPaymentSource(formData);
    }

    if (result.success) {
      toast({ title: 'Success', description: `Payment source ${source?.id ? 'updated' : 'created'} successfully.` });
      onSuccess();
      onClose();
    } else {
      toast({
        title: 'Error',
        description: result.error || `Failed to ${source?.id ? 'update' : 'create'} payment source.`,
        variant: 'destructive',
      });
      if (result.fieldErrors) {
        Object.entries(result.fieldErrors).forEach(([field, errors]) => {
          if (errors && errors.length > 0) {
            form.setError(field as keyof PaymentSourceFormData, {
              type: 'server',
              message: errors.join(', '),
            });
          }
        });
      }
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl"> {/* Wider dialog for more fields */}
        <DialogHeader>
          <DialogTitle>{source?.id ? 'Edit' : 'Add New'} Payment Source</DialogTitle>
          <DialogDescription>
            {source?.id ? 'Update the details of this payment source.' : 'Provide details for the new payment source.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Source Name <span className="text-red-500">*</span></FormLabel>
                  <FormControl><Input placeholder="e.g., Main Business Account" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="issuing_entity_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Issuing Entity <span className="text-red-500">*</span></FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select entity" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {issuingEntities.map((entity) => (
                          <SelectItem key={entity.id} value={entity.id}>
                            {entity.entity_name}
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
                name="currency_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency <span className="text-red-500">*</span></FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select currency" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {ALLOWED_CURRENCIES.map((currency) => (
                          <SelectItem key={currency} value={currency}>
                            {currency}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="bank_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bank Name</FormLabel>
                  <FormControl><Input placeholder="e.g., Global Bank Corp" {...field} value={field.value ?? ''} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="account_holder_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Holder Name</FormLabel>
                  <FormControl><Input placeholder="e.g., Your Company LLC" {...field} value={field.value ?? ''} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="account_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Number</FormLabel>
                    <FormControl><Input placeholder="Primary account identifier" {...field} value={field.value ?? ''} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="iban"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>IBAN</FormLabel>
                    <FormControl><Input placeholder="International Bank Account Number" {...field} value={field.value ?? ''} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="swift_bic"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SWIFT/BIC</FormLabel>
                    <FormControl><Input placeholder="SWIFT or BIC code" {...field} value={field.value ?? ''} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="routing_number_us"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Routing Number (US)</FormLabel>
                    <FormControl><Input placeholder="For US Banks" {...field} value={field.value ?? ''} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sort_code_uk"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sort Code (UK)</FormLabel>
                    <FormControl><Input placeholder="For UK Banks" {...field} value={field.value ?? ''} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="additional_details"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Details</FormLabel>
                  <FormControl><Textarea placeholder="Any other relevant payment information" {...field} value={field.value ?? ''} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="is_primary_for_entity"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Set as Primary Source (for selected entity)
                    </FormLabel>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (source?.id ? 'Saving...' : 'Creating...') : (source?.id ? 'Save Changes' : 'Create Source')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
