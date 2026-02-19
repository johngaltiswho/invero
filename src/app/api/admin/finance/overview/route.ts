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
  tax_percent: number | null;
};

type CapitalTransactionRow = {
  purchase_request_id: string | null;
  transaction_type: 'deployment' | 'return' | string;
  amount: number | null;
  status: string | null;
  created_at: string | null;
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
  platform_fee_rate: number | null;
  platform_fee_cap: number | null;
  participation_fee_rate_daily: number | null;
};

type InvestorRow = {
  id: string;
  name: string | null;
  email: string | null;
  investor_type: string | null;
};

type InvestorSummaryRow = {
  investor_id: string;
  investor_name: string | null;
  investor_email: string | null;
  investor_type: string | null;
  total_inflow: number;
  total_deployed: number;
  total_returns: number;
  xirr: number;
  net_xirr: number;
  disbursements: InvestorDisbursementRow[];
};

type CashflowPoint = { date: Date; amount: number };

type DeploymentTransactionRow = {
  investor_id: string | null;
  purchase_request_id: string | null;
  amount: number | null;
  created_at: string | null;
};

type InvestorDisbursementRow = {
  purchase_request_id: string;
  project_id: string | null;
  project_name: string | null;
  contractor_name: string | null;
  amount: number;
  last_deployed_at: string | null;
};

type InvestorTransactionRow = {
  investor_id: string | null;
  amount: number | null;
  transaction_type: 'inflow' | 'return' | string;
  status: string | null;
  created_at: string | null;
};

const computeXirr = (cashflows: CashflowPoint[]) => {
  if (!cashflows || cashflows.length < 2) return 0;
  const sorted = [...cashflows].sort((a, b) => a.date.getTime() - b.date.getTime());
  const t0 = sorted[0].date.getTime();
  const hasPositive = sorted.some((cf) => cf.amount > 0);
  const hasNegative = sorted.some((cf) => cf.amount < 0);
  if (!hasPositive || !hasNegative) return 0;

  let rate = 0.1;
  for (let i = 0; i < 100; i += 1) {
    let npv = 0;
    let dNpv = 0;
    for (const cf of sorted) {
      const years = (cf.date.getTime() - t0) / (1000 * 60 * 60 * 24 * 365);
      const denom = Math.pow(1 + rate, years);
      npv += cf.amount / denom;
      dNpv += (-years * cf.amount) / (denom * (1 + rate));
    }
    if (Math.abs(npv) < 1e-6) break;
    if (Math.abs(dNpv) < 1e-10) break;
    rate -= npv / dNpv;
    if (rate <= -0.9999) rate = -0.9999;
  }
  return Number.isFinite(rate) ? rate * 100 : 0;
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

    const { data: investorTransactions, error: investorTxError } = await supabaseAdmin
      .from('capital_transactions')
      .select('investor_id, amount, transaction_type, status, created_at')
      .in('transaction_type', ['inflow', 'return'])
      .neq('status', 'cancelled');

    if (investorTxError) {
      console.error('Failed to load investor transactions:', investorTxError);
    }

    const investorIdsFromTx = Array.from(
      new Set(((investorTransactions as InvestorTransactionRow[] | null) || []).map((row) => row.investor_id).filter(Boolean))
    ) as string[];

    const { data: investors, error: investorsError } = await supabaseAdmin
      .from('investors')
      .select('id, name, email, investor_type, status')
      .in('id', investorIdsFromTx.length > 0 ? investorIdsFromTx : ['00000000-0000-0000-0000-000000000000']);

    if (investorsError) {
      console.error('Failed to load investors:', investorsError);
    }

    const investorTransactionsById = new Map<string, { inflows: CashflowPoint[]; returns: CashflowPoint[] }>();
    (((investorTransactions as InvestorTransactionRow[] | null) || [])).forEach((row) => {
      if (!row.investor_id) return;
      const entry = investorTransactionsById.get(row.investor_id) || { inflows: [], returns: [] };
      const amount = Number(row.amount) || 0;
      const date = row.created_at ? new Date(row.created_at) : new Date();
      if (row.transaction_type === 'inflow' && row.status !== 'cancelled') {
        entry.inflows.push({ date, amount: -Math.abs(amount) });
      } else if (row.transaction_type === 'return' && row.status === 'completed') {
        entry.returns.push({ date, amount: Math.abs(amount) });
      }
      investorTransactionsById.set(row.investor_id, entry);
    });

    const investorSummaries: InvestorSummaryRow[] = (investors as InvestorRow[] | null || []).map((investorRow) => {
      const tx = investorTransactionsById.get(investorRow.id) || { inflows: [], returns: [] };
      const inflowTotal = tx.inflows.reduce((sum, cf) => sum + Math.abs(cf.amount), 0);
      const returnTotal = tx.returns.reduce((sum, cf) => sum + Math.abs(cf.amount), 0);
      const grossCashflows = [...tx.inflows, ...tx.returns];
      const grossXirr = computeXirr(grossCashflows);

      const managementFee = inflowTotal * 0.02;
      const grossProfit = returnTotal - inflowTotal;
      const hurdleAmount = inflowTotal * 0.12;
      const performanceFeeBase = Math.max(grossProfit - hurdleAmount, 0);
      const performanceFee = performanceFeeBase * 0.2;
      const totalFees = managementFee + performanceFee;

      const latestDate = grossCashflows.length
        ? new Date(Math.max(...grossCashflows.map((cf) => cf.date.getTime())))
        : new Date();
      const netCashflows = [...grossCashflows];
      if (totalFees > 0) {
        netCashflows.push({ date: latestDate, amount: -Math.abs(totalFees) });
      }
      const netXirr = computeXirr(netCashflows);

      return {
        investor_id: investorRow.id,
        investor_name: investorRow.name ?? null,
        investor_email: investorRow.email ?? null,
        investor_type: investorRow.investor_type ?? null,
        total_inflow: inflowTotal,
        total_deployed: 0,
        total_returns: returnTotal,
        xirr: grossXirr,
        net_xirr: netXirr,
        disbursements: []
      };
    });

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
        investors: investorSummaries,
        projects: []
      });
    }

    const { data: requestItems, error: itemsError } = await supabaseAdmin
      .from('purchase_request_items')
      .select('purchase_request_id, requested_qty, unit_rate, tax_percent')
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
      const taxPercent = Number(item.tax_percent ?? 0);
      const base = qty * rate;
      const tax = base * (taxPercent / 100);
      const current = requestTotals.get(item.purchase_request_id) || 0;
      requestTotals.set(item.purchase_request_id, current + base + tax);
    });

    const fundedTotals = new Map<string, number>();
    const returnTotals = new Map<string, number>();
    const firstDeploymentAtByRequest = new Map<string, string>();
    (capitalTransactions as CapitalTransactionRow[] | null)?.forEach((row) => {
      if (!row.purchase_request_id) return;
      const amount = Number(row.amount ?? 0);
      if (row.transaction_type === 'deployment') {
        const current = fundedTotals.get(row.purchase_request_id) || 0;
        fundedTotals.set(row.purchase_request_id, current + amount);
        if (row.created_at) {
          const existing = firstDeploymentAtByRequest.get(row.purchase_request_id);
          if (!existing || new Date(row.created_at).getTime() < new Date(existing).getTime()) {
            firstDeploymentAtByRequest.set(row.purchase_request_id, row.created_at);
          }
        }
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
        .select('id, company_name, platform_fee_rate, platform_fee_cap, participation_fee_rate_daily')
        .in('id', contractorIds);

      if (contractorsError) {
        console.error('Failed to load contractors:', contractorsError);
      } else {
        (contractors as ContractorRow[] | null)?.forEach((contractor) => {
          contractorMap.set(contractor.id, contractor);
        });
      }
    }

    const requestById = new Map<string, PurchaseRequestRow>();
    requests.forEach((request) => {
      requestById.set(request.id, request);
    });

    const { data: deploymentTransactions, error: deploymentError } = await supabaseAdmin
      .from('capital_transactions')
      .select('investor_id, purchase_request_id, amount, created_at')
      .eq('transaction_type', 'deployment')
      .eq('status', 'completed')
      .not('investor_id', 'is', null)
      .not('purchase_request_id', 'is', null);

    if (deploymentError) {
      console.error('Failed to load investor deployment transactions:', deploymentError);
    }

    const disbursementsByInvestor = new Map<string, Map<string, InvestorDisbursementRow>>();
    (deploymentTransactions as DeploymentTransactionRow[] | null || []).forEach((row) => {
      if (!row.investor_id || !row.purchase_request_id) return;
      const request = requestById.get(row.purchase_request_id);
      const projectId = request?.project_id?.trim() || null;
      const contractorId = request?.contractor_id || null;
      const project = projectId ? projectMap.get(projectId) : null;
      const contractor = contractorId ? contractorMap.get(contractorId) : null;

      const investorMap = disbursementsByInvestor.get(row.investor_id) || new Map<string, InvestorDisbursementRow>();
      const existing = investorMap.get(row.purchase_request_id);
      const amount = Number(row.amount || 0);
      const lastDeployedAt = row.created_at || null;

      if (!existing) {
        investorMap.set(row.purchase_request_id, {
          purchase_request_id: row.purchase_request_id,
          project_id: projectId,
          project_name: project?.project_name ?? project?.project_id_external ?? projectId,
          contractor_name: contractor?.company_name ?? null,
          amount,
          last_deployed_at: lastDeployedAt
        });
      } else {
        existing.amount += amount;
        if (lastDeployedAt && (!existing.last_deployed_at || new Date(lastDeployedAt).getTime() > new Date(existing.last_deployed_at).getTime())) {
          existing.last_deployed_at = lastDeployedAt;
        }
      }

      disbursementsByInvestor.set(row.investor_id, investorMap);
    });

    const investorSummariesWithDisbursements = investorSummaries.map((investor) => {
      const investorDisbursements = Array.from(disbursementsByInvestor.get(investor.investor_id)?.values() || [])
        .sort((a, b) => (new Date(b.last_deployed_at || 0).getTime() - new Date(a.last_deployed_at || 0).getTime()));
      const totalDeployed = investorDisbursements.reduce((sum, row) => sum + row.amount, 0);
      return {
        ...investor,
        total_deployed: totalDeployed,
        disbursements: investorDisbursements
      };
    });

    const projectTotals = new Map<string, {
      project_id: string;
      project_name: string | null;
      contractor_name: string | null;
      total_requested: number;
      total_funded: number;
      total_returns: number;
      total_platform_fee: number;
      total_participation_fee: number;
      total_outstanding: number;
      request_count: number;
    }>();

    let totalRequestedValue = 0;
    let totalFunded = 0;
    let totalReturns = 0;
    let totalPlatformFee = 0;
    let totalParticipationFee = 0;

    requests.forEach((request) => {
      if (!request.project_id) return;
      const normalizedProjectId = request.project_id.trim();
      const requestTotal = requestTotals.get(request.id) || 0;
      const funded = fundedTotals.get(request.id) || 0;
      const returns = returnTotals.get(request.id) || 0;
      const contractor = request.contractor_id ? contractorMap.get(request.contractor_id) : null;
      const deployedAt = firstDeploymentAtByRequest.get(request.id);
      const daysOutstanding = deployedAt
        ? Math.max(0, Math.floor((Date.now() - new Date(deployedAt).getTime()) / (1000 * 60 * 60 * 24)))
        : 0;
      const platformFeeRate = Number(contractor?.platform_fee_rate ?? 0.0025);
      const platformFeeCap = Number(contractor?.platform_fee_cap ?? 25000);
      const participationFeeRate = Number(contractor?.participation_fee_rate_daily ?? 0.001);
      const platformFee = Math.min(funded * platformFeeRate, platformFeeCap);
      const participationFee = funded * participationFeeRate * daysOutstanding;
      const outstandingForRequest = Math.max(funded + platformFee + participationFee - returns, 0);

      totalRequestedValue += requestTotal;
      totalFunded += funded;
      totalReturns += returns;
      totalPlatformFee += platformFee;
      totalParticipationFee += participationFee;

      const existing = projectTotals.get(normalizedProjectId);
      const project = projectMap.get(normalizedProjectId);
      const base = existing || {
        project_id: normalizedProjectId,
        project_name: project?.project_name ?? project?.project_id_external ?? normalizedProjectId,
        contractor_name: contractor?.company_name ?? null,
        total_requested: 0,
        total_funded: 0,
        total_returns: 0,
        total_platform_fee: 0,
        total_participation_fee: 0,
        total_outstanding: 0,
        request_count: 0
      };

      base.total_requested += requestTotal;
      base.total_funded += funded;
      base.total_returns += returns;
      base.total_platform_fee += platformFee;
      base.total_participation_fee += participationFee;
      base.total_outstanding += outstandingForRequest;
      base.request_count += 1;
      projectTotals.set(normalizedProjectId, base);
    });

    const totalOutstanding = Math.max(totalFunded + totalPlatformFee + totalParticipationFee - totalReturns, 0);

    return NextResponse.json({
      summary: {
        total_requests: requests.length,
        total_requested_value: totalRequestedValue,
        total_funded: totalFunded,
        total_returns: totalReturns,
        total_platform_fee: totalPlatformFee,
        total_participation_fee: totalParticipationFee,
        total_outstanding: totalOutstanding,
        total_projects: projectTotals.size,
        total_contractors: contractorIds.length
      },
      investors: investorSummariesWithDisbursements,
      projects: Array.from(projectTotals.values())
        .sort((a, b) => b.total_funded - a.total_funded)
    });
  } catch (error) {
    console.error('Error in GET /api/admin/finance/overview:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
