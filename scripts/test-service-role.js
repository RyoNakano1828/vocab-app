// test-service-role.js
// Usage: node test-service-role.js
// Requires .env.local with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !service) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment');
  process.exit(1);
}

const supabaseAdmin = createClient(url, service, { auth: { persistSession: false } });

(async () => {
  try {
    console.log('Running service-role (admin) test: selecting from "users" table (limit 1)');
    const { data, error } = await supabaseAdmin.from('users').select('id, auth_id, email').limit(1);
    if (error) {
      console.error('Service role query error:', error.message || error);
      process.exit(2);
    }
    console.log('Service role query succeeded. Sample result:', data);
    process.exit(0);
  } catch (err) {
    console.error('Unexpected error running service-role test:', err);
    process.exit(3);
  }
})();
