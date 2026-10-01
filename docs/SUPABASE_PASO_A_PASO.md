# Configurar Supabase para PyFis IA — paso a paso

Tiempo: unos 15 minutos. Costo: gratis (plan Free).
Al terminar, los teléfonos comparten clases, alumnos, resultados, contactos y chat.

---

## Paso 1 — Crear la cuenta y el proyecto

1. Entrá a <https://supabase.com> y tocá **Start your project**.
2. Iniciá sesión con GitHub o con correo.
3. Si te pide crear una organización, poné cualquier nombre (por ejemplo `PyFis`). Plan: **Free**.
4. Tocá **New project** y completá:

   | Campo | Qué poner |
   | --- | --- |
   | Project name | `pyfis-ia` |
   | Database Password | Tocá **Generate a password** y **guardala** (no la necesita la app, pero no se recupera fácil). |
   | Region | **South America (São Paulo)**: es la más cercana a Paraguay y responde más rápido. |
   | Enable Data API | **Dejalo activado**: la app lo usa. |
   | Automatic RLS / seguridad | Si aparece, dejalo activado. |

5. Tocá **Create new project** y esperá 1–2 minutos hasta que diga que está listo.

---

## Paso 2 — Activar el inicio de sesión anónimo

La app no pide correo para la nube: cada teléfono abre una sesión anónima propia.

1. En el menú izquierdo, entrá a **Authentication** (ícono de personas).
2. Entrá a **Sign In / Providers**. En algunas versiones está en **Configuration → Sign In / Providers**.
3. En la sección **User Signups**, activá **Allow anonymous sign-ins**.
4. Dejá **Allow new users to sign up** activado.
5. Tocá **Save changes**.
6. No actives CAPTCHA (en **Attack Protection**): la app no lo soporta y el registro fallaría.

> Si esto queda apagado, al tocar "Descargar clase" o "Crear clase" aparece un error como *Anonymous sign-ins are disabled*.

---

## Paso 3 — Crear las tablas (schema.sql)

1. En el menú izquierdo, entrá a **SQL Editor**.
2. Tocá **+ New query**.
3. En tu computadora, abrí el archivo `supabase/schema.sql` del proyecto con el Bloc de notas o VS Code.
4. Seleccioná **todo** el contenido (Ctrl+A), copialo y pegalo en el editor de Supabase.
5. Tocá **Run** (abajo a la derecha, o Ctrl+Enter).
6. Tiene que decir **Success. No rows returned**.
   - Si aparece un aviso de *"destructive operation"*, es por los `drop policy if exists` y `drop function if exists` que reemplazan versiones viejas. Tocá **Run this query** para confirmar. No borra datos.
7. Para verificar, entrá a **Table Editor**. Tienen que aparecer estas tablas:
   - `classes`
   - `class_members`
   - `messages`

> Este archivo se puede volver a ejecutar cuando se actualice el proyecto: agrega columnas nuevas sin borrar datos.

---

## Paso 4 — Crear el cupo diario del tutor (migración)

Solo hace falta si vas a usar Gemini (el tutor online) junto con Supabase. Si falta, `/api/chat` responde error 503 y la app usa el tutor local.

1. En **SQL Editor**, tocá **+ New query**.
2. Abrí `supabase/migrations/20260926_tutor_daily_quota.sql`, copiá todo y pegalo.
3. Tocá **Run** y confirmá que diga **Success**.
4. En **Table Editor** tiene que aparecer `tutor_daily_usage`.

---

## Paso 5 — Copiar la URL y la clave pública

1. Abajo en el menú izquierdo, entrá a **Project Settings** (ícono de engranaje).
   - También podés tocar el botón **Connect** arriba: muestra la URL y las claves.
2. **Project URL:** está en **Data API** (en versiones anteriores, en **API**). Tiene la forma `https://abcdefghijklmnop.supabase.co`. Copiala.
3. **Clave pública:** está en **API Keys**. Sirve cualquiera de estas dos:
   - la pestaña **Legacy API keys** → clave **anon / public** (empieza con `eyJ…`);
   - la clave **Publishable** (empieza con `sb_publishable_…`).
4. **Nunca uses** la clave **service_role** ni la **Secret** (`sb_secret_…`): dan acceso total a la base y quedarían expuestas en la app.

---

## Paso 6 — Poner las claves en la app (computadora)

1. En la carpeta del proyecto (`Guarania`), copiá `.env.example` y renombrá la copia a **`.env`**. Si Windows oculta la extensión, activá *Ver → Extensiones de nombre de archivo*.
2. Abrí `.env` y completá con tus valores:

   ```text
   GEMINI_API_KEY=tu_clave_de_gemini
   GEMINI_MODEL=gemini-3.8-flash

   VITE_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOi...   (la clave del paso 5)
   ```

   - Sin espacios alrededor del `=` y sin comillas.
   - La URL va sin barra `/` al final.
3. Guardá el archivo.
4. Iniciá la app con doble clic en **`start.bat`**. Si ya estaba abierta, cerrala con Ctrl+C y volvé a abrirla: las variables se leen solo al arrancar.
5. En **Aula → Compartir clase** ya no tiene que aparecer el aviso *"Supabase no está configurado"*.

> `.env` está en `.gitignore`: no se sube a GitHub. No lo compartas.

---

## Paso 7 — Poner las claves en Vercel (para los teléfonos)

Los teléfonos usan la versión publicada, así que las mismas variables tienen que estar en Vercel.

1. Entrá a tu proyecto en <https://vercel.com> y andá a **Settings → Environment Variables**.
2. Agregá una por una, marcando **Production**, **Preview** y **Development**:

   | Key | Value |
   | --- | --- |
   | `VITE_SUPABASE_URL` | la Project URL |
   | `VITE_SUPABASE_ANON_KEY` | la clave pública |
   | `GEMINI_API_KEY` | tu clave de Gemini |
   | `GEMINI_MODEL` | `gemini-3.8-flash` (opcional) |

3. Andá a **Deployments**, abrí el último, tocá **⋯ → Redeploy** y confirmá.
   - Las variables `VITE_*` se meten en la app al compilar: si no volvés a desplegar, los teléfonos siguen sin nube.

---

## Paso 8 — Probar que funciona (5 minutos)

Probá con dos navegadores o dos teléfonos distintos. Dos pestañas del mismo navegador comparten la sesión y no sirven para esta prueba.

1. **Docente (teléfono A):**
   1. Creá una cuenta como **Maestro**.
   2. Andá a **Aula → Compartir clase**.
   3. Poné un nombre, elegí situaciones y tarjetas, y tocá **Crear clase y código**.
   4. Anotá el código de 6 caracteres.
2. **Alumno (teléfono B):**
   1. Creá una cuenta como **Alumno**.
   2. Andá a **Aula (Mi clase)**, escribí el código y tocá **Descargar clase**.
   3. Resolvé un ejercicio.
3. **Docente:** en **Aula → Compartir clase**, tocá **Actualizar**. Tiene que aparecer el alumno en el **panel de rendimiento**, con sus aciertos y el tema.
4. **Chat:** en **Mensajes**, mandá un mensaje en el chat grupal desde uno. En unos 4 segundos tiene que aparecer en el otro.
5. **Verificación en Supabase:** en **Table Editor → class_members** tiene que haber una fila para el alumno, con `xp`, `correct` y `topic_stats`.

---

## Problemas frecuentes

| Qué pasa | Causa | Solución |
| --- | --- | --- |
| "Supabase no está configurado" | Falta `.env`, o la app no se reinició | Revisá el paso 6 y volvé a abrir `start.bat` |
| En los teléfonos no hay nube pero en la PC sí | Faltan las variables en Vercel o no se volvió a desplegar | Paso 7, incluido **Redeploy** |
| *Anonymous sign-ins are disabled* | Paso 2 sin hacer | Activá **Allow anonymous sign-ins** y guardá |
| *Invalid API key* o error 401 | Clave mal copiada, o se usó la `service_role`/`secret` | Copiá de nuevo la clave pública del paso 5, sin espacios |
| *Could not find the function public.create_class* | No se ejecutó `schema.sql` | Paso 3 |
| *column "topic_stats" does not exist* o no aparece el detalle por tema | `schema.sql` viejo | Volvé a ejecutar `schema.sql` completo (paso 3) |
| *infinite recursion detected in policy* | Esquema de una versión anterior | Volvé a ejecutar `schema.sql` completo |
| El tutor online nunca responde; siempre usa el local | Falta la migración del paso 4, falta `GEMINI_API_KEY`, o no se tocó **Permitir Gemini online** en el aviso de la app | Paso 4, variables, y tocar el botón en la app |
| *Request rate limit reached* al crear muchas cuentas de prueba | Límite de registros anónimos por IP (30 por hora) | Esperá una hora, o subí el límite en **Authentication → Rate Limits → anonymous users** |
| "No existe una clase con ese código" | Código mal escrito, o la clase se eliminó | Revisá el código (6 caracteres; nunca lleva I, O, 0 ni 1) |

---

## Qué NO hace falta configurar

- **Storage, Realtime, Edge Functions, correos, Google login:** la app no los usa.
- **Policies (RLS):** ya las crea `schema.sql`.
- **Tablas a mano:** todo sale del SQL.
- **CORS en Supabase:** acepta pedidos desde cualquier origen por defecto.
