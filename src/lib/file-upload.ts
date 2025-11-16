import { supabaseAdmin, supabase } from '@/lib/supabase';

export interface UploadResult {
  success: boolean;
  url?: string;
  fileName?: string;
  error?: string;
}

/**
 * Upload Purchase Invoice file to Supabase Storage
 */
export async function uploadPurchaseInvoice(
  file: File,
  contractorId: string,
  materialId: string
): Promise<UploadResult> {
  try {
    // Validate file
    if (!file) {
      return { success: false, error: 'No file provided' };
    }

    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      return { success: false, error: 'File size must be less than 10MB' };
    }

    // Check file type
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/webp'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      return { 
        success: false, 
        error: 'Only PDF, JPG, PNG, and WebP files are allowed' 
      };
    }

    // Generate unique filename with organized folder structure
    const timestamp = Date.now();
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    const fileName = `pi-${timestamp}.${fileExt}`;
    const filePath = `${contractorId}/purchase-invoices/${materialId}/${fileName}`;

    // Upload to existing contractor-documents storage bucket
    const { data, error: uploadError } = await supabaseAdmin.storage
      .from('contractor-documents')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false // Don't overwrite existing files
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return { 
        success: false, 
        error: `Upload failed: ${uploadError.message}` 
      };
    }

    // Get the file URL from contractor-documents bucket
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('contractor-documents')
      .getPublicUrl(filePath);

    return {
      success: true,
      url: publicUrl,
      fileName: fileName
    };

  } catch (error) {
    console.error('File upload error:', error);
    return {
      success: false,
      error: 'Unexpected error during file upload'
    };
  }
}

/**
 * Generate signed URL for private file access (for admin dashboard)
 */
export async function getPurchaseInvoiceSignedUrl(
  filePath: string,
  expiresIn: number = 3600 // 1 hour
): Promise<UploadResult> {
  try {
    const { data, error } = await supabaseAdmin.storage
      .from('contractor-documents')
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      return { 
        success: false, 
        error: `Failed to generate signed URL: ${error.message}` 
      };
    }

    return {
      success: true,
      url: data.signedUrl
    };
  } catch (error) {
    console.error('Signed URL error:', error);
    return {
      success: false,
      error: 'Failed to generate file access URL'
    };
  }
}

/**
 * Delete Purchase Invoice file
 */
export async function deletePurchaseInvoice(filePath: string): Promise<UploadResult> {
  try {
    const { error } = await supabaseAdmin.storage
      .from('contractor-documents')
      .remove([filePath]);

    if (error) {
      return { 
        success: false, 
        error: `Failed to delete file: ${error.message}` 
      };
    }

    return { success: true };
  } catch (error) {
    console.error('File deletion error:', error);
    return {
      success: false,
      error: 'Failed to delete file'
    };
  }
}

/**
 * Extract file path from storage URL for operations
 */
export function extractFilePathFromUrl(url: string): string {
  // Extract path from Supabase storage URL for contractor-documents bucket
  const match = url.match(/\/storage\/v1\/object\/public\/contractor-documents\/(.+)/);
  return match ? match[1] : url;
}