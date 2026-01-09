import { ContractorService } from './contractor-service';
import { DocumentService } from './document-service';
import type { Contractor } from '@/types/supabase';
import type { ContractorAccessStatus, ContractorWithProgress } from '@/types/contractor-access';
export type { ContractorAccessStatus, ContractorWithProgress };

export class ContractorAccessService {
  
  /**
   * Check if a contractor has access to the dashboard
   */
  static async checkDashboardAccess(clerkUserId: string): Promise<ContractorAccessStatus> {
    try {
      // Get contractor by Clerk user ID
      const contractor = await ContractorService.getContractorByClerkId(clerkUserId);
      
      if (!contractor) {
        return {
          hasAccess: false,
          contractor: null,
          reason: 'not_found',
          redirectTo: '/contractors/apply',
          message: 'No contractor application found. Please submit an application to access the dashboard.',
          canRetry: false
        };
      }

      // Check contractor status and verification status
      const status = contractor.status;
      const verificationStatus = contractor.verification_status;

      // Handle different verification states
      switch (verificationStatus) {
        case 'verified':
          if (status === 'approved') {
            return {
              hasAccess: true,
              contractor,
              reason: 'verified',
              message: 'Access granted. Welcome to your contractor dashboard!',
              canRetry: false
            };
          } else {
            return {
              hasAccess: false,
              contractor,
              reason: 'rejected',
              redirectTo: '/contractor/status',
              message: 'Your application has been rejected. Please contact support for assistance.',
              canRetry: false
            };
          }

        case 'under_verification':
          return {
            hasAccess: false,
            contractor,
            reason: 'under_review',
            redirectTo: '/contractor/status',
            message: 'Your documents are currently under review. You will be notified once verification is complete.',
            canRetry: false
          };

        case 'documents_uploaded':
          return {
            hasAccess: false,
            contractor,
            reason: 'under_review',
            redirectTo: '/contractor/status',
            message: 'Your documents have been uploaded and are awaiting review by our team.',
            canRetry: false
          };

        case 'rejected':
          return {
            hasAccess: false,
            contractor,
            reason: 'rejected',
            redirectTo: '/contractor/status',
            message: 'Some of your documents were rejected. Please re-upload the required documents.',
            canRetry: true
          };

        case 'documents_pending':
        default:
          return {
            hasAccess: false,
            contractor,
            reason: 'pending_documents',
            redirectTo: '/contractor/status',
            message: 'Please upload all required KYC documents to proceed.',
            canRetry: true
          };
      }
    } catch (error) {
      console.error('Error checking contractor dashboard access:', error);
      return {
        hasAccess: false,
        contractor: null,
        reason: 'not_found',
        redirectTo: '/contractors/apply',
        message: 'Unable to verify your contractor status. Please try again or contact support.',
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
   * Check if contractor can access specific features
   */
  static canAccessFeature(contractor: Contractor, feature: string): boolean {
    if (contractor.status !== 'approved' || contractor.verification_status !== 'verified') {
      return false;
    }

    switch (feature) {
      case 'projects':
      case 'boq_upload':
      case 'schedule_upload':
      case 'analytics':
        return true;
      default:
        return false;
    }
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