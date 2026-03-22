'use client';

import React, { useState } from 'react';
import type { FuelApproval, FuelPump, Vehicle, ApprovalStatus } from '@/types/supabase';
import { Button } from '@/components/Button';

interface ApprovalWithRelations extends FuelApproval {
  vehicles: {
    vehicle_number: string;
    vehicle_type: string;
  };
  fuel_pumps: {
    pump_name: string;
    city: string;
  };
}

interface ApprovalTableProps {
  approvals: ApprovalWithRelations[];
}

type SortField = 'created_at' | 'max_amount' | 'status' | 'valid_until';
type SortDirection = 'asc' | 'desc';

export function ApprovalTable({ approvals }: ApprovalTableProps) {
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedApprovals = [...approvals].sort((a, b) => {
    let aValue: string | number | null;
    let bValue: string | number | null;

    if (sortField === 'created_at' || sortField === 'valid_until') {
      aValue = a[sortField] ? new Date(a[sortField]!).getTime() : 0;
      bValue = b[sortField] ? new Date(b[sortField]!).getTime() : 0;
    } else if (sortField === 'max_amount') {
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
      hour: '2-digit',
      minute: '2-digit',
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

  const getStatusBadge = (status: ApprovalStatus) => {
    const statusConfig: Record<ApprovalStatus, { label: string; className: string }> = {
      pending: { label: 'Pending', className: 'bg-amber-500/20 text-amber-400' },
      filled: { label: 'Filled', className: 'bg-green-500/20 text-green-400' },
      expired: { label: 'Expired', className: 'bg-gray-500/20 text-gray-400' },
      cancelled: { label: 'Cancelled', className: 'bg-red-500/20 text-red-400' },
    };

    const config = statusConfig[status];
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
        {config.label}
      </span>
    );
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

  const toggleRow = (approvalId: string) => {
    setExpandedRow(expandedRow === approvalId ? null : approvalId);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (approvals.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-semibold text-primary mb-2">
          No fuel requests yet
        </h3>
        <p className="text-secondary text-sm">
          Visit Request Fuel to submit your first fuel request
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-neutral-medium">
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
              Expand
            </th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
              Approval Code
            </th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
              Vehicle
            </th>
            <th
              className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide cursor-pointer hover:text-primary transition-colors"
              onClick={() => handleSort('max_amount')}
            >
              <div className="flex items-center space-x-2">
                <span>Max Amount</span>
                <SortIcon field="max_amount" />
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
            <th
              className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide cursor-pointer hover:text-primary transition-colors"
              onClick={() => handleSort('created_at')}
            >
              <div className="flex items-center space-x-2">
                <span>Created</span>
                <SortIcon field="created_at" />
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedApprovals.map((approval) => (
            <React.Fragment key={approval.id}>
              {/* Main Row */}
              <tr
                className="border-b border-neutral-medium hover:bg-neutral-medium/30 transition-colors cursor-pointer"
                onClick={() => toggleRow(approval.id)}
              >
                <td className="px-4 py-4 text-sm">
                  <button
                    className="text-secondary hover:text-primary transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleRow(approval.id);
                    }}
                  >
                    {expandedRow === approval.id ? '▼' : '▶'}
                  </button>
                </td>
                <td className="px-4 py-4 text-sm">
                  <div className="font-mono font-semibold text-amber-400">
                    {approval.approval_code}
                  </div>
                </td>
                <td className="px-4 py-4 text-sm">
                  <div className="font-medium text-primary">
                    {approval.vehicles.vehicle_number}
                  </div>
                  <div className="text-xs text-secondary">
                    {approval.vehicles.vehicle_type}
                  </div>
                </td>
                <td className="px-4 py-4 text-sm font-medium text-primary">
                  {formatCurrency(approval.max_amount)}
                </td>
                <td className="px-4 py-4 text-sm">
                  {getStatusBadge(approval.status)}
                </td>
                <td className="px-4 py-4 text-sm text-secondary">
                  {formatDate(approval.created_at)}
                </td>
              </tr>

              {/* Expanded Row Details */}
              {expandedRow === approval.id && (
                <tr className="bg-neutral-darker">
                  <td colSpan={6} className="px-4 py-6">
                    <div className="space-y-4">
                      <h4 className="text-sm font-semibold text-primary uppercase tracking-wide">
                        Approval Details
                      </h4>

                      {/* Approval Code - Large for Easy Sharing */}
                      <div className="bg-neutral-dark rounded-lg p-4 border border-neutral-medium">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Approval Code</div>
                            <div className="text-2xl font-bold text-amber-400 font-mono tracking-wider">
                              {approval.approval_code}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyToClipboard(approval.approval_code)}
                          >
                            Copy Code
                          </Button>
                        </div>
                      </div>

                      {/* Approval Info Grid */}
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Fuel Pump:</span>
                          <span className="ml-2 text-primary">
                            {approval.fuel_pumps.pump_name}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">City:</span>
                          <span className="ml-2 text-primary">
                            {approval.fuel_pumps.city}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Max Liters:</span>
                          <span className="ml-2 text-primary">
                            {approval.max_liters}L
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Max Amount:</span>
                          <span className="ml-2 text-primary font-medium">
                            {formatCurrency(approval.max_amount)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Valid From:</span>
                          <span className="ml-2 text-primary">
                            {formatDate(approval.valid_from)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Valid Until:</span>
                          <span className="ml-2 text-primary">
                            {formatDate(approval.valid_until)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Auto-Approved:</span>
                          <span className={`ml-2 font-medium ${approval.auto_approved ? 'text-green-400' : 'text-orange-400'}`}>
                            {approval.auto_approved ? 'Yes' : 'No'}
                          </span>
                        </div>
                      </div>

                      {/* Request Notes */}
                      {approval.requested_notes && (
                        <div className="p-3 rounded-lg bg-neutral-dark border border-neutral-medium">
                          <div className="text-xs text-gray-500 mb-1">Request Notes:</div>
                          <div className="text-sm text-primary">
                            {approval.requested_notes}
                          </div>
                        </div>
                      )}

                      {/* Fill Details (if filled) */}
                      {approval.status === 'filled' && (
                        <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                          <div className="text-xs text-green-400 mb-2 font-semibold uppercase">
                            Fill Details
                          </div>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <span className="text-gray-500">Filled At:</span>
                              <span className="ml-2 text-green-400">
                                {formatDate(approval.filled_at)}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500">Filled Quantity:</span>
                              <span className="ml-2 text-green-400">
                                {approval.filled_quantity}L
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500">Filled Amount:</span>
                              <span className="ml-2 text-green-400 font-medium">
                                {formatCurrency(approval.filled_amount)}
                              </span>
                            </div>
                          </div>
                          {approval.pump_notes && (
                            <div className="mt-3 pt-3 border-t border-green-500/20">
                              <div className="text-xs text-gray-500 mb-1">Pump Notes:</div>
                              <div className="text-sm text-green-500">
                                {approval.pump_notes}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Expired Warning */}
                      {approval.status === 'expired' && (
                        <div className="p-3 rounded-lg bg-gray-500/10 border border-gray-500/20 text-sm text-gray-400">
                          This approval expired without being used.
                        </div>
                      )}

                      {/* Cancelled Warning */}
                      {approval.status === 'cancelled' && (
                        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
                          This approval was cancelled.
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
