'use client';

import React, { useState, useEffect } from 'react';
import AdminNavbar from '@/components/admin/AdminNavbar';
import { Button } from '@/components/Button';
import { ExpenseStatusBadge } from '@/components/fuel/ExpenseStatusBadge';
import { BillImageModal } from '@/components/fuel/BillImageModal';
import type { FuelExpenseWithRelations, FuelExpenseStatus } from '@/types/supabase';

export default function AdminFuelExpensesPage() {
  const [expenses, setExpenses] = useState<FuelExpenseWithRelations[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<FuelExpenseWithRelations[]>([]);
  const [selectedExpense, setSelectedExpense] = useState<FuelExpenseWithRelations | null>(null);
  const [statusFilter, setStatusFilter] = useState<FuelExpenseStatus | 'all'>('pending_review');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);

  const fetchExpenses = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const url = statusFilter === 'all'
        ? '/api/admin/fuel-expenses?limit=100'
        : `/api/admin/fuel-expenses?status=${statusFilter}&limit=100`;

      const response = await fetch(url);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch expenses');
      }

      setExpenses(result.data || []);
      setFilteredExpenses(result.data || []);

      // Auto-select first expense if none selected
      if (!selectedExpense && result.data && result.data.length > 0) {
        setSelectedExpense(result.data[0]);
      }
    } catch (err) {
      console.error('Failed to fetch expenses:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch expenses');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [statusFilter]);

  const handleApprove = async () => {
    if (!selectedExpense) return;

    setIsSubmitting(true);
    setSubmitMessage(null);

    try {
      const response = await fetch(`/api/admin/fuel-expenses/${selectedExpense.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve',
          admin_notes: adminNotes || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to approve expense');
      }

      setSubmitMessage('Expense approved & funds deployed successfully!');
      setAdminNotes('');
      setShowApproveModal(false);

      // Refresh list and clear selection
      await fetchExpenses();
      setSelectedExpense(null);
    } catch (err) {
      console.error('Failed to approve expense:', err);
      setSubmitMessage(err instanceof Error ? err.message : 'Failed to approve expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selectedExpense) return;

    if (!rejectionReason || rejectionReason.length < 10) {
      setSubmitMessage('Rejection reason must be at least 10 characters');
      return;
    }

    setIsSubmitting(true);
    setSubmitMessage(null);

    try {
      const response = await fetch(`/api/admin/fuel-expenses/${selectedExpense.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject',
          rejected_reason: rejectionReason,
          admin_notes: adminNotes || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to reject expense');
      }

      setSubmitMessage('Expense rejected successfully');
      setRejectionReason('');
      setAdminNotes('');
      setShowRejectModal(false);

      // Refresh list and clear selection
      await fetchExpenses();
      setSelectedExpense(null);
    } catch (err) {
      console.error('Failed to reject expense:', err);
      setSubmitMessage(err instanceof Error ? err.message : 'Failed to reject expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return '—';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-neutral-darkest">
      <AdminNavbar />

      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-primary mb-2">
            Fuel Expense Review
          </h1>
          <p className="text-secondary text-sm">
            Review and approve/reject contractor fuel expense submissions
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex items-center space-x-4">
          <label className="text-sm text-secondary">Filter:</label>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as FuelExpenseStatus | 'all');
              setSelectedExpense(null);
            }}
            className="px-3 py-2 rounded-lg border bg-neutral-dark text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent-orange border-neutral-medium"
          >
            <option value="all">All Expenses</option>
            <option value="pending_review">Pending Review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="ocr_failed">OCR Failed</option>
            <option value="submitted">Submitted</option>
            <option value="ocr_processing">OCR Processing</option>
          </select>
        </div>

        {/* Two-Column Layout */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="text-secondary">Loading expenses...</div>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="text-red-500 mb-4">{error}</div>
            <Button onClick={fetchExpenses} variant="outline" size="sm">
              Retry
            </Button>
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="text-center py-12 bg-neutral-dark rounded-lg border border-neutral-medium">
            <h3 className="text-lg font-semibold text-primary mb-2">
              No expenses found
            </h3>
            <p className="text-secondary text-sm">
              {statusFilter === 'pending_review'
                ? 'No fuel expenses pending review at the moment'
                : `No ${statusFilter} fuel expenses found`}
            </p>
          </div>
        ) : (
          <div className="grid lg:grid-cols-5 gap-6">
            {/* Left Panel: Expense List (3 cols) */}
            <div className="lg:col-span-3">
              <div className="bg-neutral-dark rounded-lg border border-neutral-medium">
                <div className="p-4 border-b border-neutral-medium">
                  <h3 className="text-sm font-semibold text-primary uppercase tracking-wide">
                    Expenses ({filteredExpenses.length})
                  </h3>
                </div>

                <div className="divide-y divide-neutral-medium max-h-[calc(100vh-300px)] overflow-y-auto">
                  {filteredExpenses.map((expense) => (
                    <div
                      key={expense.id}
                      className={`p-4 cursor-pointer transition-colors ${
                        selectedExpense?.id === expense.id
                          ? 'bg-amber-500/10 border-l-4 border-amber-500'
                          : 'hover:bg-neutral-medium/30'
                      }`}
                      onClick={() => {
                        setSelectedExpense(expense);
                        setSubmitMessage(null);
                      }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="font-medium text-primary">
                            {expense.vehicle.vehicle_number} ({expense.vehicle.vehicle_type})
                          </div>
                          <div className="text-xs text-secondary">
                            {expense.contractor.company_name}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-primary">
                            {formatCurrency(expense.total_amount)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-secondary">
                          {formatDate(expense.bill_date || expense.submitted_at)}
                        </div>
                        <ExpenseStatusBadge status={expense.status} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Panel: Detail View (2 cols) */}
            <div className="lg:col-span-2">
              {selectedExpense ? (
                <div className="bg-neutral-dark rounded-lg border border-neutral-medium sticky top-6">
                  <div className="p-4 border-b border-neutral-medium">
                    <h3 className="text-sm font-semibold text-primary uppercase tracking-wide">
                      Expense Details
                    </h3>
                  </div>

                  <div className="p-4 space-y-4">
                    {/* Vehicle & Contractor Info */}
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Vehicle</div>
                      <div className="text-sm font-medium text-primary">
                        {selectedExpense.vehicle.vehicle_number} - {selectedExpense.vehicle.vehicle_type}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-gray-500 mb-1">Contractor</div>
                      <div className="text-sm font-medium text-primary">
                        {selectedExpense.contractor.company_name}
                      </div>
                    </div>

                    {/* Bill Image */}
                    <div>
                      <div className="text-xs text-gray-500 mb-2">Bill Image</div>
                      <div
                        className="relative cursor-pointer rounded-lg overflow-hidden border border-neutral-medium hover:border-amber-500 transition-colors"
                        onClick={() => setSelectedImage(selectedExpense.bill_image_url)}
                      >
                        <img
                          src={selectedExpense.bill_image_url}
                          alt="Bill"
                          className="w-full h-64 object-contain bg-neutral-darker"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/50 transition-colors">
                          <span className="text-white opacity-0 hover:opacity-100 text-sm">
                            Click to enlarge
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* OCR Extracted Data or Status Message */}
                    {selectedExpense.status === 'ocr_failed' && (
                      <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                        <div className="text-xs text-orange-400 mb-1">
                          OCR Extraction Failed
                        </div>
                        <div className="text-sm text-orange-500">
                          Please manually verify the bill image before approving or rejecting.
                        </div>
                      </div>
                    )}

                    {['pending_review', 'approved', 'rejected'].includes(selectedExpense.status) && (
                      <div>
                        <div className="text-xs text-gray-500 mb-2">OCR Extracted Data</div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Bill #:</span>
                            <span className="text-primary">{selectedExpense.bill_number || '—'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Date:</span>
                            <span className="text-primary">{formatDate(selectedExpense.bill_date)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Pump:</span>
                            <span className="text-primary">{selectedExpense.pump_name || '—'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Fuel Type:</span>
                            <span className="text-primary">{selectedExpense.fuel_type || '—'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Quantity:</span>
                            <span className="text-primary">
                              {selectedExpense.quantity_liters ? `${selectedExpense.quantity_liters}L` : '—'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Rate/Liter:</span>
                            <span className="text-primary">{formatCurrency(selectedExpense.rate_per_liter)}</span>
                          </div>
                          <div className="flex justify-between font-medium border-t border-neutral-medium pt-2">
                            <span className="text-gray-400">Total:</span>
                            <span className="text-primary">{formatCurrency(selectedExpense.total_amount)}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Admin Notes Input */}
                    {selectedExpense.status === 'pending_review' && (
                      <div>
                        <label className="text-xs text-gray-500 mb-2 block">
                          Admin Notes (Optional)
                        </label>
                        <textarea
                          value={adminNotes}
                          onChange={(e) => setAdminNotes(e.target.value)}
                          rows={3}
                          maxLength={1000}
                          placeholder="Add any notes for this review..."
                          className="w-full px-3 py-2 rounded-lg border bg-neutral-darker text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent-orange border-neutral-medium"
                        />
                        <div className="text-xs text-gray-500 mt-1">
                          {adminNotes.length}/1000 characters
                        </div>
                      </div>
                    )}

                    {/* Success/Error Message */}
                    {submitMessage && (
                      <div
                        className={`p-3 rounded-lg text-sm ${
                          submitMessage.includes('success')
                            ? 'bg-green-500/10 text-green-500'
                            : 'bg-red-500/10 text-red-500'
                        }`}
                      >
                        {submitMessage}
                      </div>
                    )}

                    {/* Action Buttons */}
                    {selectedExpense.status === 'pending_review' && (
                      <div className="flex space-x-3 pt-4 border-t border-neutral-medium">
                        <Button
                          variant="outline"
                          className="flex-1 border-red-500 text-red-500 hover:bg-red-500/10"
                          onClick={() => setShowRejectModal(true)}
                        >
                          Reject
                        </Button>
                        <Button
                          className="flex-1 bg-green-500 hover:bg-green-600"
                          onClick={() => setShowApproveModal(true)}
                        >
                          Approve
                        </Button>
                      </div>
                    )}

                    {/* Status Info for Approved/Rejected */}
                    {selectedExpense.status === 'approved' && (
                      <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                        <div className="text-xs text-green-400 mb-1">
                          Approved on {formatDate(selectedExpense.approved_at)}
                        </div>
                        {selectedExpense.admin_notes && (
                          <div className="text-sm text-green-500 mt-2">
                            Admin Notes: {selectedExpense.admin_notes}
                          </div>
                        )}
                      </div>
                    )}

                    {selectedExpense.status === 'rejected' && (
                      <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                        <div className="text-xs text-red-400 mb-1">
                          Rejected
                        </div>
                        {selectedExpense.rejected_reason && (
                          <div className="text-sm text-red-500 mt-2">
                            Reason: {selectedExpense.rejected_reason}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-neutral-dark rounded-lg border border-neutral-medium p-12 text-center">
                  <div className="text-gray-500 text-sm">
                    Select an expense to view details
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Approve Confirmation Modal */}
      {showApproveModal && selectedExpense && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
          onClick={() => setShowApproveModal(false)}
        >
          <div
            className="bg-neutral-dark rounded-lg border border-neutral-medium w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-primary mb-4">
              Confirm Approval
            </h3>
            <p className="text-secondary text-sm mb-6">
              Deploy {formatCurrency(selectedExpense.total_amount)} to {selectedExpense.contractor.company_name}?
            </p>
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowApproveModal(false)}
                className="flex-1"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleApprove}
                className="flex-1 bg-green-500 hover:bg-green-600"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Approving...' : 'Confirm Approval'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Reason Modal */}
      {showRejectModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
          onClick={() => setShowRejectModal(false)}
        >
          <div
            className="bg-neutral-dark rounded-lg border border-neutral-medium w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-primary mb-4">
              Rejection Reason
            </h3>
            <p className="text-secondary text-sm mb-4">
              Please provide a reason for rejecting this expense (min 10 characters)
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
              maxLength={500}
              placeholder="Enter rejection reason..."
              className="w-full px-3 py-2 rounded-lg border bg-neutral-darker text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent-orange border-neutral-medium mb-2"
            />
            <div className="text-xs text-gray-500 mb-6">
              {rejectionReason.length}/500 characters (min 10)
            </div>
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                }}
                className="flex-1"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleReject}
                className="flex-1 bg-red-500 hover:bg-red-600"
                disabled={isSubmitting || rejectionReason.length < 10}
              >
                {isSubmitting ? 'Rejecting...' : 'Confirm Rejection'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Bill Image Modal */}
      <BillImageModal
        imageUrl={selectedImage}
        onClose={() => setSelectedImage(null)}
      />
    </div>
  );
}
