import { supabaseAdmin } from '@/lib/supabase';
import { DocumentService } from '@/lib/document-service';
import type { Contractor } from '@/types/supabase';
import type { RegistrationStep } from '@/types/contractor-access';

export type ContractorAgreementLifecycleStatus =
  | 'draft'
  | 'generated'
  | 'issued'
  | 'contractor_signed'
  | 'executed'
  | 'voided'
  | 'expired';

export type ContractorAgreementSummary = {
  masterAgreement: {
    id: string | null;
    status: ContractorAgreementLifecycleStatus | null;
  };
  financingAgreement: {
    id: string | null;
    status: ContractorAgreementLifecycleStatus | null;
  };
};

export type ContractorUnderwritingSummary = {
  status: 'commercial_review' | 'commercial_approved' | 'commercial_rejected' | null;
  financing_limit: number | null;
  repayment_basis: 'client_payment_to_escrow' | null;
  payment_window_days: number | null;
  late_default_terms: string | null;
  notes: string | null;
};

export const DEFAULT_REPAYMENT_BASIS: ContractorUnderwritingSummary['repayment_basis'] = 'client_payment_to_escrow';
export const DEFAULT_PAYMENT_WINDOW_DAYS = 45;
export const DEFAULT_LATE_DEFAULT_TERMS =
  'Repayment becomes due immediately upon receipt of the underlying client payment into the designated escrow or controlled collection account. The contractor shall not divert, delay, or otherwise withhold collections related to financed transactions. Any delay in remittance after receipt of client payment will constitute an event of payment default. Upon default, Finverno may suspend further financing, set off any amounts otherwise payable, and pursue recovery of all outstanding principal, accrued charges, and related costs. Repeated delays, diversion of collections, document discrepancies, or non-cooperation may result in immediate withdrawal of financing access.';

export type ContractorOnboardingSnapshot = {
  onboardingStage: NonNullable<Contractor['onboarding_stage']>;
  portalActive: boolean;
  procurementEnabled: boolean;
  financingEnabled: boolean;
  masterAgreementStatus: ContractorAgreementLifecycleStatus | null;
  financingAgreementStatus: ContractorAgreementLifecycleStatus | null;
  underwritingStatus: ContractorUnderwritingSummary['status'];
  registrationStep: RegistrationStep;
  reason:
    | 'verified'
    | 'pending_documents'
    | 'under_review'
    | 'agreement_pending'
    | 'commercial_review'
    | 'rejected';
  message: string;
  canRetry: boolean;
  missingChecklist: string[];
};

async function getLatestAgreementRow(contractorId: string, agreementType: 'master_platform' | 'financing_addendum') {
  const { data, error } = await (supabaseAdmin as any)
    .from('contractor_agreements')
    .select('id, status, agreement_type, created_at')
    .eq('contractor_id', contractorId)
    .eq('agreement_type', agreementType)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'Failed to load contractor agreement summary');
  }

  return (data || null) as { id: string; status: ContractorAgreementLifecycleStatus } | null;
}

export async function getContractorAgreementSummary(contractorId: string): Promise<ContractorAgreementSummary> {
  const [masterAgreement, financingAgreement] = await Promise.all([
    getLatestAgreementRow(contractorId, 'master_platform'),
    getLatestAgreementRow(contractorId, 'financing_addendum'),
  ]);

  return {
    masterAgreement: {
      id: masterAgreement?.id || null,
      status: masterAgreement?.status || null,
    },
    financingAgreement: {
      id: financingAgreement?.id || null,
      status: financingAgreement?.status || null,
    },
  };
}

export async function getContractorUnderwritingSummary(contractorId: string): Promise<ContractorUnderwritingSummary> {
  const { data, error } = await (supabaseAdmin as any)
    .from('contractor_underwriting_profiles')
    .select('status, financing_limit, repayment_basis, payment_window_days, late_default_terms, notes')
    .eq('contractor_id', contractorId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'Failed to load contractor underwriting summary');
  }

  return {
    status: (data?.status || null) as ContractorUnderwritingSummary['status'],
    financing_limit: data?.financing_limit ?? null,
    repayment_basis: (data?.repayment_basis || DEFAULT_REPAYMENT_BASIS) as ContractorUnderwritingSummary['repayment_basis'],
    payment_window_days: data?.payment_window_days ?? DEFAULT_PAYMENT_WINDOW_DAYS,
    late_default_terms: data?.late_default_terms ?? DEFAULT_LATE_DEFAULT_TERMS,
    notes: data?.notes ?? null,
  };
}

function getMissingChecklist(contractor: Contractor): string[] {
  const missing: string[] = [];
  const documents = contractor.documents || ({} as Contractor['documents']);

  if (!documents.gst_certificate?.uploaded) missing.push('GST certificate');

  return missing;
}

function getMissingFinancingChecklist(contractor: Contractor): string[] {
  const missing: string[] = [];
  const documents = contractor.documents || ({} as Contractor['documents']);

  if (!documents.company_registration?.uploaded) missing.push('Company registration');
  if (!documents.cancelled_cheque?.uploaded) missing.push('Cancelled cheque');

  return missing;
}

export function deriveContractorOnboardingSnapshot(
  contractor: Contractor,
  agreementSummary: ContractorAgreementSummary,
  underwriting: ContractorUnderwritingSummary
): ContractorOnboardingSnapshot {
  const missingChecklist = getMissingChecklist(contractor);
  const missingFinancingChecklist = getMissingFinancingChecklist(contractor);
  const masterStatus = agreementSummary.masterAgreement.status;
  const financingStatus = agreementSummary.financingAgreement.status;
  const docsStatus = contractor.verification_status;
  const contractorStatus = contractor.status;

  if (contractorStatus === 'suspended') {
    return {
      onboardingStage: 'suspended',
      portalActive: false,
      procurementEnabled: false,
      financingEnabled: false,
      masterAgreementStatus: masterStatus,
      financingAgreementStatus: financingStatus,
      underwritingStatus: underwriting.status,
      registrationStep: 'rejected',
      reason: 'rejected',
      message: 'Your contractor account has been suspended. Please contact Finverno support.',
      canRetry: false,
      missingChecklist,
    };
  }

  if (contractorStatus === 'rejected' || docsStatus === 'rejected') {
    return {
      onboardingStage: 'rejected',
      portalActive: false,
      procurementEnabled: false,
      financingEnabled: false,
      masterAgreementStatus: masterStatus,
      financingAgreementStatus: financingStatus,
      underwritingStatus: underwriting.status,
      registrationStep: 'rejected',
      reason: 'rejected',
      message: 'Your contractor application requires attention before it can proceed.',
      canRetry: true,
      missingChecklist,
    };
  }

  if (docsStatus === 'documents_pending') {
    return {
      onboardingStage: 'documents_pending',
      portalActive: false,
      procurementEnabled: false,
      financingEnabled: false,
      masterAgreementStatus: masterStatus,
      financingAgreementStatus: financingStatus,
      underwritingStatus: underwriting.status,
      registrationStep: 'docs_pending',
      reason: 'pending_documents',
      message: 'Upload GST proof to continue onboarding.',
      canRetry: true,
      missingChecklist,
    };
  }

  if (docsStatus === 'documents_uploaded') {
    return {
      onboardingStage: 'documents_uploaded',
      portalActive: false,
      procurementEnabled: false,
      financingEnabled: false,
      masterAgreementStatus: masterStatus,
      financingAgreementStatus: financingStatus,
      underwritingStatus: underwriting.status,
      registrationStep: 'docs_uploaded',
      reason: 'under_review',
      message: 'Your GST proof has been uploaded and is awaiting review.',
      canRetry: false,
      missingChecklist,
    };
  }

  if (docsStatus === 'under_verification') {
    return {
      onboardingStage: 'kyc_under_review',
      portalActive: false,
      procurementEnabled: false,
      financingEnabled: false,
      masterAgreementStatus: masterStatus,
      financingAgreementStatus: financingStatus,
      underwritingStatus: underwriting.status,
      registrationStep: 'under_review',
      reason: 'under_review',
      message: 'Your GST-based onboarding is under review. Procurement access will open after agreement execution.',
      canRetry: false,
      missingChecklist,
    };
  }

  if (docsStatus === 'verified') {
    if (masterStatus !== 'executed') {
      const issuedLike = masterStatus === 'issued' || masterStatus === 'contractor_signed';
      return {
        onboardingStage: issuedLike ? 'master_agreement_issued' : 'master_agreement_pending',
        portalActive: false,
        procurementEnabled: false,
        financingEnabled: false,
        masterAgreementStatus: masterStatus,
        financingAgreementStatus: financingStatus,
        underwritingStatus: underwriting.status,
        registrationStep: 'agreement_pending',
        reason: 'agreement_pending',
        message: issuedLike
          ? 'Master platform agreement has been issued and is awaiting execution.'
          : 'KYC is approved. Execute the master platform agreement to activate procurement access.',
        canRetry: false,
        missingChecklist,
      };
    }

    const portalActive = true;
    const procurementEnabled = true;
    const financingDocsVerified = DocumentService.checkFinancingDocumentsVerified(
      (contractor.documents || {}) as Record<string, any>
    );
    const financingEnabled =
      underwriting.status === 'commercial_approved' && financingStatus === 'executed' && financingDocsVerified;

    let onboardingStage: ContractorOnboardingSnapshot['onboardingStage'] = 'active';
    let registrationStep: RegistrationStep = 'complete';
    let reason: ContractorOnboardingSnapshot['reason'] = 'verified';
    let message = 'Your contractor account is active for portal procurement workflows.';

    if (underwriting.status === 'commercial_review') {
      onboardingStage = 'commercial_review';
      registrationStep = 'commercial_review';
      reason = 'commercial_review';
      message = 'Commercial review is in progress. Financing access remains pending.';
    } else if (underwriting.status === 'commercial_approved' && !financingDocsVerified) {
      onboardingStage = 'financing_pending';
      registrationStep = 'active';
      reason = 'verified';
      message = `Contractor portal access is active. Upload ${missingFinancingChecklist.join(' and ')} to continue financing activation.`;
    } else if (underwriting.status === 'commercial_approved' && financingStatus !== 'executed') {
      onboardingStage =
        financingStatus === 'issued' || financingStatus === 'contractor_signed'
          ? 'financing_issued'
          : 'financing_pending';
      registrationStep = 'active';
      reason = 'verified';
      message =
        financingStatus === 'issued' || financingStatus === 'contractor_signed'
          ? 'Contractor portal access is active. Financing addendum is awaiting execution.'
          : 'Contractor portal access is active. Financing will unlock after addendum execution.';
    } else if (financingEnabled) {
      onboardingStage = 'financing_executed';
      registrationStep = 'complete';
      reason = 'verified';
      message = 'Contractor portal and financing access are active.';
    }

    return {
      onboardingStage,
      portalActive,
      procurementEnabled,
      financingEnabled,
      masterAgreementStatus: masterStatus,
      financingAgreementStatus: financingStatus,
      underwritingStatus: underwriting.status,
      registrationStep,
      reason,
      message,
      canRetry: false,
      missingChecklist,
    };
  }

  return {
    onboardingStage: 'application_submitted',
    portalActive: false,
    procurementEnabled: false,
    financingEnabled: false,
    masterAgreementStatus: masterStatus,
    financingAgreementStatus: financingStatus,
    underwritingStatus: underwriting.status,
    registrationStep: 'applied',
    reason: 'pending_documents',
    message: 'Complete your contractor application to continue.',
    canRetry: true,
    missingChecklist,
  };
}

export async function getContractorOnboardingSnapshot(contractorId: string): Promise<ContractorOnboardingSnapshot | null> {
  const { data, error } = await supabaseAdmin.from('contractors').select('*').eq('id', contractorId).maybeSingle();
  if (error) {
    throw new Error(error.message || 'Failed to load contractor');
  }
  if (!data) return null;

  const [agreementSummary, underwriting] = await Promise.all([
    getContractorAgreementSummary(contractorId),
    getContractorUnderwritingSummary(contractorId),
  ]);

  return deriveContractorOnboardingSnapshot(data as Contractor, agreementSummary, underwriting);
}

export async function syncContractorOnboarding(contractorId: string): Promise<ContractorOnboardingSnapshot | null> {
  const { data, error } = await supabaseAdmin.from('contractors').select('*').eq('id', contractorId).maybeSingle();
  if (error) {
    throw new Error(error.message || 'Failed to load contractor');
  }
  if (!data) return null;

  const contractor = data as Contractor;
  const [agreementSummary, underwriting] = await Promise.all([
    getContractorAgreementSummary(contractorId),
    getContractorUnderwritingSummary(contractorId),
  ]);
  const snapshot = deriveContractorOnboardingSnapshot(contractor, agreementSummary, underwriting);

  const shouldApprove = snapshot.portalActive && contractor.status !== 'approved';

  const { error: updateError } = await supabaseAdmin
    .from('contractors')
    .update({
      onboarding_stage: snapshot.onboardingStage,
      portal_active: snapshot.portalActive,
      procurement_enabled: snapshot.procurementEnabled,
      financing_enabled: snapshot.financingEnabled,
      status:
        snapshot.onboardingStage === 'rejected'
          ? 'rejected'
          : snapshot.onboardingStage === 'suspended'
            ? 'suspended'
            : shouldApprove
              ? 'approved'
              : contractor.status,
      approved_date: shouldApprove ? contractor.approved_date || new Date().toISOString() : contractor.approved_date,
    })
    .eq('id', contractorId);

  if (updateError) {
    throw new Error(updateError.message || 'Failed to update contractor onboarding state');
  }

  return snapshot;
}
