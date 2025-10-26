'use client';

import React, { useState, useRef, useEffect } from 'react';

interface QuantityTakeoffViewerProps {
  fileUrl: string;
  fileName?: string;
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
  location: Point;
  notes?: string;
}

const MATERIAL_TEMPLATES = {
  concrete: {
    name: 'Concrete',
    fields: ['length', 'width', 'thickness'],
    unit: 'm³',
    calculation: (dims: any) => (dims.length || 0) * (dims.width || 0) * (dims.thickness || 0)
  },
  rebar: {
    name: 'Rebar',
    fields: ['length', 'diameter'],
    unit: 'kg',
    calculation: (dims: any) => {
      const volume = Math.PI * Math.pow((dims.diameter || 12) / 1000 / 2, 2) * (dims.length || 0);
      return volume * 7850; // Steel density
    }
  },
  steel_sections: {
    name: 'Steel Sections',
    fields: ['length', 'weight'],
    unit: 'kg',
    calculation: (dims: any) => (dims.length || 0) * (dims.weight || 0) // weight per meter * length
  },
  masonry: {
    name: 'Masonry',
    fields: ['length', 'height', 'thickness'],
    unit: 'm²',
    calculation: (dims: any) => (dims.length || 0) * (dims.height || 0)
  },
  flooring: {
    name: 'Flooring',
    fields: ['length', 'width'],
    unit: 'm²',
    calculation: (dims: any) => (dims.length || 0) * (dims.width || 0)
  },
  roofing: {
    name: 'Roofing',
    fields: ['length', 'width'],
    unit: 'm²',
    calculation: (dims: any) => (dims.length || 0) * (dims.width || 0) * 1.1 // 10% extra for slope
  },
  custom: {
    name: 'Custom',
    fields: ['area', 'volume'],
    unit: 'units',
    calculation: (dims: any) => dims.quantity || 1
  }
};

export default function QuantityTakeoffViewer({ fileUrl, fileName, onError }: QuantityTakeoffViewerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Takeoff state
  const [boqItems, setBOQItems] = useState<BOQItem[]>([]);
  const [availableMaterials, setAvailableMaterials] = useState<Material[]>([]);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  // Fetch available materials
  useEffect(() => {
    const fetchMaterials = async () => {
      try {
        console.log('Fetching materials...');
        const response = await fetch('/api/materials');
        console.log('Materials response:', response.status);
        if (response.ok) {
          const data = await response.json();
          console.log('Materials data:', data);
          setAvailableMaterials(data.data || []);
        } else {
          console.error('Failed to fetch materials:', response.status, response.statusText);
        }
      } catch (error) {
        console.error('Failed to fetch materials:', error);
      }
    };
    fetchMaterials();
  }, []);


  const handleLoad = () => {
    setLoading(false);
    setError(null);
  };

  const handleError = () => {
    const errorMsg = 'Failed to load drawing';
    setError(errorMsg);
    setLoading(false);
    onError?.(new Error(errorMsg));
  };

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resizeCanvas = () => {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      redrawItems();
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [loading, materialItems]);

  // Handle canvas click to add items
  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isAddingItem) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const point: Point = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };

    // Add visual feedback for click
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(point.x, point.y, 12, 0, 2 * Math.PI);
      ctx.fill();
      
      // Add a temporary pulse effect
      setTimeout(() => redrawItems(), 500);
    }

    setCurrentLocation(point);
    setShowAddForm(true);
    setIsAddingItem(false);
  };

  // Calculate quantity based on template
  const calculateQuantity = (template: keyof typeof MATERIAL_TEMPLATES, dimensions: any): number => {
    const calc = MATERIAL_TEMPLATES[template].calculation;
    return calc(dimensions);
  };

  // Add new material item
  const addMaterialItem = () => {
    const selectedMaterial = availableMaterials.find(m => m.id === selectedMaterialId);
    
    if (!selectedMaterial) {
      alert('Please select a material first');
      return;
    }

    // Use the selected material with manually entered quantity and count
    const baseQuantity = parseFloat(formData.area || '1');
    const count = parseInt(formData.length || '1');
    const totalQuantity = baseQuantity * count;
    
    const newItem: MaterialItem = {
      id: Date.now().toString(),
      type: 'custom', // Default type since we removed templates
      materialId: selectedMaterial.id,
      materialName: selectedMaterial.name,
      description: formData.description || selectedMaterial.name,
      dimensions: {}, // Not used for existing materials
      unit: selectedMaterial.unit,
      quantity: manualQuantity || 1,
      location: currentLocation,
      notes: formData.notes
    };

    setMaterialItems(prev => [...prev, newItem]);
    setShowAddForm(false);
    resetForm();
    redrawItems();
  };

  const resetForm = () => {
    setFormData({
      description: '',
      length: '',
      width: '',
      height: '',
      thickness: '',
      diameter: '',
      weight: '',
      area: '',
      volume: '',
      notes: ''
    });
    setSelectedMaterialId('');
    setMaterialSearch('');
  };

  // Delete material item
  const deleteMaterialItem = (id: string) => {
    setMaterialItems(prev => prev.filter(item => item.id !== id));
    setTimeout(redrawItems, 0);
  };

  // Redraw all items on canvas
  const redrawItems = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw material items
    materialItems.forEach((item, index) => {
      const template = MATERIAL_TEMPLATES[item.type];
      
      // Draw marker
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(item.location.x, item.location.y, 8, 0, 2 * Math.PI);
      ctx.fill();

      // Draw number
      ctx.fillStyle = '#000';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText((index + 1).toString(), item.location.x, item.location.y + 4);

      // Draw label
      ctx.fillStyle = '#f59e0b';
      ctx.font = '11px Arial';
      ctx.textAlign = 'left';
      const labelText = `${item.quantity.toFixed(2)} ${item.unit}`;
      ctx.fillText(labelText, item.location.x + 15, item.location.y + 4);
    });
  };

  // Export to material requests
  const exportToMaterials = async () => {
    if (materialItems.length === 0) {
      alert('No materials to export');
      return;
    }

    const existingMaterialItems = materialItems.filter(item => item.materialId);
    const calculatedItems = materialItems.filter(item => !item.materialId);

    if (existingMaterialItems.length === 0 && calculatedItems.length === 0) {
      alert('No materials to export');
      return;
    }

    // Show summary and ask for confirmation
    const message = `Export summary:
• ${existingMaterialItems.length} items from existing materials
• ${calculatedItems.length} new calculated materials

Continue with export?`;

    if (!confirm(message)) return;

    try {
      // Update existing material quantities (if we had a batch update API)
      if (existingMaterialItems.length > 0) {
        console.log('Existing materials to update:', existingMaterialItems.map(item => ({
          materialId: item.materialId,
          quantity: item.quantity,
          notes: `From takeoff: ${item.notes || 'Drawing analysis'}`
        })));
      }

      // Create new material requests for calculated items
      if (calculatedItems.length > 0) {
        const categoryMap: Record<string, string> = {
          concrete: 'Concrete',
          rebar: 'Steel/Metal', 
          steel_sections: 'Steel/Metal',
          masonry: 'Masonry',
          flooring: 'Flooring',
          roofing: 'Roofing',
          custom: 'Other'
        };

        const requests = calculatedItems.map(item => {
          const template = MATERIAL_TEMPLATES[item.type];
          const dimensionsText = Object.entries(item.dimensions)
            .filter(([_, value]) => value && value > 0)
            .map(([key, value]) => `${key}: ${value}`)
            .join(', ');

          return {
            name: `${template.name} - ${item.description}`,
            description: `Quantity takeoff from ${fileName || 'drawing'}. Material: ${template.name}. Dimensions: ${dimensionsText}. Notes: ${item.notes || 'None'}. Quantity: ${item.quantity} ${item.unit}`,
            category: categoryMap[item.type] || 'Other',
            unit: item.unit,
            project_context: `Generated from quantity takeoff analysis of ${fileName}. Material: ${template.name}. Calculated quantity: ${item.quantity} ${item.unit}. Dimensions: ${dimensionsText}`,
            urgency: 'normal'
          };
        });

        const results = await Promise.allSettled(
          requests.map(async (request) => {
            const response = await fetch('/api/materials', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(request)
            });

            if (!response.ok) {
              const error = await response.json();
              throw new Error(error.error || 'Failed to create material request');
            }

            return await response.json();
          })
        );

        const successful = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;

        if (successful > 0) {
          alert(`Successfully created ${successful} material requests! ${failed > 0 ? `${failed} failed.` : ''}${existingMaterialItems.length > 0 ? `\n\nNote: ${existingMaterialItems.length} existing materials were logged for manual review.` : ''}`);
          setMaterialItems([]);
          redrawItems();
        } else {
          const errorMessages = results
            .filter(r => r.status === 'rejected')
            .map(r => (r as PromiseRejectedResult).reason.message)
            .join(', ');
          alert(`Failed to create material requests: ${errorMessages}`);
        }
      } else {
        alert(`Logged ${existingMaterialItems.length} existing material quantities for manual review.`);
        setMaterialItems([]);
        redrawItems();
      }

    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export materials. Please try again.');
    }
  };

  if (error) {
    return (
      <div className="bg-neutral-dark rounded-lg border border-neutral-medium p-6">
        <div className="text-center">
          <div className="text-4xl mb-4">❌</div>
          <h3 className="text-lg font-semibold text-primary mb-2">Error Loading Drawing</h3>
          <p className="text-secondary text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-neutral-dark rounded-lg border border-neutral-medium h-full flex flex-col">
      {/* Toolbar */}
      <div className="border-b border-neutral-medium p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h3 className="text-lg font-semibold text-primary">
              {fileName || 'Quantity Takeoff'}
            </h3>
            <p className="text-sm text-secondary">
              Click on drawing elements to add material quantities
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative min-w-[250px] material-dropdown-container">
              <input
                type="text"
                value={materialSearch}
                onChange={(e) => {
                  setMaterialSearch(e.target.value);
                  setShowMaterialDropdown(true);
                }}
                onFocus={() => setShowMaterialDropdown(true)}
                placeholder="Search materials..."
                className="w-full px-3 py-2 bg-neutral-darker border border-neutral-medium rounded-lg text-primary text-sm"
              />
              
              {showMaterialDropdown && (
                <div className="absolute top-full left-0 right-0 bg-neutral-darker border border-neutral-medium rounded-lg mt-1 max-h-48 overflow-y-auto z-50">
                  {availableMaterials
                    .filter(material => 
                      material.name.toLowerCase().includes(materialSearch.toLowerCase()) ||
                      material.category.toLowerCase().includes(materialSearch.toLowerCase())
                    )
                    .slice(0, 10)
                    .map(material => (
                      <div
                        key={material.id}
                        onMouseDown={() => {
                          console.log('Selected material:', material.id, material.name);
                          setSelectedMaterialId(material.id);
                          setMaterialSearch(`${material.name} (${material.unit})`);
                          setShowMaterialDropdown(false);
                        }}
                        className="px-3 py-2 hover:bg-neutral-medium cursor-pointer text-primary text-sm border-b border-neutral-medium last:border-b-0"
                      >
                        <div className="font-medium">{material.name}</div>
                        <div className="text-xs text-secondary">{material.category} • {material.unit}</div>
                      </div>
                    ))}
                  {availableMaterials.filter(material => 
                    material.name.toLowerCase().includes(materialSearch.toLowerCase()) ||
                    material.category.toLowerCase().includes(materialSearch.toLowerCase())
                  ).length === 0 && (
                    <div className="px-3 py-2 text-secondary text-sm">No materials found</div>
                  )}
                </div>
              )}
            </div>
            
            <button
              onClick={() => setIsAddingItem(true)}
              className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                isAddingItem 
                  ? 'bg-accent-amber text-neutral-dark' 
                  : 'bg-accent-amber text-neutral-dark hover:bg-accent-amber/80'
              }`}
            >
              {isAddingItem ? 'Click on drawing...' : '+ Add Item'}
            </button>

            {materialItems.length > 0 && (
              <button
                onClick={exportToMaterials}
                className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                📤 Export ({materialItems.length})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex">
        {/* Drawing area */}
        <div className="flex-1 relative">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-neutral-dark/80 z-10">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-accent-amber mb-4"></div>
                <p className="text-secondary">Loading drawing...</p>
              </div>
            </div>
          )}

          <div ref={containerRef} className="w-full h-full relative">
            <iframe
              src={`${fileUrl}#toolbar=1&navpanes=0&scrollbar=1&page=1&zoom=page-fit`}
              width="100%"
              height="100%"
              className="border-0"
              onLoad={handleLoad}
              onError={handleError}
              title={fileName || 'Drawing'}
            />
            
            {/* Overlay canvas for markers */}
            <canvas
              ref={canvasRef}
              className={`absolute top-0 left-0 ${isAddingItem ? 'cursor-crosshair' : 'cursor-default'}`}
              onClick={handleCanvasClick}
              style={{ 
                pointerEvents: isAddingItem ? 'auto' : 'none',
                background: isAddingItem ? 'rgba(245, 158, 11, 0.02)' : 'transparent'
              }}
            />
            
            {/* Add item mode indicator */}
            {isAddingItem && (
              <div className="absolute top-4 left-4 bg-accent-amber text-neutral-dark px-3 py-2 rounded-lg text-sm font-medium shadow-lg z-10">
                Click to place {MATERIAL_TEMPLATES[selectedTemplate].name}
              </div>
            )}
          </div>
        </div>

        {/* Takeoff panel */}
        <div className="w-80 border-l border-neutral-medium p-4 overflow-y-auto">
          <h4 className="text-lg font-semibold text-primary mb-4">Material Takeoff</h4>
          
          <div className="space-y-3">
            {materialItems.map((item, index) => {
              const template = MATERIAL_TEMPLATES[item.type];
              return (
                <div key={item.id} className="bg-neutral-medium p-3 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-primary mb-1">
                        {index + 1}. {item.description}
                      </div>
                      <div className="text-xs text-secondary mb-2">
                        {Object.entries(item.dimensions).map(([key, value]) => (
                          <span key={key} className="mr-3">
                            {key}: {value}
                          </span>
                        ))}
                      </div>
                      <div className="text-sm font-semibold text-accent-amber">
                        {item.quantity.toFixed(2)} {item.unit}
                      </div>
                      {item.notes && (
                        <div className="text-xs text-secondary mt-1">
                          Note: {item.notes}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => deleteMaterialItem(item.id)}
                      className="text-red-400 hover:text-red-300 text-sm ml-2"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}

            {materialItems.length === 0 && (
              <div className="text-center py-8">
                <p className="text-secondary text-sm">
                  No items added yet. Select a material type and click "Add Item" to start.
                </p>
              </div>
            )}
          </div>

          {/* Quick totals */}
          {materialItems.length > 0 && (
            <div className="mt-6 p-3 bg-neutral-darker rounded-lg">
              <h5 className="text-sm font-semibold text-primary mb-2">Summary</h5>
              <div className="text-xs text-secondary space-y-1">
                <div>Total Items: {materialItems.length}</div>
                <div>Concrete: {materialItems.filter(i => i.type === 'concrete').reduce((sum, i) => sum + i.quantity, 0).toFixed(2)} m³</div>
                <div>Rebar: {materialItems.filter(i => i.type === 'rebar').reduce((sum, i) => sum + i.quantity, 0).toFixed(0)} kg</div>
                <div>Steel Sections: {materialItems.filter(i => i.type === 'steel_sections').reduce((sum, i) => sum + i.quantity, 0).toFixed(0)} kg</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Item Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-primary mb-4">
              Add Material Item
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-primary mb-1">Selected Material</label>
                <div className="px-3 py-2 bg-neutral-medium rounded-lg text-primary text-sm">
                  {availableMaterials.find(m => m.id === selectedMaterialId)?.name || `No material selected (ID: ${selectedMaterialId}, Available: ${availableMaterials.length})`}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-1">Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Optional description"
                  className="w-full px-3 py-2 bg-neutral-darker border border-neutral-medium rounded-lg text-primary text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-primary mb-1">Quantity</label>
                  <div className="flex">
                    <input
                      type="number"
                      step="0.01"
                      value={formData.area}
                      onChange={(e) => setFormData(prev => ({ ...prev, area: e.target.value }))}
                      placeholder="0.00"
                      className="flex-1 px-3 py-2 bg-neutral-darker border border-neutral-medium rounded-l-lg text-primary text-sm"
                    />
                    <div className="px-3 py-2 bg-neutral-medium border border-l-0 border-neutral-medium rounded-r-lg text-primary text-sm min-w-[50px] flex items-center justify-center">
                      {availableMaterials.find(m => m.id === selectedMaterialId)?.unit || 'units'}
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-primary mb-1">Count</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={formData.length}
                    onChange={(e) => setFormData(prev => ({ ...prev, length: e.target.value }))}
                    placeholder="1"
                    className="w-full px-3 py-2 bg-neutral-darker border border-neutral-medium rounded-lg text-primary text-sm"
                  />
                  <p className="text-xs text-secondary mt-1">Number of instances</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-1">Notes (optional)</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes..."
                  className="w-full px-3 py-2 bg-neutral-darker border border-neutral-medium rounded-lg text-primary text-sm h-20 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={addMaterialItem}
                disabled={!formData.description}
                className="flex-1 bg-accent-amber text-neutral-dark py-2 rounded-lg hover:bg-accent-amber/80 disabled:opacity-50 text-sm"
              >
                Add Item
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  resetForm();
                }}
                className="flex-1 bg-neutral-medium text-primary py-2 rounded-lg hover:bg-neutral-light text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}