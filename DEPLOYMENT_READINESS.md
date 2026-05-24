# Deployment Readiness Checklist

Use this before putting Hare Krishna Leaderboard online for real users.

## 1. Local Build Check

From the project root:

```bash
npm install --prefix frontend
npm run build
```

If Windows reports an `EBUSY` lock inside `.next`, close any running dev server/browser tab using the app and rerun the build.

## 2. Environment Variables

Set these in `frontend/.env.local` for local development and in your hosting provider for production:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Rules:

- `NEXT_PUBLIC_SUPABASE_URL` must be the project URL, not the REST URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` is safe for browser use.
- `SUPABASE_SERVICE_ROLE_KEY` is server-only. Never expose it with `NEXT_PUBLIC_`.

Runtime behavior:

- If both public Supabase env vars are empty, the app shows `Demo mode` and uses browser-only data.
- If only one public Supabase env var is present, the app shows `Config issue`.
- If the delete-account API is missing `SUPABASE_SERVICE_ROLE_KEY`, it returns a clear server configuration error.

## 3. Supabase SQL Order

Run the base schema first:

```text
backend/supabase/schema.sql
```

Then run every migration in this exact order:

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
backend/supabase/migrations/011_goals_announcements_reminders.sql
backend/supabase/migrations/012_profile_privacy.sql
backend/supabase/migrations/013_public_profile_rpc.sql
backend/supabase/migrations/014_public_group_invite_rpc.sql
backend/supabase/migrations/015_notifications.sql
backend/supabase/migrations/016_remove_admin_reports_and_join_date_edits.sql
backend/supabase/migrations/017_featured_milestones.sql
backend/supabase/migrations/018_security_hardening.sql
```

Quick checks in Supabase after running SQL:

- `profiles`, `chant_totals`, `groups`, `group_members`, `friend_requests`, and `notifications` exist.
- `moderation_reports` and `app_admins` do not exist after migration `016`.
- Storage buckets `avatars` and `group-images` exist.
- RLS is enabled on app tables.
- Public profile reads use `app_public_profiles`.
- One user cannot save more than 250 rounds for one local day.

## 4. Supabase Auth Settings

Authentication -> Providers -> Email:

- Enable email provider.
- Enable confirm email for production.
- Keep password recovery enabled.
- Keep email OTP/magic link available if you want the Email OTP tab to work.

Authentication -> URL Configuration:

Add local and production URLs:

```text
http://localhost:3000
http://localhost:3001
https://your-production-domain.com
```

If your host creates preview URLs, add those only if you plan to test auth flows there.

## 5. Email Templates

Authentication -> Email Templates:

- Confirm signup: keep the action link.
- Reset password: keep the action link.
- Magic link / OTP: include the token if you want typed OTP login.

Useful OTP text:

```text
Your login code is {{ .Token }}
```

## 6. SMTP

Before real users, enable custom SMTP:

Supabase Dashboard -> Project Settings -> Authentication -> SMTP Settings.

Recommended checks:

- Sender email is verified with the SMTP provider.
- Sender name is clear, for example `Hare Krishna Leaderboard`.
- Test signup confirmation email.
- Test reset password email.
- Test email OTP.

## 7. Storage

Supabase Dashboard -> Storage:

- `avatars` bucket exists and is public.
- `group-images` bucket exists and is public.
- Upload limit is 2 MB.
- Allowed image types: JPG, PNG, WebP.

Manual test:

- Upload profile picture.
- Save profile.
- Refresh page and confirm avatar remains.
- Create or edit group picture.
- Save group and confirm image remains.

## 8. Hosting Setup

For Vercel:

- Project root: `frontend`
- Build command: `npm run build`
- Output: Next.js default
- Environment variables: set all three variables from section 2

Alternative if deploying from repo root:

```bash
npm --prefix frontend run build
```

## 9. Pre-Production Manual Test Plan

Run these with two test accounts.

Auth:

- Create account.
- Confirm email.
- Sign in with email.
- Sign in with username.
- Sign in with phone if the account has an optional phone number saved.
- Reset password.
- Email OTP login.
- Change password from Profile.
- Delete a test account.

Rounds:

- Add rounds with +1.
- Save exact total.
- Edit today.
- Edit a date after the account join date.
- Confirm dates before the account join date and after today are blocked.
- Confirm daily max is 250.

Leaderboards:

- Check global daily, weekly, monthly.
- Check previous day/week/month controls.
- Confirm current user highlight.
- Confirm tied ranks.
- Confirm trust labels show last updated and self-entered.

Groups:

- Create group.
- Join by code from second account.
- Upload group picture.
- Copy group code.
- Promote member to moderator.
- Moderator removes regular member.
- Owner demotes moderator.
- Member leaves group.
- Owner deletes group.

Friends:

- Search by username.
- Send request.
- Cancel request.
- Accept request.
- Remove friend.
- Check friends leaderboard.

Profile:

- Update display name.
- Update username.
- Update phone.
- Upload profile picture.
- Export account data JSON.
- Choose featured milestones.
- Check public profile featured milestones.

## 10. Known Production Decisions

Decide before launch:

- Final domain name.
- Whether phone number remains optional long term.
- Whether email OTP should remain enabled.
- Whether group codes can be changed after members join.
- Privacy policy text.
- About/developer text.
- Support/contact email.
- Backup/export plan for Supabase.
