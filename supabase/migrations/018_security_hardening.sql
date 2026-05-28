-- Security hardening:
-- - email remains mandatory; phone becomes optional and unique only when present
-- - per-user daily rounds are capped at 250
-- - profile reads for the app use a public-safe view plus a private current-user RPC
-- - storage buckets accept JPG/PNG/WebP only
-- - immutable relationship fields are protected by database triggers

update public.profiles
set phone = null
where btrim(coalesce(phone, '')) = '';

alter table public.profiles
  alter column phone drop not null,
  alter column phone drop default;

alter table public.profiles
  drop constraint if exists profiles_phone_key;

drop index if exists profiles_phone_unique_present_idx;
create unique index profiles_phone_unique_present_idx
on public.profiles (phone)
where phone is not null and phone <> '';

alter table public.chant_totals
  drop constraint if exists chant_totals_rounds_check;

update public.chant_totals
set rounds = 250
where rounds > 250;

alter table public.chant_totals
  add constraint chant_totals_rounds_check
  check (rounds >= 0 and rounds <= 250);

alter table public.profiles
  drop constraint if exists profiles_daily_goal_check;

update public.profiles
set daily_goal = 250
where daily_goal > 250;

alter table public.profiles
  add constraint profiles_daily_goal_check
  check (daily_goal >= 0 and daily_goal <= 250);

alter table public.profiles
  drop constraint if exists profiles_email_check,
  drop constraint if exists profiles_display_name_length_check,
  drop constraint if exists profiles_country_length_check,
  drop constraint if exists profiles_timezone_length_check,
  drop constraint if exists profiles_avatar_url_length_check;

alter table public.profiles
  add constraint profiles_email_check
  check (email = lower(email) and length(email) between 3 and 320 and position('@' in email) > 1),
  add constraint profiles_display_name_length_check
  check (length(display_name) <= 80),
  add constraint profiles_country_length_check
  check (length(country) between 2 and 80),
  add constraint profiles_timezone_length_check
  check (length(timezone) between 3 and 80),
  add constraint profiles_avatar_url_length_check
  check (length(avatar_url) <= 1000);

alter table public.groups
  drop constraint if exists groups_code_check,
  drop constraint if exists groups_name_length_check,
  drop constraint if exists groups_image_url_length_check,
  drop constraint if exists groups_announcement_length_check;

alter table public.groups
  add constraint groups_code_check
  check (code ~ '^[A-Z0-9_-]{6,32}$' and code ~ '[A-Z]' and code ~ '[0-9]'),
  add constraint groups_name_length_check
  check (length(btrim(name)) between 2 and 80),
  add constraint groups_image_url_length_check
  check (length(image_url) <= 1000),
  add constraint groups_announcement_length_check
  check (length(announcement) <= 240);

create or replace function public.normalize_profile_identity()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.username := lower(btrim(new.username));
  new.email := lower(btrim(new.email));
  new.phone := nullif(btrim(coalesce(new.phone, '')), '');
  new.display_name := btrim(coalesce(new.display_name, ''));
  new.country := btrim(coalesce(new.country, 'India'));
  new.timezone := btrim(coalesce(new.timezone, 'Asia/Kolkata'));
  new.avatar_url := btrim(coalesce(new.avatar_url, ''));
  return new;
end;
$$;

drop trigger if exists normalize_profile_identity_before_write on public.profiles;
create trigger normalize_profile_identity_before_write
before insert or update on public.profiles
for each row execute function public.normalize_profile_identity();

create or replace function public.protect_group_immutable_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.id <> new.id or old.owner_id <> new.owner_id or old.created_at <> new.created_at then
    raise exception 'Group identity fields cannot be changed.';
  end if;
  new.code := upper(btrim(new.code));
  new.name := btrim(new.name);
  new.image_url := btrim(coalesce(new.image_url, ''));
  new.announcement := btrim(coalesce(new.announcement, ''));
  return new;
end;
$$;

drop trigger if exists protect_group_immutable_fields_before_update on public.groups;
create trigger protect_group_immutable_fields_before_update
before update on public.groups
for each row execute function public.protect_group_immutable_fields();

create or replace function public.protect_friend_request_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.from_user_id <> new.from_user_id or old.to_user_id <> new.to_user_id or old.created_at <> new.created_at then
    raise exception 'Friend request participants cannot be changed.';
  end if;
  if new.status not in ('accepted', 'declined') then
    raise exception 'Friend request can only be accepted or declined.';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_friend_request_update_before_update on public.friend_requests;
create trigger protect_friend_request_update_before_update
before update on public.friend_requests
for each row execute function public.protect_friend_request_update();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    username,
    email,
    phone,
    display_name,
    country,
    timezone,
    avatar_url
  )
  values (
    new.id,
    lower(new.raw_user_meta_data->>'username'),
    lower(new.email),
    nullif(new.raw_user_meta_data->>'phone', ''),
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'username', ''),
    coalesce(new.raw_user_meta_data->>'country', 'India'),
    coalesce(new.raw_user_meta_data->>'timezone', 'Asia/Kolkata'),
    coalesce(new.raw_user_meta_data->>'avatar_url', '')
  );
  return new;
end;
$$;

create or replace function public.resolve_login_identifier(login_identifier text)
returns text
language sql
security definer
set search_path = public
as $$
  select email
  from public.profiles
  where lower(username) = lower(login_identifier)
     or lower(email) = lower(login_identifier)
     or (phone is not null and phone = login_identifier)
  limit 1;
$$;

create or replace function public.is_profile_identity_available(
  desired_username text,
  desired_email text,
  desired_phone text
)
returns boolean
language sql
security definer
set search_path = public
as $$
  select not exists (
    select 1
    from public.profiles
    where lower(username) = lower(desired_username)
       or lower(email) = lower(desired_email)
       or (
         nullif(desired_phone, '') is not null
         and phone = nullif(desired_phone, '')
       )
  );
$$;

create or replace function public.profile_identity_conflicts(
  desired_username text,
  desired_email text,
  desired_phone text
)
returns text[]
language sql
security definer
set search_path = public
as $$
  select array_remove(array[
    case
      when exists (
        select 1 from public.profiles
        where lower(username) = lower(desired_username)
      )
      then 'username'
    end,
    case
      when exists (
        select 1 from public.profiles
        where lower(email) = lower(desired_email)
      )
      then 'email'
    end,
    case
      when nullif(desired_phone, '') is not null
       and exists (
        select 1 from public.profiles
        where phone = nullif(desired_phone, '')
      )
      then 'phone'
    end
  ], null);
$$;

grant execute on function public.resolve_login_identifier(text) to anon, authenticated;
grant execute on function public.is_profile_identity_available(text, text, text) to anon, authenticated;
grant execute on function public.profile_identity_conflicts(text, text, text) to anon, authenticated;

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

revoke select on public.profiles from anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp']),
  ('group-images', 'group-images', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
