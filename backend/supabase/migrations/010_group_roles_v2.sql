alter table public.group_members
drop constraint if exists group_members_role_check;

alter table public.group_members
add constraint group_members_role_check
check (role in ('owner', 'moderator', 'member'));

create or replace function public.is_group_moderator(check_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.group_members
    where group_id = check_group_id
      and user_id = auth.uid()
      and role = 'moderator'
  );
$$;

grant execute on function public.is_group_moderator(uuid) to authenticated;

drop policy if exists "Users can join groups as themselves" on public.group_members;
drop policy if exists "Users join groups as members" on public.group_members;
drop policy if exists "Owners create owner membership" on public.group_members;
drop policy if exists "Members leave groups" on public.group_members;
drop policy if exists "Group owners remove members" on public.group_members;
drop policy if exists "Group moderators remove members" on public.group_members;
drop policy if exists "Owners update member roles" on public.group_members;

create policy "Users join groups as members"
on public.group_members for insert
to authenticated
with check (auth.uid() = user_id and role = 'member');

create policy "Owners create owner membership"
on public.group_members for insert
to authenticated
with check (
  auth.uid() = user_id
  and role = 'owner'
  and exists (
    select 1
    from public.groups
    where groups.id = group_members.group_id
      and groups.owner_id = auth.uid()
  )
);

create policy "Members leave groups"
on public.group_members for delete
to authenticated
using (auth.uid() = user_id and role in ('member', 'moderator'));

create policy "Group owners remove members"
on public.group_members for delete
to authenticated
using (
  role in ('member', 'moderator')
  and exists (
    select 1
    from public.groups
    where groups.id = group_members.group_id
      and groups.owner_id = auth.uid()
  )
);

create policy "Group moderators remove members"
on public.group_members for delete
to authenticated
using (
  role = 'member'
  and public.is_group_moderator(group_id)
);

create policy "Owners update member roles"
on public.group_members for update
to authenticated
using (
  role in ('member', 'moderator')
  and exists (
    select 1
    from public.groups
    where groups.id = group_members.group_id
      and groups.owner_id = auth.uid()
  )
)
with check (
  role in ('member', 'moderator')
  and exists (
    select 1
    from public.groups
    where groups.id = group_members.group_id
      and groups.owner_id = auth.uid()
  )
);
