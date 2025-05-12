'use client';

 import { useEffect, useState, useMemo } from 'react'; // Added useMemo
 import { getIssuingEntities, updateIssuingEntity, deleteIssuingEntity } from '@/app/settings/actions';
 import { type IssuingEntity } from '@/app/settings/types';
 import { Button } from '@/components/ui/button';
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
 import { DataTable } from "@/components/ui/data-table";
 import { getColumns } from "./issuing-entity-columns"; // Corrected import
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
import { IssuingEntityFormDialog } from '@/components/settings/issuing-entity-form-dialog'; // Import the dialog

export function EntitiesSettingsPage() {
  const [entities, setEntities] = useState<IssuingEntity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for delete confirmation
  const [isDeleting, setIsDeleting] = useState(false);
  const [entityToDelete, setEntityToDelete] = useState<IssuingEntity | null>(null);

  // State for Add/Edit dialog
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [editingEntity, setEditingEntity] = useState<IssuingEntity | null>(null);


  const fetchEntities = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const fetchedEntities = await getIssuingEntities();
      setEntities(fetchedEntities);
    } catch (e) {
      if (e instanceof Error) {
        setError(`Failed to load issuing entities: ${e.message}`);
      } else {
        setError('Failed to load issuing entities due to an unknown error.');
      }
      console.error(e);
      toast({ title: "Error", description: "Could not load issuing entities.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEntities();
  }, []);

  const handleSetPrimary = async (entityId: string) => {
    const entityToUpdate = entities.find(e => e.id === entityId);
    if (!entityToUpdate) return;

    // Create FormData for the updateIssuingEntity action
    const formData = new FormData();
    Object.entries(entityToUpdate).forEach(([key, value]) => {
      if (key === 'is_primary') {
        formData.append(key, 'on'); // 'on' will be converted to true by the action
      } else if (value !== null && value !== undefined) {
        formData.append(key, String(value));
      }
    });
    // Ensure is_primary is explicitly set
    if (!formData.has('is_primary')) {
        formData.append('is_primary', 'on');
    }


    const result = await updateIssuingEntity(entityId, formData);
    if (result.success) {
      toast({ title: "Success", description: `${entityToUpdate.entity_name} set as primary.` });
      fetchEntities(); // Re-fetch to update UI
    } else {
      toast({ title: "Error", description: result.error || "Could not set primary entity.", variant: "destructive" });
    }
  };

  const openDeleteConfirm = (entity: IssuingEntity) => {
    setEntityToDelete(entity);
  };

  const confirmDelete = async () => {
    if (!entityToDelete) return;
    setIsDeleting(true);
    const result = await deleteIssuingEntity(entityToDelete.id);
    if (result.success) {
      toast({ title: "Success", description: `${entityToDelete.entity_name} deleted.` });
      fetchEntities(); // Re-fetch
    } else {
      toast({ title: "Error", description: result.error || "Could not delete entity.", variant: "destructive" });
    }
    setIsDeleting(false);
    setEntityToDelete(null);
  };

  const handleEdit = (entity: IssuingEntity) => {
    setEditingEntity(entity);
    setIsFormDialogOpen(true);
  };

  const handleAddNew = () => {
    setEditingEntity(null); // Clear any previously editing entity
    setIsFormDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsFormDialogOpen(false);
    setEditingEntity(null); // Clear editing state
  };

  const handleSuccess = () => {
    fetchEntities(); // Re-fetch data on successful save
    handleDialogClose();
  };
  
  // Pass the actual handlers to getColumns
  const columns = useMemo(
    () => getColumns({ 
      handleSetPrimary, 
      handleEdit, // This is the page's handleEdit
      openDeleteConfirm // This is the page's openDeleteConfirm
    }), 
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entities] // Re-memoize if entities change, handlers have stable refs
  );


  // Removed old TODO comments for dialog state as it's now implemented above

  if (error && !isLoading) { // Show error only if not loading, to prevent flash of error during initial load
    return <p className="text-red-500 p-4">{error}</p>;
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Issuing Entities</CardTitle>
            <CardDescription>
              Manage the legal entities that can issue invoices and quotes.
            </CardDescription>
          </div>
          <Button onClick={handleAddNew}>
            Add New Entity
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Loading issuing entities...</p> // Show loading indicator within the card content
          ) : (
            <DataTable columns={columns} data={entities} />
          )}
          {!isLoading && !error && entities.length === 0 && (
             <p className="text-center text-muted-foreground py-4">No issuing entities found. Click &quot;Add New Entity&quot; to create one.</p>
           )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!entityToDelete} onOpenChange={(open) => !open && setEntityToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the issuing entity
              &quot;{entityToDelete?.entity_name}&quot;.
              Associated payment sources might also be affected or prevent deletion if linked.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setEntityToDelete(null)} disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={isDeleting} className="bg-red-600 hover:bg-red-700">
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <IssuingEntityFormDialog
        isOpen={isFormDialogOpen}
        onClose={handleDialogClose}
        entity={editingEntity}
        onSuccess={handleSuccess}
      />
    </>
  );
}

export default EntitiesSettingsPage;
