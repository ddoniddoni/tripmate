create function public.transfer_trip_ownership(
  target_trip_id uuid,
  next_owner_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_owner_id uuid := (select auth.uid());
begin
  if current_owner_id is null or current_owner_id = next_owner_id then
    return false;
  end if;

  perform 1
  from public.trips
  where id = target_trip_id
    and owner_id = current_owner_id
  for update;

  if not found then
    return false;
  end if;

  perform 1
  from public.trip_members
  where trip_id = target_trip_id
    and user_id = current_owner_id
    and role = 'owner'
  for update;

  if not found then
    return false;
  end if;

  perform 1
  from public.trip_members
  where trip_id = target_trip_id
    and user_id = next_owner_id
    and role in ('editor', 'viewer')
  for update;

  if not found then
    return false;
  end if;

  update public.trip_members
  set role = 'editor'
  where trip_id = target_trip_id
    and user_id = current_owner_id;

  update public.trip_members
  set role = 'owner'
  where trip_id = target_trip_id
    and user_id = next_owner_id;

  update public.trips
  set owner_id = next_owner_id
  where id = target_trip_id;

  return true;
end;
$$;

revoke all on function public.transfer_trip_ownership(uuid, uuid) from public;
grant execute on function public.transfer_trip_ownership(uuid, uuid) to authenticated;

create policy "Editors and viewers can leave trips"
on public.trip_members
for delete
to authenticated
using (
  user_id = (select auth.uid())
  and role in ('editor', 'viewer')
);
