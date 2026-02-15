import type { Contractor } from './supabase';

export type RegistrationStep =
  | 'not_applied'
  | 'applied'
  | 'docs_pending'
  | 'docs_uploaded'
  | 'under_review'
  | 'rejected'
  | 'complete';

export interface ContractorAccessStatus {
  hasAccess: boolean;
  registrationComplete: boolean;
  registrationStep: RegistrationStep;
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