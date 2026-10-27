# Clases en la nube (Supabase)

Sin esta configuración la app funciona igual, pero todo queda en cada dispositivo: las cuentas solo existen en el navegador donde se crearon (en otro teléfono "no existen") y el docente no ve a alumnos que usan otro navegador o teléfono.

Con Supabase:

- **Cuentas en la nube**: el usuario y la contraseña sirven en cualquier dispositivo. El nombre de usuario es único entre todos los dispositivos. Una contraseña cambiada en un dispositivo deja de valer en los demás. Para poder entrar sin internet, cada dispositivo guarda una copia local (solo el hash PBKDF2 de la clave).

- El docente crea una clase con un código de 6 caracteres. Elige las situaciones, las tarjetas que va a compartir (incluidas las que creó) y sus ejercicios propios.
- El alumno escribe el código y toca **Descargar clase**. Necesita internet solo esa vez; después resuelve y repasa sin conexión.
- El avance del alumno (XP, nivel, ejercicios correctos, tarjetas dominadas, confianza) se guarda en su dispositivo y se sube solo cuando hay internet.
- El docente ve la lista de sus alumnos con su avance y sus datos de contacto en **Aula → Compartir clase → Tus clases y alumnos**. El alumno ve el teléfono y el correo de su docente en **Mi clase**.
- **Mensajes**: chat grupal de la clase y chats privados alumno ↔ docente y alumno ↔ alumno de la misma clase. El docente además puede enviar imágenes, clases de «Mis clases» (el alumno toca **Abrir clase**) y actividades (el alumno toca **Resolver actividad** y el resultado suma a su avance). Los últimos mensajes quedan guardados para leerlos sin conexión; para enviar hace falta internet.
- **Reuniones**: en **Aula → Programar reunión**, el docente elige un grupo, fecha y hora, y pega un enlace creado en Google Meet. Cada integrante lo ve en el icono de avisos junto a los ajustes.

## Configuración (una sola vez, unos 10 minutos)

1. Creá un proyecto gratuito en <https://supabase.com>. (Un proyecto gratuito sin uso se pausa y, si no se reactiva, se borra: si la app muestra "No se pudo conectar con la nube", revisá que el proyecto siga existiendo.)
2. En **Authentication → Sign In / Providers**:
   - activá **Email** y **desactivá "Confirm email"**. Las cuentas usan un correo interno `usuario@cuentas.pyfis.invalid` (dominio reservado que nadie puede registrar); con la confirmación activada Supabase no deja entrar.
   - activá **Allow anonymous sign-ins** (lo usan las cuentas creadas sin internet hasta que se suben a la nube).
   - en **Password**, poné la longitud mínima en **8**.
   - en **Rate Limits**, subí "sign-ups and sign-ins" (por ejemplo a 150 cada 5 minutos): Supabase cuenta por dirección IP y un aula entera sale a internet con la misma IP. Si igual se alcanza el límite, una cuenta que ya entró antes en ese dispositivo sigue entrando con su copia local.
3. En **SQL Editor**, ejecutá en este orden (cada uno: pegar todo y **Run**; se pueden volver a ejecutar sin borrar datos):
   1. [`schema.sql`](schema.sql) — tablas, reglas de acceso y el endurecimiento de seguridad.
   2. [`migrations/20260926_tutor_daily_quota.sql`](migrations/20260926_tutor_daily_quota.sql) — cuota diaria del tutor online.
   3. [`migrations/20261026_tutor_quota_fix.sql`](migrations/20261026_tutor_quota_fix.sql) — corrige la cuota (antes nunca bloqueaba) y agrega la cuota de ayudas.

   En una base que ya existía, después de `schema.sql` también se pueden ejecutar las migraciones anteriores (`20260926_class_error_summary.sql`, `20260927_class_meetings.sql`, `20260927_teacher_content.sql`) y por último [`migrations/20261026_security_hardening.sql`](migrations/20261026_security_hardening.sql).
4. En **Project Settings → API**, copiá **Project URL** y la clave pública (**publishable** o **anon public**).
5. En la raíz del proyecto, creá o completá el archivo `.env` con:

   ```text
   VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
   VITE_SUPABASE_ANON_KEY=tu-clave-publica
   ```

   En **Vercel → Settings → Environment Variables** cargá esas dos y además `SUPABASE_URL`, `SUPABASE_ANON_KEY` (mismos valores, para el límite diario de `/api/chat`) y `GEMINI_API_KEY`. Después hacé **Redeploy**: las variables `VITE_*` quedan dentro del build.
6. Reiniciá `npm run dev` (o volvé a compilar con `npm run build`).

Opcional: `VITE_ACCOUNT_EMAIL_DOMAIN` cambia el dominio de los correos internos. Usá solo un dominio que controle el equipo (o uno `.invalid`): quien reciba correo en ese dominio podría recuperar contraseñas ajenas.

La clave **anon public** está pensada para ir en el navegador: la seguridad la dan las reglas de acceso (Row Level Security) de `schema.sql`. No pongas nunca la clave `service_role` en `.env`.

## Qué protege el esquema

- Cada cuenta en la nube tiene su propia identidad (la misma en todos sus dispositivos); las cuentas que todavía son solo locales usan una sesión anónima propia.
- La clave pública sin sesión no puede leer ni escribir ninguna tabla.
- Un docente solo ve y borra sus clases y el avance de los alumnos que se unieron a ellas.
- Un alumno solo puede unirse con un código válido, leer su clase y actualizar los números de su propia fila de avance (no puede cambiarse de clase ni cambiar su nombre o contactos con un pedido directo).
- Máximo 8 códigos de clase equivocados cada 15 minutos por usuario (contra la fuerza bruta de códigos).
- Fotos de perfil e imágenes del chat: solo imágenes JPEG/PNG/WebP chicas guardadas como data URL (nunca enlaces externos ni `javascript:`).
- Límites contra el abuso: 40 clases por docente, contenido de clase de hasta 1 MB, 20 mensajes por minuto, 600 elementos de respaldo por docente.
- Tutor online: 15 consultas de chat libre por día y 80 ayudas (pistas y evaluaciones) por día y por cuenta.
- Teléfono y correo (obligatorios al crear la cuenta) solo los ven las personas de la misma clase: el docente y los compañeros, a través de `class_directory`.
- Un mensaje privado solo lo pueden leer sus dos participantes; los del chat grupal, todos los de la clase. Solo el docente puede enviar imágenes, clases y actividades.
- Las fotos de perfil y las imágenes del chat se achican en el navegador antes de subirse (no se guarda el archivo original).

## Limitaciones conocidas

- El progreso del alumno (XP, intentos, tarjetas) sigue guardándose en cada dispositivo; lo que viaja entre dispositivos es la cuenta y, con una clase, el resumen de avance que ve el docente.
- Cualquier persona puede crear una cuenta de docente: no hay verificación de que sea docente de verdad.
- Los números de avance los envía el navegador del alumno. Sirven para acompañar al grupo, no como evaluación con validez oficial.
- Los códigos locales anteriores (`GP…`) siguen funcionando, pero solo dentro del mismo dispositivo.
- El chat consulta mensajes nuevos cada 4 segundos mientras la pantalla está abierta (no usa Realtime). Para un curso alcanza; para miles de usuarios convendría pasar a Supabase Realtime.
- Los avisos de mensajes y reuniones se actualizan cada 45 segundos y al abrir el panel. No son notificaciones push del sistema operativo.
- PyFis comparte el enlace que el docente pega; el enlace de Google Meet se crea previamente en Google Meet.
- Las imágenes del chat se guardan dentro de la base, como texto. Si se envían muchas, convendría usar Supabase Storage.
