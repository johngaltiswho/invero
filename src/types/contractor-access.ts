import type { Contractor } from './supabase';

export type RegistrationStep =
  | 'not_applied'
  | 'applied'
  | 'docs_pending'
  | 'docs_uploaded'
  | 'under_review'
  | 'agreement_pending'
  | 'commercial_review'
  | 'active'
  | 'rejected'
  | 'complete';

export interface ContractorAccessStatus {
  hasAccess: boolean;
  registrationComplete: boolean;
  registrationStep: RegistrationStep;
  contractor: Contractor | null;
  reason:
    | 'verified'
    | 'pending_documents'
    | 'under_review'
    | 'agreement_pending'
    | 'commercial_review'
    | 'rejected'
    | 'not_found'
    | 'documents_missing';
  redirectTo?: string;
  message: string;
  canRetry: boolean;
  portalActive?: boolean;
  procurementEnabled?: boolean;
  financingEnabled?: boolean;
}

export interface ContractorWithProgress extends Contractor {
  uploadProgress: number;
  verificationProgress: number;
  documentsStatus: Record<string, any> | null;
  portalActive?: boolean;
  procurementEnabled?: boolean;
  financingEnabled?: boolean;
  masterAgreementStatus?: string | null;
  financingAgreementStatus?: string | null;
  underwritingStatus?: string | null;
  missingChecklist?: string[];
}
