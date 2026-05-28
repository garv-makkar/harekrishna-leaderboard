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

drop policy if exists "Users manage their own chanting totals" on public.chant_totals;

create policy "Users manage their own chanting totals"
on public.chant_totals for all
to authenticated
using (auth.uid() = user_id and public.is_chant_total_editable(user_id, local_date))
with check (auth.uid() = user_id and public.is_chant_total_editable(user_id, local_date));
