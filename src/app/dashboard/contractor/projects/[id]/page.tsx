'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, Suspense } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { ContractorDashboardLayout } from '@/components/ContractorDashboardLayout';
import { LoadingSpinner, Button } from '@/components';
import { useContractorV2 } from '@/contexts/ContractorContextV2';
import EnhancedBOQTable from '@/components/EnhancedBOQTable';
import EditableScheduleTable from '@/components/EditableScheduleTable';
import BOQDisplay from '@/components/BOQDisplay';
import LinkedBOQWorkbookPanel from '@/components/LinkedBOQWorkbookPanel';
import ScheduleDisplay from '@/components/ScheduleDisplay';
import SimplePDFViewer from '@/components/SimplePDFViewer';
import BOQTakeoffViewer from '@/components/BOQTakeoffViewer';
import MeasurementSheetTab from '@/components/MeasurementSheetTab';
import { getBOQByProjectId, getScheduleByProjectId } from '@/lib/supabase-boq';
import { jsPDF } from 'jspdf';
import { uploadPurchaseInvoice } from '@/lib/file-upload';
import type { ProjectMaterialForUI, ProjectPOReferenceSummary } from '@/types/purchase-requests';

type ProjectMaterialWithStats = ProjectMaterialForUI & {
  pending_qty: number;
  max_requestable: number;
  purchase_status?: string | null;
};

type EditableProjectPurchaseRequestItem = {
  id: string;
  project_material_id: string;
  item_description: string | null;
  requested_qty: number;
  unit_rate: number | null;
  tax_percent: number | null;
  round_off_amount: number | null;
  hsn_code: string | null;
  material_name: string;
  unit: string;
};

type EditableProjectPurchaseRequest = {
  id: string;
  status: string;
  remarks: string | null;
  shipping_location: string | null;
  project_po_reference_id?: string | null;
  project_po_reference?: Pick<ProjectPOReferenceSummary, 'id' | 'po_number' | 'po_type' | 'status' | 'is_default'> | null;
  editable: boolean;
  items: EditableProjectPurchaseRequestItem[];
};

type ProjectPurchaseRequestSummary = {
  id: string;
  status: string;
  created_at: string;
  line_items: number;
  estimated_total: number;
  project_po_reference_id: string | null;
  po_number: string | null;
};

function IndividualProjectContent(): React.ReactElement {
  const { isLoaded } = useUser();
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;
  const { contractor, loading: contractorLoading, canAccessFeature } = useContractorV2();
  
  // Project state
  const [project, setProject] = useState<any>(null);
  const [projectLoading, setProjectLoading] = useState(true);
  const [showEditProjectDialog, setShowEditProjectDialog] = useState(false);
  const [savingProjectDetails, setSavingProjectDetails] = useState(false);
  const [projectForm, setProjectForm] = useState({
    project_name: '',
    client_name: '',
    project_address: ''
  });
  const [activeTab, setActiveTab] = useState<'overview' | 'boq' | 'measurement' | 'schedule' | 'materials' | 'client_pos' | 'purchase_requests' | 'files'>('overview');
  const [refreshKey, setRefreshKey] = useState(0);
  const [poReferences, setPOReferences] = useState<ProjectPOReferenceSummary[]>([]);
  const [poReferencesLoading, setPOReferencesLoading] = useState(false);
  const [addingPO, setAddingPO] = useState(false);
  const [poActionLoadingId, setPOActionLoadingId] = useState<string | null>(null);
  const [bulkReassigningPOId, setBulkReassigningPOId] = useState<string | null>(null);
  const [showAddPOForm, setShowAddPOForm] = useState(false);
  const [selectedPOForRequest, setSelectedPOForRequest] = useState('');
  const [poForm, setPOForm] = useState({
    po_number: '',
    po_date: '',
    po_value: '',
    po_type: 'supplemental' as ProjectPOReferenceSummary['po_type'],
    notes: '',
    previous_po_reference_id: '',
  });
  
  // Enhanced project data state
  const [enhancedProjectData, setEnhancedProjectData] = useState<any>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [hasBOQData, setHasBOQData] = useState(false);
  const [hasScheduleData, setHasScheduleData] = useState(false);
  const [hasMeasurementRows, setHasMeasurementRows] = useState(false);
  const [documentStatusLoading, setDocumentStatusLoading] = useState(false);
  
  // Materials state
  const [projectMaterials, setProjectMaterials] = useState<ProjectMaterialWithStats[]>([]);
  const [materialsAnalyzing, setMaterialsAnalyzing] = useState(false);
  const [materialsAnalyzed, setMaterialsAnalyzed] = useState(false);
  const [materialMappings, setMaterialMappings] = useState<any[]>([]);
  const [selectedMaterials, setSelectedMaterials] = useState<Set<string>>(new Set());
  
  // Files state
  const [projectFiles, setProjectFiles] = useState<any[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  
  // BOQ/Schedule state
  const [showBOQEntry, setShowBOQEntry] = useState(false);
  const [showScheduleEntry, setShowScheduleEntry] = useState(false);
  const [editingBOQ, setEditingBOQ] = useState(false);

  // Vendor and Purchase Management state
  const [vendors, setVendors] = useState<any[]>([]);
  const [showRFQDialog, setShowRFQDialog] = useState(false);
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);
  const [selectedMaterialForPurchase, setSelectedMaterialForPurchase] = useState<any>(null);
  const [showBatchPurchaseDialog, setShowBatchPurchaseDialog] = useState(false);
  const [showPODialog, setShowPODialog] = useState(false);
  
  // RFQ state
  const [rfqForm, setRfqForm] = useState({ vendor: '', deliveryDate: '', notes: '' });
  
  // Individual purchase request state
  const [purchaseForm, setPurchaseForm] = useState({
    vendorId: '',
    requestedQuantity: ''
  });
  
  // Purchase request state
  const [purchaseRates, setPurchaseRates] = useState<{[key: string]: number}>({});
  const [purchaseTax, setPurchaseTax] = useState<{[key: string]: number}>({});
  const [purchaseRoundOffs, setPurchaseRoundOffs] = useState<{[key: string]: number}>({});
  const [purchaseHsn, setPurchaseHsn] = useState<{[key: string]: string}>({});
  const [purchaseRemarks, setPurchaseRemarks] = useState<{[key: string]: string}>({});
  const [purchaseQuantities, setPurchaseQuantities] = useState<{[key: string]: string}>({});
  const [purchaseUnits, setPurchaseUnits] = useState<{[key: string]: string}>({});
  const [purchaseConversions, setPurchaseConversions] = useState<{[key: string]: string}>({});
  const [purchaseShippingLocation, setPurchaseShippingLocation] = useState('');
  const [editingPurchaseRequest, setEditingPurchaseRequest] = useState<EditableProjectPurchaseRequest | null>(null);
  const [editRequestLoading, setEditRequestLoading] = useState(false);
  const [savingRequestEdit, setSavingRequestEdit] = useState(false);
  const [deletingRequestId, setDeletingRequestId] = useState<string | null>(null);
  const [newMaterialIdForRequest, setNewMaterialIdForRequest] = useState<string>('');
  const [selectedVendor, setSelectedVendor] = useState<any>(null);
  const [piFile, setPiFile] = useState<File | null>(null);
  const [rfqQuantities, setRfqQuantities] = useState<{[key: string]: string}>({});
  const [expandedMaterials, setExpandedMaterials] = useState<Set<string>>(new Set());
  const [materialsCatalog, setMaterialsCatalog] = useState<Array<{
    id: string;
    name: string;
    hsn_code?: string | null;
    category?: string | null;
    unit?: string | null;
    description?: string | null;
  }>>([]);
  const [materialsCatalogLoading, setMaterialsCatalogLoading] = useState(false);
  
  // Generate PO state
  const [poRates, setPoRates] = useState<{[key: string]: number}>({});
  const [poTax, setPoTax] = useState<{[key: string]: number}>({});
  const [poRemarks, setPoRemarks] = useState<{[key: string]: string}>({});
  const [poQuantities, setPoQuantities] = useState<{[key: string]: string}>({});
  const [poVendor, setPoVendor] = useState<string>('');
  
  // Material Form state
  const [materialForm, setMaterialForm] = useState({
    materialId: '',
    materialSearch: '',
    quantity: '',
    unit: 'bags',
    description: ''
  });
  const [showAddMaterial, setShowAddMaterial] = useState(false);
  const [showMiniRequestDialog, setShowMiniRequestDialog] = useState(false);
  const [miniRequestForm, setMiniRequestForm] = useState({ name: '', hsn_code: '', category: '', unit: '' });
  const [miniRequestSubmitting, setMiniRequestSubmitting] = useState(false);
  const [miniRequestSuccess, setMiniRequestSuccess] = useState(false);

  const UNIT_OPTIONS = [
    'bags', 'tons', 'cubic meters', 'square meters', 'meters', 'pieces',
    'kilograms', 'liters', 'boxes', 'rolls', 'sheets', 'numbers', 'cubic feet', 'square feet', 'feet'
  ];
  const [materialSubmitting, setMaterialSubmitting] = useState(false);

  // BOQ and Schedule data state
  const [boqData, setBOQData] = useState<any>(null);
  const [scheduleData, setScheduleData] = useState<any>(null);
  const [boqLoading, setBOQLoading] = useState(false);
  const [scheduleLoading, setScheduleLoading] = useState(false);

  // File upload state
  const [dragActive, setDragActive] = useState(false);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    file: null as File | null,
    category: '',
    description: '',
    version: '1.0'
  });

  // PDF Viewer and Takeoff state
  const [showPDFViewer, setShowPDFViewer] = useState(false);
  const [currentPDFUrl, setCurrentPDFUrl] = useState<string>('');
  const [currentPDFName, setCurrentPDFName] = useState<string>('');
  const [useAnalysisMode, setUseAnalysisMode] = useState(false);
  const activePOReference = React.useMemo(
    () => poReferences.find((po) => po.is_default && po.status === 'active') || poReferences.find((po) => po.status === 'active') || null,
    [poReferences]
  );

  // Load project data on mount
  useEffect(() => {
    if (isLoaded && projectId && contractor) {
      fetchProjectData();
    }
  }, [isLoaded, projectId, contractor]);

  useEffect(() => {
    if (!showAddMaterial) return;
    const fetchMaterialsCatalog = async () => {
      setMaterialsCatalogLoading(true);
      try {
        const response = await fetch('/api/materials?limit=500');
        const result = await response.json();
        if (response.ok && result.success) {
          setMaterialsCatalog(result.data || []);
        } else {
          console.error('Failed to fetch materials catalog:', result.error);
          setMaterialsCatalog([]);
        }
      } catch (error) {
        console.error('Error fetching materials catalog:', error);
        setMaterialsCatalog([]);
      } finally {
        setMaterialsCatalogLoading(false);
      }
    };

    fetchMaterialsCatalog();
  }, [showAddMaterial]);

  useEffect(() => {
    if (!showBatchPurchaseDialog || selectedMaterials.size === 0) return;
    setPurchaseUnits((prev) => {
      const next = { ...prev };
      selectedMaterials.forEach((materialId) => {
        if (!next[materialId]) {
          const material = projectMaterials.find((m) => m.id === materialId);
          next[materialId] = material?.unit || 'units';
        }
      });
      return next;
    });
    setPurchaseConversions((prev) => {
      const next = { ...prev };
      selectedMaterials.forEach((materialId) => {
        if (!next[materialId]) {
          next[materialId] = '1';
        }
      });
      return next;
    });
  }, [showBatchPurchaseDialog, selectedMaterials, projectMaterials]);

  useEffect(() => {
    if (!showBatchPurchaseDialog) return;
    setPurchaseShippingLocation((prev) => prev || project?.project_address || project?.location || '');
  }, [showBatchPurchaseDialog, project?.project_address, project?.location]);

  useEffect(() => {
    if (!showBatchPurchaseDialog) return;
    if (!selectedPOForRequest && activePOReference) {
      setSelectedPOForRequest(activePOReference.id);
    }
  }, [showBatchPurchaseDialog, activePOReference, selectedPOForRequest]);

  const fetchProjectData = async () => {
    try {
      setProjectLoading(true);
      
      // Fetch specific project details using the new endpoint
      const response = await fetch(`/api/projects/${projectId}`);
      if (response.ok) {
        const data = await response.json();
        console.log('Individual Project API Response:', data);
        
        if (data.success && data.data) {
          setProject(data.data);
          setEnhancedProjectData(data.data);
          setProjectForm({
            project_name: data.data.project_name || '',
            client_name: data.data.client_name || '',
            project_address: data.data.project_address || data.data.location || ''
          });
          
          // Load project materials, files, etc.
          await Promise.all([
            fetchProjectMaterials(projectId),
            fetchProjectPOReferences(projectId),
            fetchProjectFiles(projectId),
            checkDocumentStatus(data.data),
            fetchBOQData(projectId),
            fetchScheduleData(projectId),
            fetchMeasurementStatus(projectId)
          ]);
        } else {
          console.error('Project not found or API error:', data);
          router.push('/dashboard/contractor/projects');
        }
      } else {
        console.error('Failed to fetch project:', response.status);
        router.push('/dashboard/contractor/projects');
      }
    } catch (error) {
      console.error('Error fetching project data:', error);
      router.push('/dashboard/contractor/projects');
    } finally {
      setProjectLoading(false);
    }
  };

  const fetchProjectMaterials = async (projectId: string) => {
    try {
      const response = await fetch(`/api/project-materials-normalized?project_id=${projectId}`);
      const result = await response.json();

      if (!response.ok || !result.success) {
        console.error('Failed to fetch normalized project materials:', result.error);
        setProjectMaterials([]);
        return;
      }

    const transformed: ProjectMaterialWithStats[] = (result.data || []).map((material: ProjectMaterialForUI) => {
      const requiredBase = Number(
        material.required_qty ??
        material.requested_qty ??
        material.available_qty ??
        0
      );
      const requested = Number(material.requested_qty ?? 0);
      const ordered = Number(material.ordered_qty ?? 0);
      const pending = Math.max(requested - ordered, 0);
      const committedQty = Math.max(requested, ordered, 0);
      const maxRequestable = Math.max(requiredBase - committedQty, 0);

      return {
        ...material,
        pending_qty: pending,
        max_requestable: maxRequestable,
      };
    });

      setProjectMaterials(transformed);
    setSelectedMaterials(prev => {
      const valid = new Set<string>();
      transformed.forEach(material => {
        if (prev.has(material.id) && material.max_requestable > 0) {
          valid.add(material.id);
        }
      });
      return valid;
    });
    setExpandedMaterials(prev => {
      const next = new Set<string>();
      transformed.forEach(material => {
        if (prev.has(material.id)) {
          next.add(material.id);
        }
      });
      return next;
    });
    } catch (error) {
      console.error('Error fetching project materials:', error);
      setProjectMaterials([]);
    }
  };

  const fetchProjectPOReferences = async (targetProjectId: string) => {
    try {
      setPOReferencesLoading(true);
      const response = await fetch(`/api/projects/${targetProjectId}/po-references`);
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to load project POs');
      }
      setPOReferences(result.data?.po_references || []);
    } catch (error) {
      console.error('Failed to fetch project PO references:', error);
      setPOReferences([]);
    } finally {
      setPOReferencesLoading(false);
    }
  };

  const handleManualMaterialSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!project?.id) {
      alert('Project not loaded yet.');
      return;
    }

    if (!materialForm.materialId || !materialForm.quantity.trim() || !materialForm.unit.trim()) {
      alert('Material, quantity, and unit are required.');
      return;
    }

    const quantityValue = Number(materialForm.quantity);
    if (!Number.isFinite(quantityValue) || quantityValue <= 0) {
      alert('Quantity must be a positive number.');
      return;
    }

    setMaterialSubmitting(true);
    try {
      const response = await fetch('/api/project-materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: project.id,
          material_id: materialForm.materialId,
          quantity: quantityValue,
          unit: materialForm.unit.trim(),
          notes: materialForm.description.trim() || undefined,
          source_type: 'manual'
        })
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to add material');
      }

      setMaterialForm({
        materialId: '',
        materialSearch: '',
        quantity: '',
        unit: 'bags',
        description: ''
      });
      setShowAddMaterial(false);
      await fetchProjectMaterials(project.id);
    } catch (error) {
      console.error('Failed to add manual material:', error);
      alert(error instanceof Error ? error.message : 'Failed to add material');
    } finally {
      setMaterialSubmitting(false);
    }
  };

  const fetchProjectFiles = async (projectId: string) => {
    try {
      const response = await fetch(`/api/project-files?project_id=${projectId}`);
      if (response.ok) {
        const data = await response.json();
        setProjectFiles(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching project files:', error);
    }
  };

  const saveProjectDetails = async () => {
    if (!project?.id) return;

    try {
      setSavingProjectDetails(true);
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_name: projectForm.project_name,
          project_address: projectForm.project_address
        })
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to update project');
      }

      setProject(result.data);
      setEnhancedProjectData(result.data);
      setProjectForm({
        project_name: result.data.project_name || '',
        client_name: result.data.client_name || '',
        project_address: result.data.project_address || result.data.location || ''
      });
      setShowEditProjectDialog(false);
    } catch (error) {
      console.error('Failed to update project:', error);
      alert(error instanceof Error ? error.message : 'Failed to update project');
    } finally {
      setSavingProjectDetails(false);
    }
  };

  const checkDocumentStatus = async (project: any) => {
    setDocumentStatusLoading(true);
    try {
      // Check for BOQ data
      const boqResponse = await fetch(`/api/project-files?project_id=${project.id}&file_type=boq`);
      if (boqResponse.ok) {
        const boqData = await boqResponse.json();
        setHasBOQData(boqData.data && boqData.data.length > 0);
      }
      
      // Check for schedule data  
      const scheduleResponse = await fetch(`/api/project-files?project_id=${project.id}&file_type=schedule`);
      if (scheduleResponse.ok) {
        const scheduleData = await scheduleResponse.json();
        setHasScheduleData(scheduleData.data && scheduleData.data.length > 0);
      }
    } catch (error) {
      console.error('Error checking document status:', error);
    } finally {
      setDocumentStatusLoading(false);
    }
  };

  const fetchBOQData = async (projectId: string) => {
    try {
      setBOQLoading(true);
      const boqData = await getBOQByProjectId(projectId);
      setBOQData(boqData);
      setHasBOQData(Boolean(boqData && boqData.length > 0));
    } catch (error) {
      console.error('Error fetching BOQ data:', error);
      setHasBOQData(false);
    } finally {
      setBOQLoading(false);
    }
  };

  const fetchScheduleData = async (projectId: string) => {
    try {
      setScheduleLoading(true);
      const scheduleData = await getScheduleByProjectId(projectId);
      setScheduleData(scheduleData);
      setHasScheduleData(Boolean(scheduleData && scheduleData.length > 0));
    } catch (error) {
      console.error('Error fetching schedule data:', error);
      setHasScheduleData(false);
    } finally {
      setScheduleLoading(false);
    }
  };

  const fetchMeasurementStatus = async (projectId: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/measurements`);
      const result = await response.json();
      if (response.ok && result.success) {
        setHasMeasurementRows(Boolean(result.data?.has_measurements));
      } else {
        setHasMeasurementRows(false);
      }
    } catch (error) {
      console.error('Error fetching measurement status:', error);
      setHasMeasurementRows(false);
    }
  };

  // Upload file to project
  const uploadFile = async () => {
    if (!uploadForm.file || !uploadForm.category || !project) {
      alert('Please select a file and category');
      return;
    }

    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadForm.file);
      formData.append('project_id', project.id);
      formData.append('category', uploadForm.category);
      formData.append('description', uploadForm.description);
      formData.append('version', uploadForm.version);

      const response = await fetch('/api/project-files', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        // Add to local state
        setProjectFiles(prev => [result.data, ...prev]);
        
        // Reset form and close dialog
        setUploadForm({ file: null, category: '', description: '', version: '1.0' });
        setShowUploadDialog(false);
        
        alert('File uploaded successfully!');
      } else {
        alert(result.error || 'Failed to upload file');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Error uploading file');
    } finally {
      setUploadingFile(false);
    }
  };

  // Delete file from project
  const deleteFile = async (fileId: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return;

    try {
      const response = await fetch(`/api/project-files?id=${fileId}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (result.success) {
        setProjectFiles(prev => prev.filter(f => f.id !== fileId));
        alert('File deleted successfully!');
      } else {
        alert(result.error || 'Failed to delete file');
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      alert('Error deleting file');
    }
  };

  // View/Download file
  const viewFile = async (fileId: string) => {
    try {
      const fileRecord = projectFiles.find((file) => file.id === fileId);
      const inlineViewUrl = `/api/project-files/view?id=${encodeURIComponent(fileId)}`;

      if (fileRecord?.mime_type === 'application/pdf' || fileRecord?.file_type === 'application/pdf') {
        setCurrentPDFUrl(inlineViewUrl);
        setCurrentPDFName(fileRecord.original_name || fileRecord.file_name || 'PDF Document');
        setUseAnalysisMode(false);
        setShowPDFViewer(true);
        return;
      }

      const response = await fetch(`/api/project-files/download?id=${fileId}`);
      const result = await response.json();

      if (result.success) {
        const { downloadUrl, fileName, mimeType } = result.data;
        
        // If it's a PDF, show in our viewer
        if (mimeType === 'application/pdf') {
          setCurrentPDFUrl(inlineViewUrl);
          setCurrentPDFName(fileName);
          setUseAnalysisMode(false);
          setShowPDFViewer(true);
        } else {
          // For other file types, download or open in new tab
          const link = document.createElement('a');
          link.href = downloadUrl;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      } else {
        alert(result.error || 'Failed to download file');
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Error downloading file');
    }
  };

  // Quantity takeoff for drawing file
  const takeoffFile = async (fileId: string) => {
    try {
      const fileRecord = projectFiles.find((file) => file.id === fileId);
      const inlineViewUrl = `/api/project-files/view?id=${encodeURIComponent(fileId)}`;

      if (fileRecord?.mime_type === 'application/pdf' || fileRecord?.file_type === 'application/pdf') {
        setCurrentPDFUrl(inlineViewUrl);
        setCurrentPDFName(fileRecord.original_name || fileRecord.file_name || 'PDF Document');
        setUseAnalysisMode(true);
        setShowPDFViewer(true);
        return;
      }

      const response = await fetch(`/api/project-files/download?id=${fileId}`);
      const result = await response.json();

      if (result.success) {
        const { downloadUrl, fileName, mimeType } = result.data;
        
        // Only for PDFs (drawings)
        if (mimeType === 'application/pdf') {
          setCurrentPDFUrl(inlineViewUrl);
          setCurrentPDFName(fileName);
          setUseAnalysisMode(true); // Enable takeoff mode
          setShowPDFViewer(true);
        } else {
          alert('Quantity takeoff is only available for PDF files');
        }
      } else {
        alert(result.error || 'Failed to load file for takeoff');
      }
    } catch (error) {
      console.error('Error loading file for takeoff:', error);
      alert('Error loading file for takeoff');
    }
  };

  // Fetch vendors for RFQ/Purchase operations
  const fetchVendors = async () => {
    if (!contractor?.id) return;
    
    try {
      const response = await fetch(`/api/vendors?contractor_id=${contractor.id}`);
      if (response.ok) {
        const data = await response.json();
        console.log('Vendors API response:', data);
        setVendors(data.vendors || data.data || []);
      } else {
        console.error('Failed to fetch vendors:', response.status);
      }
    } catch (error) {
      console.error('Error fetching vendors:', error);
    }
  };

  // Load vendors on component mount
  useEffect(() => {
    if (isLoaded && contractor) {
      fetchVendors();
    }
  }, [isLoaded, contractor]);

  const toggleMaterialExpansion = (materialId: string) => {
    setExpandedMaterials(prev => {
      const next = new Set(prev);
      if (next.has(materialId)) {
        next.delete(materialId);
      } else {
        next.add(materialId);
      }
      return next;
    });
  };
  // Handle material selection for batch operations
  const handleMaterialSelection = (materialId: string, selected: boolean) => {
    const material = projectMaterials.find(m => m.id === materialId);
    const newSelected = new Set(selectedMaterials);
    if (selected) {
      newSelected.add(materialId);
      if (material) {
        setRfqQuantities(prev => ({
          ...prev,
          [materialId]: prev[materialId] || (material.max_requestable > 0 ? material.max_requestable.toString() : (material.required_qty?.toString() || '0'))
        }));
      }
    } else {
      newSelected.delete(materialId);
      setRfqQuantities(prev => {
        const next = { ...prev };
        delete next[materialId];
        return next;
      });
    }
    setSelectedMaterials(newSelected);
  };

  // Handle bulk RFQ generation
  const handleGenerateRFQ = () => {
    if (selectedMaterials.size === 0) {
      alert('Please select materials to generate RFQ');
      return;
    }
    setShowRFQDialog(true);
  };

  // Handle bulk purchase request submission
  const handleSubmitPurchaseRequest = () => {
    if (selectedMaterials.size === 0) {
      alert('Please select materials to submit');
      return;
    }
    setShowBatchPurchaseDialog(true);
  };

  // Delete a material from the project
  const deleteMaterial = async (materialId: string) => {
    if (!confirm('Are you sure you want to delete this material?')) return;

    try {
      const response = await fetch(`/api/project-materials/${materialId}`, { method: 'DELETE' });
      const result = await response.json();

      if (response.ok && (result.success ?? true)) {
        setProjectMaterials(prev => prev.filter(m => m.id !== materialId));
        setSelectedMaterials(prev => {
          const updated = new Set(prev);
          updated.delete(materialId);
          return updated;
        });
        alert('Material deleted successfully!');
      } else {
        alert(result.error || 'Failed to delete material');
      }
    } catch (error) {
      console.error('Error deleting material:', error);
      alert('Error deleting material');
    }
  };

  // Generate RFQ PDF
  const generateRFQPDF = async () => {
    if (!selectedVendor) {
      alert('Please select a vendor');
      return;
    }

    if (selectedMaterials.size === 0) {
      alert('Please select materials to include in the RFQ');
      return;
    }

    const selectedMaterialsList = projectMaterials
      .filter(m => selectedMaterials.has(m.id))
      .map((material) => {
        const enteredQty = parseFloat(rfqQuantities[material.id] || '');
        const quantity = !isNaN(enteredQty) && enteredQty > 0
          ? enteredQty
          : material.max_requestable > 0
          ? material.max_requestable
          : material.required_qty || 0;
        return { material, quantity };
      });

    const invalidMaterials = selectedMaterialsList.filter(({ material, quantity }) => 
      quantity <= 0 || (material.max_requestable > 0 && quantity > material.max_requestable)
    );

    if (invalidMaterials.length > 0) {
      const names = invalidMaterials.map(({ material }) => material.name || 'Unknown Material').join(', ');
      alert(`Please enter valid quantities for: ${names}`);
      return;
    }
    
    // Create new PDF document
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    let yPosition = 20;

    // Header
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('REQUEST FOR QUOTATION', pageWidth / 2, yPosition, { align: 'center' });
    
    yPosition += 12;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Date: ${new Date().toLocaleDateString()}`, pageWidth / 2, yPosition, { align: 'center' });
    
    yPosition += 18;

    // Company Info
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('FROM:', 20, yPosition);
    yPosition += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`${contractor?.company_name || 'Company Name'}`, 20, yPosition);
    yPosition += 5;
    doc.text(`${contractor?.contact_person || 'Contact Person'}`, 20, yPosition);
    yPosition += 5;
    doc.text(`${contractor?.email || 'Email'}`, 20, yPosition);
    yPosition += 5;
    doc.text(`${contractor?.phone || 'Phone'}`, 20, yPosition);

    // TO section
    yPosition += 15;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('TO:', 20, yPosition);
    yPosition += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(selectedVendor.name || 'Vendor Name', 20, yPosition);
    yPosition += 5;
    doc.text(`${selectedVendor.contact_person || 'Contact Person'}`, 20, yPosition);
    yPosition += 5;
    doc.text(`${selectedVendor.email || 'Email'}`, 20, yPosition);

    yPosition += 15;

    // Materials Table
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    const tableHeaders = ['Sr.No.', 'Item Description', 'Quantity', 'Unit', 'Rate (₹)', 'Total (₹)'];
    const colWidths = [15, 70, 20, 15, 25, 25];
    let xPos = 20;
    
    tableHeaders.forEach((header, index) => {
      doc.text(header, xPos, yPosition);
      xPos += colWidths[index] || 0;
    });
    
    doc.line(20, yPosition + 1, pageWidth - 20, yPosition + 1);
    yPosition += 6;

    // Table Rows
    doc.setFont('helvetica', 'normal');
    selectedMaterialsList.forEach(({ material, quantity }, index) => {
      xPos = 20;
      const rowData = [
        (index + 1).toString(),
        material.name || 'Unknown Material',
        quantity.toString(),
        material.unit || 'Unit',
        '', // Rate to be filled by vendor
        '' // Total to be filled by vendor
      ];
      
      rowData.forEach((data, colIndex) => {
        const text = doc.splitTextToSize(data, (colWidths[colIndex] || 0) - 2);
        doc.text(text, xPos, yPosition);
        xPos += (colWidths[colIndex] || 0);
      });
      yPosition += 6;
    });

    doc.line(20, yPosition, pageWidth - 20, yPosition);
    yPosition += 10;

    // Terms and Conditions
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Terms & Conditions:', 20, yPosition);
    yPosition += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const terms = [
      '• Please quote your best rates including all taxes',
      '• Delivery time should be mentioned',
      '• Payment terms: As per agreement',
      '• Quality: As per specifications'
    ];

    terms.forEach(term => {
      doc.text(term, 20, yPosition);
      yPosition += 6;
    });

    // Generate filename and save
    const timestamp = new Date().toISOString().slice(0, 10);
    const vendorName = (selectedVendor.name || 'vendor').replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `RFQ_${vendorName}_${timestamp}.pdf`;
    doc.save(filename);
    
    // Close dialog and reset
    setShowRFQDialog(false);
    setRfqForm({ vendor: '', deliveryDate: '', notes: '' });
    setSelectedMaterials(new Set());
    setRfqQuantities({});
    
    alert('RFQ PDF generated and downloaded successfully!');
  };

  // Utility functions
  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(num);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTwoDecimals = (value: number) =>
    value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const getRequiredQty = (materialId: string) => {
    return parseFloat(purchaseQuantities[materialId] || '0') || 0;
  };

  const getConversionFactor = (materialId: string) => {
    const parsed = parseFloat(purchaseConversions[materialId] || '1');
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  };

  // Purchase qty is auto-derived and rounded to 2 decimals for decimal-unit procurement.
  const getComputedPurchaseQty = (materialId: string) => {
    const requiredQty = getRequiredQty(materialId);
    if (requiredQty <= 0) return 0;
    const conversionFactor = getConversionFactor(materialId);
    const purchaseQty = requiredQty / conversionFactor;
    return Math.round(purchaseQty * 100) / 100;
  };

  const getNormalizedCoverageQty = (materialId: string) => {
    const purchaseQty = getComputedPurchaseQty(materialId);
    const conversionFactor = getConversionFactor(materialId);
    return purchaseQty * conversionFactor;
  };

  const getRoundOffValue = (materialId: string) => {
    const value = purchaseRoundOffs[materialId];
    return Number.isFinite(value) ? value : 0;
  };

  const getLineTotal = (materialId: string) => {
    const purchaseQty = getComputedPurchaseQty(materialId);
    const rate = purchaseRates[materialId] || 0;
    const tax = purchaseTax[materialId] || 0;
    const roundOff = getRoundOffValue(materialId);
    const subtotal = purchaseQty * rate;
    const withTax = subtotal + (subtotal * tax) / 100;
    return withTax + roundOff;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-yellow-500/20 text-yellow-400';
      case 'active': return 'bg-green-500/20 text-green-400';
      case 'completed': return 'bg-blue-500/20 text-blue-400';
      case 'on_hold': return 'bg-orange-500/20 text-orange-400';
      case 'cancelled': return 'bg-red-500/20 text-red-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getPurchaseRequestStatusClass = (status: string) => {
    const normalized = (status || '').toLowerCase();
    switch (normalized) {
      case 'draft':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'submitted':
        return 'bg-accent-amber/20 text-accent-amber';
      case 'approved':
        return 'bg-blue-500/20 text-blue-400';
      case 'funded':
        return 'bg-green-500/20 text-green-400';
      case 'po_generated':
        return 'bg-purple-500/20 text-purple-400';
      case 'completed':
        return 'bg-green-500/20 text-green-400';
      case 'rejected':
        return 'bg-red-500/20 text-red-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  const canEditPurchaseRequest = (status: string) => {
    const normalized = (status || '').toLowerCase();
    return normalized === 'draft' || normalized === 'submitted' || normalized === 'approved';
  };

  const addProjectPOReference = async () => {
    if (!project?.id) return;
    const poNumber = poForm.po_number.trim();
    if (!poNumber) {
      alert('PO number is required');
      return;
    }

    try {
      setAddingPO(true);
      const response = await fetch(`/api/projects/${project.id}/po-references`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          po_number: poNumber,
          po_date: poForm.po_date || null,
          po_value: poForm.po_value ? Number(poForm.po_value) : null,
          po_type: poReferences.length === 0 ? 'original' : poForm.po_type,
          status: 'active',
          is_default: poReferences.length === 0,
          notes: poForm.notes.trim() || null,
          previous_po_reference_id: poForm.previous_po_reference_id || null,
        })
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to add client PO');
      }

      setPOForm({
        po_number: '',
        po_date: '',
        po_value: '',
        po_type: 'supplemental',
        notes: '',
        previous_po_reference_id: '',
      });
      setShowAddPOForm(false);
      await fetchProjectPOReferences(project.id);
    } catch (error) {
      console.error('Failed to add project PO:', error);
      alert(error instanceof Error ? error.message : 'Failed to add project PO');
    } finally {
      setAddingPO(false);
    }
  };

  const updateProjectPOStatus = async (
    poId: string,
    updates: Partial<Pick<ProjectPOReferenceSummary, 'status' | 'is_default' | 'notes' | 'po_number' | 'po_date' | 'po_value' | 'po_type' | 'previous_po_reference_id'>>
  ) => {
    if (!project?.id) return;
    try {
      setPOActionLoadingId(poId);
      const response = await fetch(`/api/projects/${project.id}/po-references/${poId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to update client PO');
      }
      await fetchProjectPOReferences(project.id);
    } catch (error) {
      console.error('Failed to update project PO:', error);
      alert(error instanceof Error ? error.message : 'Failed to update client PO');
    } finally {
      setPOActionLoadingId(null);
    }
  };

  const reassignOpenRequestsToPO = async (poId: string, poNumber: string) => {
    if (!project?.id) return;
    const confirmed = window.confirm(`Move all open purchase requests on this project to ${poNumber}? Locked/commercially committed requests will stay on their current PO.`);
    if (!confirmed) return;

    try {
      setBulkReassigningPOId(poId);
      const response = await fetch(`/api/projects/${project.id}/po-references/${poId}/reassign-open-requests`, {
        method: 'POST'
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to reassign open purchase requests');
      }
      await Promise.all([fetchProjectMaterials(project.id), fetchProjectPOReferences(project.id)]);
      alert(`Reassigned ${result.data?.updated_count || 0} open purchase requests to ${poNumber}.`);
    } catch (error) {
      console.error('Failed to reassign open purchase requests:', error);
      alert(error instanceof Error ? error.message : 'Failed to reassign open purchase requests');
    } finally {
      setBulkReassigningPOId(null);
    }
  };

  const projectPurchaseRequests = React.useMemo<ProjectPurchaseRequestSummary[]>(() => {
    const map = new Map<
      string,
      ProjectPurchaseRequestSummary
    >();

    projectMaterials.forEach((material) => {
      (material.request_history || []).forEach((item) => {
        if (!item.purchase_request_id) return;
        const existing = map.get(item.purchase_request_id);
        const qty = Number((item as any).purchase_qty ?? item.requested_qty ?? 0) || 0;
        const rate = Number(item.unit_rate ?? 0) || 0;
        const taxPercent = Number(item.tax_percent ?? 0) || 0;
        const roundOffAmount = Number((item as any).round_off_amount ?? 0) || 0;
        const base = qty * rate;
        const total = base + (base * taxPercent) / 100 + roundOffAmount;

        if (!existing) {
          map.set(item.purchase_request_id, {
            id: item.purchase_request_id,
            status: item.purchase_request?.status || item.status || 'submitted',
            created_at: item.purchase_request?.created_at || item.created_at,
            line_items: 1,
            estimated_total: total,
            project_po_reference_id: item.purchase_request?.project_po_reference_id || null,
            po_number: item.purchase_request?.project_po_reference?.po_number || null
          });
          return;
        }

        existing.line_items += 1;
        existing.estimated_total += total;
        if (item.purchase_request?.status) {
          existing.status = item.purchase_request.status;
        }
        const nextCreatedAt = item.purchase_request?.created_at || item.created_at;
        if (nextCreatedAt && new Date(nextCreatedAt).getTime() < new Date(existing.created_at).getTime()) {
          existing.created_at = nextCreatedAt;
        }
        if (item.purchase_request?.project_po_reference_id) {
          existing.project_po_reference_id = item.purchase_request.project_po_reference_id;
          existing.po_number = item.purchase_request.project_po_reference?.po_number || existing.po_number;
        }
        map.set(item.purchase_request_id, existing);
      });
    });

    return Array.from(map.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [projectMaterials]);

  const addableMaterialsForEdit = React.useMemo(() => {
    if (!editingPurchaseRequest) return [];
    const existing = new Set(editingPurchaseRequest.items.map((item) => item.project_material_id));
    return projectMaterials.filter(
      (material) => !existing.has(material.id) && Number(material.max_requestable || 0) > 0
    );
  }, [editingPurchaseRequest, projectMaterials]);

  const openEditPurchaseRequestModal = async (requestId: string) => {
    try {
      setEditRequestLoading(true);
      const response = await fetch(`/api/purchase-requests/${requestId}`);
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to load purchase request');
      }
      setEditingPurchaseRequest({
        ...result.data,
        project_po_reference: result.data.project_po_references || result.data.project_po_reference || null,
      });
      setNewMaterialIdForRequest('');
    } catch (error) {
      console.error('Failed to load purchase request for edit:', error);
      alert(error instanceof Error ? error.message : 'Failed to load purchase request');
    } finally {
      setEditRequestLoading(false);
    }
  };

  const updateRequestEditItem = (
    itemId: string,
    field: keyof EditableProjectPurchaseRequestItem,
    value: string
  ) => {
    if (!editingPurchaseRequest) return;
    const nextItems = editingPurchaseRequest.items.map((item) => {
      if (item.id !== itemId) return item;
      if (field === 'hsn_code') {
        return { ...item, hsn_code: value.toUpperCase().slice(0, 16) || null };
      }
      if (field === 'item_description') {
        return { ...item, item_description: value || null };
      }
      if (field === 'requested_qty' || field === 'unit_rate' || field === 'tax_percent' || field === 'round_off_amount') {
        const parsed = value === '' ? null : Number(value);
        if (field === 'requested_qty') {
          return { ...item, requested_qty: Number.isFinite(parsed as number) ? (parsed as number) : 0 };
        }
        if (field === 'round_off_amount') {
          return { ...item, round_off_amount: Number.isFinite(parsed as number) ? (parsed as number) : 0 };
        }
        return { ...item, [field]: Number.isFinite(parsed as number) ? (parsed as number) : null };
      }
      return item;
    });
    setEditingPurchaseRequest({ ...editingPurchaseRequest, items: nextItems });
  };

  const addMaterialToEditingRequest = () => {
    if (!editingPurchaseRequest || !newMaterialIdForRequest) return;
    const material = projectMaterials.find((m) => m.id === newMaterialIdForRequest);
    if (!material) return;
    if (editingPurchaseRequest.items.some((item) => item.project_material_id === material.id)) {
      return;
    }
    if (Number(material.max_requestable || 0) <= 0) {
      return;
    }
    const newRow: EditableProjectPurchaseRequestItem = {
      id: `new-${Date.now()}`,
      project_material_id: material.id,
      item_description: material.notes || material.description || null,
      requested_qty: Math.max(Math.min(material.max_requestable || 1, 1), 0.001),
      unit_rate: 0,
      tax_percent: 0,
      round_off_amount: 0,
      hsn_code: material.hsn_code || null,
      material_name: material.name || 'Material',
      unit: material.unit || 'unit'
    };

    setEditingPurchaseRequest({
      ...editingPurchaseRequest,
      items: [...editingPurchaseRequest.items, newRow]
    });
    setNewMaterialIdForRequest('');
  };

  const removeMaterialFromEditingRequest = (itemId: string) => {
    if (!editingPurchaseRequest) return;
    setEditingPurchaseRequest({
      ...editingPurchaseRequest,
      items: editingPurchaseRequest.items.filter((item) => item.id !== itemId)
    });
  };

  const saveEditedPurchaseRequest = async () => {
    if (!editingPurchaseRequest) return;

    const invalidItem = editingPurchaseRequest.items.find(
      (item) => !Number.isFinite(item.requested_qty) || item.requested_qty <= 0
    );
    if (invalidItem) {
      alert('Requested quantity must be greater than zero for all items');
      return;
    }

    try {
      setSavingRequestEdit(true);
      const requiresPOForProject = ['awarded', 'finalized', 'completed'].includes(
        String(project?.project_status || project?.status || '').toLowerCase()
      );
      if (requiresPOForProject && !editingPurchaseRequest.project_po_reference_id) {
        alert('Select an active client PO before saving this purchase request.');
        return;
      }
      const response = await fetch(`/api/purchase-requests/${editingPurchaseRequest.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          remarks: editingPurchaseRequest.remarks || null,
          shipping_location: editingPurchaseRequest.shipping_location || null,
          project_po_reference_id: editingPurchaseRequest.project_po_reference_id || null,
          items: editingPurchaseRequest.items.map((item) => ({
            ...(item.id.startsWith('new-') ? {} : { id: item.id }),
            project_material_id: item.project_material_id,
            item_description: item.item_description,
            requested_qty: item.requested_qty,
            unit_rate: item.unit_rate,
            tax_percent: item.tax_percent,
            round_off_amount: item.round_off_amount,
            hsn_code: item.hsn_code
          }))
        })
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to update purchase request');
      }

      setEditingPurchaseRequest(null);
      await Promise.all([fetchProjectMaterials(projectId), fetchProjectPOReferences(projectId)]);
    } catch (error) {
      console.error('Failed to update purchase request:', error);
      alert(error instanceof Error ? error.message : 'Failed to update purchase request');
    } finally {
      setSavingRequestEdit(false);
    }
  };

  const deletePurchaseRequest = async (requestId: string) => {
    const confirmed = window.confirm(
      `Delete request #${requestId.slice(0, 8).toUpperCase()}?\n\nThis removes the request and all its line items.`
    );
    if (!confirmed) return;

    try {
      setDeletingRequestId(requestId);
      const response = await fetch(`/api/purchase-requests/${requestId}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to delete purchase request');
      }
      await Promise.all([fetchProjectMaterials(projectId), fetchProjectPOReferences(projectId)]);
    } catch (error) {
      console.error('Failed to delete purchase request:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete purchase request');
    } finally {
      setDeletingRequestId(null);
    }
  };

  // Loading and error states
  if (!isLoaded || contractorLoading || projectLoading) {
    return (
      <ContractorDashboardLayout activeTab="projects">
        <div className="flex items-center justify-center min-h-screen">
          <LoadingSpinner />
        </div>
      </ContractorDashboardLayout>
    );
  }

  if (!project) {
    return (
      <ContractorDashboardLayout activeTab="projects">
        <div className="p-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-primary mb-2">Project Not Found</h1>
            <p className="text-secondary mb-4">The requested project could not be found.</p>
            <button
              onClick={() => router.push('/dashboard/contractor/projects')}
              className="px-4 py-2 bg-accent-amber text-neutral-dark rounded-lg hover:bg-accent-amber/90 transition-colors"
            >
              Back to Projects
            </button>
          </div>
        </div>
      </ContractorDashboardLayout>
    );
  }

  const isGoogleSheetsProject = 'clientName' in project;
  const clientName = isGoogleSheetsProject ? (project as any).clientName : (project.client_name || 'Unknown Client');
  const projectStatus = project.project_status || project.status || 'draft';

  return (
    <ContractorDashboardLayout activeTab="projects">
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center mb-4">
            <button
              onClick={() => router.push('/dashboard/contractor/projects')}
              className="mr-4 p-2 text-secondary hover:text-primary hover:bg-neutral-medium rounded-lg transition-colors"
            >
              ← Back
            </button>
            <div>
              <h1 className="text-2xl font-bold text-primary">{project.project_name}</h1>
              <p className="text-secondary">Client: {clientName}</p>
            </div>
          </div>
          
          {/* Status Badge */}
          <div className="flex items-center space-x-4">
            <span className={`text-sm px-3 py-1 rounded font-medium ${getStatusColor(projectStatus)}`}>
              {projectStatus.toUpperCase()}
            </span>
            {project.estimated_value && (
              <span className="text-sm text-secondary">
                Value: {formatCurrency(project.estimated_value)}
              </span>
            )}
            {activePOReference && (
              <span className="text-sm text-secondary">
                Active PO: <span className="text-primary font-medium">{activePOReference.po_number}</span>
              </span>
            )}
            <button
              onClick={() => setShowEditProjectDialog(true)}
              className="text-sm px-3 py-1 rounded border border-neutral-medium text-primary hover:bg-neutral-medium rounded-lg transition-colors"
            >
              Edit Project
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-6 border-b border-neutral-medium">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-all ${
              activeTab === 'overview'
                ? 'bg-accent-amber text-neutral-dark border-b-2 border-accent-amber'
                : 'text-secondary hover:text-primary hover:bg-neutral-medium'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('boq')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-all ${
              activeTab === 'boq'
                ? 'bg-accent-amber text-neutral-dark border-b-2 border-accent-amber'
                : 'text-secondary hover:text-primary hover:bg-neutral-medium'
            }`}
          >
            Quote/BOQ
          </button>
          <button
            onClick={() => setActiveTab('schedule')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-all ${
              activeTab === 'schedule'
                ? 'bg-accent-amber text-neutral-dark border-b-2 border-accent-amber'
                : 'text-secondary hover:text-primary hover:bg-neutral-medium'
            }`}
          >
            Schedule
          </button>
          <button
            onClick={() => setActiveTab('measurement')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-all ${
              activeTab === 'measurement'
                ? 'bg-accent-amber text-neutral-dark border-b-2 border-accent-amber'
                : 'text-secondary hover:text-primary hover:bg-neutral-medium'
            }`}
          >
            Measurement Sheet
          </button>
          <button
            onClick={() => setActiveTab('materials')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-all ${
              activeTab === 'materials'
                ? 'bg-accent-amber text-neutral-dark border-b-2 border-accent-amber'
                : 'text-secondary hover:text-primary hover:bg-neutral-medium'
            }`}
          >
            Materials
          </button>
          <button
            onClick={() => setActiveTab('purchase_requests')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-all ${
              activeTab === 'purchase_requests'
                ? 'bg-accent-amber text-neutral-dark border-b-2 border-accent-amber'
                : 'text-secondary hover:text-primary hover:bg-neutral-medium'
            }`}
          >
            Purchase Requests
          </button>
          <button
            onClick={() => setActiveTab('client_pos')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-all ${
              activeTab === 'client_pos'
                ? 'bg-accent-amber text-neutral-dark border-b-2 border-accent-amber'
                : 'text-secondary hover:text-primary hover:bg-neutral-medium'
            }`}
          >
            Client POs
          </button>
          <button
            onClick={() => setActiveTab('files')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-all ${
              activeTab === 'files'
                ? 'bg-accent-amber text-neutral-dark border-b-2 border-accent-amber'
                : 'text-secondary hover:text-primary hover:bg-neutral-medium'
            }`}
          >
            Files
          </button>
        </div>

        {/* Tab Content */}
        <div className="bg-neutral-dark rounded-lg border border-neutral-medium">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="p-6">
              {/* Project Metrics */}
              {metricsLoading && (
                <div className="flex items-center justify-center py-4 text-accent-amber">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-accent-amber mr-2"></div>
                  <span className="text-sm">Calculating metrics...</span>
                </div>
              )}
              
              <div className="grid md:grid-cols-3 gap-6 mb-8">
                <div className="bg-neutral-darker p-4 rounded-lg">
                  <div className="text-xs text-secondary mb-1">Project Value</div>
                  <div className="text-lg font-bold text-primary">
                    {project.estimated_value ? formatCurrency(project.estimated_value) : 'Not specified'}
                  </div>
                </div>
                <div className="bg-neutral-darker p-4 rounded-lg">
                  <div className="text-xs text-secondary mb-1">Status</div>
                  <div className="text-lg font-bold text-accent-amber">
                    {projectStatus.toUpperCase()}
                  </div>
                </div>
                <div className="bg-neutral-darker p-4 rounded-lg">
                  <div className="text-xs text-secondary mb-1">Materials</div>
                  <div className="text-lg font-bold text-primary">
                    {projectMaterials.length} items
                  </div>
                </div>
                <div className="bg-neutral-darker p-4 rounded-lg">
                  <div className="text-xs text-secondary mb-1">Active Client PO</div>
                  <div className="text-lg font-bold text-primary">
                    {activePOReference?.po_number || 'Not set'}
                  </div>
                </div>
                <div className="bg-neutral-darker p-4 rounded-lg md:col-span-3">
                  <div className="text-xs text-secondary mb-1">Project Address</div>
                  <div className="text-sm text-primary whitespace-pre-line">
                    {project.project_address || project.location || 'Not specified'}
                  </div>
                </div>
              </div>

              {/* Project Description */}
              {project.description && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-primary mb-2">Project Description</h3>
                  <p className="text-sm text-secondary leading-relaxed">
                    {project.description}
                  </p>
                </div>
              )}

              {/* Document Status */}
              <div className="mb-6">
                <h3 className="text-lg font-bold text-primary mb-4">Document Status</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-neutral-darker p-4 rounded-lg border border-neutral-medium">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">📊</span>
                        <h4 className="font-semibold text-primary">BOQ</h4>
                      </div>
                      <div className="flex items-center space-x-2">
                        {documentStatusLoading ? (
                          <div className="w-2 h-2 rounded-full bg-accent-amber animate-pulse"></div>
                        ) : (
                          <div className={`w-2 h-2 rounded-full ${hasBOQData ? 'bg-success' : 'bg-neutral-medium'}`}></div>
                        )}
                        <span className="text-xs text-secondary">
                          {documentStatusLoading ? 'Checking...' : hasBOQData ? 'Uploaded' : 'Not uploaded'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-neutral-darker p-4 rounded-lg border border-neutral-medium">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">📅</span>
                        <h4 className="font-semibold text-primary">Schedule</h4>
                      </div>
                      <div className="flex items-center space-x-2">
                        {documentStatusLoading ? (
                          <div className="w-2 h-2 rounded-full bg-accent-amber animate-pulse"></div>
                        ) : (
                          <div className={`w-2 h-2 rounded-full ${hasScheduleData ? 'bg-success' : 'bg-neutral-medium'}`}></div>
                        )}
                        <span className="text-xs text-secondary">
                          {documentStatusLoading ? 'Checking...' : hasScheduleData ? 'Uploaded' : 'Not uploaded'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* BOQ Tab Content */}
          {activeTab === 'boq' && (
            <div className="space-y-6">
              <LinkedBOQWorkbookPanel
                projectId={project.id}
                hasMeasurementRows={hasMeasurementRows}
                refreshToken={refreshKey}
                onBoqSynced={() => {
                  setRefreshKey(prev => prev + 1);
                  setEditingBOQ(false);
                  setShowBOQEntry(false);
                }}
              />

              {!showBOQEntry ? (
                /* BOQ Landing Page */
                <div className="bg-neutral-dark rounded-lg border border-neutral-medium p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="text-2xl">📊</div>
                      <div>
                        <h3 className="text-lg font-semibold text-primary">Bill of Quantities</h3>
                        <p className="text-sm text-secondary">Add project costs, quantities, and rates</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowBOQEntry(true)}
                      className="bg-accent-amber text-neutral-dark px-4 py-2 rounded-lg font-medium hover:bg-accent-amber/90 transition-colors text-sm"
                    >
                      + Add BOQ
                    </button>
                  </div>
                </div>
              ) : (
                /* BOQ Entry Form */
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-primary">Enter BOQ Details</h3>
                    <button
                      onClick={() => setShowBOQEntry(false)}
                      className="text-secondary hover:text-primary text-sm flex items-center space-x-2"
                    >
                      <span>←</span>
                      <span>Back to Overview</span>
                    </button>
                  </div>
                  <EnhancedBOQTable
                    projectId={project.id}
                    contractorId={contractor?.id || ''}
                    onSourceWorkbookUploaded={() => setRefreshKey(prev => prev + 1)}
                    onSaveSuccess={() => {
                      setRefreshKey(prev => prev + 1);
                      setShowBOQEntry(false);
                      setTimeout(() => setRefreshKey(prev => prev + 1), 500);
                    }}
                  />
                </div>
              )}
              
              {/* Show BOQ data with edit button */}
              <div>
                {hasBOQData && (
                  <div className="mb-4 flex justify-end">
                    <button
                      onClick={() => {
                        if (hasMeasurementRows) return;
                        setEditingBOQ(!editingBOQ);
                      }}
                      disabled={hasMeasurementRows}
                      className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                        hasMeasurementRows
                          ? 'bg-neutral-medium text-secondary cursor-not-allowed'
                          : editingBOQ 
                          ? 'bg-neutral-medium text-primary hover:bg-neutral-medium/80'
                          : 'bg-accent-blue text-white hover:bg-accent-blue/90'
                      }`}
                    >
                      {hasMeasurementRows ? 'Measurement Started - BOQ Locked' : editingBOQ ? '← Back to View' : '✏️ Edit BOQ'}
                    </button>
                  </div>
                )}
                <BOQDisplay 
                  key={`boq-${refreshKey}`} 
                  projectId={project.id} 
                  isEditable={editingBOQ}
                  onSaveSuccess={() => {
                    setRefreshKey(prev => prev + 1);
                    setEditingBOQ(false);
                  }}
                />
              </div>
            </div>
          )}

          {activeTab === 'measurement' && (
            <MeasurementSheetTab
              projectId={project.id}
              hasBOQData={hasBOQData}
              onMeasurementStatusChange={setHasMeasurementRows}
            />
          )}

          {/* Schedule Tab Content */}
          {activeTab === 'schedule' && (
            <div className="space-y-6">
              {!showScheduleEntry ? (
                /* Schedule Landing Page */
                <div className="bg-neutral-dark rounded-lg border border-neutral-medium p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="text-2xl">📅</div>
                      <div>
                        <h3 className="text-lg font-semibold text-primary">Project Schedule</h3>
                        <p className="text-sm text-secondary">Create timeline with tasks and milestones</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowScheduleEntry(true)}
                      className="bg-accent-amber text-neutral-dark px-4 py-2 rounded-lg font-medium hover:bg-accent-amber/90 transition-colors text-sm"
                    >
                      + Add Schedule
                    </button>
                  </div>
                </div>
              ) : (
                /* Schedule Entry Form */
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-primary">Enter Schedule Details</h3>
                    <button
                      onClick={() => setShowScheduleEntry(false)}
                      className="text-secondary hover:text-primary text-sm flex items-center space-x-2"
                    >
                      <span>←</span>
                      <span>Back to Overview</span>
                    </button>
                  </div>
                  <EditableScheduleTable
                    projectId={project.id}
                    contractorId={contractor?.id || ''}
                    onSaveSuccess={() => {
                      setRefreshKey(prev => prev + 1);
                      setShowScheduleEntry(false);
                      setTimeout(() => setRefreshKey(prev => prev + 1), 500);
                    }}
                  />
                </div>
              )}
              
              {/* Always show existing Schedule data if available */}
              <ScheduleDisplay key={`schedule-${refreshKey}`} projectId={project.id} contractorId={contractor?.id || ''} />
            </div>
          )}

          {/* Materials Tab */}
          {activeTab === 'materials' && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-primary">Project Materials</h3>
                <div className="flex space-x-3">
                  <Button
                    onClick={() => setShowAddMaterial((prev) => !prev)}
                    className="bg-neutral-medium hover:bg-neutral-medium/80 text-primary px-4 py-2 rounded-lg text-sm"
                  >
                    {showAddMaterial ? 'Close' : '+ Add Material'}
                  </Button>
                  {selectedMaterials.size > 0 && (
                    <>
                      {canAccessFeature('rfq_generation') ? (
                        <Button
                          onClick={handleGenerateRFQ}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
                        >
                          Generate RFQ ({selectedMaterials.size})
                        </Button>
                      ) : (
                        <span className="px-4 py-2 rounded-lg text-xs bg-neutral-medium text-secondary border border-neutral-medium">
                          Complete registration to generate RFQ
                        </span>
                      )}
                      {canAccessFeature('purchase_request') ? (
                        <Button
                          onClick={handleSubmitPurchaseRequest}
                          className="bg-accent-amber hover:bg-accent-amber/90 text-neutral-dark px-4 py-2 rounded-lg text-sm"
                        >
                          Submit Purchase Request ({selectedMaterials.size})
                        </Button>
                      ) : (
                        <span className="px-4 py-2 rounded-lg text-xs bg-neutral-medium text-secondary border border-neutral-medium">
                          Complete registration to submit purchase requests
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>

              {showAddMaterial && (
                <form
                  onSubmit={handleManualMaterialSubmit}
                  className="mb-6 bg-neutral-darker border border-neutral-medium rounded-lg p-4"
                >
                  <div className="grid md:grid-cols-6 gap-4">
                    <div className="md:col-span-3 relative">
                      <label className="block text-xs text-secondary mb-1">Material *</label>
                      <input
                        type="text"
                        value={materialForm.materialSearch}
                        onChange={(e) => {
                          const value = e.target.value;
                          const exactMatch = materialsCatalog.find(
                            (material) => material.name.toLowerCase() === value.trim().toLowerCase()
                          );
                          setMaterialForm((prev) => ({
                            ...prev,
                            materialSearch: value,
                            materialId: exactMatch?.id || '',
                            unit: exactMatch?.unit || prev.unit
                          }));
                        }}
                        className="w-full px-3 py-2 rounded-lg border border-neutral-medium bg-neutral-dark text-primary focus:outline-none focus:ring-2 focus:ring-accent-amber"
                        placeholder={materialsCatalogLoading ? 'Loading materials...' : 'Search materials'}
                        required
                      />
                      {materialForm.materialSearch &&
                        !materialsCatalog.some(
                          (material) =>
                            material.name.toLowerCase() === materialForm.materialSearch.trim().toLowerCase()
                        ) && (
                        <div className="absolute z-20 mt-2 w-full max-h-40 overflow-y-auto rounded-lg border border-neutral-medium bg-neutral-darker shadow-lg">
                          {materialsCatalog
                            .filter((material) => {
                              const query = materialForm.materialSearch.trim().toLowerCase();
                              if (!query) return false;
                              return (
                                material.name.toLowerCase().includes(query) ||
                                (material.category || '').toLowerCase().includes(query)
                              );
                            })
                            .slice(0, 8)
                            .map((material) => (
                              <button
                                type="button"
                                key={material.id}
                                onClick={() =>
                                  setMaterialForm((prev) => ({
                                    ...prev,
                                    materialId: material.id,
                                    materialSearch: material.name,
                                    unit: material.unit || prev.unit
                                  }))
                                }
                                className="w-full text-left px-3 py-2 hover:bg-neutral-medium/40 text-primary text-sm border-b border-neutral-medium last:border-b-0"
                              >
                                <div className="font-medium">{material.name}</div>
                                <div className="text-xs text-secondary">
                                  {(material.category || 'Uncategorized')} • {material.unit || 'unit'}{material.hsn_code ? ` • HSN ${material.hsn_code}` : ''}
                                </div>
                              </button>
                            ))}
                          {materialsCatalog.filter((material) => {
                            const query = materialForm.materialSearch.trim().toLowerCase();
                            if (!query) return false;
                            return (
                              material.name.toLowerCase().includes(query) ||
                              (material.category || '').toLowerCase().includes(query)
                            );
                          }).length === 0 && (
                            <div className="px-3 py-2 border-t border-neutral-medium">
                              <p className="text-xs text-secondary mb-1.5">
                                No catalog match for "{materialForm.materialSearch}"
                              </p>
                              <button
                                type="button"
                                onClick={() => {
                                  setMiniRequestForm({ name: materialForm.materialSearch, hsn_code: '', category: '', unit: '' });
                                  setMiniRequestSuccess(false);
                                  setShowMiniRequestDialog(true);
                                }}
                                className="text-xs font-medium text-accent-amber hover:underline"
                              >
                                + Request this material
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs text-secondary mb-1">Category</label>
                      <input
                        type="text"
                        value={
                          materialsCatalog.find((material) => material.id === materialForm.materialId)?.category || ''
                        }
                        readOnly
                        className="w-full px-3 py-2 rounded-lg border border-neutral-medium bg-neutral-darker text-secondary"
                        placeholder="Auto-filled"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-secondary mb-1">HSN</label>
                      <input
                        type="text"
                        value={
                          materialsCatalog.find((material) => material.id === materialForm.materialId)?.hsn_code || ''
                        }
                        readOnly
                        className="w-full px-3 py-2 rounded-lg border border-neutral-medium bg-neutral-darker text-secondary"
                        placeholder="Auto-filled"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-secondary mb-1">Quantity *</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={materialForm.quantity}
                        onChange={(e) => setMaterialForm((prev) => ({ ...prev, quantity: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg border border-neutral-medium bg-neutral-dark text-primary focus:outline-none focus:ring-2 focus:ring-accent-amber"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-secondary mb-1">Unit *</label>
                      <select
                        value={materialForm.unit}
                        onChange={(e) => setMaterialForm((prev) => ({ ...prev, unit: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg border border-neutral-medium bg-neutral-dark text-primary focus:outline-none focus:ring-2 focus:ring-accent-amber"
                        required
                      >
                        <option value="">Select unit</option>
                        {materialForm.unit && !UNIT_OPTIONS.includes(materialForm.unit) && (
                          <option value={materialForm.unit}>{materialForm.unit}</option>
                        )}
                        {UNIT_OPTIONS.map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-6">
                      <label className="block text-xs text-secondary mb-1">Description</label>
                      <input
                        type="text"
                        value={materialForm.description}
                        onChange={(e) => setMaterialForm((prev) => ({ ...prev, description: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg border border-neutral-medium bg-neutral-dark text-primary focus:outline-none focus:ring-2 focus:ring-accent-amber"
                        placeholder="Brand / size / grade / specification"
                      />
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <Button
                      type="submit"
                      className="bg-accent-amber hover:bg-accent-amber/90 text-neutral-dark px-4 py-2 rounded-lg text-sm"
                      disabled={materialSubmitting}
                    >
                      {materialSubmitting ? 'Adding...' : 'Add Material'}
                    </Button>
                  </div>
                </form>
              )}

              {projectMaterials.length === 0 ? (
                <div className="text-center py-12 bg-neutral-darker rounded-lg border border-neutral-medium">
                  <div className="text-secondary text-lg mb-4">📦</div>
                  <h4 className="text-primary font-semibold mb-2">No Materials Yet</h4>
                  <p className="text-secondary text-sm">
                    Materials will appear here once they are added to the project.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Select All Checkbox */}
                  <div className="flex items-center space-x-2 p-3 bg-neutral-darker rounded-lg border border-neutral-medium">
                    <input
                      type="checkbox"
                      checked={projectMaterials.length > 0 && selectedMaterials.size === projectMaterials.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedMaterials(new Set(projectMaterials.map(m => m.id)));
                          setRfqQuantities(prev => {
                            const next = { ...prev };
                            projectMaterials.forEach(m => {
                              next[m.id] = next[m.id] || (m.max_requestable > 0 ? m.max_requestable.toString() : (m.required_qty?.toString() || '0'));
                            });
                            return next;
                          });
                        } else {
                          setSelectedMaterials(new Set());
                          setRfqQuantities({});
                        }
                      }}
                      className="w-4 h-4 text-accent-amber bg-neutral-dark border-neutral-medium rounded focus:ring-accent-amber focus:ring-2"
                    />
                    <label className="text-sm text-secondary">
                      Select all materials ({projectMaterials.length})
                    </label>
                  </div>

                  {/* Materials Table */}
                  <div className="overflow-x-auto bg-neutral-darker border border-neutral-medium rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-neutral-dark border-b border-neutral-medium">
                        <tr>
                          <th className="p-3 text-left text-secondary w-12">Select</th>
                          <th className="p-3 text-left text-secondary">Material</th>
                          <th className="p-3 text-left text-secondary">Source</th>
                          <th className="p-3 text-left text-secondary">Qty</th>
                          <th className="p-3 text-left text-secondary">Available Qty</th>
                          <th className="p-3 text-left text-secondary">Requested Qty</th>
                          <th className="p-3 text-left text-secondary">Requests</th>
                          <th className="p-3 text-left text-secondary">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {projectMaterials.map((material) => {
                          const requestedLabel = (() => {
                            if ((material.requested_qty || 0) === 0 && (material.ordered_qty || 0) === 0) return '—';
                            const pending = material.requested_qty || 0;
                            const approved = material.ordered_qty || 0;
                            if (approved > 0) {
                              return `${pending.toLocaleString(undefined, { maximumFractionDigits: 2 })} (Approved: ${approved.toLocaleString(undefined, { maximumFractionDigits: 2 })})`;
                            }
                            return pending.toLocaleString(undefined, { maximumFractionDigits: 2 });
                          })();

                          const sourceText =
                            (material.source_file_name
                              ? `BOQ Summary from ${material.source_file_name}`
                              : material.source_type === 'boq_analysis'
                              ? 'BOQ Analysis'
                              : material.source_type === 'drawing_takeoff'
                              ? 'Drawing Takeoff'
                              : 'Manual Entry');

                          const requestCount = material.request_history?.length || 0;
                          const isExpanded = expandedMaterials.has(material.id);

                          return (
                            <React.Fragment key={material.id}>
                              <tr className="border-b border-neutral-medium/40 hover:bg-neutral-medium/10">
                                <td className="p-3">
                                  <input
                                    type="checkbox"
                                    checked={selectedMaterials.has(material.id)}
                                    onChange={(e) => handleMaterialSelection(material.id, e.target.checked)}
                                    className="w-4 h-4 text-accent-amber bg-neutral-dark border-neutral-medium rounded focus:ring-accent-amber focus:ring-2"
                                  />
                                </td>
                                <td className="p-3">
                                  <div className="text-primary font-medium">
                                    {material.name || 'Unknown Material'}
                                  </div>
                                  <div className="text-xs text-secondary">
                                    {material.notes || material.description || 'No description'}
                                  </div>
                                </td>
                                <td className="p-3 text-secondary text-xs">
                                  {sourceText}
                                </td>
                                <td className="p-3 text-secondary">
                                  {material.required_qty?.toLocaleString(undefined, { maximumFractionDigits: 2 }) || 0} {material.unit || 'units'}
                                </td>
                                <td className="p-3 text-secondary">
                                  {material.required_qty !== undefined ? `${Math.max((material.required_qty || 0) - (material.requested_qty || 0), 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} ${material.unit || 'units'}` : '—'}
                                </td>
                                <td className="p-3 text-secondary">
                                  {requestedLabel}
                                </td>
                                <td className="p-3">
                                  <button
                                    onClick={() => toggleMaterialExpansion(material.id)}
                                    className="text-xs px-3 py-1 rounded border border-neutral-medium text-primary hover:bg-neutral-medium/30 transition-colors"
                                  >
                                    {isExpanded ? 'Hide Requests' : 'View Requests'} ({requestCount})
                                  </button>
                                </td>
                                <td className="p-3">
                                  <div className="flex flex-wrap gap-2">
                                    <button
                                      onClick={() => deleteMaterial(material.id)}
                                      className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs transition-colors"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </td>
                              </tr>
                              {isExpanded && (
                                <tr>
                                  <td colSpan={8} className="bg-neutral-dark/60 border-b border-neutral-medium">
                                    {requestCount === 0 ? (
                                      <div className="p-3 text-xs text-secondary">
                                        No purchase requests have been raised for this material yet.
                                      </div>
                                    ) : (
                                      <div className="p-3 space-y-3">
                                        {material.request_history!.map((item) => (
                                          <div key={item.id} className="flex flex-col md:flex-row md:items-center md:justify-between bg-neutral-dark border border-neutral-medium rounded-lg p-3 text-xs">
                                            <div className="flex-1">
                                              <div className="text-primary font-medium">
                                                Request #{item.purchase_request_id.slice(0, 8).toUpperCase()}
                                              </div>
                                              <div className="text-secondary mt-1">
                                                Qty Requested: {item.requested_qty}{' '}
                                                {material.unit || 'units'}
                                                {item.purchase_qty
                                                  ? ` • Purchase: ${item.purchase_qty} ${item.purchase_unit || material.unit || 'units'}`
                                                  : ''}
                                                {item.normalized_qty
                                                  ? ` • Coverage: ${item.normalized_qty} ${item.site_unit || material.unit || 'units'}`
                                                  : ''}
                                                {item.approved_qty ? ` • Approved: ${item.approved_qty}` : ''}
                                                {item.hsn_code ? ` • HSN: ${item.hsn_code}` : ''}
                                              </div>
                                              {item.item_description && (
                                                <div className="text-secondary mt-1">
                                                  Specs: {item.item_description}
                                                </div>
                                              )}
                                              <div className="text-secondary mt-1">
                                                Raised: {formatDate(item.created_at)}{' '}
                                                {item.purchase_request?.status ? `• PR Status: ${item.purchase_request.status}` : ''}
                                                {item.purchase_request?.project_po_reference?.po_number
                                                  ? ` • PO: ${item.purchase_request.project_po_reference.po_number}`
                                                  : ''}
                                              </div>
                                            </div>
                                            <div className="flex gap-2 mt-2 md:mt-0">
                                              <span className="px-2 py-1 rounded-full bg-neutral-medium/40 text-primary uppercase tracking-wide">
                                                {item.status}
                                              </span>
                                              {item.purchase_request?.status && (
                                                <span className="px-2 py-1 rounded-full bg-neutral-medium/20 text-secondary uppercase tracking-wide">
                                                  {item.purchase_request.status}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* Purchase Requests Tab */}
          {activeTab === 'purchase_requests' && (
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-primary">Purchase Requests</h3>
                  <p className="text-sm text-secondary">Manage purchase requests raised for this project</p>
                </div>
                <div className="text-sm text-secondary">{projectPurchaseRequests.length} requests</div>
              </div>

              <div className="bg-neutral-darker rounded-lg border border-neutral-medium">
                {projectPurchaseRequests.length === 0 ? (
                  <div className="p-4 text-sm text-secondary">No purchase requests raised for this project yet.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-neutral-dark border-b border-neutral-medium">
                        <tr>
                          <th className="p-3 text-left text-secondary">Request ID</th>
                          <th className="p-3 text-left text-secondary">Funding PO</th>
                          <th className="p-3 text-left text-secondary">Status</th>
                          <th className="p-3 text-left text-secondary">Line Items</th>
                          <th className="p-3 text-left text-secondary">Estimated Value</th>
                          <th className="p-3 text-left text-secondary">Raised</th>
                          <th className="p-3 text-left text-secondary">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {projectPurchaseRequests.map((request) => {
                          const editable = canEditPurchaseRequest(request.status);
                          return (
                            <tr key={request.id} className="border-b border-neutral-medium/30 hover:bg-neutral-medium/10">
                              <td className="p-3 text-primary font-medium">#{request.id.slice(0, 8).toUpperCase()}</td>
                              <td className="p-3 text-secondary">{request.po_number || 'Not linked'}</td>
                              <td className="p-3">
                                <span className={`text-xs px-2 py-1 rounded ${getPurchaseRequestStatusClass(request.status)}`}>
                                  {request.status.replace(/_/g, ' ')}
                                </span>
                              </td>
                              <td className="p-3 text-secondary">{request.line_items}</td>
                              <td className="p-3 text-primary">{formatCurrency(request.estimated_total)}</td>
                              <td className="p-3 text-secondary">{formatDate(request.created_at)}</td>
                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => openEditPurchaseRequestModal(request.id)}
                                    disabled={!editable || editRequestLoading}
                                    className="text-xs px-3 py-1 rounded border border-neutral-medium text-primary hover:bg-neutral-medium/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    {editable ? 'Edit' : 'View'}
                                  </button>
                                  {editable && (
                                    <button
                                      onClick={() => deletePurchaseRequest(request.id)}
                                      disabled={deletingRequestId === request.id}
                                      className="text-xs px-3 py-1 rounded border border-red-500/50 text-red-300 hover:bg-red-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      {deletingRequestId === request.id ? 'Deleting...' : 'Delete'}
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'client_pos' && (
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-primary">Client POs</h3>
                  <p className="text-sm text-secondary">Manage original, amended, supplemental, and replacement POs for this project.</p>
                </div>
                {['awarded', 'finalized', 'completed'].includes(String(project?.project_status || project?.status || '').toLowerCase()) && (
                  <button
                    onClick={() => setShowAddPOForm((prev) => !prev)}
                    className="bg-accent-amber hover:bg-accent-amber/90 text-neutral-dark px-4 py-2 rounded-lg text-sm font-medium"
                  >
                    {showAddPOForm ? 'Close' : '+ Add PO'}
                  </button>
                )}
              </div>

              {showAddPOForm && (
                <div className="bg-neutral-darker rounded-lg border border-neutral-medium p-4">
                  <div className="grid md:grid-cols-5 gap-3">
                    <div>
                      <label className="block text-xs text-secondary mb-1">PO Number *</label>
                      <input
                        type="text"
                        value={poForm.po_number}
                        onChange={(e) => setPOForm((prev) => ({ ...prev, po_number: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg border border-neutral-medium bg-neutral-dark text-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-secondary mb-1">PO Date</label>
                      <input
                        type="date"
                        value={poForm.po_date}
                        onChange={(e) => setPOForm((prev) => ({ ...prev, po_date: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg border border-neutral-medium bg-neutral-dark text-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-secondary mb-1">PO Value</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={poForm.po_value}
                        onChange={(e) => setPOForm((prev) => ({ ...prev, po_value: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg border border-neutral-medium bg-neutral-dark text-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-secondary mb-1">PO Type</label>
                      <select
                        value={poForm.po_type}
                        onChange={(e) => setPOForm((prev) => ({ ...prev, po_type: e.target.value as ProjectPOReferenceSummary['po_type'] }))}
                        className="w-full px-3 py-2 rounded-lg border border-neutral-medium bg-neutral-dark text-primary"
                      >
                        <option value="original">Original</option>
                        <option value="amendment">Amendment</option>
                        <option value="supplemental">Supplemental</option>
                        <option value="replacement">Replacement</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-secondary mb-1">Previous PO</label>
                      <select
                        value={poForm.previous_po_reference_id}
                        onChange={(e) => setPOForm((prev) => ({ ...prev, previous_po_reference_id: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg border border-neutral-medium bg-neutral-dark text-primary"
                      >
                        <option value="">None</option>
                        {poReferences.map((po) => (
                          <option key={po.id} value={po.id}>
                            {po.po_number}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-5">
                      <label className="block text-xs text-secondary mb-1">Notes</label>
                      <textarea
                        value={poForm.notes}
                        onChange={(e) => setPOForm((prev) => ({ ...prev, notes: e.target.value }))}
                        rows={2}
                        className="w-full px-3 py-2 rounded-lg border border-neutral-medium bg-neutral-dark text-primary resize-none"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end mt-4">
                    <button
                      onClick={addProjectPOReference}
                      disabled={addingPO}
                      className="px-4 py-2 rounded-lg bg-accent-amber text-neutral-dark font-medium hover:bg-accent-amber/90 disabled:opacity-50"
                    >
                      {addingPO ? 'Adding...' : 'Save PO'}
                    </button>
                  </div>
                </div>
              )}

              <div className="bg-neutral-darker rounded-lg border border-neutral-medium overflow-x-auto">
                {poReferencesLoading ? (
                  <div className="p-4 text-sm text-secondary">Loading project POs...</div>
                ) : poReferences.length === 0 ? (
                  <div className="p-4 text-sm text-secondary">
                    No client POs linked to this project yet.
                    {!['awarded', 'finalized', 'completed'].includes(String(project?.project_status || project?.status || '').toLowerCase())
                      ? ' POs can be added once the project is awarded/finalized.'
                      : ''}
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-neutral-dark border-b border-neutral-medium">
                      <tr>
                        <th className="p-3 text-left text-secondary">PO Number</th>
                        <th className="p-3 text-left text-secondary">Type</th>
                        <th className="p-3 text-left text-secondary">Status</th>
                        <th className="p-3 text-left text-secondary">Value</th>
                        <th className="p-3 text-left text-secondary">Linked PRs</th>
                        <th className="p-3 text-left text-secondary">Notes</th>
                        <th className="p-3 text-left text-secondary">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {poReferences.map((po) => (
                        <tr key={po.id} className="border-b border-neutral-medium/30">
                          <td className="p-3 text-primary font-medium">
                            {po.po_number}
                            {po.is_default && <span className="ml-2 text-[10px] px-2 py-0.5 rounded bg-accent-amber/20 text-accent-amber uppercase">Default</span>}
                          </td>
                          <td className="p-3 text-secondary capitalize">{po.po_type}</td>
                          <td className="p-3">
                            <span className={`text-xs px-2 py-1 rounded ${
                              po.status === 'active'
                                ? 'bg-green-500/20 text-green-400'
                                : po.status === 'exhausted'
                                  ? 'bg-yellow-500/20 text-yellow-400'
                                  : 'bg-neutral-medium text-secondary'
                            }`}>
                              {po.status}
                            </span>
                          </td>
                          <td className="p-3 text-primary">{po.po_value ? formatCurrency(po.po_value) : '—'}</td>
                          <td className="p-3 text-secondary">
                            {po.request_count || 0} PRs
                            <div className="text-xs">{po.linked_value ? formatCurrency(po.linked_value) : '₹0.00'}</div>
                          </td>
                          <td className="p-3 text-secondary">{po.notes || '—'}</td>
                          <td className="p-3">
                            <div className="flex flex-wrap gap-2">
                              {!po.is_default && (
                                <button
                                  onClick={() => updateProjectPOStatus(po.id, { status: 'active', is_default: true })}
                                  disabled={poActionLoadingId === po.id}
                                  className="text-xs px-3 py-1 rounded border border-neutral-medium text-primary hover:bg-neutral-medium/30 disabled:opacity-50"
                                >
                                  Set Active
                                </button>
                              )}
                              {po.status === 'active' && (
                                <button
                                  onClick={() => updateProjectPOStatus(po.id, { status: 'exhausted' })}
                                  disabled={poActionLoadingId === po.id}
                                  className="text-xs px-3 py-1 rounded border border-yellow-500/40 text-yellow-300 hover:bg-yellow-500/10 disabled:opacity-50"
                                >
                                  Mark Exhausted
                                </button>
                              )}
                              {po.status !== 'closed' && (
                                <button
                                  onClick={() => updateProjectPOStatus(po.id, { status: 'closed' })}
                                  disabled={poActionLoadingId === po.id}
                                  className="text-xs px-3 py-1 rounded border border-neutral-medium text-secondary hover:bg-neutral-medium/20 disabled:opacity-50"
                                >
                                  Close
                                </button>
                              )}
                              {po.status === 'active' && (
                                <button
                                  onClick={() => reassignOpenRequestsToPO(po.id, po.po_number)}
                                  disabled={bulkReassigningPOId === po.id}
                                  className="text-xs px-3 py-1 rounded border border-accent-blue/50 text-accent-blue hover:bg-accent-blue/10 disabled:opacity-50"
                                >
                                  {bulkReassigningPOId === po.id ? 'Reassigning...' : 'Move Open PRs Here'}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* Files Tab Content */}
          {activeTab === 'files' && (
            <div className="space-y-6">
              {/* Files Header */}
              <div className="bg-neutral-dark rounded-lg border border-neutral-medium p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-primary">Project Files</h3>
                    <p className="text-sm text-secondary">Upload and manage project documents, drawings, BOQs, and POs</p>
                  </div>
                  <Button
                    variant="primary"
                    onClick={() => setShowUploadDialog(true)}
                  >
                    + Upload File
                  </Button>
                </div>
              </div>

              {/* File Categories */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { category: 'drawings', label: 'Drawings', color: 'bg-blue-500/20 text-blue-400' },
                  { category: 'boq', label: 'BOQ', color: 'bg-green-500/20 text-green-400' },
                  { category: 'po', label: 'Purchase Orders', color: 'bg-purple-500/20 text-purple-400' },
                  { category: 'other', label: 'Other Documents', color: 'bg-gray-500/20 text-gray-400' }
                ].map(({ category, label, color }) => {
                  const count = projectFiles.filter(f => f.category === category).length;
                  return (
                    <div key={category} className="bg-neutral-dark rounded-lg border border-neutral-medium p-4 text-center">
                      <div className="text-2xl font-bold text-primary mb-1">{count}</div>
                      <div className={`text-xs px-2 py-1 rounded ${color}`}>{label}</div>
                    </div>
                  );
                })}
              </div>

              {/* Files List */}
              <div className="bg-neutral-dark rounded-lg border border-neutral-medium">
                <div className="p-6 border-b border-neutral-medium">
                  <h3 className="text-lg font-bold text-primary mb-2">All Files ({projectFiles.length})</h3>
                  <p className="text-secondary text-sm">
                    Manage all project-related documents and files
                  </p>
                </div>
                
                {projectFiles.length === 0 ? (
                  /* Empty State */
                  <div className="p-8 text-center">
                    <div className="text-4xl mb-4">📁</div>
                    <h4 className="text-lg font-semibold text-primary mb-2">No Files Uploaded Yet</h4>
                    <p className="text-secondary mb-4">
                      Upload your first project document to get started.
                    </p>
                    <Button onClick={() => setShowUploadDialog(true)}>
                      Upload File
                    </Button>
                  </div>
                ) : (
                  /* Files Table */
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-neutral-medium">
                          <th className="text-left p-4 text-primary font-semibold">File Name</th>
                          <th className="text-left p-4 text-primary font-semibold">Category</th>
                          <th className="text-left p-4 text-primary font-semibold">Size</th>
                          <th className="text-left p-4 text-primary font-semibold">Version</th>
                          <th className="text-left p-4 text-primary font-semibold">Uploaded</th>
                          <th className="text-center p-4 text-primary font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {projectFiles.map((file) => (
                          <tr key={file.id} className="border-b border-neutral-medium/50 hover:bg-neutral-darker/30">
                            <td className="p-4">
                              <div>
                                <div className="font-medium text-primary">{file.original_name || file.file_name}</div>
                                {file.description && (
                                  <div className="text-xs text-secondary">{file.description}</div>
                                )}
                              </div>
                            </td>
                            <td className="p-4">
                              <span className={`text-xs px-2 py-1 rounded ${
                                file.category === 'drawings' ? 'bg-blue-500/20 text-blue-400' :
                                file.category === 'boq' ? 'bg-green-500/20 text-green-400' :
                                file.category === 'po' ? 'bg-purple-500/20 text-purple-400' :
                                'bg-gray-500/20 text-gray-400'
                              }`}>
                                {(file.category || 'other').toUpperCase()}
                              </span>
                            </td>
                            <td className="p-4 text-secondary text-sm">
                              {file.file_size ? (file.file_size / 1024 / 1024).toFixed(2) + ' MB' : 'Unknown'}
                            </td>
                            <td className="p-4 text-secondary text-sm">
                              v{file.version || '1.0'}
                            </td>
                            <td className="p-4 text-secondary text-sm">
                              {formatDate(file.created_at)}
                            </td>
                            <td className="p-4 text-center">
                              <div className="flex items-center justify-center space-x-2">
                                <button
                                  onClick={() => viewFile(file.id)}
                                  className="text-accent-amber hover:text-accent-amber/80 text-sm font-medium px-3 py-1 rounded hover:bg-accent-amber/10 transition-colors"
                                >
                                  View
                                </button>
                                {(file.mime_type === 'application/pdf' || file.file_type === 'application/pdf') && (
                                  <button
                                    onClick={() => takeoffFile(file.id)}
                                    className="text-accent-blue hover:text-accent-blue/80 text-sm font-medium px-3 py-1 rounded hover:bg-accent-blue/10 transition-colors"
                                  >
                                    Takeoff
                                  </button>
                                )}
                                <button
                                  onClick={() => deleteFile(file.id)}
                                  className="text-red-400 hover:text-red-300 text-sm font-medium px-3 py-1 rounded hover:bg-red-400/10 transition-colors"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Upload Dialog */}
              {showUploadDialog && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                  <div className="bg-neutral-dark rounded-lg p-6 w-full max-w-md border border-neutral-medium">
                    <h2 className="text-xl font-bold mb-4 text-primary">Upload File</h2>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-primary mb-2">
                          Select File *
                        </label>
                        <input
                          type="file"
                          onChange={(e) => setUploadForm(prev => ({ ...prev, file: e.target.files?.[0] || null }))}
                          className="w-full px-3 py-2 bg-neutral-dark border border-neutral-medium rounded-md text-primary"
                          accept=".pdf,.doc,.docx,.xls,.xlsx,.dwg,.jpg,.jpeg,.png"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-primary mb-2">
                          Category *
                        </label>
                        <select
                          value={uploadForm.category}
                          onChange={(e) => setUploadForm(prev => ({ ...prev, category: e.target.value }))}
                          className="w-full px-3 py-2 bg-neutral-dark border border-neutral-medium rounded-md text-primary"
                        >
                          <option value="">Select category</option>
                          <option value="drawings">Drawings</option>
                          <option value="boq">BOQ</option>
                          <option value="po">Purchase Orders</option>
                          <option value="other">Other Documents</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-primary mb-2">
                          Description
                        </label>
                        <textarea
                          value={uploadForm.description}
                          onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Brief description of the file..."
                          className="w-full px-3 py-2 bg-neutral-dark border border-neutral-medium rounded-md h-20 text-primary"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-primary mb-2">
                          Version
                        </label>
                        <input
                          type="text"
                          value={uploadForm.version}
                          onChange={(e) => setUploadForm(prev => ({ ...prev, version: e.target.value }))}
                          placeholder="1.0"
                          className="w-full px-3 py-2 bg-neutral-dark border border-neutral-medium rounded-md text-primary"
                        />
                      </div>

                      <div className="flex justify-end space-x-2 pt-4">
                        <Button variant="outline" onClick={() => {
                          setShowUploadDialog(false);
                          setUploadForm({ file: null, category: '', description: '', version: '1.0' });
                        }}>
                          Cancel
                        </Button>
                        <Button 
                          onClick={uploadFile}
                          disabled={!uploadForm.file || !uploadForm.category || uploadingFile}
                        >
                          {uploadingFile ? 'Uploading...' : 'Upload'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* RFQ Dialog */}
        {showRFQDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-neutral-dark rounded-lg border border-neutral-medium p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-primary mb-4">Generate RFQ</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Select Vendor
                  </label>
                  <select
                    value={selectedVendor?.id?.toString() || ''}
                    onChange={(e) => {
                      const vendor = vendors.find(v => v.id?.toString() === e.target.value);
                      setSelectedVendor(vendor || null);
                    }}
                    className="w-full px-3 py-2 bg-neutral-darker border border-neutral-medium rounded-lg text-primary focus:border-accent-amber focus:outline-none"
                  >
                    <option value="">Choose vendor...</option>
                    {vendors.map((vendor) => (
                      <option key={vendor.id} value={vendor.id?.toString()}>
                        {vendor.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Delivery Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={rfqForm.deliveryDate}
                    onChange={(e) => setRfqForm({ ...rfqForm, deliveryDate: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-darker border border-neutral-medium rounded-lg text-primary focus:border-accent-amber focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Quantities
                  </label>
                  <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                    {projectMaterials.filter(material => selectedMaterials.has(material.id)).map((material) => (
                      <div key={material.id} className="bg-neutral-darker border border-neutral-medium rounded-lg p-3 text-xs text-secondary">
                        <div className="text-primary font-medium text-sm mb-1">
                          {material.name || 'Unknown Material'}
                        </div>
                        <div className="flex flex-wrap gap-3 items-end">
                          <div className="flex-1 min-w-[120px]">
                            <label className="block text-[11px] uppercase tracking-wide mb-1">Quantity</label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={rfqQuantities[material.id] ?? ''}
                              onChange={(e) => setRfqQuantities(prev => ({
                                ...prev,
                                [material.id]: e.target.value
                              }))}
                              placeholder={material.max_requestable > 0 ? `Max ${material.max_requestable}` : `Available ${material.required_qty || 0}`}
                              className="w-full px-2 py-1 bg-neutral-dark border border-neutral-medium rounded text-primary text-sm focus:border-accent-amber focus:outline-none"
                            />
                          </div>
                          <div className="text-[11px]">
                            <div>Available: {material.max_requestable > 0 ? material.max_requestable : material.required_qty || 0} {material.unit || 'units'}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Additional Notes (Optional)
                  </label>
                  <textarea
                    value={rfqForm.notes}
                    onChange={(e) => setRfqForm({ ...rfqForm, notes: e.target.value })}
                    placeholder="Any special requirements or notes..."
                    rows={3}
                    className="w-full px-3 py-2 bg-neutral-darker border border-neutral-medium rounded-lg text-primary focus:border-accent-amber focus:outline-none resize-none"
                  />
                </div>
                
                <div className="text-sm text-secondary">
                  Selected materials: {selectedMaterials.size}
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <Button
                  onClick={() => {
                    setShowRFQDialog(false);
                    setRfqQuantities({});
                  }}
                  className="px-4 py-2 text-secondary hover:text-primary transition-colors"
                >
                  Cancel
                </Button>
                <Button
                  onClick={generateRFQPDF}
                  disabled={!selectedVendor}
                  className="bg-accent-amber hover:bg-accent-amber/90 text-neutral-dark px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Generate RFQ PDF
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Batch Purchase Request Dialog */}
        {showBatchPurchaseDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-neutral-dark rounded-lg border border-neutral-medium p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold text-primary mb-4">Submit Purchase Request</h3>
              
              <div className="space-y-4 mb-6">
                {/* Purchase Request Info */}
                <div className="bg-neutral-darker p-4 rounded-lg border border-neutral-medium">
                  <h4 className="font-medium text-primary mb-2">📋 Purchase Request Details</h4>
                  <p className="text-sm text-secondary">
                    Creating a purchase request for {Array.from(selectedMaterials).length} materials. 
                    This will be submitted to the admin for approval without specifying a vendor.
                  </p>
                  <p className="text-xs text-secondary mt-2">
                    ⚡ The admin will review quantities and approve for purchase. 
                    Vendor selection happens during the procurement process.
                  </p>
                </div>

                {['awarded', 'finalized', 'completed'].includes(String(project?.project_status || project?.status || '').toLowerCase()) && (
                  <div className="bg-neutral-darker p-4 rounded-lg border border-neutral-medium">
                    <label className="block text-sm font-medium text-secondary mb-2">Funding PO *</label>
                    <select
                      value={selectedPOForRequest}
                      onChange={(e) => setSelectedPOForRequest(e.target.value)}
                      className="w-full px-3 py-2 bg-neutral-dark border border-neutral-medium rounded text-primary text-sm focus:border-accent-amber focus:outline-none"
                    >
                      <option value="">Select active client PO</option>
                      {poReferences
                        .filter((po) => po.status === 'active')
                        .map((po) => (
                          <option key={po.id} value={po.id}>
                            {po.po_number}{po.is_default ? ' (Default)' : ''}
                          </option>
                        ))}
                    </select>
                    {poReferences.filter((po) => po.status === 'active').length === 0 && (
                      <p className="text-xs text-red-300 mt-2">
                        No active client PO is available for this project. Add or activate one in the Client POs tab first.
                      </p>
                    )}
                  </div>
                )}
                
                {/* Materials List with Inputs */}
                <div>
                  <h4 className="text-md font-semibold text-primary mb-3">
                    Materials ({Array.from(selectedMaterials).length})
                  </h4>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {projectMaterials
                      .filter(material => selectedMaterials.has(material.id))
                      .map((material) => (
                        <div key={material.id} className="bg-neutral-darker p-4 rounded-lg border border-neutral-medium">
                          <div className="mb-3">
                            <h5 className="font-medium text-primary">
                              {material.name || 'Unknown Material'}
                            </h5>
                            <p className="text-xs text-secondary mt-1">
                              {material.notes || material.description || 'No description'}
                            </p>
                            <div className="text-xs text-secondary space-x-3 mt-1">
                              <span>Required: {material.required_qty || 0} {material.unit || 'units'}</span>
                              <span>Requested: {material.requested_qty || 0}</span>
                              <span>Remaining: {Math.max((material.required_qty || 0) - (material.requested_qty || 0), 0)}</span>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-8 gap-3">
                            {/* Required Quantity (site unit) */}
                            <div>
                              <label className="block text-xs font-medium text-secondary mb-1">
                                Required Qty ({material.unit || 'unit'}) *
                              </label>
                              <input
                                type="number"
                                value={purchaseQuantities[material.id] || ''}
                                onChange={(e) => setPurchaseQuantities(prev => ({
                                  ...prev,
                                  [material.id]: e.target.value
                                }))}
                                placeholder={`Max ${Math.max((material.required_qty || 0) - (material.requested_qty || 0), 0)}`}
                                max={Math.max((material.required_qty || 0) - (material.requested_qty || 0), 0)}
                                className="w-full px-2 py-1 bg-neutral-dark border border-neutral-medium rounded text-primary text-sm focus:border-accent-amber focus:outline-none"
                              />
                            </div>

                            {/* Purchase Unit */}
                            <div>
                              <label className="block text-xs font-medium text-secondary mb-1">
                                Purchase Unit *
                              </label>
                              <select
                                value={purchaseUnits[material.id] || ''}
                                onChange={(e) => setPurchaseUnits(prev => ({
                                  ...prev,
                                  [material.id]: e.target.value
                                }))}
                                className="w-full px-2 py-1 bg-neutral-dark border border-neutral-medium rounded text-primary text-sm focus:border-accent-amber focus:outline-none"
                              >
                                <option value="">Select unit</option>
                                {purchaseUnits[material.id] &&
                                  !UNIT_OPTIONS.includes(purchaseUnits[material.id]) && (
                                    <option value={purchaseUnits[material.id]}>
                                      {purchaseUnits[material.id]}
                                    </option>
                                  )}
                                {UNIT_OPTIONS.map((unitOption) => (
                                  <option key={unitOption} value={unitOption}>
                                    {unitOption}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Conversion factor */}
                            <div>
                              <label className="block text-xs font-medium text-secondary mb-1">
                                1 Unit = X {material.unit || 'unit'}
                              </label>
                              <input
                                type="number"
                                step="0.0001"
                                min="0.0001"
                                value={purchaseConversions[material.id] || ''}
                                onChange={(e) => setPurchaseConversions(prev => ({
                                  ...prev,
                                  [material.id]: e.target.value
                                }))}
                                placeholder="e.g. 6"
                                className="w-full px-2 py-1 bg-neutral-dark border border-neutral-medium rounded text-primary text-sm focus:border-accent-amber focus:outline-none"
                              />
                            </div>

                            {/* Auto purchase qty */}
                            <div>
                              <label className="block text-xs font-medium text-secondary mb-1">
                                Purchase Qty (Auto)
                              </label>
                              <div className="px-2 py-1 bg-neutral-medium/20 border border-neutral-medium rounded text-primary text-sm">
                                {formatTwoDecimals(getComputedPurchaseQty(material.id))}
                              </div>
                            </div>
                            
                            {/* Rate */}
                            <div>
                              <label className="block text-xs font-medium text-secondary mb-1">
                                Rate (₹) *
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                value={purchaseRates[material.id] || ''}
                                onChange={(e) => setPurchaseRates(prev => ({
                                  ...prev,
                                  [material.id]: parseFloat(e.target.value) || 0
                                }))}
                                placeholder="0.00"
                                className="w-full px-2 py-1 bg-neutral-dark border border-neutral-medium rounded text-primary text-sm focus:border-accent-amber focus:outline-none"
                              />
                            </div>
                            
                            {/* Tax % */}
                            <div>
                              <label className="block text-xs font-medium text-secondary mb-1">
                                Tax (%) *
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                value={purchaseTax[material.id] || ''}
                                onChange={(e) => setPurchaseTax(prev => ({
                                  ...prev,
                                  [material.id]: parseFloat(e.target.value) || 0
                                }))}
                                placeholder="0.00"
                                className="w-full px-2 py-1 bg-neutral-dark border border-neutral-medium rounded text-primary text-sm focus:border-accent-amber focus:outline-none"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-secondary mb-1">
                                Round Off (₹)
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                value={purchaseRoundOffs[material.id] ?? ''}
                                onChange={(e) => setPurchaseRoundOffs(prev => ({
                                  ...prev,
                                  [material.id]: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0
                                }))}
                                placeholder="0.00"
                                className="w-full px-2 py-1 bg-neutral-dark border border-neutral-medium rounded text-primary text-sm focus:border-accent-amber focus:outline-none"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-secondary mb-1">
                                HSN Code
                              </label>
                              <input
                                type="text"
                                value={purchaseHsn[material.id] ?? material.hsn_code ?? ''}
                                onChange={(e) => setPurchaseHsn(prev => ({
                                  ...prev,
                                  [material.id]: e.target.value.toUpperCase().slice(0, 16)
                                }))}
                                placeholder="e.g. 72142000"
                                className="w-full px-2 py-1 bg-neutral-dark border border-neutral-medium rounded text-primary text-sm focus:border-accent-amber focus:outline-none"
                              />
                            </div>
                            
                            {/* Total */}
                            <div>
                              <label className="block text-xs font-medium text-secondary mb-1">
                                Total Amount
                              </label>
                              <div className="px-2 py-1 bg-neutral-medium/20 border border-neutral-medium rounded text-primary text-sm">
                                {formatCurrency(getLineTotal(material.id))}
                              </div>
                            </div>
                          </div>

                          <div className="mt-2 text-xs text-secondary">
                            Coverage after rounding: {formatTwoDecimals(getNormalizedCoverageQty(material.id))} {material.unit || 'units'}
                          </div>
                          
                          {/* Description / specs */}
                          <div className="mt-3">
                            <label className="block text-xs font-medium text-secondary mb-1">
                              Description / Specs
                            </label>
                            <textarea
                              value={purchaseRemarks[material.id] || ''}
                              onChange={(e) => setPurchaseRemarks(prev => ({
                                ...prev,
                                [material.id]: e.target.value
                              }))}
                              placeholder="Brand / size / grade / model / specification"
                              rows={2}
                              className="w-full px-2 py-1 bg-neutral-dark border border-neutral-medium rounded text-primary text-sm focus:border-accent-amber focus:outline-none resize-none"
                            />
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
                
                {/* Note: File upload will be handled separately after request creation */}
                
                {/* Summary */}
                <div className="bg-neutral-darker p-3 rounded-lg border border-neutral-medium">
                  <div className="mb-3">
                    <label className="block text-xs font-medium text-secondary mb-1">
                      Shipping Location
                    </label>
                    <textarea
                      value={purchaseShippingLocation}
                      onChange={(e) => setPurchaseShippingLocation(e.target.value)}
                      placeholder="Project/site shipping address"
                      rows={2}
                      className="w-full px-3 py-2 bg-neutral-dark border border-neutral-medium rounded text-primary text-sm focus:border-accent-amber focus:outline-none resize-none"
                    />
                    <div className="text-[11px] text-secondary mt-1">
                      Auto-filled from project address when available.
                    </div>
                  </div>
                  <h5 className="font-medium text-primary mb-2">Request Summary</h5>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-secondary">Materials: </span>
                      <span className="text-primary">{Array.from(selectedMaterials).length}</span>
                    </div>
                    <div>
                      <span className="text-secondary">Total Amount: </span>
                      <span className="text-primary">
                        {(() => {
                          const total = Array.from(selectedMaterials).reduce((sum, materialId) => {
                            return sum + getLineTotal(materialId);
                          }, 0);
                          return formatCurrency(total);
                        })()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3">
                <Button
                  onClick={() => {
                    setShowBatchPurchaseDialog(false);
                    setPurchaseQuantities({});
                    setPurchaseRates({});
                    setPurchaseTax({});
                    setPurchaseRoundOffs({});
                    setPurchaseHsn({});
                    setPurchaseRemarks({});
                    setPurchaseUnits({});
                    setPurchaseConversions({});
                    setPurchaseShippingLocation('');
                    setSelectedPOForRequest('');
                    setSelectedVendor(null);
                  }}
                  className="px-4 py-2 text-secondary hover:text-primary transition-colors"
                >
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    // Validate that quantities, rates, and tax are provided for all materials
                    const missingData = Array.from(selectedMaterials).filter(materialId => 
                      !purchaseQuantities[materialId] || 
                      parseFloat(purchaseQuantities[materialId]) <= 0 ||
                      !purchaseUnits[materialId] ||
                      purchaseUnits[materialId].trim().length === 0 ||
                      !purchaseConversions[materialId] ||
                      parseFloat(purchaseConversions[materialId]) <= 0 ||
                      !purchaseRates[materialId] || 
                      purchaseRates[materialId] <= 0
                    );
                    
                    if (missingData.length > 0) {
                      alert('Please fill required qty, purchase unit, conversion, rate, and tax for all selected materials');
                      return;
                    }
                    
                    // Validate quantities don't exceed available quantities
                      const invalidQuantities = Array.from(selectedMaterials).filter(materialId => {
                      const material = projectMaterials.find(m => m.id === materialId);
                      const requestedQty = getRequiredQty(materialId);
                      const remainingQty = Math.max((material?.required_qty || 0) - (material?.requested_qty || 0), 0);
                      return requestedQty > remainingQty;
                    });
                    
                    if (invalidQuantities.length > 0) {
                      const invalidMaterials = invalidQuantities.map(materialId => {
                        const material = projectMaterials.find(m => m.id === materialId);
                        return material?.name || 'Unknown Material';
                      }).join(', ');
                      alert(`Requested quantity exceeds available quantity for: ${invalidMaterials}`);
                      return;
                    }
                    
                    try {
                      console.log('🚀 Creating purchase request with normalized schema');
                      const requiresPOForProject = ['awarded', 'finalized', 'completed'].includes(
                        String(project?.project_status || project?.status || '').toLowerCase()
                      );
                      if (requiresPOForProject && !selectedPOForRequest) {
                        alert('Select an active client PO before submitting this purchase request.');
                        return;
                      }
                      
                      // Prepare purchase request data for new normalized API
                      const purchaseRequestData = {
                        project_id: project.id,
                        contractor_id: contractor?.id,
                        project_po_reference_id: selectedPOForRequest || null,
                        remarks: Array.from(selectedMaterials).map(materialId => 
                          purchaseRemarks[materialId] || ''
                        ).filter(remark => remark).join('; ') || null,
                        shipping_location: purchaseShippingLocation.trim() || null,
                        items: Array.from(selectedMaterials).map(materialId => ({
                          ...(() => {
                            const material = projectMaterials.find(m => m.id === materialId);
                            const typedDescription = purchaseRemarks[materialId]?.trim();
                            const fallbackDescription = material?.notes || material?.description || undefined;
                            const typedHsn = purchaseHsn[materialId]?.trim();
                            const fallbackHsn = material?.hsn_code?.trim() || undefined;
                            const conversionFactor = getConversionFactor(materialId);
                            const requiredQty = getRequiredQty(materialId);
                            const purchaseQty = getComputedPurchaseQty(materialId);
                            return {
                              project_material_id: materialId,
                              hsn_code: typedHsn || fallbackHsn,
                              item_description: typedDescription || fallbackDescription,
                              site_unit: material?.unit || undefined,
                              purchase_unit: purchaseUnits[materialId]?.trim() || material?.unit || undefined,
                              conversion_factor: conversionFactor,
                              purchase_qty: purchaseQty,
                              normalized_qty: purchaseQty * conversionFactor,
                          requested_qty: requiredQty,
                        };
                      })(),
                          unit_rate: purchaseRates[materialId] || 0,
                          tax_percent: purchaseTax[materialId] || 0,
                          round_off_amount: getRoundOffValue(materialId)
                        }))
                      };
                      
                      // Create purchase request using normalized API
                      const response = await fetch('/api/purchase-requests', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(purchaseRequestData)
                      });
                      
                      const result = await response.json();
                      
                      if (response.ok && result.success) {
                        alert(`Purchase request created successfully! Request ID: ${result.data.id}`);
                        console.log('✅ Purchase request created:', result.data);
                        
                        // Refresh project materials to reflect the new purchase request
                        await fetchProjectMaterials(project.id);
                        await fetchProjectPOReferences(project.id);
                        
                        // Clear states and close dialog
                        setShowBatchPurchaseDialog(false);
                        setSelectedMaterials(new Set());
                        setPurchaseQuantities({});
                        setPurchaseRates({});
                        setPurchaseTax({});
                        setPurchaseRoundOffs({});
                        setPurchaseHsn({});
                        setPurchaseRemarks({});
                        setPurchaseUnits({});
                        setPurchaseConversions({});
                        setPurchaseShippingLocation('');
                        setSelectedPOForRequest('');
                        setSelectedVendor(null);
                      } else {
                        console.error('❌ Failed to create purchase request:', result);
                        alert(`Failed to create purchase request: ${result.error || 'Unknown error'}`);
                      }
                    } catch (error) {
                      console.error('Error submitting purchase request:', error);
                      alert('Error submitting purchase request');
                    }
                  }}
                  disabled={Array.from(selectedMaterials).length === 0}
                  className="bg-accent-amber hover:bg-accent-amber/90 text-neutral-dark px-6 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Submit Request
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Purchase Request Modal */}
        {(editRequestLoading || editingPurchaseRequest) && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-neutral-dark rounded-lg border border-neutral-medium w-full max-w-6xl max-h-[90vh] overflow-hidden">
              <div className="px-6 py-4 border-b border-neutral-medium flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-primary">
                    {editRequestLoading
                      ? 'Loading Purchase Request...'
                      : `${editingPurchaseRequest?.editable ? 'Edit' : 'View'} Purchase Request #${editingPurchaseRequest?.id.slice(0, 8).toUpperCase()}`}
                  </h3>
                  {!editRequestLoading && editingPurchaseRequest && (
                    <p className="text-xs text-secondary mt-1">
                      Status: {editingPurchaseRequest.status.replace(/_/g, ' ')}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => {
                    if (savingRequestEdit) return;
                    setEditingPurchaseRequest(null);
                    setNewMaterialIdForRequest('');
                  }}
                  className="text-secondary hover:text-primary text-sm"
                >
                  Close
                </button>
              </div>

              {editRequestLoading || !editingPurchaseRequest ? (
                <div className="p-6 flex items-center gap-2 text-secondary">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-accent-amber" />
                  Loading...
                </div>
              ) : (
                <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-160px)]">
                  {!editingPurchaseRequest.editable && (
                    <div className="p-3 rounded border border-neutral-medium bg-neutral-darker text-xs text-secondary">
                      This request is no longer editable in its current status.
                    </div>
                  )}

                  <div className="grid md:grid-cols-3 gap-3">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-secondary mb-1">Remarks</label>
                      <input
                        type="text"
                        value={editingPurchaseRequest.remarks || ''}
                        disabled={!editingPurchaseRequest.editable}
                        onChange={(e) =>
                          setEditingPurchaseRequest({
                            ...editingPurchaseRequest,
                            remarks: e.target.value
                          })
                        }
                        className="w-full px-3 py-2 rounded-lg border border-neutral-medium bg-neutral-darker text-primary focus:outline-none focus:ring-2 focus:ring-accent-amber disabled:opacity-50"
                        placeholder="Optional remarks"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-secondary mb-1">Add Material</label>
                      <div className="flex gap-2">
                        <select
                          value={newMaterialIdForRequest}
                          disabled={!editingPurchaseRequest.editable}
                          onChange={(e) => setNewMaterialIdForRequest(e.target.value)}
                          className="flex-1 px-3 py-2 rounded-lg border border-neutral-medium bg-neutral-darker text-primary focus:outline-none focus:ring-2 focus:ring-accent-amber disabled:opacity-50"
                        >
                          <option value="">Select material</option>
                          {addableMaterialsForEdit.map((material) => (
                          <option key={material.id} value={material.id}>
                              {material.name} ({formatTwoDecimals(material.max_requestable)} {material.unit || 'unit'} available)
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={addMaterialToEditingRequest}
                          disabled={!editingPurchaseRequest.editable || !newMaterialIdForRequest}
                          className="px-3 py-2 rounded-lg bg-accent-amber text-neutral-dark text-sm font-medium hover:bg-accent-amber/90 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </div>

                  {['awarded', 'finalized', 'completed'].includes(String(project?.project_status || project?.status || '').toLowerCase()) && (
                    <div>
                      <label className="block text-xs font-medium text-secondary mb-1">Funding PO</label>
                      <select
                        value={editingPurchaseRequest.project_po_reference_id || ''}
                        disabled={!editingPurchaseRequest.editable}
                        onChange={(e) =>
                          setEditingPurchaseRequest({
                            ...editingPurchaseRequest,
                            project_po_reference_id: e.target.value || null,
                            project_po_reference: poReferences.find((po) => po.id === e.target.value) || null,
                          })
                        }
                        className="w-full px-3 py-2 rounded-lg border border-neutral-medium bg-neutral-darker text-primary focus:outline-none focus:ring-2 focus:ring-accent-amber disabled:opacity-50"
                      >
                        <option value="">Select active client PO</option>
                        {poReferences
                          .filter((po) => po.status === 'active')
                          .map((po) => (
                            <option key={po.id} value={po.id}>
                              {po.po_number}{po.is_default ? ' (Default)' : ''}
                            </option>
                          ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-medium text-secondary mb-1">Shipping Location</label>
                    <textarea
                      value={editingPurchaseRequest.shipping_location || ''}
                      disabled={!editingPurchaseRequest.editable}
                      onChange={(e) =>
                        setEditingPurchaseRequest({
                          ...editingPurchaseRequest,
                          shipping_location: e.target.value
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-neutral-medium bg-neutral-darker text-primary focus:outline-none focus:ring-2 focus:ring-accent-amber disabled:opacity-50 resize-none"
                      placeholder="Project/site shipping address"
                      rows={2}
                    />
                  </div>

                  <div className="overflow-x-auto border border-neutral-medium rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-neutral-darker border-b border-neutral-medium">
                        <tr>
                          <th className="p-3 text-left text-secondary">Item</th>
                          <th className="p-3 text-left text-secondary">Qty</th>
                          <th className="p-3 text-left text-secondary">Unit</th>
                          <th className="p-3 text-left text-secondary">Rate</th>
                          <th className="p-3 text-left text-secondary">Tax %</th>
                          <th className="p-3 text-left text-secondary">Round Off</th>
                          <th className="p-3 text-left text-secondary">HSN</th>
                          <th className="p-3 text-left text-secondary">Description / Specs</th>
                          <th className="p-3 text-left text-secondary">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {editingPurchaseRequest.items.map((item) => {
                          const addableMaterial = projectMaterials.find((m) => m.id === item.project_material_id);
                          const maxQty = addableMaterial ? Number(addableMaterial.max_requestable || 0) : null;
                          const isNewItem = item.id.startsWith('new-');
                          return (
                            <tr key={item.id} className="border-b border-neutral-medium/30">
                              <td className="p-3 align-top min-w-[220px]">
                                <div className="text-primary font-medium">{item.material_name || 'Material'}</div>
                                {maxQty !== null && maxQty > 0 && (
                                  <div className="text-xs text-secondary mt-1">
                                    Max addable now: {formatTwoDecimals(maxQty)}{' '}
                                    {item.unit || 'unit'}
                                  </div>
                                )}
                              </td>
                              <td className="p-3 align-top min-w-[120px]">
                                <input
                                  type="number"
                                  min="0.001"
                                  step="0.001"
                                  value={item.requested_qty}
                                  disabled={!editingPurchaseRequest.editable}
                                  onChange={(e) => updateRequestEditItem(item.id, 'requested_qty', e.target.value)}
                                  className="w-full px-2 py-1 rounded border border-neutral-medium bg-neutral-darker text-primary focus:outline-none focus:ring-2 focus:ring-accent-amber disabled:opacity-50"
                                />
                              </td>
                              <td className="p-3 align-top min-w-[120px] text-secondary">{item.unit || 'unit'}</td>
                              <td className="p-3 align-top min-w-[120px]">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={item.unit_rate ?? ''}
                                  disabled={!editingPurchaseRequest.editable}
                                  onChange={(e) => updateRequestEditItem(item.id, 'unit_rate', e.target.value)}
                                  className="w-full px-2 py-1 rounded border border-neutral-medium bg-neutral-darker text-primary focus:outline-none focus:ring-2 focus:ring-accent-amber disabled:opacity-50"
                                />
                              </td>
                              <td className="p-3 align-top min-w-[100px]">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={item.tax_percent ?? 0}
                                  disabled={!editingPurchaseRequest.editable}
                                  onChange={(e) => updateRequestEditItem(item.id, 'tax_percent', e.target.value)}
                                  className="w-full px-2 py-1 rounded border border-neutral-medium bg-neutral-darker text-primary focus:outline-none focus:ring-2 focus:ring-accent-amber disabled:opacity-50"
                                />
                              </td>
                              <td className="p-3 align-top min-w-[120px]">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={item.round_off_amount ?? 0}
                                  disabled={!editingPurchaseRequest.editable}
                                  onChange={(e) => updateRequestEditItem(item.id, 'round_off_amount', e.target.value)}
                                  className="w-full px-2 py-1 rounded border border-neutral-medium bg-neutral-darker text-primary focus:outline-none focus:ring-2 focus:ring-accent-amber disabled:opacity-50"
                                />
                              </td>
                              <td className="p-3 align-top min-w-[140px]">
                                <input
                                  type="text"
                                  value={item.hsn_code || ''}
                                  disabled={!editingPurchaseRequest.editable}
                                  onChange={(e) => updateRequestEditItem(item.id, 'hsn_code', e.target.value)}
                                  className="w-full px-2 py-1 rounded border border-neutral-medium bg-neutral-darker text-primary focus:outline-none focus:ring-2 focus:ring-accent-amber disabled:opacity-50"
                                  placeholder="HSN code"
                                />
                              </td>
                              <td className="p-3 align-top min-w-[280px]">
                                <textarea
                                  rows={2}
                                  value={item.item_description || ''}
                                  disabled={!editingPurchaseRequest.editable}
                                  onChange={(e) =>
                                    updateRequestEditItem(item.id, 'item_description', e.target.value)
                                  }
                                  className="w-full px-2 py-1 rounded border border-neutral-medium bg-neutral-darker text-primary focus:outline-none focus:ring-2 focus:ring-accent-amber disabled:opacity-50"
                                  placeholder="Brand / size / specification"
                                />
                              </td>
                              <td className="p-3 align-top">
                                {editingPurchaseRequest.editable && isNewItem ? (
                                  <button
                                    onClick={() => removeMaterialFromEditingRequest(item.id)}
                                    className="text-xs px-2 py-1 rounded border border-red-500/50 text-red-300 hover:bg-red-500/10"
                                  >
                                    Remove
                                  </button>
                                ) : (
                                  <span className="text-xs text-secondary">-</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => setEditingPurchaseRequest(null)}
                      disabled={savingRequestEdit}
                      className="px-4 py-2 text-secondary hover:text-primary disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveEditedPurchaseRequest}
                      disabled={!editingPurchaseRequest.editable || savingRequestEdit}
                      className="px-4 py-2 rounded bg-accent-amber text-neutral-dark font-medium hover:bg-accent-amber/90 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {savingRequestEdit ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* PDF Viewer Modal */}
        {showPDFViewer && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="w-full h-full max-w-7xl max-h-[90vh] bg-neutral-dark rounded-lg border border-neutral-medium overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-neutral-medium">
                <div className="flex items-center space-x-4">
                  <h2 className="text-lg font-semibold text-primary">
                    {useAnalysisMode ? 'Quantity Takeoff' : 'File Viewer'}: {currentPDFName}
                  </h2>
                  {currentPDFUrl && (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setUseAnalysisMode(false)}
                        className={`px-3 py-1 text-sm rounded transition-colors ${
                          !useAnalysisMode 
                            ? 'bg-accent-amber text-neutral-dark'
                            : 'text-secondary hover:text-primary'
                        }`}
                      >
                        View Mode
                      </button>
                      <button
                        onClick={() => setUseAnalysisMode(true)}
                        className={`px-3 py-1 text-sm rounded transition-colors ${
                          useAnalysisMode 
                            ? 'bg-accent-blue text-white'
                            : 'text-secondary hover:text-primary'
                        }`}
                      >
                        Takeoff Mode
                      </button>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => {
                    setShowPDFViewer(false);
                    setCurrentPDFUrl('');
                    setCurrentPDFName('');
                    setUseAnalysisMode(false);
                  }}
                  className="text-secondary hover:text-primary text-2xl"
                >
                  ×
                </button>
              </div>
              <div className="h-full pb-16 overflow-auto">
                {useAnalysisMode ? (
                  <BOQTakeoffViewer
                    fileUrl={currentPDFUrl}
                    fileName={currentPDFName}
                    projectId={project?.id}
                    onError={(error) => {
                      console.error('Quantity takeoff error:', error);
                      alert('Failed to load drawing for takeoff. The file might be corrupted or not accessible.');
                      setShowPDFViewer(false);
                    }}
                    onExportComplete={() => {
                      fetchProjectMaterials(project.id);
                      setActiveTab('materials');
                    }}
                  />
                ) : (
                  <SimplePDFViewer
                    fileUrl={currentPDFUrl}
                    fileName={currentPDFName}
                  />
                )}
              </div>
            </div>
          </div>
        )}
      {/* Mini Material Request Dialog */}
      {showMiniRequestDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-dark border border-neutral-medium rounded-lg p-6 w-full max-w-sm">
            {miniRequestSuccess ? (
              <div className="text-center py-4">
                <div className="text-3xl mb-3">✅</div>
                <p className="text-sm font-semibold text-primary mb-1">Request submitted</p>
                <p className="text-xs text-secondary mb-4">
                  Our team will review and add it to the catalog within 24 hours.
                </p>
                <button
                  onClick={() => setShowMiniRequestDialog(false)}
                  className="px-4 py-2 text-sm font-medium bg-accent-amber text-neutral-darker rounded hover:bg-accent-amber/80"
                >
                  Close
                </button>
              </div>
            ) : (
              <>
                <h3 className="text-base font-semibold text-primary mb-1">Request New Material</h3>
                <p className="text-xs text-secondary mb-4">
                  Our team reviews within 24 hours and adds it to the master catalog.
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-secondary mb-1">Material Name *</label>
                    <input
                      type="text"
                      value={miniRequestForm.name}
                      onChange={e => setMiniRequestForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 bg-neutral-darker border border-neutral-medium rounded-lg text-primary text-sm focus:border-accent-amber focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-secondary mb-1">HSN Code</label>
                    <input
                      type="text"
                      value={miniRequestForm.hsn_code}
                      onChange={e => setMiniRequestForm(prev => ({ ...prev, hsn_code: e.target.value }))}
                      placeholder="Optional HSN/SAC"
                      className="w-full px-3 py-2 bg-neutral-darker border border-neutral-medium rounded-lg text-primary text-sm focus:border-accent-amber focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-secondary mb-1">Category *</label>
                    <input
                      type="text"
                      value={miniRequestForm.category}
                      onChange={e => setMiniRequestForm(prev => ({ ...prev, category: e.target.value }))}
                      placeholder="e.g., Cement, Steel, Electrical"
                      className="w-full px-3 py-2 bg-neutral-darker border border-neutral-medium rounded-lg text-primary text-sm focus:border-accent-amber focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-secondary mb-1">Unit *</label>
                    <select
                      value={miniRequestForm.unit}
                      onChange={e => setMiniRequestForm(prev => ({ ...prev, unit: e.target.value }))}
                      className="w-full px-3 py-2 bg-neutral-darker border border-neutral-medium rounded-lg text-primary text-sm focus:border-accent-amber focus:outline-none"
                    >
                      <option value="">Select unit</option>
                      {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                  <div className="flex gap-3 pt-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setShowMiniRequestDialog(false)}
                      className="px-3 py-2 text-sm text-secondary hover:text-primary"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={!miniRequestForm.name.trim() || !miniRequestForm.category.trim() || !miniRequestForm.unit || miniRequestSubmitting}
                      onClick={async () => {
                        setMiniRequestSubmitting(true);
                        try {
                          const res = await fetch('/api/materials', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              name: miniRequestForm.name.trim(),
                              hsn_code: miniRequestForm.hsn_code?.trim() || undefined,
                              category: miniRequestForm.category.trim(),
                              unit: miniRequestForm.unit,
                              approval_status: 'pending',
                              project_context: project?.project_name,
                            }),
                          });
                          if (res.ok) {
                            setMiniRequestSuccess(true);
                          } else {
                            const err = await res.json();
                            alert(err.error || 'Failed to submit request');
                          }
                        } catch {
                          alert('Failed to submit request');
                        } finally {
                          setMiniRequestSubmitting(false);
                        }
                      }}
                      className="px-4 py-2 text-sm font-medium bg-accent-amber text-neutral-darker rounded hover:bg-accent-amber/80 disabled:opacity-50"
                    >
                      {miniRequestSubmitting ? 'Submitting...' : 'Submit Request'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

        {showEditProjectDialog && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-neutral-dark rounded-lg border border-neutral-medium w-full max-w-2xl">
              <div className="px-6 py-4 border-b border-neutral-medium flex items-center justify-between">
                <h3 className="text-lg font-semibold text-primary">Edit Project</h3>
                <button
                  onClick={() => !savingProjectDetails && setShowEditProjectDialog(false)}
                  className="text-secondary hover:text-primary text-sm"
                >
                  Close
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-primary mb-2">Project Name</label>
                  <input
                    type="text"
                    value={projectForm.project_name}
                    onChange={(e) => setProjectForm(prev => ({ ...prev, project_name: e.target.value }))}
                    className="w-full px-3 py-2 border border-neutral-medium rounded-lg bg-neutral-darker text-primary focus:outline-none focus:ring-2 focus:ring-accent-amber"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-primary mb-2">Client</label>
                  <input
                    type="text"
                    value={projectForm.client_name}
                    disabled
                    className="w-full px-3 py-2 border border-neutral-medium rounded-lg bg-neutral-darker text-secondary opacity-70"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-primary mb-2">Project Address</label>
                  <textarea
                    value={projectForm.project_address}
                    onChange={(e) => setProjectForm(prev => ({ ...prev, project_address: e.target.value }))}
                    rows={4}
                    placeholder="Enter the project/site address"
                    className="w-full px-3 py-2 border border-neutral-medium rounded-lg bg-neutral-darker text-primary focus:outline-none focus:ring-2 focus:ring-accent-amber resize-none"
                  />
                </div>
              </div>
              <div className="px-6 py-4 border-t border-neutral-medium flex justify-end gap-3">
                <button
                  onClick={() => setShowEditProjectDialog(false)}
                  disabled={savingProjectDetails}
                  className="px-4 py-2 border border-neutral-medium text-primary rounded-lg hover:bg-neutral-medium/20 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={saveProjectDetails}
                  disabled={savingProjectDetails || !projectForm.project_name.trim()}
                  className="px-4 py-2 bg-accent-amber text-neutral-dark rounded-lg hover:bg-accent-amber/90 transition-colors disabled:opacity-50"
                >
                  {savingProjectDetails ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ContractorDashboardLayout>
  );
}

export default function IndividualProject(): React.ReactElement {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <IndividualProjectContent />
    </Suspense>
  );
}
