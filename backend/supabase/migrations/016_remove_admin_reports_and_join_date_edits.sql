create or replace function public.is_chant_total_editable(entry_user_id uuid, entry_local_date date)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select entry_local_date between (
    coalesce(
      (select joined_at::date from public.profiles where id = entry_user_id),
      (now() at time zone coalesce(
        (select timezone from public.profiles where id = entry_user_id),
        'Asia/Kolkata'
      ))::date
    )
  )
  and (
    now() at time zone coalesce(
      (select timezone from public.profiles where id = entry_user_id),
      'Asia/Kolkata'
    )
  )::date;
$$;

grant execute on function public.is_chant_total_editable(uuid, date) to authenticated;

drop policy if exists "Users manage their own chanting totals" on public.chant_totals;

create policy "Users manage their own chanting totals"
on public.chant_totals for all
to authenticated
using (auth.uid() = user_id and public.is_chant_total_editable(user_id, local_date))
with check (auth.uid() = user_id and public.is_chant_total_editable(user_id, local_date));

alter table if exists public.notifications
  drop constraint if exists notifications_action_tab_check;

alter table if exists public.notifications
  add constraint notifications_action_tab_check
  check (
    action_tab is null
    or action_tab in ('home', 'groups', 'friends', 'global', 'activity', 'notifications', 'profile', 'about')
  );

drop table if exists public.moderation_reports;
drop table if exists public.app_admins;
drop function if exists public.is_app_admin();
