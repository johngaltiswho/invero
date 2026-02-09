import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';

type PurchaseRequestRow = {
  id: string;
  project_id: string | null;
  contractor_id: string | null;
  status: string | null;
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
};

type ProjectRow = {
  id: string;
  project_name: string | null;
  location: string | null;
  project_id_external?: string | null;
};

type ContractorRow = {
  id: string;
  company_name: string | null;
};

export async function GET() {
  try {
    await requireAdmin();

    const { data: purchaseRequests, error: purchaseRequestError } = await supabaseAdmin
      .from('purchase_requests')
      .select('id, project_id, contractor_id, status');

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
          total_returns: 0,
          total_outstanding: 0,
          total_projects: 0,
          total_contractors: 0
        },
        projects: []
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
      .select('purchase_request_id, transaction_type, amount, status')
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
    const returnTotals = new Map<string, number>();
    (capitalTransactions as CapitalTransactionRow[] | null)?.forEach((row) => {
      if (!row.purchase_request_id) return;
      const amount = Number(row.amount ?? 0);
      if (row.transaction_type === 'deployment') {
        const current = fundedTotals.get(row.purchase_request_id) || 0;
        fundedTotals.set(row.purchase_request_id, current + amount);
      } else if (row.transaction_type === 'return') {
        const current = returnTotals.get(row.purchase_request_id) || 0;
        returnTotals.set(row.purchase_request_id, current + amount);
      }
    });

    const projectIds = Array.from(
      new Set(
        requests
          .map((request) => (request.project_id ? request.project_id.trim() : null))
          .filter(Boolean)
      )
    ) as string[];
    const contractorIds = Array.from(new Set(requests.map((request) => request.contractor_id).filter(Boolean))) as string[];

    const projectMap = new Map<string, ProjectRow>();
    if (projectIds.length > 0) {
      const { data: projects, error: projectsError } = await supabaseAdmin
        .from('projects')
        .select('id, project_name, location, project_id_external')
        .in('id', projectIds);

      if (projectsError) {
        console.error('Failed to load projects:', projectsError);
      } else {
        (projects as ProjectRow[] | null)?.forEach((project) => {
          projectMap.set(project.id, project);
          if (project.project_id_external) {
            projectMap.set(project.project_id_external.trim(), project);
          }
        });
      }
    }

    if (projectIds.length > 0) {
      const missingProjectIds = projectIds.filter((id) => !projectMap.has(id));
      if (missingProjectIds.length > 0) {
        const { data: projectsByExternal, error: projectsByExternalError } = await supabaseAdmin
          .from('projects')
          .select('id, project_name, location, project_id_external')
          .in('project_id_external', missingProjectIds);

        if (projectsByExternalError) {
          console.error('Failed to load projects by external ID:', projectsByExternalError);
        } else {
          (projectsByExternal as ProjectRow[] | null)?.forEach((project) => {
            projectMap.set(project.id, project);
            if (project.project_id_external) {
              projectMap.set(project.project_id_external, project);
            }
          });
        }
      }
    }

    if (projectIds.length > 0) {
      const stillMissing = projectIds.filter((id) => !projectMap.has(id));
      if (stillMissing.length > 0) {
        const { data: projectsByName, error: projectsByNameError } = await supabaseAdmin
          .from('projects')
          .select('id, project_name, location, project_id_external')
          .in('project_name', stillMissing);

        if (projectsByNameError) {
          console.error('Failed to load projects by name:', projectsByNameError);
        } else {
          (projectsByName as ProjectRow[] | null)?.forEach((project) => {
            projectMap.set(project.id, project);
            if (project.project_id_external) {
              projectMap.set(project.project_id_external.trim(), project);
            }
            if (project.project_name) {
              projectMap.set(project.project_name.trim(), project);
            }
          });
        }
      }
    }

    const contractorMap = new Map<string, ContractorRow>();
    if (contractorIds.length > 0) {
      const { data: contractors, error: contractorsError } = await supabaseAdmin
        .from('contractors')
        .select('id, company_name')
        .in('id', contractorIds);

      if (contractorsError) {
        console.error('Failed to load contractors:', contractorsError);
      } else {
        (contractors as ContractorRow[] | null)?.forEach((contractor) => {
          contractorMap.set(contractor.id, contractor);
        });
      }
    }

    const projectTotals = new Map<string, {
      project_id: string;
      project_name: string | null;
      contractor_name: string | null;
      total_requested: number;
      total_funded: number;
      total_returns: number;
      total_outstanding: number;
      request_count: number;
    }>();

    let totalRequestedValue = 0;
    let totalFunded = 0;
    let totalReturns = 0;

    requests.forEach((request) => {
      if (!request.project_id) return;
      const normalizedProjectId = request.project_id.trim();
      const requestTotal = requestTotals.get(request.id) || 0;
      const funded = fundedTotals.get(request.id) || 0;
      const returns = returnTotals.get(request.id) || 0;

      totalRequestedValue += requestTotal;
      totalFunded += funded;
      totalReturns += returns;

      const existing = projectTotals.get(normalizedProjectId);
      const project = projectMap.get(normalizedProjectId);
      const contractor = request.contractor_id ? contractorMap.get(request.contractor_id) : null;
      const base = existing || {
        project_id: normalizedProjectId,
        project_name: project?.project_name ?? project?.project_id_external ?? normalizedProjectId,
        contractor_name: contractor?.company_name ?? null,
        total_requested: 0,
        total_funded: 0,
        total_returns: 0,
        total_outstanding: 0,
        request_count: 0
      };

      base.total_requested += requestTotal;
      base.total_funded += funded;
      base.total_returns += returns;
      base.total_outstanding = Math.max(base.total_funded - base.total_returns, 0);
      base.request_count += 1;
      projectTotals.set(normalizedProjectId, base);
    });

    const totalOutstanding = Math.max(totalFunded - totalReturns, 0);

    return NextResponse.json({
      summary: {
        total_requests: requests.length,
        total_requested_value: totalRequestedValue,
        total_funded: totalFunded,
        total_returns: totalReturns,
        total_outstanding: totalOutstanding,
        total_projects: projectTotals.size,
        total_contractors: contractorIds.length
      },
      projects: Array.from(projectTotals.values())
        .sort((a, b) => b.total_funded - a.total_funded)
    });
  } catch (error) {
    console.error('Error in GET /api/admin/finance/overview:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
