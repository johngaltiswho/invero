'use client';

import React, { useState, useEffect } from 'react';
import { Layout, Button } from '@/components';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';

interface DocumentStatus {
  uploaded: boolean;
  verified: boolean;
  file_url: string | null;
  file_name: string | null;
  uploaded_at: string | null;
  verified_at: string | null;
  rejection_reason: string | null;
}

interface ContractorStatus {
  contractorId: string;
  companyName: string;
  email: string;
  status: string;
  verificationStatus: string;
  applicationDate: string;
  approvedDate: string | null;
  uploadProgress: number;
  verificationProgress: number;
  documentStatus: Record<string, DocumentStatus>;
}

const documentLabels = {
  pan_card: 'PAN Card',
  gst_certificate: 'GST Certificate',
  company_registration: 'Company Registration',
  cancelled_cheque: 'Cancelled Cheque'
};

export default function ContractorStatusPage(): React.ReactElement {
  const { user, isLoaded } = useUser();
  const [status, setStatus] = useState<ContractorStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoaded && user) {
      fetchContractorStatus();
    }
  }, [isLoaded, user]);

  const fetchContractorStatus = async () => {
    try {
      const email = user?.primaryEmailAddress?.emailAddress;
      console.log('🔍 Looking for contractor with email:', email);
      
      const response = await fetch(`/api/contractor-application-v2?email=${email}`);
      const data = await response.json();
      
      console.log('📄 API response:', data);

      if (data.success) {
        setStatus(data.data);
      } else {
        setError(data.error || 'Failed to fetch application status');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'text-green-400';
      case 'under_review': return 'text-yellow-400';
      case 'rejected': return 'text-red-400';
      default: return 'text-secondary';
    }
  };

  const getVerificationStatusMessage = (verificationStatus: string) => {
    switch (verificationStatus) {
      case 'documents_pending':
        return 'Please upload all required documents to proceed.';
      case 'documents_uploaded':
        return 'Documents uploaded successfully. Our team will review them within 48 hours.';
      case 'under_verification':
        return 'Documents are being reviewed by our verification team.';
      case 'verified':
        return 'All documents verified! Your application has been approved.';
      case 'rejected':
        return 'Some documents were rejected. Please upload corrected documents.';
      default:
        return 'Application status unknown.';
    }
  };

  const getNextSteps = (verificationStatus: string) => {
    switch (verificationStatus) {
      case 'documents_pending':
        return ['Complete your application by uploading all required documents', 'Ensure documents are clear and readable'];
      case 'documents_uploaded':
        return ['Wait for document verification (typically 24-48 hours)', 'Check your email for updates'];
      case 'under_verification':
        return ['Our team is reviewing your documents', 'You will be notified once verification is complete'];
      case 'verified':
        return ['You can now access the contractor dashboard', 'Start managing your projects and BOQs'];
      case 'rejected':
        return ['Review rejected documents below', 'Upload corrected documents', 'Contact support if you need assistance'];
      default:
        return [];
    }
  };

  if (!isLoaded || loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary mb-4">Loading...</div>
            <div className="text-secondary">Fetching your application status</div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="text-2xl font-bold text-red-400 mb-4">Application Not Found</div>
            <div className="text-secondary mb-8">{error}</div>
            <Link href="/contractors/apply">
              <Button variant="primary">Submit Application</Button>
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  if (!status) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="text-2xl font-bold text-primary mb-4">No Application Found</div>
            <div className="text-secondary mb-8">You haven't submitted a contractor application yet.</div>
            <Link href="/contractors/apply">
              <Button variant="primary">Submit Application</Button>
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Header */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-primary mb-4">Application Status</h1>
            <p className="text-lg text-secondary">Track your contractor application progress</p>
          </div>

          {/* Status Overview */}
          <div className="bg-neutral-dark p-8 rounded-lg border border-neutral-medium mb-8">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-xl font-bold text-primary mb-4">Application Details</h3>
                <div className="space-y-3">
                  <div><span className="text-secondary">Company:</span> <span className="text-primary font-medium">{status.companyName}</span></div>
                  <div><span className="text-secondary">Email:</span> <span className="text-primary">{status.email}</span></div>
                  <div><span className="text-secondary">Application Date:</span> <span className="text-primary">{new Date(status.applicationDate).toLocaleDateString()}</span></div>
                  <div><span className="text-secondary">Status:</span> <span className={`font-medium ${getStatusColor(status.status)}`}>{status.status.replace('_', ' ').toUpperCase()}</span></div>
                </div>
              </div>
              
              <div>
                <h3 className="text-xl font-bold text-primary mb-4">Progress Overview</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-secondary">Document Upload</span>
                      <span className="text-primary">{status.uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-neutral-medium rounded-full h-2">
                      <div 
                        className="bg-accent-orange h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${status.uploadProgress}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-secondary">Verification</span>
                      <span className="text-primary">{status.verificationProgress}%</span>
                    </div>
                    <div className="w-full bg-neutral-medium rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${status.verificationProgress}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Current Status Message */}
          <div className="bg-accent-orange/10 border border-accent-orange/20 p-6 rounded-lg mb-8">
            <h3 className="text-accent-orange font-semibold mb-2">📋 Current Status</h3>
            <p className="text-secondary mb-4">{getVerificationStatusMessage(status.verificationStatus)}</p>
            
            <div className="text-sm">
              <div className="text-secondary font-medium mb-2">Next Steps:</div>
              <ul className="list-disc list-inside space-y-1 text-secondary">
                {getNextSteps(status.verificationStatus).map((step, index) => (
                  <li key={index}>{step}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Document Status */}
          <div className="bg-neutral-dark p-8 rounded-lg border border-neutral-medium mb-8">
            <h3 className="text-xl font-bold text-primary mb-6">Document Status</h3>
            
            <div className="grid md:grid-cols-2 gap-6">
              {Object.entries(status.documentStatus).map(([docType, docStatus]) => (
                <div key={docType} className="border border-neutral-medium rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-primary">{documentLabels[docType as keyof typeof documentLabels]}</h4>
                    <div className="flex items-center space-x-2">
                      {docStatus.uploaded ? (
                        <span className="text-green-400 text-sm">📁 Uploaded</span>
                      ) : (
                        <span className="text-secondary text-sm">⏳ Pending</span>
                      )}
                      
                      {docStatus.verified ? (
                        <span className="text-green-400 text-sm">✅ Verified</span>
                      ) : docStatus.uploaded ? (
                        <span className="text-yellow-400 text-sm">🔍 Review</span>
                      ) : null}
                    </div>
                  </div>
                  
                  {docStatus.uploaded && (
                    <div className="text-xs text-secondary">
                      <div>File: {docStatus.file_name}</div>
                      {docStatus.uploaded_at && (
                        <div>Uploaded: {new Date(docStatus.uploaded_at).toLocaleDateString()}</div>
                      )}
                    </div>
                  )}
                  
                  {docStatus.rejection_reason && (
                    <div className="mt-3 p-3 bg-red-900/20 border border-red-500/20 rounded text-sm">
                      <div className="text-red-400 font-medium mb-1">❌ Rejected</div>
                      <div className="text-red-300">{docStatus.rejection_reason}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {status.verificationStatus === 'verified' ? (
              <Link href="/dashboard/contractor">
                <Button variant="primary" size="lg" className="w-full sm:w-auto">
                  Access Dashboard
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/contractors/apply">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto">
                    Update Application
                  </Button>
                </Link>
                <Button 
                  variant="primary" 
                  size="lg" 
                  onClick={fetchContractorStatus}
                  className="w-full sm:w-auto"
                >
                  Refresh Status
                </Button>
              </>
            )}
          </div>
        </div>
      </section>
    </Layout>
  );
}