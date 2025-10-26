import { supabase, supabaseAdmin } from './supabase'

export type DocumentType = 'pan_card' | 'gst_certificate' | 'company_registration' | 'cancelled_cheque'

export interface DocumentUploadResult {
  success: boolean
  fileUrl?: string
  error?: string
}

export interface DocumentStatus {
  uploaded: boolean
  verified: boolean
  file_url: string | null
  file_name: string | null
  uploaded_at: string | null
  verified_at: string | null
  rejection_reason: string | null
}

export class DocumentService {
  
  // Upload document to Supabase Storage
  static async uploadDocument(
    contractorId: string,
    documentType: DocumentType,
    file: File
  ): Promise<DocumentUploadResult> {
    try {
      // Validate file type and size
      const validation = this.validateFile(file, documentType)
      if (!validation.valid) {
        return { success: false, error: validation.error }
      }

      // Create unique file path
      const fileExtension = file.name.split('.').pop()
      const fileName = `${contractorId}/${documentType}_${Date.now()}.${fileExtension}`
      
      // Upload to Supabase Storage using admin client
      const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
        .from('contractor-documents')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        console.error('Document upload error:', uploadError)
        return { success: false, error: uploadError.message }
      }

      // Store file path instead of URL for private bucket
      const filePath = fileName

      // Update contractor documents metadata
      const updateResult = await this.updateDocumentMetadata(
        contractorId,
        documentType,
        {
          uploaded: true,
          verified: false,
          file_url: filePath, // Store path, not URL
          file_name: file.name,
          uploaded_at: new Date().toISOString(),
          verified_at: null,
          rejection_reason: null
        }
      )

      if (!updateResult.success) {
        // Clean up uploaded file if metadata update fails
        await supabase.storage
          .from('contractor-documents')
          .remove([fileName])
        
        return { success: false, error: updateResult.error }
      }

      return { success: true, fileUrl: filePath }
    } catch (error) {
      console.error('Document upload error:', error)
      return { success: false, error: 'Failed to upload document' }
    }
  }

  // Update document metadata in contractor record
  static async updateDocumentMetadata(
    contractorId: string,
    documentType: DocumentType,
    metadata: DocumentStatus
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get current contractor documents
      const { data: contractor, error: fetchError } = await supabaseAdmin
        .from('contractors')
        .select('documents')
        .eq('id', contractorId)
        .single()

      if (fetchError) {
        return { success: false, error: fetchError.message }
      }

      // Update the specific document metadata
      const updatedDocuments = {
        ...contractor.documents,
        [documentType]: metadata
      }

      // Check if all required documents are uploaded
      const allDocumentsUploaded = this.checkAllDocumentsUploaded(updatedDocuments)
      const verificationStatus = allDocumentsUploaded ? 'documents_uploaded' : 'documents_pending'

      // Update contractor record
      const { error: updateError } = await supabaseAdmin
        .from('contractors')
        .update({
          documents: updatedDocuments,
          verification_status: verificationStatus
        })
        .eq('id', contractorId)

      if (updateError) {
        return { success: false, error: updateError.message }
      }

      return { success: true }
    } catch (error) {
      console.error('Document metadata update error:', error)
      return { success: false, error: 'Failed to update document metadata' }
    }
  }

  // Validate file before upload
  static validateFile(file: File, documentType: DocumentType): { valid: boolean; error?: string } {
    // Check file size (max 20MB)
    const maxSize = 20 * 1024 * 1024 // 20MB
    if (file.size > maxSize) {
      return { valid: false, error: 'File size must be less than 20MB' }
    }

    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: 'Only JPG, PNG, and PDF files are allowed' }
    }

    // Document-specific validations
    switch (documentType) {
      case 'pan_card':
        if (file.type === 'application/pdf' && file.size > 2 * 1024 * 1024) {
          return { valid: false, error: 'PAN Card PDF should be less than 2MB' }
        }
        break
      case 'cancelled_cheque':
        // Allow both images and PDFs for cancelled cheque
        if (!['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'].includes(file.type)) {
          return { valid: false, error: 'Cancelled cheque should be an image (JPG/PNG) or PDF' }
        }
        break
    }

    return { valid: true }
  }

  // Check if all required documents are uploaded
  static checkAllDocumentsUploaded(documents: Record<string, DocumentStatus>): boolean {
    const requiredDocs: DocumentType[] = ['pan_card', 'gst_certificate', 'company_registration', 'cancelled_cheque']
    return requiredDocs.every(docType => documents[docType]?.uploaded === true)
  }

  // Get document status for contractor
  static async getDocumentStatus(contractorId: string): Promise<Record<DocumentType, DocumentStatus> | null> {
    try {
      const { data: contractor, error } = await supabaseAdmin
        .from('contractors')
        .select('documents')
        .eq('id', contractorId)
        .single()

      if (error) {
        console.error('Error fetching document status:', error)
        return null
      }

      return contractor.documents as Record<DocumentType, DocumentStatus>
    } catch (error) {
      console.error('Error getting document status:', error)
      return null
    }
  }

  // Admin function: Verify document
  static async verifyDocument(
    contractorId: string,
    documentType: DocumentType,
    verified: boolean,
    verifiedBy: string,
    rejectionReason?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: contractor, error: fetchError } = await supabaseAdmin
        .from('contractors')
        .select('documents')
        .eq('id', contractorId)
        .single()

      if (fetchError) {
        return { success: false, error: fetchError.message }
      }

      const updatedDocuments = {
        ...contractor.documents,
        [documentType]: {
          ...contractor.documents[documentType],
          verified,
          verified_at: verified ? new Date().toISOString() : null,
          rejection_reason: rejectionReason || null
        }
      }

      // Check if all documents are verified
      const allDocumentsVerified = this.checkAllDocumentsVerified(updatedDocuments)
      const verificationStatus = allDocumentsVerified ? 'verified' : 'under_verification'

      const { data: updateData, error: updateError } = await supabaseAdmin
        .from('contractors')
        .update({
          documents: updatedDocuments,
          verification_status: verificationStatus
        })
        .eq('id', contractorId)
        .select('id')
        .single()

      if (updateError) {
        return { success: false, error: updateError.message }
      }

      return { success: true }
    } catch (error) {
      console.error('Document verification error:', error)
      return { success: false, error: 'Failed to verify document' }
    }
  }

  // Check if all required documents are verified
  static checkAllDocumentsVerified(documents: Record<string, DocumentStatus>): boolean {
    const requiredDocs: DocumentType[] = ['pan_card', 'gst_certificate', 'company_registration', 'cancelled_cheque']
    return requiredDocs.every(docType => documents[docType]?.verified === true)
  }

  // Get document upload progress percentage
  static getUploadProgress(documents: Record<string, DocumentStatus>): number {
    const requiredDocs: DocumentType[] = ['pan_card', 'gst_certificate', 'company_registration', 'cancelled_cheque']
    const uploadedCount = requiredDocs.filter(docType => documents[docType]?.uploaded === true).length
    return Math.round((uploadedCount / requiredDocs.length) * 100)
  }

  // Get document verification progress percentage  
  static getVerificationProgress(documents: Record<string, DocumentStatus>): number {
    const requiredDocs: DocumentType[] = ['pan_card', 'gst_certificate', 'company_registration', 'cancelled_cheque']
    const verifiedCount = requiredDocs.filter(docType => documents[docType]?.verified === true).length
    return Math.round((verifiedCount / requiredDocs.length) * 100)
  }
}