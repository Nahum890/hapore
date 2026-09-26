-- Store only counts of predefined exercise-error categories so teachers can
-- plan class-wide reinforcement activities without ranking individual pupils.
alter table public.class_members
  add column if not exists error_summary jsonb not null default '{}'::jsonb;

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
