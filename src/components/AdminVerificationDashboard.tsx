'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components';
import { type DocumentType } from '@/lib/document-service';
import type { Contractor } from '@/types/supabase';
import SimplePDFViewer from './SimplePDFViewer';

interface ContractorWithDocuments extends Contractor {
  uploadProgress: number;
  verificationProgress: number;
}

interface MaterialRequest {
  id: string;
  requested_by: string;
  name: string;
  description?: string;
  category: string;
  unit: string;
  estimated_price?: number;
  justification?: string;
  project_context?: string;
  urgency?: 'low' | 'normal' | 'high' | 'urgent';
  approval_status?: 'pending' | 'approved' | 'rejected';
  approved_by?: string;
  approval_date?: string;
  rejection_reason?: string;
  review_notes?: string;
  supplier_name?: string;
  created_at: string;
  contractors?: {
    company_name: string;
    contact_person: string;
    email: string;
  };
}

interface ParsedTakeoffRow {
  materialName?: string;
  description?: string;
  unit?: string;
  quantity?: number;
  nos?: number;
  length?: number;
  breadth?: number;
  height?: number;
}

interface MaterialSummaryEntry {
  name: string;
  unit?: string;
  totalQuantity: number;
  count: number;
}

interface BOQTakeoff {
  id: string;
  project_id: string;
  contractor_id: string;
  file_name: string;
  file_url?: string;
  takeoff_data: string; // JSON string
  total_items: number;
  verification_status: 'none' | 'pending' | 'verified' | 'disputed' | 'revision_required';
  admin_notes?: string;
  verified_by?: string;
  verified_at?: string;
  is_funding_eligible: boolean;
  submitted_for_verification_at?: string;
  created_at: string;
  updated_at: string;
  material_name?: string;
  contractors?: {
    company_name: string;
    contact_person: string;
    email: string;
  };
}

interface PurchaseRequestItemUI {
  id: string;
  project_material_id: string;
  hsn_code?: string | null;
  item_description?: string | null;
  requested_qty: number;
  approved_qty?: number;
  unit_rate?: number;
  tax_percent?: number;
  status: 'pending' | 'approved' | 'ordered' | 'received' | 'rejected';
  material_name: string;
  material_description?: string | null;
  unit?: string;
}

interface PurchaseRequest {
  id: string;
  project_id: string;
  contractor_id: string;
  status: 'draft' | 'submitted' | 'approved' | 'funded' | 'po_generated' | 'completed' | 'rejected';
  remarks?: string | null;
  approval_notes?: string | null;
  created_at: string;
  updated_at: string;
  submitted_at?: string;
  approved_at?: string;
  funded_at?: string;
  vendor_id?: number | null;
  vendor_name?: string | null;
  vendor_contact?: string | null;
  vendor_assigned_at?: string | null;
  delivery_status?: 'not_dispatched' | 'dispatched' | 'disputed' | 'delivered' | null;
  dispatched_at?: string | null;
  dispute_deadline?: string | null;
  dispute_raised_at?: string | null;
  dispute_reason?: string | null;
  delivered_at?: string | null;
  invoice_generated_at?: string | null;
  invoice_url?: string | null;
  invoice_download_url?: string | null;
  contractors?: {
    id?: string;
    company_name: string;
    contact_person?: string;
    email?: string;
  };
  project?: {
    name?: string;
    location?: string;
  };
  purchase_request_items: PurchaseRequestItemUI[];
  total_items: number;
  total_requested_qty: number;
  estimated_total: number;
}

interface VendorOption {
  id: number;
  name: string;
  contact_person?: string | null;
  email?: string | null;
  phone?: string | null;
}

interface PurchaseSummary {
  draft: number;
  submitted: number;
  approved: number;
  funded: number;
  po_generated: number;
  completed: number;
  rejected: number;
}

export default function AdminVerificationDashboard(): React.ReactElement {
  const [activeTab, setActiveTab] = useState<'contractors' | 'materials' | 'takeoffs' | 'purchases'>('contractors');
  const [contractors, setContractors] = useState<ContractorWithDocuments[]>([]);
  const [materialRequests, setMaterialRequests] = useState<MaterialRequest[]>([]);
  const [takeoffItems, setTakeoffItems] = useState<BOQTakeoff[]>([]);
  const [takeoffSummary, setTakeoffSummary] = useState({ pending: 0, verified: 0, disputed: 0, revision_required: 0 });
  const [selectedTakeoff, setSelectedTakeoff] = useState<BOQTakeoff | null>(null);
  const [currentPDFUrl, setCurrentPDFUrl] = useState('');
  const [currentPDFName, setCurrentPDFName] = useState('');
  const [purchaseRequests, setPurchaseRequests] = useState<PurchaseRequest[]>([]);
  const [purchaseSummary, setPurchaseSummary] = useState<PurchaseSummary>({
    draft: 0,
    submitted: 0,
    approved: 0,
    funded: 0,
    po_generated: 0,
    completed: 0,
    rejected: 0
  });
  const [selectedPurchaseRequest, setSelectedPurchaseRequest] = useState<PurchaseRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedContractor, setSelectedContractor] = useState<ContractorWithDocuments | null>(null);
  const [termsForm, setTermsForm] = useState({
    platformFeeRate: '0.25',
    platformFeeCap: '25000',
    interestRateDaily: '0.10'
  });
  const [termsSaving, setTermsSaving] = useState(false);
  const [selectedMaterialRequest, setSelectedMaterialRequest] = useState<MaterialRequest | null>(null);
  const [verifyingDoc, setVerifyingDoc] = useState<string | null>(null);
  const [reviewingMaterial, setReviewingMaterial] = useState<string | null>(null);
  const [reviewingTakeoff, setReviewingTakeoff] = useState<string | null>(null);
  const [prStatusFilter, setPrStatusFilter] = useState<string>('all');
  const [showAddContractor, setShowAddContractor] = useState(false);
  const [addContractorForm, setAddContractorForm] = useState({ email: '', contact_person: '', company_name: '', phone: '' });
  const [addContractorLoading, setAddContractorLoading] = useState(false);
  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [vendorsLoading, setVendorsLoading] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState<number | null>(null);
  const [assigningVendor, setAssigningVendor] = useState(false);
  const [dispatchLoading, setDispatchLoading] = useState(false);
  const [disputeWindowHours, setDisputeWindowHours] = useState(48);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [purchaseAdminNotes, setPurchaseAdminNotes] = useState('');

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return 'N/A';
    }
  };

  useEffect(() => {
    if (activeTab === 'contractors') {
      loadContractors();
    } else if (activeTab === 'materials') {
      loadMaterialRequests();
    } else if (activeTab === 'takeoffs') {
      loadTakeoffItems();
    } else if (activeTab === 'purchases') {
      loadPurchaseRequests(prStatusFilter);
    }
  }, [activeTab, prStatusFilter]);

  // Load all vendors once on mount
  useEffect(() => {
    setVendorsLoading(true);
    fetch('/api/admin/vendors')
      .then(r => r.json())
      .then(result => {
        if (result.success) setVendors(result.data || []);
      })
      .catch(err => console.error('Failed to load vendors:', err))
      .finally(() => setVendorsLoading(false));
  }, []);

  // Pre-select the assigned vendor when switching selected PR
  useEffect(() => {
    setSelectedVendorId(selectedPurchaseRequest?.vendor_id ?? null);
  }, [selectedPurchaseRequest?.id]);

  useEffect(() => {
    if (!selectedContractor) return;
    const platformRate = selectedContractor.platform_fee_rate ?? 0.0025;
    const interestDaily =
      selectedContractor.participation_fee_rate_daily ??
      0.001;
    const platformCap = selectedContractor.platform_fee_cap ?? 25000;

    setTermsForm({
      platformFeeRate: (platformRate * 100).toFixed(2),
      platformFeeCap: String(Math.round(platformCap)),
      interestRateDaily: (interestDaily * 100).toFixed(2)
    });
  }, [selectedContractor]);

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

  const handleSaveTerms = async () => {
    if (!selectedContractor) return;
    const platformRatePercent = parseFloat(termsForm.platformFeeRate);
    const interestDailyPercent = parseFloat(termsForm.interestRateDaily);
    const platformCapValue = parseFloat(termsForm.platformFeeCap);

    if (Number.isNaN(platformRatePercent) || Number.isNaN(interestDailyPercent) || Number.isNaN(platformCapValue)) {
      alert('Please enter valid numbers for all finance terms.');
      return;
    }

    setTermsSaving(true);
    try {
      const response = await fetch('/api/admin/contractors', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractorId: selectedContractor.id,
          action: 'update_finance_terms',
          platform_fee_rate: platformRatePercent / 100,
          platform_fee_cap: platformCapValue,
          participation_fee_rate_daily: interestDailyPercent / 100
        })
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to update finance terms');
      }

      setSelectedContractor({
        ...selectedContractor,
        platform_fee_rate: platformRatePercent / 100,
        platform_fee_cap: platformCapValue,
        participation_fee_rate_daily: interestDailyPercent / 100
      });

      setContractors((prev) =>
        prev.map((contractor) =>
          contractor.id === selectedContractor.id
            ? {
                ...contractor,
                platform_fee_rate: platformRatePercent / 100,
                platform_fee_cap: platformCapValue,
                participation_fee_rate_daily: interestDailyPercent / 100
              }
            : contractor
        )
      );
    } catch (error) {
      console.error('Failed to update finance terms:', error);
      alert(error instanceof Error ? error.message : 'Failed to update finance terms');
    } finally {
      setTermsSaving(false);
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

  const loadTakeoffItems = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/takeoff-verification?status=pending');
      const result = await response.json();
      
      if (result.success) {
        setTakeoffItems(result.data.takeoffs);
        setTakeoffSummary(result.data.summary);
      } else {
        console.error('Failed to load takeoff items:', result.error);
        alert('Failed to load takeoff items');
      }
    } catch (error) {
      console.error('Error loading takeoff items:', error);
      alert('Error loading takeoff items');
    } finally {
      setLoading(false);
    }
  };

  const loadPurchaseRequests = async (statusFilter = 'submitted') => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/purchase-requests?status=${statusFilter}`);
      const result = await response.json();
      
      if (result.success) {
        setPurchaseRequests(result.data.requests);
        setPurchaseSummary(result.data.summary);
        return result.data.requests as PurchaseRequest[];
      } else {
        console.error('Failed to load purchase requests:', result.error);
        alert('Failed to load purchase requests');
      }
    } catch (error) {
      console.error('Error loading purchase requests:', error);
      alert('Error loading purchase requests');
    } finally {
      setLoading(false);
    }
    return [];
  };

  // Load PDF for takeoff - same pattern as files section
  const loadTakeoffPDF = async (takeoffId: string) => {
    try {
      const response = await fetch(`/api/boq-takeoffs/download?id=${takeoffId}`);
      const result = await response.json();
      if (result.success) {
        const { downloadUrl, fileName } = result.data;
        setCurrentPDFUrl(downloadUrl);
        setCurrentPDFName(fileName);
      } else {
        console.error('Failed to load takeoff PDF:', result.error);
      }
    } catch (error) {
      console.error('Error loading takeoff PDF:', error);
    }
  };

  const handlePurchaseRequestAction = async (
    purchaseRequestId: string,
    action: 'approve_for_purchase' | 'reject' | 'approve_for_funding',
    admin_notes?: string,
    approved_amount?: number
  ) => {
    try {
      const response = await fetch('/api/admin/purchase-requests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purchase_request_id: purchaseRequestId,
          action,
          admin_notes,
          approved_amount
        })
      });

      const result = await response.json();
      if (result.success) {
        alert(`Purchase request ${action.replace(/_/g, ' ')}d successfully`);
        
        const refreshed = await loadPurchaseRequests();
        if (selectedPurchaseRequest?.id === purchaseRequestId) {
          const updatedSelection = refreshed.find(req => req.id === purchaseRequestId) || null;
          setSelectedPurchaseRequest(updatedSelection);
        }
      } else {
        alert(result.error || 'Failed to process purchase request');
      }
    } catch (error) {
      console.error('Error processing purchase request:', error);
      alert('Error processing purchase request');
    }
  };

  const handleAssignVendor = async () => {
    if (!selectedPurchaseRequest || !selectedVendorId) return;
    setAssigningVendor(true);
    try {
      const response = await fetch('/api/admin/purchase-requests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purchase_request_id: selectedPurchaseRequest.id,
          action: 'assign_vendor',
          vendor_id: selectedVendorId
        })
      });
      const result = await response.json();
      if (result.success) {
        const refreshed = await loadPurchaseRequests();
        const updated = (refreshed as PurchaseRequest[]).find(r => r.id === selectedPurchaseRequest.id) || null;
        setSelectedPurchaseRequest(updated);
      } else {
        alert(result.error || 'Failed to assign vendor');
      }
    } catch (err) {
      console.error('Error assigning vendor:', err);
      alert('Error assigning vendor');
    } finally {
      setAssigningVendor(false);
    }
  };

  const handleDispatch = async (disputeHours: number) => {
    if (!selectedPurchaseRequest) return;
    setDispatchLoading(true);
    try {
      const response = await fetch('/api/admin/delivery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purchase_request_id: selectedPurchaseRequest.id,
          dispute_window_hours: disputeHours
        })
      });
      const result = await response.json();
      if (result.success) {
        alert('Order marked as dispatched. Dispute window started.');
        const refreshed = await loadPurchaseRequests();
        const updated = (refreshed as PurchaseRequest[]).find(r => r.id === selectedPurchaseRequest.id) || null;
        setSelectedPurchaseRequest(updated);
      } else {
        alert(result.error || 'Failed to mark as dispatched');
      }
    } catch (err) {
      console.error('Error dispatching:', err);
      alert('Error marking as dispatched');
    } finally {
      setDispatchLoading(false);
    }
  };

  const openPurchaseModal = (request: PurchaseRequest) => {
    setSelectedPurchaseRequest(request);
    setPurchaseAdminNotes(request.approval_notes || '');
    setShowPurchaseModal(true);
  };

  const handleVerifyTakeoff = async (
    takeoffId: string,
    verification_status: 'verified' | 'disputed' | 'revision_required',
    admin_notes?: string
  ) => {
    setReviewingTakeoff(takeoffId);
    
    try {
      const response = await fetch('/api/admin/takeoff-verification', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          takeoff_id: takeoffId,
          verification_status,
          admin_notes,
          verified_by: 'admin' // This should be actual admin user
        })
      });

      const result = await response.json();

      if (result.success) {
        alert(`Takeoff item ${verification_status} successfully`);
        
        // Update the selected takeoff optimistically
        if (selectedTakeoff?.id === takeoffId) {
          setSelectedTakeoff({
            ...selectedTakeoff,
            verification_status,
            admin_notes,
            verified_by: 'admin',
            verified_at: new Date().toISOString()
          });
        }
        
        // Reload data
        await loadTakeoffItems();
      } else {
        alert(result.error || 'Failed to verify takeoff');
      }
    } catch (error) {
      console.error('Error verifying takeoff:', error);
      alert('Error verifying takeoff');
    } finally {
      setReviewingTakeoff(null);
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
            approval_status: action === 'approve' ? 'approved' : 'rejected',
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

  const handleAddContractor = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddContractorLoading(true);
    try {
      const response = await fetch('/api/admin/contractors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addContractorForm)
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to add contractor');
      }
      alert(`Contractor added. Invitation sent to ${addContractorForm.email}`);
      setShowAddContractor(false);
      setAddContractorForm({ email: '', contact_person: '', company_name: '', phone: '' });
      await loadContractors();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to add contractor');
    } finally {
      setAddContractorLoading(false);
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

  const getPurchaseRequestStatusStyle = (status: PurchaseRequest['status']) => {
    switch (status) {
      case 'submitted':
        return { label: 'Submitted', classes: 'text-yellow-600 bg-yellow-100 border-yellow-300' };
      case 'approved':
        return { label: 'Approved', classes: 'text-green-600 bg-green-100 border-green-300' };
      case 'funded':
        return { label: 'Funded', classes: 'text-blue-600 bg-blue-100 border-blue-300' };
      case 'po_generated':
        return { label: 'PO Generated', classes: 'text-indigo-600 bg-indigo-100 border-indigo-300' };
      case 'completed':
        return { label: 'Completed', classes: 'text-emerald-700 bg-emerald-100 border-emerald-300' };
      case 'rejected':
        return { label: 'Rejected', classes: 'text-red-600 bg-red-100 border-red-300' };
      default:
        return { label: status.replace(/_/g, ' ').toUpperCase(), classes: 'text-secondary bg-neutral-medium/50 border-neutral-medium' };
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
              {materialRequests.filter(r => r.approval_status === 'pending').length > 0 && (
                <span className="ml-2 bg-accent-orange text-white text-xs px-2 py-1 rounded-full">
                  {materialRequests.filter(r => r.approval_status === 'pending').length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('takeoffs')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'takeoffs'
                  ? 'bg-neutral-dark text-primary'
                  : 'text-secondary hover:text-primary'
              }`}
            >
              Quantity Takeoffs
              {takeoffSummary.pending > 0 && (
                <span className="ml-2 bg-accent-orange text-white text-xs px-2 py-1 rounded-full">
                  {takeoffSummary.pending}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('purchases')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'purchases'
                  ? 'bg-neutral-dark text-primary'
                  : 'text-secondary hover:text-primary'
              }`}
            >
              Procurement
              {purchaseSummary.submitted > 0 && (
                <span className="ml-2 bg-accent-orange text-white text-xs px-2 py-1 rounded-full">
                  {purchaseSummary.submitted}
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
            <div className="bg-neutral-dark rounded-lg border border-neutral-medium">
            <div className="p-4 border-b border-neutral-medium flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-primary">Contractors</h2>
                <p className="text-sm text-secondary">Manage contractor registrations</p>
              </div>
              <button
                onClick={() => setShowAddContractor(true)}
                className="px-3 py-1.5 text-sm rounded-lg bg-accent-orange text-white hover:bg-accent-orange/80 transition-colors whitespace-nowrap"
              >
                + Add
              </button>
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
                <div className="bg-neutral-darker/60 border border-neutral-medium rounded-lg p-4 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-primary">Finance Terms</h3>
                      <p className="text-xs text-secondary">Set platform fee and daily project participation fee for this contractor</p>
                    </div>
                    <Button variant="primary" size="sm" onClick={handleSaveTerms} disabled={termsSaving}>
                      {termsSaving ? 'Saving...' : 'Save Terms'}
                    </Button>
                  </div>
                  <div className="grid md:grid-cols-3 gap-4 text-sm">
                    <label className="block">
                      <span className="text-secondary">Platform Fee (%)</span>
                      <input
                        type="number"
                        step="0.01"
                        value={termsForm.platformFeeRate}
                        onChange={(event) =>
                          setTermsForm((prev) => ({ ...prev, platformFeeRate: event.target.value }))
                        }
                        className="mt-2 w-full px-3 py-2 rounded-lg border border-neutral-medium bg-neutral-dark text-primary focus:outline-none focus:ring-2 focus:ring-accent-orange"
                      />
                    </label>
                    <label className="block">
                      <span className="text-secondary">Platform Fee Cap (INR)</span>
                      <input
                        type="number"
                        step="1"
                        value={termsForm.platformFeeCap}
                        onChange={(event) =>
                          setTermsForm((prev) => ({ ...prev, platformFeeCap: event.target.value }))
                        }
                        className="mt-2 w-full px-3 py-2 rounded-lg border border-neutral-medium bg-neutral-dark text-primary focus:outline-none focus:ring-2 focus:ring-accent-orange"
                      />
                    </label>
                    <label className="block">
                      <span className="text-secondary">Project Participation Fee (Daily %)</span>
                      <input
                        type="number"
                        step="0.01"
                        value={termsForm.interestRateDaily}
                        onChange={(event) =>
                          setTermsForm((prev) => ({ ...prev, interestRateDaily: event.target.value }))
                        }
                        className="mt-2 w-full px-3 py-2 rounded-lg border border-neutral-medium bg-neutral-dark text-primary focus:outline-none focus:ring-2 focus:ring-accent-orange"
                      />
                    </label>
                  </div>
                </div>

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
      ) : activeTab === 'materials' ? (
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
                          <p className="text-xs text-secondary">{request.contractors?.company_name}</p>
                        </div>
                        <div className="flex flex-col items-end space-y-1">
                          <span className={`text-xs px-2 py-1 rounded border ${
                            (request.approval_status || 'approved') === 'pending' ? 'text-yellow-600 bg-yellow-100 border-yellow-300' :
                            (request.approval_status || 'approved') === 'approved' ? 'text-green-600 bg-green-100 border-green-300' :
                            (request.approval_status || 'approved') === 'rejected' ? 'text-red-600 bg-red-100 border-red-300' :
                            'text-gray-600 bg-gray-100 border-gray-300'
                          }`}>
                            {(request.approval_status || 'approved').toUpperCase()}
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
                      <p className="text-secondary">{selectedMaterialRequest.contractors?.company_name} ({selectedMaterialRequest.contractors?.contact_person})</p>
                      <p className="text-sm text-secondary mt-1">
                        Requested: {new Date(selectedMaterialRequest.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded border text-sm ${
                      selectedMaterialRequest.approval_status === 'pending' ? 'text-yellow-600 bg-yellow-100 border-yellow-300' :
                      selectedMaterialRequest.approval_status === 'approved' ? 'text-green-600 bg-green-100 border-green-300' :
                      selectedMaterialRequest.approval_status === 'rejected' ? 'text-red-600 bg-red-100 border-red-300' :
                      'text-gray-600 bg-gray-100 border-gray-300'
                    }`}>
                      {(selectedMaterialRequest.approval_status || 'pending').toUpperCase()}
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
                  {selectedMaterialRequest.approval_status === 'pending' && (
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

                  {selectedMaterialRequest.approval_status === 'approved' && (
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
      ) : activeTab === 'takeoffs' ? (
        /* Quantity Takeoffs Tab */
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Takeoff Items List */}
          <div className="lg:col-span-1">
            <div className="bg-neutral-dark rounded-lg border border-neutral-medium">
              <div className="p-4 border-b border-neutral-medium">
                <h2 className="text-lg font-semibold text-primary">Quantity Takeoffs</h2>
                <p className="text-sm text-secondary">Contractor takeoffs pending verification</p>
                
                {/* Summary Stats */}
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                    Pending: {takeoffSummary.pending}
                  </div>
                  <div className="bg-green-100 text-green-800 px-2 py-1 rounded">
                    Verified: {takeoffSummary.verified}
                  </div>
                </div>
              </div>
              <div className="divide-y divide-neutral-medium max-h-96 overflow-y-auto">
                {takeoffItems.length === 0 ? (
                  <div className="p-6 text-center">
                    <div className="text-4xl mb-4">📏</div>
                    <h3 className="text-lg font-semibold text-primary mb-2">No Pending Takeoffs</h3>
                    <p className="text-secondary text-sm">All quantity takeoffs have been verified.</p>
                  </div>
                ) : (
                  takeoffItems.map((takeoff) => (
                    <div
                      key={takeoff.id}
                      className={`p-4 cursor-pointer hover:bg-neutral-medium/50 transition-colors ${
                        selectedTakeoff?.id === takeoff.id ? 'bg-neutral-medium/50 border-l-4 border-l-accent-orange' : ''
                      }`}
                      onClick={() => {
                        setSelectedTakeoff(takeoff);
                        // Load PDF just like files section does
                        loadTakeoffPDF(takeoff.id);
                      }}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold text-primary text-sm">{takeoff.material_name}</h3>
                          <p className="text-xs text-secondary">{takeoff.contractors?.company_name}</p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded border ${
                          takeoff.verification_status === 'pending' ? 'text-yellow-600 bg-yellow-100 border-yellow-300' :
                          takeoff.verification_status === 'verified' ? 'text-green-600 bg-green-100 border-green-300' :
                          takeoff.verification_status === 'disputed' ? 'text-red-600 bg-red-100 border-red-300' :
                          'text-gray-600 bg-gray-100 border-gray-300'
                        }`}>
                          {takeoff.verification_status.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-xs text-secondary">
                        {takeoff.file_name} • {takeoff.total_items} items
                      </div>
                      <div className="text-xs text-secondary mt-1">
                        {new Date(takeoff.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Takeoff Verification Panel */}
          <div className="lg:col-span-2">
            {selectedTakeoff ? (
              <div className="bg-neutral-dark rounded-lg border border-neutral-medium">
                <div className="p-6 border-b border-neutral-medium">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-xl font-semibold text-primary">BOQ Takeoff - {selectedTakeoff.file_name}</h2>
                      <p className="text-secondary">{selectedTakeoff.contractors?.company_name}</p>
                      <p className="text-sm text-secondary mt-1">
                        Total Items: {selectedTakeoff.total_items}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded border text-sm ${
                      selectedTakeoff.verification_status === 'pending' ? 'text-yellow-600 bg-yellow-100 border-yellow-300' :
                      selectedTakeoff.verification_status === 'verified' ? 'text-green-600 bg-green-100 border-green-300' :
                      selectedTakeoff.verification_status === 'disputed' ? 'text-red-600 bg-red-100 border-red-300' :
                      'text-gray-600 bg-gray-100 border-gray-300'
                    }`}>
                      {selectedTakeoff.verification_status.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="p-6">
                  <div className="grid md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <h3 className="text-lg font-semibold text-primary mb-3">BOQ Takeoff Details</h3>
                      <div className="space-y-2 text-sm">
                        <div><strong>File Name:</strong> {selectedTakeoff.file_name}</div>
                        <div><strong>Total Items:</strong> {selectedTakeoff.total_items}</div>
                        <div><strong>Submitted:</strong> {selectedTakeoff.submitted_for_verification_at ? new Date(selectedTakeoff.submitted_for_verification_at).toLocaleDateString() : 'N/A'}</div>
                        <div><strong>Created:</strong> {new Date(selectedTakeoff.created_at).toLocaleDateString()}</div>
                        <div><strong>Funding Eligible:</strong> {selectedTakeoff.is_funding_eligible ? 'Yes' : 'No'}</div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-primary mb-3">Material Summary</h3>
                      <div className="space-y-2 text-sm">
                        {(() => {
                          try {
                            const takeoffData = JSON.parse(selectedTakeoff.takeoff_data) as ParsedTakeoffRow[];
                            if (!Array.isArray(takeoffData)) {
                              throw new Error('Invalid takeoff dataset');
                            }
                            const materialSummary = new Map<string, MaterialSummaryEntry>();
                            
                            takeoffData.forEach((item) => {
                              if (!item?.materialName || !item.quantity || item.quantity <= 0) {
                                return;
                              }
                              const key = item.materialName;
                              const existing = materialSummary.get(key);
                              if (existing) {
                                materialSummary.set(key, {
                                  ...existing,
                                  totalQuantity: existing.totalQuantity + item.quantity,
                                  count: existing.count + 1
                                });
                              } else {
                                materialSummary.set(key, {
                                  name: item.materialName,
                                  unit: item.unit,
                                  totalQuantity: item.quantity,
                                  count: 1
                                });
                              }
                            });
                            
                            const summaryEntries = Array.from(materialSummary.values()).slice(0, 5);
                            if (summaryEntries.length === 0) {
                              return <div className="text-secondary text-sm">No material summary available</div>;
                            }
                            return summaryEntries.map((material) => (
                              <div key={material.name}>
                                <strong>{material.name}:</strong>{' '}
                                {material.totalQuantity.toFixed(2)} {material.unit || 'units'}
                              </div>
                            ));
                          } catch (parseError) {
                            console.error('Failed to parse takeoff material summary:', parseError);
                            return <div>Error parsing takeoff data</div>;
                          }
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Drawing and Detailed Breakup Section */}
                  <div className="mb-6">
                    <div className="grid lg:grid-cols-2 gap-6">
                      {/* Drawing Viewer */}
                      <div>
                        <h3 className="text-lg font-semibold text-primary mb-3">Drawing Reference</h3>
                        {currentPDFUrl ? (
                          <div className="bg-neutral-dark rounded-lg border border-neutral-medium">
                            <SimplePDFViewer
                              fileUrl={currentPDFUrl}
                              fileName={currentPDFName}
                              onError={(error) => {
                                console.error('Failed to load drawing:', error);
                              }}
                            />
                          </div>
                        ) : (
                          <div className="border border-neutral-medium rounded-lg p-8 text-center">
                            <p className="text-secondary">Drawing file not available</p>
                            <p className="text-xs text-secondary mt-2">File: {selectedTakeoff.file_name}</p>
                          </div>
                        )}
                      </div>

                      {/* Detailed Item Breakup */}
                      <div>
                        <h3 className="text-lg font-semibold text-primary mb-3">Detailed Item Breakup</h3>
                        <div className="border border-neutral-medium rounded-lg max-h-96 overflow-y-auto">
                          <table className="w-full text-xs">
                            <thead className="bg-neutral-medium sticky top-0">
                              <tr>
                                <th className="px-2 py-2 text-left text-primary border-r border-neutral-light">Material</th>
                                <th className="px-1 py-2 text-center text-primary border-r border-neutral-light">Nos</th>
                                <th className="px-1 py-2 text-center text-primary border-r border-neutral-light">L</th>
                                <th className="px-1 py-2 text-center text-primary border-r border-neutral-light">B</th>
                                <th className="px-1 py-2 text-center text-primary border-r border-neutral-light">H</th>
                                <th className="px-1 py-2 text-center text-primary border-r border-neutral-light">Unit</th>
                                <th className="px-2 py-2 text-center text-primary">Qty</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(() => {
                                try {
                                  const takeoffData = JSON.parse(selectedTakeoff.takeoff_data) as ParsedTakeoffRow[];
                                  if (!Array.isArray(takeoffData)) {
                                    throw new Error('Invalid takeoff dataset');
                                  }
                                  if (takeoffData.length === 0) {
                                    return (
                                      <tr>
                                        <td colSpan={7} className="p-4 text-center text-secondary">
                                          No detailed items available
                                        </td>
                                      </tr>
                                    );
                                  }
                                  return takeoffData.map((item, index) => (
                                    <tr key={`${item.materialName || 'material'}-${index}`} className="border-b border-neutral-medium hover:bg-neutral-medium/30">
                                      <td className="px-2 py-1 border-r border-neutral-medium">
                                        <div className="font-medium text-primary text-xs">{item.materialName || 'Material'}</div>
                                        {item.description && (
                                          <div className="text-xs text-secondary">{item.description}</div>
                                        )}
                                      </td>
                                      <td className="px-1 py-1 border-r border-neutral-medium text-center text-primary text-xs">
                                        {item.nos ?? 1}
                                      </td>
                                      <td className="px-1 py-1 border-r border-neutral-medium text-center text-primary text-xs">
                                        {item.length ?? 0}
                                      </td>
                                      <td className="px-1 py-1 border-r border-neutral-medium text-center text-primary text-xs">
                                        {item.breadth ?? 0}
                                      </td>
                                      <td className="px-1 py-1 border-r border-neutral-medium text-center text-primary text-xs">
                                        {item.height ?? 0}
                                      </td>
                                      <td className="px-1 py-1 border-r border-neutral-medium text-center text-secondary text-xs">
                                        {item.unit || 'units'}
                                      </td>
                                      <td className="px-2 py-1 text-center font-medium text-accent-orange text-xs">
                                        {(Number(item.quantity) || 0).toFixed(2)}
                                      </td>
                                    </tr>
                                  ));
                                } catch (parseError) {
                                  console.error('Failed to parse detailed takeoff data:', parseError);
                                  return (
                                    <tr>
                                      <td colSpan={7} className="p-4 text-center text-secondary">
                                        Error parsing takeoff data
                                      </td>
                                    </tr>
                                  );
                                }
                              })()}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Verification Section */}
                  {selectedTakeoff.verification_status === 'pending' && (
                    <div className="bg-accent-amber/5 border border-accent-amber/20 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-primary mb-4">Verify BOQ Takeoff</h3>
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-primary mb-2">
                          Admin Notes
                        </label>
                        <textarea
                          rows={3}
                          className="w-full px-3 py-2 border border-neutral-medium rounded-md bg-neutral-darker text-primary placeholder-secondary"
                          placeholder="Verification notes for this BOQ takeoff..."
                          id={`notes-${selectedTakeoff.id}`}
                        ></textarea>
                      </div>
                      <div className="flex space-x-3">
                        <Button
                          variant="primary"
                          onClick={() => {
                            const notesInput = document.getElementById(`notes-${selectedTakeoff.id}`) as HTMLTextAreaElement;
                            
                            handleVerifyTakeoff(
                              selectedTakeoff.id,
                              'verified',
                              notesInput.value
                            );
                          }}
                          disabled={reviewingTakeoff === selectedTakeoff.id}
                        >
                          {reviewingTakeoff === selectedTakeoff.id ? 'Verifying...' : 'Verify & Approve'}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            const reason = prompt('Reason for dispute:');
                            if (reason) {
                              handleVerifyTakeoff(selectedTakeoff.id, 'disputed', reason);
                            }
                          }}
                          disabled={reviewingTakeoff === selectedTakeoff.id}
                        >
                          Dispute
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            const reason = prompt('Revision notes:');
                            if (reason) {
                              handleVerifyTakeoff(selectedTakeoff.id, 'revision_required', reason);
                            }
                          }}
                          disabled={reviewingTakeoff === selectedTakeoff.id}
                        >
                          Request Revision
                        </Button>
                      </div>
                    </div>
                  )}

                  {selectedTakeoff.admin_notes && (
                    <div className="mt-6 p-4 bg-neutral-darker border border-neutral-medium rounded-lg">
                      <h4 className="font-semibold text-primary mb-2">Admin Notes</h4>
                      <p className="text-sm text-primary">{selectedTakeoff.admin_notes}</p>
                    </div>
                  )}

                  {selectedTakeoff.verification_status === 'verified' && (
                    <div className="mt-6 p-4 bg-green-900/10 border border-green-500/20 rounded-lg">
                      <div className="flex items-center">
                        <span className="text-2xl mr-3">✅</span>
                        <div>
                          <h4 className="text-lg font-semibold text-green-400 mb-1">Takeoff Verified</h4>
                          <p className="text-sm text-green-300">
                            Verified by {selectedTakeoff.verified_by} on {selectedTakeoff.verified_at ? new Date(selectedTakeoff.verified_at).toLocaleDateString() : 'N/A'}
                          </p>
                          <p className="text-sm text-green-300 mt-1">
                            BOQ Takeoff approved with {selectedTakeoff.total_items} items
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-neutral-dark rounded-lg border border-neutral-medium p-8 text-center">
                <div className="text-4xl mb-4">👈</div>
                <h3 className="text-lg font-semibold text-primary mb-2">Select a Takeoff</h3>
                <p className="text-secondary">Choose a takeoff from the list to verify</p>
              </div>
            )}
          </div>
        </div>
      ) : activeTab === 'purchases' ? (
        <div className="bg-neutral-dark rounded-lg border border-neutral-medium">
          <div className="p-4 border-b border-neutral-medium">
            <h2 className="text-lg font-semibold text-primary">Procurement</h2>
            <p className="text-sm text-secondary">Purchase requests, vendor allocation &amp; delivery tracking</p>

            <div className="mt-3 grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
              <div className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Submitted: {purchaseSummary.submitted}</div>
              <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded">Approved: {purchaseSummary.approved}</div>
              <div className="bg-purple-100 text-purple-800 px-2 py-1 rounded">Funded: {purchaseSummary.funded}</div>
              <div className="bg-green-100 text-green-800 px-2 py-1 rounded">Completed: {purchaseSummary.completed}</div>
              <div className="bg-red-100 text-red-800 px-2 py-1 rounded">Rejected: {purchaseSummary.rejected}</div>
            </div>

            <div className="mt-3 flex flex-wrap gap-1">
              {(['all', 'submitted', 'approved', 'funded', 'completed', 'rejected'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setPrStatusFilter(s)}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                    prStatusFilter === s
                      ? 'bg-accent-amber text-neutral-dark'
                      : 'bg-neutral-medium text-secondary hover:text-primary'
                  }`}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-neutral-darker border-b border-neutral-medium">
                <tr>
                  <th className="text-left p-3 text-primary font-semibold">Request</th>
                  <th className="text-left p-3 text-primary font-semibold">Project</th>
                  <th className="text-left p-3 text-primary font-semibold">Contractor</th>
                  <th className="text-left p-3 text-primary font-semibold">Items</th>
                  <th className="text-left p-3 text-primary font-semibold">Amount</th>
                  <th className="text-left p-3 text-primary font-semibold">Vendor</th>
                  <th className="text-left p-3 text-primary font-semibold">Status</th>
                  <th className="text-left p-3 text-primary font-semibold">Delivery</th>
                  <th className="text-right p-3 text-primary font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {purchaseRequests.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-secondary">
                      No purchase requests found for this filter.
                    </td>
                  </tr>
                ) : (
                  purchaseRequests.map((request) => {
                    const statusMeta = getPurchaseRequestStatusStyle(request.status);
                    const deliveryLabel =
                      request.delivery_status === 'dispatched'
                        ? 'Dispatched'
                        : request.delivery_status === 'disputed'
                        ? 'Disputed'
                        : request.delivery_status === 'delivered'
                        ? 'Delivered'
                        : 'Not Dispatched';

                    return (
                      <tr key={request.id} className="border-b border-neutral-medium hover:bg-neutral-medium/20">
                        <td className="p-3 text-primary font-medium">#{request.id.slice(0, 8).toUpperCase()}</td>
                        <td className="p-3 text-secondary">{request.project?.name || request.project_id || 'Project'}</td>
                        <td className="p-3 text-secondary">{request.contractors?.company_name || 'Unknown Contractor'}</td>
                        <td className="p-3 text-secondary">{request.total_items}</td>
                        <td className="p-3 text-primary">
                          ₹{(request.estimated_total || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </td>
                        <td className="p-3 text-secondary">{request.vendor_name || 'Unassigned'}</td>
                        <td className="p-3">
                          <span className={`text-xs px-2 py-1 rounded border ${statusMeta.classes}`}>{statusMeta.label}</span>
                        </td>
                        <td className="p-3 text-secondary text-xs">{deliveryLabel}</td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {(request.invoice_download_url || request.invoice_url) && (
                              <a
                                href={request.invoice_download_url || request.invoice_url || '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-accent-amber underline"
                              >
                                View Invoice
                              </a>
                            )}
                            <Button
                              variant="outline"
                              onClick={() => openPurchaseModal(request)}
                            >
                              Open
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {/* Purchase Request Modal */}
      {showPurchaseModal && selectedPurchaseRequest && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-dark rounded-lg border border-neutral-medium w-full max-w-5xl max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-neutral-medium flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold text-primary">
                  Purchase Request #{selectedPurchaseRequest.id.slice(0, 8).toUpperCase()}
                </h2>
                <p className="text-sm text-secondary">
                  {selectedPurchaseRequest.project?.name || selectedPurchaseRequest.project_id || 'Project'} • {selectedPurchaseRequest.contractors?.company_name || 'Unknown Contractor'}
                </p>
              </div>
              <button
                className="text-secondary hover:text-primary"
                onClick={() => setShowPurchaseModal(false)}
              >
                Close
              </button>
            </div>

            <div className="p-5 space-y-5">
              {(() => {
                const vendorLocked =
                  ['funded', 'po_generated', 'completed'].includes(selectedPurchaseRequest.status) ||
                  (selectedPurchaseRequest.delivery_status && selectedPurchaseRequest.delivery_status !== 'not_dispatched');
                return (
                  <>
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div className="bg-neutral-darker border border-neutral-medium rounded-lg p-3">
                  <div className="text-secondary">Status</div>
                  <div className="text-primary font-medium mt-1">{getPurchaseRequestStatusStyle(selectedPurchaseRequest.status).label}</div>
                </div>
                <div className="bg-neutral-darker border border-neutral-medium rounded-lg p-3">
                  <div className="text-secondary">Total Items</div>
                  <div className="text-primary font-medium mt-1">{selectedPurchaseRequest.total_items}</div>
                </div>
                <div className="bg-neutral-darker border border-neutral-medium rounded-lg p-3">
                  <div className="text-secondary">Estimated Total</div>
                  <div className="text-primary font-medium mt-1">₹{(selectedPurchaseRequest.estimated_total || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                </div>
              </div>

              <div className="bg-neutral-darker border border-neutral-medium rounded-lg p-4">
                <h3 className="text-base font-semibold text-primary mb-3">Vendor Assignment</h3>
                {vendorLocked && (
                  <div className="mb-3 p-2 rounded border border-yellow-500/30 bg-yellow-500/10 text-xs text-yellow-300">
                    Vendor is locked and cannot be changed after funding or dispatch.
                  </div>
                )}
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-secondary mb-1">Select Vendor</label>
                    {vendorsLoading ? (
                      <p className="text-xs text-secondary">Loading vendors...</p>
                    ) : vendors.length === 0 ? (
                      <p className="text-xs text-secondary italic">No vendors registered for this contractor yet.</p>
                    ) : (
                      <select
                        value={selectedVendorId ?? ''}
                        onChange={e => setSelectedVendorId(e.target.value ? Number(e.target.value) : null)}
                        disabled={vendorLocked}
                        className="w-full px-3 py-2 bg-neutral-dark border border-neutral-medium rounded-md text-sm text-primary"
                      >
                        <option value="">-- Choose vendor --</option>
                        {vendors.map(v => (
                          <option key={v.id} value={v.id}>{v.name}{v.contact_person ? ` (${v.contact_person})` : ''}</option>
                        ))}
                      </select>
                    )}
                  </div>
                  <button
                    onClick={handleAssignVendor}
                    disabled={!selectedVendorId || assigningVendor || vendorLocked}
                    className="px-4 py-2 bg-accent-amber text-neutral-dark rounded-md text-sm font-medium disabled:opacity-50 whitespace-nowrap"
                  >
                    {assigningVendor ? 'Assigning...' : 'Assign Vendor'}
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto border border-neutral-medium rounded-lg">
                <table className="w-full text-xs">
                  <thead className="bg-neutral-darker">
                    <tr className="border-b border-neutral-medium">
                      <th className="text-left p-2 font-medium text-primary">Item</th>
                      <th className="text-center p-2 font-medium text-primary">HSN</th>
                      <th className="text-center p-2 font-medium text-primary">Qty</th>
                      <th className="text-center p-2 font-medium text-primary">Unit</th>
                      <th className="text-center p-2 font-medium text-primary">Rate</th>
                      <th className="text-center p-2 font-medium text-primary">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedPurchaseRequest.purchase_request_items.map((item) => (
                      <tr key={item.id} className="border-b border-neutral-medium">
                        <td className="p-2 text-primary">
                          <div>{item.material_name}</div>
                          {item.item_description && (
                            <div className="text-[11px] text-secondary mt-0.5">{item.item_description}</div>
                          )}
                        </td>
                        <td className="p-2 text-center text-primary font-mono">{item.hsn_code || '-'}</td>
                        <td className="p-2 text-center text-primary">{item.requested_qty}</td>
                        <td className="p-2 text-center text-primary">{item.unit || 'units'}</td>
                        <td className="p-2 text-center text-primary">₹{(item.unit_rate || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                        <td className="p-2 text-center text-secondary">{item.status.replace(/_/g, ' ').toUpperCase()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {selectedPurchaseRequest.status === 'submitted' && (
                <div className="bg-accent-amber/5 border border-accent-amber/20 rounded-lg p-4">
                  <h3 className="text-base font-semibold text-primary mb-2">Review Request</h3>
                  <textarea
                    rows={3}
                    className="w-full px-3 py-2 border border-neutral-medium rounded-md bg-neutral-darker text-primary placeholder-secondary mb-3"
                    placeholder="Add admin notes..."
                    value={purchaseAdminNotes}
                    onChange={(e) => setPurchaseAdminNotes(e.target.value)}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="primary"
                      onClick={() => {
                        if (!selectedPurchaseRequest.vendor_id && !selectedVendorId) {
                          alert('Please assign a vendor before approving.');
                          return;
                        }
                        handlePurchaseRequestAction(selectedPurchaseRequest.id, 'approve_for_purchase', purchaseAdminNotes || undefined);
                      }}
                    >
                      Approve Request
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handlePurchaseRequestAction(selectedPurchaseRequest.id, 'approve_for_funding', purchaseAdminNotes || undefined)}
                    >
                      Mark as Funded
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        const reason = prompt('Rejection reason:');
                        if (reason) handlePurchaseRequestAction(selectedPurchaseRequest.id, 'reject', reason);
                      }}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              )}

              {(['approved', 'funded', 'po_generated'].includes(selectedPurchaseRequest.status)) &&
                (!selectedPurchaseRequest.delivery_status || selectedPurchaseRequest.delivery_status === 'not_dispatched') && (
                <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4">
                  <h3 className="text-base font-semibold text-primary mb-2">Initiate Delivery</h3>
                  <div className="flex items-center gap-3">
                    <select
                      value={disputeWindowHours}
                      onChange={e => setDisputeWindowHours(Number(e.target.value))}
                      className="px-3 py-2 bg-neutral-dark border border-neutral-medium rounded-md text-sm text-primary"
                    >
                      <option value={24}>24 hours</option>
                      <option value={48}>48 hours</option>
                      <option value={72}>72 hours</option>
                    </select>
                    <button
                      onClick={() => handleDispatch(disputeWindowHours)}
                      disabled={dispatchLoading}
                      className="px-5 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                    >
                      {dispatchLoading ? 'Processing...' : 'Mark as Dispatched'}
                    </button>
                  </div>
                </div>
              )}

              {selectedPurchaseRequest.delivery_status === 'dispatched' && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                  <p className="font-medium text-blue-900">Order Dispatched</p>
                  <p className="text-blue-800">Dispatched: {formatDate(selectedPurchaseRequest.dispatched_at)}</p>
                  {selectedPurchaseRequest.dispute_deadline && (
                    <p className="text-blue-800">
                      Dispute deadline: {new Date(selectedPurchaseRequest.dispute_deadline).toLocaleString()}
                    </p>
                  )}
                </div>
              )}

              {selectedPurchaseRequest.delivery_status === 'disputed' && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm">
                  <p className="font-medium text-red-900">Dispute Raised by Contractor</p>
                  {selectedPurchaseRequest.dispute_reason && (
                    <p className="text-red-800 mt-1">Reason: {selectedPurchaseRequest.dispute_reason}</p>
                  )}
                </div>
              )}

              {selectedPurchaseRequest.delivery_status === 'delivered' && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-sm">
                  <p className="font-medium text-green-900">Delivered</p>
                  <p className="text-green-800">Delivered at: {formatDate(selectedPurchaseRequest.delivered_at)}</p>
                  {selectedPurchaseRequest.invoice_generated_at && (
                    <p className="text-green-800">Invoice generated: {formatDate(selectedPurchaseRequest.invoice_generated_at)}</p>
                  )}
                  {(selectedPurchaseRequest.invoice_download_url || selectedPurchaseRequest.invoice_url) && (
                    <a
                      href={selectedPurchaseRequest.invoice_download_url || selectedPurchaseRequest.invoice_url || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mt-2 px-3 py-1.5 rounded border border-green-300 text-green-700 bg-white hover:bg-green-50"
                    >
                      View Invoice
                    </a>
                  )}
                </div>
              )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Add Contractor Modal */}
      {showAddContractor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-dark rounded-lg border border-neutral-medium max-w-md w-full">
            <div className="p-6 border-b border-neutral-medium">
              <h2 className="text-xl font-semibold text-primary">Add New Contractor</h2>
              <p className="text-sm text-secondary mt-1">Pre-register a contractor and send them a Clerk invitation</p>
            </div>
            <form onSubmit={handleAddContractor} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-primary mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={addContractorForm.email}
                  onChange={(e) => setAddContractorForm({ ...addContractorForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-medium rounded-md bg-neutral-darker text-primary placeholder-secondary focus:outline-none focus:ring-2 focus:ring-accent-orange"
                  placeholder="contractor@company.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-primary mb-1">Contact Person *</label>
                <input
                  type="text"
                  required
                  value={addContractorForm.contact_person}
                  onChange={(e) => setAddContractorForm({ ...addContractorForm, contact_person: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-medium rounded-md bg-neutral-darker text-primary placeholder-secondary focus:outline-none focus:ring-2 focus:ring-accent-orange"
                  placeholder="Full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-primary mb-1">Company Name *</label>
                <input
                  type="text"
                  required
                  value={addContractorForm.company_name}
                  onChange={(e) => setAddContractorForm({ ...addContractorForm, company_name: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-medium rounded-md bg-neutral-darker text-primary placeholder-secondary focus:outline-none focus:ring-2 focus:ring-accent-orange"
                  placeholder="Company Ltd."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-primary mb-1">Phone</label>
                <input
                  type="tel"
                  value={addContractorForm.phone}
                  onChange={(e) => setAddContractorForm({ ...addContractorForm, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-medium rounded-md bg-neutral-darker text-primary placeholder-secondary focus:outline-none focus:ring-2 focus:ring-accent-orange"
                  placeholder="+91 98765 43210"
                />
              </div>
              <div className="flex space-x-3 pt-2">
                <Button type="submit" variant="primary" disabled={addContractorLoading}>
                  {addContractorLoading ? 'Adding...' : 'Add Contractor'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowAddContractor(false);
                    setAddContractorForm({ email: '', contact_person: '', company_name: '', phone: '' });
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
