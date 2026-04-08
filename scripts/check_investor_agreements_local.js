const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!m) continue;
    let [, k, v] = m;
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!(k in process.env)) process.env[k] = v;
  }
}

(async () => {
  const root = '/Users/uma/Documents/finverno';
  loadEnv(path.join(root, '.env'));
  loadEnv(path.join(root, '.env.local'));
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing supabase env');
  const supabase = createClient(url, key);
  const investorId = 'bffc0c5c-3bbf-4c70-9f87-7b25b3c3271c';

  const { data: intents, error: intentsErr } = await supabase
    .from('lender_allocation_intents')
    .select('id,status,total_amount,pool_amount,fixed_debt_amount,agreements_ready_at,created_at,updated_at')
    .eq('investor_id', investorId)
    .order('created_at', { ascending: false });
  if (intentsErr) throw intentsErr;

  const { data: sleeves, error: sleevesErr } = await supabase
    .from('lender_sleeves')
    .select('id,model_type,status,agreement_status,commitment_amount,funded_amount,agreement_status')
    .eq('investor_id', investorId)
    .order('created_at', { ascending: false });
  if (sleevesErr) throw sleevesErr;

  const { data: agreements, error: agreementsErr } = await supabase
    .from('investor_agreements')
    .select('id,status,agreement_model_type,lender_sleeve_id,lender_allocation_intent_id,commitment_amount,issued_at,executed_at,superseded_at,superseded_reason,created_at')
    .eq('investor_id', investorId)
    .order('created_at', { ascending: false });
  if (agreementsErr) throw agreementsErr;

  console.log(JSON.stringify({ intents, sleeves, agreements }, null, 2));
})().catch((err) => {
  console.error(JSON.stringify(err, null, 2));
  process.exit(1);
});
