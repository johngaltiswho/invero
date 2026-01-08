'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, Suspense } from 'react';
import { jsPDF } from 'jspdf';
import { ContractorDashboardLayout } from '@/components/ContractorDashboardLayout';
import { Button, LoadingSpinner } from '@/components';
import { useUser } from '@clerk/nextjs';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useContractorV2 } from '@/contexts/ContractorContextV2';
import EditableBOQTable from '@/components/EditableBOQTable';
import EditableScheduleTable from '@/components/EditableScheduleTable';
import BOQDisplay from '@/components/BOQDisplay';
import ScheduleDisplay from '@/components/ScheduleDisplay';
import SimplePDFViewer from '@/components/SimplePDFViewer';
import BOQTakeoffViewer from '@/components/BOQTakeoffViewer';
import { getBOQByProjectId, getScheduleByProjectId } from '@/lib/supabase-boq';

function ContractorProjectsContent(): React.ReactElement {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { contractor, loading: contractorLoading } = useContractorV2();
  
  // Determine main tab from URL
  const mainTab = pathname.includes('/tendering') ? 'boq-quoting' : 
                  pathname.includes('/active') ? 'awarded' : 'boq-quoting';
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'boq' | 'schedule' | 'materials' | 'files'>('overview');
  const [refreshKey, setRefreshKey] = useState(0);
  const [enhancedProjectData, setEnhancedProjectData] = useState<any>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [showBOQEntry, setShowBOQEntry] = useState(false);
  const [showScheduleEntry, setShowScheduleEntry] = useState(false);
  const [editingBOQ, setEditingBOQ] = useState(false);
  const [contractorProjects, setContractorProjects] = useState<any[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [hasBOQData, setHasBOQData] = useState(false);
  const [hasScheduleData, setHasScheduleData] = useState(false);
  const [documentStatusLoading, setDocumentStatusLoading] = useState(false);
  const [materialsAnalyzing, setMaterialsAnalyzing] = useState(false);
  const [materialsAnalyzed, setMaterialsAnalyzed] = useState(false);
  const [materialMappings, setMaterialMappings] = useState<any[]>([]);
  const [projectMaterials, setProjectMaterials] = useState<any[]>([]);
  const [materialForm, setMaterialForm] = useState({
    material: '',
    materialName: '',
    quantity: '',
    unit: 'bags',
    notes: ''
  });
  
  // Project creation form for BOQ Generator
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [newProject, setNewProject] = useState({
    project_name: '',
    client_id: '',
    description: '',
    tender_submission_date: ''
  });
  
  // Purchase request state
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);
  const [selectedMaterialForPurchase, setSelectedMaterialForPurchase] = useState<any>(null);
  
  // RFQ state
  const [selectedMaterials, setSelectedMaterials] = useState<Set<string>>(new Set());
  const [showRFQDialog, setShowRFQDialog] = useState(false);
  const [vendors, setVendors] = useState<any[]>([]);
  const [rfqForm, setRfqForm] = useState({
    vendor: '',
    deliveryDate: '',
    notes: ''
  });

  // Submit purchase request state (batch submission)
  const [showBatchPurchaseDialog, setShowBatchPurchaseDialog] = useState(false);
  const [purchaseRates, setPurchaseRates] = useState<{[key: string]: number}>({});
  const [purchaseTax, setPurchaseTax] = useState<{[key: string]: number}>({});
  const [purchaseRemarks, setPurchaseRemarks] = useState<{[key: string]: string}>({});
  const [purchaseQuantities, setPurchaseQuantities] = useState<{[key: string]: string}>({});
  const [vendor, setVendor] = useState<string>('');
  const [piFile, setPiFile] = useState<File | null>(null);

  // Generate PO state
  const [showPODialog, setShowPODialog] = useState(false);
  const [poRates, setPoRates] = useState<{[key: string]: number}>({});
  const [poTax, setPoTax] = useState<{[key: string]: number}>({});
  const [poRemarks, setPoRemarks] = useState<{[key: string]: string}>({});
  const [poQuantities, setPoQuantities] = useState<{[key: string]: string}>({});
  const [poVendor, setPoVendor] = useState<string>('');

  // Material workflow status tracking
  const [materialStatus, setMaterialStatus] = useState<{[key: string]: string}>({});

  // Material rates state
  const [materialRates, setMaterialRates] = useState<{[key: string]: number}>({});
  const [materialRemarks, setMaterialRemarks] = useState<{[key: string]: string}>({});
  
  // Project conversion state
  const [showConversionDialog, setShowConversionDialog] = useState(false);
  const [conversionForm, setConversionForm] = useState({
    estimated_value: '',
    po_number: '',
    funding_required: '',
    funding_status: 'pending'
  });

  // Awarded project creation state
  const [showCreateAwardedProject, setShowCreateAwardedProject] = useState(false);
  const [awardedProjectForm, setAwardedProjectForm] = useState({
    project_name: '',
    client_id: '',
    estimated_value: '',
    po_number: '',
    funding_required: '',
    funding_status: 'pending',
    po_file: null as File | null
  });

  // Simple 2-stage filtering
  const filteredProjects = contractorProjects.filter(project => {
    if (mainTab === 'boq-quoting') {
      // Show only draft projects
      return project.project_status === 'draft';
    } else if (mainTab === 'awarded') {
      // Show everything except draft projects
      return project.project_status !== 'draft';
    }
    return true;
  });

  // Create new project function
  const createProject = async () => {
    if (!newProject.project_name || !newProject.client_id || !contractor?.id) return;
    
    try {
      // Find the selected client to get the client name
      const selectedClient = clients.find(client => client.id === newProject.client_id);
      if (!selectedClient) return;

      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractor_id: contractor.id,
          project_name: newProject.project_name,
          client_name: selectedClient.name,
          project_status: 'draft',
          tender_submission_date: newProject.tender_submission_date || null
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        setRefreshKey(prev => prev + 1); // Refresh projects list
        setNewProject({ project_name: '', client_id: '', description: '', tender_submission_date: '' });
        setShowCreateProject(false);
        // Optionally select the new project
        setSelectedProject(result.data?.id || result.data?.project?.id);
      }
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };
  const [purchaseForm, setPurchaseForm] = useState({
    vendorId: '',
    requestedQuantity: ''
  });
  
  // Material search state  
  const [materialSearchOpen, setMaterialSearchOpen] = useState(false);
  const [materialSearchTerm, setMaterialSearchTerm] = useState('');
  
  // Client state for project creation
  const [clients, setClients] = useState<any[]>([]);
  
  // File management state
  const [projectFiles, setProjectFiles] = useState<any[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    file: null as File | null,
    category: '',
    description: '',
    version: '1.0'
  });
  
  // PDF Viewer state
  const [showPDFViewer, setShowPDFViewer] = useState(false);
  const [currentPDFUrl, setCurrentPDFUrl] = useState('');
  const [currentPDFName, setCurrentPDFName] = useState('');
  const [useAnalysisMode, setUseAnalysisMode] = useState(false);
  
  // Get contractor ID from authenticated user
  const currentContractorId = user?.publicMetadata?.contractorId as string || 'CONTRACTOR_001';

  // Workflow status logic based on database purchase_status
  const getWorkflowStatus = (material: any) => {
    // Use database purchase_status first, fall back to local state
    const dbStatus = material.purchase_status;
    const localStatus = materialStatus[material.id];
    
    // Priority: Database status > Local status > Default
    const status = dbStatus !== 'none' ? dbStatus : (localStatus || 'draft');
    
    switch (status) {
      case 'purchase_requested':
        return {
          label: 'RFQ Generated',
          color: 'bg-blue-100 text-blue-800'
        };
      case 'quote_received':
        return {
          label: 'Quote Received',
          color: 'bg-yellow-100 text-yellow-800'
        };
      case 'purchase_request_raised':
        return {
          label: 'Purchase Request Raised',
          color: 'bg-orange-100 text-orange-800'
        };
      case 'approved_for_funding':
        return {
          label: 'Approved for Funding',
          color: 'bg-green-100 text-green-800'
        };
      case 'completed':
        return {
          label: 'Purchase Completed',
          color: 'bg-green-200 text-green-900'
        };
      case 'rejected':
        return {
          label: 'Request Rejected',
          color: 'bg-red-100 text-red-800'
        };
      // Legacy local statuses for backward compatibility
      case 'rfq_generated':
        return {
          label: 'RFQ Generated',
          color: 'bg-blue-100 text-blue-800'
        };
      case 'po_generated':
        return {
          label: 'PO Generated',
          color: 'bg-purple-100 text-purple-800'
        };
      default:
        return {
          label: 'Ready for Processing',
          color: 'bg-gray-100 text-gray-800'
        };
    }
  };

  // Delete material from project
  const deleteMaterial = async (materialId: string) => {
    if (!confirm('Are you sure you want to delete this material from the project?')) {
      return;
    }

    try {
      const response = await fetch(`/api/project-materials/${materialId}`, {
        method: 'DELETE'
      });

      const result = await response.json();
      if (result.success) {
        // Remove from local state
        setProjectMaterials(prev => prev.filter(m => m.id !== materialId));
        // Remove from selected if it was selected
        setSelectedMaterials(prev => {
          const newSet = new Set(prev);
          newSet.delete(materialId);
          return newSet;
        });
        alert('Material deleted successfully');
      } else {
        alert(`Failed to delete material: ${result.error}`);
      }
    } catch (error) {
      console.error('Error deleting material:', error);
      alert('Error deleting material. Please try again.');
    }
  };

  // Submit material to Finverno for fulfillment
  const submitToFinverno = async (material: any) => {
    const rate = materialRates[material.id];
    const remarks = materialRemarks[material.id];
    
    if (!rate || rate <= 0) {
      alert('Please enter a valid rate first');
      return;
    }

    try {
      // TODO: Implement API call to submit to Finverno
      alert(`Material "${material.name}" submitted to Finverno successfully!\n\nRate: ₹${rate}/${material.unit}\nTotal: ₹${(rate * material.quantity).toFixed(2)}\n\nFinverno will now handle the procurement and delivery.`);
      
      // Remove from selected materials after submission
      const newSelected = new Set(selectedMaterials);
      newSelected.delete(material.id);
      setSelectedMaterials(newSelected);
      
      // Clear rate and remarks
      setMaterialRates(prev => {
        const newRates = { ...prev };
        delete newRates[material.id];
        return newRates;
      });
      setMaterialRemarks(prev => {
        const newRemarks = { ...prev };
        delete newRemarks[material.id];
        return newRemarks;
      });
      
    } catch (error) {
      console.error('Error submitting to Finverno:', error);
      alert('Failed to submit to Finverno. Please try again.');
    }
  };

  // Handle bulk submit to Finverno
  const handleSubmitPurchaseRequest = () => {
    if (selectedMaterials.size === 0) {
      alert('Please select materials to submit');
      return;
    }
    setShowBatchPurchaseDialog(true);
  };

  // Handle PO generation
  const handleGeneratePO = () => {
    if (selectedMaterials.size === 0) {
      alert('Please select materials to generate PO');
      return;
    }
    setShowPODialog(true);
  };

  // Fetch vendors when contractor is available
  useEffect(() => {
    if (contractor?.id) {
      fetchVendors();
    }
  }, [contractor?.id]);

  // Generate RFQ PDF
  const generateRFQPDF = async () => {
    const selectedMaterialsList = projectMaterials.filter(m => selectedMaterials.has(m.id));
    const selectedVendor = vendors.find(v => v.id.toString() === rfqForm.vendor);
    
    if (!selectedVendor || selectedMaterialsList.length === 0) {
      alert('Please select a vendor and materials');
      return;
    }

    // Create new PDF document
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    let yPosition = 20;

    // Header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('REQUEST FOR QUOTATION (RFQ)', pageWidth / 2, yPosition, { align: 'center' });
    
    yPosition += 15;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, pageWidth / 2, yPosition, { align: 'center' });
    
    yPosition += 20;

    // Company Info (Left Side)
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('FROM:', 20, yPosition);
    yPosition += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Company: ${contractor?.company_name || 'N/A'}`, 20, yPosition);
    yPosition += 6;
    doc.text(`Contact: ${contractor?.contact_person || 'N/A'}`, 20, yPosition);
    yPosition += 6;
    doc.text(`Email: ${contractor?.email || 'N/A'}`, 20, yPosition);
    yPosition += 6;
    doc.text(`Phone: ${contractor?.phone || 'N/A'}`, 20, yPosition);

    // Vendor Info (Right Side)
    const rightX = pageWidth / 2 + 10;
    yPosition -= 24; // Reset to same level as company info
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('TO:', rightX, yPosition);
    yPosition += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Vendor: ${selectedVendor.name}`, rightX, yPosition);
    yPosition += 6;
    doc.text(`Contact: ${selectedVendor.contactPerson}`, rightX, yPosition);
    yPosition += 6;
    doc.text(`Email: ${selectedVendor.email || 'N/A'}`, rightX, yPosition);
    yPosition += 6;
    doc.text(`Phone: ${selectedVendor.phone || 'N/A'}`, rightX, yPosition);

    yPosition += 20;

    // Project and delivery info
    if (rfqForm.deliveryDate || rfqForm.notes) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('REQUIREMENTS:', 20, yPosition);
      yPosition += 8;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      
      if (rfqForm.deliveryDate) {
        doc.text(`Required Delivery Date: ${new Date(rfqForm.deliveryDate).toLocaleDateString()}`, 20, yPosition);
        yPosition += 6;
      }
      
      if (rfqForm.notes) {
        doc.text('Additional Requirements:', 20, yPosition);
        yPosition += 6;
        // Split long text into multiple lines
        const notes = doc.splitTextToSize(rfqForm.notes, pageWidth - 40);
        doc.text(notes, 20, yPosition);
        yPosition += notes.length * 5 + 5;
      }
      yPosition += 10;
    }

    // Materials Table Header
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('MATERIALS REQUESTED:', 20, yPosition);
    yPosition += 10;

    // Table Header
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    const tableHeaders = ['Material Name', 'Category', 'Quantity', 'Unit', 'Rate', 'Amount'];
    const colWidths = [60, 35, 25, 20, 25, 25];
    let xPos = 20;
    
    tableHeaders.forEach((header, index) => {
      doc.text(header, xPos, yPosition);
      xPos += colWidths[index];
    });
    
    // Draw header line
    doc.line(20, yPosition + 2, pageWidth - 20, yPosition + 2);
    yPosition += 8;

    // Table Rows
    doc.setFont('helvetica', 'normal');
    selectedMaterialsList.forEach((material) => {
      xPos = 20;
      const rowData = [
        material.name || 'Unknown',
        material.category || 'N/A',
        material.quantity.toString(),
        material.unit || 'Unit',
        '____', // Placeholder for vendor to fill
        '____'  // Placeholder for vendor to fill
      ];
      
      rowData.forEach((data, index) => {
        const text = doc.splitTextToSize(data, colWidths[index] - 2);
        doc.text(text, xPos, yPosition);
        xPos += colWidths[index];
      });
      yPosition += 8;
    });

    // Draw table border
    doc.line(20, yPosition, pageWidth - 20, yPosition);
    yPosition += 15;

    // Footer instructions
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('INSTRUCTIONS:', 20, yPosition);
    yPosition += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const instructions = [
      '1. Please provide your best quotation for the above materials',
      '2. Include all applicable taxes and delivery charges',
      '3. Specify payment terms and delivery timeline',
      '4. Quote validity period should be minimum 30 days',
      '5. Submit your quotation within 5 business days'
    ];
    
    instructions.forEach(instruction => {
      doc.text(instruction, 20, yPosition);
      yPosition += 6;
    });

    // Generate unique filename
    const timestamp = new Date().toISOString().slice(0, 10);
    const vendorName = selectedVendor.name.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `RFQ_${vendorName}_${timestamp}.pdf`;

    // Save the PDF
    doc.save(filename);
    
    // Update material status in database to purchase_requested
    const selectedList = projectMaterials.filter(m => selectedMaterials.has(m.id));
    const updatePromises = selectedList.map(async (material) => {
      const response = await fetch(`/api/project-materials`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: material.id,
          purchase_status: 'purchase_requested'
        })
      });
      return response.json();
    });
    
    try {
      await Promise.all(updatePromises);
      // Refresh materials data
      const materialsResponse = await fetch(`/api/project-materials?project_id=${selectedProject}`);
      if (materialsResponse.ok) {
        const materialsResult = await materialsResponse.json();
        if (materialsResult.success) {
          const transformedMaterials = materialsResult.data.map((item: any) => {
            return {
              id: item.id,
              materialId: item.material_id,
              name: item.materials?.name || 'Unknown Material',
              category: item.materials?.category || 'Unknown',
              quantity: item.quantity,
              unit: item.unit,
              notes: item.notes || '',
              status: item.status,
              purchase_status: item.purchase_status || 'none',
              total_requested_qty: item.total_requested_qty || 0,
              remaining_qty: item.remaining_qty || item.quantity,
              vendor_id: item.vendor_id,
              addedAt: item.created_at,
              updatedAt: item.updated_at,
              source_type: item.source_type || 'manual',
              source_file_name: item.source_file_name,
              source_file_url: item.source_file_url,
              source_takeoff_id: item.source_takeoff_id
            };
          });
          setProjectMaterials(transformedMaterials);
        }
      }
    } catch (error) {
      console.error('Error updating material status:', error);
    }
    
    // Close the dialog and reset form
    setShowRFQDialog(false);
    setRfqForm({ vendor: '', deliveryDate: '', notes: '' });
    setSelectedMaterials(new Set());
    
    alert('RFQ PDF generated and downloaded successfully!');
  };

  // Generate PO PDF
  const generatePOPDF = async () => {
    const selectedMaterialsList = projectMaterials.filter(m => selectedMaterials.has(m.id));
    
    // Validate that all materials have rates
    const missingRates = selectedMaterialsList.filter(m => !poRates[m.id] || poRates[m.id] <= 0);
    if (missingRates.length > 0) {
      alert('Please enter rates for all materials');
      return;
    }

    // Create new PDF document
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    let yPosition = 20;

    // Header
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('PURCHASE ORDER', pageWidth / 2, yPosition, { align: 'center' });
    
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
    yPosition += 18;

    // Materials Table Header
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    const tableHeaders = ['Item', 'Qty', 'Unit', 'Rate', 'Tax%', 'Base Amt', 'Tax Amt', 'Total'];
    const colWidths = [35, 15, 15, 20, 15, 20, 20, 25];
    let xPos = 20;
    
    tableHeaders.forEach((header, index) => {
      doc.text(header, xPos, yPosition);
      xPos += colWidths[index];
    });
    
    // Draw header line
    doc.line(20, yPosition + 1, pageWidth - 20, yPosition + 1);
    yPosition += 6;

    // Table Rows
    doc.setFont('helvetica', 'normal');
    let totalBaseAmount = 0;
    let totalTaxAmount = 0;
    let grandTotal = 0;
    
    selectedMaterialsList.forEach((material) => {
      xPos = 20;
      const rate = poRates[material.id] || 0;
      const tax = poTax[material.id] || 0;
      const quantity = parseFloat(poQuantities[material.id] || material.quantity.toString()) || material.quantity;
      const baseAmount = rate * quantity;
      const taxAmount = (baseAmount * tax) / 100;
      const itemTotal = baseAmount + taxAmount;
      
      totalBaseAmount += baseAmount;
      totalTaxAmount += taxAmount;
      grandTotal += itemTotal;
      
      const rowData = [
        material.name || 'Unknown',
        quantity.toString(),
        material.unit || 'Unit',
        `₹${rate.toFixed(2)}`,
        `${tax.toFixed(1)}%`,
        `₹${baseAmount.toFixed(2)}`,
        `₹${taxAmount.toFixed(2)}`,
        `₹${itemTotal.toFixed(2)}`
      ];
      
      rowData.forEach((data, index) => {
        const text = doc.splitTextToSize(data, colWidths[index] - 2);
        doc.text(text, xPos, yPosition);
        xPos += colWidths[index];
      });
      yPosition += 6;
    });

    // Draw table border
    doc.line(20, yPosition, pageWidth - 20, yPosition);
    yPosition += 8;

    // Totals Section
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const totalsXPos = pageWidth - 80;
    
    doc.text(`Base Amount: ₹${totalBaseAmount.toFixed(2)}`, totalsXPos, yPosition);
    yPosition += 5;
    doc.text(`Tax Amount: ₹${totalTaxAmount.toFixed(2)}`, totalsXPos, yPosition);
    yPosition += 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(`TOTAL: ₹${grandTotal.toFixed(2)}`, totalsXPos, yPosition);

    // Footer
    yPosition += 20;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Terms:', 20, yPosition);
    yPosition += 6;
    doc.text('• Payment as per agreement', 20, yPosition);
    yPosition += 4;
    doc.text('• Delivery as specified', 20, yPosition);
    yPosition += 4;
    doc.text('• Quality as per standards', 20, yPosition);

    // Simple filename
    const timestamp = new Date().toISOString().slice(0, 10);
    doc.save(`PO_${timestamp}.pdf`);
    
    // Update material status in database to approved_for_funding
    const selectedList = projectMaterials.filter(m => selectedMaterials.has(m.id));
    const updatePromises = selectedList.map(async (material) => {
      const response = await fetch(`/api/project-materials`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: material.id,
          purchase_status: 'approved_for_funding'
        })
      });
      return response.json();
    });
    
    try {
      await Promise.all(updatePromises);
      // Refresh materials data
      const materialsResponse = await fetch(`/api/project-materials?project_id=${selectedProject}`);
      if (materialsResponse.ok) {
        const materialsResult = await materialsResponse.json();
        if (materialsResult.success) {
          const transformedMaterials = materialsResult.data.map((item: any) => {
            return {
              id: item.id,
              materialId: item.material_id,
              name: item.materials?.name || 'Unknown Material',
              category: item.materials?.category || 'Unknown',
              quantity: item.quantity,
              unit: item.unit,
              notes: item.notes || '',
              status: item.status,
              purchase_status: item.purchase_status || 'none',
              total_requested_qty: item.total_requested_qty || 0,
              remaining_qty: item.remaining_qty || item.quantity,
              vendor_id: item.vendor_id,
              addedAt: item.created_at,
              updatedAt: item.updated_at,
              source_type: item.source_type || 'manual',
              source_file_name: item.source_file_name,
              source_file_url: item.source_file_url,
              source_takeoff_id: item.source_takeoff_id
            };
          });
          setProjectMaterials(transformedMaterials);
        }
      }
    } catch (error) {
      console.error('Error updating material status:', error);
    }
    
    // Close dialog and reset
    setShowPODialog(false);
    setPoRates({});
    setPoTax({});
    setPoRemarks({});
    setSelectedMaterials(new Set());
    
    alert('PO generated and downloaded successfully!');
  };

  // Update project statuses based on actual BOQ/Schedule data
  const updateProjectStatuses = async (projects: any[]) => {
    const updatedProjects = await Promise.all(
      projects.map(async (project) => {
        let currentProgress = 0;
        let status = 'Planning';
        
        try {
          // Check if project has BOQ data
          const boqData = await getBOQByProjectId(project.id);
          const hasBOQ = boqData && boqData.length > 0;
          
          // Check if project has Schedule data  
          const scheduleData = await getScheduleByProjectId(project.id);
          const hasSchedule = scheduleData && scheduleData.length > 0;
          
          if (hasSchedule && scheduleData[0]?.schedule_tasks) {
            // Calculate progress from schedule tasks
            const tasks = scheduleData[0].schedule_tasks;
            if (tasks.length > 0) {
              const totalProgress = tasks.reduce((sum: number, task: any) => sum + (task.progress || 0), 0);
              currentProgress = Math.round(totalProgress / tasks.length);
            }
          } else if (hasBOQ) {
            // If has BOQ but no schedule, set basic progress
            currentProgress = 15;
          }
          
          // Determine status based on progress
          if (currentProgress >= 100) {
            status = 'Completed';
          } else if (currentProgress > 0) {
            status = 'Active';
          } else {
            status = 'Planning';
          }
          
        } catch (error) {
          console.log('Could not fetch project data for:', project.id);
        }
        
        return {
          ...project,
          currentProgress,
          status
        };
      })
    );
    
    setContractorProjects(updatedProjects);
  };

  // Handle URL parameters for direct navigation
  useEffect(() => {
    const tab = searchParams.get('tab');
    const projectParam = searchParams.get('project');
    
    // Handle main tab navigation (boq-quoting, awarded)
    if (tab && ['boq-quoting', 'awarded'].includes(tab)) {
      const newPath = tab === 'boq-quoting' ? 
        '/dashboard/contractor/projects/tendering' : 
        '/dashboard/contractor/projects/active';
      router.push(newPath);
    }
    
    // Handle project selection
    if (projectParam) {
      setSelectedProject(projectParam);
    }
    
    // Handle sub-tab navigation (overview, boq, schedule, etc.)
    const subTab = searchParams.get('subtab');
    if (subTab && ['overview', 'boq', 'schedule', 'materials', 'requested-materials', 'files'].includes(subTab)) {
      setActiveTab(subTab as 'overview' | 'boq' | 'schedule' | 'materials' | 'requested-materials' | 'files');
    }
  }, [searchParams]);

  // Clear selected project when switching tabs if it doesn't belong to current filter
  useEffect(() => {
    if (selectedProject && contractorProjects.length > 0) {
      const isProjectInCurrentTab = filteredProjects.some(p => p.id === selectedProject);
      if (!isProjectInCurrentTab) {
        setSelectedProject(null);
      }
    }
  }, [mainTab, selectedProject, filteredProjects, contractorProjects]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoaded) return;
    
    if (!user) {
      router.push('/sign-in');
      return;
    }
  }, [user, isLoaded, router]);

  // Fetch projects from database API
  useEffect(() => {
    const fetchProjects = async () => {
      if (!contractor?.id) return;
      
      setProjectsLoading(true);
      try {
        const response = await fetch(`/api/projects?contractor_id=${contractor.id}`);
        const result = await response.json();
        
        if (result.success) {
          // Use projects directly from database
          setContractorProjects(result.data.projects);
          
          // Update project statuses based on actual data
          updateProjectStatuses(result.data.projects);
        } else {
          console.error('Failed to fetch projects:', result.error);
          setContractorProjects([]);
        }
      } catch (error) {
        console.error('Error fetching projects:', error);
        setContractorProjects([]);
      } finally {
        setProjectsLoading(false);
      }
    };

    fetchProjects();
  }, [contractor?.id, refreshKey]);

  // Calculate enhanced metrics when project is selected
  useEffect(() => {
    const calculateProjectMetrics = async () => {
      if (!selectedProject) {
        setEnhancedProjectData(null);
        return;
      }

      const projectData = contractorProjects.find(p => p.id === selectedProject);
      if (!projectData) return;

      try {
        setMetricsLoading(true);
        
        // Import metrics calculation function
        const { calculateProjectMetrics } = await import('@/lib/contractor-metrics');
        const calculatedMetrics = await calculateProjectMetrics(selectedProject);
        
        // Merge project data with calculated metrics
        const enhanced = {
          ...projectData,
          // Use calculated values if available, otherwise fallback to defaults
          projectValue: calculatedMetrics.projectValue ?? projectData.projectValue,
          currentProgress: calculatedMetrics.currentProgress ?? (projectData as any).currentProgress,
          expectedEndDate: calculatedMetrics.endDate ?? projectData.expectedEndDate,
          // Add metadata to show data source
          _dataSource: {
            value: calculatedMetrics.projectValue ? 'database' : 'sheets',
            progress: calculatedMetrics.currentProgress !== undefined ? 'database' : 'sheets',
            endDate: calculatedMetrics.endDate ? 'database' : 'sheets'
          }
        };
        
        setEnhancedProjectData(enhanced);
        console.log('📊 Enhanced project metrics:', enhanced);
      } catch (error) {
        console.error('Failed to calculate project metrics:', error);
        setEnhancedProjectData(projectData);
      } finally {
        setMetricsLoading(false);
      }
    };

    calculateProjectMetrics();
  }, [selectedProject, contractorProjects, refreshKey]);

  // Check for existing BOQ and schedule data when project is selected
  useEffect(() => {
    const checkDocumentStatus = async () => {
      if (!selectedProject) {
        setHasBOQData(false);
        setHasScheduleData(false);
        setProjectMaterials([]);
        return;
      }

      try {
        setDocumentStatusLoading(true);
        
        // Import the functions needed to check for existing data
        const { getBOQByProjectId, getScheduleByProjectId } = await import('@/lib/supabase-boq');
        
        // Check for BOQ data
        const boqData = await getBOQByProjectId(selectedProject);
        setHasBOQData(boqData && boqData.length > 0);
        
        // Check for schedule data
        const scheduleData = await getScheduleByProjectId(selectedProject);
        setHasScheduleData(scheduleData && scheduleData.length > 0);
        
        // Load project materials with purchase status
        try {
          const materialsResponse = await fetch(`/api/project-materials?project_id=${selectedProject}`);
          if (materialsResponse.ok) {
            const materialsResult = await materialsResponse.json();
            if (materialsResult.success) {
              console.log('🔍 Raw materials data:', materialsResult.data);
              // Get all main materials to check purchase status
              const allMaterialsResponse = await fetch('/api/materials');
              const allMaterialsResult = await allMaterialsResponse.json();
              const allMaterials = allMaterialsResult.success ? allMaterialsResult.data : [];
              
              // Transform API data to match component format and include purchase status
              const transformedMaterials = materialsResult.data.map((item: any) => {
                return {
                  id: item.id,
                  materialId: item.material_id,
                  name: item.materials?.name || 'Unknown Material',
                  category: item.materials?.category || 'Unknown',
                  quantity: item.quantity,
                  unit: item.unit,
                  notes: item.notes || '',
                  status: item.status,
                  purchase_status: item.purchase_status || 'none',
                  total_requested_qty: item.total_requested_qty || 0,
                  remaining_qty: item.remaining_qty || item.quantity,
                  vendor_id: item.vendor_id,
                  addedAt: item.created_at,
                  updatedAt: item.updated_at,
                  // Source tracking fields
                  source_type: item.source_type || 'manual',
                  source_file_name: item.source_file_name,
                  source_file_url: item.source_file_url,
                  source_takeoff_id: item.source_takeoff_id
                };
              });
              setProjectMaterials(transformedMaterials);
            }
          }
        } catch (error) {
          console.error('Failed to fetch project materials:', error);
        }


        // Load project files
        try {
          const filesResponse = await fetch(`/api/project-files?project_id=${selectedProject}`);
          if (filesResponse.ok) {
            const filesResult = await filesResponse.json();
            if (filesResult.success) {
              setProjectFiles(filesResult.data);
            }
          }
        } catch (error) {
          console.error('Failed to fetch project files:', error);
        }

        // Check for existing material mappings
        try {
          const mappingsResponse = await fetch(`/api/material-mappings?project_id=${selectedProject}`);
          if (mappingsResponse.ok) {
            const mappingsResult = await mappingsResponse.json();
            if (mappingsResult.success && mappingsResult.data.length > 0) {
              setMaterialMappings(mappingsResult.data);
              setMaterialsAnalyzed(true);
            }
          }
        } catch (error) {
          console.error('Failed to fetch material mappings:', error);
        }
        
      } catch (error) {
        console.error('Failed to check document status:', error);
        setHasBOQData(false);
        setHasScheduleData(false);
      } finally {
        setDocumentStatusLoading(false);
      }
    };

    checkDocumentStatus();
  }, [selectedProject, refreshKey]);

  // Close material search dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.material-search-container')) {
        setMaterialSearchOpen(false);
      }
    };

    if (materialSearchOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [materialSearchOpen]);

  // Function to analyze BOQ with AI
  const analyzeBOQForMaterials = async () => {
    if (!selectedProject) return;
    
    setMaterialsAnalyzing(true);
    try {
      console.log('🤖 Starting BOQ analysis for project:', selectedProject);
      
      const response = await fetch('/api/analyze-boq', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: selectedProject
        }),
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ BOQ analysis completed:', result.stats);
        setMaterialsAnalyzed(true);
        setMaterialMappings(result.mappings || []);
        // Optionally show success message or update UI
        alert(`Success! Analyzed ${result.stats.boqItemsAnalyzed} BOQ items and identified ${result.stats.materialsIdentified} materials.`);
      } else {
        console.error('❌ BOQ analysis failed:', result.error);
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('💥 Error calling BOQ analysis API:', error);
      alert('Failed to analyze BOQ. Please try again.');
    } finally {
      setMaterialsAnalyzing(false);
    }
  };

  // State for available materials from API
  const [availableMaterials, setAvailableMaterials] = useState<any[]>([]);

  // Fetch available materials from API
  useEffect(() => {
    const fetchMaterials = async () => {
      try {
        const response = await fetch('/api/materials');
        const result = await response.json();
        
        if (result.success) {
          // Transform API materials to match expected format
          const transformedMaterials = result.data.map((material: any) => ({
            id: material.id,
            name: material.name,
            category: material.category,
            unit: material.unit
          }));
          setAvailableMaterials(transformedMaterials);
        } else {
          console.error('Failed to fetch materials:', result.error);
        }
      } catch (error) {
        console.error('Error fetching materials:', error);
      }
    };

    fetchMaterials();
  }, []);


  // Filter materials based on search term
  const filteredMaterials = availableMaterials.filter(material =>
    material.name.toLowerCase().includes(materialSearchTerm.toLowerCase()) ||
    material.category.toLowerCase().includes(materialSearchTerm.toLowerCase())
  );

  // Add material to project
  const addMaterialToProject = async () => {
    if (!materialForm.material || !materialForm.quantity || !selectedProject) {
      alert('Please select a material and enter quantity');
      return;
    }

    const selectedMaterial = availableMaterials.find(m => m.id === materialForm.material);
    if (!selectedMaterial) return;

    try {
      const response = await fetch('/api/project-materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: selectedProject,
          material_id: materialForm.material,
          quantity: parseFloat(materialForm.quantity),
          unit: materialForm.unit,
          notes: materialForm.notes
        })
      });

      const result = await response.json();

      if (result.success) {
        // Transform and add to local state
        const newMaterial = {
          id: result.data.id,
          materialId: result.data.material_id,
          name: result.data.materials?.name || selectedMaterial.name,
          category: result.data.materials?.category || selectedMaterial.category,
          quantity: result.data.quantity,
          unit: result.data.unit,
          notes: result.data.notes || '',
          status: result.data.status,
          addedAt: result.data.created_at,
          updatedAt: result.data.updated_at
        };

        setProjectMaterials(prev => [...prev, newMaterial]);
        
        // Reset form
        setMaterialForm({
          material: '',
          materialName: '',
          quantity: '',
          unit: 'bags',
          notes: ''
        });
        setMaterialSearchTerm('');
        setMaterialSearchOpen(false);
        
        alert('Material added successfully!');
      } else {
        alert(result.error || 'Failed to add material');
      }
    } catch (error) {
      console.error('Error adding material:', error);
      alert('Error adding material to project');
    }
  };

  // Fetch vendors for purchase requests
  useEffect(() => {
    if (contractor?.id) {
      fetchVendors();
      fetchClients();
    }
  }, [contractor?.id]);

  const fetchVendors = async () => {
    if (!contractor?.id) return;
    
    try {
      const response = await fetch(`/api/vendors?contractor_id=${contractor.id}`);
      if (response.ok) {
        const data = await response.json();
        setVendors(data.vendors || []);
      }
    } catch (error) {
      console.error('Error fetching vendors:', error);
      setVendors([]);
    }
  };

  const fetchClients = async () => {
    try {
      if (!contractor?.id) return;
      const response = await fetch(`/api/clients?contractor_id=${contractor.id}`);
      if (response.ok) {
        const data = await response.json();
        setClients(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  // Convert project to awarded status
  const convertProjectToAwarded = async () => {
    if (!selectedProject || !conversionForm.estimated_value) return;
    
    try {
      const response = await fetch(`/api/projects/${selectedProject}/convert`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estimated_value: parseFloat(conversionForm.estimated_value),
          po_number: conversionForm.po_number,
          funding_required: conversionForm.funding_required ? parseFloat(conversionForm.funding_required) : null,
          funding_status: conversionForm.funding_status,
          project_status: 'awarded'
        })
      });
      
      if (response.ok) {
        setRefreshKey(prev => prev + 1); // Refresh projects list
        setConversionForm({ estimated_value: '', po_number: '', funding_required: '', funding_status: 'pending' });
        setShowConversionDialog(false);
        // Switch to awarded tab to see the converted project
        router.push('/dashboard/contractor/projects/active');
        alert('Project successfully converted to awarded status!');
      } else {
        alert('Failed to convert project');
      }
    } catch (error) {
      console.error('Failed to convert project:', error);
      alert('Failed to convert project');
    }
  };

  // Create new awarded project function
  const createAwardedProject = async () => {
    if (!awardedProjectForm.project_name || !awardedProjectForm.client_id || !awardedProjectForm.estimated_value || !contractor?.id) return;
    
    try {
      // Find the selected client to get the client name
      const selectedClient = clients.find(client => client.id === awardedProjectForm.client_id);
      if (!selectedClient) return;

      // Create FormData for the API (to support file upload)
      const formData = new FormData();
      formData.append('contractor_id', contractor.id);
      formData.append('project_name', awardedProjectForm.project_name);
      formData.append('client_name', selectedClient.name);
      formData.append('project_value', awardedProjectForm.estimated_value);
      formData.append('po_wo_number', awardedProjectForm.po_number);
      formData.append('funding_status', awardedProjectForm.funding_status);
      formData.append('project_status', 'awarded');
      
      if (awardedProjectForm.funding_required) {
        formData.append('funding_required', awardedProjectForm.funding_required);
      }
      
      if (awardedProjectForm.po_file) {
        formData.append('po_file', awardedProjectForm.po_file);
      }

      const response = await fetch('/api/projects', {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        const result = await response.json();
        setRefreshKey(prev => prev + 1); // Refresh projects list
        setAwardedProjectForm({
          project_name: '',
          client_id: '',
          estimated_value: '',
          po_number: '',
          funding_required: '',
          funding_status: 'pending',
          po_file: null
        });
        setShowCreateAwardedProject(false);
        // Optionally select the new project
        setSelectedProject(result.data?.id || result.data?.project?.id);
        alert('Awarded project created successfully!');
      } else {
        alert('Failed to create awarded project');
      }
    } catch (error) {
      console.error('Failed to create awarded project:', error);
      alert('Failed to create awarded project');
    }
  };


  // Generate PDF for vendor
  const generatePurchasePDF = async (material: any) => {
    try {
      // TODO: Implement PDF generation API
      alert('PDF generation feature coming soon!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF');
    }
  };

  // Upload Proforma Invoice
  const uploadPI = async (material: any) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.jpg,.jpeg,.png';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('material_id', material.id);
        formData.append('type', 'proforma_invoice');

        // TODO: Implement file upload API for PI
        alert('PI upload feature coming soon!');
      } catch (error) {
        console.error('Error uploading PI:', error);
        alert('Error uploading proforma invoice');
      }
    };
    input.click();
  };

  // Submit for admin review
  const submitForReview = async (material: any) => {
    try {
      const response = await fetch('/api/materials/submit-for-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          material_id: material.id
        })
      });

      const result = await response.json();

      if (result.success) {
        alert('Material submitted for admin review successfully!');
        // Material submission completed
      } else {
        alert(result.error || 'Failed to submit for review');
      }
    } catch (error) {
      console.error('Error submitting for review:', error);
      alert('Error submitting for admin review');
    }
  };

  // Handle purchase request
  const handleRequestPurchase = (material: any) => {
    setSelectedMaterialForPurchase(material);
    setPurchaseForm({
      vendorId: '',
      requestedQuantity: material.quantity.toString() // Pre-fill with available quantity
    });
    setShowPurchaseDialog(true);
  };

  // Remove material from project
  const removeMaterialFromProject = async (materialId: string) => {
    try {
      const response = await fetch(`/api/project-materials?id=${materialId}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (result.success) {
        setProjectMaterials(prev => prev.filter(m => m.id !== materialId));
        alert('Material removed successfully!');
      } else {
        alert(result.error || 'Failed to remove material');
      }
    } catch (error) {
      console.error('Error removing material:', error);
      alert('Error removing material from project');
    }
  };

  // Update material status

  // Upload file to project
  const uploadFile = async () => {
    if (!uploadForm.file || !uploadForm.category || !selectedProject) {
      alert('Please select a file and category');
      return;
    }

    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadForm.file);
      formData.append('project_id', selectedProject);
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
          window.open(downloadUrl, '_blank');
        }
      } else {
        alert(result.error || 'Failed to generate download link');
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
          setUseAnalysisMode(true);
          setShowPDFViewer(true);
        } else {
          alert('Quantity takeoff is only available for PDF drawings');
        }
      } else {
        alert(result.error || 'Failed to generate download link');
      }
    } catch (error) {
      console.error('Error opening takeoff:', error);
      alert('Error opening takeoff');
    }
  };

  // Get status display info

  // Show loading state while Clerk loads OR contractor data loads OR projects load
  if (!isLoaded || contractorLoading || projectsLoading) {
    return (
      <div className="min-h-screen bg-neutral-darker">
        <LoadingSpinner 
          title={!isLoaded ? "Authenticating Access" : projectsLoading ? "Loading Projects" : "Loading Project Portfolio"}
          description={!isLoaded ? 
            "Verifying your contractor credentials and setting up secure access" : 
            projectsLoading ?
            "Fetching your projects from the database..." :
            "Retrieving your active projects, milestones, and progress tracking data"
          }
          icon="📋"
          fullScreen={true}
          steps={!isLoaded ? [
            "Validating contractor account...",
            "Setting up secure session...",
            "Preparing project workspace..."
          ] : [
            "Loading active projects...",
            "Fetching milestone data...",
            "Calculating progress metrics..."
          ]}
        />
      </div>
    );
  }
  
  // If no contractor found AND loading is complete, show access denied
  if (!contractor && !contractorLoading) {
    return (
      <div className="min-h-screen bg-neutral-darker flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🚫</div>
          <h2 className="text-xl font-bold text-primary mb-2">Access Denied</h2>
          <p className="text-secondary mb-4">
            No contractor account found for your email address.
          </p>
          <Button onClick={() => window.location.href = '/dashboard/contractor'} variant="primary" size="sm">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const selectedProjectData = enhancedProjectData || (selectedProject ? contractorProjects.find(p => p.id === selectedProject) : null);
  
  // Handle both data structures for selected project
  const isSelectedGoogleSheetsProject = selectedProjectData && 'clientName' in selectedProjectData;
  const selectedClientName = isSelectedGoogleSheetsProject ? 
    (selectedProjectData as any).clientName : 
    selectedProjectData?.client_name || 'Unknown Client';
  
  const selectedProjectProgress = selectedProjectData?.currentProgress ?? 
    (isSelectedGoogleSheetsProject ? (selectedProjectData as any).currentProgress : (selectedProjectData as any)?.progress || 0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-success/10 text-success';
      case 'Planning': return 'bg-accent-blue/10 text-accent-blue';
      case 'On Hold': return 'bg-warning/10 text-warning';
      case 'Delayed': return 'bg-error/10 text-error';
      case 'Completing': return 'bg-success/10 text-success';
      case 'Completed': return 'bg-accent-amber/10 text-accent-amber';
      default: return 'bg-neutral-medium text-secondary';
    }
  };

  const getMilestoneStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'text-success';
      case 'In Progress': return 'text-accent-blue';
      case 'Delayed': return 'text-warning';
      case 'Pending': return 'text-secondary';
      default: return 'text-secondary';
    }
  };

  return (
    <ContractorDashboardLayout activeTab="projects">
      <div className="p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">My Projects</h1>
          <p className="text-secondary">
            Manage and track progress of your active projects
          </p>
        </div>

        {/* Main Tabs Navigation */}
        <div className="mb-6">
          <div className="border-b border-neutral-medium">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'awarded', name: 'Awarded Projects', description: 'Active & completed projects' },
                { id: 'boq-quoting', name: 'Tendering & Quotes', description: 'Create quotes and submit tenders' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    const newPath = tab.id === 'boq-quoting' ? 
                      '/dashboard/contractor/projects/tendering' : 
                      '/dashboard/contractor/projects/active';
                    router.push(newPath);
                  }}
                  className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                    mainTab === tab.id
                      ? 'border-accent-blue text-accent-blue'
                      : 'border-transparent text-secondary hover:text-primary hover:border-neutral-light'
                  }`}
                >
                  <div className="flex flex-col items-start">
                    <span>{tab.name}</span>
                    <span className="text-xs opacity-70">{tab.description}</span>
                  </div>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Project Stats - Different for each tab */}
        <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-6 mb-8">
          {mainTab === 'boq-quoting' ? (
            <>
              <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium">
                <div className="text-accent-amber text-sm font-mono mb-2">DRAFT PROJECTS</div>
                <div className="text-2xl font-bold text-primary mb-1">
                  {contractorProjects.filter(p => p.project_status === 'draft').length}
                </div>
                <div className="text-xs text-secondary">Ready for BOQ & quoting</div>
              </div>
              
              <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium">
                <div className="text-accent-amber text-sm font-mono mb-2">WITH BOQ</div>
                <div className="text-2xl font-bold text-primary mb-1">
                  {contractorProjects.filter(p => p.project_status === 'draft' && p.estimated_value > 0).length}
                </div>
                <div className="text-xs text-success">Ready for quoting</div>
              </div>
              
              <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium">
                <div className="text-accent-amber text-sm font-mono mb-2">QUOTED</div>
                <div className="text-2xl font-bold text-primary mb-1">0</div>
                <div className="text-xs text-secondary">Awaiting client response</div>
              </div>
              
              <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium">
                <div className="text-accent-amber text-sm font-mono mb-2">PIPELINE VALUE</div>
                <div className="text-2xl font-bold text-primary mb-1">
                  {formatCurrency(contractorProjects.filter(p => p.project_status === 'draft').reduce((sum, p) => sum + (p.estimated_value || 0), 0))}
                </div>
                <div className="text-xs text-secondary">Potential project value</div>
              </div>
            </>
          ) : (
            <>
              <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium">
                <div className="text-accent-amber text-sm font-mono mb-2">AWARDED PROJECTS</div>
                <div className="text-2xl font-bold text-primary mb-1">
                  {contractorProjects.filter(p => p.project_status === 'awarded' || p.project_status === 'finalized' || (!p.project_status && p.project_status !== 'draft')).length}
                </div>
                <div className="text-xs text-secondary">Total awarded</div>
              </div>
              
              <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium">
                <div className="text-accent-amber text-sm font-mono mb-2">ACTIVE PROJECTS</div>
                <div className="text-2xl font-bold text-primary mb-1">
                  {contractorProjects.filter(p => (p.project_status === 'awarded' || p.project_status === 'finalized') && p.status === 'Active').length}
                </div>
                <div className="text-xs text-success">Currently running</div>
              </div>
              
              <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium">
                <div className="text-accent-amber text-sm font-mono mb-2">AVG PROGRESS</div>
                <div className="text-2xl font-bold text-accent-amber mb-1">
                  {(() => {
                    const awardedProjects = contractorProjects.filter(p => p.project_status === 'awarded' || p.project_status === 'finalized' || !p.project_status);
                    return awardedProjects.length > 0 ? 
                      Math.round(awardedProjects.reduce((sum, p) => {
                        const progress = 'currentProgress' in p ? (p as any).currentProgress : (p as any).progress || 0;
                        return sum + progress;
                      }, 0) / awardedProjects.length) : 0;
                  })()}%
                </div>
                <div className="text-xs text-secondary">Across awarded projects</div>
              </div>
              
              <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium">
                <div className="text-accent-amber text-sm font-mono mb-2">TOTAL VALUE</div>
                <div className="text-2xl font-bold text-primary mb-1">
                  {formatCurrency(contractorProjects.filter(p => p.project_status === 'awarded' || p.project_status === 'finalized' || !p.project_status).reduce((sum, p) => sum + (p.estimated_value || 0), 0))}
                </div>
                <div className="text-xs text-secondary">Portfolio value</div>
              </div>
            </>
          )}
        </div>

        {/* BOQ & Quoting Tab - Create Project Form */}
        {mainTab === 'boq-quoting' && (
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-primary">Tendering & Quotes</h2>
              <button
                onClick={() => setShowCreateProject(true)}
                className="px-4 py-2 bg-accent-blue text-white rounded-lg hover:bg-accent-blue/90 transition-colors"
              >
                + Create New Project
              </button>
            </div>
            
            {showCreateProject && (
              <div className="bg-neutral-dark border border-neutral-medium rounded-lg p-6 mb-6">
                <h3 className="text-lg font-medium text-primary mb-4">Create New Project</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-primary mb-2">Project Name</label>
                    <input
                      type="text"
                      value={newProject.project_name}
                      onChange={(e) => setNewProject(prev => ({ ...prev, project_name: e.target.value }))}
                      className="w-full px-3 py-2 border border-neutral-medium rounded-lg bg-neutral-dark text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue"
                      placeholder="Enter project name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary mb-2">Client</label>
                    <select
                      value={newProject.client_id}
                      onChange={(e) => setNewProject(prev => ({ ...prev, client_id: e.target.value }))}
                      className="w-full px-3 py-2 border border-neutral-medium rounded-lg bg-neutral-dark text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue"
                    >
                      <option value="">Select a client</option>
                      {clients.filter(client => client.status === 'active').map(client => (
                        <option key={client.id} value={client.id}>
                          {client.name}
                        </option>
                      ))}
                    </select>
                    {clients.length === 0 && (
                      <p className="text-sm text-secondary mt-1">
                        No clients found. <a href="/dashboard/contractor/network" className="text-accent-blue hover:underline">Add clients in Network tab</a>
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary mb-2">Tender Submission Date</label>
                    <input
                      type="date"
                      value={newProject.tender_submission_date}
                      onChange={(e) => setNewProject(prev => ({ ...prev, tender_submission_date: e.target.value }))}
                      className="w-full px-3 py-2 border border-neutral-medium rounded-lg bg-neutral-dark text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-primary mb-2">Description (Optional)</label>
                    <textarea
                      value={newProject.description}
                      onChange={(e) => setNewProject(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-3 py-2 border border-neutral-medium rounded-lg bg-neutral-dark text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue"
                      rows={3}
                      placeholder="Brief project description"
                    />
                  </div>
                </div>
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={createProject}
                    disabled={!newProject.project_name || !newProject.client_id}
                    className="px-4 py-2 bg-accent-blue text-white rounded-lg hover:bg-accent-blue/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Create Project
                  </button>
                  <button
                    onClick={() => setShowCreateProject(false)}
                    className="px-4 py-2 border border-neutral-medium text-primary rounded-lg hover:bg-neutral-medium/20 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Awarded Projects Tab - Create Project Form */}
        {mainTab === 'awarded' && (
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-primary">Awarded Projects</h2>
              <button
                onClick={() => setShowCreateAwardedProject(true)}
                className="px-4 py-2 bg-success text-white rounded-lg hover:bg-success/90 transition-colors"
              >
                + Create Awarded Project
              </button>
            </div>
            
            {showCreateAwardedProject && (
              <div className="bg-neutral-dark border border-neutral-medium rounded-lg p-6 mb-6">
                <h3 className="text-lg font-medium text-primary mb-4">Create New Awarded Project</h3>
                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">Project Name *</label>
                      <input
                        type="text"
                        value={awardedProjectForm.project_name}
                        onChange={(e) => setAwardedProjectForm(prev => ({ ...prev, project_name: e.target.value }))}
                        className="w-full px-3 py-2 border border-neutral-medium rounded-lg bg-neutral-dark text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue"
                        placeholder="Enter project name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">Client *</label>
                      <select
                        value={awardedProjectForm.client_id}
                        onChange={(e) => setAwardedProjectForm(prev => ({ ...prev, client_id: e.target.value }))}
                        className="w-full px-3 py-2 border border-neutral-medium rounded-lg bg-neutral-dark text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue"
                      >
                        <option value="">Select a client</option>
                        {clients.filter(client => client.status === 'active').map(client => (
                          <option key={client.id} value={client.id}>
                            {client.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">Project Value *</label>
                      <input
                        type="number"
                        value={awardedProjectForm.estimated_value}
                        onChange={(e) => setAwardedProjectForm(prev => ({ ...prev, estimated_value: e.target.value }))}
                        className="w-full px-3 py-2 border border-neutral-medium rounded-lg bg-neutral-dark text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue"
                        placeholder="Enter project value"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">PO/WO Number</label>
                      <input
                        type="text"
                        value={awardedProjectForm.po_number}
                        onChange={(e) => setAwardedProjectForm(prev => ({ ...prev, po_number: e.target.value }))}
                        className="w-full px-3 py-2 border border-neutral-medium rounded-lg bg-neutral-dark text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue"
                        placeholder="PO-2024-001"
                      />
                    </div>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">Funding Required</label>
                      <input
                        type="number"
                        value={awardedProjectForm.funding_required}
                        onChange={(e) => setAwardedProjectForm(prev => ({ ...prev, funding_required: e.target.value }))}
                        className="w-full px-3 py-2 border border-neutral-medium rounded-lg bg-neutral-dark text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue"
                        placeholder="Enter funding amount"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">Funding Status</label>
                      <select
                        value={awardedProjectForm.funding_status}
                        onChange={(e) => setAwardedProjectForm(prev => ({ ...prev, funding_status: e.target.value }))}
                        className="w-full px-3 py-2 border border-neutral-medium rounded-lg bg-neutral-dark text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue"
                      >
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="received">Received</option>
                        <option value="not_required">Not Required</option>
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-primary mb-2">PO Document (Optional)</label>
                    <input
                      type="file"
                      onChange={(e) => setAwardedProjectForm(prev => ({ ...prev, po_file: e.target.files?.[0] || null }))}
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.dwg"
                      className="w-full px-3 py-2 border border-neutral-medium rounded-lg bg-neutral-dark text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue"
                    />
                    <p className="text-xs text-secondary mt-1">
                      Supported formats: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG, GIF, DWG (Max: 20MB)
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={createAwardedProject}
                    disabled={!awardedProjectForm.project_name || !awardedProjectForm.client_id || !awardedProjectForm.estimated_value}
                    className="px-4 py-2 bg-success text-white rounded-lg hover:bg-success/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Create Awarded Project
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateAwardedProject(false);
                      setAwardedProjectForm({
                        project_name: '',
                        client_id: '',
                        estimated_value: '',
                        po_number: '',
                        funding_required: '',
                        funding_status: 'pending',
                        po_file: null
                      });
                    }}
                    className="px-4 py-2 border border-neutral-medium text-primary rounded-lg hover:bg-neutral-medium/20 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Project Cards Grid */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-primary mb-4">
            Your Projects
          </label>
          
          {filteredProjects.length === 0 ? (
            <div className="p-8 bg-neutral-medium/20 rounded-lg text-center">
              <p className="text-secondary">
                {mainTab === 'boq-quoting' ? 'No draft projects found. Create a new project to get started.' :
                 'No awarded projects yet.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProjects.map((project) => {
                const isGoogleSheetsProject = 'clientName' in project;
                const clientName = isGoogleSheetsProject ? (project as any).clientName : (project.client_name || 'Unknown Client');
                const projectStatus = project.project_status || project.status || 'draft';
                
                return (
                  <div
                    key={project.id}
                    onClick={() => {
                      // Open project in new tab
                      console.log('Clicking project:', project.id, project.project_name);
                      const url = `/dashboard/contractor/projects/${project.id}`;
                      console.log('Opening URL:', url);
                      window.open(url, '_blank');
                    }}
                    className="bg-neutral-dark border border-neutral-medium rounded-lg p-4 hover:border-accent-amber transition-colors cursor-pointer group"
                  >
                    {/* Project Name */}
                    <h3 className="text-lg font-semibold text-primary mb-2 group-hover:text-accent-amber transition-colors">
                      {project.project_name}
                    </h3>
                    
                    {/* Client Name */}
                    <p className="text-secondary mb-3">
                      Client: {clientName}
                    </p>
                    
                    {/* Status Badge */}
                    <div className="flex items-center justify-between mb-4">
                      <span className={`text-xs px-2 py-1 rounded font-medium ${
                        projectStatus === 'draft' 
                          ? 'bg-yellow-500/20 text-yellow-400' 
                          : projectStatus === 'active' 
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {projectStatus.toUpperCase()}
                      </span>
                    </div>
                    
                    {/* Funding Info - actual values to be loaded */}
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-secondary">Funded:</span>
                        <span className="text-neutral-medium">-</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-secondary">To Repay:</span>
                        <span className="text-neutral-medium">-</span>
                      </div>
                    </div>
                    
                    {/* Click Indicator */}
                    <div className="mt-3 text-xs text-secondary group-hover:text-accent-amber transition-colors">
                      Click to open project →
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </ContractorDashboardLayout>
    );
}

export default function ContractorProjects(): React.ReactElement {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ContractorProjectsContent />
    </Suspense>
  );
}
