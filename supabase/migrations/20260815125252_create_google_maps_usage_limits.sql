create table public.google_maps_usage_daily (
  operation text not null check (operation in ('places_text_search', 'maps_javascript_load')),
  usage_date date not null,
  request_count integer not null default 0 check (request_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (operation, usage_date)
);

alter table public.google_maps_usage_daily enable row level security;

revoke all on table public.google_maps_usage_daily from public, anon, authenticated;
grant select, insert, update on table public.google_maps_usage_daily to service_role;

create function public.reserve_google_maps_usage(
  p_operation text,
  p_daily_limit integer,
  p_monthly_limit integer
)
returns table (
  allowed boolean,
  daily_used integer,
  monthly_used integer
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_usage_date date := (now() at time zone 'Asia/Seoul')::date;
  current_month_start date := date_trunc('month', (now() at time zone 'Asia/Seoul'))::date;
  current_daily_count integer;
  current_monthly_count integer;
begin
  if p_operation not in ('places_text_search', 'maps_javascript_load') then
    raise exception 'Unsupported Google Maps usage operation';
  end if;

  if p_daily_limit < 1 or p_monthly_limit < 1 then
    raise exception 'Google Maps usage limits must be positive';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('google-maps-usage:' || p_operation, 0)
  );

  select coalesce((
    select usage.request_count
    from public.google_maps_usage_daily as usage
    where usage.operation = p_operation
      and usage.usage_date = current_usage_date
  ), 0)
  into current_daily_count;

  select coalesce(sum(usage.request_count), 0)::integer
  into current_monthly_count
  from public.google_maps_usage_daily as usage
  where usage.operation = p_operation
    and usage.usage_date >= current_month_start
    and usage.usage_date < (current_month_start + interval '1 month')::date;

  if current_daily_count >= p_daily_limit or current_monthly_count >= p_monthly_limit then
    return query select false, current_daily_count, current_monthly_count;
    return;
  end if;

  insert into public.google_maps_usage_daily (operation, usage_date, request_count)
  values (p_operation, current_usage_date, 1)
  on conflict (operation, usage_date) do update
  set
    request_count = public.google_maps_usage_daily.request_count + 1,
    updated_at = now()
  returning request_count into current_daily_count;

  return query select true, current_daily_count, current_monthly_count + 1;
end;
$$;

revoke all on function public.reserve_google_maps_usage(text, integer, integer)
from public, anon, authenticated;
grant execute on function public.reserve_google_maps_usage(text, integer, integer)
to service_role;
