import type { Contractor } from './supabase';

export interface ContractorAccessStatus {
  hasAccess: boolean;
  contractor: Contractor | null;
  reason: 'verified' | 'pending_documents' | 'under_review' | 'rejected' | 'not_found' | 'documents_missing';
  redirectTo?: string;
  message: string;
  canRetry: boolean;
}

export interface ContractorWithProgress extends Contractor {
  uploadProgress: number;
  verificationProgress: number;
  documentsStatus: Record<string, any> | null;
}