'use client';

import React, { useState } from 'react';
import type { FuelExpense, Vehicle } from '@/types/supabase';
import { ExpenseStatusBadge } from './ExpenseStatusBadge';
import { BillImageModal } from './BillImageModal';
import { Button } from '@/components/Button';

interface ExpenseWithVehicle extends FuelExpense {
  vehicle: Vehicle;
}

interface ExpenseTableProps {
  expenses: ExpenseWithVehicle[];
}

type SortField = 'bill_date' | 'total_amount' | 'status' | 'submitted_at';
type SortDirection = 'asc' | 'desc';

export function ExpenseTable({ expenses }: ExpenseTableProps) {
  const [sortField, setSortField] = useState<SortField>('submitted_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedExpenses = [...expenses].sort((a, b) => {
    let aValue: string | number | null;
    let bValue: string | number | null;

    if (sortField === 'submitted_at' || sortField === 'bill_date') {
      aValue = a[sortField] ? new Date(a[sortField]!).getTime() : 0;
      bValue = b[sortField] ? new Date(b[sortField]!).getTime() : 0;
    } else if (sortField === 'total_amount') {
      aValue = a[sortField] || 0;
      bValue = b[sortField] || 0;
    } else {
      aValue = a[sortField] || '';
      bValue = b[sortField] || '';
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

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

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <span className="text-gray-500">⇅</span>;
    }
    return sortDirection === 'asc' ? (
      <span className="text-amber-500">↑</span>
    ) : (
      <span className="text-amber-500">↓</span>
    );
  };

  const toggleRow = (expenseId: string) => {
    setExpandedRow(expandedRow === expenseId ? null : expenseId);
  };

  if (expenses.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-semibold text-primary mb-2">
          No fuel expenses yet
        </h3>
        <p className="text-secondary text-sm">
          Visit Submit Expense to upload your first bill
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-neutral-medium">
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                Expand
              </th>
              <th
                className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide cursor-pointer hover:text-primary transition-colors"
                onClick={() => handleSort('bill_date')}
              >
                <div className="flex items-center space-x-2">
                  <span>Date</span>
                  <SortIcon field="bill_date" />
                </div>
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                Vehicle
              </th>
              <th
                className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide cursor-pointer hover:text-primary transition-colors"
                onClick={() => handleSort('total_amount')}
              >
                <div className="flex items-center space-x-2">
                  <span>Amount</span>
                  <SortIcon field="total_amount" />
                </div>
              </th>
              <th
                className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide cursor-pointer hover:text-primary transition-colors"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center space-x-2">
                  <span>Status</span>
                  <SortIcon field="status" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedExpenses.map((expense) => (
              <React.Fragment key={expense.id}>
                {/* Main Row */}
                <tr
                  className="border-b border-neutral-medium hover:bg-neutral-medium/30 transition-colors cursor-pointer"
                  onClick={() => toggleRow(expense.id)}
                >
                  <td className="px-4 py-4 text-sm">
                    <button
                      className="text-secondary hover:text-primary transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleRow(expense.id);
                      }}
                    >
                      {expandedRow === expense.id ? '▼' : '▶'}
                    </button>
                  </td>
                  <td className="px-4 py-4 text-sm text-secondary">
                    {formatDate(expense.bill_date || expense.submitted_at)}
                  </td>
                  <td className="px-4 py-4 text-sm">
                    <div className="font-medium text-primary">
                      {expense.vehicle.vehicle_number}
                    </div>
                    <div className="text-xs text-secondary">
                      {expense.vehicle.vehicle_type}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm font-medium text-primary">
                    {formatCurrency(expense.total_amount)}
                  </td>
                  <td className="px-4 py-4 text-sm">
                    <ExpenseStatusBadge status={expense.status} />
                  </td>
                </tr>

                {/* Expanded Row Details */}
                {expandedRow === expense.id && (
                  <tr className="bg-neutral-darker">
                    <td colSpan={5} className="px-4 py-6">
                      <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-primary uppercase tracking-wide">
                          Bill Details
                        </h4>

                        {/* OCR Data or Processing Message */}
                        {expense.status === 'submitted' && (
                          <div className="text-sm text-secondary italic">
                            Bill submitted. Waiting for OCR processing...
                          </div>
                        )}

                        {expense.status === 'ocr_processing' && (
                          <div className="text-sm text-blue-400 italic">
                            Processing bill with OCR. This may take a few minutes...
                          </div>
                        )}

                        {expense.status === 'ocr_failed' && (
                          <div className="text-sm text-orange-400">
                            OCR extraction failed. Admin will manually review the bill.
                          </div>
                        )}

                        {['pending_review', 'approved', 'rejected'].includes(expense.status) && (
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500">Bill Number:</span>
                              <span className="ml-2 text-primary">
                                {expense.bill_number || '—'}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500">Date:</span>
                              <span className="ml-2 text-primary">
                                {formatDate(expense.bill_date)}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500">Pump:</span>
                              <span className="ml-2 text-primary">
                                {expense.pump_name || '—'}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500">Fuel Type:</span>
                              <span className="ml-2 text-primary">
                                {expense.fuel_type || '—'}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500">Quantity:</span>
                              <span className="ml-2 text-primary">
                                {expense.quantity_liters
                                  ? `${expense.quantity_liters}L`
                                  : '—'}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500">Rate/Liter:</span>
                              <span className="ml-2 text-primary">
                                {formatCurrency(expense.rate_per_liter)}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500">Total Amount:</span>
                              <span className="ml-2 text-primary font-medium">
                                {formatCurrency(expense.total_amount)}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Admin Notes / Rejection Reason */}
                        {expense.status === 'approved' && expense.admin_notes && (
                          <div className="mt-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                            <div className="text-xs text-green-400 mb-1">
                              Admin Notes:
                            </div>
                            <div className="text-sm text-green-500">
                              {expense.admin_notes}
                            </div>
                          </div>
                        )}

                        {expense.status === 'rejected' && expense.rejected_reason && (
                          <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                            <div className="text-xs text-red-400 mb-1">
                              Rejection Reason:
                            </div>
                            <div className="text-sm text-red-500">
                              {expense.rejected_reason}
                            </div>
                          </div>
                        )}

                        {/* View Bill Image Button */}
                        <div className="mt-4">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedImage(expense.bill_image_url)}
                          >
                            View Bill Image
                          </Button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bill Image Modal */}
      <BillImageModal
        imageUrl={selectedImage}
        onClose={() => setSelectedImage(null)}
      />
    </>
  );
}
