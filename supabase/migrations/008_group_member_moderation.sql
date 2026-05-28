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

drop policy if exists "Group owners remove members" on public.group_members;

create policy "Group owners remove members"
on public.group_members for delete
to authenticated
using (
  role = 'member'
  and exists (
    select 1
    from public.groups
    where groups.id = group_members.group_id
      and groups.owner_id = auth.uid()
  )
);
