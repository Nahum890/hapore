# Guía para ChatGPT Codex: poner en marcha la comunicación (Supabase)

Esta guía es para que un agente (ChatGPT Codex u otro) o una persona pueda
levantar PyFis IA con la nube activa, para que docentes y alumnos en distintos
dispositivos se comuniquen: clases compartidas, avance de alumnos, contactos y
chat (sección **Mensajes**).

## 1. Qué hay que entender primero

- La app es una PWA de **React + Vite**. No tiene servidor propio: la
  "comunicación" pasa por **Supabase** (Postgres + Auth), usando `fetch`
  directo, sin librerías extra. Código: `src/cloud/cloudClient.js`,
  `src/cloud/classCloud.js`, `src/cloud/chatCloud.js`.
- Sin Supabase configurado la app funciona igual, pero cada dispositivo queda
  aislado y la sección Mensajes muestra un aviso.
- La nube se activa con dos variables de entorno que Vite lee al arrancar:

  ```text
  VITE_SUPABASE_URL=...
  VITE_SUPABASE_ANON_KEY=...
  ```

- Todo el esquema (tablas, reglas de seguridad RLS y funciones) está en
  `supabase/schema.sql`. Más detalle en `supabase/README.md`.

Hay dos caminos:

| Camino | Para qué sirve | Necesita cuenta |
| --- | --- | --- |
| **A. Supabase simulado** (`supabase/mock-server.mjs`) | Probar rápido en la misma PC o en la red Wi-Fi | No |
| **B. Supabase real** | Uso de verdad: alumnos desde sus casas, datos que no se borran | Sí (gratis) |

## 2. Requisitos

- Node.js 20 o superior (`node -v`).
- Dependencias instaladas: `npm install` (una vez, en la raíz del repo).

## 3. Camino A: Supabase simulado (sin cuenta)

1. En una terminal, desde la raíz del repo:

   ```bash
   node supabase/mock-server.mjs
   ```

   Debe decir `supabase-mock listo en http://127.0.0.1:54321`. Dejarla abierta.

2. Crear el archivo `.env.development.local` en la raíz (está ignorado por
   git, no se sube) con:

   ```text
   VITE_SUPABASE_URL=http://127.0.0.1:54321
   VITE_SUPABASE_ANON_KEY=mock-anon-key
   ```

3. En otra terminal:

   ```bash
   npm run dev -- --host
   ```

4. Simular dos dispositivos en la misma PC: abrir **dos orígenes distintos**,
   porque cada origen tiene su propio almacenamiento:
   - Docente: `http://localhost:5173`
   - Alumno: `http://127.0.0.1:5173`

   (Si Vite eligió otro puerto, usar el que muestra la terminal.)

5. Probar desde un celular en la **misma red Wi-Fi**: buscar la IP de la PC
   (`ipconfig` en Windows → "Dirección IPv4", por ejemplo `192.168.0.20`),
   cambiar en `.env.development.local` la URL a
   `http://192.168.0.20:54321`, reiniciar `npm run dev -- --host` y abrir
   `http://192.168.0.20:5173` en el celular. Si Windows pregunta por el
   firewall, permitir Node.js en redes privadas.

Limitaciones: los datos viven en memoria y se pierden al cerrar el mock. Solo
sirve para probar.

## 4. Camino B: Supabase real

Estos pasos los tiene que hacer **una persona** (requieren iniciar sesión en
supabase.com). El agente no debe crear cuentas ni escribir contraseñas.

1. Crear un proyecto gratuito en <https://supabase.com>.
2. **Authentication → Sign In / Providers** → activar **Allow anonymous
   sign-ins**.
3. **SQL Editor** → pegar todo `supabase/schema.sql` → **Run**. Se puede volver
   a ejecutar sin perder datos (hay que hacerlo cada vez que cambie el archivo).
4. **Project Settings → API** → copiar **Project URL** y la clave
   **anon public**.
5. Crear `.env` en la raíz del repo (ya está en `.gitignore`):

   ```text
   VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
   VITE_SUPABASE_ANON_KEY=tu-clave-anon-public
   ```

   Nunca usar la clave `service_role`. Nunca subir `.env` al repo.

6. Si existe `.env.development.local` del camino A, borrarlo o vaciarlo (tiene
   prioridad sobre `.env` en modo desarrollo).
7. Probar local: `npm run dev -- --host`.
8. Publicar para que funcione desde cualquier lugar: `npm run build` genera
   `dist/`. En el hosting (Vercel, Netlify, etc.) cargar las mismas dos
   variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en la
   configuración del proyecto **antes** de compilar, porque Vite las incrusta
   en el build.

## 5. Cómo verificar que la comunicación funciona

1. Cuenta **Maestro** (dispositivo 1): Aula → Compartir clase → poner nombre →
   **Crear clase y código**. Anotar el código de 6 letras.
2. Cuenta **Alumno** (dispositivo 2): Aula / Mi clase → escribir el código →
   **Descargar clase**. Debe aparecer el docente con su teléfono y correo.
3. Alumno: **Mensajes** → Chat grupal y chat privado con el docente.
4. Maestro: **Mensajes** → responder; probar **Imagen**, **Enviar clase**
   (necesita una clase en Aula → Mis clases) y **Enviar actividad**.
5. Alumno: tocar **Resolver actividad**, contestar bien. En el docente, Aula →
   Compartir clase → **Actualizar**: debe verse el XP del alumno.

El chat se actualiza solo cada 4 segundos.

## 6. Problemas comunes

| Síntoma | Causa probable | Solución |
| --- | --- | --- |
| Mensajes dice "El chat necesita la nube configurada" | Faltan las variables o no se reinició Vite | Revisar el archivo `.env*` y reiniciar `npm run dev` |
| "No se pudo conectar con la nube" | Mock apagado, URL mal escrita o firewall | Verificar que el mock/proyecto responda en esa URL |
| `Anonymous sign-ins are disabled` | Falta el paso B.2 | Activarlo en Supabase |
| `function ... does not exist` o `column ... does not exist` | Esquema viejo | Volver a ejecutar `supabase/schema.sql` |
| `infinite recursion detected in policy` | Esquema anterior a la corrección | Volver a ejecutar `supabase/schema.sql` |
| El alumno no aparece en la lista del docente | Cada navegador tiene su propia identidad en la nube | El alumno debe tocar **Descargar clase** en su dispositivo; el docente debe usar el mismo navegador donde creó la clase |
| En el mismo navegador las dos cuentas se "ven" iguales | Mismo origen = mismo almacenamiento | Usar `localhost` y `127.0.0.1`, o navegadores distintos |

## 7. Reglas para el agente

- No modificar `.env`, claves ni secretos; no pegar claves en commits, código ni chat.
- No cambiar `package.json`, `package-lock.json`, `vite.config.js` ni
  agregar dependencias sin autorización.
- No crear cuentas ni iniciar sesión en Supabase por la persona.
- Antes de entregar: `npm test` y `npm run build` deben pasar.
- Commits por área con archivos revisados (sin `git add .` / `git add -A`);
  no publicar ni fusionar en `main` sin que la persona lo pida.
