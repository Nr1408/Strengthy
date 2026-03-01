# Supabase Migration: RLS Policies & Checklist

## Recommended RLS policies (examples)

- Enable row level security on tables storing user data:

  -- workouts
  ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "workouts_owner_only" ON workouts
    USING (owner_id = auth.uid())
    WITH CHECK (owner_id = auth.uid());

  -- exercises
  ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "exercises_owner_only" ON exercises
    USING (owner_id = auth.uid())
    WITH CHECK (owner_id = auth.uid());

  -- workout_sets
  ALTER TABLE workout_sets ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "sets_owner_only" ON workout_sets
    USING (
      exists (select 1 from workouts w where w.id = workout_sets.workout_id and w.owner_id = auth.uid())
    )
    WITH CHECK (
      exists (select 1 from workouts w where w.id = workout_sets.workout_id and w.owner_id = auth.uid())
    );

Notes:
- `auth.uid()` is provided by Supabase JWT claims when requests are authenticated.
- Service Role key bypasses RLS; use only in Edge Functions or server-side admin flows.

## Migration Checklist (practical steps)

1. Provision Supabase project and enable Postgres.
2. Run `supabase_migration/ddl.sql` in the SQL editor to create tables (or adapt to your existing Supabase Auth schema).
3. Configure Supabase Auth providers (Google). Add authorized redirect URIs in Google Console for Supabase callback and/or your Edge Function:
   - If using Supabase's built-in OAuth: add the Supabase Provider redirect URI shown in the Supabase dashboard.
   - If using the Edge Function `google_auth`, add your backend redirect (Edge Function URL) to the Google Console.
4. Create RLS policies as shown (adjust column names if you changed them).
5. Deploy Edge Functions:
   - `edge_functions/google_auth.ts` — wire `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE` env vars.
   - `edge_functions/create_set.ts` — wire same env vars. This function will be used to create sets and compute PR flags.
6. Update frontend:
   - Keep UI unchanged.
   - Update `src/lib/api.ts` `API_BASE` to point at your Supabase Edge Function base or PostgREST endpoint. You already have compatibility for JWT Bearer tokens.
   - For Google sign-in: either use Supabase client-side OAuth (recommended) or keep existing flow targeting your Edge Function `/google_auth` endpoint.
   - Replace set create calls to call Edge Function `/create_set` if you want server-side PR handling; otherwise, point `POST /rest/v1/workout_sets` to Supabase REST but ensure triggers or background jobs compute PRs.
7. Migrate data:
   - Export from Django (pg_dump if PostgreSQL in Render) or write a script to pull from Django DB and insert into Supabase using bulk insert. Preserve IDs if you plan to keep FK relationships stable.
8. Test thoroughly:
   - Verify RLS prevents cross-user access.
   - Verify PR flags match Django behavior (run side-by-side checks).
   - Verify Google login flow end-to-end.

## Frontend quick notes

- `src/lib/api.ts` was updated to send `Authorization: Bearer <jwt>` when stored token looks like a JWT, otherwise it keeps `Token <t>` for backward compatibility.
- If you adopt Supabase client libraries in the SPA, keep token storage semantics compatible: store `access_token` under `token` key or adapt `getToken`/`setToken` accordingly.

## Security

- Never expose `SUPABASE_SERVICE_ROLE` in client code. Use Edge Functions for privileged operations.
- Use HTTPS-only redirect URIs in Google Console and Supabase.
