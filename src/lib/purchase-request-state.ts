type PurchaseRequestDisplayStateInput = {
  status?: string | null;
  delivery_status?: string | null;
  remaining_due?: number | null;
  funded_amount?: number | null;
  latest_repayment_submission_status?: string | null;
};

export type PurchaseRequestDisplayState = {
  key:
    | 'draft'
    | 'submitted'
    | 'approved'
    | 'funded'
    | 'po_generated'
    | 'delivery_confirmation_pending'
    | 'dispatched'
    | 'delivered'
    | 'repayment_submitted'
    | 'repaid'
    | 'disputed'
    | 'rejected';
  label: string;
  classes: string;
};

const DISPLAY_STATES: Record<PurchaseRequestDisplayState['key'], Omit<PurchaseRequestDisplayState, 'key'>> = {
  draft: {
    label: 'Draft',
    classes: 'text-secondary bg-neutral-medium/50 border-neutral-medium'
  },
  submitted: {
    label: 'Submitted',
    classes: 'text-yellow-600 bg-yellow-100 border-yellow-300'
  },
  approved: {
    label: 'Approved',
    classes: 'text-green-600 bg-green-100 border-green-300'
  },
  funded: {
    label: 'Funded',
    classes: 'text-blue-600 bg-blue-100 border-blue-300'
  },
  po_generated: {
    label: 'PO Generated',
    classes: 'text-indigo-600 bg-indigo-100 border-indigo-300'
  },
  delivery_confirmation_pending: {
    label: 'Delivery Confirmation Pending',
    classes: 'text-amber-700 bg-amber-100 border-amber-300'
  },
  dispatched: {
    label: 'Dispatched',
    classes: 'text-sky-700 bg-sky-100 border-sky-300'
  },
  delivered: {
    label: 'Delivered',
    classes: 'text-emerald-700 bg-emerald-100 border-emerald-300'
  },
  repayment_submitted: {
    label: 'Repayment Submitted',
    classes: 'text-violet-700 bg-violet-100 border-violet-300'
  },
  repaid: {
    label: 'Repaid',
    classes: 'text-teal-700 bg-teal-100 border-teal-300'
  },
  disputed: {
    label: 'Disputed',
    classes: 'text-red-600 bg-red-100 border-red-300'
  },
  rejected: {
    label: 'Rejected',
    classes: 'text-red-600 bg-red-100 border-red-300'
  }
};

function state(key: PurchaseRequestDisplayState['key']): PurchaseRequestDisplayState {
  return {
    key,
    ...DISPLAY_STATES[key]
  };
}

export function getPurchaseRequestDisplayState(
  input: PurchaseRequestDisplayStateInput
): PurchaseRequestDisplayState {
  const normalizedStatus = String(input.status || '').toLowerCase();
  const deliveryStatus = String(input.delivery_status || '').toLowerCase();
  const repaymentSubmissionStatus = String(input.latest_repayment_submission_status || '').toLowerCase();
  const hasRemainingDue = input.remaining_due !== null && input.remaining_due !== undefined && Number.isFinite(Number(input.remaining_due));
  const remainingDue = hasRemainingDue ? Number(input.remaining_due) : null;
  const fundedAmount = Number(input.funded_amount ?? 0);

  if (deliveryStatus === 'disputed') {
    return state('disputed');
  }

  if (repaymentSubmissionStatus === 'pending') {
    return state('repayment_submitted');
  }

  if (fundedAmount > 0 && remainingDue !== null && remainingDue <= 0.009) {
    return state('repaid');
  }

  if (deliveryStatus === 'delivered') {
    return state('delivered');
  }

  if (deliveryStatus === 'backfill_pending_confirmation') {
    return state('delivery_confirmation_pending');
  }

  if (deliveryStatus === 'dispatched') {
    return state('dispatched');
  }

  switch (normalizedStatus) {
    case 'submitted':
      return state('submitted');
    case 'approved':
      return state('approved');
    case 'funded':
    case 'completed':
      return state('funded');
    case 'po_generated':
      return state('po_generated');
    case 'rejected':
      return state('rejected');
    default:
      return state('draft');
  }
}
