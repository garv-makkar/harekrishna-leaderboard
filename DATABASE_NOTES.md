# Database Notes

This app uses Supabase Auth plus public tables/policies in `supabase/migrations`.

## Current Shape

- Auth is handled by Supabase Auth.
- App profile data lives in `public.profiles`.
- Daily chanting totals live in `public.chant_totals`.
- Groups use `public.groups` and `public.group_members`.
- Friends use `public.friend_requests`.
- Notifications use `public.notifications`.
- Public share pages use RPCs such as `get_public_profile` and `get_public_group_invite`.

## Legacy Migrations

These migrations are kept as history, but the feature was later removed:

- `008_group_member_moderation.sql`
- `009_admin_review.sql`

They created moderation/admin-reporting tables. The current app intentionally does not include admin or report features.

## Cleanup Migration

`016_remove_admin_reports_and_join_date_edits.sql` is the active cleanup migration for that removal.

It drops:

- `public.moderation_reports`
- `public.app_admins`
- `public.is_app_admin()`

It also allows users to edit chanting totals for any date on or after their account creation date.

## Current Important Migrations

- `012_profile_privacy.sql`: public profile privacy fields.
- `013_public_profile_rpc.sql`: public user profile page support.
- `014_public_group_invite_rpc.sql`: public group invite page support.
- `015_notifications.sql`: in-app notifications.
- `017_featured_milestones.sql`: featured milestones on profiles.
- `018_security_hardening.sql`: security hardening, required email, optional phone, and current round limits.

## Rule Of Thumb

Run all migrations in order for a fresh Supabase project. For an existing project, only run migrations that have not already been applied.

