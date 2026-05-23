create or replace function public.get_public_profile(profile_username text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.profiles%rowtype;
  user_today date;
  user_week_start date;
  user_month_start date;
begin
  select *
  into target
  from public.profiles
  where lower(username) = lower(profile_username)
  limit 1;

  if target.id is null then
    return null;
  end if;

  user_today := (now() at time zone coalesce(target.timezone, 'Asia/Kolkata'))::date;
  user_week_start := user_today - (((extract(dow from user_today)::integer + 6) % 7));
  user_month_start := date_trunc('month', user_today)::date;

  return jsonb_build_object(
    'profile', jsonb_build_object(
      'username', target.username,
      'displayName', coalesce(nullif(target.display_name, ''), target.username),
      'avatarUrl', coalesce(target.avatar_url, ''),
      'country', case when coalesce(target.show_country, true) then target.country else null end,
      'joinedAt', target.joined_at,
      'privacy', jsonb_build_object(
        'showCountry', coalesce(target.show_country, true),
        'showGroups', coalesce(target.show_groups, true),
        'showStreak', coalesce(target.show_streak, true),
        'showRecentHistory', coalesce(target.show_recent_history, true),
        'showMilestones', coalesce(target.show_milestones, true)
      )
    ),
    'todayKey', user_today::text,
    'stats', jsonb_build_object(
      'todayRounds', coalesce((select sum(rounds) from public.chant_totals where user_id = target.id and local_date = user_today), 0),
      'weeklyRounds', coalesce((select sum(rounds) from public.chant_totals where user_id = target.id and local_date between user_week_start and user_today), 0),
      'monthlyRounds', coalesce((select sum(rounds) from public.chant_totals where user_id = target.id and local_date between user_month_start and user_today), 0),
      'allTimeRounds', coalesce((select sum(rounds) from public.chant_totals where user_id = target.id), 0),
      'positiveEntryCount', coalesce((select count(*) from public.chant_totals where user_id = target.id and rounds > 0), 0),
      'groupCount', coalesce((select count(*) from public.group_members where user_id = target.id), 0),
      'createdGroupCount', coalesce((select count(*) from public.groups where owner_id = target.id), 0),
      'friendCount', coalesce((
        select count(*)
        from public.friend_requests
        where status = 'accepted'
          and (from_user_id = target.id or to_user_id = target.id)
      ), 0)
    ),
    'recentHistory',
      case when coalesce(target.show_recent_history, true) then
        coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'dateKey', day::date::text,
              'rounds', coalesce(total.rounds, 0)
            )
            order by day::date
          )
          from generate_series(user_today - 6, user_today, interval '1 day') as day
          left join public.chant_totals total
            on total.user_id = target.id
           and total.local_date = day::date
        ), '[]'::jsonb)
      else '[]'::jsonb end,
    'positiveDates',
      case when coalesce(target.show_streak, true) or coalesce(target.show_milestones, true) then
        coalesce((
          select jsonb_agg(local_date::text order by local_date)
          from public.chant_totals
          where user_id = target.id and rounds > 0
        ), '[]'::jsonb)
      else '[]'::jsonb end,
    'groups',
      case when coalesce(target.show_groups, true) then
        coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'name', groups.name,
              'imageUrl', coalesce(groups.image_url, ''),
              'role', members.role
            )
            order by members.joined_at desc
          )
          from public.group_members members
          join public.groups groups on groups.id = members.group_id
          where members.user_id = target.id
        ), '[]'::jsonb)
      else '[]'::jsonb end
  );
end;
$$;

grant execute on function public.get_public_profile(text) to anon, authenticated;
