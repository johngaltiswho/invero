'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, Suspense } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { ContractorDashboardLayout } from '@/components/ContractorDashboardLayout';
import { LoadingSpinner, Button } from '@/components';
import { useContractorV2 } from '@/contexts/ContractorContextV2';
import EditableBOQTable from '@/components/EditableBOQTable';
import EditableScheduleTable from '@/components/EditableScheduleTable';
import BOQDisplay from '@/components/BOQDisplay';
import ScheduleDisplay from '@/components/ScheduleDisplay';
import SimplePDFViewer from '@/components/SimplePDFViewer';
import BOQTakeoffViewer from '@/components/BOQTakeoffViewer';
import { getBOQByProjectId, getScheduleByProjectId } from '@/lib/supabase-boq';
import { jsPDF } from 'jspdf';
import { uploadPurchaseInvoice } from '@/lib/file-upload';

function IndividualProjectContent(): React.ReactElement {
  const { isLoaded } = useUser();
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;
  const { contractor, loading: contractorLoading } = useContractorV2();
  
  // Project state
  const [project, setProject] = useState<any>(null);
  const [projectLoading, setProjectLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'boq' | 'schedule' | 'materials' | 'files'>('overview');
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Enhanced project data state
  const [enhancedProjectData, setEnhancedProjectData] = useState<any>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [hasBOQData, setHasBOQData] = useState(false);
  const [hasScheduleData, setHasScheduleData] = useState(false);
  const [documentStatusLoading, setDocumentStatusLoading] = useState(false);
  
  // Materials state
  const [projectMaterials, setProjectMaterials] = useState<any[]>([]);
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
  const [purchaseRemarks, setPurchaseRemarks] = useState<{[key: string]: string}>({});
  const [purchaseQuantities, setPurchaseQuantities] = useState<{[key: string]: string}>({});
  const [selectedVendor, setSelectedVendor] = useState<any>(null);
  const [piFile, setPiFile] = useState<File | null>(null);
  
  // Generate PO state
  const [poRates, setPoRates] = useState<{[key: string]: number}>({});
  const [poTax, setPoTax] = useState<{[key: string]: number}>({});
  const [poRemarks, setPoRemarks] = useState<{[key: string]: string}>({});
  const [poQuantities, setPoQuantities] = useState<{[key: string]: string}>({});
  const [poVendor, setPoVendor] = useState<string>('');
  
  // Material Form state
  const [materialForm, setMaterialForm] = useState({
    material: '',
    materialName: '',
    quantity: '',
    unit: 'bags',
    description: '',
    category: 'cement',
    notes: ''
  });
  const [showAddMaterial, setShowAddMaterial] = useState(false);

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

  // Load project data on mount
  useEffect(() => {
    if (isLoaded && projectId && contractor) {
      fetchProjectData();
    }
  }, [isLoaded, projectId, contractor]);

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
          
          // Load project materials, files, etc.
          await Promise.all([
            fetchProjectMaterials(projectId),
            fetchProjectFiles(projectId),
            checkDocumentStatus(data.data),
            fetchBOQData(projectId),
            fetchScheduleData(projectId)
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
      const response = await fetch(`/api/project-materials?project_id=${projectId}`);
      if (response.ok) {
        const data = await response.json();
        setProjectMaterials(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching project materials:', error);
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
    } catch (error) {
      console.error('Error fetching BOQ data:', error);
    } finally {
      setBOQLoading(false);
    }
  };

  const fetchScheduleData = async (projectId: string) => {
    try {
      setScheduleLoading(true);
      const scheduleData = await getScheduleByProjectId(projectId);
      setScheduleData(scheduleData);
    } catch (error) {
      console.error('Error fetching schedule data:', error);
    } finally {
      setScheduleLoading(false);
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
      const response = await fetch(`/api/project-files/download?id=${fileId}`);
      const result = await response.json();

      if (result.success) {
        const { downloadUrl, fileName, mimeType } = result.data;
        
        // If it's a PDF, show in our viewer
        if (mimeType === 'application/pdf') {
          setCurrentPDFUrl(downloadUrl);
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
      const response = await fetch(`/api/project-files/download?id=${fileId}`);
      const result = await response.json();

      if (result.success) {
        const { downloadUrl, fileName, mimeType } = result.data;
        
        // Only for PDFs (drawings)
        if (mimeType === 'application/pdf') {
          setCurrentPDFUrl(downloadUrl);
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

  // Material status helper function
  const getMaterialStatusInfo = (status: string) => {
    switch (status) {
      case 'purchase_requested':
        return { label: 'RFQ Generated', color: 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-400' };
      case 'quote_received':
        return { label: 'Quote Received', color: 'bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-400' };
      case 'purchase_request_raised':
        return { label: 'Purchase Request Raised', color: 'bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-400' };
      case 'approved_for_funding':
        return { label: 'Approved for Funding', color: 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-400' };
      case 'completed':
        return { label: 'Purchase Completed', color: 'bg-green-200 text-green-900 dark:bg-green-600/20 dark:text-green-300' };
      case 'rejected':
        return { label: 'Rejected', color: 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-400' };
      case 'rfq_generated':
        return { label: 'RFQ Generated', color: 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-400' };
      case 'po_generated':
        return { label: 'PO Generated', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-400' };
      default:
        return { label: 'Pending', color: 'bg-gray-100 text-gray-800 dark:bg-gray-500/20 dark:text-gray-400' };
    }
  };

  // Handle material selection for batch operations
  const handleMaterialSelection = (materialId: string, selected: boolean) => {
    const newSelected = new Set(selectedMaterials);
    if (selected) {
      newSelected.add(materialId);
    } else {
      newSelected.delete(materialId);
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

    const selectedMaterialsList = projectMaterials.filter(m => selectedMaterials.has(m.id));
    
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
      xPos += colWidths[index];
    });
    
    doc.line(20, yPosition + 1, pageWidth - 20, yPosition + 1);
    yPosition += 6;

    // Table Rows
    doc.setFont('helvetica', 'normal');
    selectedMaterialsList.forEach((material, index) => {
      xPos = 20;
      const rowData = [
        (index + 1).toString(),
        material.materials?.name || material.name || 'Unknown Material',
        material.quantity?.toString() || '0',
        material.unit || 'Unit',
        '', // Rate to be filled by vendor
        '' // Total to be filled by vendor
      ];
      
      rowData.forEach((data, colIndex) => {
        const text = doc.splitTextToSize(data, colWidths[colIndex] - 2);
        doc.text(text, xPos, yPosition);
        xPos += colWidths[colIndex];
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
                  <EditableBOQTable
                    projectId={project.id}
                    contractorId={contractor?.id}
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
                      onClick={() => setEditingBOQ(!editingBOQ)}
                      className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                        editingBOQ 
                          ? 'bg-neutral-medium text-primary hover:bg-neutral-medium/80'
                          : 'bg-accent-blue text-white hover:bg-accent-blue/90'
                      }`}
                    >
                      {editingBOQ ? '← Back to View' : '✏️ Edit BOQ'}
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
                    contractorId={contractor?.id}
                    onSaveSuccess={() => {
                      setRefreshKey(prev => prev + 1);
                      setShowScheduleEntry(false);
                      setTimeout(() => setRefreshKey(prev => prev + 1), 500);
                    }}
                  />
                </div>
              )}
              
              {/* Always show existing Schedule data if available */}
              <ScheduleDisplay key={`schedule-${refreshKey}`} projectId={project.id} contractorId={contractor?.id} />
            </div>
          )}

          {/* Materials Tab */}
          {activeTab === 'materials' && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-primary">Project Materials</h3>
                <div className="flex space-x-3">
                  {selectedMaterials.size > 0 && (
                    <>
                      <Button
                        onClick={handleGenerateRFQ}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
                      >
                        Generate RFQ ({selectedMaterials.size})
                      </Button>
                      <Button
                        onClick={handleSubmitPurchaseRequest}
                        className="bg-accent-amber hover:bg-accent-amber/90 text-neutral-dark px-4 py-2 rounded-lg text-sm"
                      >
                        Submit Purchase Request ({selectedMaterials.size})
                      </Button>
                    </>
                  )}
                </div>
              </div>

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
                      checked={selectedMaterials.size === projectMaterials.length && projectMaterials.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedMaterials(new Set(projectMaterials.map(m => m.id)));
                        } else {
                          setSelectedMaterials(new Set());
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
                          <th className="p-3 text-left text-secondary">Name</th>
                          <th className="p-3 text-left text-secondary">Source</th>
                          <th className="p-3 text-left text-secondary">Qty</th>
                          <th className="p-3 text-left text-secondary">Available Qty</th>
                          <th className="p-3 text-left text-secondary">Requested Qty</th>
                          <th className="p-3 text-left text-secondary">Status</th>
                          <th className="p-3 text-left text-secondary">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {projectMaterials.map((material) => {
                          const statusInfo = getMaterialStatusInfo(material.purchase_status || 'none');
                          const source = material.source || material.materials?.source || 'Manual';
                          return (
                            <tr key={material.id} className="border-b border-neutral-medium/40 hover:bg-neutral-medium/10">
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
                                  {material.materials?.name || material.name || 'Unknown Material'}
                                </div>
                                <div className="text-xs text-secondary">
                                  {material.materials?.description || material.notes || 'No description'}
                                </div>
                              </td>
                              <td className="p-3 text-secondary">
                                {source}
                              </td>
                              <td className="p-3 text-secondary">
                                {material.quantity || 0} {material.unit || 'units'}
                              </td>
                              <td className="p-3 text-secondary">
                                {material.available_qty !== undefined ? `${material.available_qty} ${material.unit || 'units'}` : '—'}
                              </td>
                              <td className="p-3 text-secondary">
                                {material.requested_qty ? `${material.requested_qty} ${material.unit || 'units'}` : '—'}
                              </td>
                              <td className="p-3">
                                <span className={`text-xs px-2 py-1 rounded font-medium ${statusInfo.color}`}>
                                  {statusInfo.label}
                                </span>
                              </td>
                              <td className="p-3">
                                <div className="flex flex-wrap gap-2">
                                  {material.purchase_status === 'none' && (
                                    <button
                                      onClick={() => {
                                        setSelectedMaterialForPurchase(material);
                                        setShowPurchaseDialog(true);
                                      }}
                                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs transition-colors"
                                    >
                                      Request Quote
                                    </button>
                                  )}
                                  {material.purchase_invoice_url && (
                                    <a
                                      href={material.purchase_invoice_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs transition-colors"
                                    >
                                      View Invoice
                                    </a>
                                  )}
                                  <button
                                    onClick={() => deleteMaterial(material.id)}
                                    className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs transition-colors"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
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
                    value={selectedVendor?.id || ''}
                    onChange={(e) => {
                      const vendor = vendors.find(v => v.id === e.target.value);
                      setSelectedVendor(vendor || null);
                    }}
                    className="w-full px-3 py-2 bg-neutral-darker border border-neutral-medium rounded-lg text-primary focus:border-accent-amber focus:outline-none"
                  >
                    <option value="">Choose vendor...</option>
                    {vendors.map((vendor) => (
                      <option key={vendor.id} value={vendor.id}>
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
                  onClick={() => setShowRFQDialog(false)}
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
                {/* Vendor Selection */}
                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Select Vendor * ({vendors.length} available)
                  </label>
                  <select
                    value={selectedVendor?.id || ''}
                    onChange={(e) => {
                      console.log('Selected vendor ID:', e.target.value);
                      const vendor = vendors.find(v => v.id === e.target.value || v.id === parseInt(e.target.value));
                      console.log('Found vendor:', vendor);
                      setSelectedVendor(vendor || null);
                    }}
                    className="w-full px-3 py-2 bg-neutral-darker border border-neutral-medium rounded-lg text-primary focus:border-accent-amber focus:outline-none"
                  >
                    <option value="">Choose vendor...</option>
                    {vendors.map((vendor) => (
                      <option key={vendor.id} value={vendor.id}>
                        {vendor.name} ({vendor.contact_person || 'No contact'})
                      </option>
                    ))}
                  </select>
                  {vendors.length === 0 && (
                    <p className="text-xs text-red-400 mt-1">No vendors found. Please add vendors in Network section first.</p>
                  )}
                </div>
                
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
                              {material.materials?.name || material.name || 'Unknown Material'}
                            </h5>
                            <p className="text-xs text-secondary">
                              Available: {material.quantity || 0} {material.unit || 'units'}
                            </p>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            {/* Quantity */}
                            <div>
                              <label className="block text-xs font-medium text-secondary mb-1">
                                Quantity *
                              </label>
                              <input
                                type="number"
                                value={purchaseQuantities[material.id] || ''}
                                onChange={(e) => setPurchaseQuantities(prev => ({
                                  ...prev,
                                  [material.id]: e.target.value
                                }))}
                                placeholder={`Max ${material.quantity || 0}`}
                                max={material.quantity || 0}
                                className="w-full px-2 py-1 bg-neutral-dark border border-neutral-medium rounded text-primary text-sm focus:border-accent-amber focus:outline-none"
                              />
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
                            
                            {/* Total */}
                            <div>
                              <label className="block text-xs font-medium text-secondary mb-1">
                                Total Amount
                              </label>
                              <div className="px-2 py-1 bg-neutral-medium/20 border border-neutral-medium rounded text-primary text-sm">
                                {(() => {
                                  const qty = parseFloat(purchaseQuantities[material.id] || '0');
                                  const rate = purchaseRates[material.id] || 0;
                                  const tax = purchaseTax[material.id] || 0;
                                  const subtotal = qty * rate;
                                  const total = subtotal + (subtotal * tax / 100);
                                  return formatCurrency(total || 0);
                                })()}
                              </div>
                            </div>
                          </div>
                          
                          {/* Remarks */}
                          <div className="mt-3">
                            <label className="block text-xs font-medium text-secondary mb-1">
                              Remarks
                            </label>
                            <textarea
                              value={purchaseRemarks[material.id] || ''}
                              onChange={(e) => setPurchaseRemarks(prev => ({
                                ...prev,
                                [material.id]: e.target.value
                              }))}
                              placeholder="Additional notes or specifications..."
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
                            const qty = parseFloat(purchaseQuantities[materialId] || '0');
                            const rate = purchaseRates[materialId] || 0;
                            const tax = purchaseTax[materialId] || 0;
                            const subtotal = qty * rate;
                            return sum + subtotal + (subtotal * tax / 100);
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
                    setPurchaseRemarks({});
                    setSelectedVendor(null);
                  }}
                  className="px-4 py-2 text-secondary hover:text-primary transition-colors"
                >
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    // Validate inputs
                    const missingData = Array.from(selectedMaterials).filter(materialId => 
                      !purchaseQuantities[materialId] || 
                      !purchaseRates[materialId] || 
                      purchaseTax[materialId] === undefined
                    );
                    
                    // Validate quantities don't exceed available quantities
                    const invalidQuantities = Array.from(selectedMaterials).filter(materialId => {
                      const material = projectMaterials.find(m => m.id === materialId);
                      const requestedQty = parseFloat(purchaseQuantities[materialId] || '0');
                      const availableQty = material?.quantity || 0;
                      return requestedQty > availableQty;
                    });
                    
                    if (!selectedVendor) {
                      alert('Please select a vendor');
                      return;
                    }
                    
                    if (missingData.length > 0) {
                      alert('Please fill in quantity, rate, and tax for all selected materials');
                      return;
                    }
                    
                    if (invalidQuantities.length > 0) {
                      const invalidMaterials = invalidQuantities.map(materialId => {
                        const material = projectMaterials.find(m => m.id === materialId);
                        return material?.materials?.name || material?.name || 'Unknown Material';
                      }).join(', ');
                      alert(`Requested quantity exceeds available quantity for: ${invalidMaterials}`);
                      return;
                    }
                    
                    try {
                      // Generate unique purchase_request_id UUID for this batch
                      const purchaseRequestId = crypto.randomUUID();
                      
                      // First upload PI file if provided
                      let purchaseInvoiceUrl = null;
                      if (piFile && contractor?.id) {
                        // Upload file using the first material ID for organization
                        const firstMaterialId = Array.from(selectedMaterials)[0];
                        if (firstMaterialId) {
                          const uploadResult = await uploadPurchaseInvoice(
                            piFile,
                            contractor.id,
                            firstMaterialId
                          );
                        
                          if (uploadResult.success) {
                            purchaseInvoiceUrl = uploadResult.url;
                          } else {
                            alert(`File upload failed: ${uploadResult.error}`);
                            return;
                          }
                        }
                      }
                      
                      // Update each selected material with batch purchase request data
                      const updatePromises = Array.from(selectedMaterials).map(materialId => {
                        const updateData = {
                          purchase_request_id: purchaseRequestId,
                          purchase_status: 'purchase_request_raised',
                          vendor_id: selectedVendor.id,
                          requested_qty: parseFloat(purchaseQuantities[materialId] || '0'),
                          quoted_rate: purchaseRates[materialId] || 0,
                          tax_percentage: purchaseTax[materialId] || 0,
                          tax_amount: (parseFloat(purchaseQuantities[materialId] || '0') * (purchaseRates[materialId] || 0) * (purchaseTax[materialId] || 0)) / 100,
                          total_amount: parseFloat(purchaseQuantities[materialId] || '0') * (purchaseRates[materialId] || 0) + ((parseFloat(purchaseQuantities[materialId] || '0') * (purchaseRates[materialId] || 0) * (purchaseTax[materialId] || 0)) / 100),
                          contractor_notes: purchaseRemarks[materialId] || '',
                          purchase_invoice_url: purchaseInvoiceUrl,
                          submitted_at: new Date().toISOString()
                        };
                        
                        return fetch(`/api/project-materials/${materialId}`, {
                          method: 'PUT',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify(updateData)
                        });
                      });
                      
                      const responses = await Promise.all(updatePromises);
                      
                      // Check if all updates were successful
                      const allSuccessful = responses.every(response => response.ok);
                      
                      if (allSuccessful) {
                        alert(`Purchase request submitted successfully! Request ID: ${purchaseRequestId}`);
                        
                        // Update material statuses locally
                        setProjectMaterials(prev => prev.map(material => 
                          selectedMaterials.has(material.id)
                            ? { 
                                ...material, 
                                purchase_status: 'purchase_request_raised',
                                purchase_request_id: purchaseRequestId,
                                vendor_id: selectedVendor.id,
                                requested_qty: parseFloat(purchaseQuantities[material.id] || '0'),
                                quoted_rate: purchaseRates[material.id] || 0,
                                purchase_invoice_url: purchaseInvoiceUrl
                              }
                            : material
                        ));
                        
                        // Clear states and close dialog
                        setShowBatchPurchaseDialog(false);
                        setSelectedMaterials(new Set());
                        setPurchaseQuantities({});
                        setPurchaseRates({});
                        setPurchaseTax({});
                        setPurchaseRemarks({});
                        setSelectedVendor(null);
                        setPiFile(null);
                      } else {
                        alert('Some materials failed to update. Please try again.');
                      }
                    } catch (error) {
                      console.error('Error submitting purchase request:', error);
                      alert('Error submitting purchase request');
                    }
                  }}
                  disabled={!selectedVendor || Array.from(selectedMaterials).length === 0}
                  className="bg-accent-amber hover:bg-accent-amber/90 text-neutral-dark px-6 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Submit Request
                </Button>
              </div>
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
