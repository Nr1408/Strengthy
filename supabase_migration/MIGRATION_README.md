Migration script helper

Files:

- `migrate_to_supabase.py` — reads your Django models and inserts rows into Supabase via REST.

Prerequisites:

- Activate your project's virtualenv so Django imports work.
- Set environment variables:
  - `SUPABASE_URL` (e.g. https://<project>.supabase.co)
  - `SUPABASE_SERVICE_ROLE` (service role key from Supabase Dashboard > Settings > API)

Usage:

1. If you want the script to create Supabase Auth users from your Django users, run:

```bash
# from repo root; venv active
setx SUPABASE_URL "https://hhsearvumelyrnnxtipp.supabase.co"
# set SUPABASE_SERVICE_ROLE securely in your shell/session (do NOT commit it)
python supabase_migration/migrate_to_supabase.py --create-users
```

2. If you have already created Supabase users and exported a mapping `supabase_user_id_map.json` mapping Django user id → Supabase UUID, place that file in the repo and run without `--create-users`.

Caveats & recommendations:

- Test on a staging Supabase project first.
- The script uses the Supabase admin API to create users when `--create-users` is used; those accounts will have randomly generated passwords.
- The script preserves relational integrity by inserting parent rows first and tracking new IDs.
- After migration, rotate the `SUPABASE_SERVICE_ROLE` key and verify RLS policies.
