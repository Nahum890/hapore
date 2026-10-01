-- Compartir reuniones Meet con los integrantes de cada grupo.
-- Requiere que schema.sql ya haya creado is_class_teacher/is_class_participant.
create table if not exists public.class_meetings (
  id bigint generated always as identity primary key,
  class_id uuid not null references public.classes(id) on delete cascade,
  creator_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 100),
  description text not null default '' check (char_length(description) <= 500),
  starts_at timestamptz not null,
  meet_url text not null check (meet_url ~ '^https://meet[.]google[.]com/[A-Za-z0-9-]{6,40}([?][^[:space:]]*)?(#[^[:space:]]*)?$'),
  created_at timestamptz not null default now()
);

create index if not exists class_meetings_class_start_idx
  on public.class_meetings (class_id, starts_at);

alter table public.class_meetings enable row level security;
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.class_meetings to authenticated;
grant usage, select on sequence public.class_meetings_id_seq to authenticated;

drop policy if exists "integrantes ven reuniones de su clase" on public.class_meetings;
create policy "integrantes ven reuniones de su clase" on public.class_meetings
  for select using (public.is_class_participant(class_id));

drop policy if exists "docente programa reuniones" on public.class_meetings;
create policy "docente programa reuniones" on public.class_meetings
  for insert with check (creator_id = auth.uid() and public.is_class_teacher(class_id));

drop policy if exists "docente edita reuniones" on public.class_meetings;
create policy "docente edita reuniones" on public.class_meetings
  for update using (public.is_class_teacher(class_id))
  with check (creator_id = auth.uid() and public.is_class_teacher(class_id));

drop policy if exists "docente cancela reuniones" on public.class_meetings;
create policy "docente cancela reuniones" on public.class_meetings
  for delete using (public.is_class_teacher(class_id));
