-- Persist the Gemini daily limit per authenticated Supabase user.
-- Apply this migration before setting SUPABASE_URL and SUPABASE_ANON_KEY on
-- the serverless /api/chat deployment.
create table if not exists public.tutor_daily_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null,
  used integer not null default 0 check (used between 0 and 15),
  updated_at timestamptz not null default now(),
  primary key (user_id, usage_date)
);

alter table public.tutor_daily_usage enable row level security;
revoke all on public.tutor_daily_usage from anon, authenticated;

create or replace function public.consume_tutor_query(p_usage_date date)
returns table (allowed boolean, used integer, remaining integer)
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_used integer;
begin
  if v_user_id is null then
    raise exception 'authenticated user required';
  end if;

  insert into public.tutor_daily_usage as quota_usage (user_id, usage_date, used)
  values (v_user_id, p_usage_date, 1)
  on conflict (user_id, usage_date) do update
    set used = quota_usage.used + 1, updated_at = now()
    where quota_usage.used < 15
  returning quota_usage.used into v_used;

  if v_used is null then
    select quota_usage.used into v_used
    from public.tutor_daily_usage as quota_usage
    where quota_usage.user_id = v_user_id and quota_usage.usage_date = p_usage_date;
  end if;

  return query select v_used <= 15, v_used, greatest(0, 15 - v_used);
end;
$$;

revoke all on function public.consume_tutor_query(date) from public, anon;
grant execute on function public.consume_tutor_query(date) to authenticated;
