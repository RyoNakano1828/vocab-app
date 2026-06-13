// test-anon.js
// Usage: node test-anon.js
// Requires .env.local with NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anon) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in environment');
  process.exit(1);
}

const supabase = createClient(url, anon, { auth: { persistSession: false } });

(async () => {
  try {
    console.log('Running anon (client) test: selecting from public "words" table (limit 1)');
    const { data, error } = await supabase.from('words').select('id, word').limit(1);
    if (error) {
      console.error('Anon query error:', error.message || error);
      process.exit(2);
    }
    console.log('Anon query succeeded. Sample result:', data);
    process.exit(0);
  } catch (err) {
    console.error('Unexpected error running anon test:', err);
    process.exit(3);
  }
})();
