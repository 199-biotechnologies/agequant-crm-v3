'use client';

 import { useEffect, useState, useMemo } from 'react'; // Added useMemo
 import { getPaymentSources, updatePaymentSource, deletePaymentSource } from '@/app/settings/actions';
 import { type PaymentSource } from '@/app/settings/types';
 import { Button } from '@/components/ui/button';
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
 import { DataTable } from "@/components/ui/data-table";
 import { getColumns } from "./payment-source-columns"; // Corrected import
 import { toast } from '@/components/ui/use-toast';
 import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PaymentSourceFormDialog } from '@/components/settings/payment-source-form-dialog'; // Import the dialog


export function PaymentSourcesSettingsPage() {
  const [sources, setSources] = useState<PaymentSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for delete confirmation
  const [isDeleting, setIsDeleting] = useState(false);
  const [sourceToDelete, setSourceToDelete] = useState<PaymentSource | null>(null);

  // State for Add/Edit dialog
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<PaymentSource | null>(null);

  const fetchSources = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // TODO: Potentially filter by a selected entity if UI allows
      const fetchedSources = await getPaymentSources();
      setSources(fetchedSources);
    } catch (e) {
      if (e instanceof Error) {
        setError(`Failed to load payment sources: ${e.message}`);
      } else {
        setError('Failed to load payment sources due to an unknown error.');
      }
      console.error(e);
      toast({ title: "Error", description: "Could not load payment sources.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSources();
  }, []);

  const handleSetPrimary = async (sourceId: string, _entityId: string) => {
    const sourceToUpdate = sources.find(s => s.id === sourceId);
    if (!sourceToUpdate) return;

    const formData = new FormData();
    Object.entries(sourceToUpdate).forEach(([key, value]) => {
      if (key === 'is_primary_for_entity') {
        formData.append(key, 'on');
      } else if (value !== null && value !== undefined) {
        formData.append(key, String(value));
      }
    });
     if (!formData.has('is_primary_for_entity')) {
        formData.append('is_primary_for_entity', 'on');
    }
    // Ensure issuing_entity_id is present as it's part of the schema and might be needed by action
    if (!formData.has('issuing_entity_id') && sourceToUpdate.issuing_entity_id) {
        formData.append('issuing_entity_id', sourceToUpdate.issuing_entity_id);
    }


    const result = await updatePaymentSource(sourceId, formData);
    if (result.success) {
      toast({ title: "Success", description: `${sourceToUpdate.name} set as primary for its entity.` });
      fetchSources();
    } else {
      toast({ title: "Error", description: result.error || "Could not set primary source.", variant: "destructive" });
    }
  };

  const openDeleteConfirm = (source: PaymentSource) => {
    setSourceToDelete(source);
  };

  const confirmDelete = async () => {
    if (!sourceToDelete) return;
    setIsDeleting(true);
    const result = await deletePaymentSource(sourceToDelete.id);
    if (result.success) {
      toast({ title: "Success", description: `${sourceToDelete.name} deleted.` });
      fetchSources();
    } else {
      toast({ title: "Error", description: result.error || "Could not delete source.", variant: "destructive" });
    }
    setIsDeleting(false);
    setSourceToDelete(null);
  };

  const handleEdit = (source: PaymentSource) => {
    setEditingSource(source);
    setIsFormDialogOpen(true);
  };

  const handleAddNew = () => {
    setEditingSource(null);
    setIsFormDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsFormDialogOpen(false);
    setEditingSource(null);
  };

  const handleSuccess = () => {
    fetchSources(); // Re-fetch data
    handleDialogClose();
  };

  const columns = useMemo(
    () => getColumns({ handleSetPrimary, handleEdit, openDeleteConfirm }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sources] // Re-memoize if sources change
  );

  // Removed old TODO comments for dialog state

  if (error && !isLoading) {
    return <p className="text-red-500 p-4">{error}</p>;
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Payment Sources</CardTitle>
            <CardDescription>
              Manage bank accounts and other payment methods for your issuing entities.
            </CardDescription>
          </div>
          <Button onClick={handleAddNew}>
            Add New Source
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Loading payment sources...</p> // Show loading indicator within the card content
          ) : (
            <DataTable columns={columns} data={sources} />
          )}
          {!isLoading && !error && sources.length === 0 && (
             <p className="text-center text-muted-foreground py-4">No payment sources found. Click &quot;Add New Source&quot; to create one.</p>
           )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!sourceToDelete} onOpenChange={(open) => !open && setSourceToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the payment source
              &quot;{sourceToDelete?.name}&quot;.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSourceToDelete(null)} disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={isDeleting} className="bg-red-600 hover:bg-red-700">
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PaymentSourceFormDialog
        isOpen={isFormDialogOpen}
        onClose={handleDialogClose}
        source={editingSource}
        onSuccess={handleSuccess}
      />
    </>
  );
}

export default PaymentSourcesSettingsPage;
