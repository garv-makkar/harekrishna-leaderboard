create policy "Participants delete friend requests"
on public.friend_requests for delete
to authenticated
using (auth.uid() = from_user_id or auth.uid() = to_user_id);
