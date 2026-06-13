# Test scripts for verifying Supabase keys locally

Two Node.js scripts are included for quick local verification of your Supabase environment variables. Do NOT commit your .env.local file.

Files:
- scripts/test-anon.js
  - Verifies NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY can read from the public (client) side.
- scripts/test-service-role.js
  - Verifies NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY can perform admin queries (bypass RLS).

Usage:
1. Install deps (if you don't already have them):
   npm install dotenv @supabase/supabase-js

2. Copy .env.example -> .env.local and fill in values (do NOT commit .env.local):
   cp .env.example .env.local
   # edit .env.local and set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

3. Run the scripts:
   node scripts/test-anon.js
   node scripts/test-service-role.js

Notes:
- The anon script uses the anon key which is safe to be public (but still keep it private to your app).
- The service-role script uses the service role key; keep this key secret and never expose it to the client or commit it.
- If you encounter permission errors, check that your keys are correct and that the service role key has the required permissions.
