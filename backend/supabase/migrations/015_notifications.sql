create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  tone text not null default 'info' check (tone in ('success', 'info', 'warning')),
  action_tab text check (
    action_tab is null
    or action_tab in ('home', 'groups', 'friends', 'global', 'activity', 'notifications', 'profile', 'about')
  ),
  dedupe_key text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists notifications_user_dedupe_idx
on public.notifications(user_id, dedupe_key)
where dedupe_key is not null;

create index if not exists notifications_user_created_idx
on public.notifications(user_id, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "Users read their own notifications" on public.notifications;
create policy "Users read their own notifications"
on public.notifications for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users create their own notifications" on public.notifications;
create policy "Users create their own notifications"
on public.notifications for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users update their own notifications" on public.notifications;
create policy "Users update their own notifications"
on public.notifications for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users delete their own notifications" on public.notifications;
create policy "Users delete their own notifications"
on public.notifications for delete
to authenticated
using (auth.uid() = user_id);
