# Clases en la nube (Supabase)

Sin esta configuración la app funciona igual, pero todo queda en cada dispositivo: el docente no ve a alumnos que usan otro navegador o teléfono.

Con Supabase:

- El docente crea una clase con un código de 6 caracteres. Elige las situaciones, las tarjetas que va a compartir (incluidas las que creó) y sus ejercicios propios.
- El alumno escribe el código y toca **Descargar clase**. Necesita internet solo esa vez; después resuelve y repasa sin conexión.
- El avance del alumno (XP, nivel, ejercicios correctos, tarjetas dominadas, confianza) se guarda en su dispositivo y se sube solo cuando hay internet.
- El docente ve la lista de sus alumnos con su avance en **Aula → Compartir clase → Tus clases y alumnos**.

## Configuración (una sola vez, unos 5 minutos)

1. Creá un proyecto gratuito en <https://supabase.com>.
2. En **Authentication → Sign In / Providers**, activá **Allow anonymous sign-ins**.
3. En **SQL Editor**, pegá todo el contenido de [`schema.sql`](schema.sql) y tocá **Run**.
4. En **Project Settings → API**, copiá **Project URL** y la clave **anon public**.
5. En la raíz del proyecto, creá o completá el archivo `.env` con:

   ```text
   VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
   VITE_SUPABASE_ANON_KEY=tu-clave-anon-public
   ```

6. Reiniciá `npm run dev` (o volvé a compilar con `npm run build`).

La clave **anon public** está pensada para ir en el navegador: la seguridad la dan las reglas de acceso (Row Level Security) de `schema.sql`. No pongas nunca la clave `service_role` en `.env`.

## Qué protege el esquema

- Cada dispositivo abre una sesión anónima propia.
- Un docente solo ve y borra sus clases y el avance de los alumnos que se unieron a ellas.
- Un alumno solo puede unirse con un código válido, leer su clase y actualizar su propia fila de avance.
- No se suben teléfono ni correo: solo el nombre visible, el avatar y los números de avance.

## Limitaciones conocidas

- La identidad en la nube queda ligada al navegador. Si un docente abre la app en otro navegador, no ve las clases creadas en el primero; hoy no hay inicio de sesión por correo.
- Los números de avance los envía el navegador del alumno. Sirven para acompañar al grupo, no como evaluación con validez oficial.
- Los códigos locales anteriores (`GP…`) siguen funcionando, pero solo dentro del mismo dispositivo.
