'use client';

import React, { useState, useEffect } from 'react';

interface BOQTakeoffViewerProps {
  fileUrl: string;
  fileName?: string;
  projectId?: string;
  onError?: (error: Error) => void;
}

interface Material {
  id: string;
  name: string;
  category: string;
  unit: string;
  description?: string;
}

interface Point {
  x: number;
  y: number;
}

interface BOQItem {
  id: string;
  materialId: string;
  materialName: string;
  description: string;
  nos: number;
  length: number;
  breadth: number;
  height: number;
  unit: string;
  quantity: number;
  location?: Point;
  notes?: string;
}

export default function BOQTakeoffViewer({ fileUrl, fileName, projectId, onError }: BOQTakeoffViewerProps) {
  
  // BOQ state
  const [boqItems, setBOQItems] = useState<BOQItem[]>([]);
  const [availableMaterials, setAvailableMaterials] = useState<Material[]>([]);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  
  // AI Analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAIForm, setShowAIForm] = useState(false);
  const [aiContext, setAiContext] = useState({
    projectType: '',
    expectedMaterials: [] as string[]
  });
  const [materialInput, setMaterialInput] = useState('');
  const [showMaterialSuggestions, setShowMaterialSuggestions] = useState(false);
  
  // AI Results state
  const [aiAnalysisResults, setAiAnalysisResults] = useState<any[]>([]);
  
  // Split view state
  const [splitPercentage, setSplitPercentage] = useState(60); // BOQ takes 60% initially
  const [isDragging, setIsDragging] = useState(false);
  const [sectionHeight, setSectionHeight] = useState(800); // Initial height
  const [isVerticalDragging, setIsVerticalDragging] = useState(false);
  
  // Material search state
  const [materialSearchInputs, setMaterialSearchInputs] = useState<{[key: string]: string}>({});
  const [showMaterialDropdowns, setShowMaterialDropdowns] = useState<{[key: string]: boolean}>({});
  
  // Edit mode state
  const [editingCell, setEditingCell] = useState<{rowId: string, field: keyof BOQItem} | null>(null);
  
  
  // Save state
  const [isSaving, setIsSaving] = useState(false);
  const [existingTakeoffId, setExistingTakeoffId] = useState<string | null>(null);
  
  // Verification state
  const [isSubmittingForVerification, setIsSubmittingForVerification] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'none' | 'pending' | 'verified' | 'disputed' | 'revision_required'>('none');
  
  

  // Common units for dropdown
  const commonUnits = [
    'm', 'm²', 'm³', 'kg', 'nos', 'ltr', 'ton', 'bag', 'cum', 'sqm', 'rmt', 'kg/m', 'kg/m²'
  ];

  // Fetch available materials and load saved analysis
  useEffect(() => {
    const fetchMaterials = async () => {
      try {
        const response = await fetch('/api/materials');
        if (response.ok) {
          const data = await response.json();
          setAvailableMaterials(data.data || []);
        }
      } catch (error) {
        console.error('Failed to fetch materials:', error);
      }
    };
    fetchMaterials();

    // Load saved analysis results for this file from database
    const loadSavedAnalysis = async () => {
      if (fileName) {
        try {
          const params = new URLSearchParams({ fileName });
          if (projectId) params.append('projectId', projectId);
          
          const response = await fetch(`/api/drawing-analysis-results?${params}`);
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.data) {
              // Handle both report format and legacy item format
              if (typeof data.data.analysis_results === 'string') {
                // New report format
                setAiAnalysisResults([{ analysisReport: data.data.analysis_results }]);
              } else {
                // Legacy items format
                setAiAnalysisResults(data.data.analysis_results || []);
              }
            }
          }
        } catch (error) {
          console.error('Failed to load saved analysis:', error);
        }
      }
    };

    loadSavedAnalysis();
  }, [fileName, projectId]);



  // Close material suggestions when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showMaterialSuggestions && !(event.target as Element)?.closest('.material-search-container')) {
        setShowMaterialSuggestions(false);
      }
      
      // Close BOQ material dropdowns when clicking outside
      const target = event.target as Element;
      if (!target?.closest('.material-dropdown-container')) {
        setShowMaterialDropdowns({});
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMaterialSuggestions]);

  // Add new BOQ row
  const addBOQRow = () => {
    const newItem: BOQItem = {
      id: Date.now().toString(),
      materialId: '',
      materialName: '',
      description: '',
      nos: 1,
      length: 0,
      breadth: 0,
      height: 0,
      unit: '',
      quantity: 0,
      notes: ''
    };

    setBOQItems(prev => [...prev, newItem]);
    setSelectedRowId(newItem.id);
  };

  // Update BOQ item
  const updateBOQItem = (id: string, field: keyof BOQItem, value: any) => {
    setBOQItems(prev => prev.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        
        // If material is selected, auto-fill unit only if unit is empty
        if (field === 'materialId' && value) {
          const material = availableMaterials.find(m => m.id === value);
          if (material) {
            updatedItem.materialName = material.name;
            // Only set unit if it's currently empty
            if (!updatedItem.unit) {
              updatedItem.unit = material.unit;
            }
          }
        }
        
        // Auto-calculate quantity: nos × length × breadth × height
        if (['nos', 'length', 'breadth', 'height'].includes(field)) {
          const nos = Number(field === 'nos' ? value : updatedItem.nos) || 0;
          const length = Number(field === 'length' ? value : updatedItem.length) || 0;
          const breadth = Number(field === 'breadth' ? value : updatedItem.breadth) || 0;
          const height = Number(field === 'height' ? value : updatedItem.height) || 0;
          
          // Calculate based on dimensions provided
          let calculatedQuantity = 0;
          if (height > 0) {
            calculatedQuantity = nos * length * breadth * height; // Volume
          } else if (breadth > 0) {
            calculatedQuantity = nos * length * breadth; // Area
          } else if (length > 0) {
            calculatedQuantity = nos * length; // Length
          } else {
            calculatedQuantity = nos; // Count only
          }
          
          updatedItem.quantity = Number(calculatedQuantity) || 0;
        }
        
        return updatedItem;
      }
      return item;
    }));
  };

  // Delete BOQ item
  const deleteBOQItem = (id: string) => {
    setBOQItems(prev => prev.filter(item => item.id !== id));
    if (selectedRowId === id) {
      setSelectedRowId(null);
    }
  };

  // Handle cell editing
  const handleCellClick = (rowId: string, field: keyof BOQItem) => {
    setEditingCell({ rowId, field });
  };

  const handleCellBlur = () => {
    // Add a small delay to allow material selection to complete
    setTimeout(() => {
      setEditingCell(null);
    }, 100);
  };

  const handleCellKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === 'Escape') {
      setEditingCell(null);
    }
  };

  // Calculate material summary
  const getMaterialSummary = () => {
    const summary = new Map();
    
    boqItems.forEach(item => {
      if (item.materialId && item.materialName && item.quantity > 0) {
        const key = item.materialId;
        if (summary.has(key)) {
          const existing = summary.get(key);
          summary.set(key, {
            ...existing,
            totalQuantity: existing.totalQuantity + item.quantity,
            itemCount: existing.itemCount + 1,
            descriptions: [...existing.descriptions, item.description].filter(Boolean)
          });
        } else {
          summary.set(key, {
            materialId: item.materialId,
            materialName: item.materialName,
            unit: item.unit,
            totalQuantity: item.quantity,
            itemCount: 1,
            descriptions: item.description ? [item.description] : []
          });
        }
      }
    });
    
    return Array.from(summary.values()).sort((a, b) => a.materialName.localeCompare(b.materialName));
  };

  // AI-powered BOQ analysis
  const runAIAnalysis = async () => {
    if (!fileUrl || !fileName) {
      alert('No document loaded for analysis');
      return;
    }

    setIsAnalyzing(true);

    try {
      const response = await fetch('/api/drawing-analyzer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileUrl,
          fileName,
          projectType: aiContext.projectType,
          expectedMaterials: aiContext.expectedMaterials,
          availableMaterials: availableMaterials
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'AI analysis failed');
      }

      if (result.success && result.data?.analysisReport) {
        // Store AI analysis report for user review
        setAiAnalysisResults([{ analysisReport: result.data.analysisReport }]);

        // Save to database for persistence
        try {
          await fetch('/api/drawing-analysis-results', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileName,
              fileUrl,
              projectId,
              analysisResults: result.data.analysisReport,
              projectType: aiContext.projectType,
              processingTime: result.data.processingTime || null
            })
          });
        } catch (saveError) {
          console.error('Failed to save analysis results:', saveError);
          // Don't show error to user, analysis still works
        }
      } else {
        setAiAnalysisResults([]);
        alert('AI analysis completed but no report was generated. Please try again.');
      }

    } catch (error) {
      console.error('AI analysis error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`AI analysis failed: ${errorMessage}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Save BOQ takeoff (create or update)
  const saveTakeoff = async () => {
    if (!projectId) {
      alert('Project ID is required to save takeoff');
      return;
    }

    if (boqItems.length === 0) {
      alert('No items to save');
      return;
    }

    console.log('Saving takeoff with:', { project_id: projectId, file_name: fileName });

    setIsSaving(true);
    try {
      const method = existingTakeoffId ? 'PUT' : 'POST';
      const url = existingTakeoffId ? `/api/boq-takeoffs?id=${existingTakeoffId}` : '/api/boq-takeoffs';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          file_name: fileName,
          file_url: fileUrl,
          takeoff_data: boqItems,
          total_items: boqItems.length
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (!existingTakeoffId) {
          setExistingTakeoffId(result.data.id);
        }
        alert(`✅ BOQ takeoff saved successfully!`);
      } else {
        const error = await response.json();
        alert(`Failed to save takeoff: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save takeoff. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Auto-load existing takeoff for this file
  const loadExistingTakeoff = async () => {
    if (!projectId || !fileName) return;

    try {
      const response = await fetch(`/api/boq-takeoffs?project_id=${projectId}&file_name=${encodeURIComponent(fileName)}`);
      if (response.ok) {
        const result = await response.json();
        const takeoffs = result.data || [];
        
        if (takeoffs.length > 0) {
          const existingTakeoff = takeoffs[0]; // Get the most recent one
          let loadedData = existingTakeoff.takeoff_data;
          
          // Parse JSON string if needed
          if (typeof loadedData === 'string') {
            loadedData = JSON.parse(loadedData);
          }
          
          // Ensure it's an array and load it
          if (Array.isArray(loadedData)) {
            setBOQItems(loadedData);
            setExistingTakeoffId(existingTakeoff.id);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load existing takeoff:', error);
    }
  };

  // Load verification status
  const loadVerificationStatus = async () => {
    if (!projectId || !fileName) return;

    try {
      const response = await fetch(`/api/takeoff-verification?project_id=${projectId}&file_name=${encodeURIComponent(fileName)}`);
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data && result.data.overallStatus) {
          setVerificationStatus(result.data.overallStatus);
        } else {
          // No takeoff found or no verification status - default to 'none'
          setVerificationStatus('none');
        }
      } else {
        // API error - default to 'none'
        setVerificationStatus('none');
      }
    } catch (error) {
      console.error('Failed to load verification status:', error);
      // Error case - default to 'none'
      setVerificationStatus('none');
    }
  };

  // Auto-load existing takeoff and verification status on component mount
  useEffect(() => {
    if (projectId && fileName) {
      loadExistingTakeoff();
      loadVerificationStatus();
    }
  }, [projectId, fileName]);

  // Export BOQ to CSV
  const exportToCSV = () => {
    if (boqItems.length === 0) {
      alert('No items to export');
      return;
    }

    // Define CSV headers
    const headers = [
      'Material Name',
      'Description', 
      'Nos',
      'Length',
      'Breadth',
      'Height',
      'Unit',
      'Quantity',
      'Notes'
    ];

    // Convert BOQ items to CSV rows
    const csvRows = [
      headers.join(','), // Header row
      ...boqItems.map(item => [
        `"${item.materialName || ''}"`,
        `"${item.description || ''}"`,
        item.nos || 0,
        item.length || 0,
        item.breadth || 0,
        item.height || 0,
        `"${item.unit || ''}"`,
        item.quantity || 0,
        `"${item.notes || ''}"`
      ].join(','))
    ];

    // Create CSV content
    const csvContent = csvRows.join('\n');
    
    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `BOQ_${fileName || 'takeoff'}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export material summary to project
  const exportSummaryToProject = async () => {
    const materialSummary = getMaterialSummary();
    
    if (materialSummary.length === 0) {
      alert('No materials to export');
      return;
    }

    if (!projectId) {
      alert('Project ID is required to export materials');
      return;
    }

    if (!confirm(`Add ${materialSummary.length} materials to project?`)) return;

    try {
      let successCount = 0;
      let errorCount = 0;

      // Send each summarized material to the API
      for (const summary of materialSummary) {
        const materialMeta = availableMaterials.find(m => m.id === summary.materialId);
        const response = await fetch('/api/project-materials', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project_id: projectId,
            material_id: summary.materialId,
            material_name: summary.materialName,
            material_category: materialMeta?.category,
            material_description: summary.descriptions.join(', '),
            quantity: summary.totalQuantity,
            unit: summary.unit,
            notes: `BOQ Summary from ${fileName}. Used in ${summary.itemCount} sections: ${summary.descriptions.join(', ')}`,
            source_file_name: fileName,
            source_type: 'boq_analysis'
          })
        });

        if (response.ok) {
          successCount++;
        } else {
          errorCount++;
          const error = await response.json();
          console.error(`Failed to add material ${summary.materialName}:`, error);
        }
      }

      if (successCount > 0) {
        alert(`✅ Successfully added ${successCount} materials to project!${errorCount > 0 ? ` (${errorCount} failed)` : ''}`);
      } else {
        alert('Failed to add any materials to project. Please try again.');
      }

    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export materials. Please try again.');
    }
  };

  // Submit takeoff for verification
  const submitForVerification = async () => {
    const materialSummary = getMaterialSummary();
    
    if (materialSummary.length === 0) {
      alert('No materials to submit for verification');
      return;
    }

    if (!projectId) {
      alert('Project ID is required to submit for verification');
      return;
    }

    if (!fileName) {
      alert('File name is required to submit for verification');
      return;
    }

    if (!existingTakeoffId) {
      alert('Please save your BOQ takeoff first before submitting for verification');
      return;
    }

    if (!confirm(`Submit your BOQ takeoff with ${materialSummary.length} materials for admin verification?`)) return;

    console.log('Submitting for verification with:', { project_id: projectId, file_name: fileName });
    
    setIsSubmittingForVerification(true);
    try {
      const response = await fetch('/api/takeoff-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          file_name: fileName
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        alert(`✅ BOQ takeoff submitted for verification successfully!`);
        setVerificationStatus('pending');
      } else {
        alert(result.error || 'Failed to submit takeoff for verification');
      }

    } catch (error) {
      console.error('Verification submission error:', error);
      alert('Failed to submit for verification. Please try again.');
    } finally {
      setIsSubmittingForVerification(false);
    }
  };

  // Export to project materials (deprecated - keeping for backwards compatibility)
  const exportToMaterialRequests = async () => {
    if (boqItems.length === 0) {
      alert('No items to export');
      return;
    }

    if (!projectId) {
      alert('Project ID is required to export materials');
      return;
    }

    const validItems = boqItems.filter(item => item.materialId && item.quantity > 0);
    if (validItems.length === 0) {
      alert('No valid items to export. Please ensure all items have materials selected and quantities entered.');
      return;
    }

    const itemsWithoutMaterials = boqItems.filter(item => !item.materialId && item.quantity > 0);
    if (itemsWithoutMaterials.length > 0) {
      alert(`${itemsWithoutMaterials.length} items don't have materials selected. Please select materials from the available list, or add new materials to the master material database first.`);
      return;
    }

    if (!confirm(`Add ${validItems.length} materials to project?`)) return;

    try {
      let successCount = 0;
      let errorCount = 0;

      // Send each material individually to the API
      for (const item of validItems) {
        const material = availableMaterials.find(m => m.id === item.materialId);
        
        const response = await fetch('/api/project-materials', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project_id: projectId,
            material_id: item.materialId,
            material_name: item.materialName,
            material_category: material?.category,
            material_description: item.description || '',
            quantity: item.quantity,
            unit: material?.unit || item.unit,
            notes: `BOQ from ${fileName}. Dimensions: ${item.nos}×${item.length}×${item.breadth}×${item.height}. ${item.notes || ''}`
          })
        });

        if (response.ok) {
          successCount++;
        } else {
          errorCount++;
          const error = await response.json();
          console.error(`Failed to add material ${item.materialName}:`, error);
        }
      }

      if (successCount > 0) {
        alert(`✅ Successfully added ${successCount} materials to project!${errorCount > 0 ? ` (${errorCount} failed)` : ''}`);
        setBOQItems([]);
      } else {
        alert('Failed to add any materials to project. Please try again.');
      }

    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export materials. Please try again.');
    }
  };


  return (
    <div className="min-h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-neutral-medium p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h3 className="text-lg font-semibold text-primary">
              BOQ Takeoff - {fileName || 'PDF Document'}
            </h3>
            <p className="text-sm text-secondary">
              Drawing analysis and quantity takeoff workspace
            </p>
          </div>
          
          <button
            onClick={() => setShowAIForm(true)}
            disabled={isAnalyzing}
            className={`px-4 py-2 text-sm rounded-lg transition-colors ${
              isAnalyzing
                ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                : 'bg-accent-orange text-white hover:bg-accent-orange/80'
            }`}
          >
            {isAnalyzing ? (
              <span className="flex items-center gap-2">
                <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                Analyzing...
              </span>
            ) : (
              'Analyze Drawing'
            )}
          </button>
        </div>
      </div>

      {/* Resize Bar */}
      <div className="h-4 bg-neutral-medium relative flex items-center">
        <div 
          className={`absolute top-0 w-1 h-full bg-accent-orange cursor-col-resize transition-colors ${
            isDragging ? 'bg-accent-orange' : 'hover:bg-accent-amber'
          }`}
          style={{ left: `${splitPercentage}%` }}
          onMouseDown={(e) => {
            setIsDragging(true);
            const startX = e.clientX;
            const startPercentage = splitPercentage;
            const containerWidth = document.querySelector('.split-container')?.clientWidth || 1;
            
            const handleMouseMove = (e: MouseEvent) => {
              const deltaX = e.clientX - startX;
              const deltaPercentage = (deltaX / containerWidth) * 100;
              const newPercentage = Math.min(Math.max(startPercentage + deltaPercentage, 20), 80);
              setSplitPercentage(newPercentage);
            };
            
            const handleMouseUp = () => {
              setIsDragging(false);
              document.removeEventListener('mousemove', handleMouseMove);
              document.removeEventListener('mouseup', handleMouseUp);
            };
            
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
          }}
        />
        <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-[10px] text-white opacity-70 pointer-events-none select-none">
          Drag orange bar to adjust views
        </span>
      </div>

      {/* Main Split View Container */}
      <div className="flex split-container overflow-hidden" style={{ height: `${sectionHeight}px` }}>
        {/* BOQ Panel - Left Side */}
        <div 
          className="flex flex-col border-r border-neutral-medium"
          style={{ width: `${splitPercentage}%` }}
        >
          <div className="p-4 flex flex-col h-full">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-medium text-primary">Bill of Quantities</h4>
              <div className="flex items-center gap-2">
                <button
                  onClick={addBOQRow}
                  className="px-3 py-1.5 text-sm bg-accent-amber text-neutral-dark rounded-lg hover:bg-accent-amber/80 transition-colors"
                >
                  Add Row
                </button>
                {boqItems.length > 0 && (
                  <button
                    onClick={saveTakeoff}
                    disabled={isSaving}
                    className="px-3 py-1.5 text-sm bg-accent-orange text-white rounded-lg hover:bg-accent-orange/80 transition-colors disabled:opacity-50"
                  >
                    {isSaving ? 'Saving...' : 'Save BOQ'}
                  </button>
                )}
                {boqItems.length > 0 && (
                  <button
                    onClick={exportToCSV}
                    className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Export CSV
                  </button>
                )}
              </div>
            </div>
              <div className="flex-1 overflow-auto">
                <div className="bg-neutral-darker border border-neutral-medium rounded-lg h-full">
                  <table className="w-full text-xs">
                    <thead className="bg-neutral-medium sticky top-0">
                      <tr>
                        <th className="px-2 py-2 text-left text-primary border-r border-neutral-light">Material</th>
                        <th className="px-2 py-2 text-left text-primary border-r border-neutral-light">Description</th>
                        <th className="px-1 py-2 text-center text-primary border-r border-neutral-light">Nos</th>
                        <th className="px-1 py-2 text-center text-primary border-r border-neutral-light">L</th>
                        <th className="px-1 py-2 text-center text-primary border-r border-neutral-light">B</th>
                        <th className="px-1 py-2 text-center text-primary border-r border-neutral-light">H</th>
                        <th className="px-1 py-2 text-center text-primary border-r border-neutral-light">Unit</th>
                        <th className="px-2 py-2 text-center text-primary border-r border-neutral-light">Qty</th>
                        <th className="px-1 py-2 text-center text-primary">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {boqItems.length > 0 ? boqItems.map((item) => (
                        <tr 
                          key={item.id} 
                          className={`border-b border-neutral-medium hover:bg-neutral-medium/30 ${
                            selectedRowId === item.id ? 'bg-blue-900/20' : ''
                          }`}
                          onClick={(e) => {
                            // Don't select row if clicking on an editable cell
                            if (!(e.target as Element).closest('.cursor-pointer')) {
                              setSelectedRowId(selectedRowId === item.id ? null : item.id);
                            }
                          }}
                        >
                          <td className="px-2 py-1 border-r border-neutral-medium relative material-dropdown-container">
                            {editingCell?.rowId === item.id && editingCell?.field === 'materialName' ? (
                              <>
                                <input
                                  type="text"
                                  value={materialSearchInputs[item.id] || item.materialName || ''}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    setMaterialSearchInputs(prev => ({ ...prev, [item.id]: value }));
                                    setShowMaterialDropdowns(prev => ({ ...prev, [item.id]: true }));
                                    
                                    // Clear selection if input doesn't match current material
                                    if (item.materialId && !availableMaterials.find(m => m.name.toLowerCase().includes(value.toLowerCase()))) {
                                      updateBOQItem(item.id, 'materialId', '');
                                      updateBOQItem(item.id, 'materialName', '');
                                    }
                                  }}
                                  onBlur={handleCellBlur}
                                  onKeyDown={handleCellKeyDown}
                                  onFocus={() => setShowMaterialDropdowns(prev => ({ ...prev, [item.id]: true }))}
                                  placeholder="Search materials..."
                                  className="w-full text-xs bg-neutral-darker border border-neutral-medium rounded px-1 py-0.5 text-primary"
                                  autoFocus
                                />
                                
                                {/* Dropdown suggestions */}
                                {showMaterialDropdowns[item.id] && materialSearchInputs[item.id] && (
                                  <div className="absolute top-full left-0 right-0 bg-neutral-darker border border-neutral-medium rounded-lg mt-1 max-h-32 overflow-y-auto z-50 shadow-lg">
                                    {availableMaterials
                                      .filter(material => 
                                        material.name.toLowerCase().includes((materialSearchInputs[item.id] || '').toLowerCase()) ||
                                        material.category.toLowerCase().includes((materialSearchInputs[item.id] || '').toLowerCase())
                                      )
                                      .slice(0, 5)
                                      .map(material => (
                                        <div
                                          key={material.id}
                                          onMouseDown={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            updateBOQItem(item.id, 'materialId', material.id);
                                            updateBOQItem(item.id, 'materialName', material.name);
                                            setMaterialSearchInputs(prev => ({ ...prev, [item.id]: material.name }));
                                            setShowMaterialDropdowns(prev => ({ ...prev, [item.id]: false }));
                                            setEditingCell(null);
                                          }}
                                          className="px-2 py-1 hover:bg-neutral-medium cursor-pointer text-primary text-xs border-b border-neutral-medium last:border-b-0"
                                        >
                                          <div className="font-medium">{material.name}</div>
                                          <div className="text-xs text-secondary">{material.category} • {material.unit}</div>
                                        </div>
                                      ))}
                                    {availableMaterials.filter(material => 
                                      material.name.toLowerCase().includes((materialSearchInputs[item.id] || '').toLowerCase()) ||
                                      material.category.toLowerCase().includes((materialSearchInputs[item.id] || '').toLowerCase())
                                    ).length === 0 && (
                                      <div className="px-2 py-1 text-secondary text-xs">
                                        No materials found for "{materialSearchInputs[item.id]}"
                                      </div>
                                    )}
                                  </div>
                                )}
                              </>
                            ) : (
                              <div 
                                onClick={() => handleCellClick(item.id, 'materialName')}
                                className="w-full text-xs px-1 py-0.5 text-primary cursor-pointer hover:bg-neutral-medium/30 rounded min-h-[20px]"
                              >
                                {item.materialName || 'Click to select material...'}
                              </div>
                            )}
                          </td>
                          <td className="px-2 py-1 border-r border-neutral-medium">
                            {editingCell?.rowId === item.id && editingCell?.field === 'description' ? (
                              <input
                                type="text"
                                value={item.description}
                                onChange={(e) => updateBOQItem(item.id, 'description', e.target.value)}
                                onBlur={handleCellBlur}
                                onKeyDown={handleCellKeyDown}
                                placeholder="Description"
                                className="w-full text-xs bg-neutral-darker border border-neutral-medium rounded px-1 py-0.5 text-primary"
                                autoFocus
                              />
                            ) : (
                              <div 
                                onClick={() => handleCellClick(item.id, 'description')}
                                className="w-full text-xs px-1 py-0.5 text-primary cursor-pointer hover:bg-neutral-medium/30 rounded min-h-[20px]"
                              >
                                {item.description || 'Click to add description...'}
                              </div>
                            )}
                          </td>
                          <td className="px-1 py-1 border-r border-neutral-medium">
                            {editingCell?.rowId === item.id && editingCell?.field === 'nos' ? (
                              <input
                                type="text"
                                inputMode="numeric"
                                value={item.nos}
                                onChange={(e) => updateBOQItem(item.id, 'nos', e.target.value)}
                                onBlur={handleCellBlur}
                                onKeyDown={handleCellKeyDown}
                                placeholder="Nos"
                                className="w-full text-xs bg-neutral-darker border border-neutral-medium rounded px-1 py-0.5 text-primary text-center"
                                autoFocus
                              />
                            ) : (
                              <div 
                                onClick={() => handleCellClick(item.id, 'nos')}
                                className="w-full text-xs px-1 py-0.5 text-primary cursor-pointer hover:bg-neutral-medium/30 rounded min-h-[20px] text-center"
                              >
                                {item.nos || '1'}
                              </div>
                            )}
                          </td>
                          <td className="px-1 py-1 border-r border-neutral-medium">
                            {editingCell?.rowId === item.id && editingCell?.field === 'length' ? (
                              <input
                                type="text"
                                inputMode="decimal"
                                value={item.length}
                                onChange={(e) => updateBOQItem(item.id, 'length', e.target.value)}
                                onBlur={handleCellBlur}
                                onKeyDown={handleCellKeyDown}
                                placeholder="L"
                                className="w-full text-xs bg-neutral-darker border border-neutral-medium rounded px-1 py-0.5 text-primary text-center"
                                autoFocus
                              />
                            ) : (
                              <div 
                                onClick={() => handleCellClick(item.id, 'length')}
                                className="w-full text-xs px-1 py-0.5 text-primary cursor-pointer hover:bg-neutral-medium/30 rounded min-h-[20px] text-center"
                              >
                                {item.length || '0'}
                              </div>
                            )}
                          </td>
                          <td className="px-1 py-1 border-r border-neutral-medium">
                            {editingCell?.rowId === item.id && editingCell?.field === 'breadth' ? (
                              <input
                                type="text"
                                inputMode="decimal"
                                value={item.breadth}
                                onChange={(e) => updateBOQItem(item.id, 'breadth', e.target.value)}
                                onBlur={handleCellBlur}
                                onKeyDown={handleCellKeyDown}
                                placeholder="B"
                                className="w-full text-xs bg-neutral-darker border border-neutral-medium rounded px-1 py-0.5 text-primary text-center"
                                autoFocus
                              />
                            ) : (
                              <div 
                                onClick={() => handleCellClick(item.id, 'breadth')}
                                className="w-full text-xs px-1 py-0.5 text-primary cursor-pointer hover:bg-neutral-medium/30 rounded min-h-[20px] text-center"
                              >
                                {item.breadth || '0'}
                              </div>
                            )}
                          </td>
                          <td className="px-1 py-1 border-r border-neutral-medium">
                            {editingCell?.rowId === item.id && editingCell?.field === 'height' ? (
                              <input
                                type="text"
                                inputMode="decimal"
                                value={item.height}
                                onChange={(e) => updateBOQItem(item.id, 'height', e.target.value)}
                                onBlur={handleCellBlur}
                                onKeyDown={handleCellKeyDown}
                                placeholder="H"
                                className="w-full text-xs bg-neutral-darker border border-neutral-medium rounded px-1 py-0.5 text-primary text-center"
                                autoFocus
                              />
                            ) : (
                              <div 
                                onClick={() => handleCellClick(item.id, 'height')}
                                className="w-full text-xs px-1 py-0.5 text-primary cursor-pointer hover:bg-neutral-medium/30 rounded min-h-[20px] text-center"
                              >
                                {item.height || '0'}
                              </div>
                            )}
                          </td>
                          <td className="px-1 py-1 border-r border-neutral-medium">
                            {editingCell?.rowId === item.id && editingCell?.field === 'unit' ? (
                              <select
                                value={item.unit}
                                onChange={(e) => {
                                  updateBOQItem(item.id, 'unit', e.target.value);
                                  setEditingCell(null);
                                }}
                                onBlur={handleCellBlur}
                                className="w-full text-xs bg-neutral-darker border border-neutral-medium rounded px-1 py-0.5 text-primary"
                                autoFocus
                              >
                                <option value="">Unit</option>
                                {commonUnits.map(unit => (
                                  <option key={unit} value={unit}>{unit}</option>
                                ))}
                              </select>
                            ) : (
                              <div 
                                onClick={() => handleCellClick(item.id, 'unit')}
                                className="w-full text-xs px-1 py-0.5 text-primary cursor-pointer hover:bg-neutral-medium/30 rounded min-h-[20px] text-center"
                              >
                                {item.unit || 'Unit'}
                              </div>
                            )}
                          </td>
                          <td className="px-2 py-1 border-r border-neutral-medium text-center font-medium text-primary text-xs">
                            {(Number(item.quantity) || 0).toFixed(2)}
                          </td>
                          <td className="px-1 py-1 text-center">
                            <button
                              onClick={() => deleteBOQItem(item.id)}
                              className="text-red-400 hover:text-red-300 text-xs"
                              title="Delete"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={9} className="p-6 text-center text-secondary">
                            No BOQ items yet. Click "Add Row" to get started.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              
              {/* Material Summary Section */}
              {boqItems.length > 0 && (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-primary">Material Summary</h4>
                    {getMaterialSummary().length > 0 && (
                      <div className="flex gap-2">
                        {/* Submit for Verification Button */}
                        {verificationStatus === 'none' && (
                          <button
                            onClick={submitForVerification}
                            disabled={isSubmittingForVerification}
                            className="px-3 py-1.5 text-sm bg-accent-orange text-white rounded-lg hover:bg-accent-orange/80 transition-colors disabled:opacity-50"
                          >
                            {isSubmittingForVerification ? 'Submitting...' : 'Submit for Verification'}
                          </button>
                        )}
                        
                        {/* Verification Status Badge */}
                        {verificationStatus !== 'none' && (
                          <span className={`px-3 py-1.5 text-sm rounded-lg border ${
                            verificationStatus === 'pending' ? 'text-yellow-600 bg-yellow-100 border-yellow-300' :
                            verificationStatus === 'verified' ? 'text-green-600 bg-green-100 border-green-300' :
                            verificationStatus === 'disputed' ? 'text-red-600 bg-red-100 border-red-300' :
                            verificationStatus === 'revision_required' ? 'text-orange-600 bg-orange-100 border-orange-300' :
                            'text-gray-600 bg-gray-100 border-gray-300'
                          }`}>
                            {(() => {
                              switch (verificationStatus) {
                                case 'pending': return 'Verification Pending';
                                case 'verified': return 'Verified ✅';
                                case 'disputed': return 'Disputed ❌';
                                case 'revision_required': return 'Revision Required ⚠️';
                                case 'none': return 'Not Submitted';
                                default: return 'Unknown Status';
                              }
                            })()}
                          </span>
                        )}

                        {/* Export to Project Button - Only enabled when verified */}
                        <button
                          onClick={exportSummaryToProject}
                          disabled={verificationStatus !== 'verified'}
                          className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                            verificationStatus === 'verified'
                              ? 'bg-blue-600 text-white hover:bg-blue-700'
                              : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                          }`}
                          title={verificationStatus !== 'verified' ? 'Materials must be verified before export' : 'Export to Project'}
                        >
                          Export to Project
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="bg-neutral-darker border border-neutral-medium rounded-lg overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-neutral-medium">
                        <tr>
                          <th className="px-3 py-2 text-left text-primary border-r border-neutral-light">Material</th>
                          <th className="px-2 py-2 text-center text-primary border-r border-neutral-light">Total Qty</th>
                          <th className="px-2 py-2 text-center text-primary border-r border-neutral-light">Unit</th>
                          <th className="px-2 py-2 text-center text-primary border-r border-neutral-light">Items</th>
                          <th className="px-2 py-2 text-left text-primary">Used In</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getMaterialSummary().map((summary, index) => (
                          <tr key={summary.materialId} className="border-b border-neutral-medium hover:bg-neutral-medium/30">
                            <td className="px-3 py-2 text-primary font-medium border-r border-neutral-medium">
                              {summary.materialName}
                            </td>
                            <td className="px-2 py-2 text-center font-bold text-accent-orange border-r border-neutral-medium">
                              {summary.totalQuantity.toFixed(2)}
                            </td>
                            <td className="px-2 py-2 text-center text-secondary border-r border-neutral-medium">
                              {summary.unit}
                            </td>
                            <td className="px-2 py-2 text-center text-secondary border-r border-neutral-medium">
                              {summary.itemCount}
                            </td>
                            <td className="px-2 py-2 text-secondary text-xs">
                              {summary.descriptions.length > 0 
                                ? summary.descriptions.slice(0, 3).join(', ') + (summary.descriptions.length > 3 ? '...' : '')
                                : '-'
                              }
                            </td>
                          </tr>
                        ))}
                        {getMaterialSummary().length === 0 && (
                          <tr>
                            <td colSpan={5} className="p-4 text-center text-secondary">
                              No materials with quantities found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Verification Info Notice */}
                  {verificationStatus === 'none' && getMaterialSummary().length > 0 && (
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-start">
                        <div className="text-blue-500 mr-2">ℹ️</div>
                        <div>
                          <h5 className="text-sm font-medium text-blue-900 mb-1">Verification Required</h5>
                          <p className="text-xs text-blue-800">
                            Submit your quantity takeoff for admin verification before exporting to project materials. 
                            This ensures accuracy and prevents overordering.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {verificationStatus === 'pending' && (
                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-start">
                        <div className="text-yellow-500 mr-2">⏳</div>
                        <div>
                          <h5 className="text-sm font-medium text-yellow-900 mb-1">Verification in Progress</h5>
                          <p className="text-xs text-yellow-800">
                            Your takeoff has been submitted for verification. You'll be notified once the admin team completes the review.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {verificationStatus === 'disputed' && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-start">
                        <div className="text-red-500 mr-2">❌</div>
                        <div>
                          <h5 className="text-sm font-medium text-red-900 mb-1">Verification Disputed</h5>
                          <p className="text-xs text-red-800">
                            The admin team has disputed some quantities. Please review their notes and resubmit.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {verificationStatus === 'revision_required' && (
                    <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <div className="flex items-start">
                        <div className="text-orange-500 mr-2">⚠️</div>
                        <div>
                          <h5 className="text-sm font-medium text-orange-900 mb-1">Revision Required</h5>
                          <p className="text-xs text-orange-800">
                            The admin team has requested revisions to your takeoff. Please review their feedback and update accordingly.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {verificationStatus === 'verified' && (
                    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-start">
                        <div className="text-green-500 mr-2">✅</div>
                        <div>
                          <h5 className="text-sm font-medium text-green-900 mb-1">Verification Complete</h5>
                          <p className="text-xs text-green-800">
                            Your takeoff has been verified and approved by the admin team. You can now export to project materials.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

        {/* Drawing Panel - Right Side */}
        <div 
          className="flex flex-col bg-white"
          style={{ width: `${100 - splitPercentage}%` }}
        >
          <div className="h-full">
            <iframe
              src={`${fileUrl}#toolbar=1&navpanes=1&scrollbar=1&page=1&zoom=page-fit`}
              width="100%"
              height="100%"
              className="border-0"
              title={fileName || 'PDF Document'}
            />
          </div>
        </div>
      </div>
      
      {/* Vertical Resize Handle */}
      <div className="h-4 bg-neutral-medium relative flex items-center cursor-row-resize">
        <div 
          className={`w-full h-1 bg-accent-orange hover:bg-accent-amber transition-colors ${
            isVerticalDragging ? 'bg-accent-orange' : ''
          }`}
          onMouseDown={(e) => {
            setIsVerticalDragging(true);
            const startY = e.clientY;
            const startHeight = sectionHeight;
            
            const handleMouseMove = (e: MouseEvent) => {
              const deltaY = e.clientY - startY;
              const newHeight = Math.min(Math.max(startHeight + deltaY, 400), 1200);
              console.log('Resizing section height:', newHeight); // Debug log
              setSectionHeight(newHeight);
            };
            
            const handleMouseUp = () => {
              setIsVerticalDragging(false);
              document.removeEventListener('mousemove', handleMouseMove);
              document.removeEventListener('mouseup', handleMouseUp);
            };
            
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
          }}
        />
        <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-[10px] text-white opacity-70 pointer-events-none select-none">
          Drag to resize section height
        </span>
      </div>
      
      {/* Bottom Section - AI Analysis */}
      <div className="border-t border-neutral-medium p-4">
        <h4 className="text-sm font-medium text-primary mb-4">AI Analysis Report</h4>
        <div style={{ height: '300px' }} className="bg-neutral-darker border border-neutral-medium rounded-lg overflow-auto">
          {aiAnalysisResults.length > 0 && aiAnalysisResults[0]?.analysisReport ? (
            <div className="p-4">
              <pre className="text-sm text-primary whitespace-pre-wrap font-mono leading-relaxed">
                {aiAnalysisResults[0].analysisReport}
              </pre>
            </div>
          ) : (
            <div className="p-6 text-center text-secondary">
              <div className="text-3xl mb-3">📋</div>
              <h3 className="text-base font-semibold text-primary mb-2">No Analysis Report</h3>
              <p className="text-sm">Click "Analyze Drawing" to generate an AI analysis report.</p>
            </div>
          )}
        </div>
      </div>

      {/* AI Analysis Context Form */}
      {showAIForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium max-w-lg w-full mx-4">
            <h3 className="text-lg font-semibold text-primary mb-4">
              Drawing Analysis Setup
            </h3>
            <p className="text-sm text-secondary mb-6">
              Provide project context to help the AI analyze the drawing and extract BOQ items accurately.
            </p>
            
            <div className="space-y-4">
              {/* Project Type */}
              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  Project Type *
                </label>
                <select
                  value={aiContext.projectType}
                  onChange={(e) => setAiContext(prev => ({ ...prev, projectType: e.target.value }))}
                  className="w-full px-3 py-2 bg-neutral-darker border border-neutral-medium rounded-lg text-primary"
                >
                  <option value="">Select project type</option>
                  <option value="Road Works">Road Works</option>
                  <option value="Earthworks">Earthworks</option>
                  <option value="Civil Works">Civil Works</option>
                  <option value="Fabrication Works">Fabrication Works</option>
                </select>
              </div>

              {/* Expected Materials */}
              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  Expected Materials
                </label>
                <div className="space-y-2">
                  <div className="flex gap-2 relative material-search-container">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={materialInput}
                        onChange={(e) => {
                          setMaterialInput(e.target.value);
                          setShowMaterialSuggestions(true);
                        }}
                        onFocus={() => setShowMaterialSuggestions(true)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && materialInput.trim()) {
                            e.preventDefault();
                            setAiContext(prev => ({
                              ...prev,
                              expectedMaterials: [...prev.expectedMaterials, materialInput.trim()]
                            }));
                            setMaterialInput('');
                            setShowMaterialSuggestions(false);
                          }
                          if (e.key === 'Escape') {
                            setShowMaterialSuggestions(false);
                          }
                        }}
                        placeholder="Search available materials or type custom..."
                        className="w-full px-3 py-2 bg-neutral-darker border border-neutral-medium rounded-lg text-primary text-sm"
                      />
                      
                      {/* Material Suggestions Dropdown */}
                      {showMaterialSuggestions && materialInput && (
                        <div className="absolute top-full left-0 right-0 bg-neutral-darker border border-neutral-medium rounded-lg mt-1 max-h-48 overflow-y-auto z-50 shadow-lg">
                          {availableMaterials
                            .filter(material => 
                              material.name.toLowerCase().includes(materialInput.toLowerCase()) ||
                              material.category.toLowerCase().includes(materialInput.toLowerCase())
                            )
                            .slice(0, 10)
                            .map(material => (
                              <div
                                key={material.id}
                                onClick={() => {
                                  setAiContext(prev => ({
                                    ...prev,
                                    expectedMaterials: [...prev.expectedMaterials, material.name]
                                  }));
                                  setMaterialInput('');
                                  setShowMaterialSuggestions(false);
                                }}
                                className="px-3 py-2 hover:bg-neutral-medium cursor-pointer text-primary text-sm border-b border-neutral-medium last:border-b-0"
                              >
                                <div className="font-medium">{material.name}</div>
                                <div className="text-xs text-secondary">{material.category} • {material.unit}</div>
                              </div>
                            ))}
                          {availableMaterials.filter(material => 
                            material.name.toLowerCase().includes(materialInput.toLowerCase()) ||
                            material.category.toLowerCase().includes(materialInput.toLowerCase())
                          ).length === 0 && (
                            <div className="px-3 py-2 text-secondary text-sm">
                              No materials found. Press Enter to add "{materialInput}" as custom material.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        if (materialInput.trim()) {
                          setAiContext(prev => ({
                            ...prev,
                            expectedMaterials: [...prev.expectedMaterials, materialInput.trim()]
                          }));
                          setMaterialInput('');
                          setShowMaterialSuggestions(false);
                        }
                      }}
                      className="px-3 py-2 bg-accent-amber text-neutral-dark rounded-lg hover:bg-accent-amber/80 text-sm"
                    >
                      Add
                    </button>
                  </div>
                  
                  {/* Material Tags */}
                  {aiContext.expectedMaterials.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {aiContext.expectedMaterials.map((material, index) => (
                        <span
                          key={index}
                          className="bg-accent-amber/20 text-accent-amber px-2 py-1 rounded text-xs flex items-center gap-1"
                        >
                          {material}
                          <button
                            onClick={() => {
                              setAiContext(prev => ({
                                ...prev,
                                expectedMaterials: prev.expectedMaterials.filter((_, i) => i !== index)
                              }));
                            }}
                            className="hover:text-red-400"
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-secondary">
                    Press Enter or click Add to include materials. AI will focus on these items.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAIForm(false)}
                className="flex-1 px-4 py-2 bg-neutral-medium text-primary rounded-lg hover:bg-neutral-light transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!aiContext.projectType) {
                    alert('Please select a project type');
                    return;
                  }
                  setShowAIForm(false);
                  runAIAnalysis();
                }}
                className="flex-1 px-4 py-2 bg-accent-orange text-white rounded-lg hover:bg-accent-orange/80 transition-colors"
              >
                Analyze Drawing
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
