-- PyFis IA — endurecimiento de seguridad (auditoría del 26/10/2026).
-- Ejecutar DESPUÉS de schema.sql (y de las migraciones anteriores). Se puede
-- volver a ejecutar: no borra datos. schema.sql ya incluye este mismo bloque
-- al final, así que en una base nueva alcanza con ejecutar schema.sql.
--
-- Qué corrige:
--   1. El rol anónimo de PostgREST (clave pública sin sesión) no toca ninguna tabla.
--   2. Un alumno ya no puede cambiar class_id, nombre ni contactos de su fila con
--      un PATCH directo (antes podía moverse a otra clase sin código). Solo el
--      avance; nombre, foto y contactos pasan por sync_my_profile().
--   3. Nadie puede falsificar sender_id/creator_id/created_at al insertar.
--   4. Fotos de perfil e imágenes del chat: solo data URL JPEG/PNG/WebP. Antes un
--      "docente" malicioso podía mandar payload.dataUrl = 'javascript:…' (XSS al
--      tocar la imagen) o un enlace externo de rastreo.
--   5. Fuerza bruta de códigos de clase: máximo 8 códigos equivocados cada 15 min
--      por usuario (los intentos se guardan aunque la consulta "falle").
--   6. Límites anti-abuso: tamaño del contenido de clase, clases por docente,
--      mensajes por minuto y filas de respaldo por docente. Los tamaños se miden
--      sobre el texto (pg_column_size mide comprimido: 10 MB repetitivos pasaban).
--   7. is_class_teacher / is_class_participant ya no sirven de "oráculo": antes
--      cualquier sesión podía preguntar si un usuario X estaba en una clase Y.
--   8. Mensajes de texto sin payload, y error_summary solo con números.

-- 1. Sin acceso para la clave pública sin sesión ------------------------------
revoke all on public.classes, public.class_members, public.messages, public.class_meetings, public.teacher_content from anon;
do $$
begin
  if to_regclass('public.tutor_daily_usage') is not null then
    execute 'revoke all on public.tutor_daily_usage from anon, authenticated';
  end if;
end $$;

-- 2 y 3. Columnas que cada sesión puede escribir directamente ----------------
revoke update on public.class_members from authenticated;
grant update (xp, level, attempts, correct, confidence, cards_consolidated, error_summary, solved, topic_stats, last_sync)
  on public.class_members to authenticated;
revoke insert on public.class_members from authenticated; -- unirse solo con join_class()

revoke update on public.classes from authenticated;
grant update (title, content, updated_at) on public.classes to authenticated;
revoke insert on public.classes from authenticated; -- crear solo con create_class()

revoke insert, update on public.messages from authenticated;
grant insert (class_id, recipient_id, kind, body, payload) on public.messages to authenticated;

revoke insert on public.class_meetings from authenticated;
grant insert (class_id, title, description, starts_at, meet_url) on public.class_meetings to authenticated;

-- 4. Validación de fotos, contactos e imágenes --------------------------------
create or replace function public.is_valid_avatar(p text)
returns boolean language sql immutable as $$
  select p is null
      or p in ('sol', 'rio', 'selva', 'tierra', 'cielo', 'yaguarete', 'guacamayo', 'tatu', 'cohete', 'atomo', 'pelota', 'dron')
      or (char_length(p) <= 200000 and p ~ '^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$');
$$;

create or replace function public.is_valid_contact_phone(p text)
returns boolean language sql immutable as $$
  select p is null or p ~ '^[+]?[0-9 ().-]{0,24}$';
$$;

create or replace function public.is_valid_contact_email(p text)
returns boolean language sql immutable as $$
  select p is null or p = '' or (char_length(p) <= 120 and p ~ '^[^[:space:]@<>"''`]+@[^[:space:]@<>"''`]+[.][^[:space:]@<>"''`]{2,}$');
$$;

-- error_summary: {categoría: número entre 0 y 100}. Antes aceptaba objetos o texto.
create or replace function public.is_valid_error_summary(p jsonb)
returns boolean language sql immutable as $$
  select p is null or (jsonb_typeof(p) = 'object' and coalesce((
    select bool_and(jsonb_typeof(e.value) = 'number' and (e.value::text)::numeric between 0 and 100)
    from jsonb_each(p) e
  ), true));
$$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'classes_teacher_avatar_valid') then
    alter table public.classes add constraint classes_teacher_avatar_valid check (public.is_valid_avatar(teacher_avatar)) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'classes_teacher_contact_valid') then
    alter table public.classes add constraint classes_teacher_contact_valid
      check (public.is_valid_contact_phone(teacher_phone) and public.is_valid_contact_email(teacher_email)) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'classes_content_size') then
    alter table public.classes add constraint classes_content_size
      check (jsonb_typeof(content) = 'object' and octet_length(content::text) <= 1000000) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'class_members_avatar_valid') then
    alter table public.class_members add constraint class_members_avatar_valid check (public.is_valid_avatar(avatar)) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'class_members_contact_valid') then
    alter table public.class_members add constraint class_members_contact_valid
      check (public.is_valid_contact_phone(phone) and public.is_valid_contact_email(email)) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'class_members_progress_bounds') then
    alter table public.class_members add constraint class_members_progress_bounds
      check (xp <= 10000000 and level <= 10000 and attempts <= 1000000 and correct <= 1000000
             and cards_consolidated <= 100000 and solved <= 100000) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'messages_text_without_payload') then
    alter table public.messages add constraint messages_text_without_payload check (kind <> 'text' or payload is null) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'messages_payload_size') then
    alter table public.messages add constraint messages_payload_size check (payload is null or octet_length(payload::text) <= 900000) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'class_members_error_summary_numbers') then
    alter table public.class_members add constraint class_members_error_summary_numbers check (public.is_valid_error_summary(error_summary)) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'class_members_topic_stats_size') then
    alter table public.class_members add constraint class_members_topic_stats_size check (octet_length(topic_stats::text) <= 8000) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'messages_image_payload_valid') then
    alter table public.messages add constraint messages_image_payload_valid check (
      kind <> 'image' or (
        jsonb_typeof(payload -> 'dataUrl') = 'string'
        and (payload ->> 'dataUrl') ~ '^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$'
      )
    ) not valid;
  end if;
end $$;

-- 5. Unirse con código: límite de intentos equivocados ------------------------
create table if not exists public.class_join_attempts (
  user_id uuid not null references auth.users (id) on delete cascade,
  attempted_at timestamptz not null default now()
);
create index if not exists class_join_attempts_user_idx on public.class_join_attempts (user_id, attempted_at);
alter table public.class_join_attempts enable row level security;
revoke all on public.class_join_attempts from anon, authenticated;

create or replace function public.join_class(p_code text, p_display_name text, p_avatar text, p_phone text, p_email text)
returns table (class_id uuid, code text, title text, teacher_id uuid, teacher_name text, teacher_avatar text, teacher_phone text, teacher_email text, content jsonb)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  found public.classes;
  recent_failures integer;
begin
  if auth.uid() is null then raise exception 'Se necesita una sesión.'; end if;
  select count(*) into recent_failures from public.class_join_attempts a
    where a.user_id = auth.uid() and a.attempted_at > now() - interval '15 minutes';
  if recent_failures >= 8 then
    raise exception 'Demasiados códigos incorrectos. Esperá 15 minutos y volvé a intentar.';
  end if;
  select * into found from public.classes c where c.code = upper(trim(coalesce(p_code, '')));
  if found.id is null then
    -- Sin "raise": así el intento queda guardado. El cliente recibe 0 filas y
    -- muestra "Código de clase inexistente.".
    insert into public.class_join_attempts (user_id) values (auth.uid());
    delete from public.class_join_attempts a where a.attempted_at < now() - interval '1 day';
    return;
  end if;
  insert into public.class_members (class_id, student_id, display_name, avatar, phone, email)
  values (found.id, auth.uid(), left(p_display_name, 80), p_avatar, left(p_phone, 24), left(p_email, 120))
  on conflict on constraint class_members_pkey do update
    set display_name = excluded.display_name, avatar = excluded.avatar, phone = excluded.phone, email = excluded.email;
  return query select found.id, found.code, found.title, found.teacher_id, found.teacher_name, found.teacher_avatar,
    found.teacher_phone, found.teacher_email, found.content;
end $$;

-- 6. Límites anti-abuso --------------------------------------------------------
create or replace function public.create_class(p_title text, p_teacher_name text, p_teacher_avatar text, p_teacher_phone text, p_teacher_email text, p_content jsonb)
returns table (id uuid, code text)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  candidate text;
  new_id uuid;
begin
  if auth.uid() is null then raise exception 'Se necesita una sesión.'; end if;
  if p_content is null or jsonb_typeof(p_content) <> 'object' or octet_length(p_content::text) > 1000000 then
    raise exception 'El contenido de la clase es demasiado grande.';
  end if;
  if (select count(*) from public.classes c where c.teacher_id = auth.uid()) >= 40 then
    raise exception 'Llegaste al máximo de 40 clases. Borrá alguna antes de crear otra.';
  end if;
  loop
    candidate := '';
    for i in 1..6 loop
      -- gen_random_uuid() usa el generador criptográfico de PostgreSQL
      -- (random() es predecible). 256 es múltiplo de 32: sin sesgo.
      candidate := candidate || substr(alphabet, 1 + (get_byte(uuid_send(gen_random_uuid()), 0) % length(alphabet)), 1);
    end loop;
    exit when not exists (select 1 from public.classes c where c.code = candidate);
  end loop;
  insert into public.classes (code, teacher_id, teacher_name, teacher_avatar, teacher_phone, teacher_email, title, content)
  values (candidate, auth.uid(), left(p_teacher_name, 80), p_teacher_avatar, left(p_teacher_phone, 24), left(p_teacher_email, 120),
          coalesce(nullif(left(p_title, 80), ''), 'Mi clase'), p_content)
  returning classes.id into new_id;
  return query select new_id, candidate;
end $$;

create index if not exists messages_sender_created_idx on public.messages (sender_id, created_at);
create or replace function public.messages_rate_limit()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.messages m where m.sender_id = new.sender_id and m.created_at > now() - interval '1 minute') >= 20 then
    raise exception 'Estás enviando mensajes muy rápido. Esperá un momento.';
  end if;
  return new;
end $$;
drop trigger if exists messages_rate_limit on public.messages;
create trigger messages_rate_limit before insert on public.messages
  for each row execute function public.messages_rate_limit();

create or replace function public.teacher_content_limit()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.teacher_content t where t.owner_id = new.owner_id and t.kind = new.kind and t.item_id = new.item_id)
     and (select count(*) from public.teacher_content t where t.owner_id = new.owner_id) >= 600 then
    raise exception 'Llegaste al límite de contenido guardado en la nube.';
  end if;
  return new;
end $$;
drop trigger if exists teacher_content_limit on public.teacher_content;
create trigger teacher_content_limit before insert on public.teacher_content
  for each row execute function public.teacher_content_limit();

-- 7. Sin oráculo de membresía ---------------------------------------------------
-- Las políticas las llaman con p_user = auth.uid() o, para el destinatario de
-- un mensaje, después de comprobar que quien envía es de la clase. Ahora solo
-- responden "true" si quien pregunta es el propio usuario o es parte de esa
-- clase; un extraño no puede averiguar quién está en qué clase.
create or replace function public.is_class_teacher(p_class uuid, p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() is not null
    and (p_user = auth.uid()
         or exists (select 1 from public.classes c where c.id = p_class and c.teacher_id = auth.uid())
         or exists (select 1 from public.class_members m where m.class_id = p_class and m.student_id = auth.uid()))
    and exists (select 1 from public.classes c where c.id = p_class and c.teacher_id = p_user);
$$;

create or replace function public.is_class_participant(p_class uuid, p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() is not null
    and (p_user = auth.uid()
         or exists (select 1 from public.classes c where c.id = p_class and c.teacher_id = auth.uid())
         or exists (select 1 from public.class_members m where m.class_id = p_class and m.student_id = auth.uid()))
    and (exists (select 1 from public.classes c where c.id = p_class and c.teacher_id = p_user)
         or exists (select 1 from public.class_members m where m.class_id = p_class and m.student_id = p_user));
$$;

-- Las funciones nuevas o reemplazadas: solo para sesiones autenticadas.
revoke all on function public.join_class(text, text, text, text, text) from public, anon;
revoke all on function public.create_class(text, text, text, text, text, jsonb) from public, anon;
revoke all on function public.class_directory(uuid) from public, anon;
revoke all on function public.sync_my_profile(text, text, text, text) from public, anon;
revoke all on function public.is_class_teacher(uuid, uuid) from public, anon;
revoke all on function public.is_class_participant(uuid, uuid) from public, anon;
revoke all on function public.messages_rate_limit() from public, anon, authenticated;
revoke all on function public.teacher_content_limit() from public, anon, authenticated;
grant execute on function public.join_class(text, text, text, text, text) to authenticated;
grant execute on function public.create_class(text, text, text, text, text, jsonb) to authenticated;
grant execute on function public.class_directory(uuid) to authenticated;
grant execute on function public.sync_my_profile(text, text, text, text) to authenticated;
grant execute on function public.is_class_teacher(uuid, uuid) to authenticated;
grant execute on function public.is_class_participant(uuid, uuid) to authenticated;
