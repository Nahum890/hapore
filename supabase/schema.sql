-- GuaranIA / PyFis IA — esquema de Supabase para clases compartidas.
-- Ejecutar una vez en Supabase: SQL Editor → pegar todo → Run.
-- Requiere habilitar "Allow anonymous sign-ins" en Authentication → Sign In / Providers.
--
-- Modelo de seguridad (Row Level Security):
--   * Cada dispositivo inicia una sesión anónima; auth.uid() identifica a esa cuenta.
--   * El docente solo ve y modifica las clases que creó y el avance de SUS alumnos.
--   * El alumno solo puede unirse con un código válido, leer la clase a la que se
--     unió y actualizar SU propia fila de avance.
--   * No se suben teléfono ni correo: solo nombre visible, avatar y números de avance.

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
  last_sync timestamptz,
  joined_at timestamptz not null default now(),
  primary key (class_id, student_id)
);

alter table public.classes enable row level security;
alter table public.class_members enable row level security;

drop policy if exists "docente ve sus clases" on public.classes;
create policy "docente ve sus clases" on public.classes
  for select using (teacher_id = auth.uid());

drop policy if exists "alumno ve la clase a la que se unió" on public.classes;
create policy "alumno ve la clase a la que se unió" on public.classes
  for select using (exists (
    select 1 from public.class_members m where m.class_id = classes.id and m.student_id = auth.uid()
  ));

drop policy if exists "docente edita sus clases" on public.classes;
create policy "docente edita sus clases" on public.classes
  for update using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());

drop policy if exists "docente borra sus clases" on public.classes;
create policy "docente borra sus clases" on public.classes
  for delete using (teacher_id = auth.uid());

drop policy if exists "docente ve a sus alumnos" on public.class_members;
create policy "docente ve a sus alumnos" on public.class_members
  for select using (exists (
    select 1 from public.classes c where c.id = class_members.class_id and c.teacher_id = auth.uid()
  ));

drop policy if exists "alumno ve su avance" on public.class_members;
create policy "alumno ve su avance" on public.class_members
  for select using (student_id = auth.uid());

drop policy if exists "alumno actualiza su avance" on public.class_members;
create policy "alumno actualiza su avance" on public.class_members
  for update using (student_id = auth.uid()) with check (student_id = auth.uid());

drop policy if exists "alumno sale de la clase" on public.class_members;
create policy "alumno sale de la clase" on public.class_members
  for delete using (student_id = auth.uid());

-- Crear una clase con un código corto y único (sin letras que se confunden: 0/O, 1/I).
create or replace function public.create_class(p_title text, p_teacher_name text, p_teacher_avatar text, p_content jsonb)
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
  insert into public.classes (code, teacher_id, teacher_name, teacher_avatar, title, content)
  values (candidate, auth.uid(), left(p_teacher_name, 80), p_teacher_avatar, coalesce(nullif(left(p_title, 80), ''), 'Mi clase'), p_content)
  returning classes.id into new_id;
  return query select new_id, candidate;
end $$;

-- Unirse con un código: devuelve el contenido de la clase para guardarlo sin conexión.
create or replace function public.join_class(p_code text, p_display_name text, p_avatar text)
returns table (class_id uuid, code text, title text, teacher_name text, teacher_avatar text, content jsonb)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  found public.classes;
begin
  if auth.uid() is null then raise exception 'Se necesita una sesión.'; end if;
  select * into found from public.classes c where c.code = upper(trim(p_code));
  if found.id is null then raise exception 'Código de clase inexistente.'; end if;
  insert into public.class_members (class_id, student_id, display_name, avatar)
  values (found.id, auth.uid(), left(p_display_name, 80), p_avatar)
  on conflict on constraint class_members_pkey do update set display_name = excluded.display_name, avatar = excluded.avatar;
  return query select found.id, found.code, found.title, found.teacher_name, found.teacher_avatar, found.content;
end $$;

revoke all on function public.create_class(text, text, text, jsonb) from public;
revoke all on function public.join_class(text, text, text) from public;
grant execute on function public.create_class(text, text, text, jsonb) to authenticated;
grant execute on function public.join_class(text, text, text) to authenticated;
