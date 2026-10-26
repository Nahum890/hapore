-- PyFis IA — cuota del tutor online (auditoría del 26/10/2026).
-- Requiere 20260926_tutor_daily_quota.sql. Se puede volver a ejecutar.
--
-- Corrige dos problemas:
--   1. consume_tutor_query() nunca bloqueaba: con 15 consultas usadas, el
--      UPDATE no se aplicaba, se leía used = 15 y devolvía allowed = (15 <= 15),
--      o sea TRUE. El límite diario no existía en la práctica.
--   2. Solo se contaba el chat libre. Las pistas, la evaluación del cuestionario
--      y las fotos llegaban a Gemini sin ningún límite: cualquiera con una sesión
--      anónima podía usar /api/chat como proxy gratuito (costo para el equipo).
--      Ahora hay un segundo contador ("aux") con un tope más alto.

alter table public.tutor_daily_usage add column if not exists aux_used integer not null default 0;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'tutor_daily_usage_aux_used_range') then
    alter table public.tutor_daily_usage add constraint tutor_daily_usage_aux_used_range check (aux_used between 0 and 80);
  end if;
end $$;

-- p_kind: 'chat' (chat libre y fotos, 15 por día) o 'aux' (pistas y
-- evaluaciones, 80 por día).
create or replace function public.consume_tutor_quota(p_usage_date date, p_kind text default 'chat')
returns table (allowed boolean, used integer, remaining integer)
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_used integer;
  v_limit integer := case when p_kind = 'aux' then 80 else 15 end;
begin
  if v_user_id is null then
    raise exception 'authenticated user required';
  end if;
  if p_usage_date is null or abs(p_usage_date - (now() at time zone 'America/Asuncion')::date) > 1 then
    raise exception 'invalid usage date';
  end if;

  if p_kind = 'aux' then
    insert into public.tutor_daily_usage as quota_usage (user_id, usage_date, used, aux_used)
    values (v_user_id, p_usage_date, 0, 1)
    on conflict (user_id, usage_date) do update
      set aux_used = quota_usage.aux_used + 1, updated_at = now()
      where quota_usage.aux_used < v_limit
    returning quota_usage.aux_used into v_used;
  else
    insert into public.tutor_daily_usage as quota_usage (user_id, usage_date, used)
    values (v_user_id, p_usage_date, 1)
    on conflict (user_id, usage_date) do update
      set used = quota_usage.used + 1, updated_at = now()
      where quota_usage.used < v_limit
    returning quota_usage.used into v_used;
  end if;

  if v_used is null then
    -- No se sumó: el tope ya estaba alcanzado.
    return query select false, v_limit, 0;
    return;
  end if;
  return query select true, v_used, greatest(0, v_limit - v_used);
end;
$$;

-- La función vieja queda como alias del chat, ya corregida.
create or replace function public.consume_tutor_query(p_usage_date date)
returns table (allowed boolean, used integer, remaining integer)
language sql
security definer
set search_path = pg_catalog, public, auth
as $$
  select * from public.consume_tutor_quota(p_usage_date, 'chat');
$$;

revoke all on function public.consume_tutor_quota(date, text) from public, anon;
revoke all on function public.consume_tutor_query(date) from public, anon;
grant execute on function public.consume_tutor_quota(date, text) to authenticated;
grant execute on function public.consume_tutor_query(date) to authenticated;
