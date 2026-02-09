import { NextRequest, NextResponse } from 'next/server';
import { ContractorService } from '@/lib/contractor-service';
import { DocumentService } from '@/lib/document-service';
import { requireAdmin } from '@/lib/admin-auth';

// GET - Fetch all contractors for admin dashboard
export async function GET(request: NextRequest) {
  try {
    // Check admin authentication
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // Filter by verification status
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get all contractors (in production, add proper admin authentication)
    const contractors = await ContractorService.getAllContractors();
    
    // Filter by status if provided
    const filteredContractors = status 
      ? contractors.filter(c => c.verification_status === status)
      : contractors;

    // Add document progress for each contractor
    const contractorsWithProgress = await Promise.all(
      filteredContractors.slice(offset, offset + limit).map(async (contractor) => {
        try {
          const documentStatus = await DocumentService.getDocumentStatus(contractor.id);
          const uploadProgress = documentStatus ? DocumentService.getUploadProgress(documentStatus) : 0;
          const verificationProgress = documentStatus ? DocumentService.getVerificationProgress(documentStatus) : 0;

          return {
            ...contractor,
            uploadProgress,
            verificationProgress,
            documentStatus
          };
        } catch (error) {
          console.error(`Error getting document status for contractor ${contractor.id}:`, error);
          return {
            ...contractor,
            uploadProgress: 0,
            verificationProgress: 0,
            documentStatus: null
          };
        }
      })
    );

    // Sort by application date (newest first) and verification priority
    contractorsWithProgress.sort((a, b) => {
      // Prioritize contractors with documents uploaded but not verified
      if (a.verification_status === 'documents_uploaded' && b.verification_status !== 'documents_uploaded') {
        return -1;
      }
      if (b.verification_status === 'documents_uploaded' && a.verification_status !== 'documents_uploaded') {
        return 1;
      }
      
      // Then sort by application date
      return new Date(b.application_date).getTime() - new Date(a.application_date).getTime();
    });

    return NextResponse.json({
      success: true,
      data: {
        contractors: contractorsWithProgress,
        total: filteredContractors.length,
        pagination: {
          limit,
          offset,
          hasMore: offset + limit < filteredContractors.length
        },
        summary: {
          total: contractors.length,
          pending: contractors.filter(c => c.verification_status === 'documents_pending').length,
          documentsUploaded: contractors.filter(c => c.verification_status === 'documents_uploaded').length,
          underVerification: contractors.filter(c => c.verification_status === 'under_verification').length,
          verified: contractors.filter(c => c.verification_status === 'verified').length,
          rejected: contractors.filter(c => c.verification_status === 'rejected').length
        }
      }
    });

  } catch (error) {
    console.error('Error fetching contractors for admin:', error);
    
    // Handle authentication errors
    if (error instanceof Error && (error.message === 'Authentication required' || error.message === 'Admin access required')) {
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 401 });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch contractors'
    }, { status: 500 });
  }
}

// PUT - Update contractor verification status
export async function PUT(request: NextRequest) {
  try {
    // Check admin authentication
    await requireAdmin();
    const {
      contractorId,
      action,
      documentType,
      rejectionReason,
      platform_fee_rate,
      platform_fee_cap,
      interest_rate_daily
    } = await request.json();

    if (!contractorId || !action) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: contractorId, action'
      }, { status: 400 });
    }

    let result;

    switch (action) {
      case 'verify_document':
        if (!documentType) {
          return NextResponse.json({
            success: false,
            error: 'Document type is required for verification'
          }, { status: 400 });
        }
        
        result = await DocumentService.verifyDocument(
          contractorId,
          documentType,
          true,
          'admin', // TODO: Use actual admin user ID from auth
          undefined
        );
        break;

      case 'reject_document':
        if (!documentType) {
          return NextResponse.json({
            success: false,
            error: 'Document type is required for rejection'
          }, { status: 400 });
        }
        
        result = await DocumentService.verifyDocument(
          contractorId,
          documentType,
          false,
          'admin', // TODO: Use actual admin user ID from auth
          rejectionReason
        );
        break;

      case 'approve_contractor':
        // Final approval - update contractor status to approved
        const approveResult = await ContractorService.updateContractor(contractorId, {
          status: 'approved',
          approved_date: new Date().toISOString()
        });
        result = { success: !!approveResult };
        break;

      case 'reject_contractor':
        const rejectResult = await ContractorService.updateContractor(contractorId, {
          status: 'rejected',
          rejection_reason: rejectionReason
        });
        result = { success: !!rejectResult };
        break;

      case 'update_finance_terms': {
        const rate = typeof platform_fee_rate === 'number' ? platform_fee_rate : null;
        const cap = typeof platform_fee_cap === 'number' ? platform_fee_cap : null;
        const interest = typeof interest_rate_daily === 'number' ? interest_rate_daily : null;

        if (rate !== null && (rate < 0 || rate > 1)) {
          return NextResponse.json({
            success: false,
            error: 'Platform fee rate must be between 0 and 1'
          }, { status: 400 });
        }

        if (interest !== null && (interest < 0 || interest > 1)) {
          return NextResponse.json({
            success: false,
            error: 'Daily interest rate must be between 0 and 1'
          }, { status: 400 });
        }

        if (cap !== null && cap < 0) {
          return NextResponse.json({
            success: false,
            error: 'Platform fee cap must be a positive number'
          }, { status: 400 });
        }

        const updateResult = await ContractorService.updateContractor(contractorId, {
          platform_fee_rate: rate,
          platform_fee_cap: cap,
          interest_rate_daily: interest
        });
        result = { success: !!updateResult };
        break;
      }

      default:
        return NextResponse.json({
          success: false,
          error: `Unknown action: ${action}`
        }, { status: 400 });
    }

    if (result?.success) {
      // Log the action
      await ContractorService.addActivity({
        contractor_id: contractorId,
        type: 'admin_action',
        title: `Admin Action: ${action}`,
        description: `Admin performed ${action}${documentType ? ` on ${documentType}` : ''}${rejectionReason ? ` with reason: ${rejectionReason}` : ''}`,
        metadata: { action, documentType, rejectionReason }
      });

      return NextResponse.json({
        success: true,
        message: 'Action completed successfully'
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result?.error || 'Action failed'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error updating contractor verification:', error);
    
    // Handle authentication errors
    if (error instanceof Error && (error.message === 'Authentication required' || error.message === 'Admin access required')) {
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 401 });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Failed to update contractor verification'
    }, { status: 500 });
  }
}
