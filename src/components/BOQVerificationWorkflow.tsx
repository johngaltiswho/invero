'use client';

import React, { useState, useEffect } from 'react';
import { useContractorV2 } from '@/contexts/ContractorContextV2';

interface BOQSubmission {
  id: number;
  project_id: string;
  submission_type: 'initial' | 'revision';
  status: 'pending' | 'under_review' | 'revision_required' | 'approved' | 'rejected';
  submitted_at: string;
  review_comments?: string;
  total_estimated_value?: number;
  total_materials_count?: number;
}

interface QuantityTakeoff {
  id?: number;
  material_category: string;
  material_specification: string;
  material_unit: string;
  drawing_reference?: string;
  drawing_sheet_number?: string;
  quantity_from_drawings: number;
  estimated_rate?: number;
  estimated_amount?: number;
}

interface BOQVerificationWorkflowProps {
  projectId: string;
  onSubmissionSuccess?: () => void;
}

export default function BOQVerificationWorkflow({ projectId, onSubmissionSuccess }: BOQVerificationWorkflowProps) {
  const { contractor } = useContractorV2();
  const [currentSubmission, setCurrentSubmission] = useState<BOQSubmission | null>(null);
  const [takeoffs, setTakeoffs] = useState<QuantityTakeoff[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddTakeoff, setShowAddTakeoff] = useState(false);
  const [newTakeoff, setNewTakeoff] = useState<QuantityTakeoff>({
    material_category: '',
    material_specification: '',
    material_unit: 'pieces',
    drawing_reference: '',
    drawing_sheet_number: '',
    quantity_from_drawings: 0,
    estimated_rate: 0,
    estimated_amount: 0
  });

  useEffect(() => {
    if (projectId && contractor?.id) {
      fetchCurrentSubmission();
    }
  }, [projectId, contractor?.id]);

  const fetchCurrentSubmission = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/boq-submissions?project_id=${projectId}&contractor_id=${contractor?.id}`);
      if (response.ok) {
        const data = await response.json();
        setCurrentSubmission(data.submission);
        setTakeoffs(data.takeoffs || []);
      }
    } catch (error) {
      console.error('Error fetching BOQ submission:', error);
    } finally {
      setLoading(false);
    }
  };

  const createNewSubmission = async () => {
    try {
      const response = await fetch('/api/boq-submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          contractor_id: contractor?.id,
          submission_type: 'initial'
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setCurrentSubmission(data.submission);
        setTakeoffs([]);
      }
    } catch (error) {
      console.error('Error creating BOQ submission:', error);
    }
  };

  const addTakeoff = async () => {
    if (!currentSubmission?.id) return;
    
    try {
      const response = await fetch('/api/quantity-takeoffs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          boq_submission_id: currentSubmission.id,
          ...newTakeoff
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setTakeoffs(prev => [...prev, data.takeoff]);
        setNewTakeoff({
          material_category: '',
          material_specification: '',
          material_unit: 'pieces',
          drawing_reference: '',
          drawing_sheet_number: '',
          quantity_from_drawings: 0,
          estimated_rate: 0,
          estimated_amount: 0
        });
        setShowAddTakeoff(false);
      }
    } catch (error) {
      console.error('Error adding takeoff:', error);
    }
  };

  const submitForVerification = async () => {
    if (!currentSubmission?.id) return;
    
    try {
      const response = await fetch(`/api/boq-submissions/${currentSubmission.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        await fetchCurrentSubmission();
        onSubmissionSuccess?.();
        alert('BOQ submitted for verification successfully!');
      }
    } catch (error) {
      console.error('Error submitting BOQ:', error);
      alert('Failed to submit BOQ for verification');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/20 text-yellow-400';
      case 'under_review': return 'bg-blue-500/20 text-blue-400';
      case 'revision_required': return 'bg-orange-500/20 text-orange-400';
      case 'approved': return 'bg-green-500/20 text-green-400';
      case 'rejected': return 'bg-red-500/20 text-red-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Draft';
      case 'under_review': return 'Under Review';
      case 'revision_required': return 'Revision Required';
      case 'approved': return 'Approved';
      case 'rejected': return 'Rejected';
      default: return 'Unknown';
    }
  };

  if (loading) {
    return (
      <div className="bg-neutral-dark rounded-lg border border-neutral-medium p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-neutral-medium rounded w-1/4 mb-4"></div>
          <div className="h-20 bg-neutral-medium rounded"></div>
        </div>
      </div>
    );
  }

  if (!currentSubmission) {
    return (
      <div className="bg-neutral-dark rounded-lg border border-neutral-medium p-6">
        <div className="text-center">
          <div className="text-4xl mb-4">📋</div>
          <h3 className="text-lg font-semibold text-primary mb-2">BOQ Verification</h3>
          <p className="text-secondary mb-4">
            Submit your BOQ with detailed quantity takeoffs for verification and funding approval.
          </p>
          <button
            onClick={createNewSubmission}
            className="bg-accent-amber text-neutral-dark px-6 py-2 rounded-lg font-medium hover:bg-accent-amber/90 transition-colors"
          >
            Start BOQ Submission
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Submission Status */}
      <div className="bg-neutral-dark rounded-lg border border-neutral-medium p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-primary">BOQ Verification Status</h3>
            <p className="text-sm text-secondary">Submission ID: #{currentSubmission.id}</p>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(currentSubmission.status)}`}>
            {getStatusLabel(currentSubmission.status)}
          </div>
        </div>

        {currentSubmission.review_comments && (
          <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4 mb-4">
            <h4 className="font-medium text-orange-400 mb-2">Review Comments:</h4>
            <p className="text-secondary text-sm">{currentSubmission.review_comments}</p>
          </div>
        )}

        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-primary">{takeoffs.length}</div>
            <div className="text-xs text-secondary">Material Items</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-primary">
              ₹{currentSubmission.total_estimated_value?.toLocaleString() || '0'}
            </div>
            <div className="text-xs text-secondary">Total Value</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-primary">
              {new Date(currentSubmission.submitted_at).toLocaleDateString()}
            </div>
            <div className="text-xs text-secondary">Submitted</div>
          </div>
        </div>
      </div>

      {/* Quantity Takeoffs */}
      <div className="bg-neutral-dark rounded-lg border border-neutral-medium">
        <div className="border-b border-neutral-medium p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-primary">Quantity Takeoffs</h3>
              <p className="text-sm text-secondary">Detailed material requirements from drawings</p>
            </div>
            {currentSubmission.status === 'pending' && (
              <button
                onClick={() => setShowAddTakeoff(true)}
                className="bg-accent-blue text-white px-4 py-2 rounded-lg text-sm hover:bg-accent-blue/90 transition-colors"
              >
                + Add Material
              </button>
            )}
          </div>
        </div>

        <div className="p-6">
          {takeoffs.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">📏</div>
              <h4 className="text-lg font-semibold text-primary mb-2">No Takeoffs Added</h4>
              <p className="text-secondary">Add material takeoffs from your drawings to proceed.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-medium">
                    <th className="text-left p-3 text-secondary">Category</th>
                    <th className="text-left p-3 text-secondary">Specification</th>
                    <th className="text-left p-3 text-secondary">Drawing Ref</th>
                    <th className="text-right p-3 text-secondary">Quantity</th>
                    <th className="text-right p-3 text-secondary">Rate</th>
                    <th className="text-right p-3 text-secondary">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {takeoffs.map((takeoff, index) => (
                    <tr key={index} className="border-b border-neutral-medium/30">
                      <td className="p-3 text-primary font-medium">{takeoff.material_category}</td>
                      <td className="p-3 text-secondary">{takeoff.material_specification}</td>
                      <td className="p-3 text-secondary">{takeoff.drawing_reference || '-'}</td>
                      <td className="p-3 text-right text-primary">
                        {takeoff.quantity_from_drawings} {takeoff.material_unit}
                      </td>
                      <td className="p-3 text-right text-secondary">
                        ₹{takeoff.estimated_rate?.toLocaleString() || '0'}
                      </td>
                      <td className="p-3 text-right text-primary font-medium">
                        ₹{takeoff.estimated_amount?.toLocaleString() || '0'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Submit Button */}
        {currentSubmission.status === 'pending' && takeoffs.length > 0 && (
          <div className="border-t border-neutral-medium p-6">
            <div className="flex justify-end">
              <button
                onClick={submitForVerification}
                className="bg-green-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors"
              >
                Submit for Verification
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Takeoff Modal */}
      {showAddTakeoff && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-dark rounded-lg border border-neutral-medium w-full max-w-2xl">
            <div className="border-b border-neutral-medium p-6">
              <h3 className="text-xl font-bold text-primary">Add Material Takeoff</h3>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-primary mb-2">Material Category *</label>
                  <select
                    value={newTakeoff.material_category}
                    onChange={(e) => setNewTakeoff(prev => ({ ...prev, material_category: e.target.value }))}
                    className="w-full px-3 py-2 bg-neutral-darker border border-neutral-medium rounded-md text-primary"
                  >
                    <option value="">Select category</option>
                    <option value="Reinforcement">Reinforcement</option>
                    <option value="Concrete">Concrete</option>
                    <option value="Masonry">Masonry</option>
                    <option value="Steel">Steel</option>
                    <option value="Cement">Cement</option>
                    <option value="Aggregate">Aggregate</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-primary mb-2">Unit *</label>
                  <select
                    value={newTakeoff.material_unit}
                    onChange={(e) => setNewTakeoff(prev => ({ ...prev, material_unit: e.target.value }))}
                    className="w-full px-3 py-2 bg-neutral-darker border border-neutral-medium rounded-md text-primary"
                  >
                    <option value="pieces">Pieces</option>
                    <option value="kg">Kilograms</option>
                    <option value="tonnes">Tonnes</option>
                    <option value="m3">Cubic Meters</option>
                    <option value="m2">Square Meters</option>
                    <option value="m">Meters</option>
                    <option value="bags">Bags</option>
                    <option value="nos">Numbers</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-2">Material Specification *</label>
                <textarea
                  value={newTakeoff.material_specification}
                  onChange={(e) => setNewTakeoff(prev => ({ ...prev, material_specification: e.target.value }))}
                  placeholder="e.g., 12mm dia TMT bars, Fe500 grade, 6m length"
                  rows={2}
                  className="w-full px-3 py-2 bg-neutral-darker border border-neutral-medium rounded-md text-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-primary mb-2">Drawing Reference</label>
                  <input
                    type="text"
                    value={newTakeoff.drawing_reference}
                    onChange={(e) => setNewTakeoff(prev => ({ ...prev, drawing_reference: e.target.value }))}
                    placeholder="e.g., Foundation Plan"
                    className="w-full px-3 py-2 bg-neutral-darker border border-neutral-medium rounded-md text-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-primary mb-2">Sheet Number</label>
                  <input
                    type="text"
                    value={newTakeoff.drawing_sheet_number}
                    onChange={(e) => setNewTakeoff(prev => ({ ...prev, drawing_sheet_number: e.target.value }))}
                    placeholder="e.g., A-01"
                    className="w-full px-3 py-2 bg-neutral-darker border border-neutral-medium rounded-md text-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-primary mb-2">Quantity *</label>
                  <input
                    type="number"
                    step="0.001"
                    value={newTakeoff.quantity_from_drawings}
                    onChange={(e) => setNewTakeoff(prev => ({ 
                      ...prev, 
                      quantity_from_drawings: parseFloat(e.target.value) || 0,
                      estimated_amount: (parseFloat(e.target.value) || 0) * (prev.estimated_rate || 0)
                    }))}
                    className="w-full px-3 py-2 bg-neutral-darker border border-neutral-medium rounded-md text-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-primary mb-2">Rate (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newTakeoff.estimated_rate}
                    onChange={(e) => setNewTakeoff(prev => ({ 
                      ...prev, 
                      estimated_rate: parseFloat(e.target.value) || 0,
                      estimated_amount: (prev.quantity_from_drawings || 0) * (parseFloat(e.target.value) || 0)
                    }))}
                    className="w-full px-3 py-2 bg-neutral-darker border border-neutral-medium rounded-md text-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-primary mb-2">Amount (₹)</label>
                  <input
                    type="number"
                    value={newTakeoff.estimated_amount}
                    readOnly
                    className="w-full px-3 py-2 bg-neutral-darker border border-neutral-medium rounded-md text-primary opacity-60"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-neutral-medium p-6">
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowAddTakeoff(false)}
                  className="px-4 py-2 text-primary border border-neutral-medium rounded-md hover:bg-neutral-medium/20 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={addTakeoff}
                  disabled={!newTakeoff.material_category || !newTakeoff.material_specification || !newTakeoff.quantity_from_drawings}
                  className="px-4 py-2 bg-accent-blue text-white rounded-md hover:bg-accent-blue/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Takeoff
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}