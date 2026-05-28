alter table public.profiles
  add column if not exists show_country boolean not null default true,
  add column if not exists show_groups boolean not null default true,
  add column if not exists show_streak boolean not null default true,
  add column if not exists show_recent_history boolean not null default true,
  add column if not exists show_milestones boolean not null default true;
