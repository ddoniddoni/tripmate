do $$
begin
  if exists (
    select 1
    from pg_proc as procedure
    join pg_namespace as namespace
      on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'public'
      and procedure.proname = 'transfer_trip_ownership'
      and procedure.prosecdef
  ) then
    alter function public.transfer_trip_ownership(uuid, uuid) set schema private;
  end if;
end;
$$;

revoke all on function private.transfer_trip_ownership(uuid, uuid) from public, anon, service_role;
grant execute on function private.transfer_trip_ownership(uuid, uuid) to authenticated;

create or replace function public.transfer_trip_ownership(
  target_trip_id uuid,
  next_owner_id uuid
)
returns boolean
language sql
security invoker
set search_path = ''
as $$
  select private.transfer_trip_ownership($1, $2);
$$;

revoke all on function public.transfer_trip_ownership(uuid, uuid) from public, anon, service_role;
grant execute on function public.transfer_trip_ownership(uuid, uuid) to authenticated;
