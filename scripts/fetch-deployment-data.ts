import { createClient } from '@supabase/supabase-js';

// Note: Run with: NEXT_PUBLIC_SUPABASE_URL=xxx SUPABASE_SERVICE_ROLE_KEY=xxx npx tsx scripts/fetch-deployment-data.ts
// Or ensure .env.local is loaded in your shell

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  console.error('Please run: source .env.local or set them manually');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchDeploymentData() {
  console.log('📊 Fetching comprehensive deployment cycle data...\n');

  // Fetch purchase requests
  const { data: purchaseRequests, error: purchaseRequestError } = await supabase
    .from('purchase_requests')
    .select('id, project_id, contractor_id, client_id, status, created_at, funded_at, approved_at')
    .order('created_at', { ascending: false });

  if (purchaseRequestError) {
    console.error('Error fetching purchase requests:', purchaseRequestError);
    return;
  }

  const requests = purchaseRequests || [];
  const requestIds = requests.map((request: any) => request.id);

  if (requestIds.length === 0) {
    console.log('No purchase requests found.');
    return;
  }

  // Fetch purchase request items
  let requestItems: any[] | null = null;
  const requestItemsWithPurchaseQty = await supabase
    .from('purchase_request_items')
    .select('purchase_request_id, requested_qty, purchase_qty, unit_rate, tax_percent')
    .in('purchase_request_id', requestIds);

  requestItems = requestItemsWithPurchaseQty.data;

  if (requestItemsWithPurchaseQty.error && String(requestItemsWithPurchaseQty.error.message || '').includes('purchase_qty')) {
    const fallbackItems = await supabase
      .from('purchase_request_items')
      .select('purchase_request_id, requested_qty, unit_rate, tax_percent')
      .in('purchase_request_id', requestIds);
    requestItems = fallbackItems.data;
  }

  // Fetch capital transactions
  const { data: capitalTransactions } = await supabase
    .from('capital_transactions')
    .select('purchase_request_id, transaction_type, amount, status, created_at, investor_id')
    .in('purchase_request_id', requestIds)
    .in('transaction_type', ['deployment', 'return'])
    .eq('status', 'completed');

  // Fetch investors
  const { data: investors } = await supabase
    .from('investors')
    .select('id, name, email, investor_type');

  const investorMap = new Map<string, any>();
  (investors || []).forEach((inv: any) => {
    investorMap.set(inv.id, inv);
  });

  // Fetch projects
  const { data: projects } = await supabase
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
  const { data: contractors } = await supabase
    .from('contractors')
    .select('id, company_name, contact_person, email, phone, city');

  const contractorMap = new Map<string, any>();
  (contractors || []).forEach((cont: any) => {
    contractorMap.set(cont.id, cont);
  });

  // Fetch clients
  const { data: clients } = await supabase
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

      // Track per investor
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
  const contractorSummary = new Map<string, {
    name: string;
    location: string;
    contact: string;
    totalFunded: number;
    totalReturns: number;
    prCount: number;
    projectCount: number;
    projects: Set<string>;
    prs: string[];
  }>();

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

    const summary = contractorSummary.get(contractorId)!;
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
  const projectSummary = new Map<string, {
    name: string;
    location: string;
    client: string;
    contractor: string;
    totalFunded: number;
    totalReturns: number;
    prCount: number;
    prs: string[];
  }>();

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

    const summary = projectSummary.get(projectId)!;
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
  const investorSummary = new Map<string, {
    name: string;
    type: string;
    deployed: number;
    prs: number;
  }>();

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

  // Print summary
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('    COMPREHENSIVE DEPLOYMENT SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('📋 Overall Metrics:');
  console.log(`   Total PRs: ${requests.length}`);
  console.log(`   Active PRs: ${activePRs}`);
  console.log(`   Completed PRs: ${completedPRs}`);
  console.log(`   Total Requested: ${formatINR(totalRequested)}`);
  console.log(`   Total Funded: ${formatINR(totalFunded)}`);
  console.log(`   Total Returns: ${formatINR(totalReturns)}`);
  console.log(`   Outstanding: ${formatINR(totalOutstanding)}\n`);

  console.log('👥 Investors:');
  const sortedInvestors = Array.from(investorSummary.entries())
    .sort((a, b) => b[1].deployed - a[1].deployed);

  sortedInvestors.forEach(([investorId, data]) => {
    console.log(`   ${data.name} (${data.type}):`);
    console.log(`      Deployed: ${formatINR(data.deployed)}`);
    console.log(`      PRs: ${data.prs}`);
  });

  console.log('\n🏗️  Contractors:');
  const sortedContractors = Array.from(contractorSummary.entries())
    .sort((a, b) => b[1].totalFunded - a[1].totalFunded);

  sortedContractors.forEach(([contractorId, data]) => {
    console.log(`   ${data.name} (${data.location}):`);
    console.log(`      Contact: ${data.contact}`);
    console.log(`      Funded: ${formatINR(data.totalFunded)}`);
    console.log(`      Returns: ${formatINR(data.totalReturns)}`);
    console.log(`      Outstanding: ${formatINR(data.totalFunded - data.totalReturns)}`);
    console.log(`      Projects: ${data.projectCount}`);
    console.log(`      PRs: ${data.prCount}`);
  });

  console.log('\n🏢 Projects:');
  const sortedProjects = Array.from(projectSummary.entries())
    .sort((a, b) => b[1].totalFunded - a[1].totalFunded);

  sortedProjects.forEach(([projectId, data]) => {
    console.log(`   ${data.name} (${data.location}):`);
    console.log(`      Client: ${data.client}`);
    console.log(`      Contractor: ${data.contractor}`);
    console.log(`      Funded: ${formatINR(data.totalFunded)}`);
    console.log(`      Returns: ${formatINR(data.totalReturns)}`);
    console.log(`      Outstanding: ${formatINR(data.totalFunded - data.totalReturns)}`);
    console.log(`      PRs: ${data.prCount}`);
  });

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Generate formatted text for investor update
  console.log('📝 FORMATTED UPDATE FOR EMAIL:\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('6. Current Deployment Cycle\n');
  console.log(`As of ${new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}, here is the current state of capital deployment through the platform:\n`);

  console.log('Overall Metrics:');
  console.log(`    •    Total Purchase Requests: ${requests.length}`);
  console.log(`    •    Active Deployments: ${activePRs}`);
  console.log(`    •    Completed Cycles: ${completedPRs}`);
  console.log(`    •    Capital Deployed: ${formatINR(totalFunded)}`);
  console.log(`    •    Capital Returned: ${formatINR(totalReturns)}`);
  console.log(`    •    Outstanding: ${formatINR(totalOutstanding)}\n`);

  console.log('Investor Participation:\n');
  sortedInvestors.forEach(([investorId, data]) => {
    console.log(`    ${data.name} (${data.type})`);
    console.log(`        •    Deployed: ${formatINR(data.deployed)}`);
    console.log(`        •    Purchase Requests: ${data.prs}\n`);
  });

  console.log('Contractor Engagement:\n');
  sortedContractors.forEach(([contractorId, data]) => {
    console.log(`    ${data.name}`);
    console.log(`        •    Location: ${data.location}`);
    console.log(`        •    Capital Facilitated: ${formatINR(data.totalFunded)}`);
    console.log(`        •    Repaid: ${formatINR(data.totalReturns)}`);
    console.log(`        •    Outstanding: ${formatINR(data.totalFunded - data.totalReturns)}`);
    console.log(`        •    Projects: ${data.projectCount}`);
    console.log(`        •    Purchase Requests: ${data.prCount}\n`);
  });

  console.log('Project Pipeline:\n');
  sortedProjects.forEach(([projectId, data]) => {
    console.log(`    ${data.name}`);
    console.log(`        •    Location: ${data.location}`);
    console.log(`        •    Client: ${data.client}`);
    console.log(`        •    Contractor: ${data.contractor}`);
    console.log(`        •    Capital Deployed: ${formatINR(data.totalFunded)}`);
    console.log(`        •    Returned: ${formatINR(data.totalReturns)}`);
    console.log(`        •    Outstanding: ${formatINR(data.totalFunded - data.totalReturns)}`);
    console.log(`        •    Purchase Requests: ${data.prCount}\n`);
  });

  console.log('This represents the working capital facilitated through material procurement transactions, with full traceability between capital deployment, contractors, projects, and physical material delivery.\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

fetchDeploymentData().catch(console.error);
