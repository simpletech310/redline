import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lguqssoghrjlpsccauhl.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const BUCKET_NAME = 'redline';

/**
 * Upload a file to Supabase storage
 * @param file - The file to upload
 * @param folder - The folder within the bucket (e.g., 'posts', 'avatars')
 * @returns The public URL of the uploaded file
 */
export async function uploadFile(
  file: File,
  folder: string = 'posts'
): Promise<{ url: string; error: string | null }> {
  try {
    // Generate unique filename
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'bin';
    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;

    // Upload to Supabase
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Upload error:', error);
      return { url: '', error: error.message };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(data.path);

    return { url: urlData.publicUrl, error: null };
  } catch (err: any) {
    console.error('Upload exception:', err);
    return { url: '', error: err.message || 'Upload failed' };
  }
}

/**
 * Delete a file from Supabase storage
 * @param url - The public URL of the file
 */
export async function deleteFile(url: string): Promise<boolean> {
  try {
    // Extract path from URL
    const urlObj = new URL(url);
    const path = urlObj.pathname.split(`/storage/v1/object/public/${BUCKET_NAME}/`)[1];

    if (!path) return false;

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([path]);

    return !error;
  } catch {
    return false;
  }
}

/**
 * Get media type from file
 */
export function getMediaType(file: File): 'image' | 'video' | null {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  return null;
}

/**
 * Validate file size and type
 */
export function validateMediaFile(file: File): { valid: boolean; error: string | null } {
  const maxImageSize = 10 * 1024 * 1024; // 10MB for images
  const maxVideoSize = 100 * 1024 * 1024; // 100MB for videos

  const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/quicktime'];

  const mediaType = getMediaType(file);

  if (!mediaType) {
    return { valid: false, error: 'File type not supported. Use images or videos.' };
  }

  if (mediaType === 'image') {
    if (!allowedImageTypes.includes(file.type)) {
      return { valid: false, error: 'Image type not supported. Use JPEG, PNG, GIF, or WebP.' };
    }
    if (file.size > maxImageSize) {
      return { valid: false, error: 'Image too large. Max 10MB.' };
    }
  }

  if (mediaType === 'video') {
    if (!allowedVideoTypes.includes(file.type)) {
      return { valid: false, error: 'Video type not supported. Use MP4, WebM, or MOV.' };
    }
    if (file.size > maxVideoSize) {
      return { valid: false, error: 'Video too large. Max 100MB.' };
    }
  }

  return { valid: true, error: null };
}
