-- Privacidad de contactos (2026-11-16): el teléfono y el correo de un alumno
-- solo los ve el docente de la clase (y el propio alumno). Los compañeros ven
-- nombre y foto, sin datos de contacto. Los del docente los ve toda la clase.
-- Se puede volver a ejecutar.
create or replace function public.class_directory(p_class_id uuid)
returns table (user_id uuid, role text, display_name text, avatar text, phone text, email text)
language sql stable security definer set search_path = public as $$
  select c.teacher_id, 'maestro', c.teacher_name, c.teacher_avatar, c.teacher_phone, c.teacher_email
    from public.classes c
    where c.id = p_class_id and public.is_class_participant(p_class_id)
  union all
  select m.student_id, 'alumno', m.display_name, m.avatar,
         case when public.is_class_teacher(p_class_id) or m.student_id = auth.uid() then m.phone end,
         case when public.is_class_teacher(p_class_id) or m.student_id = auth.uid() then m.email end
    from public.class_members m
    where m.class_id = p_class_id and public.is_class_participant(p_class_id);
$$;

revoke all on function public.class_directory(uuid) from public, anon;
grant execute on function public.class_directory(uuid) to authenticated;
