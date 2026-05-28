alter table public.profiles
  add column if not exists daily_goal integer not null default 16 check (daily_goal >= 0 and daily_goal <= 999),
  add column if not exists reminder_enabled boolean not null default false,
  add column if not exists reminder_time text not null default '20:00';

alter table public.groups
  add column if not exists announcement text not null default '',
  add column if not exists target_daily integer not null default 0 check (target_daily >= 0 and target_daily <= 99999),
  add column if not exists target_weekly integer not null default 0 check (target_weekly >= 0 and target_weekly <= 999999);
