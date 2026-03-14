import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    console.log('📊 Fetching comprehensive deployment cycle data...\n');

    // Fetch purchase requests
    const { data: purchaseRequests } = await supabaseAdmin
      .from('purchase_requests')
      .select('id, project_id, contractor_id, client_id, status, created_at, funded_at, approved_at')
      .order('created_at', { ascending: false });

    const requests = purchaseRequests || [];
    const requestIds = requests.map((request: any) => request.id);

    if (requestIds.length === 0) {
      return NextResponse.json({ message: 'No purchase requests found.' });
    }

    // Fetch purchase request items
    let requestItems: any[] | null = null;
    const requestItemsWithPurchaseQty = await supabaseAdmin
      .from('purchase_request_items')
      .select('purchase_request_id, requested_qty, purchase_qty, unit_rate, tax_percent')
      .in('purchase_request_id', requestIds);

    requestItems = requestItemsWithPurchaseQty.data;

    if (requestItemsWithPurchaseQty.error && String(requestItemsWithPurchaseQty.error.message || '').includes('purchase_qty')) {
      const fallbackItems = await supabaseAdmin
        .from('purchase_request_items')
        .select('purchase_request_id, requested_qty, unit_rate, tax_percent')
        .in('purchase_request_id', requestIds);
      requestItems = fallbackItems.data;
    }

    // Fetch capital transactions
    const { data: capitalTransactions } = await supabaseAdmin
      .from('capital_transactions')
      .select('purchase_request_id, transaction_type, amount, status, created_at, investor_id')
      .in('purchase_request_id', requestIds)
      .in('transaction_type', ['deployment', 'return'])
      .eq('status', 'completed');

    // Fetch investors
    const { data: investors } = await supabaseAdmin
      .from('investors')
      .select('id, name, email, investor_type');

    const investorMap = new Map<string, any>();
    (investors || []).forEach((inv: any) => {
      investorMap.set(inv.id, inv);
    });

    // Fetch projects
    const { data: projects } = await supabaseAdmin
      .from('projects')
      .select('id, project_name, project_id_external, location, client_id, contractor_id');

    const projectMap = new Map<string, any>();
    (projects || []).forEach((proj: any) => {
      projectMap.set(proj.id, proj);
      if (proj.project_id_external) {
        projectMap.set(proj.project_id_external, proj);
      }
    });

    // Fetch contractors
    const { data: contractors } = await supabaseAdmin
      .from('contractors')
      .select('id, company_name, contact_person, email, phone, city');

    const contractorMap = new Map<string, any>();
    (contractors || []).forEach((cont: any) => {
      contractorMap.set(cont.id, cont);
    });

    // Fetch clients
    const { data: clients } = await supabaseAdmin
      .from('clients')
      .select('id, client_name, contact_person, email, phone');

    const clientMap = new Map<string, any>();
    (clients || []).forEach((client: any) => {
      clientMap.set(client.id, client);
    });

    // Calculate totals per PR
    const requestTotals = new Map<string, number>();
    (requestItems || []).forEach((item: any) => {
      const qty = Number(item.purchase_qty ?? item.requested_qty ?? 0);
      const rate = Number(item.unit_rate ?? 0);
      const taxPercent = Number(item.tax_percent ?? 0);
      const base = qty * rate;
      const tax = base * (taxPercent / 100);
      const current = requestTotals.get(item.purchase_request_id) || 0;
      requestTotals.set(item.purchase_request_id, current + base + tax);
    });

    // Calculate funded and returns per PR
    const fundedTotals = new Map<string, number>();
    const returnTotals = new Map<string, number>();
    const investorDeployments = new Map<string, Map<string, number>>();

    (capitalTransactions || []).forEach((row: any) => {
      if (!row.purchase_request_id) return;
      const amount = Number(row.amount ?? 0);
      if (row.transaction_type === 'deployment') {
        const current = fundedTotals.get(row.purchase_request_id) || 0;
        fundedTotals.set(row.purchase_request_id, current + amount);

        if (row.investor_id) {
          const invMap = investorDeployments.get(row.investor_id) || new Map();
          const invCurrent = invMap.get(row.purchase_request_id) || 0;
          invMap.set(row.purchase_request_id, invCurrent + amount);
          investorDeployments.set(row.investor_id, invMap);
        }
      } else if (row.transaction_type === 'return') {
        const current = returnTotals.get(row.purchase_request_id) || 0;
        returnTotals.set(row.purchase_request_id, current + amount);
      }
    });

    // Build contractor summaries
    const contractorSummary = new Map<string, any>();
    requests.forEach((request: any) => {
      const contractorId = request.contractor_id;
      if (!contractorId) return;

      const contractor = contractorMap.get(contractorId);
      const funded = fundedTotals.get(request.id) || 0;
      const returns = returnTotals.get(request.id) || 0;

      if (!contractorSummary.has(contractorId)) {
        contractorSummary.set(contractorId, {
          name: contractor?.company_name || 'Unknown',
          location: contractor?.city || 'N/A',
          contact: contractor?.contact_person || 'N/A',
          totalFunded: 0,
          totalReturns: 0,
          prCount: 0,
          projectCount: 0,
          projects: new Set(),
          prs: []
        });
      }

      const summary = contractorSummary.get(contractorId);
      summary.totalFunded += funded;
      summary.totalReturns += returns;
      summary.prCount += 1;
      summary.prs.push(request.id);

      if (request.project_id) {
        summary.projects.add(request.project_id);
        summary.projectCount = summary.projects.size;
      }
    });

    // Build project summaries
    const projectSummary = new Map<string, any>();
    requests.forEach((request: any) => {
      const projectId = request.project_id;
      if (!projectId) return;

      const project = projectMap.get(projectId);
      const clientId = request.client_id || project?.client_id;
      const client = clientId ? clientMap.get(clientId) : null;
      const contractorId = request.contractor_id || project?.contractor_id;
      const contractor = contractorId ? contractorMap.get(contractorId) : null;
      const funded = fundedTotals.get(request.id) || 0;
      const returns = returnTotals.get(request.id) || 0;

      if (!projectSummary.has(projectId)) {
        projectSummary.set(projectId, {
          name: project?.project_name || project?.project_id_external || 'Unknown',
          location: project?.location || 'N/A',
          client: client?.client_name || 'N/A',
          contractor: contractor?.company_name || 'N/A',
          totalFunded: 0,
          totalReturns: 0,
          prCount: 0,
          prs: []
        });
      }

      const summary = projectSummary.get(projectId);
      summary.totalFunded += funded;
      summary.totalReturns += returns;
      summary.prCount += 1;
      summary.prs.push(request.id);
    });

    // Aggregate totals
    let totalRequested = 0;
    let totalFunded = 0;
    let totalReturns = 0;
    let activePRs = 0;
    let completedPRs = 0;

    requests.forEach((request: any) => {
      const requested = requestTotals.get(request.id) || 0;
      const funded = fundedTotals.get(request.id) || 0;
      const returns = returnTotals.get(request.id) || 0;

      totalRequested += requested;
      totalFunded += funded;
      totalReturns += returns;

      if (request.status === 'completed') {
        completedPRs++;
      } else if (request.status === 'funded' || request.status === 'po_generated') {
        activePRs++;
      }
    });

    const totalOutstanding = totalFunded - totalReturns;

    // Calculate per-investor totals
    const investorSummary = new Map<string, any>();
    investorDeployments.forEach((prMap, investorId) => {
      const investor = investorMap.get(investorId);
      let totalDeployed = 0;
      prMap.forEach((amount) => {
        totalDeployed += amount;
      });
      investorSummary.set(investorId, {
        name: investor?.name || 'Unknown',
        type: investor?.investor_type || 'N/A',
        deployed: totalDeployed,
        prs: prMap.size
      });
    });

    // Format currency
    const formatINR = (amount: number) => {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(amount);
    };

    // Convert Sets to arrays for JSON serialization
    const contractorData = Array.from(contractorSummary.entries()).map(([id, data]) => ({
      id,
      ...data,
      projects: Array.from(data.projects)
    })).sort((a, b) => b.totalFunded - a.totalFunded);

    const projectData = Array.from(projectSummary.values())
      .sort((a, b) => b.totalFunded - a.totalFunded);

    const investorData = Array.from(investorSummary.values())
      .sort((a, b) => b.deployed - a.deployed);

    return NextResponse.json({
      summary: {
        totalPRs: requests.length,
        activePRs,
        completedPRs,
        totalRequested,
        totalFunded,
        totalReturns,
        totalOutstanding
      },
      investors: investorData,
      contractors: contractorData,
      projects: projectData,
      formatINR
    });

  } catch (error) {
    console.error('Error fetching deployment data:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
