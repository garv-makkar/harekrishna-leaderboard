create policy "Owners delete groups"
on public.groups for delete
to authenticated
using (auth.uid() = owner_id);

create policy "Members leave groups"
on public.group_members for delete
to authenticated
using (auth.uid() = user_id and role = 'member');
