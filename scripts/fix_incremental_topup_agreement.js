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
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const agreementId = 'c0eee77d-fc1e-4655-8cab-a7beffaae279';
  const intentId = '7248127e-c82e-427a-823b-96c537c2f2d8';

  const now = new Date().toISOString();
  const { error: agreementErr } = await supabase
    .from('investor_agreements')
    .update({
      superseded_at: null,
      superseded_reason: null,
      status: 'issued',
      updated_at: now,
    })
    .eq('id', agreementId);
  if (agreementErr) throw agreementErr;

  const { error: intentErr } = await supabase
    .from('lender_allocation_intents')
    .update({
      status: 'agreements_pending',
      agreements_ready_at: null,
      updated_at: now,
    })
    .eq('id', intentId);
  if (intentErr) throw intentErr;

  console.log(JSON.stringify({ success: true, agreementId, intentId }, null, 2));
})().catch((err) => {
  console.error(JSON.stringify(err, null, 2));
  process.exit(1);
});
