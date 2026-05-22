# Hare Krishna Leaderboard

A chanting rounds tracker with daily, weekly, monthly, group, friends, and global leaderboards.

The frontend is intentionally a single-page app. The sidebar changes the visible section without changing browser routes, which keeps the small app simple and fast while the code remains split into feature files.

## Project Structure

```text
frontend/
  Next.js single-page app, UI, API routes, frontend environment variables

backend/supabase/
  Supabase schema, migrations, RLS policies, SQL functions
```

Supabase is the main backend for auth, database, row-level security, email OTP, password reset, and leaderboard data. The Next.js app also has a small server API route for account deletion because it needs a server-only service role key.

## Local Setup

Install dependencies from inside `frontend/` if needed:

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_public_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

Do not expose `SUPABASE_SERVICE_ROLE_KEY` in browser code and do not commit `.env.local`.

Run from the project root:

```bash
npm run dev
```

Build from the project root:

```bash
npm run build
```

## Supabase Setup

Run the main schema first:

```text
backend/supabase/schema.sql
```

Then run migrations in order:

```text
backend/supabase/migrations/001_username_phone_rules.sql
backend/supabase/migrations/002_chant_total_edit_window.sql
backend/supabase/migrations/003_friend_request_delete_policy.sql
backend/supabase/migrations/004_profile_identity_conflicts.sql
backend/supabase/migrations/005_group_owner_controls.sql
backend/supabase/migrations/006_avatar_storage.sql
backend/supabase/migrations/007_group_images_storage.sql
backend/supabase/migrations/008_group_member_moderation.sql
backend/supabase/migrations/009_admin_review.sql
backend/supabase/migrations/010_group_roles_v2.sql
```

See `SUPABASE_SETUP.md` for dashboard setup, SMTP, OTP, reset password, and redirect URL notes.
See `DEPLOYMENT_READINESS.md` before going online.

## Deployment Notes

For Vercel, set the project root to `frontend/`, or keep the repo root and configure the build command as:

```bash
npm --prefix frontend run build
```

Environment variables must be added in the hosting dashboard:

```env
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

In Supabase Authentication URL Configuration, add:

```text
http://localhost:3000
https://your-production-domain.com
```

Also keep custom SMTP enabled before inviting real users.

## Current Architecture

```text
Browser
  -> Next.js frontend
  -> Supabase Auth/Postgres/RLS
  -> Next.js API route for service-role-only account deletion
```

The app loads core user and rounds data first. Groups and friends data are loaded when those sections are opened, which keeps startup lighter while preserving the simple single-page experience.
