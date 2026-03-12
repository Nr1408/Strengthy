# delete-account Edge Function

This Supabase Edge Function deletes the authenticated user using the Supabase Admin API.

Environment variables (set in Supabase dashboard):
- `SUPABASE_URL` — your Supabase project URL (e.g. https://<project>.supabase.co)
- `SUPABASE_SERVICE_ROLE_KEY` — your Supabase service_role key (keep secret)
- `ALLOWED_ORIGIN` — optional, the frontend origin to allow CORS (defaults to `*` for testing)

Deploy:
1. Install the Supabase CLI and login: `supabase login`
2. From this directory run:

```bash
supabase functions deploy delete-account --project-ref <your-project-ref>
```

3. In the Supabase dashboard, add the environment variables under `Project Settings -> API` or via the CLI.

Usage (from frontend):
- Call POST `https://<project>.functions.supabase.co/delete-account` with header `Authorization: Bearer <user_access_token>`.
- The function will validate the token and use the `SERVICE_ROLE` key to delete the user.

Test example (curl):

```bash
curl -i -X OPTIONS "https://<project>.functions.supabase.co/delete-account" \
  -H "Origin: https://strengthy-strengthy-frontend.vercel.app" \
  -H "Access-Control-Request-Method: POST"

curl -i -X POST "https://<project>.functions.supabase.co/delete-account" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json"
```
