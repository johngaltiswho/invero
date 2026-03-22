'use client';

import React, { useState, useEffect } from 'react';
import { ContractorDashboardLayout } from '@/components/ContractorDashboardLayout';
import { ApprovalTable } from '@/components/fuel/ApprovalTable';
import Link from 'next/link';
import type { FuelApproval, ApprovalStatus } from '@/types/supabase';

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

export default function ApprovalHistoryPage() {
  const [approvals, setApprovals] = useState<ApprovalWithRelations[]>([]);
  const [filteredApprovals, setFilteredApprovals] = useState<ApprovalWithRelations[]>([]);
  const [statusFilter, setStatusFilter] = useState<ApprovalStatus | 'all'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchApprovals = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/contractor/fuel-requests');
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch approvals');
      }

      setApprovals(result.data || []);
      setFilteredApprovals(result.data || []);
    } catch (err) {
      console.error('Failed to fetch approvals:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch fuel requests');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, []);

  useEffect(() => {
    if (statusFilter === 'all') {
      setFilteredApprovals(approvals);
    } else {
      setFilteredApprovals(approvals.filter((a) => a.status === statusFilter));
    }
  }, [statusFilter, approvals]);

  return (
    <ContractorDashboardLayout>
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-primary">
                Fuel Request History
              </h1>
              <p className="text-secondary text-sm mt-1">
                View all your fuel approval requests and their status
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex space-x-2 border-b border-neutral-medium mb-4">
            <Link
              href="/dashboard/contractor/fuel/vehicles"
              className="px-4 py-2 text-sm font-medium text-secondary hover:text-primary transition-colors"
            >
              My Vehicles
            </Link>
            <Link
              href="/dashboard/contractor/fuel/request"
              className="px-4 py-2 text-sm font-medium text-secondary hover:text-primary transition-colors"
            >
              Request Fuel
            </Link>
            <Link
              href="/dashboard/contractor/fuel/history"
              className="px-4 py-2 text-sm font-medium border-b-2 border-amber-500 text-amber-500"
            >
              Request History
            </Link>
            <Link
              href="/dashboard/contractor/fuel/submit"
              className="px-4 py-2 text-sm font-medium text-secondary hover:text-primary transition-colors"
            >
              Submit Bill
            </Link>
          </div>

          {/* Filters */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <label className="text-sm text-secondary">Filter by status:</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as ApprovalStatus | 'all')}
                className="px-3 py-2 rounded-lg border bg-neutral-dark text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent-orange border-neutral-medium hover:border-neutral-dark"
              >
                <option value="all">All ({approvals.length})</option>
                <option value="pending">
                  Pending ({approvals.filter((a) => a.status === 'pending').length})
                </option>
                <option value="filled">
                  Filled ({approvals.filter((a) => a.status === 'filled').length})
                </option>
                <option value="expired">
                  Expired ({approvals.filter((a) => a.status === 'expired').length})
                </option>
                <option value="cancelled">
                  Cancelled ({approvals.filter((a) => a.status === 'cancelled').length})
                </option>
              </select>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="bg-neutral-dark rounded-lg border border-neutral-medium p-6">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="text-secondary">Loading fuel requests...</div>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="text-red-500 mb-4">{error}</div>
              <button
                onClick={fetchApprovals}
                className="px-4 py-2 text-sm rounded-lg border border-neutral-medium hover:bg-neutral-medium transition-colors"
              >
                Retry
              </button>
            </div>
          ) : (
            <ApprovalTable approvals={filteredApprovals} />
          )}
        </div>
      </div>
    </ContractorDashboardLayout>
  );
}
