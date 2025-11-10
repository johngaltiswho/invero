'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, Suspense } from 'react';
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
  const [activeTab, setActiveTab] = useState<'overview' | 'boq' | 'schedule' | 'materials' | 'requested-materials' | 'files'>('overview');
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
  const [requestedMaterials, setRequestedMaterials] = useState<any[]>([]);
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
  
  // Vendor state for purchase requests
  const [vendors, setVendors] = useState<any[]>([]);
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
                  purchase_status: item.purchase_status || 'none', // Use purchase status from project materials
                  total_requested_qty: item.total_requested_qty || 0,
                  remaining_qty: item.remaining_qty || item.quantity,
                  vendor_id: item.vendor_id,
                  addedAt: item.created_at,
                  updatedAt: item.updated_at
                };
              });
              setProjectMaterials(transformedMaterials);
            }
          }
        } catch (error) {
          console.error('Failed to fetch project materials:', error);
        }

        // Load requested materials
        fetchRequestedMaterials();

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
    try {
      const response = await fetch(`/api/vendors?contractor_id=${contractor?.id}`);
      if (response.ok) {
        const data = await response.json();
        setVendors(data.vendors || []);
      }
    } catch (error) {
      console.error('Error fetching vendors:', error);
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

  // Fetch purchase orders for the project
  const fetchRequestedMaterials = async () => {
    if (!selectedProject) return;
    
    try {
      console.log('🔥 Fetching requested materials for project:', selectedProject);
      // Fetch project materials with purchase_status = 'requested'
      const response = await fetch(`/api/project-materials?project_id=${selectedProject}&purchase_status=requested`);
      console.log('🔥 Requested materials response status:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('🔥 Requested materials result:', result);
        if (result.success) {
          setRequestedMaterials(result.data || []);
        } else {
          console.error('🔥 Requested materials API error:', result.error);
        }
      } else {
        console.error('🔥 Requested materials response not ok:', response.status);
      }
    } catch (error) {
      console.error('Error fetching requested materials:', error);
      setRequestedMaterials([]);
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
        fetchRequestedMaterials(); // Refresh the list
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
  const updateMaterialStatus = async (materialId: string, newStatus: 'pending' | 'platform_order' | 'external_purchase' | 'delivered' | 'used') => {
    try {
      const response = await fetch('/api/project-materials', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: materialId,
          status: newStatus
        })
      });

      const result = await response.json();

      if (result.success) {
        setProjectMaterials(prev => 
          prev.map(material => 
            material.id === materialId 
              ? { 
                  ...material, 
                  status: newStatus, 
                  updatedAt: result.data.updated_at || new Date().toISOString() 
                }
              : material
          )
        );
      } else {
        alert(result.error || 'Failed to update material status');
      }
    } catch (error) {
      console.error('Error updating material status:', error);
      alert('Error updating material status');
    }
  };

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
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending':
        return { label: 'Pending', color: 'bg-gray-500/20 text-gray-400', icon: '' };
      case 'platform_order':
        return { label: 'Platform Order', color: 'bg-blue-500/20 text-blue-400', icon: '' };
      case 'external_purchase':
        return { label: 'External Purchase', color: 'bg-purple-500/20 text-purple-400', icon: '' };
      case 'delivered':
        return { label: 'Delivered', color: 'bg-green-500/20 text-green-400', icon: '' };
      case 'used':
        return { label: 'Used', color: 'bg-accent-orange/20 text-accent-orange', icon: '' };
      default:
        return { label: 'Unknown', color: 'bg-gray-500/20 text-gray-400', icon: '' };
    }
  };

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
                { id: 'boq-quoting', name: 'Tendering & Quotes', description: 'Create quotes and submit tenders' },
                { id: 'awarded', name: 'Awarded Projects', description: 'Active & completed projects' }
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

        {/* Project Selector - Always a dropdown */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-primary mb-2">
            Select Project
          </label>
          <select
            value={selectedProject || ''}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="w-full bg-neutral-dark border border-neutral-medium rounded-lg px-4 py-3 text-primary focus:border-accent-amber focus:outline-none"
          >
            <option value="">Choose a project...</option>
            {filteredProjects.map((project) => {
              const isGoogleSheetsProject = 'clientName' in project;
              const clientName = isGoogleSheetsProject ? (project as any).clientName : (project.client_name || 'Unknown Client');
              return (
                <option key={project.id} value={project.id}>
                  {project.project_name} - {clientName}
                </option>
              );
            })}
          </select>
          
          {filteredProjects.length === 0 && (
            <div className="mt-4 p-4 bg-neutral-medium/20 rounded-lg text-center">
              <p className="text-secondary">
                {mainTab === 'boq-quoting' ? 'No draft projects found. Create a new project to get started.' :
                 'No awarded projects yet.'}
              </p>
            </div>
          )}
        </div>

        {/* Project Details - Always full width */}
        <div className="w-full">
            {selectedProjectData ? (
              <div className="bg-neutral-dark rounded-lg border border-neutral-medium">
                <div className="p-6 border-b border-neutral-medium">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h2 className="text-xl font-bold text-primary mb-2">
                        {selectedProjectData.project_name}
                      </h2>
                      <div className="flex items-center space-x-4 text-sm text-secondary">
                        <span>Client: {selectedClientName}</span>
                        <span>•</span>
                        <span>Project ID: {selectedProjectData.id}</span>
                        {selectedProjectData.project_status && (
                          <>
                            <span>•</span>
                            <span className={`px-2 py-1 rounded text-xs ${
                              selectedProjectData.project_status === 'draft' 
                                ? 'bg-accent-amber/20 text-accent-amber' 
                                : 'bg-success/20 text-success'
                            }`}>
                              {selectedProjectData.project_status}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    
                    {/* Convert to Awarded Project Button - Only show for draft projects in BOQ & Quoting tab */}
                    {mainTab === 'boq-quoting' && selectedProjectData.project_status === 'draft' && (
                      <button
                        onClick={() => setShowConversionDialog(true)}
                        className="px-4 py-2 bg-success text-white rounded-lg hover:bg-success/90 transition-colors text-sm font-medium"
                      >
                        Convert to Awarded Project
                      </button>
                    )}
                  </div>

                  {/* Tab Navigation */}
                  <div className="flex space-x-1 mb-4">
                    <button
                      onClick={() => setActiveTab('overview')}
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                        activeTab === 'overview'
                          ? 'bg-accent-amber text-neutral-dark'
                          : 'text-secondary hover:text-primary hover:bg-neutral-medium'
                      }`}
                    >
                      Overview
                    </button>
                    <button
                      onClick={() => setActiveTab('boq')}
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                        activeTab === 'boq'
                          ? 'bg-accent-amber text-neutral-dark'
                          : 'text-secondary hover:text-primary hover:bg-neutral-medium'
                      }`}
                    >
                      {mainTab === 'boq-quoting' ? 'Quote' : 'BOQ'}
                    </button>
                    <button
                      onClick={() => setActiveTab('schedule')}
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                        activeTab === 'schedule'
                          ? 'bg-accent-amber text-neutral-dark'
                          : 'text-secondary hover:text-primary hover:bg-neutral-medium'
                      }`}
                    >
                      Schedule
                    </button>
                    <button
                      onClick={() => setActiveTab('materials')}
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                        activeTab === 'materials'
                          ? 'bg-accent-amber text-neutral-dark'
                          : 'text-secondary hover:text-primary hover:bg-neutral-medium'
                      }`}
                    >
                      Materials
                    </button>
                    {mainTab === 'awarded' && (
                      <button
                        onClick={() => setActiveTab('requested-materials')}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                          activeTab === 'requested-materials'
                            ? 'bg-accent-amber text-neutral-dark'
                            : 'text-secondary hover:text-primary hover:bg-neutral-medium'
                        }`}
                      >
                        Requested Materials
                      </button>
                    )}
                    <button
                      onClick={() => setActiveTab('files')}
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                        activeTab === 'files'
                          ? 'bg-accent-amber text-neutral-dark'
                          : 'text-secondary hover:text-primary hover:bg-neutral-medium'
                      }`}
                    >
                      Files
                    </button>
                  </div>

                  {/* Project Metrics - only show on overview tab */}
                  {activeTab === 'overview' && (
                    <>
                      {metricsLoading && (
                        <div className="flex items-center justify-center py-4 text-accent-amber">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-accent-amber mr-2"></div>
                          <span className="text-sm">Calculating metrics from BOQ/Schedule...</span>
                        </div>
                      )}
                      <div className="grid md:grid-cols-4 gap-6">
                        <div>
                          <div className="text-xs text-secondary mb-1">Project Value</div>
                          <div className="text-lg font-bold text-primary">
                            {metricsLoading ? '...' : formatCurrency(selectedProjectData.estimated_value)}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-secondary mb-1">Current Progress</div>
                          <div className="text-lg font-bold text-accent-amber">
                            {metricsLoading ? '...' : `${selectedProjectProgress}%`}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-secondary mb-1">End Date</div>
                          <div className="text-lg font-bold text-primary">
                            {metricsLoading ? '...' : formatDate(selectedProjectData.expectedEndDate)}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-secondary mb-1">Status</div>
                          <div className={`text-sm font-medium px-2 py-1 rounded inline-block ${getStatusColor(selectedProjectData.status)}`}>
                            {selectedProjectData.status}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div className="p-6">
                  {/* Overview Tab Content */}
                  {activeTab === 'overview' && (
                    <>
                      {/* Project Description */}
                      {!isSelectedGoogleSheetsProject && (selectedProjectData as any)?.description && (
                        <div className="mb-6">
                          <h3 className="text-sm font-semibold text-primary mb-2">Project Description</h3>
                          <p className="text-sm text-secondary leading-relaxed">
                            {(selectedProjectData as any).description}
                          </p>
                        </div>
                      )}

                      {/* Project Documents Status */}
                      <div className="mb-6">
                        <h3 className="text-lg font-bold text-primary mb-4">Project Documents</h3>
                        <div className="grid grid-cols-3 gap-4">
                          {/* BOQ Status Card */}
                          <div className="bg-neutral-darker p-4 rounded-lg border border-neutral-medium">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                <span className="text-lg">📊</span>
                                <h4 className="font-semibold text-primary">Bill of Quantities</h4>
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
                            <p className="text-sm text-secondary mb-3">
                              {hasBOQData ? 'View and manage project costs' : 'Upload project costs and quantities'}
                            </p>
                            <button
                              onClick={() => setActiveTab('boq')}
                              className="text-xs font-medium text-accent-amber hover:text-accent-amber/80 flex items-center space-x-1"
                            >
                              <span>
                                {hasBOQData ? 
                                  (mainTab === 'boq-quoting' ? 'View Quote' : 'View BOQ') : 
                                  (mainTab === 'boq-quoting' ? '+ Add Quote' : '+ Add BOQ')
                                }
                              </span>
                              <span>→</span>
                            </button>
                          </div>

                          {/* Schedule Status Card */}
                          <div className="bg-neutral-darker p-4 rounded-lg border border-neutral-medium">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                <h4 className="font-semibold text-primary">Project Schedule</h4>
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
                            <p className="text-sm text-secondary mb-3">
                              {hasScheduleData ? 'View and manage project timeline' : 'Create timeline with tasks and milestones'}
                            </p>
                            <button
                              onClick={() => setActiveTab('schedule')}
                              className="text-xs font-medium text-accent-amber hover:text-accent-amber/80 flex items-center space-x-1"
                            >
                              <span>{hasScheduleData ? 'View Schedule' : '+ Add Schedule'}</span>
                              <span>→</span>
                            </button>
                          </div>
                          {/* Materials Status Card */}
                          <div className="bg-neutral-darker p-4 rounded-lg border border-neutral-medium">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                <span className="text-lg">🏗️</span>
                                <h4 className="font-semibold text-primary">Project Materials</h4>
                              </div>
                              <div className="flex items-center space-x-2">
                                {materialsAnalyzing ? (
                                  <div className="w-2 h-2 rounded-full bg-accent-amber animate-pulse"></div>
                                ) : (
                                  <div className={`w-2 h-2 rounded-full ${materialsAnalyzed ? 'bg-success' : 'bg-neutral-medium'}`}></div>
                                )}
                                <span className="text-xs text-secondary">
                                  {materialsAnalyzing ? 'Analyzing...' : materialsAnalyzed ? 'Analyzed' : 'Not analyzed'}
                                </span>
                              </div>
                            </div>
                            <p className="text-sm text-secondary mb-3">
                              AI-powered material extraction and procurement planning
                            </p>
                            <button
                              onClick={() => setActiveTab('materials')}
                              className="text-xs font-medium text-secondary hover:text-primary flex items-center space-x-1"
                            >
                              <span>📋 View Materials</span>
                              <span>→</span>
                            </button>
                          </div>
                        </div>
                      </div>


                      {/* Mock Data Milestones */}
                      {!isSelectedGoogleSheetsProject && (selectedProjectData as any)?.milestones && (
                        <div>
                          <h3 className="text-lg font-bold text-primary mb-4">Project Milestones</h3>
                          <div className="space-y-4">
                            {(selectedProjectData as any).milestones.map((milestone: any, index: number) => (
                            <div key={milestone.id} className="flex items-start space-x-4">
                              <div className="flex flex-col items-center">
                                <div className={`w-4 h-4 rounded-full ${
                                  milestone.status === 'Completed' ? 'bg-success' :
                                  milestone.status === 'In Progress' ? 'bg-accent-blue' :
                                  milestone.status === 'Delayed' ? 'bg-warning' : 'bg-neutral-medium'
                                }`}></div>
                                {index < (selectedProjectData as any).milestones.length - 1 && (
                                  <div className="w-0.5 h-12 bg-neutral-medium mt-2"></div>
                                )}
                              </div>
                              <div className="flex-1">
                                <div className="flex justify-between items-start mb-2">
                                  <h4 className="font-semibold text-primary">{milestone.name}</h4>
                                  <span className={`text-xs font-medium ${getMilestoneStatusColor(milestone.status)}`}>
                                    {milestone.status}
                                  </span>
                                </div>
                                <p className="text-sm text-secondary mb-2">{milestone.description}</p>
                                <div className="grid grid-cols-2 gap-4 text-xs">
                                  <div>
                                    <span className="text-secondary">Due: </span>
                                    <span className="text-primary">{formatDate(milestone.expectedDate)}</span>
                                  </div>
                                  <div>
                                    <span className="text-secondary">Payment: </span>
                                    <span className="text-accent-amber">{milestone.paymentPercentage}%</span>
                                  </div>
                                </div>
                                {milestone.status === 'In Progress' && (
                                  <div className="mt-3">
                                    <Button variant="primary" size="sm">
                                      Mark Complete
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
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
                                <h3 className="text-lg font-semibold text-primary">
                                  {mainTab === 'boq-quoting' ? 'Project Quote' : 'Bill of Quantities'}
                                </h3>
                                <p className="text-sm text-secondary">
                                  {mainTab === 'boq-quoting' ? 'Create detailed quote with line items and rates' : 'Add project costs, quantities, and rates'}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => setShowBOQEntry(true)}
                              className="bg-accent-amber text-neutral-dark px-4 py-2 rounded-lg font-medium hover:bg-accent-amber/90 transition-colors text-sm"
                            >
                              {mainTab === 'boq-quoting' ? '+ Create Quote' : '+ Add BOQ'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* BOQ Entry Form */
                        <div className="space-y-6">
                          <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-primary">
                              {mainTab === 'boq-quoting' ? 'Enter Quote Details' : 'Enter BOQ Details'}
                            </h3>
                            <button
                              onClick={() => setShowBOQEntry(false)}
                              className="text-secondary hover:text-primary text-sm flex items-center space-x-2"
                            >
                              <span>←</span>
                              <span>Back to Overview</span>
                            </button>
                          </div>
                          <EditableBOQTable
                              projectId={selectedProjectData.id}
                              contractorId={currentContractorId}
                              onSaveSuccess={() => {
                                setRefreshKey(prev => prev + 1);
                                setShowBOQEntry(false); // Hide form after successful save
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
                              {editingBOQ ? '← Back to View' : '✏️ Edit Quote'}
                            </button>
                          </div>
                        )}
                        <BOQDisplay 
                          key={`boq-${refreshKey}`} 
                          projectId={selectedProjectData.id} 
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
                            projectId={selectedProjectData.id}
                            contractorId={currentContractorId}
                            onSaveSuccess={() => {
                              setRefreshKey(prev => prev + 1);
                              setShowScheduleEntry(false); // Hide form after successful save
                              setTimeout(() => setRefreshKey(prev => prev + 1), 500);
                            }}
                          />
                        </div>
                      )}
                      
                      {/* Always show existing Schedule data if available */}
                      <ScheduleDisplay key={`schedule-${refreshKey}`} projectId={selectedProjectData.id} contractorId={currentContractorId} />
                    </div>
                  )}

                  {/* Materials Tab Content */}
                  {activeTab === 'materials' && (
                    <div className="space-y-6">
                      {/* Materials Landing Page */}
                      <div className="bg-neutral-dark rounded-lg border border-neutral-medium p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div>
                              <h3 className="text-lg font-semibold text-primary">Project Materials</h3>
                              <p className="text-sm text-secondary">Add and manage materials required for this project</p>
                            </div>
                          </div>
                          <div className="relative">
                            <button
                              className="bg-neutral-medium text-secondary px-4 py-2 rounded-lg font-medium text-sm cursor-not-allowed opacity-60"
                              disabled={true}
                              title="AI-powered BOQ analysis coming soon. For now, please request materials manually."
                            >
                              Analyze BOQ (Coming Soon)
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Notice about materials from drawings */}
                      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                        <div className="flex items-start space-x-3">
                          <div className="text-blue-400 mt-0.5">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div>
                            <h4 className="font-medium text-blue-400 mb-1">Materials from Drawings</h4>
                            <p className="text-sm text-secondary">
                              Project materials should be extracted from uploaded drawings using the quantity takeoff tools in the <strong>Files</strong> tab. 
                              This ensures accurate quantities and specifications for financing requests.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Add Materials Manually - Hidden for now */}
                      <div className="bg-neutral-dark rounded-lg border border-neutral-medium p-6" style={{ display: 'none' }}>
                        <h3 className="text-lg font-bold text-primary mb-4">Add Project Materials</h3>
                        <p className="text-secondary text-sm mb-6">
                          Select materials from our catalog and specify quantities needed for this project.
                        </p>
                        
                        <div className="grid md:grid-cols-2 gap-6">
                          {/* Material Selection with Search */}
                          <div className="relative material-search-container">
                            <label className="block text-sm font-medium text-primary mb-2">
                              Select Material *
                            </label>
                            <div className="relative">
                              <input
                                type="text"
                                placeholder={materialForm.materialName || "Search materials..."}
                                value={materialSearchTerm}
                                onChange={(e) => setMaterialSearchTerm(e.target.value)}
                                onFocus={() => setMaterialSearchOpen(true)}
                                className="w-full px-4 py-3 border border-neutral-medium rounded-lg focus:ring-2 focus:ring-accent-orange focus:border-transparent transition-colors duration-200 bg-neutral-dark text-primary placeholder-text-secondary"
                              />
                              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                                <svg className="h-5 w-5 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                              </div>
                            </div>
                            
                            {/* Dropdown Results */}
                            {materialSearchOpen && (
                              <div className="absolute z-50 w-full mt-1 bg-neutral-dark border border-neutral-medium rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                {filteredMaterials.length > 0 ? (
                                  filteredMaterials.map((material) => (
                                    <div
                                      key={material.id}
                                      onClick={() => {
                                        setMaterialForm(prev => ({
                                          ...prev,
                                          material: material.id,
                                          materialName: material.name
                                        }));
                                        setMaterialSearchTerm(material.name);
                                        setMaterialSearchOpen(false);
                                      }}
                                      className="px-4 py-3 hover:bg-neutral-medium cursor-pointer border-b border-neutral-medium/50 last:border-b-0"
                                    >
                                      <div>
                                        <div className="font-medium text-primary">{material.name}</div>
                                        <div className="text-xs text-secondary">{material.category}</div>
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <div className="px-4 py-3 text-secondary text-center">
                                    No materials found for "{materialSearchTerm}"
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Quantity Input */}
                          <div>
                            <label className="block text-sm font-medium text-primary mb-2">
                              Quantity *
                            </label>
                            <div className="flex space-x-2">
                              <input
                                type="number"
                                placeholder="Enter quantity"
                                value={materialForm.quantity}
                                onChange={(e) => setMaterialForm(prev => ({ ...prev, quantity: e.target.value }))}
                                className="flex-1 px-4 py-3 border border-neutral-medium rounded-lg focus:ring-2 focus:ring-accent-orange focus:border-transparent transition-colors duration-200 bg-neutral-dark text-primary placeholder-text-secondary"
                              />
                              <select 
                                value={materialForm.unit}
                                onChange={(e) => setMaterialForm(prev => ({ ...prev, unit: e.target.value }))}
                                className="px-4 py-3 border border-neutral-medium rounded-lg focus:ring-2 focus:ring-accent-orange focus:border-transparent transition-colors duration-200 bg-neutral-dark text-primary"
                              >
                                <option value="bags">Bags</option>
                                <option value="tons">Tons</option>
                                <option value="cubic_meters">m³</option>
                                <option value="square_meters">m²</option>
                                <option value="pieces">Pieces</option>
                                <option value="meters">Meters</option>
                                <option value="kg">Kg</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        {/* Additional Details */}
                        <div className="mt-6">
                          <label className="block text-sm font-medium text-primary mb-2">
                            Usage Notes (Optional)
                          </label>
                          <textarea
                            placeholder="Specify where this material will be used in the project..."
                            rows={3}
                            value={materialForm.notes}
                            onChange={(e) => setMaterialForm(prev => ({ ...prev, notes: e.target.value }))}
                            className="w-full px-4 py-3 border border-neutral-medium rounded-lg focus:ring-2 focus:ring-accent-orange focus:border-transparent transition-colors duration-200 bg-neutral-dark text-primary placeholder-text-secondary resize-vertical"
                          />
                        </div>

                        {/* Action Buttons */}
                        <div className="flex justify-end space-x-4 mt-6">
                          <button 
                            onClick={() => {
                              setMaterialForm({
                                material: '',
                                materialName: '',
                                quantity: '',
                                unit: 'bags',
                                notes: ''
                              });
                              setMaterialSearchTerm('');
                              setMaterialSearchOpen(false);
                            }}
                            className="px-4 py-2 text-secondary hover:text-primary transition-colors"
                          >
                            Clear
                          </button>
                          <button 
                            onClick={addMaterialToProject}
                            className="bg-accent-orange text-white px-6 py-2 rounded-lg hover:bg-accent-orange/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={!materialForm.material || !materialForm.quantity}
                          >
                            Add Material
                          </button>
                        </div>
                      </div>

                      {/* Material Status Overview */}
                      {projectMaterials.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                          {['pending', 'platform_order', 'external_purchase', 'delivered', 'used'].map(status => {
                            const count = projectMaterials.filter(m => m.status === status).length;
                            const statusInfo = getStatusInfo(status);
                            return (
                              <div key={status} className="bg-neutral-dark rounded-lg border border-neutral-medium p-4 text-center">
                                <div className="text-2xl mb-2"></div>
                                <div className="text-2xl font-bold text-primary mb-1">{count}</div>
                                <div className="text-xs text-secondary">{statusInfo.label}</div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Project Materials List */}
                      <div className="bg-neutral-dark rounded-lg border border-neutral-medium">
                        <div className="p-6 border-b border-neutral-medium">
                          <h3 className="text-lg font-bold text-primary mb-2">Project Materials ({projectMaterials.length})</h3>
                          <p className="text-secondary text-sm">
                            Materials added to this project. Change status to track procurement progress.
                          </p>
                        </div>
                        
                        {projectMaterials.length === 0 ? (
                          /* Empty State */
                          <div className="p-8 text-center">
                            <div className="text-4xl mb-4"></div>
                            <h4 className="text-lg font-semibold text-primary mb-2">No Materials Added Yet</h4>
                            <p className="text-secondary mb-4">
                              Add materials using the form above to start building your project material list.
                            </p>
                            <div className="text-xs text-secondary bg-neutral-medium p-3 rounded-lg max-w-md mx-auto">
                              <strong>Note:</strong> Materials added here will be linked to this specific project and can be used for material supply requests.
                            </div>
                          </div>
                        ) : (
                          /* Materials Table */
                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead>
                                <tr className="border-b border-neutral-medium">
                                  <th className="text-left p-4 text-primary font-semibold">Material</th>
                                  <th className="text-left p-4 text-primary font-semibold">Quantity</th>
                                  <th className="text-left p-4 text-primary font-semibold">Status</th>
                                  <th className="text-left p-4 text-primary font-semibold">Notes</th>
                                  <th className="text-center p-4 text-primary font-semibold">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {projectMaterials.map((material) => (
                                  <tr key={material.id} className="border-b border-neutral-medium/50 hover:bg-neutral-darker/30">
                                    <td className="p-4">
                                      <div>
                                        <div className="font-medium text-primary">{material.name}</div>
                                        <div className="text-xs text-secondary">{material.category}</div>
                                      </div>
                                    </td>
                                    <td className="p-4">
                                      <span className="font-medium text-accent-orange">
                                        {material.quantity} {material.unit}
                                      </span>
                                    </td>
                                    <td className="p-4">
                                      <div className="flex items-center space-x-2">
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusInfo(material.status).color}`}>
                                          {getStatusInfo(material.status).icon} {getStatusInfo(material.status).label}
                                        </span>
                                        <select
                                          value={material.status}
                                          onChange={(e) => updateMaterialStatus(material.id, e.target.value as any)}
                                          className="text-xs bg-neutral-medium border border-neutral-medium rounded px-2 py-1 text-primary"
                                        >
                                          <option value="pending">Pending</option>
                                          <option value="platform_order">Platform Order</option>
                                          <option value="external_purchase">External Purchase</option>
                                          <option value="delivered">Delivered</option>
                                          <option value="used">Used</option>
                                        </select>
                                      </div>
                                    </td>
                                    <td className="p-4 text-secondary text-sm">
                                      {material.notes || '-'}
                                    </td>
                                    <td className="p-4 text-center">
                                      <div className="flex items-center justify-center space-x-2">
                                        {/* Purchase Status Button */}
                                        {material.purchase_status === 'none' || !material.purchase_status ? (
                                          <button
                                            onClick={() => handleRequestPurchase(material)}
                                            className="text-green-600 hover:text-green-700 text-sm font-medium px-3 py-1 rounded hover:bg-green-50 transition-colors border border-green-200"
                                          >
                                            Request Purchase
                                          </button>
                                        ) : (
                                          <div className="flex flex-col items-center space-y-1">
                                            <span className={`text-xs px-2 py-1 rounded font-medium ${
                                              material.purchase_status === 'requested' ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' :
                                              material.purchase_status === 'approved' ? 'bg-green-100 text-green-800 border border-green-300' :
                                              material.purchase_status === 'completed' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                                              material.purchase_status === 'cancelled' ? 'bg-red-100 text-red-800 border border-red-300' :
                                              'bg-gray-100 text-gray-800 border border-gray-300'
                                            }`}>
                                              {material.purchase_status.replace('_', ' ').toUpperCase()}
                                            </span>
                                            {material.purchase_status === 'requested' && (
                                              <span className="text-xs text-secondary">
                                                Qty: {material.total_requested_qty}/{material.quantity} • Check Requested tab
                                              </span>
                                            )}
                                          </div>
                                        )}
                                        <button
                                          onClick={() => removeMaterialFromProject(material.id)}
                                          className="text-red-400 hover:text-red-300 text-sm font-medium px-3 py-1 rounded hover:bg-red-400/10 transition-colors"
                                        >
                                          Remove
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
                    </div>
                  )}

                  {/* Requested Materials Tab Content */}
                  {activeTab === 'requested-materials' && (
                    <div className="space-y-6">
                      {/* Header */}
                      <div className="bg-neutral-dark rounded-lg border border-neutral-medium p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-lg font-semibold text-primary">Requested Materials</h3>
                            <p className="text-sm text-secondary">Materials requested for purchase from vendors</p>
                          </div>
                          <div className="text-sm text-secondary">
                            {requestedMaterials.length} request{requestedMaterials.length !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>

                      {/* Requested Materials List */}
                      <div className="bg-neutral-dark rounded-lg border border-neutral-medium">
                        <div className="p-6 border-b border-neutral-medium">
                          <h3 className="text-lg font-bold text-primary mb-2">Purchase Requests ({requestedMaterials.length})</h3>
                          <p className="text-secondary text-sm">
                            Track the status of your material purchase requests and upload vendor quotes.
                          </p>
                        </div>
                        
                        {requestedMaterials.length === 0 ? (
                          /* Empty State */
                          <div className="p-8 text-center">
                            <div className="text-4xl mb-4">📦</div>
                            <h4 className="text-lg font-semibold text-primary mb-2">No Materials Requested Yet</h4>
                            <p className="text-secondary mb-4">
                              Request materials for purchase from the Materials tab to see them here.
                            </p>
                            <button
                              onClick={() => setActiveTab('materials')}
                              className="bg-accent-amber text-neutral-dark px-6 py-2 rounded-lg font-medium hover:bg-accent-amber/90 transition-colors"
                            >
                              Go to Materials
                            </button>
                          </div>
                        ) : (
                          /* Requested Materials */
                          <div className="space-y-6">
                            {requestedMaterials.map((material) => (
                              <div key={material.id} className="bg-neutral-darker rounded-lg border border-neutral-medium overflow-hidden">
                                {/* Material Header */}
                                <div className="bg-neutral-medium p-4 border-b border-neutral-medium">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-4">
                                      <div>
                                        <h3 className="text-lg font-semibold text-primary">
                                          📦 {material.materials?.name || 'Unknown Material'}
                                        </h3>
                                        <p className="text-sm text-secondary">
                                          Requested: {material.total_requested_qty || 0} {material.materials?.unit} • Vendor: {material.vendor_id ? 'Selected' : 'Not Selected'}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                        material.purchase_status === 'requested' ? 'bg-yellow-100 text-yellow-800' :
                                        material.purchase_status === 'approved' ? 'bg-green-100 text-green-800' :
                                        material.purchase_status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                                        material.purchase_status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                        'bg-gray-100 text-gray-800'
                                      }`}>
                                        {(material.purchase_status || 'none').replace('_', ' ').toUpperCase()}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Material Details */}
                                <div className="p-4">
                                  <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                                    <div>
                                      <span className="text-secondary">Category:</span>
                                      <span className="text-primary ml-2">{material.materials?.category || 'Unknown'}</span>
                                    </div>
                                    <div>
                                      <span className="text-secondary">Unit:</span>
                                      <span className="text-primary ml-2">{material.materials?.unit || 'Unknown'}</span>
                                    </div>
                                    <div>
                                      <span className="text-secondary">Total Quantity:</span>
                                      <span className="text-primary ml-2">{material.quantity}</span>
                                    </div>
                                    <div>
                                      <span className="text-secondary">Requested Quantity:</span>
                                      <span className="text-accent-orange font-medium ml-2">{material.total_requested_qty || 0}</span>
                                    </div>
                                    {material.delivery_date && (
                                      <div>
                                        <span className="text-secondary">Delivery Date:</span>
                                        <span className="text-primary ml-2">
                                          {new Date(material.delivery_date).toLocaleDateString()}
                                        </span>
                                      </div>
                                    )}
                                    {material.contractor_notes && (
                                      <div className="col-span-2">
                                        <span className="text-secondary">Notes:</span>
                                        <span className="text-primary ml-2">{material.contractor_notes}</span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Material Actions */}
                                  <div className="flex items-center justify-end space-x-3 pt-3 border-t border-neutral-medium">
                                    <button
                                      onClick={() => {
                                        // TODO: Create purchase order functionality
                                        alert('Purchase order creation will be implemented next');
                                      }}
                                      className="bg-accent-amber text-neutral-dark px-4 py-2 rounded-lg font-medium hover:bg-accent-amber/90 transition-colors"
                                    >
                                      Create Purchase Order
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
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
                            <div className="text-4xl mb-4"></div>
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
                                        <div className="font-medium text-primary">{file.original_name}</div>
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
                                        {file.category.toUpperCase()}
                                      </span>
                                    </td>
                                    <td className="p-4 text-secondary text-sm">
                                      {(file.file_size / 1024 / 1024).toFixed(2)} MB
                                    </td>
                                    <td className="p-4 text-secondary text-sm">
                                      v{file.version}
                                    </td>
                                    <td className="p-4 text-secondary text-sm">
                                      {new Date(file.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="p-4 text-center">
                                      <div className="flex items-center justify-center space-x-2">
                                        <button
                                          onClick={() => viewFile(file.id)}
                                          className="text-accent-orange hover:text-accent-orange/80 text-sm font-medium px-3 py-1 rounded hover:bg-accent-orange/10 transition-colors"
                                        >
                                          View
                                        </button>
                                        {file.mime_type === 'application/pdf' && (
                                          <button
                                            onClick={() => takeoffFile(file.id)}
                                            className="text-accent-amber hover:text-accent-amber/80 text-sm font-medium px-3 py-1 rounded hover:bg-accent-amber/10 transition-colors"
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
              </div>
            ) : (
              <div className="bg-neutral-dark rounded-lg border border-neutral-medium p-12 text-center">
                <div className="text-6xl mb-4"></div>
                <h3 className="text-xl font-bold text-primary mb-2">Select a Project</h3>
                <p className="text-secondary">
                  Choose a project from the dropdown above to view detailed information, 
                  track milestones, and manage progress.
                </p>
              </div>
            )}
        </div>
      </div>

      {/* PDF Viewer Modal */}
      {showPDFViewer && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="w-full h-full max-w-7xl max-h-[90vh] bg-neutral-dark rounded-lg border border-neutral-medium overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-neutral-medium">
              <h3 className="text-lg font-semibold text-primary">PDF Viewer</h3>
              <button
                onClick={() => setShowPDFViewer(false)}
                className="text-secondary hover:text-primary text-2xl font-bold px-2"
              >
                ×
              </button>
            </div>
            <div className="h-full pb-16 overflow-auto">
              {useAnalysisMode ? (
                <BOQTakeoffViewer
                  fileUrl={currentPDFUrl}
                  fileName={currentPDFName}
                  projectId={selectedProject || undefined}
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
                  onError={(error) => {
                    console.error('PDF viewer error:', error);
                    alert('Failed to load PDF. The file might be corrupted or not accessible.');
                    setShowPDFViewer(false);
                  }}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Purchase Request Modal */}
      {showPurchaseDialog && selectedMaterialForPurchase && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-dark rounded-lg border border-neutral-medium w-full max-w-md">
            {/* Modal Header */}
            <div className="border-b border-neutral-medium p-6">
              <h2 className="text-xl font-bold text-primary">Request Purchase</h2>
              <p className="text-sm text-secondary mt-1">
                Request purchase for {selectedMaterialForPurchase?.name}
              </p>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4">
              {/* Material Summary */}
              <div className="bg-neutral-medium/30 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-medium text-primary">{selectedMaterialForPurchase?.name}</h3>
                    <p className="text-sm text-secondary">Qty: {selectedMaterialForPurchase?.quantity} {selectedMaterialForPurchase?.unit}</p>
                  </div>
                </div>
              </div>

              {/* Vendor Selection */}
              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  Select Vendor *
                </label>
                <select
                  value={purchaseForm.vendorId}
                  onChange={(e) => setPurchaseForm(prev => ({ ...prev, vendorId: e.target.value }))}
                  className="w-full px-3 py-2 bg-neutral-darker border border-neutral-medium rounded-md text-primary focus:ring-2 focus:ring-accent-blue focus:border-accent-blue"
                >
                  <option value="">Choose a vendor...</option>
                  {vendors.map(vendor => (
                    <option key={vendor.id} value={vendor.id}>
                      {vendor.name}
                    </option>
                  ))}
                </select>
                {vendors.length === 0 && (
                  <p className="text-xs text-secondary mt-1">
                    No vendors available. 
                    <button
                      type="button"
                      onClick={() => window.open('/dashboard/contractor/network', '_blank')}
                      className="text-accent-blue hover:underline ml-1"
                    >
                      Add vendors
                    </button>
                  </p>
                )}
              </div>

              {/* Editable Quantity */}
              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  Request Quantity ({selectedMaterialForPurchase?.unit}) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={selectedMaterialForPurchase?.quantity}
                  value={purchaseForm.requestedQuantity}
                  onChange={(e) => setPurchaseForm(prev => ({ ...prev, requestedQuantity: e.target.value }))}
                  className="w-full px-3 py-2 bg-neutral-darker border border-neutral-medium rounded-md text-primary focus:ring-2 focus:ring-accent-blue focus:border-accent-blue"
                  placeholder="Enter quantity to request"
                />
                <div className="flex justify-between text-xs text-secondary mt-1">
                  <span>Available: {selectedMaterialForPurchase?.quantity} {selectedMaterialForPurchase?.unit}</span>
                  <span>
                    {purchaseForm.requestedQuantity && parseFloat(purchaseForm.requestedQuantity) <= selectedMaterialForPurchase?.quantity ? 
                      '✓ Valid quantity' : 
                      '⚠️ Exceeds available quantity'
                    }
                  </span>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="border-t border-neutral-medium p-6">
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowPurchaseDialog(false)}
                  className="px-4 py-2 text-primary border border-neutral-medium rounded-md hover:bg-neutral-medium/20 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    try {
                      const requestData = {
                        project_material_id: selectedMaterialForPurchase.id,
                        vendor_id: purchaseForm.vendorId,
                        purchase_quantity: parseFloat(purchaseForm.requestedQuantity),
                        delivery_date: purchaseForm.deliveryDate,
                        delivery_address: purchaseForm.deliveryAddress,
                        contractor_notes: purchaseForm.notes,
                        project_id: selectedProject
                      };
                      
                      console.log('🔥 Submitting to new purchase-orders API:', requestData);
                      
                      const response = await fetch('/api/project-materials', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          id: selectedMaterialForPurchase.id,
                          purchase_status: 'requested',
                          vendor_id: purchaseForm.vendorId,
                          requested_quantity: parseFloat(purchaseForm.requestedQuantity)
                        })
                      });

                      console.log('🔥 Purchase order response status:', response.status);
                      const result = await response.json();
                      console.log('🔥 Purchase order response:', result);

                      if (result.success) {
                        alert('Material marked for purchase request!');
                        setShowPurchaseDialog(false);
                        // Refresh requested materials tab to show the new request
                        fetchRequestedMaterials();
                        
                        // Also refresh project materials to update button status
                        if (selectedProject) {
                          const materialsResponse = await fetch(`/api/project-materials?project_id=${selectedProject}`);
                          if (materialsResponse.ok) {
                            const materialsResult = await materialsResponse.json();
                            if (materialsResult.success) {
                              // Transform and update project materials with purchase status
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
                                  purchase_status: item.purchase_status || 'none', // Use purchase status from project materials
                                  total_requested_qty: item.total_requested_qty || 0,
                                  remaining_qty: item.remaining_qty || item.quantity,
                                  vendor_id: item.vendor_id,
                                  addedAt: item.created_at,
                                  updatedAt: item.updated_at
                                };
                              });
                              setProjectMaterials(transformedMaterials);
                            }
                          }
                        }
                      } else {
                        alert(result.error || 'Failed to submit purchase request');
                      }
                    } catch (error) {
                      console.error('Error submitting purchase request:', error);
                      alert('Error submitting purchase request');
                    }
                  }}
                  disabled={
                    !purchaseForm.vendorId || 
                    !purchaseForm.requestedQuantity ||
                    parseFloat(purchaseForm.requestedQuantity) <= 0 ||
                    parseFloat(purchaseForm.requestedQuantity) > selectedMaterialForPurchase?.quantity
                  }
                  className="px-4 py-2 bg-accent-blue text-white rounded-md hover:bg-accent-blue/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Submit Request
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Project Conversion Dialog */}
      {showConversionDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-dark rounded-lg p-6 w-full max-w-2xl border border-neutral-medium">
            <h2 className="text-xl font-bold mb-4 text-primary">Convert to Awarded Project</h2>
            <p className="text-secondary mb-6">
              Add project value and contract details to convert this draft project to an awarded project.
            </p>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-primary mb-1">
                    Project Value *
                  </label>
                  <input
                    type="number"
                    value={conversionForm.estimated_value}
                    onChange={(e) => setConversionForm(prev => ({ ...prev, estimated_value: e.target.value }))}
                    placeholder="Enter project value"
                    className="w-full px-3 py-2 bg-neutral-darker border border-neutral-medium rounded-md text-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-primary mb-1">
                    PO/WO Number
                  </label>
                  <input
                    type="text"
                    value={conversionForm.po_number}
                    onChange={(e) => setConversionForm(prev => ({ ...prev, po_number: e.target.value }))}
                    placeholder="PO-2024-001"
                    className="w-full px-3 py-2 bg-neutral-darker border border-neutral-medium rounded-md text-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-primary mb-1">
                    Funding Required
                  </label>
                  <input
                    type="number"
                    value={conversionForm.funding_required}
                    onChange={(e) => setConversionForm(prev => ({ ...prev, funding_required: e.target.value }))}
                    placeholder="Enter funding amount"
                    className="w-full px-3 py-2 bg-neutral-darker border border-neutral-medium rounded-md text-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-primary mb-1">
                    Funding Status
                  </label>
                  <select
                    value={conversionForm.funding_status}
                    onChange={(e) => setConversionForm(prev => ({ ...prev, funding_status: e.target.value }))}
                    className="w-full px-3 py-2 bg-neutral-darker border border-neutral-medium rounded-md text-primary"
                  >
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="received">Received</option>
                    <option value="not_required">Not Required</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowConversionDialog(false);
                  setConversionForm({ estimated_value: '', po_number: '', funding_required: '', funding_status: 'pending' });
                }}
                className="px-4 py-2 bg-neutral-medium text-secondary rounded-md hover:bg-neutral-medium/80 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={convertProjectToAwarded}
                disabled={!conversionForm.estimated_value}
                className="px-4 py-2 bg-success text-white rounded-md hover:bg-success/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Convert to Awarded Project
              </button>
            </div>
          </div>
        </div>
      )}
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