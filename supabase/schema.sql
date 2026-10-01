-- GuaranIA / PyFis IA — esquema de Supabase para clases compartidas y chat.
-- Ejecutar en Supabase: SQL Editor → pegar todo → Run. Se puede volver a
-- ejecutar sobre una base que ya tenía la versión anterior (agrega columnas,
-- reemplaza funciones y políticas).
-- Requiere habilitar "Allow anonymous sign-ins" en Authentication → Sign In / Providers.
--
-- Modelo de seguridad (Row Level Security):
--   * Cada dispositivo inicia una sesión anónima; auth.uid() identifica a esa cuenta.
--   * El docente solo ve y modifica las clases que creó y el avance de SUS alumnos.
--   * El alumno solo puede unirse con un código válido, leer la clase a la que se
--     unió y actualizar SU propia fila de avance.
--   * Teléfono y correo solo los ven las personas de la MISMA clase (docente y
--     compañeros), a través de class_directory().
--   * Chat: los mensajes privados solo los leen sus dos participantes; los del
--     grupo, todos los de la clase. Solo el docente envía imágenes, clases y
--     actividades.

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  teacher_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  teacher_name text not null check (char_length(teacher_name) between 1 and 80),
  teacher_avatar text,
  title text not null default 'Mi clase' check (char_length(title) between 1 and 80),
  content jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.classes add column if not exists teacher_phone text check (char_length(teacher_phone) <= 24);
alter table public.classes add column if not exists teacher_email text check (char_length(teacher_email) <= 120);

create table if not exists public.class_members (
  class_id uuid not null references public.classes (id) on delete cascade,
  student_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 80),
  avatar text,
  xp integer not null default 0 check (xp >= 0),
  level integer not null default 1 check (level >= 1),
  attempts integer not null default 0 check (attempts >= 0),
  correct integer not null default 0 check (correct >= 0),
  confidence integer not null default 0 check (confidence between 0 and 100),
  cards_consolidated integer not null default 0 check (cards_consolidated >= 0),
  error_summary jsonb not null default '{}'::jsonb,
  last_sync timestamptz,
  joined_at timestamptz not null default now(),
  primary key (class_id, student_id),
  constraint class_members_error_summary_object check (
    jsonb_typeof(error_summary) = 'object'
    and pg_column_size(error_summary) <= 512
    and (error_summary - array['confunde_componentes', 'confunde_velocidades', 'olvida_gravedad', 'confunde_altura_alcance', 'angulo_desfasado']::text[]) = '{}'::jsonb
  )
);
-- Panel docente: ejercicios distintos resueltos y aciertos por tema
-- ({ "componentes": { "attempts": 4, "correct": 3 }, ... }). Los sube el alumno.
alter table public.class_members add column if not exists solved integer not null default 0 check (solved >= 0);
alter table public.class_members add column if not exists topic_stats jsonb not null default '{}'::jsonb
  check (jsonb_typeof(topic_stats) = 'object' and pg_column_size(topic_stats) <= 4000);
alter table public.class_members add column if not exists phone text check (char_length(phone) <= 24);
alter table public.class_members add column if not exists email text check (char_length(email) <= 120);
alter table public.class_members add column if not exists error_summary jsonb not null default '{}'::jsonb;
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'class_members_error_summary_object'
      and conrelid = 'public.class_members'::regclass
  ) then
    alter table public.class_members
      add constraint class_members_error_summary_object
      check (
        jsonb_typeof(error_summary) = 'object'
        and pg_column_size(error_summary) <= 512
        and (error_summary - array['confunde_componentes', 'confunde_velocidades', 'olvida_gravedad', 'confunde_altura_alcance', 'angulo_desfasado']::text[]) = '{}'::jsonb
      );
  end if;
end $$;

create table if not exists public.messages (
  id bigint generated always as identity primary key,
  class_id uuid not null references public.classes (id) on delete cascade,
  sender_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  recipient_id uuid references auth.users (id) on delete cascade, -- null = chat grupal
  kind text not null default 'text' check (kind in ('text', 'image', 'lesson', 'activity')),
  body text not null default '' check (char_length(body) <= 2000),
  payload jsonb,
  created_at timestamptz not null default now(),
  check (kind = 'text' or payload is not null),
  check (payload is null or pg_column_size(payload) <= 900000)
);
create index if not exists messages_class_id_idx on public.messages (class_id, id);

-- Reuniones de Google Meet que se comparten con todos los integrantes del grupo.
create table if not exists public.class_meetings (
  id bigint generated always as identity primary key,
  class_id uuid not null references public.classes (id) on delete cascade,
  creator_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 3 and 100),
  description text not null default '' check (char_length(description) <= 500),
  starts_at timestamptz not null,
  meet_url text not null check (meet_url ~ '^https://meet[.]google[.]com/[A-Za-z0-9-]{6,40}([?][^[:space:]]*)?(#[^[:space:]]*)?$'),
  created_at timestamptz not null default now()
);
create index if not exists class_meetings_class_start_idx on public.class_meetings (class_id, starts_at);

alter table public.classes enable row level security;
alter table public.class_members enable row level security;
alter table public.messages enable row level security;
alter table public.class_meetings enable row level security;

-- Permisos explícitos: así funciona aunque el proyecto se haya creado con
-- "Automatically expose new tables" desactivado. Quién ve o cambia cada fila
-- lo siguen decidiendo las políticas RLS de abajo.
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.classes, public.class_members, public.messages, public.class_meetings to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- Funciones auxiliares "security definer": consultan las tablas sin pasar por
-- RLS, así las políticas de classes y class_members no se llaman entre sí
-- (eso provocaba "infinite recursion detected in policy").
create or replace function public.is_class_teacher(p_class uuid, p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.classes c where c.id = p_class and c.teacher_id = p_user);
$$;

create or replace function public.is_class_participant(p_class uuid, p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.classes c where c.id = p_class and c.teacher_id = p_user)
      or exists (select 1 from public.class_members m where m.class_id = p_class and m.student_id = p_user);
$$;

drop policy if exists "docente ve sus clases" on public.classes;
create policy "docente ve sus clases" on public.classes
  for select using (teacher_id = auth.uid());

drop policy if exists "alumno ve la clase a la que se unió" on public.classes;
create policy "alumno ve la clase a la que se unió" on public.classes
  for select using (public.is_class_participant(id));

drop policy if exists "docente edita sus clases" on public.classes;
create policy "docente edita sus clases" on public.classes
  for update using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());

drop policy if exists "docente borra sus clases" on public.classes;
create policy "docente borra sus clases" on public.classes
  for delete using (teacher_id = auth.uid());

drop policy if exists "docente ve a sus alumnos" on public.class_members;
create policy "docente ve a sus alumnos" on public.class_members
  for select using (public.is_class_teacher(class_id));

drop policy if exists "alumno ve su avance" on public.class_members;
create policy "alumno ve su avance" on public.class_members
  for select using (student_id = auth.uid());

drop policy if exists "alumno actualiza su avance" on public.class_members;
create policy "alumno actualiza su avance" on public.class_members
  for update using (student_id = auth.uid()) with check (student_id = auth.uid());

drop policy if exists "alumno sale de la clase" on public.class_members;
create policy "alumno sale de la clase" on public.class_members
  for delete using (student_id = auth.uid());

drop policy if exists "leer mensajes de mi clase" on public.messages;
create policy "leer mensajes de mi clase" on public.messages
  for select using (
    public.is_class_participant(class_id)
    and (recipient_id is null or sender_id = auth.uid() or recipient_id = auth.uid())
  );

drop policy if exists "enviar mensajes en mi clase" on public.messages;
create policy "enviar mensajes en mi clase" on public.messages
  for insert with check (
    sender_id = auth.uid()
    and public.is_class_participant(class_id)
    and (recipient_id is null or (recipient_id <> auth.uid() and public.is_class_participant(class_id, recipient_id)))
    and (kind = 'text' or public.is_class_teacher(class_id))
  );

drop policy if exists "borrar mis mensajes" on public.messages;
create policy "borrar mis mensajes" on public.messages
  for delete using (sender_id = auth.uid() or public.is_class_teacher(class_id));

drop policy if exists "integrantes ven reuniones de su clase" on public.class_meetings;
create policy "integrantes ven reuniones de su clase" on public.class_meetings
  for select using (public.is_class_participant(class_id));

drop policy if exists "docente programa reuniones" on public.class_meetings;
create policy "docente programa reuniones" on public.class_meetings
  for insert with check (creator_id = auth.uid() and public.is_class_teacher(class_id));

drop policy if exists "docente edita reuniones" on public.class_meetings;
create policy "docente edita reuniones" on public.class_meetings
  for update using (public.is_class_teacher(class_id)) with check (creator_id = auth.uid() and public.is_class_teacher(class_id));

drop policy if exists "docente cancela reuniones" on public.class_meetings;
create policy "docente cancela reuniones" on public.class_meetings
  for delete using (public.is_class_teacher(class_id));

-- Crear una clase con un código corto y único (sin letras que se confunden: 0/O, 1/I).
drop function if exists public.create_class(text, text, text, jsonb);
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
  loop
    candidate := '';
    for i in 1..6 loop
      candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.classes c where c.code = candidate);
  end loop;
  insert into public.classes (code, teacher_id, teacher_name, teacher_avatar, teacher_phone, teacher_email, title, content)
  values (candidate, auth.uid(), left(p_teacher_name, 80), p_teacher_avatar, left(p_teacher_phone, 24), left(p_teacher_email, 120),
          coalesce(nullif(left(p_title, 80), ''), 'Mi clase'), p_content)
  returning classes.id into new_id;
  return query select new_id, candidate;
end $$;

-- Unirse con un código: devuelve el contenido de la clase para guardarlo sin conexión.
drop function if exists public.join_class(text, text, text);
create or replace function public.join_class(p_code text, p_display_name text, p_avatar text, p_phone text, p_email text)
returns table (class_id uuid, code text, title text, teacher_id uuid, teacher_name text, teacher_avatar text, teacher_phone text, teacher_email text, content jsonb)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  found public.classes;
begin
  if auth.uid() is null then raise exception 'Se necesita una sesión.'; end if;
  select * into found from public.classes c where c.code = upper(trim(p_code));
  if found.id is null then raise exception 'Código de clase inexistente.'; end if;
  insert into public.class_members (class_id, student_id, display_name, avatar, phone, email)
  values (found.id, auth.uid(), left(p_display_name, 80), p_avatar, left(p_phone, 24), left(p_email, 120))
  on conflict on constraint class_members_pkey do update
    set display_name = excluded.display_name, avatar = excluded.avatar, phone = excluded.phone, email = excluded.email;
  return query select found.id, found.code, found.title, found.teacher_id, found.teacher_name, found.teacher_avatar,
    found.teacher_phone, found.teacher_email, found.content;
end $$;

-- Personas de una clase con sus datos de contacto. Solo responde a quien es
-- parte de esa clase (docente o alumno); para cualquier otra persona, vacío.
create or replace function public.class_directory(p_class_id uuid)
returns table (user_id uuid, role text, display_name text, avatar text, phone text, email text)
language sql stable security definer set search_path = public as $$
  select c.teacher_id, 'maestro', c.teacher_name, c.teacher_avatar, c.teacher_phone, c.teacher_email
    from public.classes c
    where c.id = p_class_id and public.is_class_participant(p_class_id)
  union all
  select m.student_id, 'alumno', m.display_name, m.avatar, m.phone, m.email
    from public.class_members m
    where m.class_id = p_class_id and public.is_class_participant(p_class_id);
$$;

-- Cuando alguien cambia su nombre visible, foto o contactos en la app, se
-- actualizan todas sus clases (como docente y como alumno).
create or replace function public.sync_my_profile(p_display_name text, p_avatar text, p_phone text, p_email text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Se necesita una sesión.'; end if;
  update public.classes set teacher_name = left(p_display_name, 80), teacher_avatar = p_avatar,
    teacher_phone = left(p_phone, 24), teacher_email = left(p_email, 120), updated_at = now()
    where teacher_id = auth.uid();
  update public.class_members set display_name = left(p_display_name, 80), avatar = p_avatar,
    phone = left(p_phone, 24), email = left(p_email, 120)
    where student_id = auth.uid();
end $$;

revoke all on function public.create_class(text, text, text, text, text, jsonb) from public;
revoke all on function public.join_class(text, text, text, text, text) from public;
revoke all on function public.class_directory(uuid) from public;
revoke all on function public.sync_my_profile(text, text, text, text) from public;
grant execute on function public.create_class(text, text, text, text, text, jsonb) to authenticated;
grant execute on function public.join_class(text, text, text, text, text) to authenticated;
grant execute on function public.class_directory(uuid) to authenticated;
grant execute on function public.sync_my_profile(text, text, text, text) to authenticated;
grant execute on function public.is_class_teacher(uuid, uuid) to authenticated;
grant execute on function public.is_class_participant(uuid, uuid) to authenticated;

-- Contenido del docente (presentaciones y ejercicios propios): respaldo en la
-- nube, cada docente ve solo lo suyo. Igual que migrations/20260927_teacher_content.sql.
create table if not exists public.teacher_content (
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null check (kind in ('lesson', 'exercise', 'flags')),
  item_id text not null check (char_length(item_id) between 1 and 120),
  data jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object' and pg_column_size(data) <= 200000),
  deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (owner_id, kind, item_id)
);
alter table public.teacher_content enable row level security;
grant select, insert, update, delete on public.teacher_content to authenticated;
drop policy if exists teacher_content_owner on public.teacher_content;
create policy teacher_content_owner on public.teacher_content
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());
