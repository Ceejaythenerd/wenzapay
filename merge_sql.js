const fs = require('fs');
const files = [
  '001_initial_schema.sql',
  '002_ledger_rls.sql',
  '003_phase3_schema.sql',
  '003_subscriptions_rls.sql',
  '004_offramp_compliance.sql',
  '005_fix_missing_rls.sql',
  '006_atomic_counters.sql',
  '007_saas_billing.sql'
];
let out = '';
for (const f of files) {
  out += '-- ' + f + '\n';
  out += fs.readFileSync('supabase/migrations/' + f, 'utf8') + '\n\n';
}
fs.writeFileSync('C:\\Users\\DELL\\.gemini\\antigravity-ide\\brain\\034a62b2-817c-4eca-88eb-11d8009a8a36\\full_schema.md', '```sql\n' + out + '\n```');
