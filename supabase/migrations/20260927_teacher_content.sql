-- Contenido creado por el docente (presentaciones de clase, ejercicios
-- propios y banderitas de temas). Antes quedaba solo en el dispositivo; ahora se respalda en
-- Supabase y se recupera al volver a entrar. Cada docente ve solo lo suyo.
-- Se puede ejecutar varias veces sin perder datos.

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
