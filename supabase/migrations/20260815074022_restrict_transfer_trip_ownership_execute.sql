revoke all on function public.transfer_trip_ownership(uuid, uuid) from public, anon, service_role;
grant execute on function public.transfer_trip_ownership(uuid, uuid) to authenticated;
