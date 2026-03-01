# Strengthy → Supabase Migration: quick test & deploy guide

This folder contains artifacts to migrate the Django backend to Supabase:

- `ddl.sql` — table DDL to create basic schema in Supabase/Postgres.
- `edge_functions/google_auth.ts` — Edge Function template to accept Google id token and ensure user.
- `edge_functions/create_set.ts` — Edge Function to atomically create sets and compute PR flags.
- `rls_and_checklist.md` — RLS examples and migration checklist.

Quick deploy & test steps

1) Create Supabase project.
2) Run `ddl.sql` in the SQL editor (or adapt to your Supabase Auth schema).
3) Enable RLS on user tables and apply example policies from `rls_and_checklist.md`.
4) Deploy Edge Functions (via Supabase dashboard or `supabase` CLI):
  - Set environment variables for each function: `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE` (service role key).
  - Do NOT expose `SUPABASE_SERVICE_ROLE` to clients.

Vercel deployment (optional)

- You can deploy the supplied Vercel-compatible serverless function at `supabase_migration/vercel/google_auth.js` to Vercel. Steps:
  1. Create a new Vercel project (or use an existing one).
  2. Add the file `api/google-auth.js` to the project (copy the contents of `supabase_migration/vercel/google_auth.js`).
  3. In Vercel dashboard, set the following Environment Variables (Project > Settings > Environment Variables):
    - `SUPABASE_URL` = https://<your-project>.supabase.co
    - `SUPABASE_SERVICE_ROLE` = <your service_role key> (server-only secret)
    - `SUPABASE_JWT_SECRET` = <your jwt secret from Supabase project settings>
    - (optional) `GOOGLE_CLIENT_ID` = <your Google OAuth client id> to validate audience
  4. Deploy the Vercel project. The function will be available at `https://<your-vercel>/api/google-auth`.

Security note: keep `SUPABASE_SERVICE_ROLE` secret and use Vercel Serverless (not client-side exposure). Edge runtimes may cache secrets globally; review your security posture.

Basic curl tests

- Test Google auth Edge Function (replace URL and id_token):

```bash
curl -X POST https://<YOUR_FN_HOST>/google_auth \
  -H 'Content-Type: application/json' \
  -d '{"credential":"<GOOGLE_ID_TOKEN>"}'
```

- Test create_set Edge Function (replace URL and use a valid user JWT or service-role for admin tests):

```bash
curl -X POST https://<YOUR_FN_HOST>/create_set \
  -H 'Content-Type: application/json' \
  -d '{"workout":123,"exercise":45,"reps":5,"weight":100,"unit":"lbs"}'
```

Notes & safety

- The `create_set` function in this repo uses the Supabase service role to query/update data. In production you should:
  - Validate the incoming client JWT and ensure the client is authorized to modify the target workout.
  - Or, accept only server-to-server requests from trusted clients and/or use Row-Level Security with service-role-limited operations.
- The `google_auth` template currently returns a placeholder token. For production, either:
  - Use Supabase built-in OAuth providers (recommended), or
  - In the function, create a Supabase Auth session and return the access token to the client.

Frontend integration notes

- `src/lib/api.ts` now supports runtime endpoints for Google auth and set creation:
  - Env vars: `VITE_GOOGLE_AUTH_ENDPOINT`, `VITE_CREATE_SET_ENDPOINT` (build-time)
  - Runtime localStorage overrides: `GOOGLE_AUTH_ENDPOINT`, `CREATE_SET_ENDPOINT`
  - Legacy defaults still point at the current Django backend.

How to test runtime override in a browser console:

```js
localStorage.setItem('GOOGLE_AUTH_ENDPOINT', 'https://<YOUR_FN_HOST>/google_auth')
localStorage.setItem('CREATE_SET_ENDPOINT', 'https://<YOUR_FN_HOST>/create_set')
location.reload()
```

If you want, I can:
- Produce exact `supabase` CLI commands to deploy the Edge Functions.
- Generate a data migration script to copy data from your current DB into Supabase while preserving primary keys.
- Harden Edge Functions to validate client JWTs and integrate with RLS.
