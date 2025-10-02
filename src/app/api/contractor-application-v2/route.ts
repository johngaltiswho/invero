import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { ContractorService } from '@/lib/contractor-service';
import { DocumentService, type DocumentType } from '@/lib/document-service';
import type { ContractorInsert } from '@/types/supabase';

interface ContractorApplicationData {
  // Basic Information
  companyName: string;
  registrationNumber: string;
  incorporationDate: string;
  companyType: 'private-limited' | 'partnership' | 'proprietorship' | 'llp';
  businessAddress: string;
  
  // Contact Details
  contactPerson: string;
  email: string;
  phone: string;
  
  // Business Details
  gstin: string;
  panNumber: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  annualTurnover: string;
  yearsInBusiness: string;
  employeeCount: string;
  businessCategory: string;
  specializations: string;
  
  // Additional fields
  creditScore?: string;
  clientReferences?: string;
  
  // Metadata
  submittedAt: string;
  applicationId: string;
}

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Processing contractor application v2...');
    
    // Get authenticated user from Clerk
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required. Please sign in to submit an application.'
      }, { status: 401 });
    }
    
    console.log('👤 Authenticated user:', userId);
    
    // Parse FormData (supports both files and text fields)
    const formData = await request.formData();
    
    // Extract text fields
    const applicationData: ContractorApplicationData = {
      companyName: formData.get('companyName') as string,
      registrationNumber: formData.get('registrationNumber') as string,
      incorporationDate: formData.get('incorporationDate') as string,
      companyType: formData.get('companyType') as 'private-limited' | 'partnership' | 'proprietorship' | 'llp',
      businessAddress: formData.get('businessAddress') as string,
      contactPerson: formData.get('contactPerson') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      gstin: formData.get('gstNumber') as string,
      panNumber: formData.get('panNumber') as string || '',
      bankName: formData.get('bankName') as string,
      accountNumber: formData.get('accountNumber') as string,
      ifscCode: formData.get('ifscCode') as string,
      annualTurnover: formData.get('annualRevenue') as string,
      yearsInBusiness: formData.get('yearsInBusiness') as string,
      employeeCount: formData.get('employeeCount') as string || '0',
      businessCategory: formData.get('businessCategory') as string || '',
      specializations: formData.get('keyServices') as string,
      creditScore: formData.get('creditScore') as string,
      clientReferences: formData.get('clientReferences') as string,
      submittedAt: new Date().toISOString(),
      applicationId: `APP-${Date.now()}`
    };

    console.log('📝 Application data extracted:', applicationData.companyName);

    // Validate required fields
    const requiredFields = [
      'companyName', 'email', 'contactPerson', 'phone', 
      'companyType', 'businessAddress', 'gstin'
    ];
    
    const missingFields = requiredFields.filter(field => 
      !applicationData[field as keyof ContractorApplicationData]
    );
    
    if (missingFields.length > 0) {
      return NextResponse.json({
        success: false,
        error: `Missing required fields: ${missingFields.join(', ')}`
      }, { status: 400 });
    }

    // Check if contractor already exists by email or Clerk user ID
    const existingContractor = await ContractorService.getContractorByEmail(applicationData.email);
    const existingByClerkId = await ContractorService.getContractorByClerkId(userId);
    
    if (existingContractor || existingByClerkId) {
      const existing = existingByClerkId || existingContractor;
      return NextResponse.json({
        success: false,
        error: 'A contractor application already exists for this account',
        data: {
          contractorId: existing.id,
          companyName: existing.company_name,
          status: existing.status,
          verificationStatus: existing.verification_status,
          applicationDate: existing.application_date
        }
      }, { status: 409 });
    }

    // Transform application data to contractor insert format
    const contractorInsert: ContractorInsert = {
      clerk_user_id: userId, // Link to authenticated Clerk user
      email: applicationData.email,
      company_name: applicationData.companyName,
      registration_number: applicationData.registrationNumber || null,
      pan_number: applicationData.panNumber || null,
      gstin: applicationData.gstin || null,
      incorporation_date: applicationData.incorporationDate || null,
      company_type: applicationData.companyType || null,
      business_address: applicationData.businessAddress || null,
      contact_person: applicationData.contactPerson,
      phone: applicationData.phone,
      years_in_business: applicationData.yearsInBusiness ? parseInt(applicationData.yearsInBusiness) : null,
      employee_count: applicationData.employeeCount ? parseInt(applicationData.employeeCount) : null,
      annual_turnover: applicationData.annualTurnover ? parseInt(applicationData.annualTurnover) : null,
      business_category: applicationData.businessCategory || null,
      specializations: applicationData.specializations || null,
      credit_score: applicationData.creditScore ? parseInt(applicationData.creditScore) : null,
      bank_name: applicationData.bankName || null,
      account_number: applicationData.accountNumber || null,
      ifsc_code: applicationData.ifscCode || null,
      status: 'pending',
      verification_status: 'documents_pending'
    };

    console.log('💾 Creating contractor record...');

    // Create contractor record (service role with Clerk validation)
    const newContractor = await ContractorService.createContractor(contractorInsert);
    if (!newContractor) {
      throw new Error('Failed to create contractor record');
    }

    console.log(`✅ Contractor created with ID: ${newContractor.id}`);

    // Process document uploads
    const documentTypes: DocumentType[] = ['pan_card', 'gst_certificate', 'company_registration', 'cancelled_cheque'];
    const documentUploadResults: Record<string, any> = {};
    
    for (const docType of documentTypes) {
      const file = formData.get(getFormFieldName(docType)) as File;
      
      if (file && file.size > 0) {
        console.log(`📄 Uploading ${docType}: ${file.name}`);
        
        const uploadResult = await DocumentService.uploadDocument(
          newContractor.id,
          docType,
          file
        );
        
        documentUploadResults[docType] = uploadResult;
        
        if (!uploadResult.success) {
          console.error(`❌ Failed to upload ${docType}:`, uploadResult.error);
        } else {
          console.log(`✅ Successfully uploaded ${docType}`);
        }
      } else {
        console.log(`⚠️  No file provided for ${docType}`);
        documentUploadResults[docType] = { success: false, error: 'No file provided' };
      }
    }

    // Check upload results
    const uploadedDocs = Object.entries(documentUploadResults)
      .filter(([_, result]) => result.success)
      .map(([docType, _]) => docType);
    
    const failedDocs = Object.entries(documentUploadResults)
      .filter(([_, result]) => !result.success)
      .map(([docType, result]) => ({ docType, error: result.error }));

    console.log(`📊 Upload summary: ${uploadedDocs.length}/4 documents uploaded successfully`);

    // Log activity (optional)
    try {
      await ContractorService.addActivity({
        contractor_id: newContractor.id,
        type: 'application_submitted',
        title: 'Contractor Application Submitted',
        description: `Application submitted for ${applicationData.companyName}. Documents uploaded: ${uploadedDocs.join(', ')}`,
        metadata: {
          applicationId: applicationData.applicationId,
          documentsUploaded: uploadedDocs,
          documentsFailed: failedDocs
        }
      });
    } catch (error) {
      console.warn('Activity logging failed, but continuing:', error);
    }

    return NextResponse.json({
      success: true,
      message: 'Application submitted successfully',
      data: {
        contractorId: newContractor.id,
        applicationId: applicationData.applicationId,
        documentsUploaded: uploadedDocs.length,
        documentsFailed: failedDocs.length,
        verificationStatus: newContractor.verification_status
      }
    });

  } catch (error) {
    console.error('❌ Error processing contractor application:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process application'
    }, { status: 500 });
  }
}

// Helper function to map document types to form field names
function getFormFieldName(docType: DocumentType): string {
  const mapping: Record<DocumentType, string> = {
    'pan_card': 'panCard',
    'gst_certificate': 'gstCertificate', 
    'company_registration': 'companyRegistration',
    'cancelled_cheque': 'cancelledCheque'
  };
  return mapping[docType];
}

// GET endpoint to check application status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const clerkUserId = searchParams.get('clerk_user_id');
    
    if (!email && !clerkUserId) {
      return NextResponse.json({
        success: false,
        error: 'Email or clerk_user_id parameter is required'
      }, { status: 400 });
    }

    // Try to find contractor by Clerk user ID first, then by email
    let contractor = null;
    if (clerkUserId) {
      console.log('🔍 Looking for contractor by Clerk ID:', clerkUserId);
      contractor = await ContractorService.getContractorByClerkId(clerkUserId);
    } else if (email) {
      console.log('🔍 Looking for contractor by email:', email);
      contractor = await ContractorService.getContractorByEmail(email);
    }
    
    console.log('📄 Found contractor:', contractor ? `ID: ${contractor.id}, Email: ${contractor.email}` : 'null');
    
    if (!contractor) {
      return NextResponse.json({
        success: false,
        error: 'No application found for this account'
      }, { status: 404 });
    }

    // Get document status
    const documentStatus = await DocumentService.getDocumentStatus(contractor.id);
    const uploadProgress = documentStatus ? DocumentService.getUploadProgress(documentStatus) : 0;
    const verificationProgress = documentStatus ? DocumentService.getVerificationProgress(documentStatus) : 0;

    return NextResponse.json({
      success: true,
      data: {
        contractorId: contractor.id,
        companyName: contractor.company_name,
        email: contractor.email,
        status: contractor.status,
        verificationStatus: contractor.verification_status,
        applicationDate: contractor.application_date,
        approvedDate: contractor.approved_date,
        uploadProgress,
        verificationProgress,
        documentStatus
      }
    });

  } catch (error) {
    console.error('Error checking application status:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to check application status'
    }, { status: 500 });
  }
}