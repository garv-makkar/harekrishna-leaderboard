create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z][a-z0-9_]{2,23}$'),
  email text not null unique,
  phone text not null unique,
  display_name text not null default '',
  country text not null,
  timezone text not null,
  avatar_url text not null default '',
  joined_at timestamptz not null default now()
);

create table public.chant_totals (
  user_id uuid not null references public.profiles(id) on delete cascade,
  local_date date not null,
  rounds integer not null default 0 check (rounds >= 0 and rounds <= 999),
  updated_at timestamptz not null default now(),
  primary key (user_id, local_date)
);

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  code text not null unique,
  image_url text not null default '',
  created_at timestamptz not null default now()
);

create table public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references public.profiles(id) on delete cascade,
  to_user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  check (from_user_id <> to_user_id)
);

create unique index friend_requests_pair_idx
on public.friend_requests (
  least(from_user_id, to_user_id),
  greatest(from_user_id, to_user_id)
);

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
    coalesce(new.raw_user_meta_data->>'phone', ''),
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'username', ''),
    coalesce(new.raw_user_meta_data->>'country', 'India'),
    coalesce(new.raw_user_meta_data->>'timezone', 'Asia/Kolkata'),
    coalesce(new.raw_user_meta_data->>'avatar_url', '')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.resolve_login_identifier(login_identifier text)
returns text
language sql
security definer
set search_path = public
as $$
  select email
  from public.profiles
  where lower(username) = lower(login_identifier)
     or phone = login_identifier
     or lower(email) = lower(login_identifier)
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
       or phone = desired_phone
  );
$$;

grant execute on function public.resolve_login_identifier(text) to anon, authenticated;
grant execute on function public.is_profile_identity_available(text, text, text) to anon, authenticated;

create or replace function public.is_chant_total_editable(entry_user_id uuid, entry_local_date date)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select entry_local_date between (
    (now() at time zone coalesce(
      (select timezone from public.profiles where id = entry_user_id),
      'Asia/Kolkata'
    ))::date - 6
  )
  and (
    now() at time zone coalesce(
      (select timezone from public.profiles where id = entry_user_id),
      'Asia/Kolkata'
    )
  )::date;
$$;

grant execute on function public.is_chant_total_editable(uuid, date) to authenticated;

alter table public.profiles enable row level security;
alter table public.chant_totals enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.friend_requests enable row level security;

create policy "Profiles are readable by signed in users"
on public.profiles for select
to authenticated
using (true);

create policy "Users update their own profile"
on public.profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "Users insert their own profile"
on public.profiles for insert
to authenticated
with check (auth.uid() = id);

create policy "Users manage their own chanting totals"
on public.chant_totals for all
to authenticated
using (auth.uid() = user_id and public.is_chant_total_editable(user_id, local_date))
with check (auth.uid() = user_id and public.is_chant_total_editable(user_id, local_date));

create policy "Chant totals are readable by signed in users"
on public.chant_totals for select
to authenticated
using (true);

create policy "Groups are readable by signed in users"
on public.groups for select
to authenticated
using (true);

create policy "Users create owned groups"
on public.groups for insert
to authenticated
with check (auth.uid() = owner_id);

create policy "Owners update groups"
on public.groups for update
to authenticated
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

create policy "Owners delete groups"
on public.groups for delete
to authenticated
using (auth.uid() = owner_id);

create policy "Group memberships are readable"
on public.group_members for select
to authenticated
using (true);

create policy "Users can join groups as themselves"
on public.group_members for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Members leave groups"
on public.group_members for delete
to authenticated
using (auth.uid() = user_id and role = 'member');

create policy "Friend requests visible to participants"
on public.friend_requests for select
to authenticated
using (auth.uid() = from_user_id or auth.uid() = to_user_id);

create policy "Users send friend requests"
on public.friend_requests for insert
to authenticated
with check (auth.uid() = from_user_id);

create policy "Recipients update friend requests"
on public.friend_requests for update
to authenticated
using (auth.uid() = to_user_id)
with check (auth.uid() = to_user_id);

create policy "Participants delete friend requests"
on public.friend_requests for delete
to authenticated
using (auth.uid() = from_user_id or auth.uid() = to_user_id);
