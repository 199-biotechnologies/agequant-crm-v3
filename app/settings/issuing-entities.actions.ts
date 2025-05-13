'use server';

import { revalidatePath } from 'next/cache';
import { v4 as uuidv4 } from 'uuid';
import { getServerSupabaseClient } from '@/lib/supabase/server-client';
import {
  type ActionResponseState,
  type IssuingEntity,
  IssuingEntityFormSchema,
  type IssuingEntityFormData,
} from './types';
import { handleValidationError, handleDatabaseError } from '@/lib/utils/error-handler';

/**
 * Creates a new issuing entity
 *
 * @param formData - Form data for the issuing entity
 * @returns Success response with created data or error response
 */
export async function createIssuingEntity(
  formData: FormData
): Promise<ActionResponseState<IssuingEntity, typeof IssuingEntityFormSchema>> {
  const supabase = await getServerSupabaseClient();

  // Parse form data
  const rawFormData: { [key: string]: string | boolean | null } = {};
  let logoFile: File | null = null;
  formData.forEach((value, key) => {
    if (key === 'is_primary') rawFormData[key] = value === 'on';
    else if (key === 'logo_file' && value instanceof File && value.size > 0) logoFile = value;
    else if (key !== 'logo_file') rawFormData[key] = value;
  });
  if (logoFile && rawFormData.logo_url) delete rawFormData.logo_url;

  // Validate the data
  const validatedFields = IssuingEntityFormSchema.safeParse(rawFormData);
  if (!validatedFields.success) {
    return {
      success: false,
      ...handleValidationError(validatedFields.error, 'issuing entity')
    };
  }

  const formData_validated: IssuingEntityFormData = validatedFields.data;
  let finalLogoUrl = formData_validated.logo_url;
  let uploadedFilePath: string | null = null;

  try {
    // Handle logo file upload if provided
    if (logoFile) {
      const fileName = `${uuidv4()}-${logoFile.name}`;
      uploadedFilePath = `public/${fileName}`;
      const { error: uploadError } = await supabase
        .storage
        .from('entity-logos')
        .upload(uploadedFilePath, logoFile, { cacheControl: '3600', upsert: true });

      if (uploadError) {
        return {
          success: false,
          error: `Storage Error: ${uploadError.message}`
        };
      }

      const { data: publicUrlData } = supabase.storage.from('entity-logos').getPublicUrl(uploadedFilePath);
      finalLogoUrl = publicUrlData.publicUrl;
    }

    // If this is primary, unset other primary entities
    if (formData_validated.is_primary) {
      const { error: updateError } = await supabase
        .from('issuing_entities')
        .update({ is_primary: false })
        .eq('is_primary', true);

      if (updateError) {
        // Cleanup uploaded file if there was an error
        if (uploadedFilePath) {
          await supabase.storage.from('entity-logos').remove([uploadedFilePath]);
        }
        return {
          success: false,
          ...handleDatabaseError(updateError, 'update', 'issuing entity')
        };
      }
    }

    // Construct the object for insertion
    const dataToInsert: {
      entity_name: string;
      registration_number: string | null;
      address: string | null;
      website: string | null;
      email: string | null;
      phone: string | null;
      logo_url: string | null;
      is_primary: boolean;
    } = {
      entity_name: formData_validated.entity_name,
      registration_number: formData_validated.registration_number ?? null,
      address: formData_validated.address ?? null,
      website: formData_validated.website ?? null,
      email: formData_validated.email ?? null,
      phone: formData_validated.phone ?? null,
      logo_url: finalLogoUrl,
      is_primary: formData_validated.is_primary ?? false,
    };

    // Ensure null values for undefined fields
    (Object.keys(dataToInsert) as Array<keyof typeof dataToInsert>).forEach(key => {
      if (dataToInsert[key] === undefined) {
        dataToInsert[key] = null as unknown as typeof dataToInsert[typeof key];
      }
    });

    // Ensure boolean is not null
    dataToInsert.is_primary = dataToInsert.is_primary ?? false;

    // Insert the entity
    const { data, error: insertError } = await supabase
      .from('issuing_entities')
      .insert([dataToInsert])
      .select()
      .single();

    if (insertError) {
      // Cleanup uploaded file if there was an error
      if (uploadedFilePath) {
        await supabase.storage.from('entity-logos').remove([uploadedFilePath]);
      }
      return {
        success: false,
        ...handleDatabaseError(insertError, 'create', 'issuing entity')
      };
    }

    revalidatePath('/settings/entities');
    return { success: true, data: data ?? undefined };
  } catch (e: unknown) {
    // Cleanup uploaded file in case of unexpected error
    if (uploadedFilePath) {
      await supabase.storage.from('entity-logos').remove([uploadedFilePath]);
    }
    const errorMessage = e instanceof Error ? e.message : String(e);
    return {
      success: false,
      error: `An unexpected error occurred: ${errorMessage}`
    };
  }
}

/**
 * Retrieves all issuing entities
 *
 * @returns Array of issuing entities
 */
export async function getIssuingEntities(): Promise<IssuingEntity[]> {
  const supabase = await getServerSupabaseClient();

  const { data, error } = await supabase
    .from('issuing_entities')
    .select('*')
    .order('entity_name', { ascending: true });

  if (error) {
    console.error('Error fetching issuing entities:', error.message);
    return [];
  }

  return data || [];
}

/**
 * Retrieves an issuing entity by its ID
 *
 * @param id - Issuing entity ID
 * @returns Issuing entity or null if not found
 */
export async function getIssuingEntityById(id: string): Promise<IssuingEntity | null> {
  if (!id) return null;

  const supabase = await getServerSupabaseClient();

  const { data, error } = await supabase
    .from('issuing_entities')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error(`Error fetching issuing entity by ID (${id}):`, error.message);
    return null;
  }

  return data;
}

/**
 * Updates an existing issuing entity
 *
 * @param id - Issuing entity ID to update
 * @param formData - Form data with updated values
 * @returns Success response with updated data or error response
 */
export async function updateIssuingEntity(
  id: string,
  formData: FormData
): Promise<ActionResponseState<IssuingEntity, typeof IssuingEntityFormSchema>> {
  if (!id) {
    return {
      success: false,
      error: 'Issuing entity ID is required for an update.'
    };
  }

  const supabase = await getServerSupabaseClient();

  // Parse form data
  const rawFormData: { [key: string]: string | boolean | null } = {};
  let logoFile: File | null = null;
  formData.forEach((value, key) => {
    if (key === 'is_primary') rawFormData[key] = value === 'on';
    else if (key === 'logo_file' && value instanceof File && value.size > 0) logoFile = value;
    else if (key !== 'logo_file') rawFormData[key] = value;
  });
  if (logoFile && rawFormData.logo_url) delete rawFormData.logo_url;

  // Validate the data
  const validatedFields = IssuingEntityFormSchema.safeParse(rawFormData);
  if (!validatedFields.success) {
    return {
      success: false,
      ...handleValidationError(validatedFields.error, 'issuing entity')
    };
  }

  const formData_validated: IssuingEntityFormData = validatedFields.data;
  let finalLogoUrl = formData_validated.logo_url;
  let newUploadedFilePath: string | null = null;

  // Get current entity data for logo comparison
  const { data: currentEntityData } = await supabase
    .from('issuing_entities')
    .select('logo_url')
    .eq('id', id)
    .single();
  const oldLogoUrl = currentEntityData?.logo_url;

  try {
    // Handle logo file upload if provided
    if (logoFile) {
      const fileName = `${uuidv4()}-${logoFile.name}`;
      newUploadedFilePath = `public/${fileName}`;
      const { error: uploadError } = await supabase
        .storage
        .from('entity-logos')
        .upload(newUploadedFilePath, logoFile, { upsert: true });

      if (uploadError) {
        return {
          success: false,
          error: `Storage Error: ${uploadError.message}`
        };
      }

      const { data: publicUrlData } = supabase
        .storage
        .from('entity-logos')
        .getPublicUrl(newUploadedFilePath);
      finalLogoUrl = publicUrlData.publicUrl;

      // Clean up old logo if it's being replaced
      if (oldLogoUrl && oldLogoUrl !== finalLogoUrl) {
        const storagePathSegment = '/storage/v1/object/public/entity-logos/';
        const oldStoragePath = oldLogoUrl.includes(storagePathSegment)
          ? oldLogoUrl.substring(oldLogoUrl.indexOf(storagePathSegment) + storagePathSegment.length)
          : null;

        if (oldStoragePath && oldStoragePath !== newUploadedFilePath) {
          await supabase.storage.from('entity-logos').remove([oldStoragePath]);
        }
      }
    }

    // If this is primary, unset other primary entities
    if (formData_validated.is_primary) {
      const { error: unsetPrimaryError } = await supabase
        .from('issuing_entities')
        .update({ is_primary: false })
        .eq('is_primary', true)
        .neq('id', id);

      if (unsetPrimaryError) {
        return {
          success: false,
          ...handleDatabaseError(unsetPrimaryError, 'update', 'issuing entity')
        };
      }
    }

    // Construct the object for update
    const dataToUpdate: {
      entity_name: string;
      registration_number: string | null;
      address: string | null;
      website: string | null;
      email: string | null;
      phone: string | null;
      logo_url: string | null;
      is_primary: boolean;
    } = {
      entity_name: formData_validated.entity_name,
      registration_number: formData_validated.registration_number ?? null,
      address: formData_validated.address ?? null,
      website: formData_validated.website ?? null,
      email: formData_validated.email ?? null,
      phone: formData_validated.phone ?? null,
      logo_url: finalLogoUrl,
      is_primary: formData_validated.is_primary ?? false,
    };

    // Ensure null values for undefined fields
    (Object.keys(dataToUpdate) as Array<keyof typeof dataToUpdate>).forEach(key => {
      if (dataToUpdate[key] === undefined) {
        dataToUpdate[key] = null as unknown as typeof dataToUpdate[typeof key];
      }
    });

    // Ensure boolean is not null
    dataToUpdate.is_primary = dataToUpdate.is_primary ?? false;

    // Update the entity
    const { data, error: updateError } = await supabase
      .from('issuing_entities')
      .update(dataToUpdate)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return {
        success: false,
        ...handleDatabaseError(updateError, 'update', 'issuing entity')
      };
    }

    revalidatePath('/settings/entities');
    revalidatePath(`/settings/entities/${id}`);
    return { success: true, data: data ?? undefined };
  } catch (e: unknown) {
    // Clean up newly uploaded file in case of unexpected error
    if (newUploadedFilePath && finalLogoUrl && e instanceof Error && !e.message.includes('Database Error')) {
      await supabase.storage.from('entity-logos').remove([newUploadedFilePath]);
    }
    const errorMessage = e instanceof Error ? e.message : String(e);
    return {
      success: false,
      error: `An unexpected error occurred: ${errorMessage}`
    };
  }
}

/**
 * Deletes an issuing entity
 *
 * @param id - Issuing entity ID to delete
 * @returns Success response or error response
 */
export async function deleteIssuingEntity(id: string): Promise<{ success: boolean; error?: string }> {
  if (!id) {
    return {
      success: false,
      error: 'Issuing entity ID is required for deletion.'
    };
  }

  const supabase = await getServerSupabaseClient();

  // Get entity details to retrieve logo URL for cleanup after deletion
  const { data: entityToDelete, error: fetchError } = await supabase
    .from('issuing_entities')
    .select('logo_url')
    .eq('id', id)
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = not found
    console.error("Error fetching entity before deletion:", fetchError.message);
  }

  // Delete the entity from the database
  const { error: deleteDbError } = await supabase
    .from('issuing_entities')
    .delete()
    .eq('id', id);

  if (deleteDbError) {
    if (deleteDbError.code === '23503') {
      return {
        success: false,
        error: 'Cannot delete: entity is associated with payment sources.'
      };
    }

    const errorResponse = handleDatabaseError(deleteDbError, 'delete', 'issuing entity');
    return { success: false, error: errorResponse.error };
  }

  // Clean up logo file if it exists
  if (entityToDelete?.logo_url) {
    try {
      const storagePathSegment = '/storage/v1/object/public/entity-logos/';
      const logoPath = entityToDelete.logo_url.includes(storagePathSegment)
        ? entityToDelete.logo_url.substring(entityToDelete.logo_url.indexOf(storagePathSegment) + storagePathSegment.length)
        : null;

      if (logoPath) {
        await supabase.storage.from('entity-logos').remove([logoPath]);
      }
    } catch (storageError: unknown) {
      const errorMessage = storageError instanceof Error ? storageError.message : String(storageError);
      console.error("Error deleting logo from storage after entity deletion:", errorMessage);
      // We don't fail the overall operation because the entity deletion was successful
    }
  }

  revalidatePath('/settings/entities');
  return { success: true };
}
