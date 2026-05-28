create table if not exists public.moderation_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reported_user_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null,
  details text not null default '',
  status text not null default 'open' check (status in ('open', 'reviewed', 'dismissed')),
  created_at timestamptz not null default now(),
  check (reporter_id <> reported_user_id)
);

alter table public.moderation_reports enable row level security;

create table if not exists public.app_admins (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.app_admins enable row level security;

create or replace function public.is_app_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.app_admins
    where user_id = auth.uid()
  );
$$;

grant execute on function public.is_app_admin() to authenticated;

drop policy if exists "Users create moderation reports" on public.moderation_reports;

create policy "Users create moderation reports"
on public.moderation_reports for insert
to authenticated
with check (auth.uid() = reporter_id);

drop policy if exists "Users read their own moderation reports" on public.moderation_reports;

create policy "Users read their own moderation reports"
on public.moderation_reports for select
to authenticated
using (auth.uid() = reporter_id);

drop policy if exists "Admins read admin list" on public.app_admins;

create policy "Admins read admin list"
on public.app_admins for select
to authenticated
using (public.is_app_admin() or auth.uid() = user_id);

drop policy if exists "Admins read moderation reports" on public.moderation_reports;

create policy "Admins read moderation reports"
on public.moderation_reports for select
to authenticated
using (public.is_app_admin());

drop policy if exists "Admins update moderation reports" on public.moderation_reports;

create policy "Admins update moderation reports"
on public.moderation_reports for update
to authenticated
using (public.is_app_admin())
with check (public.is_app_admin());
