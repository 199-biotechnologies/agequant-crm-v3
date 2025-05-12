'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { type IssuingEntity, IssuingEntityFormSchema } from '@/app/settings/types';
import { createIssuingEntity, updateIssuingEntity } from '@/app/settings/actions';
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
  FormDescription, // Added FormDescription
} from '@/components/ui/form';
import { toast } from '@/components/ui/use-toast';
import { z } from 'zod'; // Import z

interface IssuingEntityFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  entity?: IssuingEntity | null;
  onSuccess: () => void; // Callback to refresh data on parent page
}

type IssuingEntityFormData = z.infer<typeof IssuingEntityFormSchema>;

// Add a type for the form data including the optional logo_file
type DialogFormData = IssuingEntityFormData & {
  logo_file?: FileList | null;
};

export function IssuingEntityFormDialog({
  isOpen,
  onClose,
  entity,
  onSuccess,
}: IssuingEntityFormDialogProps) {
  const form = useForm<DialogFormData>({ // Use the extended DialogFormData
    resolver: zodResolver(IssuingEntityFormSchema), // Schema still validates the core fields
    defaultValues: {
      entity_name: '',
      registration_number: '',
      address: '',
      website: '',
      email: '',
      phone: '',
      logo_url: '', // Will be handled later
      is_primary: false,
    },
  });

  useEffect(() => {
    if (entity) {
      form.reset({
        entity_name: entity.entity_name || '',
        registration_number: entity.registration_number || '',
        address: entity.address || '',
        website: entity.website || '',
        email: entity.email || '',
        phone: entity.phone || '',
        logo_url: entity.logo_url || '',
        is_primary: entity.is_primary || false,
      });
    } else {
      form.reset({ // Default for new entity
        entity_name: '',
        registration_number: '',
        address: '',
        website: '',
        email: '',
        phone: '',
        logo_url: '',
        is_primary: false,
      });
    }
  }, [entity, form, isOpen]); // Reset form when dialog opens or entity changes

  const onSubmit = async (data: DialogFormData) => { // Use DialogFormData
    const formData = new FormData();
    
    // Append all fields from IssuingEntityFormData (excluding logo_file)
    const entityData = IssuingEntityFormSchema.parse(data); // Validate and get core fields
    Object.keys(entityData).forEach((keyString) => {
        const key = keyString as keyof IssuingEntityFormData;
        const value = entityData[key];
        if (key === 'is_primary') {
            formData.append(key, value ? 'on' : '');
        } else if (key === 'logo_url' && data.logo_file?.[0]) {
            // If a new logo_file is present, we might skip appending the old logo_url,
            // or let the server action decide. For now, we'll let server action handle it.
            // If no new file, and logo_url exists, append it.
             if (value) formData.append(key, String(value));
        } else if (value !== null && value !== undefined) {
            formData.append(String(key), String(value)); // Ensure key is string for formData
        }
    });

    // Append the logo file if it exists
    if (data.logo_file && data.logo_file.length > 0) {
      formData.append('logo_file', data.logo_file[0]);
    }

    let result;
    if (entity?.id) {
      result = await updateIssuingEntity(entity.id, formData);
    } else {
      result = await createIssuingEntity(formData);
    }

    if (result.success) {
      toast({ title: 'Success', description: `Issuing entity ${entity?.id ? 'updated' : 'created'} successfully.` });
      onSuccess(); // Call parent's success handler (e.g., refetch data)
      onClose(); // Close dialog
    } else {
      toast({
        title: 'Error',
        description: result.error || `Failed to ${entity?.id ? 'update' : 'create'} issuing entity.`,
        variant: 'destructive',
      });
      if (result.fieldErrors) {
        Object.entries(result.fieldErrors).forEach(([field, errors]) => {
          if (errors && errors.length > 0) {
            form.setError(field as keyof IssuingEntityFormData, {
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
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{entity?.id ? 'Edit' : 'Add New'} Issuing Entity</DialogTitle>
          <DialogDescription>
            {entity?.id ? 'Update the details of this issuing entity.' : 'Provide details for the new issuing entity.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <FormField
              control={form.control}
              name="entity_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Entity Name <span className="text-red-500">*</span></FormLabel>
                  <FormControl><Input placeholder="e.g., Your Company LLC" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl><Input type="email" placeholder="contact@example.com" {...field} value={field.value ?? ''} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl><Input placeholder="+1 123 456 7890" {...field} value={field.value ?? ''} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl><Textarea placeholder="123 Main St, Anytown, USA" {...field} value={field.value ?? ''} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website</FormLabel>
                    <FormControl><Input placeholder="https://example.com" {...field} value={field.value ?? ''} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="registration_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Registration Number</FormLabel>
                    <FormControl><Input placeholder="Company Reg. No." {...field} value={field.value ?? ''} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="logo_file" // This is for the FileInput, not directly in Zod schema
              render={({ field: { onChange, ...restField } }) => ( // field.value will be FileList
                <FormItem>
                  <FormLabel>Logo</FormLabel>
                  <FormControl>
                    <Input
                      type="file"
                      accept="image/png, image/jpeg, image/svg+xml"
                      onChange={(e) => onChange(e.target.files)}
                      {...restField}
                    />
                  </FormControl>
                  <FormDescription>
                    Upload a logo (PNG, JPG, SVG). Current: {form.getValues('logo_url') || 'None'}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_primary"
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
                      Set as Primary Entity
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
                {form.formState.isSubmitting ? (entity?.id ? 'Saving...' : 'Creating...') : (entity?.id ? 'Save Changes' : 'Create Entity')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
