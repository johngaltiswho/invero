import type { LenderAllocationIntentStatus } from '@/lib/lender-allocation-intents';

export type DirectInflowAllocationIntentCandidate = {
  id: string;
  status: LenderAllocationIntentStatus;
  created_at: string;
  remainingAmount: number;
};

export function selectDirectInflowAllocationIntent(
  candidates: DirectInflowAllocationIntentCandidate[]
): DirectInflowAllocationIntentCandidate | null {
  const eligible = candidates
    .filter((candidate) =>
      ['ready_for_funding', 'funding_submitted', 'completed'].includes(candidate.status) &&
      Number(candidate.remainingAmount || 0) > 0.009
    )
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  if (eligible.length === 0) {
    return null;
  }

  if (eligible.length > 1) {
    throw new Error('Multiple allocation intents still have remaining funding. Select the intended proposal before recording a direct inflow.');
  }

  return eligible[0] || null;
}
