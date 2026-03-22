'use client';

import React, { useState } from 'react';
import { Button } from '@/components/Button';

interface ApprovalDetails {
  approval_id: string;
  vehicle_number: string;
  max_amount: number;
  max_liters: number;
  contractor_name: string;
}

export default function PumpDashboardPage() {
  const [approvalCode, setApprovalCode] = useState('');
  const [approvalDetails, setApprovalDetails] = useState<ApprovalDetails | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const [filledQuantity, setFilledQuantity] = useState('');
  const [filledAmount, setFilledAmount] = useState('');
  const [pumpNotes, setPumpNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const handleValidate = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setApprovalDetails(null);

    if (!approvalCode.trim()) {
      setValidationError('Please enter an approval code');
      return;
    }

    setIsValidating(true);

    try {
      const response = await fetch('/api/pump/validate-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approval_code: approvalCode.trim().toUpperCase() }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Validation failed');
      }

      if (!result.valid) {
        setValidationError(result.message || 'Invalid approval code');
        return;
      }

      // Valid approval
      setApprovalDetails(result.approval);
    } catch (err) {
      console.error('Validation error:', err);
      setValidationError(err instanceof Error ? err.message : 'Failed to validate code');
    } finally {
      setIsValidating(false);
    }
  };

  const handleSubmitFill = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(false);

    // Validation
    if (!filledQuantity || parseFloat(filledQuantity) <= 0) {
      setSubmitError('Please enter valid filled quantity');
      return;
    }
    if (!filledAmount || parseFloat(filledAmount) <= 0) {
      setSubmitError('Please enter valid filled amount');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/pump/log-fill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approval_code: approvalCode.trim().toUpperCase(),
          filled_quantity: parseFloat(filledQuantity),
          filled_amount: parseFloat(filledAmount),
          pump_notes: pumpNotes.trim() || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to log fill');
      }

      // Success
      setSubmitSuccess(true);
      // Reset form
      setApprovalCode('');
      setApprovalDetails(null);
      setFilledQuantity('');
      setFilledAmount('');
      setPumpNotes('');
    } catch (err) {
      console.error('Submit error:', err);
      setSubmitError(err instanceof Error ? err.message : 'Failed to log fill');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-neutral-darkest">
      {/* Header */}
      <header className="bg-neutral-dark border-b border-neutral-medium">
        <div className="px-6 py-4">
          <h1 className="text-2xl font-bold text-primary">Fuel Pump Dashboard</h1>
          <p className="text-secondary text-sm mt-1">
            Validate approval codes and log fuel fills
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        <div className="max-w-2xl mx-auto">
          {/* Success Message */}
          {submitSuccess && (
            <div className="mb-6 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
              <div className="text-green-400 font-semibold mb-1">
                Fuel Fill Logged Successfully
              </div>
              <div className="text-sm text-green-500">
                The transaction has been recorded. You can validate another code below.
              </div>
            </div>
          )}

          {/* Validation Form */}
          <div className="bg-neutral-dark rounded-lg border border-neutral-medium p-6 mb-6">
            <h2 className="text-lg font-semibold text-primary mb-4">
              Step 1: Validate Approval Code
            </h2>

            <form onSubmit={handleValidate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  Approval Code
                </label>
                <input
                  type="text"
                  value={approvalCode}
                  onChange={(e) => setApprovalCode(e.target.value.toUpperCase())}
                  placeholder="e.g., FA-260320-0001"
                  className="w-full px-4 py-3 rounded-lg border bg-neutral-dark text-primary font-mono text-lg focus:outline-none focus:ring-2 focus:ring-accent-orange focus:border-transparent transition-all duration-200 border-neutral-medium hover:border-neutral-dark"
                  disabled={!!approvalDetails}
                />
                <p className="mt-2 text-xs text-secondary">
                  Enter the approval code provided by the contractor
                </p>
              </div>

              {/* Validation Error */}
              {validationError && (
                <div className="p-3 rounded-lg bg-red-500/10 text-red-500 text-sm">
                  {validationError}
                </div>
              )}

              {!approvalDetails && (
                <Button
                  type="submit"
                  disabled={isValidating || !approvalCode.trim()}
                  className="w-full"
                >
                  {isValidating ? 'Validating...' : 'Validate Code'}
                </Button>
              )}
            </form>
          </div>

          {/* Approval Details & Fill Form */}
          {approvalDetails && (
            <div className="bg-neutral-dark rounded-lg border border-neutral-medium p-6">
              <h2 className="text-lg font-semibold text-primary mb-4">
                Step 2: Fill Fuel & Log Transaction
              </h2>

              {/* Approval Details */}
              <div className="mb-6 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                <div className="text-sm font-semibold text-green-400 mb-3">
                  Valid Approval
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500">Contractor:</span>
                    <span className="ml-2 text-primary font-medium">
                      {approvalDetails.contractor_name}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Vehicle:</span>
                    <span className="ml-2 text-primary font-medium">
                      {approvalDetails.vehicle_number}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Max Liters:</span>
                    <span className="ml-2 text-amber-400 font-bold">
                      {approvalDetails.max_liters}L
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Max Amount:</span>
                    <span className="ml-2 text-amber-400 font-bold">
                      {formatCurrency(approvalDetails.max_amount)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Fill Form */}
              <form onSubmit={handleSubmitFill} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-primary mb-2">
                    Filled Quantity (Liters)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={approvalDetails.max_liters}
                    value={filledQuantity}
                    onChange={(e) => setFilledQuantity(e.target.value)}
                    placeholder={`Max ${approvalDetails.max_liters}L`}
                    className="w-full px-4 py-3 rounded-lg border bg-neutral-dark text-primary focus:outline-none focus:ring-2 focus:ring-accent-orange focus:border-transparent transition-all duration-200 border-neutral-medium hover:border-neutral-dark"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary mb-2">
                    Filled Amount (Rs)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={approvalDetails.max_amount}
                    value={filledAmount}
                    onChange={(e) => setFilledAmount(e.target.value)}
                    placeholder={`Max ${formatCurrency(approvalDetails.max_amount)}`}
                    className="w-full px-4 py-3 rounded-lg border bg-neutral-dark text-primary focus:outline-none focus:ring-2 focus:ring-accent-orange focus:border-transparent transition-all duration-200 border-neutral-medium hover:border-neutral-dark"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={pumpNotes}
                    onChange={(e) => setPumpNotes(e.target.value)}
                    maxLength={500}
                    rows={3}
                    placeholder="e.g., Driver ID verified, odometer reading"
                    className="w-full px-4 py-3 rounded-lg border bg-neutral-dark text-primary focus:outline-none focus:ring-2 focus:ring-accent-orange focus:border-transparent transition-all duration-200 border-neutral-medium hover:border-neutral-dark resize-none"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    {pumpNotes.length}/500 characters
                  </p>
                </div>

                {/* Submit Error */}
                {submitError && (
                  <div className="p-3 rounded-lg bg-red-500/10 text-red-500 text-sm">
                    {submitError}
                  </div>
                )}

                <div className="flex space-x-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setApprovalDetails(null);
                      setApprovalCode('');
                      setFilledQuantity('');
                      setFilledAmount('');
                      setPumpNotes('');
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting || !filledQuantity || !filledAmount}
                    className="flex-1"
                  >
                    {isSubmitting ? 'Logging...' : 'Log Fuel Fill'}
                  </Button>
                </div>
              </form>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
