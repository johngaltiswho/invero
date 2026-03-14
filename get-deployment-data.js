const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Read env file
const env = fs.readFileSync('.env.local', 'utf8');
let SUPABASE_URL = '';
let SUPABASE_KEY = '';

env.split('\n').forEach(line => {
  if (line.includes('NEXT_PUBLIC_SUPABASE_URL=')) {
    SUPABASE_URL = line.split('=')[1].trim();
  }
  if (line.includes('SUPABASE_SERVICE_ROLE_KEY=')) {
    SUPABASE_KEY = line.split('=')[1].trim();
  }
});

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function getData() {
  console.log('\n📊 FINVERNO DEPLOYMENT REPORT\n');
  console.log('='.repeat(80));

  // Get investors
  const { data: investors } = await supabase.from('investors').select('*');
  console.log('\n👥 INVESTORS:');
  console.log(`Total: ${investors?.length || 0}`);
  (investors || []).forEach(inv => {
    console.log(`  - ${inv.name} (${inv.investor_type}) - ${inv.email}`);
  });

  // Get contractors
  const { data: contractors } = await supabase.from('contractors').select('*');
  console.log('\n🏗️  CONTRACTORS:');
  console.log(`Total: ${contractors?.length || 0}`);
  (contractors || []).forEach(cont => {
    console.log(`  - ${cont.company_name} - ${cont.city || 'N/A'}`);
  });

  // Get projects
  const { data: projects } = await supabase.from('projects').select('*');
  console.log('\n🏢 PROJECTS:');
  console.log(`Total: ${projects?.length || 0}`);
  (projects || []).forEach(proj => {
    console.log(`  - ${proj.project_name} - ${proj.location || 'N/A'}`);
  });

  // Get purchase requests
  const { data: prs } = await supabase.from('purchase_requests').select('*');
  console.log('\n📋 PURCHASE REQUESTS:');
  console.log(`Total: ${prs?.length || 0}`);

  // Get capital transactions
  const { data: txns } = await supabase.from('capital_transactions')
    .select('*')
    .eq('status', 'completed');

  console.log('\n💰 CAPITAL TRANSACTIONS:');
  console.log(`Total: ${txns?.length || 0}`);

  const deployments = txns?.filter(t => t.transaction_type === 'deployment') || [];
  const returns = txns?.filter(t => t.transaction_type === 'return') || [];
  const inflows = txns?.filter(t => t.transaction_type === 'inflow') || [];

  const totalDeployed = deployments.reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const totalReturns = returns.reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const totalInflow = inflows.reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const formatINR = (amt) => new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0
  }).format(amt);

  console.log(`  Inflows: ${formatINR(totalInflow)}`);
  console.log(`  Deployed: ${formatINR(totalDeployed)}`);
  console.log(`  Returns: ${formatINR(totalReturns)}`);
  console.log(`  Outstanding: ${formatINR(totalDeployed - totalReturns)}`);

  // Investor breakdown
  console.log('\n💼 INVESTOR BREAKDOWN:');
  const investorMap = new Map();
  deployments.forEach(d => {
    if (!d.investor_id) return;
    const current = investorMap.get(d.investor_id) || 0;
    investorMap.set(d.investor_id, current + Number(d.amount || 0));
  });

  for (const [invId, amount] of investorMap.entries()) {
    const inv = investors?.find(i => i.id === invId);
    console.log(`  ${inv?.name || invId}: ${formatINR(amount)}`);
  }

  // Contractor breakdown
  console.log('\n🔧 CONTRACTOR BREAKDOWN:');
  const contractorMap = new Map();
  deployments.forEach(d => {
    if (!d.contractor_id) return;
    const current = contractorMap.get(d.contractor_id) || 0;
    contractorMap.set(d.contractor_id, current + Number(d.amount || 0));
  });

  for (const [contId, amount] of contractorMap.entries()) {
    const cont = contractors?.find(c => c.id === contId);
    console.log(`  ${cont?.company_name || contId}: ${formatINR(amount)}`);
  }

  console.log('\n' + '='.repeat(80) + '\n');
}

getData().catch(console.error);
