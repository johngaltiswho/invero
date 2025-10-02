'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Button, LoadingSpinner } from '@/components';
import { ContractorAccessService, type ContractorWithProgress } from '@/lib/contractor-access';
import { DocumentService, type DocumentType } from '@/lib/document-service';

export default function ContractorStatusPage(): React.ReactElement {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [contractor, setContractor] = useState<ContractorWithProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);

  useEffect(() => {
    if (isLoaded && user) {
      loadContractorStatus();
    }
  }, [isLoaded, user]);

  const loadContractorStatus = async () => {
    try {
      if (!user) return;
      
      const contractorData = await ContractorAccessService.getContractorWithProgress(user.id);
      
      if (!contractorData) {
        // No contractor found, redirect to application
        router.push('/contractors/apply');
        return;
      }

      setContractor(contractorData);
    } catch (error) {
      console.error('Error loading contractor status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentReupload = async (docType: DocumentType, file: File) => {
    if (!contractor) return;
    
    setUploadingDoc(docType);
    
    try {
      const result = await DocumentService.uploadDocument(contractor.id, docType, file);
      
      if (result.success) {
        // Reload contractor status
        await loadContractorStatus();
      } else {
        alert(`Failed to upload document: ${result.error}`);
      }
    } catch (error) {
      console.error('Error uploading document:', error);
      alert('Failed to upload document. Please try again.');
    } finally {
      setUploadingDoc(null);
    }
  };

  const getDocumentIcon = (docType: DocumentType) => {
    switch (docType) {
      case 'pan_card': return '🆔';
      case 'gst_certificate': return '📋';
      case 'company_registration': return '📄';
      case 'cancelled_cheque': return '🏦';
      default: return '📎';
    }
  };

  const getDocumentLabel = (docType: DocumentType) => {
    switch (docType) {
      case 'pan_card': return 'PAN Card';
      case 'gst_certificate': return 'GST Certificate';
      case 'company_registration': return 'Company Registration';
      case 'cancelled_cheque': return 'Cancelled Cheque';
      default: return docType;
    }
  };

  const getStatusColor = (verification_status: string) => {
    switch (verification_status) {
      case 'verified': return 'text-success bg-success/10 border-success';
      case 'under_verification': 
      case 'documents_uploaded': return 'text-accent-blue bg-accent-blue/10 border-accent-blue';
      case 'rejected': return 'text-error bg-error/10 border-error';
      default: return 'text-warning bg-warning/10 border-warning';
    }
  };

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-neutral-darker">
        <LoadingSpinner 
          title="Loading Contractor Status"
          description="Retrieving your application status and document verification progress"
          icon="📋"
          fullScreen={true}
        />
      </div>
    );
  }

  if (!contractor) {
    return (
      <div className="min-h-screen bg-neutral-darker flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-4xl mb-4">📝</div>
          <h2 className="text-xl font-bold text-primary mb-2">No Application Found</h2>
          <p className="text-secondary mb-6">
            You haven't submitted a contractor application yet. 
            Please complete the application to access your contractor dashboard.
          </p>
          <Button onClick={() => router.push('/contractors/apply')} variant="primary">
            Start Application
          </Button>
        </div>
      </div>
    );
  }

  const statusInfo = ContractorAccessService.getStatusMessage(contractor);
  const nextSteps = ContractorAccessService.getNextSteps(contractor);

  const DocumentUploadCard = ({ docType, docInfo }: { docType: DocumentType; docInfo: any }) => (
    <div className="border border-neutral-medium rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
          <span className="text-2xl mr-3">{getDocumentIcon(docType)}</span>
          <div>
            <h4 className="font-semibold text-primary text-sm">{getDocumentLabel(docType)}</h4>
            {docInfo?.file_name && (
              <p className="text-xs text-secondary">{docInfo.file_name}</p>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {docInfo?.uploaded && (
            <span className="text-xs bg-success/10 text-success px-2 py-1 rounded">Uploaded</span>
          )}
          {docInfo?.verified && (
            <span className="text-xs bg-accent-amber/10 text-accent-amber px-2 py-1 rounded">Verified</span>
          )}
        </div>
      </div>

      {docInfo?.rejection_reason && (
        <div className="mb-3 p-2 bg-error/10 border border-error/20 rounded text-sm text-error">
          <strong>Rejected:</strong> {docInfo.rejection_reason}
        </div>
      )}

      {(!docInfo?.uploaded || docInfo?.rejection_reason) && (
        <div>
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                handleDocumentReupload(docType, file);
              }
            }}
            className="hidden"
            id={`upload-${docType}`}
          />
          <label htmlFor={`upload-${docType}`} className="cursor-pointer">
            <div className={`border-2 border-dashed rounded-lg p-3 text-center hover:border-accent-orange transition-colors ${
              docInfo?.rejection_reason ? 'border-error/50' : 'border-neutral-medium'
            }`}>
              {uploadingDoc === docType ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-accent-orange mr-2"></div>
                  <span className="text-sm text-secondary">Uploading...</span>
                </div>
              ) : (
                <>
                  <div className="text-accent-orange mb-2">📁</div>
                  <div className="text-sm text-secondary">
                    {docInfo?.uploaded ? 'Replace Document' : 'Upload Document'}
                  </div>
                  <div className="text-xs text-secondary mt-1">PDF, JPG, PNG up to 5MB</div>
                </>
              )}
            </div>
          </label>
        </div>
      )}

      {docInfo?.uploaded && docInfo?.file_url && !docInfo?.rejection_reason && (
        <div className="mt-2">
          <a
            href={docInfo.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-orange hover:underline text-sm"
          >
            View Uploaded Document →
          </a>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-neutral-darker">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-primary mb-2">Contractor Application Status</h1>
            <p className="text-secondary">Track your verification progress and complete any pending requirements</p>
          </div>

          {/* Status Overview */}
          <div className="bg-neutral-dark rounded-lg border border-neutral-medium p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-primary">{contractor.company_name}</h2>
                <p className="text-secondary">{contractor.email}</p>
              </div>
              <span className={`px-3 py-1 rounded border text-sm ${getStatusColor(contractor.verification_status)}`}>
                {contractor.verification_status.replace(/_/g, ' ').toUpperCase()}
              </span>
            </div>

            <div className={`p-4 rounded-lg border mb-4 ${
              statusInfo.type === 'success' ? 'bg-success/10 border-success/20' :
              statusInfo.type === 'error' ? 'bg-error/10 border-error/20' :
              statusInfo.type === 'warning' ? 'bg-warning/10 border-warning/20' :
              'bg-accent-blue/10 border-accent-blue/20'
            }`}>
              <h3 className="font-semibold text-primary mb-2">{statusInfo.title}</h3>
              <p className="text-secondary text-sm">{statusInfo.description}</p>
            </div>

            {/* Progress Bars */}
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-secondary">Documents Uploaded</span>
                  <span className="text-primary">{contractor.uploadProgress}%</span>
                </div>
                <div className="w-full bg-neutral-medium rounded-full h-2">
                  <div 
                    className="bg-accent-orange h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${contractor.uploadProgress}%` }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-secondary">Documents Verified</span>
                  <span className="text-primary">{contractor.verificationProgress}%</span>
                </div>
                <div className="w-full bg-neutral-medium rounded-full h-2">
                  <div 
                    className="bg-success h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${contractor.verificationProgress}%` }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="text-sm text-secondary">
              Applied: {new Date(contractor.application_date).toLocaleDateString()}
              {contractor.approved_date && (
                <span className="ml-4">
                  Approved: {new Date(contractor.approved_date).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>

          {/* Documents Section */}
          <div className="bg-neutral-dark rounded-lg border border-neutral-medium p-6 mb-8">
            <h3 className="text-lg font-semibold text-primary mb-4">KYC Documents</h3>
            <div className="grid md:grid-cols-2 gap-4">
              {contractor.documentsStatus && Object.entries(contractor.documentsStatus).map(([docType, docInfo]) => (
                <DocumentUploadCard key={docType} docType={docType as DocumentType} docInfo={docInfo} />
              ))}
            </div>
          </div>

          {/* Next Steps */}
          <div className="bg-neutral-dark rounded-lg border border-neutral-medium p-6 mb-8">
            <h3 className="text-lg font-semibold text-primary mb-4">Next Steps</h3>
            <div className="space-y-2">
              {nextSteps.map((step, index) => (
                <div key={index} className="flex items-center">
                  <span className="text-accent-orange mr-3">{index + 1}.</span>
                  <span className="text-secondary">{step}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="text-center">
            <div className="space-x-4">
              <Button onClick={() => router.push('/')} variant="outline">
                Back to Home
              </Button>
              {contractor.verification_status === 'verified' && contractor.status === 'approved' && (
                <Button onClick={() => router.push('/dashboard/contractor')} variant="primary">
                  Access Dashboard
                </Button>
              )}
              <Button onClick={() => window.location.href = 'mailto:support@finverno.com'} variant="outline">
                Contact Support
              </Button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}