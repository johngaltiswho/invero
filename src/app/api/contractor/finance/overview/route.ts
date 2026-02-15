import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { ContractorService } from '@/lib/contractor-service';
import { supabaseAdmin } from '@/lib/supabase';

type PurchaseRequestRow = {
  id: string;
  project_id: string | null;
  contractor_id: string | null;
  status: string | null;
  created_at?: string | null;
};

type PurchaseRequestItemRow = {
  purchase_request_id: string;
  requested_qty: number | null;
  unit_rate: number | null;
};

type CapitalTransactionRow = {
  purchase_request_id: string | null;
  transaction_type: 'deployment' | 'return' | string;
  amount: number | null;
  status: string | null;
  created_at?: string | null;
};

type ProjectRow = {
  id: string;
  project_name: string | null;
};

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const contractor = await ContractorService.getContractorByClerkId(userId);
    if (!contractor) {
      return NextResponse.json({ error: 'Contractor not found' }, { status: 404 });
    }

    const terms = {
      platform_fee_rate: contractor.platform_fee_rate ?? 0.0025,
      platform_fee_cap: contractor.platform_fee_cap ?? 25000,
      participation_fee_rate_daily: contractor.participation_fee_rate_daily ?? 0.001
    };

    const { data: purchaseRequests, error: purchaseRequestError } = await supabaseAdmin
      .from('purchase_requests')
      .select('id, project_id, contractor_id, status, created_at')
      .eq('contractor_id', contractor.id);

    if (purchaseRequestError) {
      console.error('Failed to load purchase requests:', purchaseRequestError);
      return NextResponse.json({ error: 'Failed to load purchase requests' }, { status: 500 });
    }

    const requests = (purchaseRequests || []) as PurchaseRequestRow[];
    const requestIds = requests.map((request) => request.id);

    if (requestIds.length === 0) {
      return NextResponse.json({
        summary: {
          total_requests: 0,
          total_requested_value: 0,
          total_funded: 0,
          total_platform_fee: 0,
          total_participation_fee: 0,
          total_due: 0,
          total_projects: 0
        },
        projects: [],
        requests: [],
        terms
      });
    }

    const { data: requestItems, error: itemsError } = await supabaseAdmin
      .from('purchase_request_items')
      .select('purchase_request_id, requested_qty, unit_rate')
      .in('purchase_request_id', requestIds);

    if (itemsError) {
      console.error('Failed to load purchase request items:', itemsError);
      return NextResponse.json({ error: 'Failed to load purchase request items' }, { status: 500 });
    }

    const { data: capitalTransactions, error: capitalError } = await supabaseAdmin
      .from('capital_transactions')
      .select('purchase_request_id, transaction_type, amount, status, created_at')
      .in('purchase_request_id', requestIds)
      .in('transaction_type', ['deployment', 'return'])
      .eq('status', 'completed');

    if (capitalError) {
      console.error('Failed to load capital transactions:', capitalError);
      return NextResponse.json({ error: 'Failed to load capital transactions' }, { status: 500 });
    }

    const requestTotals = new Map<string, number>();
    (requestItems as PurchaseRequestItemRow[] | null)?.forEach((item) => {
      const qty = Number(item.requested_qty ?? 0);
      const rate = Number(item.unit_rate ?? 0);
      const current = requestTotals.get(item.purchase_request_id) || 0;
      requestTotals.set(item.purchase_request_id, current + qty * rate);
    });

    const fundedTotals = new Map<string, number>();
    const firstDeploymentAt = new Map<string, string>();
    (capitalTransactions as CapitalTransactionRow[] | null)?.forEach((row) => {
      if (!row.purchase_request_id) return;
      const amount = Number(row.amount ?? 0);
      if (row.transaction_type === 'deployment') {
        const current = fundedTotals.get(row.purchase_request_id) || 0;
        fundedTotals.set(row.purchase_request_id, current + amount);
        if (row.created_at) {
          const existing = firstDeploymentAt.get(row.purchase_request_id);
          if (!existing || new Date(row.created_at).getTime() < new Date(existing).getTime()) {
            firstDeploymentAt.set(row.purchase_request_id, row.created_at);
          }
        }
      }
    });

    const projectIds = Array.from(new Set(requests.map((request) => request.project_id).filter(Boolean))) as string[];
    const projectMap = new Map<string, ProjectRow>();
    if (projectIds.length > 0) {
      const { data: projects, error: projectError } = await supabaseAdmin
        .from('projects')
        .select('id, project_name')
        .in('id', projectIds);

      if (projectError) {
        console.error('Failed to load projects:', projectError);
      } else {
        (projects as ProjectRow[] | null)?.forEach((project) => {
          projectMap.set(project.id, project);
        });
      }
    }

    const projectTotals = new Map<string, {
      project_id: string;
      project_name: string | null;
      total_requested: number;
      total_funded: number;
      total_platform_fee: number;
      total_participation_fee: number;
      total_due: number;
      request_count: number;
    }>();

    const requestRows = requests.map((request) => {
      const requestTotal = requestTotals.get(request.id) || 0;
      const funded = fundedTotals.get(request.id) || 0;
      const project = request.project_id ? projectMap.get(request.project_id) : null;
      const deployedAt = firstDeploymentAt.get(request.id);
      const daysOutstanding = deployedAt
        ? Math.max(
            0,
            Math.floor((Date.now() - new Date(deployedAt).getTime()) / (1000 * 60 * 60 * 24))
          )
        : 0;
      const platformFee = Math.min(funded * terms.platform_fee_rate, terms.platform_fee_cap);
      const participationFee = funded * terms.participation_fee_rate_daily * daysOutstanding;
      const totalDue = funded + platformFee + participationFee;

      return {
        id: request.id,
        project_id: request.project_id,
        project_name: project?.project_name ?? null,
        status: request.status ?? 'draft',
        created_at: request.created_at ?? null,
        total_requested: requestTotal,
        total_funded: funded,
        platform_fee: platformFee,
        participation_fee: participationFee,
        total_due: totalDue,
        days_outstanding: daysOutstanding
      };
    });

    let totalRequestedValue = 0;
    let totalFunded = 0;
    let totalPlatformFee = 0;
    let totalParticipationFee = 0;

    requests.forEach((request) => {
      if (!request.project_id) return;
      const requestTotal = requestTotals.get(request.id) || 0;
      const funded = fundedTotals.get(request.id) || 0;
      const deployedAt = firstDeploymentAt.get(request.id);
      const daysOutstanding = deployedAt
        ? Math.max(
            0,
            Math.floor((Date.now() - new Date(deployedAt).getTime()) / (1000 * 60 * 60 * 24))
          )
        : 0;
      const platformFee = Math.min(funded * terms.platform_fee_rate, terms.platform_fee_cap);
      const participationFee = funded * terms.participation_fee_rate_daily * daysOutstanding;
      const totalDue = funded + platformFee + participationFee;

      totalRequestedValue += requestTotal;
      totalFunded += funded;
      totalPlatformFee += platformFee;
      totalParticipationFee += participationFee;

      const existing = projectTotals.get(request.project_id);
      const project = projectMap.get(request.project_id);
      const base = existing || {
        project_id: request.project_id,
        project_name: project?.project_name ?? null,
        total_requested: 0,
        total_funded: 0,
        total_platform_fee: 0,
        total_participation_fee: 0,
        total_due: 0,
        request_count: 0
      };

      base.total_requested += requestTotal;
      base.total_funded += funded;
      base.total_platform_fee += platformFee;
      base.total_participation_fee += participationFee;
      base.total_due += totalDue;
      base.request_count += 1;
      projectTotals.set(request.project_id, base);
    });

    const totalDue = totalFunded + totalPlatformFee + totalParticipationFee;

    return NextResponse.json({
      summary: {
        total_requests: requests.length,
        total_requested_value: totalRequestedValue,
        total_funded: totalFunded,
        total_platform_fee: totalPlatformFee,
        total_participation_fee: totalParticipationFee,
        total_due: totalDue,
        total_projects: projectTotals.size
      },
      projects: Array.from(projectTotals.values())
        .sort((a, b) => b.total_due - a.total_due),
      requests: requestRows.sort((a, b) => {
        const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
        return bTime - aTime;
      }),
      terms
    });
  } catch (error) {
    console.error('Error in GET /api/contractor/finance/overview:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
