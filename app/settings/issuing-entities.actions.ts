'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { v4 as uuidv4 } from 'uuid';
import { getSupabaseClient } from './app-settings.actions'; // Import the shared client
import {
  type ActionResponseState,
  type IssuingEntity,
  IssuingEntityFormSchema,
  type IssuingEntityFormData, // Added import
} from './types';

export async function createIssuingEntity(
  formData: FormData
): Promise<ActionResponseState<IssuingEntity, typeof IssuingEntityFormSchema>> {
  const cookieStore = cookies();
  const supabase = getSupabaseClient(cookieStore);

  const rawFormData: { [key: string]: string | boolean | null } = {};
  let logoFile: File | null = null;
  formData.forEach((value, key) => {
    if (key === 'is_primary') rawFormData[key] = value === 'on';
    else if (key === 'logo_file' && value instanceof File && value.size > 0) logoFile = value;
    else if (key !== 'logo_file') rawFormData[key] = value;
  });
  if (logoFile && rawFormData.logo_url) delete rawFormData.logo_url;

  const validatedFields = IssuingEntityFormSchema.safeParse(rawFormData);
  if (!validatedFields.success) {
    return { success: false, error: 'Invalid data provided.', fieldErrors: validatedFields.error.flatten().fieldErrors };
  }

  const D: IssuingEntityFormData = validatedFields.data; // Explicitly type D
  let finalLogoUrl = D.logo_url; 
  let uploadedFilePath: string | null = null;

  try {
    if (logoFile) {
      const fileName = `${uuidv4()}-${logoFile.name}`;
      uploadedFilePath = `public/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('entity-logos').upload(uploadedFilePath, logoFile, { cacheControl: '3600', upsert: true });
      if (uploadError) return { success: false, error: `Storage Error: ${uploadError.message}` };
      const { data: publicUrlData } = supabase.storage.from('entity-logos').getPublicUrl(uploadedFilePath);
      finalLogoUrl = publicUrlData.publicUrl;
    }

    if (D.is_primary) { // Use D.is_primary
      const { error: updateError } = await supabase.from('issuing_entities').update({ is_primary: false }).eq('is_primary', true);
      if (updateError) {
        if (uploadedFilePath) await supabase.storage.from('entity-logos').remove([uploadedFilePath]);
        return { success: false, error: `Database Error: ${updateError.message}` };
       }
     }

     // Construct the object for insertion carefully, ensuring all optional fields are explicitly null if not provided
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
        entity_name: D.entity_name, // If D is 'never', this is where the error "Property 'name' does not exist on type 'never'" would manifest
        registration_number: D.registration_number ?? null,
        address: D.address ?? null,
        website: D.website ?? null,
        email: D.email ?? null,
        phone: D.phone ?? null,
        logo_url: finalLogoUrl,
        is_primary: D.is_primary ?? false,
     };
     // Ensure any field that ended up undefined (because Zod optional fields can be undefined) becomes null
     (Object.keys(dataToInsert) as Array<keyof typeof dataToInsert>).forEach(key => {
        if (dataToInsert[key] === undefined) {
            dataToInsert[key] = null as unknown as typeof dataToInsert[typeof key]; // Type cast for properties that might not accept null
        }
     });
     // Specifically ensure boolean is not null
     dataToInsert.is_primary = dataToInsert.is_primary ?? false;


     const { data, error: insertError } = await supabase.from('issuing_entities').insert([dataToInsert]).select().single();
    if (insertError) {
        if (uploadedFilePath) await supabase.storage.from('entity-logos').remove([uploadedFilePath]);
        return { success: false, error: `Database Error: ${insertError.message}` };
    }
    revalidatePath('/settings/entities');
    return { success: true, data: data ?? undefined };
  } catch (e: unknown) {
    if (uploadedFilePath) await supabase.storage.from('entity-logos').remove([uploadedFilePath]);
    const errorMessage = e instanceof Error ? e.message : String(e);
    return { success: false, error: `An unexpected error occurred: ${errorMessage}` };
  }
}

export async function getIssuingEntities(): Promise<IssuingEntity[]> {
  const cookieStore = cookies();
  const supabase = getSupabaseClient(cookieStore);
  const { data, error } = await supabase.from('issuing_entities').select('*').order('entity_name', { ascending: true });
  if (error) { console.error('Error fetching issuing entities:', error.message); return []; }
  return data || [];
}

export async function getIssuingEntityById(id: string): Promise<IssuingEntity | null> {
  if (!id) return null;
  const cookieStore = cookies();
  const supabase = getSupabaseClient(cookieStore);
  const { data, error } = await supabase.from('issuing_entities').select('*').eq('id', id).single();
  if (error) { console.error(`Error fetching issuing entity by ID (${id}):`, error.message); return null; }
  return data;
}

export async function updateIssuingEntity(
  id: string,
  formData: FormData
): Promise<ActionResponseState<IssuingEntity, typeof IssuingEntityFormSchema>> {
  if (!id) return { success: false, error: 'Issuing entity ID is required for an update.' };
  const cookieStore = cookies();
  const supabase = getSupabaseClient(cookieStore);

  const rawFormData: { [key: string]: string | boolean | null } = {};
  let logoFile: File | null = null;
  formData.forEach((value, key) => {
    if (key === 'is_primary') rawFormData[key] = value === 'on';
    else if (key === 'logo_file' && value instanceof File && value.size > 0) logoFile = value;
    else if (key !== 'logo_file') rawFormData[key] = value;
  });
  if (logoFile && rawFormData.logo_url) delete rawFormData.logo_url; 

  const validatedFields = IssuingEntityFormSchema.safeParse(rawFormData);
  if (!validatedFields.success) {
    return { success: false, error: 'Invalid data provided.', fieldErrors: validatedFields.error.flatten().fieldErrors };
  }

  const D_update: IssuingEntityFormData = validatedFields.data; // Explicitly type D_update
  let finalLogoUrl = D_update.logo_url; 
  let newUploadedFilePath: string | null = null;

  const { data: currentEntityData } = await supabase.from('issuing_entities').select('logo_url').eq('id', id).single();
  const oldLogoUrl = currentEntityData?.logo_url;

  try {
    if (logoFile) {
      const fileName = `${uuidv4()}-${logoFile.name}`;
      newUploadedFilePath = `public/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('entity-logos').upload(newUploadedFilePath, logoFile, { upsert: true });
      if (uploadError) return { success: false, error: `Storage Error: ${uploadError.message}` };
      const { data: publicUrlData } = supabase.storage.from('entity-logos').getPublicUrl(newUploadedFilePath);
      finalLogoUrl = publicUrlData.publicUrl;

      if (oldLogoUrl && oldLogoUrl !== finalLogoUrl) {
        const storagePathSegment = '/storage/v1/object/public/entity-logos/';
        const oldStoragePath = oldLogoUrl.includes(storagePathSegment) ? oldLogoUrl.substring(oldLogoUrl.indexOf(storagePathSegment) + storagePathSegment.length) : null;
        if (oldStoragePath && oldStoragePath !== newUploadedFilePath) {
            await supabase.storage.from('entity-logos').remove([oldStoragePath]);
        }
      }
    }

    if (D_update.is_primary) { // Use D_update.is_primary
      const { error: unsetPrimaryError } = await supabase.from('issuing_entities').update({ is_primary: false }).eq('is_primary', true).neq('id', id);
      if (unsetPrimaryError) return { success: false, error: `Database Error: ${unsetPrimaryError.message}` };
     }
    
    
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
        entity_name: D_update.entity_name,
        registration_number: D_update.registration_number ?? null,
        address: D_update.address ?? null,
        website: D_update.website ?? null,
        email: D_update.email ?? null,
        phone: D_update.phone ?? null,
        logo_url: finalLogoUrl,
        is_primary: D_update.is_primary ?? false,
    };
    (Object.keys(dataToUpdate) as Array<keyof typeof dataToUpdate>).forEach(key => {
        if (dataToUpdate[key] === undefined) {
            dataToUpdate[key] = null as unknown as typeof dataToUpdate[typeof key];
        }
    });
    dataToUpdate.is_primary = dataToUpdate.is_primary ?? false;

    const { data, error: updateError } = await supabase.from('issuing_entities').update(dataToUpdate).eq('id', id).select().single();
    if (updateError) return { success: false, error: `Database Error: ${updateError.message}` };
    revalidatePath('/settings/entities');
    revalidatePath(`/settings/entities/${id}`);
    return { success: true, data: data ?? undefined };
  } catch (e: unknown) {
    if (newUploadedFilePath && finalLogoUrl && e instanceof Error && !e.message.includes('Database Error')) {
       await supabase.storage.from('entity-logos').remove([newUploadedFilePath]);
    }
    const errorMessage = e instanceof Error ? e.message : String(e);
    return { success: false, error: `An unexpected error occurred: ${errorMessage}` };
  }
}

export async function deleteIssuingEntity(id: string): Promise<{ success: boolean; error?: string }> {
  if (!id) return { success: false, error: 'Issuing entity ID is required for deletion.' };
  const cookieStore = cookies();
  const supabase = getSupabaseClient(cookieStore);

  const { data: entityToDelete, error: fetchError } = await supabase.from('issuing_entities').select('logo_url').eq('id', id).single();
  if (fetchError && fetchError.code !== 'PGRST116') {
    console.error("Error fetching entity before deletion:", fetchError.message);
  }

  const { error: deleteDbError } = await supabase.from('issuing_entities').delete().eq('id', id);
  if (deleteDbError) {
    if (deleteDbError.code === '23503') return { success: false, error: 'Cannot delete: entity is associated with payment sources.' };
    return { success: false, error: `Database Error: ${deleteDbError.message}` };
  }

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
    }
  }
  revalidatePath('/settings/entities');
  return { success: true };
}
