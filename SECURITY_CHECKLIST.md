# Security Checklist

## Supabase

- Run migrations in order through `018_security_hardening.sql`.
- Keep Email confirmation enabled for production.
- Keep `SUPABASE_SERVICE_ROLE_KEY` only in Vercel/server environment variables. Never expose it in frontend code.
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are allowed in frontend env vars.
- After migration 018, app-wide profile reads use `app_public_profiles`; email and phone stay private except for the signed-in user's own profile.
- Storage buckets `avatars` and `group-images` should allow only `image/jpeg`, `image/png`, and `image/webp`, with 2 MB max size.

## Vercel

- Add only these variables as needed:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
- Do not commit `.env.local`.
- Use the production Supabase URL in Supabase Auth redirect settings.

## App Rules

- Email is mandatory.
- Phone is optional and unique only when present.
- One user can save 0-250 rounds for a single local day.
- Group totals have no fixed app cap because they are sums across members.
- Public profile surfaces must never show email or phone.
