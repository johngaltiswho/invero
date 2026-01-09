'use client';

import { useState, useEffect } from 'react';
import { getBOQByProjectId, deleteBOQ, saveBOQToSupabase } from '@/lib/supabase-boq';

interface BOQDisplayProps {
  projectId: string;
  isEditable?: boolean;
  onSaveSuccess?: () => void;
}

interface BOQData {
  id: string;
  file_name: string;
  total_amount: number;
  upload_date: string;
  boq_items: {
    description: string;
    unit: string;
    quantity?: number; // Old format - for backward compatibility
    quantity_text?: string; // New format
    quantity_numeric?: number | null; // New format  
    rate: number;
    amount: number;
    category?: string | null; // For identifying headers
  }[];
}

export default function BOQDisplay({ projectId, isEditable = false, onSaveSuccess }: BOQDisplayProps) {
  const [boqData, setBOQData] = useState<BOQData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editedData, setEditedData] = useState<BOQData[]>([]);
  const [editingCell, setEditingCell] = useState<{boqIndex: number, itemIndex: number, field: string} | null>(null);
  const [tempValue, setTempValue] = useState('');

  useEffect(() => {
    loadBOQData();
  }, [projectId]);

  // Sync edited data with loaded data only when entering edit mode
  useEffect(() => {
    if (isEditable && boqData.length > 0) {
      setEditedData([...boqData.map(boq => ({
        ...boq,
        boq_items: [...boq.boq_items]
      }))]); // Shallow copy that preserves order
    }
  }, [isEditable, boqData]);

  const loadBOQData = async () => {
    try {
      setLoading(true);
      const data = await getBOQByProjectId(projectId);
      setBOQData(data || []);
    } catch (err) {
      setError('Failed to load BOQ data');
      console.error('Error loading BOQ:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  const handleDeleteBOQ = async (boqId: string, fileName: string) => {
    if (!confirm(`Are you sure you want to delete the BOQ "${fileName}"? This action cannot be undone and will delete all associated line items.`)) {
      return;
    }

    setDeletingId(boqId);
    
    try {
      await deleteBOQ(boqId);
      // Reload BOQ data after successful deletion
      await loadBOQData();
    } catch (error) {
      console.error('Error deleting BOQ:', error);
      setError('Failed to delete BOQ. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  // Update item in edited data
  const updateItem = (boqIndex: number, itemIndex: number, field: string, value: string | number) => {
    const newEditedData = [...editedData];
    const item = newEditedData[boqIndex].boq_items[itemIndex];
    
    if (field === 'description') {
      item.description = value as string;
    } else if (field === 'unit') {
      item.unit = value as string;
    } else if (field === 'quantity') {
      const numValue = parseFloat(value as string) || 0;
      item.quantity_numeric = numValue;
      // Auto-calculate amount
      item.amount = numValue * item.rate;
    } else if (field === 'rate') {
      const numValue = parseFloat(value as string) || 0;
      item.rate = numValue;
      // Auto-calculate amount
      const qty = item.quantity_numeric || item.quantity || 0;
      item.amount = qty * numValue;
    } else if (field === 'amount') {
      item.amount = parseFloat(value as string) || 0;
    }
    
    setEditedData(newEditedData);
  };

  // Start editing a cell
  const startEditing = (boqIndex: number, itemIndex: number, field: string) => {
    if (!isEditable) return;
    
    const item = editedData[boqIndex]?.boq_items[itemIndex];
    if (!item) return;
    
    // Don't edit headers or amount (calculated field)
    const isHeader = item.category === 'HEADER' || (item.quantity_text === 'HEADER');
    if (isHeader || field === 'amount') return;
    
    setEditingCell({ boqIndex, itemIndex, field });
    
    // Set initial value
    if (field === 'description') {
      setTempValue(item.description || '');
    } else if (field === 'unit') {
      setTempValue(item.unit || '');
    } else if (field === 'quantity') {
      setTempValue(String(item.quantity_numeric || item.quantity || 0));
    } else if (field === 'rate') {
      setTempValue(String(item.rate || 0));
    }
  };

  // Save cell edit
  const saveCellEdit = () => {
    if (!editingCell) return;
    
    updateItem(editingCell.boqIndex, editingCell.itemIndex, editingCell.field, tempValue);
    setEditingCell(null);
    setTempValue('');
  };

  // Cancel cell edit
  const cancelCellEdit = () => {
    setEditingCell(null);
    setTempValue('');
  };

  // Handle key press in input
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveCellEdit();
    } else if (e.key === 'Escape') {
      cancelCellEdit();
    }
  };

  // Save changes
  const handleSave = async () => {
    if (!editedData.length) return;
    
    setSaving(true);
    try {
      // Use the latest BOQ data
      const latestBOQ = editedData[0];
      const totalAmount = latestBOQ.boq_items.reduce((sum, item) => sum + (item.amount || 0), 0);
      
      const boqToSave = {
        projectId,
        contractorId: '', // This should be passed as prop or retrieved
        uploadDate: new Date().toISOString(),
        items: latestBOQ.boq_items.map(item => ({
          description: item.description,
          unit: item.unit,
          quantity: item.quantity_numeric || item.quantity || 0,
          rate: item.rate,
          amount: item.amount
        })),
        totalAmount,
        calculatedAmount: totalAmount,
        fileName: latestBOQ.file_name,
        hasDiscrepancies: false
      };
      
      await saveBOQToSupabase(boqToSave);
      if (onSaveSuccess) onSaveSuccess();
    } catch (error) {
      console.error('Error saving BOQ:', error);
      alert('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium">
        <div className="animate-pulse">
          <div className="h-4 bg-neutral-medium rounded w-1/4 mb-4"></div>
          <div className="space-y-2">
            <div className="h-4 bg-neutral-medium rounded"></div>
            <div className="h-4 bg-neutral-medium rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium">
        <div className="text-error">{error}</div>
      </div>
    );
  }

  if (boqData.length === 0) {
    return (
      <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium">
        <h3 className="text-lg font-semibold mb-4 text-primary">Bill of Quantities (BOQ)</h3>
        <p className="text-secondary">No BOQ uploaded yet</p>
      </div>
    );
  }

  const dataToRender = isEditable ? editedData : boqData;

  return (
    <div className="space-y-6">
      {isEditable && (
        <div className="bg-neutral-dark p-4 rounded-lg border border-accent-blue">
          <div className="flex justify-between items-center">
            <div>
              <span className="text-sm text-accent-blue font-medium">✏️ Edit Mode</span>
              <p className="text-xs text-secondary mt-1">Click any cell to edit. Press Enter to save, Escape to cancel.</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  if (onSaveSuccess) onSaveSuccess();
                }}
                className="px-4 py-2 bg-neutral-medium text-primary rounded-lg hover:bg-neutral-medium/80 transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-accent-amber text-neutral-dark rounded-lg hover:bg-accent-amber/90 transition-colors text-sm font-medium disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
      {dataToRender.map((boq, boqIndex) => (
        <div key={boq.id} className="bg-neutral-dark rounded-lg border border-neutral-medium">
          <div className="p-6 border-b border-neutral-medium">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-semibold text-primary">Bill of Quantities (BOQ)</h3>
                {boqData.length > 1 && (
                  <span className="text-xs text-secondary">Version {boqData.length - boqIndex}</span>
                )}
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-sm text-secondary text-right">
                  <p>File: <span className="text-primary">{boq.file_name}</span></p>
                  <p>Uploaded: <span className="text-primary">{formatDate(boq.upload_date)}</span></p>
                </div>
                <button
                  onClick={() => handleDeleteBOQ(boq.id, boq.file_name)}
                  disabled={deletingId === boq.id}
                  className="px-3 py-1 text-xs font-medium text-error hover:text-error/80 hover:bg-error/10 rounded border border-error/20 hover:border-error/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Delete this BOQ version"
                >
                  {deletingId === boq.id ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto border-collapse">
                <thead>
                  <tr className="bg-neutral-darker">
                    <th className="border border-neutral-medium px-4 py-3 text-left text-sm font-medium text-secondary">Description</th>
                    <th className="border border-neutral-medium px-4 py-3 text-left text-sm font-medium text-secondary">Unit</th>
                    <th className="border border-neutral-medium px-4 py-3 text-right text-sm font-medium text-secondary">Quantity</th>
                    <th className="border border-neutral-medium px-4 py-3 text-right text-sm font-medium text-secondary">Rate</th>
                    <th className="border border-neutral-medium px-4 py-3 text-right text-sm font-medium text-secondary">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {boq.boq_items.map((item, index) => {
                    const isHeader = item.category === 'HEADER' || (item.quantity_text === 'HEADER');
                    return (
                    <tr key={`${boqIndex}-${index}-${item.description}`} className={`transition-colors ${isHeader ? 'bg-neutral-darker font-medium' : 'hover:bg-neutral-darker/50'}`}>
                      <td 
                        className={`border border-neutral-medium px-4 py-3 text-sm ${isHeader ? 'text-accent-amber font-semibold' : 'text-primary'} ${isEditable && !isHeader ? 'cursor-pointer hover:bg-neutral-medium/20' : ''}`}
                        onClick={() => startEditing(boqIndex, index, 'description')}
                      >
                        {editingCell?.boqIndex === boqIndex && editingCell?.itemIndex === index && editingCell?.field === 'description' ? (
                          <input
                            type="text"
                            value={tempValue}
                            onChange={(e) => setTempValue(e.target.value)}
                            onBlur={saveCellEdit}
                            onKeyDown={handleKeyPress}
                            className="w-full px-2 py-1 text-sm bg-neutral-dark text-primary border border-accent-blue rounded focus:outline-none"
                            autoFocus
                          />
                        ) : (
                          item.description
                        )}
                      </td>
                      <td 
                        className={`border border-neutral-medium px-4 py-3 text-sm text-primary ${isEditable && !isHeader ? 'cursor-pointer hover:bg-neutral-medium/20' : ''}`}
                        onClick={() => startEditing(boqIndex, index, 'unit')}
                      >
                        {isHeader ? '-' : (
                          editingCell?.boqIndex === boqIndex && editingCell?.itemIndex === index && editingCell?.field === 'unit' ? (
                            <select
                              value={tempValue}
                              onChange={(e) => setTempValue(e.target.value)}
                              onBlur={saveCellEdit}
                              onKeyDown={handleKeyPress}
                              className="w-full px-2 py-1 text-sm bg-neutral-dark text-primary border border-accent-blue rounded focus:outline-none"
                              autoFocus
                            >
                              <option value="Nos">Nos</option>
                              <option value="Sqm">Sqm</option>
                              <option value="Cum">Cum</option>
                              <option value="MT">MT</option>
                              <option value="Kg">Kg</option>
                              <option value="Ltr">Ltr</option>
                              <option value="Days">Days</option>
                              <option value="Hours">Hours</option>
                              <option value="LS">LS</option>
                              <option value="Rm">Rm</option>
                            </select>
                          ) : (
                            item.unit || 'N/A'
                          )
                        )}
                      </td>
                      <td 
                        className={`border border-neutral-medium px-4 py-3 text-sm text-primary text-right ${isEditable && !isHeader ? 'cursor-pointer hover:bg-neutral-medium/20' : ''}`}
                        onClick={() => startEditing(boqIndex, index, 'quantity')}
                      >
                        {isHeader ? '-' : (
                          editingCell?.boqIndex === boqIndex && editingCell?.itemIndex === index && editingCell?.field === 'quantity' ? (
                            <input
                              type="number"
                              value={tempValue}
                              onChange={(e) => setTempValue(e.target.value)}
                              onBlur={saveCellEdit}
                              onKeyDown={handleKeyPress}
                              className="w-full px-2 py-1 text-sm text-right bg-neutral-dark text-primary border border-accent-blue rounded focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              autoFocus
                            />
                          ) : (() => {
                            // Handle new format (quantity_text/quantity_numeric)
                            if (item.quantity_text !== undefined) {
                              return item.quantity_numeric !== null && item.quantity_numeric !== undefined
                                ? item.quantity_numeric.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                : item.quantity_text;
                            }
                            // Handle old format (quantity)
                            else if (item.quantity !== undefined) {
                              return item.quantity.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                            }
                            // Fallback
                            return '0';
                          })()
                        )}
                      </td>
                      <td 
                        className={`border border-neutral-medium px-4 py-3 text-sm text-primary text-right ${isEditable && !isHeader ? 'cursor-pointer hover:bg-neutral-medium/20' : ''}`}
                        onClick={() => startEditing(boqIndex, index, 'rate')}
                      >
                        {isHeader ? '-' : (
                          editingCell?.boqIndex === boqIndex && editingCell?.itemIndex === index && editingCell?.field === 'rate' ? (
                            <input
                              type="number"
                              value={tempValue}
                              onChange={(e) => setTempValue(e.target.value)}
                              onBlur={saveCellEdit}
                              onKeyDown={handleKeyPress}
                              className="w-full px-2 py-1 text-sm text-right bg-neutral-dark text-primary border border-accent-blue rounded focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              autoFocus
                            />
                          ) : (
                            formatCurrency(item.rate)
                          )
                        )}
                      </td>
                      <td className="border border-neutral-medium px-4 py-3 text-sm text-accent-amber text-right font-semibold">
                        {isHeader ? '-' : formatCurrency(item.amount)}
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-neutral-darker">
                    <td colSpan={4} className="border border-neutral-medium px-4 py-4 text-right text-sm font-semibold text-primary">
                      Total Amount:
                    </td>
                    <td className="border border-neutral-medium px-4 py-4 text-right text-lg font-bold text-accent-amber">
                      {formatCurrency(boq.total_amount)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Summary Stats */}
            <div className="mt-6 grid grid-cols-3 gap-4 p-4 bg-neutral-darker rounded-lg border border-neutral-medium">
              <div className="text-center">
                <div className="text-xl font-bold text-accent-amber">{boq.boq_items.length}</div>
                <div className="text-sm text-secondary">Total Items</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-primary">
                  {boq.boq_items.reduce((sum, item) => {
                    // Handle new format
                    if (item.quantity_numeric !== undefined) {
                      return sum + (item.quantity_numeric || 0);
                    }
                    // Handle old format
                    else if (item.quantity !== undefined) {
                      return sum + item.quantity;
                    }
                    return sum;
                  }, 0).toLocaleString('en-IN')}
                </div>
                <div className="text-sm text-secondary">Total Quantity</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-accent-amber">
                  {formatCurrency(boq.total_amount)}
                </div>
                <div className="text-sm text-secondary">Project Value</div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}