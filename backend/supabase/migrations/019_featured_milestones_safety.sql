alter table public.profiles
  add column if not exists featured_milestone_ids text[] not null default '{}';

drop view if exists public.app_public_profiles;
create view public.app_public_profiles as
select
  id,
  username,
  null::text as email,
  null::text as phone,
  display_name,
  country,
  timezone,
  avatar_url,
  daily_goal,
  reminder_enabled,
  reminder_time,
  show_country,
  show_groups,
  show_streak,
  show_recent_history,
  show_milestones,
  featured_milestone_ids,
  joined_at
from public.profiles;

grant select on public.app_public_profiles to authenticated;

create or replace function public.get_current_profile()
returns public.profiles
language sql
stable
security definer
set search_path = public
as $$
  select *
  from public.profiles
  where id = auth.uid()
  limit 1;
$$;

grant execute on function public.get_current_profile() to authenticated;
