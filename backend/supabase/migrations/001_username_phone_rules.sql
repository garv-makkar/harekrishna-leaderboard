alter table public.profiles
drop constraint if exists profiles_username_check;

alter table public.profiles
add constraint profiles_username_check
check (username ~ '^[a-z][a-z0-9_]{2,23}$');
