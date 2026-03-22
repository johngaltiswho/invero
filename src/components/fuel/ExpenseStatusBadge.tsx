'use client';

import React from 'react';
import type { FuelExpenseStatus } from '@/types/supabase';

interface ExpenseStatusBadgeProps {
  status: FuelExpenseStatus;
}

const statusConfig: Record<
  FuelExpenseStatus,
  {
    label: string;
    className: string;
  }
> = {
  submitted: {
    label: 'Submitted',
    className: 'bg-yellow-500/20 text-yellow-400',
  },
  ocr_processing: {
    label: 'Processing...',
    className: 'bg-blue-500/20 text-blue-400',
  },
  pending_review: {
    label: 'Pending Review',
    className: 'bg-amber-500/20 text-amber-400',
  },
  approved: {
    label: 'Approved',
    className: 'bg-green-500/20 text-green-400',
  },
  rejected: {
    label: 'Rejected',
    className: 'bg-red-500/20 text-red-400',
  },
  ocr_failed: {
    label: 'OCR Failed',
    className: 'bg-orange-500/20 text-orange-400',
  },
};

export function ExpenseStatusBadge({ status }: ExpenseStatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}
