import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { calculateSoftPoolValuation } from '@/lib/pool-valuation';
import { listLenderSleevesForInvestor } from '@/lib/lender-sleeves';
import { listLenderAllocationIntentsForInvestor, refreshAllocationIntentReadiness } from '@/lib/lender-allocation-intents';
import { selectCurrentInvestorAgreements } from '@/lib/agreements/service';
import { getInvestorAuthErrorStatus, resolveActiveInvestor } from '@/lib/investor-auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    console.log('🔍 Investor Profile API called');
    const { investor, user } = await resolveActiveInvestor();
    console.log('✅ User authenticated, email:', user?.emailAddresses?.[0]?.emailAddress);

    console.log('✅ Active investor found:', investor.name);

    const [sleeves, investorAgreements, allocationIntents] = await Promise.all([
      listLenderSleevesForInvestor(investor.id),
      supabase
        .from('investor_agreements')
        .select('id, lender_sleeve_id, status, agreement_model_type, executed_at, created_at, superseded_at')
        .eq('investor_id', investor.id)
        .order('created_at', { ascending: false }),
      listLenderAllocationIntentsForInvestor(investor.id),
    ]);

    const currentAgreements = selectCurrentInvestorAgreements((investorAgreements.data || []) as any[]);
    const currentAgreementBySleeveId = new Map(currentAgreements.map((agreement: any) => [agreement.lender_sleeve_id, agreement]));
    const refreshedAllocationIntents = await Promise.all(
      (allocationIntents || []).map((intent) =>
        ['draft', 'agreements_pending', 'ready_for_funding'].includes(intent.status)
          ? refreshAllocationIntentReadiness(intent.id)
          : intent
      )
    );

    // Fetch all projects for investment opportunities
    console.log('🔄 Fetching all projects for opportunities...');
    const { data: allProjects, error: projectsError } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (projectsError) {
      console.error('❌ Error fetching projects:', projectsError);
    }

    // Fetch all contractors 
    console.log('🔄 Fetching all contractors...');
    const { data: allContractors, error: contractorsError } = await supabase
      .from('contractors')
      .select('*')
      .order('created_at', { ascending: false });

    if (contractorsError) {
      console.error('❌ Error fetching contractors:', contractorsError);
    }

    const [completedInflowsRes, poolDistributionsRes, poolTransactionsRes, poolRequestsRes, allLenderSleevesRes, capitalAllocationsRes] = await Promise.all([
      supabase
        .from('capital_transactions')
        .select('id, investor_id, amount, created_at, status, transaction_type')
        .eq('transaction_type', 'inflow')
        .eq('status', 'completed'),
      supabase
        .from('capital_transactions')
        .select('investor_id, amount, created_at, status, transaction_type')
        .eq('transaction_type', 'return')
        .not('investor_id', 'is', null)
        .eq('status', 'completed'),
      supabase
        .from('capital_transactions')
        .select('purchase_request_id, amount, created_at, status, transaction_type')
        .in('transaction_type', ['deployment', 'return'])
        .not('purchase_request_id', 'is', null)
        .eq('status', 'completed'),
      supabase
        .from('purchase_requests')
        .select('id, project_id, contractor_id, status'),
      supabase
        .from('lender_sleeves')
        .select('id, model_type'),
      supabase
        .from('lender_capital_allocations')
        .select('investor_id, lender_sleeve_id, capital_transaction_id, allocation_amount, created_at')
        .not('capital_transaction_id', 'is', null)
    ]);

    if (completedInflowsRes.error) {
      console.error('❌ Error fetching completed inflows:', completedInflowsRes.error);
    }

    if (poolDistributionsRes.error) {
      console.error('❌ Error fetching investor distributions:', poolDistributionsRes.error);
    }

    if (poolTransactionsRes.error) {
      console.error('❌ Error fetching pool transactions:', poolTransactionsRes.error);
    }

    if (poolRequestsRes.error) {
      console.error('❌ Error fetching purchase requests for pool valuation:', poolRequestsRes.error);
    }

    if (allLenderSleevesRes.error) {
      console.error('❌ Error fetching lender sleeves for pool valuation:', allLenderSleevesRes.error);
    }

    if (capitalAllocationsRes.error) {
      console.error('❌ Error fetching capital allocations for pool valuation:', capitalAllocationsRes.error);
    }

    const completedInflowsById = new Map(
      ((completedInflowsRes.data as any[]) || []).map((row) => [row.id, row])
    );
    const poolSleeveIds = new Set(
      ((allLenderSleevesRes.data as any[]) || [])
        .filter((row) => row.model_type === 'pool_participation')
        .map((row) => row.id)
    );
    const allocationRows = (capitalAllocationsRes.data as any[]) || [];

    const poolInvestorInflows = allocationRows
      .filter((row) => row.capital_transaction_id && poolSleeveIds.has(row.lender_sleeve_id))
      .map((row) => {
        const inflow = completedInflowsById.get(row.capital_transaction_id);
        if (!inflow) return null;
        return {
          investor_id: row.investor_id,
          amount: Number(row.allocation_amount || 0),
          created_at: inflow.created_at,
          status: inflow.status,
          transaction_type: inflow.transaction_type,
        };
      })
      .filter(Boolean) as Array<{
        investor_id: string;
        amount: number;
        created_at: string;
        status: string;
        transaction_type: string;
      }>;

    const poolInflows = poolInvestorInflows.length > 0
      ? poolInvestorInflows
      : (((completedInflowsRes.data as any[]) || []).map((row) => ({
          investor_id: row.investor_id,
          amount: Number(row.amount || 0),
          created_at: row.created_at,
          status: row.status,
          transaction_type: row.transaction_type,
        })));

    const poolValuation = calculateSoftPoolValuation({
      investorInflows: poolInflows,
      investorDistributions: poolDistributionsRes.data || [],
      poolTransactions: poolTransactionsRes.data || [],
      purchaseRequests: poolRequestsRes.data || [],
      contractors: (allContractors || []).map((contractor: any) => ({
        id: contractor.id,
        company_name: contractor.company_name || contractor.companyName || null,
        participation_fee_rate_daily: contractor.participation_fee_rate_daily
      })),
      projects: (allProjects || []).map((project: any) => ({
        id: project.id,
        project_name: project.project_name || project.projectName || null
      }))
    });

    const poolPosition = poolValuation.positions.find((position) => position.investorId === investor.id) || {
      investorId: investor.id,
      contributedCapital: 0,
      unitsHeld: 0,
      ownershipPercent: 0,
      entryNavPerUnit: 100,
      grossValue: 0,
      netValue: 0,
      grossGain: 0,
      netGain: 0
    };
    const ownershipRatio = poolPosition.ownershipPercent / 100;
    const grossToNetRatio = poolValuation.grossPoolValue > 0
      ? poolValuation.netPoolValue / poolValuation.grossPoolValue
      : 1;
    const investorExposure = poolValuation.exposures.map((exposure) => {
      const investorGrossExposure = exposure.grossExposureValue * ownershipRatio;
      const investorNetExposure = investorGrossExposure * grossToNetRatio;
      return {
        ...exposure,
        ownershipPercent: poolPosition.ownershipPercent,
        investorGrossExposure,
        investorNetExposure
      };
    });

    // Fetch capital deployments for this investor
    console.log('🔄 Fetching investor capital deployments...');
    const { data: capitalTransactions, error: capitalError } = await supabase
      .from('capital_transactions')
      .select(`
        id,
        investor_id,
        project_id,
        contractor_id,
        amount,
        transaction_type,
        status,
        description,
        reference_number,
        created_at,
        updated_at,
        projects:project_id (*),
        contractors:contractor_id (*)
      `)
      .eq('investor_id', investor.id)
      .eq('transaction_type', 'deployment')
      .order('created_at', { ascending: false });

    if (capitalError) {
      console.error('❌ Error fetching capital transactions:', capitalError);
    }

    // Fetch capital inflows for this investor
    console.log('🔄 Fetching investor capital inflows...');
    const { data: inflowTransactions, error: inflowError } = await supabase
      .from('capital_transactions')
      .select('amount, status, created_at')
      .eq('investor_id', investor.id)
      .eq('transaction_type', 'inflow');

    if (inflowError) {
      console.error('❌ Error fetching capital inflows:', inflowError);
    }

    // Fetch capital returns for this investor
    console.log('🔄 Fetching investor capital returns...');
    const { data: returnTransactions, error: returnError } = await supabase
      .from('capital_transactions')
      .select('amount, status, created_at, transaction_type')
      .eq('investor_id', investor.id)
      .eq('transaction_type', 'return');

    if (returnError) {
      console.error('❌ Error fetching capital returns:', returnError);
    }

    // Fetch all capital transactions for investor (for financials)
    const { data: allTransactions, error: allTransactionsError } = await supabase
      .from('capital_transactions')
      .select(`
        id,
        investor_id,
        project_id,
        contractor_id,
        amount,
        transaction_type,
        status,
        description,
        reference_number,
        created_at,
        projects:project_id ( project_name ),
        contractors:contractor_id ( company_name )
      `)
      .eq('investor_id', investor.id)
      .order('created_at', { ascending: false });

    if (allTransactionsError) {
      console.error('❌ Error fetching all capital transactions:', allTransactionsError);
    }

    const investments = (capitalTransactions || []).map((tx: any) => ({
      id: tx.id,
      investorId: tx.investor_id,
      projectId: tx.project_id,
      contractorId: tx.contractor_id || tx.projects?.contractor_id || null,
      investmentAmount: Number(tx.amount) || 0,
      investmentDate: tx.created_at,
      expectedReturn: tx.projects?.expected_irr ?? 0,
      actualReturn: null,
      status: tx.status === 'completed' ? 'Completed' : 'Active',
      description: tx.description,
      referenceNumber: tx.reference_number,
      project: tx.projects,
      contractor: tx.contractors
    }));

    const totalInvested = investments.reduce((sum, inv) => sum + (inv.investmentAmount || 0), 0);
    const activeInvestments = investments.filter(inv => inv.status !== 'Completed').length;
    const completedInvestments = investments.filter(inv => inv.status === 'Completed').length;
    const cleanSum = (transactions?: { amount: number; status?: string | null }[]) => {
      return (transactions || []).reduce((sum, tx) => {
        const amount = Number(tx.amount) || 0;
        const status = typeof tx.status === 'string' ? tx.status.toLowerCase() : '';
        if (status === 'failed' || status === 'rejected') {
          return sum;
        }
        return sum + amount;
      }, 0);
    };

    const totalCapitalInflow = cleanSum(inflowTransactions || []);
    const totalCapitalReturns = cleanSum(returnTransactions || []);
    const managementFee = poolValuation.managementFeeAccrued * ownershipRatio;
    const realizedCarry = poolValuation.realizedCarryAccrued * ownershipRatio;
    const potentialCarry = poolValuation.potentialCarry * ownershipRatio;
    const netCapitalReturns = Math.max(totalCapitalReturns - realizedCarry, 0);
    const outstandingCapital = poolPosition.netValue;

    type CashflowPoint = { date: Date; amount: number };

    const buildCashflows = (transactions: any[]) => {
      return (transactions || [])
        .filter((tx) => {
          const status = typeof tx.status === 'string' ? tx.status.toLowerCase() : '';
          return status !== 'failed' && status !== 'rejected';
        })
        .map((tx) => {
          const amount = Number(tx.amount) || 0;
          const date = tx.created_at ? new Date(tx.created_at) : new Date();
          if (tx.transaction_type === 'deployment') {
            return { date, amount: -Math.abs(amount) };
          }
          if (tx.transaction_type === 'return') {
            return { date, amount: Math.abs(amount) };
          }
          return null;
        })
        .filter(Boolean) as CashflowPoint[];
    };

    const xirr = (cashflows: CashflowPoint[]) => {
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
        if (rate <= -0.9999) {
          rate = -0.9999;
        }
      }
      return Number.isFinite(rate) ? rate * 100 : 0;
    };

    const portfolioCashflows = buildCashflows([...(capitalTransactions || []), ...(returnTransactions || [])]);
    const portfolioXirr = xirr(portfolioCashflows);

    const investorCashflows = (inflowTransactions || [])
      .filter((tx) => {
        const status = typeof tx.status === 'string' ? tx.status.toLowerCase() : '';
        return status !== 'failed' && status !== 'rejected';
      })
      .map((tx) => ({
        date: tx.created_at ? new Date(tx.created_at) : new Date(),
        amount: -Math.abs(Number(tx.amount) || 0)
      }))
      .concat(
        (returnTransactions || [])
          .filter((tx) => {
            const status = typeof tx.status === 'string' ? tx.status.toLowerCase() : '';
            return status !== 'failed' && status !== 'rejected';
          })
          .map((tx) => ({
            date: tx.created_at ? new Date(tx.created_at) : new Date(),
            amount: Math.abs(Number(tx.amount) || 0)
          }))
      );
    const realizedInvestorRoi = xirr(investorCashflows);

    console.log(`✅ Fetched ${allProjects?.length || 0} projects, ${allContractors?.length || 0} contractors, ${investments.length} capital deployments`);

    const projectIds = (allProjects || []).map(project => project.id);
    const projectProgressMap = new Map<string, number>();
    const projectFundingMap = new Map<string, number>();

    if (projectIds.length > 0) {
      const { data: scheduleTasks, error: scheduleError } = await supabase
        .from('schedule_tasks')
        .select(`
          progress,
          schedules:project_schedules (
            project_id
          )
        `)
        .in('schedules.project_id', projectIds);

      if (scheduleError) {
        console.error('❌ Error fetching schedule tasks for progress:', scheduleError);
      } else {
        const progressBuckets: Record<string, number[]> = {};

        scheduleTasks?.forEach((task: any) => {
          const projectId = task.schedules?.project_id;
          if (!projectId) return;
          if (!progressBuckets[projectId]) {
            progressBuckets[projectId] = [];
          }
          progressBuckets[projectId].push(task.progress || 0);
        });

        Object.entries(progressBuckets).forEach(([projectId, progresses]) => {
          if (progresses.length === 0) return;
          const avgProgress = progresses.reduce((sum, value) => sum + value, 0) / progresses.length;
          projectProgressMap.set(projectId, avgProgress);
        });
      }
    }

    if (projectIds.length > 0) {
      let purchaseRequestItems: any[] | null = null;
      let purchaseRequestError: { message?: string } | null = null;

      const purchaseItemsWithPurchaseQty = await supabase
        .from('purchase_request_items')
        .select(`
          requested_qty,
          purchase_qty,
          unit_rate,
          purchase_requests!inner (
            project_id
          )
        `)
        .in('purchase_requests.project_id', projectIds);
      purchaseRequestItems = purchaseItemsWithPurchaseQty.data as any[] | null;
      purchaseRequestError = purchaseItemsWithPurchaseQty.error;

      if (purchaseRequestError && String(purchaseRequestError.message || '').includes('purchase_qty')) {
        const fallbackPurchaseItems = await supabase
          .from('purchase_request_items')
          .select(`
            requested_qty,
            unit_rate,
            purchase_requests!inner (
              project_id
            )
          `)
          .in('purchase_requests.project_id', projectIds);
        purchaseRequestItems = fallbackPurchaseItems.data as any[] | null;
        purchaseRequestError = fallbackPurchaseItems.error;
      }

      if (purchaseRequestError) {
        console.error('❌ Error fetching purchase request totals:', purchaseRequestError);
      } else {
        purchaseRequestItems?.forEach((item: any) => {
          const projectId = item.purchase_requests?.project_id;
          if (!projectId) return;
          const qty = Number(item.purchase_qty ?? item.requested_qty) || 0;
          const rate = Number(item.unit_rate) || 0;
          const amount = rate > 0 ? qty * rate : qty;
          const currentTotal = projectFundingMap.get(projectId) || 0;
          projectFundingMap.set(projectId, currentTotal + amount);
        });
      }
    }

    const enhancedProjects = (allProjects || []).map(project => ({
      ...project,
      schedule_progress: projectProgressMap.get(project.id) ?? project.current_progress ?? 0,
      purchase_request_total: projectFundingMap.get(project.id) ?? project.purchase_request_total ?? null
    }));

    const investorProfile = {
      id: investor.id,
      investorName: investor.name,
      email: investor.email,
      investorType: investor.investor_type,
      phone: investor.phone,
      status: investor.status,
      investments,
      transactions: allTransactions || [],
      returns: [],
      poolPosition: {
        unitsHeld: poolPosition.unitsHeld,
        ownershipPercent: poolPosition.ownershipPercent,
        entryNavPerUnit: poolPosition.entryNavPerUnit,
        grossValue: poolPosition.grossValue,
        netValue: poolPosition.netValue,
        grossGain: poolPosition.grossGain,
        netGain: poolPosition.netGain,
        contributedCapital: poolPosition.contributedCapital,
        shareOfPoolCash: poolValuation.poolCash * ownershipRatio,
        shareOfDeployedPrincipal: poolValuation.deployedPrincipal * ownershipRatio,
        shareOfAccruedParticipationIncome: poolValuation.accruedParticipationIncome * ownershipRatio,
        shareOfPreferredReturnAccrued: poolValuation.preferredReturnAccrued * ownershipRatio,
        shareOfManagementFeeAccrued: managementFee,
        shareOfRealizedCarry: realizedCarry,
        shareOfPotentialCarry: potentialCarry
      },
      poolSummary: {
        valuationDate: poolValuation.valuationDate,
        totalCommittedCapital: poolValuation.totalCommittedCapital,
        totalPoolUnits: poolValuation.totalPoolUnits,
        grossNavPerUnit: poolValuation.grossNavPerUnit,
        netNavPerUnit: poolValuation.netNavPerUnit,
        poolCash: poolValuation.poolCash,
        deployedPrincipal: poolValuation.deployedPrincipal,
        accruedParticipationIncome: poolValuation.accruedParticipationIncome,
        realizedParticipationIncome: poolValuation.realizedParticipationIncome,
        preferredReturnAccrued: poolValuation.preferredReturnAccrued,
        managementFeeAccrued: poolValuation.managementFeeAccrued,
        realizedCarryAccrued: poolValuation.realizedCarryAccrued,
        potentialCarry: poolValuation.potentialCarry,
        grossPoolValue: poolValuation.grossPoolValue,
        netPoolValue: poolValuation.netPoolValue,
        realizedXirr: poolValuation.realizedXirr,
        projectedGrossXirr: poolValuation.projectedGrossXirr,
        projectedNetXirr: poolValuation.projectedNetXirr
      },
      poolExposure: investorExposure,
      sleeves: (sleeves || []).map((sleeve) => {
        const latestAgreement = currentAgreementBySleeveId.get(sleeve.id) || null;
        const relatedIntents = refreshedAllocationIntents.filter((intent) =>
          Array.isArray(intent.required_models) && intent.required_models.includes(sleeve.model_type)
        );
        if (sleeve.model_type === 'fixed_debt') {
          return {
            id: sleeve.id,
            name: sleeve.name,
            modelType: sleeve.model_type,
            status: sleeve.status,
            agreementStatus: sleeve.agreement_status,
            latestAgreementStatus: latestAgreement?.status || null,
            agreementComplete: latestAgreement?.status === 'executed',
            canFund: relatedIntents.some((intent) => intent.status === 'ready_for_funding'),
            commitmentAmount: Number(sleeve.commitment_amount || 0),
            fundedAmount: Number(sleeve.funded_amount || 0),
            summary: {
              principalOutstanding: Number(sleeve.principal_outstanding || 0),
              fixedCouponRateAnnual: Number(sleeve.fixed_coupon_rate_annual || 0),
              couponAccrued: Number(sleeve.coupon_accrued || 0),
              couponPaid: Number(sleeve.coupon_paid || 0),
              payoutPriorityRank: sleeve.payout_priority_rank,
              almBucket: sleeve.alm_bucket,
              liquidityNotes: sleeve.liquidity_notes,
            },
          };
        }

        const sleeveUnitsHeld = Number(poolPosition.unitsHeld || sleeve.units_held || 0);
        const sleeveEntryNavPerUnit =
          Number(poolPosition.entryNavPerUnit || 0) > 0
            ? Number(poolPosition.entryNavPerUnit)
            : Number(sleeve.entry_nav_per_unit || 0) > 0
              ? Number(sleeve.entry_nav_per_unit)
              : poolValuation.netNavPerUnit || 100;
        const sleeveOwnershipRatio =
          Number(poolPosition.ownershipPercent || 0) > 0
            ? Number(poolPosition.ownershipPercent || 0) / 100
            : poolValuation.totalPoolUnits > 0
              ? sleeveUnitsHeld / poolValuation.totalPoolUnits
              : 0;
        const sleeveGrossValue = Number(poolPosition.grossValue || sleeveUnitsHeld * poolValuation.grossNavPerUnit);
        const sleeveNetValue = Number(poolPosition.netValue || sleeveUnitsHeld * poolValuation.netNavPerUnit);

        return {
          id: sleeve.id,
          name: sleeve.name,
          modelType: sleeve.model_type,
          status: sleeve.status,
          agreementStatus: sleeve.agreement_status,
          latestAgreementStatus: latestAgreement?.status || null,
          agreementComplete: latestAgreement?.status === 'executed',
          canFund: relatedIntents.some((intent) => intent.status === 'ready_for_funding'),
          commitmentAmount: Number(sleeve.commitment_amount || 0),
          fundedAmount: Number(sleeve.funded_amount || 0),
          summary: {
            unitsHeld: sleeveUnitsHeld,
            entryNavPerUnit: sleeveEntryNavPerUnit,
            ownershipPercent: Number(poolPosition.ownershipPercent || sleeveOwnershipRatio * 100),
            grossValue: sleeveGrossValue,
            netValue: sleeveNetValue,
            deployedPrincipal: poolValuation.deployedPrincipal * sleeveOwnershipRatio,
            poolCashShare: poolValuation.poolCash * sleeveOwnershipRatio,
            managementFeeAccrued: poolValuation.managementFeeAccrued * sleeveOwnershipRatio,
            realizedCarry: poolValuation.realizedCarryAccrued * sleeveOwnershipRatio,
            potentialCarry: poolValuation.potentialCarry * sleeveOwnershipRatio,
          },
        };
      }),
      totalFixedDebtExposure: (sleeves || [])
        .filter((sleeve) => sleeve.model_type === 'fixed_debt')
        .reduce((sum, sleeve) => sum + Number(sleeve.principal_outstanding || sleeve.funded_amount || 0), 0),
      totalPoolExposure: (sleeves || [])
        .filter((sleeve) => sleeve.model_type === 'pool_participation')
        .reduce((sum, sleeve) => sum + Number(sleeve.funded_amount || 0), 0),
      allocationIntents: refreshedAllocationIntents,
      allProjects: enhancedProjects,
      allContractors: allContractors || [],
      relatedContractors: allContractors || [],
      relatedProjects: enhancedProjects,
      portfolioMetrics: {
        totalInvested: poolPosition.contributedCapital,
        totalReturns: totalCapitalReturns,
        currentValue: outstandingCapital,
        roi: poolValuation.projectedGrossXirr,
        netRoi: poolValuation.projectedNetXirr,
        portfolioXirr: poolValuation.realizedXirr,
        activeInvestments: investorExposure.length,
        completedInvestments,
        totalInvestments: investorExposure.length,
        capitalInflow: poolPosition.contributedCapital || totalCapitalInflow,
        capitalReturns: totalCapitalReturns,
        netCapitalReturns,
        managementFees: managementFee,
        performanceFees: realizedCarry,
        potentialPerformanceFees: potentialCarry,
        grossNavPerUnit: poolValuation.grossNavPerUnit,
        netNavPerUnit: poolValuation.netNavPerUnit,
        unitsHeld: poolPosition.unitsHeld,
        ownershipPercent: poolPosition.ownershipPercent,
        deployedPoolShare: poolValuation.deployedPrincipal * ownershipRatio,
        poolCashShare: poolValuation.poolCash * ownershipRatio,
        accruedParticipationIncomeShare: poolValuation.accruedParticipationIncome * ownershipRatio,
        preferredReturnAccruedShare: poolValuation.preferredReturnAccrued * ownershipRatio,
        realizedInvestorRoi
      },
      availableOpportunities: allProjects || []
    };

    return NextResponse.json({
      success: true,
      investor: investorProfile
    });

  } catch (error) {
    console.error('💥 Error in investor profile API:', error);
    const status = getInvestorAuthErrorStatus(error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error',
        message: status === 404
          ? 'Your email is not registered as an active investor in our system. Please contact support to get access.'
          : undefined,
      },
      { status }
    );
  }
}
