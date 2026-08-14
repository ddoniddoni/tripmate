grant update (role) on table public.trip_members to authenticated;

drop policy if exists "Owners can remove other members" on public.trip_members;

create policy "Owners can remove editors and viewers"
on public.trip_members
for delete
to authenticated
using (
  (select private.is_trip_owner(trip_id))
  and user_id <> (select auth.uid())
  and role in ('editor', 'viewer')
);

create policy "Owners can change editor and viewer roles"
on public.trip_members
for update
to authenticated
using (
  (select private.is_trip_owner(trip_id))
  and user_id <> (select auth.uid())
  and role in ('editor', 'viewer')
)
with check (
  (select private.is_trip_owner(trip_id))
  and user_id <> (select auth.uid())
  and role in ('editor', 'viewer')
);
