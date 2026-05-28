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
      when exists (
        select 1 from public.profiles
        where phone = desired_phone
      )
      then 'phone'
    end
  ], null);
$$;

grant execute on function public.profile_identity_conflicts(text, text, text) to anon, authenticated;
