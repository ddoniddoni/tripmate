create table public.trip_invitations (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  email text not null check (
    email = lower(btrim(email))
    and char_length(email) between 3 and 320
    and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  ),
  role public.trip_member_role not null check (role in ('editor', 'viewer')),
  token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
  expires_at timestamptz not null,
  created_by uuid not null references public.profiles (id) on delete restrict,
  accepted_at timestamptz,
  accepted_by uuid references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (trip_id, email),
  check (expires_at > created_at),
  check (
    (accepted_at is null and accepted_by is null)
    or (accepted_at is not null and accepted_by is not null)
  )
);

create table public.trip_invitation_acceptances (
  invitation_id uuid primary key references public.trip_invitations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index trip_invitations_trip_id_created_at_index
on public.trip_invitations (trip_id, created_at desc);

create index trip_invitations_pending_recipient_index
on public.trip_invitations (email)
where accepted_at is null;

create function private.can_accept_trip_invitation(target_invitation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select auth.uid()) is not null
    and exists (
      select 1
      from public.trip_invitations as invitation
      where invitation.id = target_invitation_id
        and invitation.email = lower(coalesce((select auth.jwt() ->> 'email'), ''))
        and invitation.accepted_at is null
        and invitation.expires_at > now()
    );
$$;

create function private.accept_trip_invitation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  invitation_trip_id uuid;
  invitation_role public.trip_member_role;
begin
  if new.user_id <> (select auth.uid()) then
    raise exception 'Invitation acceptance must belong to the authenticated user';
  end if;

  select invitation.trip_id, invitation.role
  into invitation_trip_id, invitation_role
  from public.trip_invitations as invitation
  where invitation.id = new.invitation_id
    and invitation.email = lower(coalesce((select auth.jwt() ->> 'email'), ''))
    and invitation.accepted_at is null
    and invitation.expires_at > now()
  for update;

  if not found then
    raise exception 'Invitation is invalid, expired, or assigned to another email address';
  end if;

  insert into public.trip_members (trip_id, user_id, role)
  values (invitation_trip_id, new.user_id, invitation_role)
  on conflict (trip_id, user_id) do nothing;

  update public.trip_invitations
  set accepted_at = now(), accepted_by = new.user_id
  where id = new.invitation_id;

  return new;
end;
$$;

create trigger invitation_acceptance_creates_trip_membership
after insert on public.trip_invitation_acceptances
for each row
execute function private.accept_trip_invitation();

revoke all on function private.can_accept_trip_invitation(uuid) from public;
revoke all on function private.accept_trip_invitation() from public;

grant execute on function private.can_accept_trip_invitation(uuid) to authenticated;

revoke all on table public.trip_invitations, public.trip_invitation_acceptances from public, anon;
grant select, insert, delete on table public.trip_invitations to authenticated;
grant insert on table public.trip_invitation_acceptances to authenticated;
grant select, insert, update, delete on table public.trip_invitations, public.trip_invitation_acceptances to service_role;

alter table public.trip_invitations enable row level security;
alter table public.trip_invitation_acceptances enable row level security;

create policy "Trip owners can read their invitations"
on public.trip_invitations
for select
to authenticated
using ((select private.is_trip_owner(trip_id)));

create policy "Invitees can read their pending invitations"
on public.trip_invitations
for select
to authenticated
using (
  accepted_at is null
  and email = lower(coalesce((select auth.jwt() ->> 'email'), ''))
);

create policy "Trip owners can create editor and viewer invitations"
on public.trip_invitations
for insert
to authenticated
with check (
  (select private.is_trip_owner(trip_id))
  and created_by = (select auth.uid())
  and role in ('editor', 'viewer')
);

create policy "Trip owners can revoke invitations"
on public.trip_invitations
for delete
to authenticated
using ((select private.is_trip_owner(trip_id)));

create policy "Invitees can accept invitations addressed to their email"
on public.trip_invitation_acceptances
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and (select private.can_accept_trip_invitation(invitation_id))
);
