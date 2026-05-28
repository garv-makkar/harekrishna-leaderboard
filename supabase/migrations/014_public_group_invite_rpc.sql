create or replace function public.get_public_group_invite(group_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.groups%rowtype;
  owner_profile public.profiles%rowtype;
begin
  select *
  into target
  from public.groups
  where upper(code) = upper(group_code)
  limit 1;

  if target.id is null then
    return null;
  end if;

  select *
  into owner_profile
  from public.profiles
  where id = target.owner_id
  limit 1;

  return jsonb_build_object(
    'group', jsonb_build_object(
      'name', target.name,
      'code', target.code,
      'imageUrl', coalesce(target.image_url, ''),
      'announcement', coalesce(target.announcement, ''),
      'targetDaily', coalesce(target.target_daily, 0),
      'targetWeekly', coalesce(target.target_weekly, 0),
      'createdAt', target.created_at
    ),
    'owner', jsonb_build_object(
      'username', owner_profile.username,
      'displayName', coalesce(nullif(owner_profile.display_name, ''), owner_profile.username),
      'avatarUrl', coalesce(owner_profile.avatar_url, '')
    ),
    'memberCount', coalesce((
      select count(*)
      from public.group_members
      where group_id = target.id
    ), 0)
  );
end;
$$;

grant execute on function public.get_public_group_invite(text) to anon, authenticated;
