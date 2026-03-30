import { ContractorService } from './contractor-service';
import { DocumentService } from './document-service';
import { getContractorAgreementSummary, getContractorOnboardingSnapshot, getContractorUnderwritingSummary } from './contractor-onboarding';
import type { Contractor } from '@/types/supabase';
import type { ContractorAccessStatus, ContractorWithProgress } from '@/types/contractor-access';
export type { ContractorAccessStatus, ContractorWithProgress };

export class ContractorAccessService {
  
  /**
   * Check if a contractor has access to the dashboard.
   * Admin pre-registers contractors by email. Access is granted only when a
   * matching contractor record exists. On first sign-in, clerk_user_id is auto-linked.
   */
  static async checkDashboardAccess(clerkUserId: string, email?: string): Promise<ContractorAccessStatus> {
    try {
      // 1. Try primary lookup by clerk_user_id
      let contractor = await ContractorService.getContractorByClerkId(clerkUserId);

      // 2. Fallback: try email match (contractor pre-registered by admin, not yet linked)
      if (!contractor && email) {
        contractor = await ContractorService.getContractorByEmail(email.toLowerCase());
        // Auto-link clerk_user_id on first sign-in
        if (contractor) {
          await ContractorService.updateContractor(contractor.id, { clerk_user_id: clerkUserId });
          contractor = { ...contractor, clerk_user_id: clerkUserId };
        }
      }

      if (!contractor) {
        return {
          hasAccess: false,
          registrationComplete: false,
          registrationStep: 'not_applied',
          contractor: null,
          reason: 'not_found',
          message: 'Your email is not registered. Please contact the administrator to get access.',
          canRetry: false
        };
      }

      const onboarding = await getContractorOnboardingSnapshot(contractor.id);
      const registrationComplete = onboarding?.procurementEnabled ?? false;
      const registrationStep = onboarding?.registrationStep ?? 'docs_pending';
      const reason = onboarding?.reason ?? 'pending_documents';
      const message = onboarding?.message ?? 'Upload your KYC documents to unlock purchasing features.';
      const canRetry = onboarding?.canRetry ?? true;

      return {
        hasAccess: true,
        registrationComplete,
        registrationStep,
        contractor,
        reason,
        message,
        canRetry,
        portalActive: onboarding?.portalActive ?? false,
        procurementEnabled: onboarding?.procurementEnabled ?? false,
        financingEnabled: onboarding?.financingEnabled ?? false
      };
    } catch (error) {
      console.error('Error checking contractor dashboard access:', error);
      return {
        hasAccess: false,
        registrationComplete: false,
        registrationStep: 'not_applied',
        contractor: null,
        reason: 'not_found',
        message: 'Unable to verify your access. Please try again or contact support.',
        canRetry: true
      };
    }
  }

  /**
   * Get contractor with detailed progress information
   */
  static async getContractorWithProgress(contractorId: string): Promise<ContractorWithProgress | null> {
    try {
      const contractor = await ContractorService.getContractorById(contractorId);
      if (!contractor) return null;

      const [documentsStatus, agreementSummary, underwriting, onboarding] = await Promise.all([
        DocumentService.getDocumentStatus(contractor.id),
        getContractorAgreementSummary(contractor.id),
        getContractorUnderwritingSummary(contractor.id),
        getContractorOnboardingSnapshot(contractor.id),
      ]);
      const uploadProgress = documentsStatus ? DocumentService.getUploadProgress(documentsStatus) : 0;
      const verificationProgress = documentsStatus ? DocumentService.getVerificationProgress(documentsStatus) : 0;

      return {
        ...contractor,
        uploadProgress,
        verificationProgress,
        documentsStatus,
        portalActive: onboarding?.portalActive ?? false,
        procurementEnabled: onboarding?.procurementEnabled ?? false,
        financingEnabled: onboarding?.financingEnabled ?? false,
        masterAgreementStatus: agreementSummary.masterAgreement.status,
        financingAgreementStatus: agreementSummary.financingAgreement.status,
        underwritingStatus: underwriting.status,
        missingChecklist: onboarding?.missingChecklist ?? []
      };
    } catch (error) {
      console.error('Error getting contractor with progress:', error);
      return null;
    }
  }

  /**
   * Check if contractor can access specific features.
   * Purchase/ordering actions require full registration.
   * All other features are open to any authenticated user.
   */
  static canAccessFeature(contractor: Contractor | null, feature: string): boolean {
    const purchaseGatedFeatures = ['purchase_request', 'rfq_generation', 'po_creation'];
    if (purchaseGatedFeatures.includes(feature)) {
      return Boolean(contractor?.procurement_enabled);
    }
    if (feature === 'finance') {
      return Boolean(contractor?.financing_enabled);
    }
    // All other features (projects, boq_upload, schedule_upload, analytics, documents, finance) are open
    return true;
  }

  /**
   * Get status message for display
   */
  static getStatusMessage(contractor: Contractor): { title: string; description: string; type: 'success' | 'warning' | 'error' | 'info' } {
    const status = contractor.status;
    const verificationStatus = contractor.verification_status;

    if (contractor.procurement_enabled) {
      return {
        title: 'Account Verified',
        description: contractor.financing_enabled
          ? 'Your contractor account is active for procurement and financing workflows.'
          : 'Your contractor account is active for procurement workflows.',
        type: 'success'
      };
    }

    if (verificationStatus === 'verified' && !contractor.portal_active) {
      return {
        title: 'Agreement Pending',
        description: 'KYC is approved. Execute the master platform agreement to activate procurement access.',
        type: 'warning'
      };
    }

    if (verificationStatus === 'under_verification') {
      return {
        title: 'Under Review',
        description: 'Your documents are being reviewed by our team. This typically takes 1-2 business days.',
        type: 'info'
      };
    }

    if (verificationStatus === 'documents_uploaded') {
      return {
        title: 'Documents Submitted',
        description: 'All documents have been uploaded. Our team will review them shortly.',
        type: 'info'
      };
    }

    if (verificationStatus === 'rejected' || status === 'rejected') {
      return {
        title: 'Action Required',
        description: 'Some documents need to be re-uploaded. Please check the details below.',
        type: 'error'
      };
    }

    if (verificationStatus === 'documents_pending') {
      return {
        title: 'Documents Required',
        description: 'Please upload GST proof to complete your basic onboarding.',
        type: 'warning'
      };
    }

    return {
      title: 'Application Pending',
      description: 'Your application is being processed.',
      type: 'info'
    };
  }

  /**
   * Get next steps for contractor
   */
  static getNextSteps(contractor: Contractor): string[] {
    const status = contractor.status;
    const verificationStatus = contractor.verification_status;

    if (contractor.procurement_enabled) {
      return contractor.financing_enabled
        ? ['Your account is ready to use.', 'Procurement and financing workflows are active.']
        : ['Your portal access is active.', 'Financing will unlock after commercial approval and addendum execution.'];
    }

    if (verificationStatus === 'verified' && !contractor.portal_active) {
      return [
        'Review the master platform agreement issued by Finverno',
        'Sign the agreement inside the Finverno contractor portal',
        'Portal procurement access will unlock after execution'
      ];
    }

    if (verificationStatus === 'under_verification' || verificationStatus === 'documents_uploaded') {
      return [
        'Wait for GST-based onboarding review (1-2 business days)',
        'You will be notified via email once review is complete',
        'Contact support if you have questions'
      ];
    }

    if (verificationStatus === 'rejected' || status === 'rejected') {
      return [
        'Review rejected documents below',
        'Upload new documents as required',
        'Submit for re-review'
      ];
    }

    if (verificationStatus === 'documents_pending') {
      return [
        'Upload PAN Card',
        'Upload GST Certificate', 
        'Upload Company Registration Certificate',
        'Upload Cancelled Cheque',
        'Submit for review'
      ];
    }

    return ['Complete your application to proceed'];
  }
}
