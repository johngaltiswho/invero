import { NextRequest, NextResponse } from 'next/server';
import { getGoogleSheetsAPI } from '@/lib/google-sheets';
import { getGoogleDriveAPI } from '@/lib/google-drive';

interface ContractorApplicationData {
  // Basic Information
  companyName: string;
  registrationNumber: string;
  incorporationDate: string;
  companyType: string;
  businessAddress: string;
  city: string;
  state: string;
  pincode: string;
  
  // Contact Details
  contactPerson: string;
  designation: string;
  email: string;
  phone: string;
  
  // Business Details
  gstNumber: string;
  panNumber: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  annualRevenue: string;
  yearsInBusiness: string;
  keyServices: string;
  clientReferences: string;
  
  // File URLs from Google Drive
  fileUrls: Record<string, string>;
  
  // Metadata
  submittedAt: string;
  applicationId: string;
}

export async function POST(request: NextRequest) {
  try {
    // Parse FormData (supports both files and text fields)
    const formData = await request.formData();
    
    // Extract text fields
    const applicationData = {
      companyName: formData.get('companyName') as string,
      registrationNumber: formData.get('registrationNumber') as string,
      incorporationDate: formData.get('incorporationDate') as string,
      companyType: formData.get('companyType') as string,
      businessAddress: formData.get('businessAddress') as string,
      city: formData.get('city') as string || '',
      state: formData.get('state') as string || '',
      pincode: formData.get('pincode') as string || '',
      contactPerson: formData.get('contactPerson') as string,
      designation: formData.get('designation') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      gstNumber: formData.get('gstNumber') as string,
      panNumber: formData.get('panNumber') as string || '',
      bankName: formData.get('bankName') as string,
      accountNumber: formData.get('accountNumber') as string,
      ifscCode: formData.get('ifscCode') as string,
      annualRevenue: formData.get('annualRevenue') as string,
      yearsInBusiness: formData.get('yearsInBusiness') as string,
      keyServices: formData.get('keyServices') as string,
      clientReferences: formData.get('clientReferences') as string,
    };
    
    // Validate required fields
    const requiredFields = ['companyName', 'registrationNumber', 'companyType', 'businessAddress', 'contactPerson', 'email', 'phone', 'gstNumber'];
    
    const missingFields = requiredFields.filter(field => !applicationData[field as keyof typeof applicationData]);
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }
    
    // Generate application ID and timestamp
    const applicationId = `APP-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const submittedAt = new Date().toISOString();
    
    // Process file uploads to Google Drive
    let fileUrls: Record<string, string> = {};
    
    try {
      const driveAPI = getGoogleDriveAPI();
      const filesToUpload: Array<{ buffer: Buffer; fileName: string; mimeType: string }> = [];
      
      // Document type mapping
      const documentTypes = ['panCard', 'gstCertificate', 'incorporationCertificate', 'bankStatements', 'financialStatements'];
      
      for (const docType of documentTypes) {
        const file = formData.get(docType) as File | null;
        if (file && file.size > 0) {
          const buffer = Buffer.from(await file.arrayBuffer());
          const fileName = `${docType}-${file.name}`;
          filesToUpload.push({
            buffer,
            fileName,
            mimeType: file.type || 'application/octet-stream'
          });
        }
      }
      
      if (filesToUpload.length > 0) {
        console.log(`📁 Uploading ${filesToUpload.length} files to Google Drive...`);
        fileUrls = await driveAPI.uploadMultipleFiles(filesToUpload, applicationId);
      }
    } catch (error) {
      console.error('❌ Error uploading files to Google Drive:', error);
      // Continue without files - don't fail the entire application
    }
    
    // Prepare data for Google Sheets
    const rowData = [
      applicationId,
      submittedAt,
      applicationData.companyName,
      applicationData.registrationNumber,
      applicationData.incorporationDate,
      applicationData.companyType,
      applicationData.businessAddress,
      applicationData.city,
      applicationData.state,
      applicationData.pincode,
      applicationData.contactPerson,
      applicationData.designation,
      applicationData.email,
      applicationData.phone,
      applicationData.gstNumber,
      applicationData.panNumber,
      applicationData.bankName,
      applicationData.accountNumber,
      applicationData.ifscCode,
      applicationData.annualRevenue,
      applicationData.yearsInBusiness,
      applicationData.keyServices,
      applicationData.clientReferences,
      // File URLs as separate columns
      fileUrls.panCard || '',
      fileUrls.gstCertificate || '',
      fileUrls.incorporationCertificate || '',
      fileUrls.bankStatements || '',
      fileUrls.financialStatements || '',
      'Pending Review' // Status
    ];
    
    // Write to Google Sheets
    const sheetsAPI = getGoogleSheetsAPI();
    
    // Check if header row exists, if not create it
    try {
      const existingData = await sheetsAPI.getSheetData('ContractorApplications', 'A1:AC1');
      
      if (!existingData || existingData.length === 0) {
        // Create header row
        const headers = [
          'Application ID',
          'Submitted At',
          'Company Name',
          'Registration Number',
          'Incorporation Date',
          'Company Type',
          'Business Address',
          'City',
          'State',
          'Pincode',
          'Contact Person',
          'Designation',
          'Email',
          'Phone',
          'GST Number',
          'PAN Number',
          'Bank Name',
          'Account Number',
          'IFSC Code',
          'Annual Revenue',
          'Years in Business',
          'Key Services',
          'Client References',
          'PAN Card URL',
          'GST Certificate URL',
          'Incorporation Certificate URL',
          'Bank Statements URL',
          'Financial Statements URL',
          'Status'
        ];
        
        await sheetsAPI.appendToSheet('ContractorApplications', [headers]);
      }
    } catch (error) {
      console.warn('Could not check/create headers:', error);
    }
    
    // Append the application data
    await sheetsAPI.appendToSheet('ContractorApplications', [rowData]);
    
    console.log(`✅ Successfully submitted contractor application: ${applicationId}`);
    
    return NextResponse.json({
      success: true,
      applicationId,
      message: 'Application submitted successfully. We will review your application and contact you within 2-3 business days.'
    });
    
  } catch (error) {
    console.error('Error submitting contractor application:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to submit application. Please try again later.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}