import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { fetchPurchaseRequestAdditionalChargesByRequestIds } from '@/lib/purchase-request-additional-charges';
import { calculatePurchaseRequestTotals } from '@/lib/purchase-request-totals';
import { supabaseAdmin } from '@/lib/supabase';
import { calculateCapitalAccrualMetrics, groupTransactionsByPurchaseRequest } from '@/lib/capital-accrual';
import { calculateSoftPoolValuation } from '@/lib/pool-valuation';

type PurchaseRequestRow = {
  id: string;
  project_id: string | null;
  contractor_id: string | null;
  status: string | null;
  delivery_status?: string | null;
  vendor_id?: number | null;
};

type PurchaseRequestItemRow = {
  purchase_request_id: string;
  requested_qty: number | null;
  purchase_qty: number | null;
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

type InvestorPoolPositionRow = {
  investor_id: string;
  investor_name: string | null;
  investor_email: string | null;
  investor_type: string | null;
  contributed_capital: number;
  units_held: number;
  ownership_percent: number;
  entry_nav_per_unit: number;
  gross_value: number;
  net_value: number;
  gross_gain: number;
  net_gain: number;
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

type VendorRow = {
  id: number;
  name: string | null;
};

type FundingLedgerEntry = {
  purchase_request_id: string;
  project_id: string | null;
  project_name: string | null;
  contractor_name: string | null;
  vendor_name: string | null;
  event_type: 'deployment' | 'return';
  event_date: string | null;
  amount: number;
  running_principal_outstanding: number;
  running_fee_outstanding: number;
  running_total_outstanding: number;
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

    // Get all purchase requests for historical data
    const { data: purchaseRequests, error: purchaseRequestError } = await supabaseAdmin
      .from('purchase_requests')
      .select('id, project_id, contractor_id, status, delivery_status, vendor_id');

    // Also get only requests that need funding (submitted/approved, not yet fully funded)
    const { data: openRequests, error: openRequestsError } = await supabaseAdmin
      .from('purchase_requests')
      .select('id, project_id, contractor_id, status, delivery_status, vendor_id')
      .in('status', ['submitted', 'approved']);

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

    const { data: poolTransactions, error: poolTransactionsError } = await supabaseAdmin
      .from('capital_transactions')
      .select('purchase_request_id, transaction_type, amount, status, created_at')
      .in('transaction_type', ['deployment', 'return'])
      .not('purchase_request_id', 'is', null)
      .eq('status', 'completed');

    if (poolTransactionsError) {
      console.error('Failed to load pool transactions:', poolTransactionsError);
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
          funding_required: 0,
          total_projects: 0,
          total_contractors: 0
        },
        investors: investorSummaries,
        projects: []
      });
    }

    let requestItems: PurchaseRequestItemRow[] | null = null;
    let itemsError: { message?: string } | null = null;

    const requestItemsWithPurchaseQty = await supabaseAdmin
      .from('purchase_request_items')
      .select('purchase_request_id, requested_qty, purchase_qty, unit_rate, tax_percent')
      .in('purchase_request_id', requestIds);
    requestItems = (requestItemsWithPurchaseQty.data as PurchaseRequestItemRow[] | null) ?? null;
    itemsError = requestItemsWithPurchaseQty.error;

    if (itemsError && String(itemsError.message || '').includes('purchase_qty')) {
      const fallbackItems = await supabaseAdmin
        .from('purchase_request_items')
        .select('purchase_request_id, requested_qty, unit_rate, tax_percent')
        .in('purchase_request_id', requestIds);
      requestItems = (fallbackItems.data as PurchaseRequestItemRow[] | null) ?? null;
      itemsError = fallbackItems.error;
    }

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

    const { chargesByRequestId } = await fetchPurchaseRequestAdditionalChargesByRequestIds(supabaseAdmin, requestIds);
    const itemsByRequestId = new Map<string, PurchaseRequestItemRow[]>();
    (requestItems || []).forEach((item) => {
      const current = itemsByRequestId.get(item.purchase_request_id) || [];
      current.push(item);
      itemsByRequestId.set(item.purchase_request_id, current);
    });

    const requestTotals = new Map<string, number>();
    requestIds.forEach((requestId) => {
      requestTotals.set(
        requestId,
        calculatePurchaseRequestTotals({
          items: itemsByRequestId.get(requestId) || [],
          additionalCharges: chargesByRequestId.get(requestId) || []
        }).grand_total
      );
    });

    const transactionsByRequest = groupTransactionsByPurchaseRequest((capitalTransactions as CapitalTransactionRow[] | null) || []);

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
        .select('id, project_name, project_id_external')
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
          .select('id, project_name, project_id_external')
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
          .select('id, project_name, project_id_external')
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

    const vendorIds = Array.from(new Set(requests.map((request) => request.vendor_id).filter(Boolean))) as number[];
    const vendorMap = new Map<number, VendorRow>();
    if (vendorIds.length > 0) {
      const { data: vendors, error: vendorsError } = await supabaseAdmin
        .from('vendors')
        .select('id, name')
        .in('id', vendorIds);

      if (vendorsError) {
        console.error('Failed to load vendors:', vendorsError);
      } else {
        (vendors as VendorRow[] | null)?.forEach((vendor) => {
          vendorMap.set(vendor.id, vendor);
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
    let fundingRequired = 0; // Only for open (submitted/approved) requests
    const fundingLedger: FundingLedgerEntry[] = [];
    const requestSummaries: Array<{
      purchase_request_id: string;
      project_id: string | null;
      project_name: string | null;
      contractor_name: string | null;
      vendor_name: string | null;
      status: string | null;
      delivery_status: string | null;
      requested_total: number;
      funded_total: number;
      returned_total: number;
      outstanding_principal: number;
      outstanding_fee: number;
      outstanding_total: number;
      remaining_due: number;
      platform_fee: number;
      participation_fee: number;
      days_outstanding: number;
    }> = [];

    // Calculate funding required for open requests only
    const openRequestIds = new Set<string>((openRequests || []).map(r => r.id as string));
    openRequestIds.forEach((requestId) => {
      const requestTotal = requestTotals.get(requestId) || 0;
      const funded = calculateCapitalAccrualMetrics({
        transactions: transactionsByRequest.get(requestId) || [],
        purchaseRequestTotal: requestTotal
      }).fundedAmount;
      // Funding required = requested - already funded
      fundingRequired += Math.max(requestTotal - funded, 0);
    });

    requests.forEach((request) => {
      if (!request.project_id) return;
      const normalizedProjectId = request.project_id.trim();
      const requestTotal = requestTotals.get(request.id) || 0;
      const contractor = request.contractor_id ? contractorMap.get(request.contractor_id) : null;
      const vendor = request.vendor_id ? vendorMap.get(request.vendor_id) : null;
      const metrics = calculateCapitalAccrualMetrics({
        transactions: transactionsByRequest.get(request.id) || [],
        terms: contractor,
        purchaseRequestTotal: requestTotal
      });
      const funded = metrics.fundedAmount;
      const returns = metrics.returnedAmount;
      const platformFee = metrics.platformFee;
      const participationFee = metrics.participationFee;
      const outstandingForRequest = metrics.remainingDue;

      totalRequestedValue += requestTotal;
      totalFunded += funded;
      totalReturns += returns;
      totalPlatformFee += platformFee;
      totalParticipationFee += participationFee;

      requestSummaries.push({
        purchase_request_id: request.id,
        project_id: normalizedProjectId,
        project_name: projectMap.get(normalizedProjectId)?.project_name ?? projectMap.get(normalizedProjectId)?.project_id_external ?? null,
        contractor_name: contractor?.company_name ?? null,
        vendor_name: vendor?.name ?? null,
        status: request.status,
        delivery_status: request.delivery_status ?? null,
        requested_total: requestTotal,
        funded_total: funded,
        returned_total: returns,
        outstanding_principal: metrics.outstandingPrincipal,
        outstanding_fee: metrics.outstandingParticipationFee,
        outstanding_total: metrics.remainingInvestorDue,
        remaining_due: metrics.remainingDue,
        platform_fee: platformFee,
        participation_fee: participationFee,
        days_outstanding: metrics.daysOutstanding
      });

      const requestTransactions = [...(transactionsByRequest.get(request.id) || [])]
        .sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());

      requestTransactions.forEach((transaction, index) => {
        const ledgerMetrics = calculateCapitalAccrualMetrics({
          transactions: requestTransactions.slice(0, index + 1),
          terms: contractor,
          purchaseRequestTotal: requestTotal
        });

        fundingLedger.push({
          purchase_request_id: request.id,
          project_id: normalizedProjectId,
          project_name: projectMap.get(normalizedProjectId)?.project_name ?? projectMap.get(normalizedProjectId)?.project_id_external ?? null,
          contractor_name: contractor?.company_name ?? null,
          vendor_name: vendor?.name ?? null,
          event_type: transaction.transaction_type === 'return' ? 'return' : 'deployment',
          event_date: transaction.created_at || null,
          amount: Number(transaction.amount || 0),
          running_principal_outstanding: ledgerMetrics.outstandingPrincipal,
          running_fee_outstanding: ledgerMetrics.outstandingParticipationFee,
          running_total_outstanding: ledgerMetrics.remainingInvestorDue
        });
      });

      const existing = projectTotals.get(normalizedProjectId);
      const project = projectMap.get(normalizedProjectId);
      const base = existing || {
        project_id: normalizedProjectId,
        project_name: project?.project_name ?? project?.project_id_external ?? null,
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

    const totalOutstanding = Math.max(
      Array.from(projectTotals.values()).reduce((sum, project) => sum + project.total_outstanding, 0),
      0
    );

    const poolValuation = calculateSoftPoolValuation({
      investorInflows: (((investorTransactions as InvestorTransactionRow[] | null) || [])).filter((row) => row.transaction_type === 'inflow'),
      investorDistributions: (((investorTransactions as InvestorTransactionRow[] | null) || [])).filter((row) => row.transaction_type === 'return'),
      poolTransactions: (poolTransactions as CapitalTransactionRow[] | null) || [],
      purchaseRequests: requests,
      contractors: Array.from(contractorMap.values()),
      projects: Array.from(
        new Map(
          Array.from(projectMap.values()).map((project) => [project.id, project])
        ).values()
      )
    });

    const investorPoolPositions: InvestorPoolPositionRow[] = (investors as InvestorRow[] | null || [])
      .map((investor) => {
        const position = poolValuation.positions.find((row) => row.investorId === investor.id);
        if (!position) return null;
        return {
          investor_id: investor.id,
          investor_name: investor.name ?? null,
          investor_email: investor.email ?? null,
          investor_type: investor.investor_type ?? null,
          contributed_capital: position.contributedCapital,
          units_held: position.unitsHeld,
          ownership_percent: position.ownershipPercent,
          entry_nav_per_unit: position.entryNavPerUnit,
          gross_value: position.grossValue,
          net_value: position.netValue,
          gross_gain: position.grossGain,
          net_gain: position.netGain
        };
      })
      .filter(Boolean) as InvestorPoolPositionRow[];

    return NextResponse.json({
      summary: {
        total_requests: requests.length,
        total_requested_value: totalRequestedValue,
        total_funded: totalFunded,
        total_returns: totalReturns,
        total_platform_fee: totalPlatformFee,
        total_participation_fee: totalParticipationFee,
        total_outstanding: totalOutstanding,
        funding_required: fundingRequired, // Only open requests that need funding
        total_projects: projectTotals.size,
        total_contractors: contractorIds.length
      },
      pool_summary: {
        valuation_date: poolValuation.valuationDate,
        total_committed_capital: poolValuation.totalCommittedCapital,
        total_pool_units: poolValuation.totalPoolUnits,
        gross_nav_per_unit: poolValuation.grossNavPerUnit,
        net_nav_per_unit: poolValuation.netNavPerUnit,
        pool_cash: poolValuation.poolCash,
        deployed_principal: poolValuation.deployedPrincipal,
        accrued_participation_income: poolValuation.accruedParticipationIncome,
        realized_participation_income: poolValuation.realizedParticipationIncome,
        preferred_return_accrued: poolValuation.preferredReturnAccrued,
        management_fee_accrued: poolValuation.managementFeeAccrued,
        realized_carry_accrued: poolValuation.realizedCarryAccrued,
        potential_carry: poolValuation.potentialCarry,
        gross_pool_value: poolValuation.grossPoolValue,
        net_pool_value: poolValuation.netPoolValue,
        realized_xirr: poolValuation.realizedXirr,
        projected_gross_xirr: poolValuation.projectedGrossXirr,
        projected_net_xirr: poolValuation.projectedNetXirr
      },
      investor_positions: investorPoolPositions,
      investors: investorSummariesWithDisbursements,
      projects: Array.from(projectTotals.values())
        .sort((a, b) => b.total_funded - a.total_funded),
      requests: requestSummaries.sort((a, b) => b.outstanding_total - a.outstanding_total),
      funding_ledger: fundingLedger.sort((a, b) => new Date(b.event_date || 0).getTime() - new Date(a.event_date || 0).getTime())
    });
  } catch (error) {
    console.error('Error in GET /api/admin/finance/overview:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
