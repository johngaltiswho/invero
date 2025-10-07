'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components';
import { DocumentService, type DocumentType } from '@/lib/document-service';
import type { Contractor } from '@/types/supabase';

interface ContractorWithDocuments extends Contractor {
  uploadProgress: number;
  verificationProgress: number;
}

interface MaterialRequest {
  id: string;
  contractor_id: string;
  name: string;
  description?: string;
  category: string;
  unit: string;
  estimated_price?: number;
  supplier_name?: string;
  justification: string;
  project_context?: string;
  urgency: 'low' | 'normal' | 'high' | 'urgent';
  status: 'pending' | 'under_review' | 'approved' | 'rejected';
  review_notes?: string;
  rejection_reason?: string;
  created_at: string;
  company_name?: string;
  contact_person?: string;
}

export default function AdminVerificationDashboard(): React.ReactElement {
  const [activeTab, setActiveTab] = useState<'contractors' | 'materials'>('contractors');
  const [contractors, setContractors] = useState<ContractorWithDocuments[]>([]);
  const [materialRequests, setMaterialRequests] = useState<MaterialRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContractor, setSelectedContractor] = useState<ContractorWithDocuments | null>(null);
  const [selectedMaterialRequest, setSelectedMaterialRequest] = useState<MaterialRequest | null>(null);
  const [verifyingDoc, setVerifyingDoc] = useState<string | null>(null);
  const [reviewingMaterial, setReviewingMaterial] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab === 'contractors') {
      loadContractors();
    } else {
      loadMaterialRequests();
    }
  }, [activeTab]);

  const loadContractors = async () => {
    try {
      // Load all contractors that need admin attention (not just documents_uploaded)
      const response = await fetch('/api/admin/contractors');
      const result = await response.json();
      
      if (result.success) {
        setContractors(result.data.contractors);
      } else {
        console.error('Failed to load contractors:', result.error);
      }
    } catch (error) {
      console.error('Error loading contractors:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMaterialRequests = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/material-requests');
      const result = await response.json();
      
      if (result.success) {
        setMaterialRequests(result.data);
      } else {
        console.error('Failed to load material requests:', result.error);
        alert('Failed to load material requests');
      }
    } catch (error) {
      console.error('Error loading material requests:', error);
      alert('Error loading material requests');
    } finally {
      setLoading(false);
    }
  };

  const handleReviewMaterialRequest = async (
    requestId: string,
    action: 'approve' | 'reject',
    reviewNotes?: string,
    rejectionReason?: string,
    createMaterial = false
  ) => {
    setReviewingMaterial(requestId);
    
    try {
      const response = await fetch('/api/admin/material-requests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: requestId,
          action,
          review_notes: reviewNotes,
          rejection_reason: rejectionReason,
          create_material: createMaterial
        })
      });

      const result = await response.json();

      if (result.success) {
        alert(result.message);
        
        // Update the selected request optimistically
        if (selectedMaterialRequest?.id === requestId) {
          setSelectedMaterialRequest({
            ...selectedMaterialRequest,
            status: action === 'approve' ? 'approved' : 'rejected',
            review_notes: reviewNotes,
            rejection_reason: rejectionReason
          });
        }
        
        // Reload data
        await loadMaterialRequests();
      } else {
        alert(result.error || 'Failed to review request');
      }
    } catch (error) {
      console.error('Error reviewing material request:', error);
      alert('Error reviewing material request');
    } finally {
      setReviewingMaterial(null);
    }
  };

  const handleVerifyDocument = async (
    contractorId: string,
    documentType: DocumentType,
    verified: boolean,
    rejectionReason?: string
  ) => {
    setVerifyingDoc(`${contractorId}-${documentType}`);
    
    try {
      const response = await fetch('/api/admin/contractors', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractorId,
          action: verified ? 'verify_document' : 'reject_document',
          documentType,
          rejectionReason
        })
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ Document verification successful');
        
        // Immediate UI update - optimistically update the selected contractor
        if (selectedContractor?.id === contractorId) {
          const updatedDocuments = {
            ...selectedContractor.documents,
            [documentType]: {
              ...selectedContractor.documents[documentType],
              verified: verified,
              verified_at: verified ? new Date().toISOString() : null,
              rejection_reason: rejectionReason || null
            }
          };
          
          setSelectedContractor({
            ...selectedContractor,
            documents: updatedDocuments
          });
        }
        
        // Also reload the data from API for consistency
        await loadContractors();
        
        alert(`Document ${verified ? 'approved' : 'rejected'} successfully!`);
      } else {
        console.error('Failed to verify document:', result.error);
        alert(`Failed to ${verified ? 'approve' : 'reject'} document: ${result.error}`);
      }
    } catch (error) {
      console.error('Error verifying document:', error);
      alert('Network error occurred while processing the request');
    } finally {
      setVerifyingDoc(null);
    }
  };

  const handleFinalApproval = async (
    contractorId: string,
    approved: boolean,
    rejectionReason?: string
  ) => {
    setVerifyingDoc(`${contractorId}-final`);
    
    try {
      const response = await fetch('/api/admin/contractors', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractorId,
          action: approved ? 'approve_contractor' : 'reject_contractor',
          rejectionReason
        })
      });

      const result = await response.json();

      if (result.success) {
        // Immediate UI update - optimistically update the selected contractor
        if (selectedContractor?.id === contractorId) {
          setSelectedContractor({
            ...selectedContractor,
            status: approved ? 'approved' : 'rejected',
            approved_date: approved ? new Date().toISOString() : null,
            rejection_reason: approved ? null : rejectionReason
          });
        }
        
        // Also reload the data from API for consistency
        await loadContractors();

        alert(`Contractor ${approved ? 'approved' : 'rejected'} successfully!`);
      } else {
        console.error('Failed to process contractor:', result.error);
        alert(`Failed to ${approved ? 'approve' : 'reject'} contractor: ${result.error}`);
      }
    } catch (error) {
      console.error('Error processing contractor:', error);
      alert('Network error occurred while processing the request');
    } finally {
      setVerifyingDoc(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified': return 'text-success bg-success/10 border-success';
      case 'under_verification': return 'text-accent-amber bg-accent-amber/10 border-accent-amber';
      case 'documents_uploaded': return 'text-accent-blue bg-accent-blue/10 border-accent-blue';
      case 'rejected': return 'text-error bg-error/10 border-error';
      default: return 'text-secondary bg-neutral-medium border-neutral-medium';
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

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-orange"></div>
        <span className="ml-3 text-secondary">Loading contractors...</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary mb-2">Admin Dashboard</h1>
        <p className="text-secondary">Review contractor documents and material requests</p>
        
        {/* Tab Navigation */}
        <div className="mt-6">
          <div className="flex space-x-1 bg-neutral-medium rounded-lg p-1">
            <button
              onClick={() => setActiveTab('contractors')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'contractors'
                  ? 'bg-neutral-dark text-primary'
                  : 'text-secondary hover:text-primary'
              }`}
            >
              Contractor Verification
            </button>
            <button
              onClick={() => setActiveTab('materials')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'materials'
                  ? 'bg-neutral-dark text-primary'
                  : 'text-secondary hover:text-primary'
              }`}
            >
              Material Requests
              {materialRequests.filter(r => r.status === 'pending').length > 0 && (
                <span className="ml-2 bg-accent-orange text-white text-xs px-2 py-1 rounded-full">
                  {materialRequests.filter(r => r.status === 'pending').length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Conditional Content Based on Active Tab */}
      {activeTab === 'contractors' ? (
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Contractors List */}
          <div className="lg:col-span-1">
            <div className="bg-neutral-dark rounded-lg border border-neutral-medium"></div>
            <div className="p-4 border-b border-neutral-medium">
              <h2 className="text-lg font-semibold text-primary">Pending Verification</h2>
              <p className="text-sm text-secondary">Contractors awaiting document review</p>
            </div>
            <div className="divide-y divide-neutral-medium max-h-96 overflow-y-auto">
              {contractors.length === 0 ? (
                <div className="p-6 text-center">
                  <div className="text-4xl mb-4">📋</div>
                  <h3 className="text-lg font-semibold text-primary mb-2">No Pending Applications</h3>
                  <p className="text-secondary text-sm">All contractor applications have been processed.</p>
                </div>
              ) : (
                contractors.map((contractor) => (
                  <div
                    key={contractor.id}
                    className={`p-4 cursor-pointer hover:bg-neutral-medium/50 transition-colors ${
                      selectedContractor?.id === contractor.id ? 'bg-neutral-medium/50 border-l-4 border-l-accent-orange' : ''
                    }`}
                    onClick={() => setSelectedContractor(contractor)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold text-primary text-sm">{contractor.company_name}</h3>
                        <p className="text-xs text-secondary">{contractor.email}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded border ${getStatusColor(contractor.verification_status)}`}>
                        {contractor.verification_status.replace(/_/g, ' ').toUpperCase()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-secondary">
                        {contractor.uploadProgress}% uploaded
                      </span>
                      <span className="text-xs text-secondary">
                        {contractor.verificationProgress}% verified
                      </span>
                    </div>
                    <div className="w-full bg-neutral-medium rounded-full h-1 mt-2">
                      <div 
                        className="bg-accent-orange h-1 rounded-full transition-all duration-300" 
                        style={{ width: `${contractor.verificationProgress}%` }}
                      ></div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Document Verification Panel */}
          <div className="lg:col-span-2">
          {selectedContractor ? (
            <div className="bg-neutral-dark rounded-lg border border-neutral-medium">
              <div className="p-6 border-b border-neutral-medium">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-semibold text-primary">{selectedContractor.company_name}</h2>
                    <p className="text-secondary">{selectedContractor.email}</p>
                    <p className="text-sm text-secondary mt-1">
                      Applied: {new Date(selectedContractor.application_date).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded border text-sm ${getStatusColor(selectedContractor.verification_status)}`}>
                    {selectedContractor.verification_status.replace(/_/g, ' ').toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="p-6">
                <h3 className="text-lg font-semibold text-primary mb-4">KYC Documents</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {Object.entries(selectedContractor.documents).map(([docType, docInfo]) => (
                    <div key={docType} className="border border-neutral-medium rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center">
                          <span className="text-2xl mr-3">{getDocumentIcon(docType as DocumentType)}</span>
                          <div>
                            <h4 className="font-semibold text-primary text-sm">{getDocumentLabel(docType as DocumentType)}</h4>
                            {docInfo.file_name && (
                              <p className="text-xs text-secondary">{docInfo.file_name}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {docInfo.uploaded && (
                            <span className="text-xs bg-success/10 text-success px-2 py-1 rounded">Uploaded</span>
                          )}
                          {docInfo.verified && (
                            <span className="text-xs bg-accent-amber/10 text-accent-amber px-2 py-1 rounded">Verified</span>
                          )}
                        </div>
                      </div>

                      {docInfo.uploaded && docInfo.file_url && (
                        <div className="mb-3">
                          <a
                            href={`/api/admin/documents/${selectedContractor.id}/${docType}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-accent-orange hover:underline text-sm"
                          >
                            View Document →
                          </a>
                        </div>
                      )}

                      {docInfo.uploaded && !docInfo.verified && (
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => handleVerifyDocument(selectedContractor.id, docType as DocumentType, true)}
                            disabled={verifyingDoc === `${selectedContractor.id}-${docType}`}
                          >
                            {verifyingDoc === `${selectedContractor.id}-${docType}` ? 'Verifying...' : 'Approve'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const reason = prompt('Rejection reason:');
                              if (reason) {
                                handleVerifyDocument(selectedContractor.id, docType as DocumentType, false, reason);
                              }
                            }}
                            disabled={verifyingDoc === `${selectedContractor.id}-${docType}`}
                          >
                            Reject
                          </Button>
                        </div>
                      )}

                      {docInfo.rejection_reason && (
                        <div className="mt-2 p-2 bg-error/10 border border-error/20 rounded text-sm text-error">
                          <strong>Rejected:</strong> {docInfo.rejection_reason}
                        </div>
                      )}

                      {!docInfo.uploaded && (
                        <p className="text-xs text-secondary">Document not uploaded</p>
                      )}
                    </div>
                  ))}
                </div>

                {/* Final Approval Section */}
                {selectedContractor.verification_status === 'verified' && selectedContractor.status !== 'approved' && (
                  <div className="mt-8 p-6 bg-accent-amber/5 border border-accent-amber/20 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-lg font-semibold text-primary mb-2">Ready for Final Approval</h4>
                        <p className="text-secondary text-sm">All documents have been verified. Approve this contractor to grant platform access.</p>
                      </div>
                      <div className="flex space-x-3">
                        <Button
                          variant="primary"
                          onClick={() => handleFinalApproval(selectedContractor.id, true)}
                          disabled={verifyingDoc === `${selectedContractor.id}-final`}
                        >
                          {verifyingDoc === `${selectedContractor.id}-final` ? 'Approving...' : 'Approve Contractor'}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            const reason = prompt('Rejection reason for contractor:');
                            if (reason) {
                              handleFinalApproval(selectedContractor.id, false, reason);
                            }
                          }}
                          disabled={verifyingDoc === `${selectedContractor.id}-final`}
                        >
                          Reject Contractor
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {selectedContractor.status === 'approved' && (
                  <div className="mt-8 p-6 bg-success/5 border border-success/20 rounded-lg">
                    <div className="flex items-center">
                      <span className="text-2xl mr-3">✅</span>
                      <div>
                        <h4 className="text-lg font-semibold text-success mb-1">Contractor Approved</h4>
                        <p className="text-secondary text-sm">
                          Approved on {selectedContractor.approved_date ? new Date(selectedContractor.approved_date).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {selectedContractor.status === 'rejected' && (
                  <div className="mt-8 p-6 bg-error/5 border border-error/20 rounded-lg">
                    <div className="flex items-center">
                      <span className="text-2xl mr-3">❌</span>
                      <div>
                        <h4 className="text-lg font-semibold text-error mb-1">Contractor Rejected</h4>
                        {selectedContractor.rejection_reason && (
                          <p className="text-secondary text-sm">
                            <strong>Reason:</strong> {selectedContractor.rejection_reason}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-neutral-dark rounded-lg border border-neutral-medium p-8 text-center">
              <div className="text-4xl mb-4">👈</div>
              <h3 className="text-lg font-semibold text-primary mb-2">Select a Contractor</h3>
              <p className="text-secondary">Choose a contractor from the list to review their documents</p>
            </div>
          )}
          </div>
        </div>
      ) : (
        /* Material Requests Tab */
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Material Requests List */}
          <div className="lg:col-span-1">
            <div className="bg-neutral-dark rounded-lg border border-neutral-medium">
              <div className="p-4 border-b border-neutral-medium">
                <h2 className="text-lg font-semibold text-primary">Material Requests</h2>
                <p className="text-sm text-secondary">Contractor material additions pending review</p>
              </div>
              <div className="divide-y divide-neutral-medium max-h-96 overflow-y-auto">
                {materialRequests.length === 0 ? (
                  <div className="p-6 text-center">
                    <div className="text-4xl mb-4">🏗️</div>
                    <h3 className="text-lg font-semibold text-primary mb-2">No Material Requests</h3>
                    <p className="text-secondary text-sm">All material requests have been processed.</p>
                  </div>
                ) : (
                  materialRequests.map((request) => (
                    <div
                      key={request.id}
                      className={`p-4 cursor-pointer hover:bg-neutral-medium/50 transition-colors ${
                        selectedMaterialRequest?.id === request.id ? 'bg-neutral-medium/50 border-l-4 border-l-accent-orange' : ''
                      }`}
                      onClick={() => setSelectedMaterialRequest(request)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold text-primary text-sm">{request.name}</h3>
                          <p className="text-xs text-secondary">{request.company_name}</p>
                        </div>
                        <div className="flex flex-col items-end space-y-1">
                          <span className={`text-xs px-2 py-1 rounded border ${
                            request.status === 'pending' ? 'text-yellow-600 bg-yellow-100 border-yellow-300' :
                            request.status === 'approved' ? 'text-green-600 bg-green-100 border-green-300' :
                            request.status === 'rejected' ? 'text-red-600 bg-red-100 border-red-300' :
                            'text-gray-600 bg-gray-100 border-gray-300'
                          }`}>
                            {request.status.toUpperCase()}
                          </span>
                          {request.urgency !== 'normal' && (
                            <span className={`text-xs px-1 py-0.5 rounded ${
                              request.urgency === 'urgent' ? 'bg-red-100 text-red-700' :
                              request.urgency === 'high' ? 'bg-orange-100 text-orange-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                              {request.urgency}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-secondary">
                        {request.category} • {request.unit}
                      </div>
                      <div className="text-xs text-secondary mt-1">
                        {new Date(request.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Material Request Details Panel */}
          <div className="lg:col-span-2">
            {selectedMaterialRequest ? (
              <div className="bg-neutral-dark rounded-lg border border-neutral-medium">
                <div className="p-6 border-b border-neutral-medium">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-xl font-semibold text-primary">{selectedMaterialRequest.name}</h2>
                      <p className="text-secondary">{selectedMaterialRequest.company_name} ({selectedMaterialRequest.contact_person})</p>
                      <p className="text-sm text-secondary mt-1">
                        Requested: {new Date(selectedMaterialRequest.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded border text-sm ${
                      selectedMaterialRequest.status === 'pending' ? 'text-yellow-600 bg-yellow-100 border-yellow-300' :
                      selectedMaterialRequest.status === 'approved' ? 'text-green-600 bg-green-100 border-green-300' :
                      selectedMaterialRequest.status === 'rejected' ? 'text-red-600 bg-red-100 border-red-300' :
                      'text-gray-600 bg-gray-100 border-gray-300'
                    }`}>
                      {selectedMaterialRequest.status.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="p-6">
                  <div className="grid md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <h3 className="text-lg font-semibold text-primary mb-3">Material Details</h3>
                      <div className="space-y-2 text-sm">
                        <div><strong>Category:</strong> {selectedMaterialRequest.category}</div>
                        <div><strong>Unit:</strong> {selectedMaterialRequest.unit}</div>
                        {selectedMaterialRequest.estimated_price && (
                          <div><strong>Estimated Price:</strong> ₹{selectedMaterialRequest.estimated_price}/{selectedMaterialRequest.unit}</div>
                        )}
                        {selectedMaterialRequest.supplier_name && (
                          <div><strong>Supplier:</strong> {selectedMaterialRequest.supplier_name}</div>
                        )}
                        <div><strong>Urgency:</strong> <span className="capitalize">{selectedMaterialRequest.urgency}</span></div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-primary mb-3">Request Context</h3>
                      <div className="space-y-2 text-sm">
                        {selectedMaterialRequest.project_context && (
                          <div><strong>Project:</strong> {selectedMaterialRequest.project_context}</div>
                        )}
                        <div><strong>Justification:</strong></div>
                        <p className="text-gray-600 bg-gray-50 p-2 rounded">{selectedMaterialRequest.justification}</p>
                      </div>
                    </div>
                  </div>

                  {selectedMaterialRequest.description && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-primary mb-2">Description</h3>
                      <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">{selectedMaterialRequest.description}</p>
                    </div>
                  )}

                  {/* Review Section */}
                  {selectedMaterialRequest.status === 'pending' && (
                    <div className="bg-accent-amber/5 border border-accent-amber/20 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-primary mb-4">Review Material Request</h3>
                      <div className="flex space-x-3">
                        <Button
                          variant="primary"
                          onClick={() => {
                            const notes = prompt('Review notes (optional):');
                            const createMaterial = confirm('Add this material to the master database?');
                            handleReviewMaterialRequest(
                              selectedMaterialRequest.id, 
                              'approve', 
                              notes || undefined, 
                              undefined, 
                              createMaterial
                            );
                          }}
                          disabled={reviewingMaterial === selectedMaterialRequest.id}
                        >
                          {reviewingMaterial === selectedMaterialRequest.id ? 'Approving...' : 'Approve Request'}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            const reason = prompt('Rejection reason:');
                            if (reason) {
                              handleReviewMaterialRequest(selectedMaterialRequest.id, 'reject', undefined, reason);
                            }
                          }}
                          disabled={reviewingMaterial === selectedMaterialRequest.id}
                        >
                          Reject Request
                        </Button>
                      </div>
                    </div>
                  )}

                  {selectedMaterialRequest.review_notes && (
                    <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <h4 className="font-semibold text-blue-900 mb-2">Admin Review Notes</h4>
                      <p className="text-sm text-blue-800">{selectedMaterialRequest.review_notes}</p>
                    </div>
                  )}

                  {selectedMaterialRequest.rejection_reason && (
                    <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                      <h4 className="font-semibold text-red-900 mb-2">Rejection Reason</h4>
                      <p className="text-sm text-red-800">{selectedMaterialRequest.rejection_reason}</p>
                    </div>
                  )}

                  {selectedMaterialRequest.status === 'approved' && (
                    <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center">
                        <span className="text-2xl mr-3">✅</span>
                        <div>
                          <h4 className="text-lg font-semibold text-green-900 mb-1">Request Approved</h4>
                          <p className="text-sm text-green-800">This material request has been approved and may have been added to the material master.</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-neutral-dark rounded-lg border border-neutral-medium p-8 text-center">
                <div className="text-4xl mb-4">👈</div>
                <h3 className="text-lg font-semibold text-primary mb-2">Select a Material Request</h3>
                <p className="text-secondary">Choose a request from the list to review details</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}