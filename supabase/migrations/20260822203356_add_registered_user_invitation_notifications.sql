create type public.trip_invitation_status as enum ('pending', 'accepted', 'declined');

alter table public.trip_invitations
add column recipient_id uuid references public.profiles (id) on delete cascade,
add column status public.trip_invitation_status not null default 'pending',
add column responded_at timestamptz;

update public.trip_invitations as invitation
set recipient_id = auth_user.id
from auth.users as auth_user
where invitation.email = lower(auth_user.email);

update public.trip_invitations
set
  status = 'accepted',
  responded_at = accepted_at
where accepted_at is not null;

alter table public.trip_invitations
alter column token_hash drop not null;

alter table public.trip_invitations
drop constraint trip_invitations_trip_id_email_key;

drop index public.trip_invitations_pending_recipient_index;

create index trip_invitations_pending_recipient_index
on public.trip_invitations (email)
where status = 'pending';

alter table public.trip_invitations
add constraint trip_invitations_response_state_check check (
  (
    status = 'pending'
    and responded_at is null
    and accepted_at is null
    and accepted_by is null
  )
  or (
    status = 'accepted'
    and responded_at is not null
    and accepted_at is not null
    and accepted_by is not null
  )
  or (
    status = 'declined'
    and responded_at is not null
    and accepted_at is null
    and accepted_by is null
  )
);

create index trip_invitations_recipient_status_created_at_index
on public.trip_invitations (recipient_id, status, created_at desc)
where recipient_id is not null;

create unique index trip_invitations_pending_recipient_unique_index
on public.trip_invitations (trip_id, recipient_id)
where status = 'pending' and recipient_id is not null;

create index trip_invitations_created_by_index
on public.trip_invitations (created_by);

create index trip_invitations_accepted_by_index
on public.trip_invitations (accepted_by)
where accepted_by is not null;

create index trip_invitation_acceptances_user_id_index
on public.trip_invitation_acceptances (user_id);

drop policy "Invitees can read their pending invitations" on public.trip_invitations;
drop policy "Trip owners can read their invitations" on public.trip_invitations;

create policy "Owners and recipients can read invitations"
on public.trip_invitations
for select
to authenticated
using (
  (select private.is_trip_owner(trip_id))
  or recipient_id = (select auth.uid())
  or (
    recipient_id is null
    and email = lower(coalesce((select auth.jwt() ->> 'email'), ''))
  )
);

drop policy "Trip owners can create editor and viewer invitations" on public.trip_invitations;
drop policy "Trip owners can revoke invitations" on public.trip_invitations;

create policy "Trip owners can revoke pending invitations"
on public.trip_invitations
for delete
to authenticated
using (
  status = 'pending'
  and (select private.is_trip_owner(trip_id))
);

revoke insert on table public.trip_invitations from authenticated;

create function public.list_trip_invitation_notifications()
returns table (
  id uuid,
  role public.trip_member_role,
  status public.trip_invitation_status,
  expires_at timestamptz,
  created_at timestamptz,
  trip_id uuid,
  trip_title text,
  trip_destination text,
  trip_start_date date,
  trip_end_date date,
  trip_time_zone text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    invitation.id,
    invitation.role,
    invitation.status,
    invitation.expires_at,
    invitation.created_at,
    trip.id,
    trip.title,
    trip.destination,
    trip.start_date,
    trip.end_date,
    trip.time_zone
  from public.trip_invitations as invitation
  join public.trips as trip on trip.id = invitation.trip_id
  where (select auth.uid()) is not null
    and invitation.recipient_id = (select auth.uid())
  order by invitation.created_at desc;
$$;

create function public.create_trip_invitation_for_registered_user(
  target_trip_id uuid,
  target_email text,
  target_role public.trip_member_role
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  normalized_email text := lower(btrim(target_email));
  target_user_id uuid;
  existing_invitation_id uuid;
  existing_invitation_expires_at timestamptz;
begin
  if current_user_id is null then
    raise exception 'AUTHENTICATION_REQUIRED';
  end if;

  if not (select private.is_trip_owner(target_trip_id)) then
    raise exception 'NOT_TRIP_OWNER';
  end if;

  if target_role not in ('editor', 'viewer') then
    raise exception 'INVALID_INVITATION_ROLE';
  end if;

  select auth_user.id
  into target_user_id
  from auth.users as auth_user
  where lower(auth_user.email) = normalized_email
    and auth_user.email_confirmed_at is not null
    and auth_user.deleted_at is null
  limit 1;

  if target_user_id is null then
    raise exception 'INVITEE_NOT_FOUND';
  end if;

  if target_user_id = current_user_id then
    raise exception 'CANNOT_INVITE_SELF';
  end if;

  if exists (
    select 1
    from public.trip_members as membership
    where membership.trip_id = target_trip_id
      and membership.user_id = target_user_id
  ) then
    raise exception 'ALREADY_TRIP_MEMBER';
  end if;

  select invitation.id, invitation.expires_at
  into existing_invitation_id, existing_invitation_expires_at
  from public.trip_invitations as invitation
  where invitation.trip_id = target_trip_id
    and invitation.recipient_id = target_user_id
    and invitation.status = 'pending'
  for update;

  if existing_invitation_id is not null and existing_invitation_expires_at > now() then
    raise exception 'INVITATION_ALREADY_PENDING';
  end if;

  if existing_invitation_id is not null then
    update public.trip_invitations
    set
      email = normalized_email,
      role = target_role,
      token_hash = null,
      expires_at = now() + interval '7 days',
      created_by = current_user_id,
      created_at = now()
    where id = existing_invitation_id;

    return existing_invitation_id;
  end if;

  insert into public.trip_invitations (
    trip_id,
    email,
    recipient_id,
    role,
    token_hash,
    expires_at,
    created_by,
    status
  )
  values (
    target_trip_id,
    normalized_email,
    target_user_id,
    target_role,
    null,
    now() + interval '7 days',
    current_user_id,
    'pending'
  )
  returning id into existing_invitation_id;

  return existing_invitation_id;
end;
$$;

create function public.respond_to_trip_invitation(
  target_invitation_id uuid,
  invitation_response text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  invitation_trip_id uuid;
  invitation_role public.trip_member_role;
begin
  if current_user_id is null then
    raise exception 'AUTHENTICATION_REQUIRED';
  end if;

  if invitation_response not in ('accepted', 'declined') then
    raise exception 'INVALID_INVITATION_RESPONSE';
  end if;

  select invitation.trip_id, invitation.role
  into invitation_trip_id, invitation_role
  from public.trip_invitations as invitation
  where invitation.id = target_invitation_id
    and invitation.recipient_id = current_user_id
    and invitation.status = 'pending'
    and invitation.expires_at > now()
  for update;

  if invitation_trip_id is null then
    raise exception 'INVITATION_UNAVAILABLE';
  end if;

  if invitation_response = 'accepted' then
    insert into public.trip_members (trip_id, user_id, role)
    values (invitation_trip_id, current_user_id, invitation_role)
    on conflict (trip_id, user_id) do nothing;

    update public.trip_invitations
    set
      status = 'accepted',
      responded_at = now(),
      accepted_at = now(),
      accepted_by = current_user_id
    where id = target_invitation_id;
  else
    update public.trip_invitations
    set
      status = 'declined',
      responded_at = now()
    where id = target_invitation_id;
  end if;

  return invitation_trip_id;
end;
$$;

revoke all on function public.create_trip_invitation_for_registered_user(uuid, text, public.trip_member_role)
from public, anon;
revoke all on function public.respond_to_trip_invitation(uuid, text) from public, anon;
revoke all on function public.list_trip_invitation_notifications() from public, anon;

grant execute on function public.create_trip_invitation_for_registered_user(uuid, text, public.trip_member_role)
to authenticated;
grant execute on function public.respond_to_trip_invitation(uuid, text) to authenticated;
grant execute on function public.list_trip_invitation_notifications() to authenticated;

create or replace function private.can_accept_trip_invitation(target_invitation_id uuid)
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
        and (
          invitation.recipient_id is null
          or invitation.recipient_id = (select auth.uid())
        )
        and invitation.status = 'pending'
        and invitation.expires_at > now()
    );
$$;

create or replace function private.accept_trip_invitation()
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
    and (
      invitation.recipient_id is null
      or invitation.recipient_id = (select auth.uid())
    )
    and invitation.status = 'pending'
    and invitation.expires_at > now()
  for update;

  if not found then
    raise exception 'Invitation is invalid, expired, or assigned to another account';
  end if;

  insert into public.trip_members (trip_id, user_id, role)
  values (invitation_trip_id, new.user_id, invitation_role)
  on conflict (trip_id, user_id) do nothing;

  update public.trip_invitations
  set
    recipient_id = new.user_id,
    status = 'accepted',
    responded_at = now(),
    accepted_at = now(),
    accepted_by = new.user_id
  where id = new.invitation_id;

  return new;
end;
$$;
