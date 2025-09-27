'use client';

import { useState, useEffect } from 'react';
import { getBOQByProjectId, deleteBOQ } from '@/lib/supabase-boq';

interface BOQDisplayProps {
  projectId: string;
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

export default function BOQDisplay({ projectId }: BOQDisplayProps) {
  const [boqData, setBOQData] = useState<BOQData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadBOQData();
  }, [projectId]);

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

  return (
    <div className="space-y-6">
      {boqData.map((boq, boqIndex) => (
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
                    <tr key={index} className={`transition-colors ${isHeader ? 'bg-neutral-darker font-medium' : 'hover:bg-neutral-darker/50'}`}>
                      <td className={`border border-neutral-medium px-4 py-3 text-sm ${isHeader ? 'text-accent-amber font-semibold' : 'text-primary'}`}>
                        {item.description}
                      </td>
                      <td className="border border-neutral-medium px-4 py-3 text-sm text-primary">
                        {isHeader ? '-' : (item.unit || 'N/A')}
                      </td>
                      <td className="border border-neutral-medium px-4 py-3 text-sm text-primary text-right">
                        {isHeader ? '-' : (() => {
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
                        })()}
                      </td>
                      <td className="border border-neutral-medium px-4 py-3 text-sm text-primary text-right">
                        {isHeader ? '-' : formatCurrency(item.rate)}
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