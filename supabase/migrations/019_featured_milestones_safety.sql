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

create or replace function public.set_featured_milestones(milestone_ids text[])
returns text[]
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_ids text[];
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select coalesce(array_agg(distinct_id), '{}'::text[])
  into clean_ids
  from (
    select distinct_id
    from unnest(coalesce(milestone_ids, '{}'::text[])) with ordinality as selected(distinct_id, position)
    where nullif(trim(distinct_id), '') is not null
    group by distinct_id
    order by min(position)
    limit 3
  ) ordered_ids;

  update public.profiles
  set featured_milestone_ids = clean_ids
  where id = auth.uid();

  if not found then
    raise exception 'Profile not found';
  end if;

  return clean_ids;
end;
$$;

grant execute on function public.set_featured_milestones(text[]) to authenticated;
