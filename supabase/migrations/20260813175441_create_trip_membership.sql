create schema if not exists private;

revoke all on schema private from public;

create type public.trip_member_role as enum ('owner', 'editor', 'viewer');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (
    display_name is null
    or char_length(btrim(display_name)) between 1 and 80
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.trips (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 120),
  destination text not null check (char_length(btrim(destination)) between 1 and 160),
  start_date date not null,
  end_date date not null check (end_date >= start_date),
  time_zone text not null check (char_length(btrim(time_zone)) between 1 and 100),
  owner_id uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.trip_members (
  trip_id uuid not null references public.trips (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.trip_member_role not null default 'viewer',
  created_at timestamptz not null default now(),
  primary key (trip_id, user_id)
);

create index trip_members_user_id_trip_id_index on public.trip_members (user_id, trip_id);
create index trips_owner_id_index on public.trips (owner_id);

create function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at
before update on public.profiles
for each row
execute function private.touch_updated_at();

create trigger trips_touch_updated_at
before update on public.trips
for each row
execute function private.touch_updated_at();

create function private.create_profile_for_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger auth_user_creates_profile
after insert on auth.users
for each row
execute function private.create_profile_for_auth_user();

insert into public.profiles (id)
select id
from auth.users
on conflict (id) do nothing;

create function private.create_trip_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.trip_members (trip_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict (trip_id, user_id) do nothing;

  return new;
end;
$$;

create trigger trip_creates_owner_membership
after insert on public.trips
for each row
execute function private.create_trip_owner_membership();

create function private.is_trip_member(target_trip_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.trip_members as membership
    where membership.trip_id = target_trip_id
      and membership.user_id = (select auth.uid())
  );
$$;

create function private.is_trip_owner(target_trip_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.trip_members as membership
    where membership.trip_id = target_trip_id
      and membership.user_id = (select auth.uid())
      and membership.role = 'owner'
  );
$$;

create function private.shares_trip_with(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.trip_members as current_membership
    join public.trip_members as target_membership
      on target_membership.trip_id = current_membership.trip_id
    where current_membership.user_id = (select auth.uid())
      and target_membership.user_id = target_user_id
  );
$$;

revoke all on function private.create_profile_for_auth_user() from public;
revoke all on function private.create_trip_owner_membership() from public;
revoke all on function private.touch_updated_at() from public;
revoke all on function private.is_trip_member(uuid) from public;
revoke all on function private.is_trip_owner(uuid) from public;
revoke all on function private.shares_trip_with(uuid) from public;

grant usage on schema private to authenticated;
grant execute on function private.is_trip_member(uuid) to authenticated;
grant execute on function private.is_trip_owner(uuid) to authenticated;
grant execute on function private.shares_trip_with(uuid) to authenticated;

revoke all on table public.profiles, public.trips, public.trip_members from public, anon;
grant select, update on table public.profiles to authenticated;
grant select, insert, update, delete on table public.trips to authenticated;
grant select, insert, delete on table public.trip_members to authenticated;
grant select, insert, update, delete on table public.profiles, public.trips, public.trip_members to service_role;

alter table public.profiles enable row level security;
alter table public.trips enable row level security;
alter table public.trip_members enable row level security;

create policy "Trip members can read relevant profiles"
on public.profiles
for select
to authenticated
using (
  id = (select auth.uid())
  or (select private.shares_trip_with(id))
);

create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create policy "Trip members can read their trips"
on public.trips
for select
to authenticated
using ((select private.is_trip_member(id)));

create policy "Users can create trips they own"
on public.trips
for insert
to authenticated
with check (owner_id = (select auth.uid()));

create policy "Owners can update their trips"
on public.trips
for update
to authenticated
using ((select private.is_trip_owner(id)))
with check (
  owner_id = (select auth.uid())
  and (select private.is_trip_owner(id))
);

create policy "Owners can delete their trips"
on public.trips
for delete
to authenticated
using ((select private.is_trip_owner(id)));

create policy "Trip members can read fellow members"
on public.trip_members
for select
to authenticated
using ((select private.is_trip_member(trip_id)));

create policy "Owners can add editors and viewers"
on public.trip_members
for insert
to authenticated
with check (
  (select private.is_trip_owner(trip_id))
  and role in ('editor', 'viewer')
);

create policy "Owners can remove other members"
on public.trip_members
for delete
to authenticated
using (
  (select private.is_trip_owner(trip_id))
  and user_id <> (select auth.uid())
);
