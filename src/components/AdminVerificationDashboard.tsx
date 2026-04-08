'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components';
import { type DocumentType } from '@/lib/document-service';
import type { Contractor } from '@/types/supabase';
import SimplePDFViewer from './SimplePDFViewer';
import ContractorAgreementPanel from '@/components/admin/ContractorAgreementPanel';
import ContractorUnderwritingPanel from '@/components/admin/ContractorUnderwritingPanel';
import FuelProviderAgreementPanel from '@/components/admin/FuelProviderAgreementPanel';
import AdminProjectReviewPanel from '@/components/admin/AdminProjectReviewPanel';
import { getPurchaseRequestDisplayState } from '@/lib/purchase-request-state';

interface ContractorWithDocuments extends Contractor {
  uploadProgress: number;
  verificationProgress: number;
  agreementSummary?: {
    masterAgreement: { id: string | null; status: string | null };
    financingAgreement: { id: string | null; status: string | null };
  } | null;
  underwriting?: {
    status: string | null;
    financing_limit: number | null;
    repayment_basis: string | null;
    payment_window_days: number | null;
    late_default_terms: string | null;
    notes: string | null;
  } | null;
  onboarding?: {
    onboardingStage: string;
    portalActive: boolean;
    procurementEnabled: boolean;
    financingEnabled: boolean;
    message: string;
    missingChecklist: string[];
  } | null;
}

interface MaterialRequest {
  id: string;
  requested_by: string;
  name: string;
  hsn_code?: string | null;
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

interface MasterMaterial {
  id: string;
  name: string;
  category: string;
  unit: string;
  hsn_code?: string | null;
  description?: string | null;
  approval_status?: string | null;
  created_at?: string;
}

type EditableMaterialField = 'name' | 'category' | 'unit' | 'hsn_code';

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

interface FuelAccountSummary {
  overdraftAllowed: boolean;
  overdraftLimitAmount: number;
  warningThresholdAmount: number;
  availableBalance: number;
  outstandingAmount: number;
  fuelConsumedAmount: number;
  platformFeeCharged: number;
  dailyFeeAccrued: number;
  pendingApprovalAmount: number;
  pendingApprovalCount: number;
  platformFeeRate: number;
  dailyFeeRate: number;
}

interface FuelFinanceOverview {
  smeReceivables: number;
  providerPayables: number;
  platformFeeEarned: number;
  dailyFeeAccrued: number;
  netExposure: number;
}

interface FuelLedgerRow {
  id: string;
  created_at: string;
  ownerType: 'contractor' | 'fuel_pump';
  ownerId: string;
  ownerLabel: string;
  accountKind: 'sme_fuel' | 'provider_settlement';
  mode: 'cash_carry' | 'credit' | 'settlement';
  entryType: string;
  direction: 'debit' | 'credit';
  amount: number;
  referenceType: string;
  referenceId: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
}

interface PurchaseRequestItemUI {
  id: string;
  project_material_id: string;
  hsn_code?: string | null;
  item_description?: string | null;
  site_unit?: string | null;
  purchase_unit?: string | null;
  conversion_factor?: number | null;
  purchase_qty?: number | null;
  normalized_qty?: number | null;
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
  delivery_status?: 'not_dispatched' | 'dispatched' | 'backfill_pending_confirmation' | 'disputed' | 'delivered' | null;
  dispatched_at?: string | null;
  dispute_deadline?: string | null;
  dispute_raised_at?: string | null;
  dispute_reason?: string | null;
  delivered_at?: string | null;
  backfill_recorded_at?: string | null;
  backfill_recorded_by?: string | null;
  backfill_reason?: string | null;
  invoice_generated_at?: string | null;
  invoice_url?: string | null;
  invoice_download_url?: string | null;
  funded_amount?: number | null;
  returned_amount?: number | null;
  remaining_due?: number | null;
  latest_repayment_submission_status?: string | null;
  contractors?: {
    id?: string;
    company_name: string;
    contact_person?: string;
    email?: string;
  };
  project?: {
    name?: string;
    client_name?: string | null;
    project_address?: string | null;
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

interface ApprovedPump {
  id: string;
  pump_id: string;
  is_active: boolean;
  fuel_pumps: {
    id: string;
    pump_name: string;
    oem_name?: string | null;
    city: string;
    state: string;
  };
}

export default function AdminVerificationDashboard(): React.ReactElement {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<'contractors' | 'projects' | 'agreements' | 'materials' | 'takeoffs' | 'purchases' | 'fuel' | 'fuel-providers'>('contractors');
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
  const [editingTerms, setEditingTerms] = useState(false);
  const [fuelSettingsForm, setFuelSettingsForm] = useState({
    overdraftAllowed: true,
    overdraftLimitAmount: '50000',
    warningThresholdAmount: '5000',
    monthlyFuelBudget: '50000',
    perRequestMaxAmount: '10000',
    perRequestMaxLiters: '100',
    maxFillsPerVehiclePerDay: '1',
    minHoursBetweenFills: '12',
    autoApproveEnabled: true
  });
  const [fuelAccountSummary, setFuelAccountSummary] = useState<FuelAccountSummary | null>(null);
  const [fuelFinanceOverview, setFuelFinanceOverview] = useState<FuelFinanceOverview | null>(null);
  const [fuelReceiptForm, setFuelReceiptForm] = useState({ amount: '', notes: '' });
  const [fuelReceiptSaving, setFuelReceiptSaving] = useState(false);
  const [providerSettlementForm, setProviderSettlementForm] = useState<Record<string, { amount: string; notes: string }>>({});
  const [providerSettlementSavingId, setProviderSettlementSavingId] = useState<string | null>(null);
  const [selectedContractorFuelLedger, setSelectedContractorFuelLedger] = useState<FuelLedgerRow[]>([]);
  const [providerFuelLedger, setProviderFuelLedger] = useState<FuelLedgerRow[]>([]);
  const [fuelSettingsSaving, setFuelSettingsSaving] = useState(false);
  const [editingFuelSettings, setEditingFuelSettings] = useState(false);
  const [selectedMaterialRequest, setSelectedMaterialRequest] = useState<MaterialRequest | null>(null);
  const [masterMaterials, setMasterMaterials] = useState<MasterMaterial[]>([]);
  const [masterMaterialsLoading, setMasterMaterialsLoading] = useState(false);
  const [masterMaterialsSearch, setMasterMaterialsSearch] = useState('');
  const [editingCell, setEditingCell] = useState<{ materialId: string; field: EditableMaterialField } | null>(null);
  const [editingCellValue, setEditingCellValue] = useState('');
  const [savingCellKey, setSavingCellKey] = useState<string | null>(null);
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
  const [generatingPO, setGeneratingPO] = useState(false);
  const [generatingFeeInvoiceKind, setGeneratingFeeInvoiceKind] = useState<string | null>(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [purchaseAdminNotes, setPurchaseAdminNotes] = useState('');
  const [showBackfillDeliveryModal, setShowBackfillDeliveryModal] = useState(false);
  const [backfillDeliveryForm, setBackfillDeliveryForm] = useState({
    deliveredAt: '',
    reason: 'Delivery completed earlier; admin backfill recorded.'
  });
  const [fuelPumps, setFuelPumps] = useState<any[]>([]);
  const [approvedPumps, setApprovedPumps] = useState<ApprovedPump[]>([]);
  const [showAddPump, setShowAddPump] = useState(false);
  const [emailForm, setEmailForm] = useState({ value: '' });
  const [emailSaving, setEmailSaving] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [gstReviewForm, setGstReviewForm] = useState({ verified: false, notes: '' });
  const [gstReviewSaving, setGstReviewSaving] = useState(false);
  const [editingGstReview, setEditingGstReview] = useState(false);
  const [addPumpForm, setAddPumpForm] = useState({
    pump_name: '',
    oem_name: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    contact_person: '',
    contact_phone: ''
  });
  const [addPumpLoading, setAddPumpLoading] = useState(false);
  const [generatingPumpAccessId, setGeneratingPumpAccessId] = useState<string | null>(null);
  const [selectedFuelProviderPumpId, setSelectedFuelProviderPumpId] = useState<string | null>(null);
  const fuelOemOptions = [
    'Indian Oil',
    'Bharat Petroleum',
    'Hindustan Petroleum',
    'Shell',
    'Nayara Energy',
    'Reliance',
    'Other / Independent',
  ];

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return 'N/A';
    }
  };

  const formatLedgerEntryType = (entryType: string) =>
    entryType.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

  const formatDateTimeLocalValue = (date: Date) => {
    const pad = (value: number) => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  const renderContractorSelector = ({
    title,
    description,
    showAddButton = false,
  }: {
    title: string;
    description: string;
    showAddButton?: boolean;
  }) => (
    <div className="bg-neutral-dark rounded-lg border border-neutral-medium p-5">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-primary">{title}</h2>
          <p className="text-sm text-secondary">{description}</p>
        </div>
        {selectedContractor ? (
          <div className="rounded-lg border border-neutral-medium bg-neutral-darker px-4 py-3 min-w-[280px]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-primary">{selectedContractor.company_name}</div>
                <div className="text-xs text-secondary">{selectedContractor.email}</div>
              </div>
              <span className={`text-xs px-2 py-1 rounded border whitespace-nowrap ${getStatusColor(selectedContractor.verification_status)}`}>
                {selectedContractor.verification_status.replace(/_/g, ' ').toUpperCase()}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3 text-xs text-secondary">
              <div>
                Uploaded
                <div className="text-primary font-medium mt-1">{selectedContractor.uploadProgress}%</div>
              </div>
              <div>
                Verified
                <div className="text-primary font-medium mt-1">{selectedContractor.verificationProgress}%</div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr),auto] gap-4 mt-5">
        <label className="block">
          <span className="text-sm text-secondary">Select SME</span>
          <select
            value={selectedContractor?.id || ''}
            onChange={(event) => {
              const contractor = contractors.find((item) => item.id === event.target.value) || null;
              setSelectedContractor(contractor);
            }}
            className="mt-2 w-full px-3 py-2 rounded-lg border border-neutral-medium bg-neutral-darker text-primary focus:outline-none focus:ring-2 focus:ring-accent-orange"
          >
            <option value="">Select an SME</option>
            {contractors.map((contractor) => (
              <option key={contractor.id} value={contractor.id}>
                {contractor.company_name} · {contractor.verification_status.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </label>

        {showAddButton ? (
          <div className="flex items-end">
            <button
              onClick={() => setShowAddContractor(true)}
              className="px-4 py-2 rounded-lg bg-accent-orange text-white hover:bg-accent-orange/80 transition-colors whitespace-nowrap"
            >
              + Add SME
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );

  const refreshContractors = async () => {
    await loadContractors();
  };

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (
      tab === 'contractors' ||
      tab === 'projects' ||
      tab === 'agreements' ||
      tab === 'materials' ||
      tab === 'takeoffs' ||
      tab === 'purchases' ||
      tab === 'fuel' ||
      tab === 'fuel-providers'
    ) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  useEffect(() => {
    if (activeTab === 'contractors' || activeTab === 'agreements') {
      loadContractors();
    } else if (activeTab === 'projects') {
      loadContractors();
    } else if (activeTab === 'fuel') {
      loadContractors();
      loadFuelPumps();
      loadFuelFinanceOverview();
    } else if (activeTab === 'materials') {
      loadMaterialRequests();
      loadMasterMaterials();
    } else if (activeTab === 'takeoffs') {
      loadTakeoffItems();
    } else if (activeTab === 'purchases') {
      loadPurchaseRequests(prStatusFilter);
    } else if (activeTab === 'fuel-providers') {
      loadFuelPumps();
      loadFuelFinanceOverview();
      loadProviderFuelLedger();
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

  useEffect(() => {
    if (!selectedContractor) return;
    loadFuelSettings(selectedContractor.id);
    if (activeTab === 'fuel') {
      loadSelectedContractorFuelLedger(selectedContractor.id);
    }
  }, [selectedContractor]);

  useEffect(() => {
    if (activeTab !== 'fuel' || !selectedContractor) return;
    fetchApprovedPumps(selectedContractor.id);
  }, [activeTab, selectedContractor?.id]);

  useEffect(() => {
    setEmailForm({ value: selectedContractor?.email ?? '' });
    setGstReviewForm({
      verified: selectedContractor?.gst_manual_verified ?? false,
      notes: selectedContractor?.gst_manual_verification_notes ?? ''
    });
    setEditingEmail(false);
    setEditingGstReview(false);
    setEditingTerms(false);
    setEditingFuelSettings(false);
  }, [selectedContractor?.id, selectedContractor?.email, selectedContractor?.gst_manual_verified, selectedContractor?.gst_manual_verification_notes]);

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
      setEditingTerms(false);
    } catch (error) {
      console.error('Failed to update finance terms:', error);
      alert(error instanceof Error ? error.message : 'Failed to update finance terms');
    } finally {
      setTermsSaving(false);
    }
  };

  const handleSaveContractorEmail = async () => {
    if (!selectedContractor) return;

    const normalizedEmail = emailForm.value.trim().toLowerCase();
    if (!normalizedEmail) {
      alert('Email is required.');
      return;
    }

    if (normalizedEmail === selectedContractor.email.toLowerCase()) {
      alert('No email change to save.');
      return;
    }

    setEmailSaving(true);
    try {
      const response = await fetch('/api/admin/contractors', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractorId: selectedContractor.id,
          action: 'update_email',
          email: normalizedEmail
        })
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to update contractor email');
      }

      const updatedEmail = result.data?.email || normalizedEmail;

      setSelectedContractor({
        ...selectedContractor,
        email: updatedEmail
      });

      setContractors((prev) =>
        prev.map((contractor) =>
          contractor.id === selectedContractor.id
            ? { ...contractor, email: updatedEmail }
            : contractor
        )
      );

      setEmailForm({ value: updatedEmail });
      setEditingEmail(false);
      alert('SME email updated successfully.');
    } catch (error) {
      console.error('Failed to update contractor email:', error);
      alert(error instanceof Error ? error.message : 'Failed to update SME email');
    } finally {
      setEmailSaving(false);
    }
  };

  const handleSaveGstReview = async () => {
    if (!selectedContractor) return;

    setGstReviewSaving(true);
    try {
      const response = await fetch('/api/admin/contractors', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractorId: selectedContractor.id,
          action: 'update_gst_manual_verification',
          gst_manual_verified: gstReviewForm.verified,
          gst_manual_verification_notes: gstReviewForm.notes
        })
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to save GST review');
      }

      const updatedContractor = {
        ...selectedContractor,
        gst_manual_verified: gstReviewForm.verified,
        gst_manual_verified_at: gstReviewForm.verified ? new Date().toISOString() : null,
        gst_manual_verified_by: gstReviewForm.verified ? 'admin' : null,
        gst_manual_verification_notes: gstReviewForm.notes.trim() || null
      };

      setSelectedContractor(updatedContractor);
      setContractors((prev) =>
        prev.map((contractor) =>
          contractor.id === selectedContractor.id ? updatedContractor : contractor
        )
      );
      setEditingGstReview(false);
      alert('GST review updated successfully.');
    } catch (error) {
      console.error('Failed to save GST review:', error);
      alert(error instanceof Error ? error.message : 'Failed to save GST review');
    } finally {
      setGstReviewSaving(false);
    }
  };

  const loadFuelSettings = async (contractorId: string) => {
    try {
      const response = await fetch(`/api/admin/fuel-settings/${contractorId}`);
      const result = await response.json();

      if (result.success && result.data?.settings) {
        const settings = result.data.settings;
        setFuelSettingsForm({
          overdraftAllowed: Boolean(settings.overdraft_allowed),
          overdraftLimitAmount: settings.overdraft_limit_amount?.toString() || '50000',
          warningThresholdAmount: settings.warning_threshold_amount?.toString() || '5000',
          monthlyFuelBudget: settings.monthly_fuel_budget?.toString() || '50000',
          perRequestMaxAmount: settings.per_request_max_amount?.toString() || '10000',
          perRequestMaxLiters: settings.per_request_max_liters?.toString() || '100',
          maxFillsPerVehiclePerDay: settings.max_fills_per_vehicle_per_day?.toString() || '1',
          minHoursBetweenFills: settings.min_hours_between_fills?.toString() || '12',
          autoApproveEnabled: settings.auto_approve_enabled ?? true
        });
        setFuelAccountSummary(result.data.account_summary || null);
      } else {
        // Set defaults if no settings exist
        setFuelSettingsForm({
          overdraftAllowed: true,
          overdraftLimitAmount: '50000',
          warningThresholdAmount: '5000',
          monthlyFuelBudget: '50000',
          perRequestMaxAmount: '10000',
          perRequestMaxLiters: '100',
          maxFillsPerVehiclePerDay: '1',
          minHoursBetweenFills: '12',
          autoApproveEnabled: true
        });
        setFuelAccountSummary(null);
      }
    } catch (error) {
      console.error('Failed to load fuel settings:', error);
      // Set defaults on error
      setFuelSettingsForm({
        overdraftAllowed: true,
        overdraftLimitAmount: '50000',
        warningThresholdAmount: '5000',
        monthlyFuelBudget: '50000',
        perRequestMaxAmount: '10000',
        perRequestMaxLiters: '100',
        maxFillsPerVehiclePerDay: '1',
        minHoursBetweenFills: '12',
        autoApproveEnabled: true
      });
      setFuelAccountSummary(null);
    }
  };

  const handleSaveFuelSettings = async () => {
    if (!selectedContractor) return;

    const overdraftLimitAmount = parseFloat(fuelSettingsForm.overdraftLimitAmount);
    const warningThresholdAmount = parseFloat(fuelSettingsForm.warningThresholdAmount);
    const monthlyBudget = parseFloat(fuelSettingsForm.monthlyFuelBudget);
    const perRequestAmount = parseFloat(fuelSettingsForm.perRequestMaxAmount);
    const perRequestLiters = parseFloat(fuelSettingsForm.perRequestMaxLiters);
    const maxFillsPerDay = parseInt(fuelSettingsForm.maxFillsPerVehiclePerDay);
    const minHours = parseFloat(fuelSettingsForm.minHoursBetweenFills);

    if (Number.isNaN(overdraftLimitAmount) || Number.isNaN(warningThresholdAmount) || Number.isNaN(monthlyBudget) || Number.isNaN(perRequestAmount) || Number.isNaN(perRequestLiters) || Number.isNaN(maxFillsPerDay) || Number.isNaN(minHours)) {
      alert('Please enter valid numbers for all fuel settings.');
      return;
    }

    setFuelSettingsSaving(true);
    try {
      const response = await fetch(`/api/admin/fuel-settings/${selectedContractor.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          overdraft_allowed: fuelSettingsForm.overdraftAllowed,
          overdraft_limit_amount: overdraftLimitAmount,
          warning_threshold_amount: warningThresholdAmount,
          monthly_fuel_budget: monthlyBudget,
          per_request_max_amount: perRequestAmount,
          per_request_max_liters: perRequestLiters,
          max_fills_per_vehicle_per_day: maxFillsPerDay,
          min_hours_between_fills: minHours,
          auto_approve_enabled: fuelSettingsForm.autoApproveEnabled
        })
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to update fuel settings');
      }

      setFuelAccountSummary(result.data?.account_summary || null);
      alert('Fuel settings updated successfully');
      setEditingFuelSettings(false);
    } catch (error) {
      console.error('Failed to update fuel settings:', error);
      alert(error instanceof Error ? error.message : 'Failed to update fuel settings');
    } finally {
      setFuelSettingsSaving(false);
    }
  };

  const loadFuelPumps = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/fuel-pumps');
      const result = await response.json();

      if (result.success) {
        setFuelPumps(result.data || []);
        setSelectedFuelProviderPumpId((prev) => {
          if (!result.data?.length) return null;
          if (prev && result.data.some((pump: any) => pump.id === prev)) return prev;
          return result.data[0].id;
        });
      } else {
        console.error('Failed to load fuel pumps:', result.error);
        alert('Failed to load fuel pumps');
      }
    } catch (error) {
      console.error('Error loading fuel pumps:', error);
      alert('Error loading fuel pumps');
    } finally {
      setLoading(false);
    }
  };

  const loadFuelFinanceOverview = async () => {
    try {
      const response = await fetch('/api/admin/fuel-finance/overview');
      const result = await response.json();
      if (response.ok && result.success) {
        setFuelFinanceOverview(result.data?.summary || null);
      }
    } catch (error) {
      console.error('Failed to load fuel finance overview:', error);
    }
  };

  const loadSelectedContractorFuelLedger = async (contractorId: string) => {
    try {
      const response = await fetch(`/api/admin/fuel-finance/ledger?contractor_id=${contractorId}&limit=20`);
      const result = await response.json();
      if (response.ok && result.success) {
        setSelectedContractorFuelLedger(result.data || []);
      }
    } catch (error) {
      console.error('Failed to load SME fuel ledger:', error);
    }
  };

  const loadProviderFuelLedger = async () => {
    try {
      const response = await fetch('/api/admin/fuel-finance/ledger?limit=30');
      const result = await response.json();
      if (response.ok && result.success) {
        setProviderFuelLedger((result.data || []).filter((row: FuelLedgerRow) => row.ownerType === 'fuel_pump'));
      }
    } catch (error) {
      console.error('Failed to load provider fuel ledger:', error);
    }
  };

  const fetchApprovedPumps = async (contractorId: string) => {
    try {
      const response = await fetch(`/api/admin/contractor-pumps/${contractorId}`);
      const result = await response.json();

      if (response.ok && result.success) {
        setApprovedPumps(result.data || []);
      } else {
        setApprovedPumps([]);
      }
    } catch (error) {
      console.error('Failed to fetch approved pumps:', error);
      setApprovedPumps([]);
    }
  };

  const handleApprovePump = async (pumpId: string) => {
    if (!selectedContractor) return;

    try {
      const response = await fetch(`/api/admin/contractor-pumps/${selectedContractor.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pump_id: pumpId }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to approve pump');
      }

      await fetchApprovedPumps(selectedContractor.id);
      alert('Pump approved successfully');
    } catch (error) {
      console.error('Failed to approve pump:', error);
      alert(error instanceof Error ? error.message : 'Failed to approve pump');
    }
  };

  const handleRemovePump = async (pumpId: string) => {
    if (!selectedContractor) return;

    try {
      const response = await fetch(
        `/api/admin/contractor-pumps/${selectedContractor.id}?pump_id=${pumpId}`,
        { method: 'DELETE' }
      );

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to remove pump');
      }

      await fetchApprovedPumps(selectedContractor.id);
      alert('Pump removed successfully');
    } catch (error) {
      console.error('Failed to remove pump:', error);
      alert(error instanceof Error ? error.message : 'Failed to remove pump');
    }
  };

  const handleRecordFuelReceipt = async () => {
    if (!selectedContractor) return;

    const amount = parseFloat(fuelReceiptForm.amount);
    if (Number.isNaN(amount) || amount <= 0) {
      alert('Enter a valid receipt amount.');
      return;
    }

    setFuelReceiptSaving(true);
    try {
      const response = await fetch('/api/admin/fuel-finance/sme-payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractor_id: selectedContractor.id,
          amount,
          notes: fuelReceiptForm.notes.trim() || undefined,
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to record SME receipt');
      }

      setFuelReceiptForm({ amount: '', notes: '' });
      await loadFuelSettings(selectedContractor.id);
      await loadFuelFinanceOverview();
      await loadSelectedContractorFuelLedger(selectedContractor.id);
      alert('SME receipt recorded successfully');
    } catch (error) {
      console.error('Failed to record SME receipt:', error);
      alert(error instanceof Error ? error.message : 'Failed to record SME receipt');
    } finally {
      setFuelReceiptSaving(false);
    }
  };

  const handleProviderSettlementChange = (pumpId: string, field: 'amount' | 'notes', value: string) => {
    setProviderSettlementForm((prev) => ({
      ...prev,
      [pumpId]: {
        amount: prev[pumpId]?.amount || '',
        notes: prev[pumpId]?.notes || '',
        [field]: value,
      },
    }));
  };

  const handleRecordProviderSettlement = async (pumpId: string) => {
    const form = providerSettlementForm[pumpId] || { amount: '', notes: '' };
    const amount = parseFloat(form.amount);
    if (Number.isNaN(amount) || amount <= 0) {
      alert('Enter a valid settlement amount.');
      return;
    }

    setProviderSettlementSavingId(pumpId);
    try {
      const response = await fetch('/api/admin/fuel-finance/provider-settlements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pump_id: pumpId,
          amount,
          notes: form.notes.trim() || undefined,
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to record provider settlement');
      }

      setProviderSettlementForm((prev) => ({
        ...prev,
        [pumpId]: { amount: '', notes: '' },
      }));
      await loadFuelPumps();
      await loadFuelFinanceOverview();
      await loadProviderFuelLedger();
      alert('Provider settlement recorded successfully');
    } catch (error) {
      console.error('Failed to record provider settlement:', error);
      alert(error instanceof Error ? error.message : 'Failed to record provider settlement');
    } finally {
      setProviderSettlementSavingId(null);
    }
  };

  const handleGenerateInvoice = async (purchaseRequestId: string, forceRegenerate = false) => {
    if (!confirm(`Are you sure you want to ${forceRegenerate ? 'regenerate' : 'generate'} the invoice?`)) {
      return;
    }

    setGeneratingPO(true);
    try {
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purchase_request_id: purchaseRequestId,
          force_regenerate: forceRegenerate
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to generate invoice');
      }

      alert(`Invoice ${result.regenerated ? 'regenerated' : 'generated'} successfully: ${result.invoiceNumber}`);

      // Reload purchase requests to show updated invoice status
      loadPurchaseRequests(prStatusFilter);

      // If modal is open, refresh the selected PR
      if (selectedPurchaseRequest?.id === purchaseRequestId) {
        const { data } = await fetch(`/api/admin/purchase-requests?status=all&limit=1000`).then(r => r.json());
        const updated = data?.requests?.find((r: any) => r.id === purchaseRequestId);
        if (updated) {
          setSelectedPurchaseRequest(updated);
        }
      }
    } catch (error) {
      console.error('Failed to generate invoice:', error);
      alert(error instanceof Error ? error.message : 'Failed to generate invoice');
    } finally {
      setGeneratingPO(false);
    }
  };

  const handleGenerateFeeInvoice = async (
    purchaseRequestId: string,
    invoiceKind: 'repayment_fee',
    forceRegenerate = false
  ) => {
    const actionLabel = forceRegenerate ? 'regenerate' : 'generate';
    if (!confirm(`Are you sure you want to ${actionLabel} the Project Participation Fee invoice?`)) {
      return;
    }

    setGeneratingFeeInvoiceKind(invoiceKind);
    try {
      const response = await fetch('/api/admin/purchase-requests/fee-invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purchase_request_id: purchaseRequestId,
          invoice_kind: invoiceKind,
          force_regenerate: forceRegenerate
        })
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to generate Project Participation Fee invoice');
      }

      alert(`Project Participation Fee invoice ${result.regenerated ? 'regenerated' : result.alreadyExisted ? 'already exists' : 'generated'} successfully: ${result.invoiceNumber}`);

      if (result.invoiceUrl) {
        window.open(result.invoiceUrl, '_blank', 'noopener,noreferrer');
      }

      const refreshed = await loadPurchaseRequests(prStatusFilter);
      if (selectedPurchaseRequest?.id === purchaseRequestId) {
        const updatedSelection = refreshed.find(req => req.id === purchaseRequestId) || null;
        setSelectedPurchaseRequest(updatedSelection);
      }
    } catch (error) {
      console.error('Failed to generate Project Participation Fee invoice:', error);
      alert(error instanceof Error ? error.message : 'Failed to generate Project Participation Fee invoice');
    } finally {
      setGeneratingFeeInvoiceKind(null);
    }
  };

  const handleAddPump = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!addPumpForm.pump_name || !addPumpForm.city || !addPumpForm.state) {
      alert('Please fill in pump name, city, and state');
      return;
    }

    setAddPumpLoading(true);
    try {
      const response = await fetch('/api/admin/fuel-pumps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addPumpForm)
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to add fuel pump');
      }

      setAddPumpForm({
        pump_name: '',
        oem_name: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
        contact_person: '',
        contact_phone: ''
      });
      setShowAddPump(false);
      loadFuelPumps();
      alert('Fuel pump added successfully');
    } catch (error) {
      console.error('Failed to add fuel pump:', error);
      alert(error instanceof Error ? error.message : 'Failed to add fuel pump');
    } finally {
      setAddPumpLoading(false);
    }
  };

  const handleGeneratePumpAccess = async (pumpId: string) => {
    setGeneratingPumpAccessId(pumpId);
    try {
      const response = await fetch(`/api/admin/fuel-pumps/${pumpId}/access-code`, {
        method: 'POST',
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to generate dashboard access code');
      }

      await loadFuelPumps();
      alert(
        `Dashboard access code for ${result.data.pump_name}:\n\n${result.data.access_code}\n\nShare this securely with the pump operator.`
      );
    } catch (error) {
      console.error('Failed to generate pump access:', error);
      alert(error instanceof Error ? error.message : 'Failed to generate dashboard access code');
    } finally {
      setGeneratingPumpAccessId(null);
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

  const loadMasterMaterials = async () => {
    try {
      setMasterMaterialsLoading(true);
      const response = await fetch('/api/materials?include_pending=true&limit=500');
      const result = await response.json();
      if (response.ok && result?.success) {
        setMasterMaterials(result.data || []);
      } else {
        console.error('Failed to load master materials:', result?.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Error loading master materials:', error);
    } finally {
      setMasterMaterialsLoading(false);
    }
  };

  const startInlineEdit = (material: MasterMaterial, field: EditableMaterialField) => {
    setEditingCell({ materialId: material.id, field });
    setEditingCellValue(String(material[field] ?? ''));
  };

  const saveInlineEdit = async (material: MasterMaterial, field: EditableMaterialField) => {
    const trimmedValue = editingCellValue.trim();

    if (field !== 'hsn_code' && trimmedValue.length === 0) {
      alert(`${field.replace('_', ' ')} cannot be empty`);
      return;
    }

    const currentValue = String(material[field] ?? '').trim();
    if (trimmedValue === currentValue) {
      setEditingCell(null);
      setEditingCellValue('');
      return;
    }

    const cellKey = `${material.id}:${field}`;
    setSavingCellKey(cellKey);

    try {
      const payload: Record<string, string | null> = {
        [field]: field === 'hsn_code' ? (trimmedValue || null) : trimmedValue
      };

      const response = await fetch(`/api/materials/${material.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (!response.ok || !result?.success) {
        throw new Error(result?.error || 'Failed to update material');
      }

      setMasterMaterials((prev) =>
        prev.map((row) =>
          row.id === material.id
            ? {
                ...row,
                [field]: field === 'hsn_code' ? (trimmedValue || null) : trimmedValue
              }
            : row
        )
      );

      // Keep material request detail in sync if currently selected
      if (selectedMaterialRequest?.id === material.id) {
        setSelectedMaterialRequest((prev) => {
          if (!prev) return prev;
          if (field === 'name') return { ...prev, name: trimmedValue };
          if (field === 'category') return { ...prev, category: trimmedValue };
          if (field === 'unit') return { ...prev, unit: trimmedValue };
          if (field === 'hsn_code') return { ...prev, hsn_code: trimmedValue || null };
          return prev;
        });
      }
    } catch (error) {
      console.error('Failed to update material field:', error);
      alert(error instanceof Error ? error.message : 'Failed to update material');
    } finally {
      setSavingCellKey(null);
      setEditingCell(null);
      setEditingCellValue('');
    }
  };

  const renderEditableCell = (material: MasterMaterial, field: EditableMaterialField) => {
    const isEditing = editingCell?.materialId === material.id && editingCell?.field === field;
    const cellKey = `${material.id}:${field}`;
    const isSaving = savingCellKey === cellKey;
    const value = material[field];

    if (isEditing) {
      return (
        <input
          autoFocus
          value={editingCellValue}
          onChange={(e) => setEditingCellValue(e.target.value)}
          onBlur={() => saveInlineEdit(material, field)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              saveInlineEdit(material, field);
            } else if (e.key === 'Escape') {
              e.preventDefault();
              setEditingCell(null);
              setEditingCellValue('');
            }
          }}
          disabled={isSaving}
          className="w-full px-2 py-1 rounded border border-neutral-light bg-neutral-dark text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent-orange"
        />
      );
    }

    return (
      <button
        type="button"
        className="w-full text-left text-sm text-secondary hover:text-primary hover:underline disabled:opacity-60"
        onClick={() => startInlineEdit(material, field)}
        disabled={isSaving}
        title="Click to edit"
      >
        {isSaving ? 'Saving...' : (value || '-')}
      </button>
    );
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

  const handleGeneratePO = async () => {
    if (!selectedPurchaseRequest) return;

    if (!selectedPurchaseRequest.vendor_id) {
      alert('Please assign a vendor before generating Purchase Order');
      return;
    }

    const confirmed = confirm('Generate Purchase Order for this request?');
    if (!confirmed) return;

    setGeneratingPO(true);
    try {
      const response = await fetch(`/api/admin/purchase-orders/${selectedPurchaseRequest.id}`, {
        method: 'POST',
      });

      if (!response.ok) {
        const result = await response.json();
        alert(result.error || 'Failed to generate Purchase Order');
        return;
      }

      // Download PDF
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `PO_${selectedPurchaseRequest.id.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      alert('Purchase Order generated and downloaded successfully!');

      // Refresh to update status
      const refreshed = await loadPurchaseRequests();
      const updated = (refreshed as PurchaseRequest[]).find(r => r.id === selectedPurchaseRequest.id) || null;
      setSelectedPurchaseRequest(updated);
    } catch (err) {
      console.error('Error generating PO:', err);
      alert('Error generating Purchase Order');
    } finally {
      setGeneratingPO(false);
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

  const handleBackfillDelivered = async () => {
    if (!selectedPurchaseRequest) return;

    setDispatchLoading(true);
    try {
      const response = await fetch('/api/admin/delivery', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purchase_request_id: selectedPurchaseRequest.id,
          delivered_at: backfillDeliveryForm.deliveredAt
            ? new Date(backfillDeliveryForm.deliveredAt).toISOString()
            : undefined,
          backfill_reason: backfillDeliveryForm.reason.trim(),
        }),
      });
      const result = await response.json();
      if (result.success) {
        alert('Backfilled delivery recorded. Contractor now has 2 days to dispute before auto-confirmation.');
        const refreshed = await loadPurchaseRequests();
        const updated = (refreshed as PurchaseRequest[]).find(r => r.id === selectedPurchaseRequest.id) || null;
        setSelectedPurchaseRequest(updated);
        setShowBackfillDeliveryModal(false);
      } else {
        alert(result.error || 'Failed to record delivered backfill');
      }
    } catch (err) {
      console.error('Error backfilling delivery:', err);
      alert('Error recording delivered backfill');
    } finally {
      setDispatchLoading(false);
    }
  };

  const openPurchaseModal = (request: PurchaseRequest) => {
    setSelectedPurchaseRequest(request);
    setPurchaseAdminNotes(request.approval_notes || '');
    setBackfillDeliveryForm({
      deliveredAt: formatDateTimeLocalValue(new Date()),
      reason: 'Delivery completed earlier; admin backfill recorded.'
    });
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
      alert(`SME added. Invitation sent to ${addContractorForm.email}`);
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
        <span className="ml-3 text-secondary">Loading SMEs...</span>
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
              SME Verification
            </button>
            <button
              onClick={() => setActiveTab('projects')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'projects'
                  ? 'bg-neutral-dark text-primary'
                  : 'text-secondary hover:text-primary'
              }`}
            >
              Projects &amp; POs
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
            <button
              onClick={() => window.location.href = '/admin/bulk-orders'}
              className="px-4 py-2 rounded-md text-sm font-medium transition-colors text-secondary hover:text-primary"
            >
              Bulk Purchase
            </button>
            <button
              onClick={() => setActiveTab('fuel')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'fuel'
                  ? 'bg-neutral-dark text-primary'
                  : 'text-secondary hover:text-primary'
              }`}
            >
              Fuel Settings
            </button>
            <button
              onClick={() => setActiveTab('agreements')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'agreements'
                  ? 'bg-neutral-dark text-primary'
                  : 'text-secondary hover:text-primary'
              }`}
            >
              Agreements
            </button>
            <button
              onClick={() => setActiveTab('fuel-providers')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'fuel-providers'
                  ? 'bg-neutral-dark text-primary'
                  : 'text-secondary hover:text-primary'
              }`}
            >
              Fuel Providers
            </button>
          </div>
        </div>
      </div>

      {/* Conditional Content Based on Active Tab */}
      {activeTab === 'contractors' ? (
        <div className="space-y-6">
          {renderContractorSelector({
            title: 'SME Verification',
            description: 'Manage SME registrations, KYC, commercial terms, and onboarding readiness.',
            showAddButton: true,
          })}
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
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-primary">Activation & Product Access</h3>
                      <p className="text-xs text-secondary">Portal activation now depends on KYC, executed agreements, and commercial approval.</p>
                    </div>
                    <div className="text-right text-xs">
                      <div className={`px-3 py-1 rounded border ${selectedContractor.onboarding?.portalActive ? 'border-success text-success' : 'border-neutral-medium text-secondary'}`}>
                        Portal {selectedContractor.onboarding?.portalActive ? 'ACTIVE' : 'PENDING'}
                      </div>
                    </div>
                  </div>
                  <div className="grid md:grid-cols-4 gap-4 mt-4 text-sm">
                    <div className="rounded-lg border border-neutral-medium p-4">
                      <div className="text-secondary mb-1">Onboarding Stage</div>
                      <div className="text-primary font-medium">{selectedContractor.onboarding?.onboardingStage?.replace(/_/g, ' ') || 'documents pending'}</div>
                    </div>
                    <div className="rounded-lg border border-neutral-medium p-4">
                      <div className="text-secondary mb-1">Master Agreement</div>
                      <div className="text-primary font-medium">{selectedContractor.agreementSummary?.masterAgreement.status?.replace(/_/g, ' ') || 'not started'}</div>
                    </div>
                    <div className="rounded-lg border border-neutral-medium p-4">
                      <div className="text-secondary mb-1">Financing Addendum</div>
                      <div className="text-primary font-medium">{selectedContractor.agreementSummary?.financingAgreement.status?.replace(/_/g, ' ') || 'not started'}</div>
                    </div>
                    <div className="rounded-lg border border-neutral-medium p-4">
                      <div className="text-secondary mb-1">Commercial Review</div>
                      <div className="text-primary font-medium">{selectedContractor.underwriting?.status?.replace(/_/g, ' ') || 'not started'}</div>
                    </div>
                  </div>
                  <p className="text-sm text-secondary mt-4">{selectedContractor.onboarding?.message || 'Complete KYC, execute the master agreement, and approve commercial terms to activate access.'}</p>
                  {!!selectedContractor.onboarding?.missingChecklist?.length && (
                    <p className="text-xs text-accent-orange mt-2">
                      Missing onboarding items: {selectedContractor.onboarding.missingChecklist.join(', ')}
                    </p>
                  )}
                </div>

                <div className="bg-neutral-darker/60 border border-neutral-medium rounded-lg p-4 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-primary">Registered Email</h3>
                      <p className="text-xs text-secondary">Updates the SME login/contact email in Finverno and Clerk.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {editingEmail && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEmailForm({ value: selectedContractor?.email ?? '' });
                            setEditingEmail(false);
                          }}
                          disabled={emailSaving}
                        >
                          Cancel
                        </Button>
                      )}
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={editingEmail ? handleSaveContractorEmail : () => setEditingEmail(true)}
                        disabled={emailSaving}
                      >
                        {emailSaving ? 'Updating...' : editingEmail ? 'Save Email' : 'Edit Email'}
                      </Button>
                    </div>
                  </div>
                  <label className="block text-sm">
                    <span className="text-secondary">SME Email</span>
                    <input
                      type="email"
                      value={emailForm.value}
                      onChange={(event) => setEmailForm({ value: event.target.value })}
                      disabled={!editingEmail}
                      className="mt-2 w-full px-3 py-2 rounded-lg border border-neutral-medium bg-neutral-dark text-primary focus:outline-none focus:ring-2 focus:ring-accent-orange"
                      placeholder="Enter SME email"
                    />
                  </label>
                </div>

                <div className="bg-neutral-darker/60 border border-neutral-medium rounded-lg p-4 mb-6">
                  <div className="flex items-center justify-between mb-4 gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-primary">Manual GST Review</h3>
                      <p className="text-xs text-secondary">Track whether GST details were manually checked on the GST portal.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {editingGstReview && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setGstReviewForm({
                              verified: selectedContractor?.gst_manual_verified ?? false,
                              notes: selectedContractor?.gst_manual_verification_notes ?? ''
                            });
                            setEditingGstReview(false);
                          }}
                          disabled={gstReviewSaving}
                        >
                          Cancel
                        </Button>
                      )}
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={editingGstReview ? handleSaveGstReview : () => setEditingGstReview(true)}
                        disabled={gstReviewSaving}
                      >
                        {gstReviewSaving ? 'Saving...' : editingGstReview ? 'Save GST Review' : 'Edit GST Review'}
                      </Button>
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4 text-sm mb-4">
                    <div className="rounded-lg border border-neutral-medium p-4">
                      <div className="text-secondary mb-1">Manual GST Status</div>
                      <div className={`font-medium ${selectedContractor.gst_manual_verified ? 'text-success' : 'text-secondary'}`}>
                        {selectedContractor.gst_manual_verified ? 'Verified manually' : 'Not marked yet'}
                      </div>
                    </div>
                    <div className="rounded-lg border border-neutral-medium p-4">
                      <div className="text-secondary mb-1">Last Reviewed</div>
                      <div className="text-primary font-medium">
                        {selectedContractor.gst_manual_verified_at
                          ? `${new Date(selectedContractor.gst_manual_verified_at).toLocaleDateString()} by ${selectedContractor.gst_manual_verified_by || 'admin'}`
                          : 'Not recorded'}
                      </div>
                    </div>
                  </div>
                  <label className="flex items-center gap-3 text-sm text-primary mb-4">
                    <input
                      type="checkbox"
                      checked={gstReviewForm.verified}
                      onChange={(event) => setGstReviewForm((prev) => ({ ...prev, verified: event.target.checked }))}
                      disabled={!editingGstReview}
                      className="h-4 w-4 rounded border-neutral-medium bg-neutral-dark text-accent-orange"
                    />
                    GST details checked manually on GST portal
                  </label>
                  <label className="block text-sm">
                    <span className="text-secondary">GST review notes</span>
                    <textarea
                      value={gstReviewForm.notes}
                      onChange={(event) => setGstReviewForm((prev) => ({ ...prev, notes: event.target.value }))}
                      disabled={!editingGstReview}
                      className="mt-2 w-full px-3 py-2 rounded-lg border border-neutral-medium bg-neutral-dark text-primary focus:outline-none focus:ring-2 focus:ring-accent-orange"
                      rows={3}
                      placeholder="Example: GSTIN matched legal name on portal; principal address reviewed; active status confirmed."
                    />
                  </label>
                </div>

                <div className="bg-neutral-darker/60 border border-neutral-medium rounded-lg p-4 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-primary">Finance Terms</h3>
                      <p className="text-xs text-secondary">Set platform fee and daily project participation fee for this SME</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {editingTerms && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (!selectedContractor) return;
                            const platformRate = selectedContractor.platform_fee_rate ?? 0.0025;
                            const dailyRate =
                              selectedContractor.participation_fee_rate_daily ??
                              0.001;
                            const platformCap = selectedContractor.platform_fee_cap ?? 25000;
                            setTermsForm({
                              platformFeeRate: (platformRate * 100).toFixed(2),
                              platformFeeCap: String(Math.round(platformCap)),
                              interestRateDaily: (dailyRate * 100).toFixed(2)
                            });
                            setEditingTerms(false);
                          }}
                          disabled={termsSaving}
                        >
                          Cancel
                        </Button>
                      )}
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={editingTerms ? handleSaveTerms : () => setEditingTerms(true)}
                        disabled={termsSaving}
                      >
                        {termsSaving ? 'Saving...' : editingTerms ? 'Save Terms' : 'Edit Terms'}
                      </Button>
                    </div>
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
                        disabled={!editingTerms}
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
                        disabled={!editingTerms}
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
                        disabled={!editingTerms}
                        className="mt-2 w-full px-3 py-2 rounded-lg border border-neutral-medium bg-neutral-dark text-primary focus:outline-none focus:ring-2 focus:ring-accent-orange"
                      />
                    </label>
                  </div>
                </div>

                <ContractorUnderwritingPanel
                  contractorId={selectedContractor.id}
                  onUpdated={refreshContractors}
                />

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

                {selectedContractor.status === 'approved' && (
                  <div className="mt-8 p-6 bg-success/5 border border-success/20 rounded-lg">
                    <div className="flex items-center">
                      <span className="text-2xl mr-3">✅</span>
                      <div>
                        <h4 className="text-lg font-semibold text-success mb-1">SME Approved</h4>
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
                        <h4 className="text-lg font-semibold text-error mb-1">SME Rejected</h4>
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
              <h3 className="text-lg font-semibold text-primary mb-2">Select an SME</h3>
              <p className="text-secondary">Choose an SME from the dropdown above to review their documents</p>
            </div>
          )}
        </div>
      ) : activeTab === 'agreements' ? (
        <div className="space-y-6">
          {renderContractorSelector({
            title: 'SME Agreements',
            description: 'Choose an SME and manage the full agreement lifecycle from draft to execution.',
          })}
            {selectedContractor ? (
              <div className="space-y-6">
                <div className="bg-neutral-dark rounded-lg border border-neutral-medium p-6">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <h2 className="text-xl font-semibold text-primary">{selectedContractor.company_name}</h2>
                      <p className="text-secondary">{selectedContractor.email}</p>
                      <p className="text-sm text-secondary mt-1">
                        Use this tab to issue, send, upload, and execute SME agreements.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => setActiveTab('fuel')}
                    >
                      Open Fuel Settings
                    </Button>
                  </div>
                  <div className="grid md:grid-cols-3 gap-4 mt-4 text-sm">
                    <div className="rounded-lg border border-neutral-medium p-4">
                      <div className="text-secondary mb-1">Portal Activation</div>
                      <div className="text-primary font-medium">
                        {selectedContractor.onboarding?.portalActive ? 'active' : 'pending'}
                      </div>
                    </div>
                    <div className="rounded-lg border border-neutral-medium p-4">
                      <div className="text-secondary mb-1">Master Agreement</div>
                      <div className="text-primary font-medium">
                        {selectedContractor.agreementSummary?.masterAgreement.status?.replace(/_/g, ' ') || 'not started'}
                      </div>
                    </div>
                    <div className="rounded-lg border border-neutral-medium p-4">
                      <div className="text-secondary mb-1">Financing Addendum</div>
                      <div className="text-primary font-medium">
                        {selectedContractor.agreementSummary?.financingAgreement.status?.replace(/_/g, ' ') || 'not started'}
                      </div>
                    </div>
                  </div>
                </div>

                <ContractorAgreementPanel
                  contractorId={selectedContractor.id}
                  contractorEmail={selectedContractor.email}
                  agreementType="master_platform"
                  title="Master SME Platform Agreement"
                  description="Required for every SME before portal procurement access can be activated."
                  onUpdated={refreshContractors}
                />

                <ContractorAgreementPanel
                  contractorId={selectedContractor.id}
                  contractorEmail={selectedContractor.email}
                  agreementType="financing_addendum"
                  title="Financing / Working Capital Addendum"
                  description="Required only when financing access is intended to be enabled for this SME."
                  onUpdated={refreshContractors}
                />

                <ContractorAgreementPanel
                  contractorId={selectedContractor.id}
                  contractorEmail={selectedContractor.email}
                  agreementType="procurement_declaration"
                  title="Procurement / Booking Declaration"
                  description="Optional declaration for booking-rate, dispatch, freight, NSIC/back-to-back adjustments, and material-lifting acknowledgements."
                  onUpdated={refreshContractors}
                />

                <ContractorAgreementPanel
                  contractorId={selectedContractor.id}
                  contractorEmail={selectedContractor.email}
                  agreementType="fuel_procurement_declaration"
                  title="Fuel Procurement & Settlement Declaration"
                  description="SME-side declaration for Finverno-routed fuel procurement, provider validation, platform fee charging, and fuel settlement workflows."
                  onUpdated={refreshContractors}
                />
              </div>
            ) : (
              <div className="bg-neutral-dark rounded-lg border border-neutral-medium p-8 text-center">
                <div className="text-4xl mb-4">👈</div>
                <h3 className="text-lg font-semibold text-primary mb-2">Select an SME</h3>
                <p className="text-secondary">Choose an SME from the dropdown above to manage agreement workflows.</p>
              </div>
            )}
        </div>
      ) : null}

      {activeTab === 'fuel' && (
        <div className="space-y-6">
          {renderContractorSelector({
            title: 'Fuel Settings',
            description: 'Select an SME to configure fuel balances, overdraft rules, approved pumps, and payment posting.',
          })}
            {selectedContractor ? (
              <div className="grid lg:grid-cols-2 gap-6">
                <div className="bg-neutral-dark rounded-lg border border-neutral-medium p-6">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <h2 className="text-lg font-semibold text-primary">Fuel Account & Limits</h2>
                      <p className="text-sm text-secondary">{selectedContractor.company_name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {editingFuelSettings && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            loadFuelSettings(selectedContractor.id);
                            setEditingFuelSettings(false);
                          }}
                          disabled={fuelSettingsSaving}
                        >
                          Cancel
                        </Button>
                      )}
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={editingFuelSettings ? handleSaveFuelSettings : () => setEditingFuelSettings(true)}
                        disabled={fuelSettingsSaving}
                      >
                        {fuelSettingsSaving ? 'Saving...' : editingFuelSettings ? 'Save Settings' : 'Edit Settings'}
                      </Button>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4 mb-6">
                    <div className="rounded-lg bg-neutral-darker p-4">
                      <div className="text-xs uppercase text-secondary">Available Balance</div>
                      <div className="text-xl font-semibold text-primary mt-2">
                        ₹{Math.round(fuelAccountSummary?.availableBalance || 0).toLocaleString('en-IN')}
                      </div>
                    </div>
                    <div className="rounded-lg bg-neutral-darker p-4">
                      <div className="text-xs uppercase text-secondary">Outstanding</div>
                      <div className="text-xl font-semibold text-primary mt-2">
                        ₹{Math.round(fuelAccountSummary?.outstandingAmount || 0).toLocaleString('en-IN')}
                      </div>
                    </div>
                    <div className="rounded-lg bg-neutral-darker p-4">
                      <div className="text-xs uppercase text-secondary">Pending Reserve</div>
                      <div className="text-xl font-semibold text-primary mt-2">
                        ₹{Math.round(fuelAccountSummary?.pendingApprovalAmount || 0).toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <label className="block">
                      <span className="text-secondary">Allow Overdraft</span>
                      <div className="mt-3 flex items-center space-x-3">
                        <input
                          type="checkbox"
                          id="fuel-overdraft-allowed"
                          checked={fuelSettingsForm.overdraftAllowed}
                          onChange={(event) =>
                            setFuelSettingsForm((prev) => ({ ...prev, overdraftAllowed: event.target.checked }))
                          }
                          disabled={!editingFuelSettings}
                          className="w-4 h-4 rounded border-neutral-medium"
                        />
                        <label htmlFor="fuel-overdraft-allowed" className="text-sm text-primary cursor-pointer">
                          Allow the balance to go negative
                        </label>
                      </div>
                    </label>
                    <label className="block">
                      <span className="text-secondary">Overdraft Limit (Rs)</span>
                      <input
                        type="number"
                        step="1000"
                        min="0"
                        max="10000000"
                        value={fuelSettingsForm.overdraftLimitAmount}
                        onChange={(event) =>
                          setFuelSettingsForm((prev) => ({ ...prev, overdraftLimitAmount: event.target.value }))
                        }
                        disabled={!editingFuelSettings}
                        className="mt-2 w-full px-3 py-2 rounded-lg border border-neutral-medium bg-neutral-dark text-primary focus:outline-none focus:ring-2 focus:ring-accent-orange"
                      />
                    </label>
                    <label className="block">
                      <span className="text-secondary">Warning Threshold (Rs)</span>
                      <input
                        type="number"
                        step="500"
                        min="0"
                        max="10000000"
                        value={fuelSettingsForm.warningThresholdAmount}
                        onChange={(event) =>
                          setFuelSettingsForm((prev) => ({ ...prev, warningThresholdAmount: event.target.value }))
                        }
                        disabled={!editingFuelSettings}
                        className="mt-2 w-full px-3 py-2 rounded-lg border border-neutral-medium bg-neutral-dark text-primary focus:outline-none focus:ring-2 focus:ring-accent-orange"
                      />
                    </label>
                    <label className="block">
                      <span className="text-secondary">Monthly Fuel Budget (Rs)</span>
                      <input
                        type="number"
                        step="1000"
                        min="1000"
                        max="10000000"
                        value={fuelSettingsForm.monthlyFuelBudget}
                        onChange={(event) =>
                          setFuelSettingsForm((prev) => ({ ...prev, monthlyFuelBudget: event.target.value }))
                        }
                        disabled={!editingFuelSettings}
                        className="mt-2 w-full px-3 py-2 rounded-lg border border-neutral-medium bg-neutral-dark text-primary focus:outline-none focus:ring-2 focus:ring-accent-orange"
                      />
                    </label>
                    <label className="block">
                      <span className="text-secondary">Per Request Max Amount (Rs)</span>
                      <input
                        type="number"
                        step="100"
                        min="100"
                        max="1000000"
                        value={fuelSettingsForm.perRequestMaxAmount}
                        onChange={(event) =>
                          setFuelSettingsForm((prev) => ({ ...prev, perRequestMaxAmount: event.target.value }))
                        }
                        disabled={!editingFuelSettings}
                        className="mt-2 w-full px-3 py-2 rounded-lg border border-neutral-medium bg-neutral-dark text-primary focus:outline-none focus:ring-2 focus:ring-accent-orange"
                      />
                    </label>
                    <label className="block">
                      <span className="text-secondary">Per Request Max Liters</span>
                      <input
                        type="number"
                        step="1"
                        min="1"
                        max="1000"
                        value={fuelSettingsForm.perRequestMaxLiters}
                        onChange={(event) =>
                          setFuelSettingsForm((prev) => ({ ...prev, perRequestMaxLiters: event.target.value }))
                        }
                        disabled={!editingFuelSettings}
                        className="mt-2 w-full px-3 py-2 rounded-lg border border-neutral-medium bg-neutral-dark text-primary focus:outline-none focus:ring-2 focus:ring-accent-orange"
                      />
                    </label>
                    <label className="block">
                      <span className="text-secondary">Max Fills / Vehicle / Day</span>
                      <input
                        type="number"
                        step="1"
                        min="1"
                        max="10"
                        value={fuelSettingsForm.maxFillsPerVehiclePerDay}
                        onChange={(event) =>
                          setFuelSettingsForm((prev) => ({ ...prev, maxFillsPerVehiclePerDay: event.target.value }))
                        }
                        disabled={!editingFuelSettings}
                        className="mt-2 w-full px-3 py-2 rounded-lg border border-neutral-medium bg-neutral-dark text-primary focus:outline-none focus:ring-2 focus:ring-accent-orange"
                      />
                    </label>
                    <label className="block">
                      <span className="text-secondary">Min Hours Between Fills</span>
                      <input
                        type="number"
                        step="1"
                        min="1"
                        max="168"
                        value={fuelSettingsForm.minHoursBetweenFills}
                        onChange={(event) =>
                          setFuelSettingsForm((prev) => ({ ...prev, minHoursBetweenFills: event.target.value }))
                        }
                        disabled={!editingFuelSettings}
                        className="mt-2 w-full px-3 py-2 rounded-lg border border-neutral-medium bg-neutral-dark text-primary focus:outline-none focus:ring-2 focus:ring-accent-orange"
                      />
                    </label>
                    <label className="block">
                      <span className="text-secondary">Auto-Approve</span>
                      <div className="mt-3 flex items-center space-x-3">
                        <input
                          type="checkbox"
                          id="fuel-auto-approve"
                          checked={fuelSettingsForm.autoApproveEnabled}
                          onChange={(event) =>
                            setFuelSettingsForm((prev) => ({ ...prev, autoApproveEnabled: event.target.checked }))
                          }
                          disabled={!editingFuelSettings}
                          className="w-4 h-4 rounded border-neutral-medium"
                        />
                        <label htmlFor="fuel-auto-approve" className="text-sm text-primary cursor-pointer">
                          Enable auto-approval
                        </label>
                      </div>
                    </label>
                  </div>

                  <div className="mt-6 grid md:grid-cols-3 gap-4 text-sm">
                    <div className="rounded-lg bg-neutral-darker p-4">
                      <div className="text-secondary">Platform Fee</div>
                      <div className="text-primary font-semibold mt-1">
                        {((fuelAccountSummary?.platformFeeRate ?? 0.0025) * 100).toFixed(2)}%
                      </div>
                    </div>
                    <div className="rounded-lg bg-neutral-darker p-4">
                      <div className="text-secondary">Overdraft Daily Fee</div>
                      <div className="text-primary font-semibold mt-1">
                        {fuelSettingsForm.overdraftAllowed
                          ? `${((fuelAccountSummary?.dailyFeeRate ?? 0.001) * 100).toFixed(2)}% / day`
                          : 'Not applicable'}
                      </div>
                    </div>
                    <div className="rounded-lg bg-neutral-darker p-4">
                      <div className="text-secondary">Fees Charged</div>
                      <div className="text-primary font-semibold mt-1">
                        ₹{Math.round(((fuelAccountSummary?.platformFeeCharged || 0) + (fuelAccountSummary?.dailyFeeAccrued || 0))).toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 rounded-lg border border-neutral-medium bg-neutral-darker p-4">
                    <div className="flex items-center justify-between gap-4 mb-3">
                      <div>
                        <h3 className="text-sm font-semibold text-primary">Record SME Payment</h3>
                        <p className="text-xs text-secondary">Post a top-up or repayment received from this SME into the fuel balance ledger.</p>
                      </div>
                    </div>
                    <div className="grid md:grid-cols-[160px,1fr,auto] gap-3">
                      <input
                        type="number"
                        min="1"
                        step="0.01"
                        value={fuelReceiptForm.amount}
                        onChange={(event) => setFuelReceiptForm((prev) => ({ ...prev, amount: event.target.value }))}
                        placeholder="Amount"
                        className="px-3 py-2 rounded-lg border border-neutral-medium bg-neutral-dark text-primary focus:outline-none focus:ring-2 focus:ring-accent-orange"
                      />
                      <input
                        type="text"
                        value={fuelReceiptForm.notes}
                        onChange={(event) => setFuelReceiptForm((prev) => ({ ...prev, notes: event.target.value }))}
                        placeholder="Notes (optional)"
                        className="px-3 py-2 rounded-lg border border-neutral-medium bg-neutral-dark text-primary focus:outline-none focus:ring-2 focus:ring-accent-orange"
                      />
                      <Button onClick={handleRecordFuelReceipt} disabled={fuelReceiptSaving}>
                        {fuelReceiptSaving ? 'Posting...' : 'Post Payment'}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="bg-neutral-dark rounded-lg border border-neutral-medium p-6">
                  <div className="mb-6">
                    <h2 className="text-lg font-semibold text-primary mb-2">Fuel Finance Overview</h2>
                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      <div className="rounded-lg bg-neutral-darker p-4">
                        <div className="text-secondary">SME Receivables</div>
                        <div className="text-primary font-semibold mt-1">
                          ₹{Math.round(fuelFinanceOverview?.smeReceivables || 0).toLocaleString('en-IN')}
                        </div>
                      </div>
                      <div className="rounded-lg bg-neutral-darker p-4">
                        <div className="text-secondary">Provider Payables</div>
                        <div className="text-primary font-semibold mt-1">
                          ₹{Math.round(fuelFinanceOverview?.providerPayables || 0).toLocaleString('en-IN')}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-secondary mb-3">Recent SME Ledger</h3>
                    {selectedContractorFuelLedger.length === 0 ? (
                      <p className="text-sm text-secondary">No ledger entries yet.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-neutral-darker">
                            <tr>
                              <th className="px-3 py-2 text-left text-secondary uppercase text-xs">Date</th>
                              <th className="px-3 py-2 text-left text-secondary uppercase text-xs">Entry</th>
                              <th className="px-3 py-2 text-left text-secondary uppercase text-xs">Direction</th>
                              <th className="px-3 py-2 text-left text-secondary uppercase text-xs">Amount</th>
                              <th className="px-3 py-2 text-left text-secondary uppercase text-xs">Notes</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-neutral-medium">
                            {selectedContractorFuelLedger.map((row) => (
                              <tr key={row.id}>
                                <td className="px-3 py-2 text-secondary">{formatDate(row.created_at)}</td>
                                <td className="px-3 py-2 text-primary">{formatLedgerEntryType(row.entryType)}</td>
                                <td className="px-3 py-2 text-secondary">{row.direction}</td>
                                <td className="px-3 py-2 text-primary">₹{Math.round(row.amount).toLocaleString('en-IN')}</td>
                                <td className="px-3 py-2 text-secondary">{row.notes || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  <h2 className="text-lg font-semibold text-primary mb-4">Approved Fuel Pumps</h2>
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-secondary mb-3">Currently Approved</h3>
                    {approvedPumps.filter((pump) => pump.is_active).length === 0 ? (
                      <p className="text-sm text-secondary">No pumps approved yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {approvedPumps
                          .filter((pump) => pump.is_active)
                          .map((pump) => (
                            <div
                              key={pump.id}
                              className="flex items-center justify-between p-3 bg-neutral-darker rounded-lg"
                            >
                              <div>
                                <div className="text-sm text-primary font-medium">{pump.fuel_pumps.pump_name}</div>
                                <div className="text-xs text-secondary">
                                  {pump.fuel_pumps.oem_name ? `${pump.fuel_pumps.oem_name} · ` : ''}
                                  {pump.fuel_pumps.city}, {pump.fuel_pumps.state}
                                </div>
                              </div>
                              <Button size="sm" variant="outline" onClick={() => handleRemovePump(pump.pump_id)}>
                                Remove
                              </Button>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-secondary mb-3">Available Pumps</h3>
                    {fuelPumps.filter(
                      (pump) => !approvedPumps.some((approvedPump) => approvedPump.pump_id === pump.id && approvedPump.is_active)
                    ).length === 0 ? (
                      <p className="text-sm text-secondary">No additional pumps available.</p>
                    ) : (
                      <div className="space-y-2">
                        {fuelPumps
                          .filter(
                            (pump) => !approvedPumps.some((approvedPump) => approvedPump.pump_id === pump.id && approvedPump.is_active)
                          )
                          .map((pump) => (
                            <div
                              key={pump.id}
                              className="flex items-center justify-between p-3 bg-neutral-darker rounded-lg"
                            >
                              <div>
                                <div className="text-sm text-primary font-medium">{pump.pump_name}</div>
                                <div className="text-xs text-secondary">
                                  {pump.oem_name ? `${pump.oem_name} · ` : ''}
                                  {pump.city}, {pump.state}
                                </div>
                              </div>
                              <Button size="sm" onClick={() => handleApprovePump(pump.id)}>
                                Approve
                              </Button>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-neutral-dark rounded-lg border border-neutral-medium p-8 text-center">
                <div className="text-4xl mb-4">👈</div>
                <h3 className="text-lg font-semibold text-primary mb-2">Select an SME</h3>
                <p className="text-secondary">Choose an SME from the dropdown above to manage fuel settings and approved pumps.</p>
              </div>
            )}
        </div>
      )}

      {activeTab === 'materials' && (
        /* Material Requests Tab */
        <>
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Material Requests List */}
          <div className="lg:col-span-1">
            <div className="bg-neutral-dark rounded-lg border border-neutral-medium">
              <div className="p-4 border-b border-neutral-medium">
                <h2 className="text-lg font-semibold text-primary">Material Requests</h2>
                <p className="text-sm text-secondary">SME material additions pending review</p>
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
                        {request.category} • {request.unit}{request.hsn_code ? ` • HSN ${request.hsn_code}` : ''}
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
                        <div><strong>HSN:</strong> {selectedMaterialRequest.hsn_code || '-'}</div>
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
        <div className="mt-8 bg-neutral-dark rounded-lg border border-neutral-medium">
          <div className="p-4 border-b border-neutral-medium flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-primary">Material Master</h2>
              <p className="text-sm text-secondary">Edit existing catalog items</p>
            </div>
            <input
              type="text"
              value={masterMaterialsSearch}
              onChange={(e) => setMasterMaterialsSearch(e.target.value)}
              placeholder="Search materials..."
              className="px-3 py-2 rounded border border-neutral-light bg-neutral-dark text-primary w-full md:w-72"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-medium">
              <thead className="bg-neutral-dark">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-secondary uppercase tracking-wider">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-secondary uppercase tracking-wider">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-secondary uppercase tracking-wider">Unit</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-secondary uppercase tracking-wider">HSN</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-secondary uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-medium">
                {masterMaterialsLoading ? (
                  <tr>
                    <td className="px-4 py-6 text-secondary text-sm" colSpan={5}>Loading material master...</td>
                  </tr>
                ) : masterMaterials
                    .filter((material) => {
                      const q = masterMaterialsSearch.trim().toLowerCase();
                      if (!q) return true;
                      return (
                        material.name.toLowerCase().includes(q) ||
                        material.category.toLowerCase().includes(q) ||
                        (material.hsn_code || '').toLowerCase().includes(q)
                      );
                    })
                    .slice(0, 100)
                    .map((material) => (
                      <tr key={material.id}>
                        <td className="px-4 py-3 text-sm text-primary">{renderEditableCell(material, 'name')}</td>
                        <td className="px-4 py-3 text-sm text-secondary">{renderEditableCell(material, 'category')}</td>
                        <td className="px-4 py-3 text-sm text-secondary">{renderEditableCell(material, 'unit')}</td>
                        <td className="px-4 py-3 text-sm text-secondary">{renderEditableCell(material, 'hsn_code')}</td>
                        <td className="px-4 py-3 text-sm text-secondary">{material.approval_status || 'approved'}</td>
                      </tr>
                    ))}
                {!masterMaterialsLoading && masterMaterials.length === 0 && (
                  <tr>
                    <td className="px-4 py-6 text-secondary text-sm" colSpan={5}>No materials found in catalog.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        </>
      )}

      {activeTab === 'projects' && <AdminProjectReviewPanel />}

      {activeTab === 'takeoffs' && (
        /* Quantity Takeoffs Tab */
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Takeoff Items List */}
          <div className="lg:col-span-1">
            <div className="bg-neutral-dark rounded-lg border border-neutral-medium">
              <div className="p-4 border-b border-neutral-medium">
                <h2 className="text-lg font-semibold text-primary">Quantity Takeoffs</h2>
                <p className="text-sm text-secondary">SME takeoffs pending verification</p>
                
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
      )}

      {activeTab === 'purchases' && (
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
                  <th className="text-left p-3 text-primary font-semibold">SME</th>
                  <th className="text-left p-3 text-primary font-semibold">Items</th>
                  <th className="text-left p-3 text-primary font-semibold">Amount</th>
                  <th className="text-left p-3 text-primary font-semibold">Vendor</th>
                  <th className="text-left p-3 text-primary font-semibold">Display State</th>
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
                    const displayState = getPurchaseRequestDisplayState(request);
                    const deliveryLabel =
                      request.delivery_status === 'dispatched'
                        ? 'Dispatched'
                        : request.delivery_status === 'backfill_pending_confirmation'
                        ? 'Backfill Pending SME Confirmation'
                        : request.delivery_status === 'disputed'
                        ? 'Disputed'
                        : request.delivery_status === 'delivered'
                        ? 'Delivered'
                        : 'Not Dispatched';

                    return (
                      <tr key={request.id} className="border-b border-neutral-medium hover:bg-neutral-medium/20">
                        <td className="p-3 text-primary font-medium">#{request.id.slice(0, 8).toUpperCase()}</td>
                        <td className="p-3 text-secondary">{request.project?.name || request.project_id || 'Project'}</td>
                        <td className="p-3 text-secondary">{request.contractors?.company_name || 'Unknown SME'}</td>
                        <td className="p-3 text-secondary">{request.total_items}</td>
                        <td className="p-3 text-primary">
                          ₹{(request.estimated_total || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </td>
                        <td className="p-3 text-secondary">{request.vendor_name || 'Unassigned'}</td>
                        <td className="p-3">
                          <span className={`text-xs px-2 py-1 rounded border ${displayState.classes}`}>{displayState.label}</span>
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
      )}

      {activeTab === 'fuel-providers' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-primary">Fuel Providers</h2>
              <p className="text-secondary text-sm mt-1">Manage fuel pump partners across locations</p>
            </div>
            <Button variant="primary" onClick={() => setShowAddPump(true)}>
              + Add Fuel Pump
            </Button>
          </div>

          <div className="grid md:grid-cols-4 gap-4">
            <div className="bg-neutral-dark rounded-lg border border-neutral-medium p-4">
              <div className="text-xs uppercase text-secondary">Provider Payables</div>
              <div className="text-2xl font-semibold text-primary mt-2">
                ₹{Math.round(fuelFinanceOverview?.providerPayables || 0).toLocaleString('en-IN')}
              </div>
            </div>
            <div className="bg-neutral-dark rounded-lg border border-neutral-medium p-4">
              <div className="text-xs uppercase text-secondary">SME Receivables</div>
              <div className="text-2xl font-semibold text-primary mt-2">
                ₹{Math.round(fuelFinanceOverview?.smeReceivables || 0).toLocaleString('en-IN')}
              </div>
            </div>
            <div className="bg-neutral-dark rounded-lg border border-neutral-medium p-4">
              <div className="text-xs uppercase text-secondary">Platform + Credit Fee</div>
              <div className="text-2xl font-semibold text-primary mt-2">
                ₹{Math.round(((fuelFinanceOverview?.platformFeeEarned || 0) + (fuelFinanceOverview?.dailyFeeAccrued || 0))).toLocaleString('en-IN')}
              </div>
            </div>
            <div className="bg-neutral-dark rounded-lg border border-neutral-medium p-4">
              <div className="text-xs uppercase text-secondary">Net Exposure</div>
              <div className="text-2xl font-semibold text-primary mt-2">
                ₹{Math.round(fuelFinanceOverview?.netExposure || 0).toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          <div className="bg-neutral-dark rounded-lg border border-neutral-medium p-6">
            <h3 className="text-lg font-semibold text-primary mb-4">Recent Provider Ledger</h3>
            {providerFuelLedger.length === 0 ? (
              <p className="text-sm text-secondary">No provider ledger entries yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-neutral-darker">
                    <tr>
                      <th className="px-3 py-2 text-left text-secondary uppercase text-xs">Date</th>
                      <th className="px-3 py-2 text-left text-secondary uppercase text-xs">Fuel Provider</th>
                      <th className="px-3 py-2 text-left text-secondary uppercase text-xs">Entry</th>
                      <th className="px-3 py-2 text-left text-secondary uppercase text-xs">Direction</th>
                      <th className="px-3 py-2 text-left text-secondary uppercase text-xs">Amount</th>
                      <th className="px-3 py-2 text-left text-secondary uppercase text-xs">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-medium">
                    {providerFuelLedger.map((row) => (
                      <tr key={row.id}>
                        <td className="px-3 py-2 text-secondary">{formatDate(row.created_at)}</td>
                        <td className="px-3 py-2 text-primary">{row.ownerLabel}</td>
                        <td className="px-3 py-2 text-primary">{formatLedgerEntryType(row.entryType)}</td>
                        <td className="px-3 py-2 text-secondary">{row.direction}</td>
                        <td className="px-3 py-2 text-primary">₹{Math.round(row.amount).toLocaleString('en-IN')}</td>
                        <td className="px-3 py-2 text-secondary">{row.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="text-secondary">Loading fuel pumps...</div>
            </div>
          ) : fuelPumps.length === 0 ? (
            <div className="text-center py-12 bg-neutral-dark rounded-lg border border-neutral-medium">
              <div className="text-4xl mb-4">⛽</div>
              <h3 className="text-lg font-semibold text-primary mb-2">No Fuel Pumps</h3>
              <p className="text-secondary text-sm mb-4">Add your first fuel pump partner to get started</p>
              <Button variant="primary" onClick={() => setShowAddPump(true)}>
                + Add Fuel Pump
              </Button>
            </div>
          ) : (
            <div className="bg-neutral-dark rounded-lg border border-neutral-medium">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-neutral-darker">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Pump Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Location</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Contact</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Outstanding</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Dashboard Access</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Agreement</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Settlement</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Added</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-medium">
                    {fuelPumps.map((pump) => (
                      <tr key={pump.id} className="hover:bg-neutral-darker/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-medium text-primary">{pump.pump_name}</div>
                          {pump.oem_name && (
                            <div className="text-xs text-secondary mt-1">{pump.oem_name}</div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-secondary">
                            {pump.city}, {pump.state}
                            {pump.pincode && ` - ${pump.pincode}`}
                          </div>
                          {pump.address && (
                            <div className="text-xs text-secondary mt-1">{pump.address}</div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-secondary">
                            {pump.contact_person && <div>{pump.contact_person}</div>}
                            {pump.contact_phone && <div className="text-xs">{pump.contact_phone}</div>}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            pump.is_active
                              ? 'bg-green-500/10 text-green-500'
                              : 'bg-red-500/10 text-red-500'
                          }`}>
                            {pump.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-primary">
                            ₹{Math.round(pump.settlement_summary?.outstandingPayableAmount || 0).toLocaleString('en-IN')}
                          </div>
                          <div className="text-xs text-secondary mt-1">
                            Settled ₹{Math.round(pump.settlement_summary?.totalSettledAmount || 0).toLocaleString('en-IN')}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-2">
                            <div className="text-xs text-secondary">
                              {pump.dashboard_access_active ? (
                                <>
                                  <div className="text-green-500 font-medium">
                                    Enabled{pump.dashboard_access_label ? ` · ${pump.dashboard_access_label}` : ''}
                                  </div>
                                  {pump.last_accessed_at && (
                                    <div>Last access: {new Date(pump.last_accessed_at).toLocaleString()}</div>
                                  )}
                                </>
                              ) : (
                                <div>Not generated</div>
                              )}
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleGeneratePumpAccess(pump.id)}
                              disabled={generatingPumpAccessId === pump.id}
                            >
                              {generatingPumpAccessId === pump.id
                                ? 'Generating...'
                                : pump.dashboard_access_active
                                  ? 'Reset Access Code'
                                  : 'Generate Access Code'}
                            </Button>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Button
                            size="sm"
                            variant={selectedFuelProviderPumpId === pump.id ? 'primary' : 'outline'}
                            onClick={() => setSelectedFuelProviderPumpId(pump.id)}
                          >
                            {selectedFuelProviderPumpId === pump.id ? 'Managing' : 'Manage Agreement'}
                          </Button>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-2 min-w-[240px]">
                            <input
                              type="number"
                              min="1"
                              step="0.01"
                              value={providerSettlementForm[pump.id]?.amount || ''}
                              onChange={(event) => handleProviderSettlementChange(pump.id, 'amount', event.target.value)}
                              placeholder="Settlement amount"
                              className="w-full px-3 py-2 rounded-lg border border-neutral-medium bg-neutral-dark text-primary focus:outline-none focus:ring-2 focus:ring-accent-orange"
                            />
                            <input
                              type="text"
                              value={providerSettlementForm[pump.id]?.notes || ''}
                              onChange={(event) => handleProviderSettlementChange(pump.id, 'notes', event.target.value)}
                              placeholder="Notes (optional)"
                              className="w-full px-3 py-2 rounded-lg border border-neutral-medium bg-neutral-dark text-primary focus:outline-none focus:ring-2 focus:ring-accent-orange"
                            />
                            <Button
                              size="sm"
                              onClick={() => handleRecordProviderSettlement(pump.id)}
                              disabled={providerSettlementSavingId === pump.id}
                            >
                              {providerSettlementSavingId === pump.id ? 'Posting...' : 'Post Settlement'}
                            </Button>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-secondary">
                          {new Date(pump.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {selectedFuelProviderPumpId ? (
            <FuelProviderAgreementPanel
              pumpId={selectedFuelProviderPumpId}
              pumpName={fuelPumps.find((pump) => pump.id === selectedFuelProviderPumpId)?.pump_name || 'Fuel Provider'}
              pumpEmail={fuelPumps.find((pump) => pump.id === selectedFuelProviderPumpId)?.contact_email || null}
            />
          ) : null}
        </div>
      )}

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
                  {selectedPurchaseRequest.project?.name || selectedPurchaseRequest.project_id || 'Project'} • {selectedPurchaseRequest.contractors?.company_name || 'Unknown SME'}
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
                  <div className="text-primary font-medium mt-1">{getPurchaseRequestDisplayState(selectedPurchaseRequest).label}</div>
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

              {selectedPurchaseRequest.project?.project_address && (
                <div className="bg-neutral-darker border border-neutral-medium rounded-lg p-4">
                  <h3 className="text-base font-semibold text-primary mb-2">Shipping Location</h3>
                  <div className="text-sm text-secondary">
                    {selectedPurchaseRequest.project?.client_name && (
                      <div className="text-primary font-medium mb-1">{selectedPurchaseRequest.project.client_name}</div>
                    )}
                    <div>
                      {selectedPurchaseRequest.project?.project_address}
                    </div>
                  </div>
                </div>
              )}

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
                      <p className="text-xs text-secondary italic">No vendors registered for this SME yet.</p>
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
                        <td className="p-2 text-center text-primary">
                          {(item.purchase_qty ?? item.requested_qty ?? 0).toLocaleString(undefined, { maximumFractionDigits: 3 })}
                        </td>
                        <td className="p-2 text-center text-primary">{item.purchase_unit || item.unit || 'units'}</td>
                        <td className="p-2 text-center text-primary">₹{(item.unit_rate || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                        <td className="p-2 text-center text-secondary">
                          <div>{item.status.replace(/_/g, ' ').toUpperCase()}</div>
                          {item.purchase_qty != null && item.purchase_unit && item.site_unit && (
                            <div className="text-[11px] text-secondary mt-0.5">
                              Site: {Number(item.requested_qty || 0).toLocaleString(undefined, { maximumFractionDigits: 3 })} {item.site_unit}
                            </div>
                          )}
                        </td>
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
                selectedPurchaseRequest.vendor_id &&
                (!selectedPurchaseRequest.delivery_status || selectedPurchaseRequest.delivery_status === 'not_dispatched') && (
                <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-4">
                  <h3 className="text-base font-semibold text-primary mb-2">Generate Purchase Order</h3>
                  <p className="text-sm text-secondary mb-3">
                    Create a Purchase Order PDF for the assigned vendor ({selectedPurchaseRequest.vendor_name}).
                  </p>
                  <Button
                    variant="primary"
                    onClick={handleGeneratePO}
                    disabled={generatingPO}
                  >
                    {generatingPO ? 'Generating PO...' : 'Generate Purchase Order'}
                  </Button>
                </div>
              )}

              {(['approved', 'funded', 'po_generated'].includes(selectedPurchaseRequest.status)) &&
                (!selectedPurchaseRequest.delivery_status || selectedPurchaseRequest.delivery_status === 'not_dispatched') && (
                <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4">
                  <h3 className="text-base font-semibold text-primary mb-2">Initiate Delivery</h3>
                  <div className="flex items-center gap-3 flex-wrap">
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
                    <button
                      onClick={() => {
                        setBackfillDeliveryForm({
                          deliveredAt: formatDateTimeLocalValue(selectedPurchaseRequest.delivered_at ? new Date(selectedPurchaseRequest.delivered_at) : new Date()),
                          reason: selectedPurchaseRequest.backfill_reason || 'Delivery completed earlier; admin backfill recorded.'
                        });
                        setShowBackfillDeliveryModal(true);
                      }}
                      disabled={dispatchLoading}
                      className="px-5 py-2 bg-neutral-darker text-primary border border-neutral-medium rounded-md text-sm font-medium hover:bg-neutral-medium disabled:opacity-50"
                    >
                      {dispatchLoading ? 'Processing...' : 'Record Delivered (Backfill)'}
                    </button>
                  </div>
                  <p className="text-xs text-secondary mt-3">
                    Use backfill only when delivery already happened but ops missed the live dispatch update. SME will get 2 days to dispute before auto-confirmation.
                  </p>
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

              {selectedPurchaseRequest.delivery_status === 'backfill_pending_confirmation' && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm">
                  <p className="font-medium text-amber-900">Backfilled Delivery Awaiting SME Confirmation</p>
                  {selectedPurchaseRequest.delivered_at && (
                    <p className="text-amber-800">Recorded delivered date: {formatDate(selectedPurchaseRequest.delivered_at)}</p>
                  )}
                  {selectedPurchaseRequest.backfill_recorded_at && (
                    <p className="text-amber-800">Backfill recorded: {formatDate(selectedPurchaseRequest.backfill_recorded_at)}</p>
                  )}
                  {selectedPurchaseRequest.dispute_deadline && (
                    <p className="text-amber-800">
                      SME dispute deadline: {new Date(selectedPurchaseRequest.dispute_deadline).toLocaleString()}
                    </p>
                  )}
                  {selectedPurchaseRequest.backfill_reason && (
                    <p className="text-amber-800 mt-1">Reason: {selectedPurchaseRequest.backfill_reason}</p>
                  )}
                </div>
              )}

              {selectedPurchaseRequest.delivery_status === 'disputed' && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm">
                  <p className="font-medium text-red-900">Dispute Raised by SME</p>
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
                  <div className="mt-2 flex gap-2">
                    {(selectedPurchaseRequest.invoice_download_url || selectedPurchaseRequest.invoice_url) && (
                      <a
                        href={selectedPurchaseRequest.invoice_download_url || selectedPurchaseRequest.invoice_url || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block px-3 py-1.5 rounded border border-green-300 text-green-700 bg-white hover:bg-green-50"
                      >
                        View Invoice
                      </a>
                    )}
                    {!selectedPurchaseRequest.invoice_generated_at && (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleGenerateInvoice(selectedPurchaseRequest.id)}
                        disabled={generatingPO}
                      >
                        {generatingPO ? 'Generating...' : 'Generate Invoice'}
                      </Button>
                    )}
                    {selectedPurchaseRequest.invoice_generated_at && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleGenerateInvoice(selectedPurchaseRequest.id, true)}
                        disabled={generatingPO}
                      >
                        {generatingPO ? 'Regenerating...' : 'Regenerate Invoice'}
                      </Button>
                      )}
                    </div>
                    {getPurchaseRequestDisplayState(selectedPurchaseRequest).key === 'repaid' && (
                      <div className="mt-4 border-t border-green-200 pt-4">
                        <p className="font-medium text-green-900">Project Participation Fee Invoice</p>
                        <p className="text-green-800 mt-1">
                          This purchase request is fully repaid. Generate the Project Participation Fee invoice from this procurement record.
                        </p>
                        <div className="mt-3 flex gap-2 flex-wrap">
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => handleGenerateFeeInvoice(selectedPurchaseRequest.id, 'repayment_fee')}
                            disabled={generatingFeeInvoiceKind === 'repayment_fee'}
                          >
                            {generatingFeeInvoiceKind === 'repayment_fee' ? 'Generating...' : 'Generate Project Participation Fee Invoice'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleGenerateFeeInvoice(selectedPurchaseRequest.id, 'repayment_fee', true)}
                            disabled={generatingFeeInvoiceKind === 'repayment_fee'}
                          >
                            {generatingFeeInvoiceKind === 'repayment_fee' ? 'Regenerating...' : 'Regenerate Project Participation Fee Invoice'}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
              )}
              
              {showBackfillDeliveryModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70] p-4">
                  <div className="w-full max-w-lg bg-neutral-dark border border-neutral-medium rounded-xl shadow-2xl">
                    <div className="px-6 py-5 border-b border-neutral-medium">
                      <h3 className="text-lg font-semibold text-primary">Record Delivered Backfill</h3>
                      <p className="text-sm text-secondary mt-1">
                        Use this only when delivery already happened but the admin dispatch update was missed. The SME will have 2 days to dispute.
                      </p>
                    </div>

                    <div className="px-6 py-5 space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-primary mb-2">Actual Delivered Date &amp; Time</label>
                        <input
                          type="datetime-local"
                          value={backfillDeliveryForm.deliveredAt}
                          onChange={(e) => setBackfillDeliveryForm(prev => ({ ...prev, deliveredAt: e.target.value }))}
                          className="w-full px-3 py-2 bg-neutral-darker border border-neutral-medium rounded-md text-primary"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-primary mb-2">Reason / Proof Note</label>
                        <textarea
                          rows={4}
                          value={backfillDeliveryForm.reason}
                          onChange={(e) => setBackfillDeliveryForm(prev => ({ ...prev, reason: e.target.value }))}
                          className="w-full px-3 py-2 bg-neutral-darker border border-neutral-medium rounded-md text-primary placeholder-secondary resize-none"
                          placeholder="Explain why this delivery is being backfilled."
                        />
                      </div>
                    </div>

                    <div className="px-6 py-4 border-t border-neutral-medium flex justify-end gap-3">
                      <button
                        onClick={() => setShowBackfillDeliveryModal(false)}
                        disabled={dispatchLoading}
                        className="px-4 py-2 text-sm text-secondary hover:text-primary disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleBackfillDelivered}
                        disabled={dispatchLoading || !backfillDeliveryForm.reason.trim()}
                        className="px-5 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                      >
                        {dispatchLoading ? 'Saving...' : 'Record Backfill'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Add Fuel Pump Modal */}
      {showAddPump && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-dark rounded-lg border border-neutral-medium max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-neutral-medium sticky top-0 bg-neutral-dark">
              <h2 className="text-xl font-semibold text-primary">Add Fuel Pump</h2>
              <p className="text-sm text-secondary mt-1">Add a new fuel pump partner</p>
            </div>
            <form onSubmit={handleAddPump} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-primary mb-1">Pump Name *</label>
                <input
                  type="text"
                  required
                  value={addPumpForm.pump_name}
                  onChange={(e) => setAddPumpForm({ ...addPumpForm, pump_name: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-medium rounded-md bg-neutral-darker text-primary placeholder-secondary focus:outline-none focus:ring-2 focus:ring-accent-orange"
                  placeholder="HP Petrol Pump - Koramangala"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-primary mb-1">Fuel OEM / Network</label>
                <select
                  value={addPumpForm.oem_name}
                  onChange={(e) => setAddPumpForm({ ...addPumpForm, oem_name: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-medium rounded-md bg-neutral-darker text-primary placeholder-secondary focus:outline-none focus:ring-2 focus:ring-accent-orange"
                >
                  <option value="">Select OEM / Network</option>
                  {fuelOemOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-secondary">
                  Helps group pumps under one OEM for future network and bulk pricing discussions.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-primary mb-1">Address</label>
                <textarea
                  value={addPumpForm.address}
                  onChange={(e) => setAddPumpForm({ ...addPumpForm, address: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-neutral-medium rounded-md bg-neutral-darker text-primary placeholder-secondary focus:outline-none focus:ring-2 focus:ring-accent-orange"
                  placeholder="100 Feet Road, Koramangala"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-primary mb-1">City *</label>
                  <input
                    type="text"
                    required
                    value={addPumpForm.city}
                    onChange={(e) => setAddPumpForm({ ...addPumpForm, city: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-medium rounded-md bg-neutral-darker text-primary placeholder-secondary focus:outline-none focus:ring-2 focus:ring-accent-orange"
                    placeholder="Bangalore"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-primary mb-1">State *</label>
                  <input
                    type="text"
                    required
                    value={addPumpForm.state}
                    onChange={(e) => setAddPumpForm({ ...addPumpForm, state: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-medium rounded-md bg-neutral-darker text-primary placeholder-secondary focus:outline-none focus:ring-2 focus:ring-accent-orange"
                    placeholder="Karnataka"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-primary mb-1">Pincode</label>
                <input
                  type="text"
                  value={addPumpForm.pincode}
                  onChange={(e) => setAddPumpForm({ ...addPumpForm, pincode: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-medium rounded-md bg-neutral-darker text-primary placeholder-secondary focus:outline-none focus:ring-2 focus:ring-accent-orange"
                  placeholder="560034"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-primary mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={addPumpForm.contact_person}
                    onChange={(e) => setAddPumpForm({ ...addPumpForm, contact_person: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-medium rounded-md bg-neutral-darker text-primary placeholder-secondary focus:outline-none focus:ring-2 focus:ring-accent-orange"
                    placeholder="Manager Name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-primary mb-1">Contact Phone</label>
                  <input
                    type="tel"
                    value={addPumpForm.contact_phone}
                    onChange={(e) => setAddPumpForm({ ...addPumpForm, contact_phone: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-medium rounded-md bg-neutral-darker text-primary placeholder-secondary focus:outline-none focus:ring-2 focus:ring-accent-orange"
                    placeholder="+91 98765 43210"
                  />
                </div>
              </div>
              <div className="flex space-x-3 pt-2">
                <Button type="submit" variant="primary" disabled={addPumpLoading}>
                  {addPumpLoading ? 'Adding...' : 'Add Fuel Pump'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowAddPump(false);
                    setAddPumpForm({
                      pump_name: '',
                      oem_name: '',
                      address: '',
                      city: '',
                      state: '',
                      pincode: '',
                      contact_person: '',
                      contact_phone: ''
                    });
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add SME Modal */}
      {showAddContractor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-dark rounded-lg border border-neutral-medium max-w-md w-full">
            <div className="p-6 border-b border-neutral-medium">
              <h2 className="text-xl font-semibold text-primary">Add New SME</h2>
              <p className="text-sm text-secondary mt-1">Pre-register an SME and send them a Clerk invitation</p>
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
                  placeholder="sme@company.com"
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
                  {addContractorLoading ? 'Adding...' : 'Add SME'}
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
