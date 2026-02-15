import { ContractorService } from './contractor-service';
import { DocumentService } from './document-service';
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

      const status = contractor.status;
      const verificationStatus = contractor.verification_status;
      const registrationComplete = status === 'approved' && verificationStatus === 'verified';

      let registrationStep: import('@/types/contractor-access').RegistrationStep;
      let reason: ContractorAccessStatus['reason'];
      let message: string;
      let canRetry = false;

      if (registrationComplete) {
        registrationStep = 'complete';
        reason = 'verified';
        message = 'Access granted. Welcome to your contractor dashboard!';
      } else if (verificationStatus === 'verified' && status !== 'approved') {
        registrationStep = 'rejected';
        reason = 'rejected';
        message = 'Your application has been rejected. Please contact support for assistance.';
        canRetry = false;
      } else if (verificationStatus === 'under_verification') {
        registrationStep = 'under_review';
        reason = 'under_review';
        message = 'Your documents are under review. You can browse the portal while you wait.';
      } else if (verificationStatus === 'documents_uploaded') {
        registrationStep = 'docs_uploaded';
        reason = 'under_review';
        message = 'Documents submitted. Our team will review them shortly.';
      } else if (verificationStatus === 'rejected') {
        registrationStep = 'rejected';
        reason = 'rejected';
        message = 'Some documents were rejected. Please re-upload to complete registration.';
        canRetry = true;
      } else {
        // documents_pending or any unknown state
        registrationStep = 'docs_pending';
        reason = 'pending_documents';
        message = 'Upload your KYC documents to unlock purchasing features.';
        canRetry = true;
      }

      return {
        hasAccess: true,
        registrationComplete,
        registrationStep,
        contractor,
        reason,
        message,
        canRetry
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
      const contractor = await ContractorService.getContractorByClerkId(contractorId);
      if (!contractor) return null;

      const documentsStatus = await DocumentService.getDocumentStatus(contractor.id);
      const uploadProgress = documentsStatus ? DocumentService.getUploadProgress(documentsStatus) : 0;
      const verificationProgress = documentsStatus ? DocumentService.getVerificationProgress(documentsStatus) : 0;

      return {
        ...contractor,
        uploadProgress,
        verificationProgress,
        documentsStatus
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
      return contractor?.status === 'approved' && contractor?.verification_status === 'verified';
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

    if (status === 'approved' && verificationStatus === 'verified') {
      return {
        title: 'Account Verified',
        description: 'Your contractor account is fully verified and active.',
        type: 'success'
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
        description: 'Please upload all required KYC documents to complete your application.',
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

    if (status === 'approved' && verificationStatus === 'verified') {
      return ['Your account is ready to use!', 'Start uploading project BOQs and schedules'];
    }

    if (verificationStatus === 'under_verification' || verificationStatus === 'documents_uploaded') {
      return [
        'Wait for document review (1-2 business days)',
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