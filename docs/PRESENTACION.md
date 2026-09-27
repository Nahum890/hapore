# PyFis IA — Guía para la presentación (4 teléfonos Android con datos móviles)

## 1. Cómo está armado el proyecto (análisis real)

| Pieza | Qué es | Dónde corre |
| --- | --- | --- |
| App | PWA React + Vite (archivos estáticos + service worker) | Cualquier hosting estático con HTTPS |
| `/api/chat` | Función Node que llama a Gemini con `GEMINI_API_KEY` (`api/chat.js` → `src/server/apiChatHandler.js`) | Función serverless (formato Vercel) |
| Datos compartidos | Supabase: clases, alumnos, resultados, contactos y chat (`supabase/schema.sql`) | Nube de Supabase |
| Datos locales | Cuentas, progreso propio, caché offline (localStorage) | Cada teléfono |

No hay otro backend propio, ni Python, ni base de datos local. Todo lo que tiene que
compartirse entre teléfonos pasa por Supabase:

- **Clase:** la crea el docente con `create_class`, el alumno la baja con `join_class` y se guarda para usarla offline.
- **Resultados:** el alumno los sube a `class_members` (XP, aciertos, `topic_stats` por tema, `solved`). Si no hay señal, quedan pendientes y se reintenta solo.
- **Perfil y contactos:** se sincronizan con `sync_my_profile` y se leen con `class_directory`.
- **Chat, clases y actividades enviadas:** van en la tabla `messages`.
- **Ejercicios y tarjetas propias del docente:** viajan dentro del contenido de la clase.

Lo único que queda por teléfono son la cuenta (usuario y contraseña) y el caché.
Cada persona entra con su cuenta en su propio celular, así que eso no hace falta
compartirlo.

## 2. Opción recomendada para que el servidor esté siempre disponible

**Vercel (app + `/api/chat`) + Supabase (datos).** Las dos tienen plan gratuito, HTTPS y funcionan 24/7 sin tu computadora.

Por qué encaja con esta arquitectura:

- **Sin cambios de código:** `api/chat.js` ya está escrito como función de Vercel y `vercel.json` ya está en el repo.
- **Mismo origen para la app y el tutor:** los teléfonos abren una sola URL `https://…vercel.app`, y la app y `/api/chat` viven ahí. No hay CORS ni IP locales, y funciona con datos móviles desde cualquier lugar.
- **Supabase ya está integrado:** el cliente, el esquema, RLS, la sincronización offline y el chat ya existen. No hace falta crear otro backend.

Descartadas:

| Opción | Por qué no |
| --- | --- |
| Servidor local + ngrok, Cloudflare Tunnel o Tailscale | Depende de que tu PC esté prendida y conectada durante toda la demo. Además, ngrok gratis cambia la URL al reiniciar, y Tailscale obliga a instalar la app en cada teléfono. |
| Render (plan gratis) | Duerme la función tras 15 minutos: el primer mensaje del tutor tarda de 30 a 50 s. |
| Railway o un VPS | Funcionan, pero cuestan dinero o requieren configurar un servidor que el proyecto no necesita. |

### Paso a paso (una sola vez, ~20 minutos)

1. **Supabase**
   1. En supabase.com, creá un proyecto.
   2. En *Authentication → Sign In / Providers*, activá **Allow anonymous sign-ins**.
   3. En *SQL Editor*, pegá y ejecutá todo `supabase/schema.sql`. Si ya lo habías corrido antes, volvé a correrlo: agrega las columnas nuevas del panel docente (`topic_stats`, `solved`).
   4. En *SQL Editor*, ejecutá también `supabase/migrations/20260926_tutor_daily_quota.sql`. Es el cupo diario del tutor online; sin esa migración, `/api/chat` responde 503 y la app usa el tutor local.
   5. En *Project Settings → API*, copiá la **Project URL** y la clave **anon public**. Nunca uses la `service_role`.
2. **Vercel**
   1. En vercel.com, elegí *Add New → Project* e importá el repositorio de GitHub.
   2. Framework: Vite (se detecta solo). El build es `npm run build` y la salida `dist`; ya está en `vercel.json`.
   3. En *Settings → Environment Variables*, cargá:
      - `GEMINI_API_KEY`
      - `GEMINI_MODEL` (opcional)
      - `VITE_SUPABASE_URL`
      - `VITE_SUPABASE_ANON_KEY`
   4. Hacé *Deploy* y anotá la URL, por ejemplo `https://pyfis-ia.vercel.app`.
   5. Si cambiás variables `VITE_*`, volvé a desplegar: van dentro del build.
3. **Prueba rápida:** abrí esa URL en dos teléfonos distintos con datos móviles.
   1. En uno, creá una cuenta de maestro y una clase. Anotá el código de 6 letras.
   2. En el otro, creá una cuenta de alumno, entrá a *Mi clase*, escribí el código y tocá *Descargar clase*.
   3. Resolvé un ejercicio con el alumno. En el maestro, andá a *Aula → Compartir clase → Actualizar*: tiene que aparecer en el panel de rendimiento.

## 3. Convertir la PWA en APK

**Recomendado: TWA (Trusted Web Activity) con PWABuilder o Bubblewrap.** El APK abre
la URL pública de Vercel en modo app, a pantalla completa y sin barra de navegador.

Por qué TWA y no Capacitor:

| TWA | Capacitor |
| --- | --- |
| La app y `/api/chat` siguen en el mismo origen HTTPS. | Empaqueta los archivos dentro del APK, con origen `https://localhost`. |
| Service worker y modo offline funcionan igual que en Chrome. | Una ruta relativa `/api/chat` apuntaría al propio teléfono y se rompería. |
| Cada deploy en Vercel actualiza los 4 teléfonos sin reinstalar. | Exige `VITE_API_BASE_URL`, CORS y recompilar el APK en cada cambio. |

### Con PWABuilder (sin instalar nada)

1. En pwabuilder.com, pegá la URL de Vercel. Debe marcar el manifest y el service worker en verde.
2. Elegí *Package for stores → Android → Generate package*. Package ID sugerido: `com.pyfis.ia`.
3. Descargá el zip. Trae el `.apk`, el `.aab` y un `assetlinks.json`.
4. Copiá `assetlinks.json` a `public/.well-known/assetlinks.json`, hacé commit y volvé a desplegar en Vercel. Así el APK se abre sin barra de direcciones.
5. Instalá el `.apk` en los 4 teléfonos. En cada uno, permití "instalar apps de orígenes desconocidos".

### Si igual preferís Capacitor

1. Definí `VITE_API_BASE_URL=https://tu-app.vercel.app` en el build.
2. En Vercel, definí `CORS_ORIGINS=https://localhost,capacitor://localhost`.
3. Ejecutá:

   ```bash
   npm i @capacitor/core @capacitor/cli @capacitor/android
   npx cap init
   npx cap add android
   npm run build
   npx cap sync
   ```

4. Compilá con Android Studio.

Estas dos variables ya están soportadas en el código (`src/ai/LocalAIProvider.js` y `src/server/apiChatHandler.js`).

### Qué ya está revisado para APK

- **Manifest:** `id`, `start_url` y `scope` son relativos. Hay iconos 192/512 normales y *maskable*, y `display: standalone`.
- **Service worker:**
  - reemplaza la versión vieja apenas hay una nueva (`skipWaiting`, `clientsClaim`, `cleanupOutdatedCaches`);
  - nunca responde `/api/...` con el HTML cacheado;
  - `sw.js` se sirve sin caché desde Vercel.
- **Sin URLs locales:** no hay `localhost`, `127.0.0.1` ni `192.168.x.x` en el código de la app. Supabase se configura por variable de entorno.
- **Pantalla blanca imposible:** si algo falla, aparece un mensaje con botón de recarga (`AppErrorBoundary`).
- **Permisos:**
  - la cámara se pide solo al adjuntar una foto al chat;
  - el micrófono, solo al tocar el botón de voz;
  - no hay permisos obligatorios.

## 4. Correr todo localmente (sin publicar)

```bat
start.bat
```

`start.bat` sin opciones equivale a `npm run start:all`: compila, sirve la versión de producción y muestra las direcciones. Otros modos:

| Comando | Qué hace |
| --- | --- |
| `start.bat dev` | Servidor de desarrollo |
| `start.bat mock` | Servidor de desarrollo + Supabase simulado. Sirve para probar clases, chat y panel docente sin cuenta; los datos se borran al cerrar. |

El script:

- verifica Node e instala dependencias si faltan;
- avisa si no hay `.env`, `GEMINI_API_KEY` o Supabase configurado;
- no abre un segundo servidor si el puerto ya está en uso;
- muestra la dirección local y la de la red Wi-Fi.

> Una IP local (`192.168.x.x`) solo sirve si todos están en la misma red. Para la demo con datos móviles usá **la URL de Vercel**.

## 5. Checklist del día de la presentación

- [ ] La URL de Vercel abre en los 4 teléfonos con datos móviles, no Wi-Fi.
- [ ] Hay una clase creada desde el teléfono del docente, con su código anotado.
- [ ] Los 3 alumnos tocaron *Descargar clase* antes de empezar.
- [ ] En el primer uso de cada teléfono, tocar **Permitir Gemini online** en el aviso de privacidad. Si no, PyFis responde con el tutor local, que también funciona.
- [ ] Probar sacando la conexión a un alumno: sigue resolviendo, y al volver la señal el docente ve el avance (*Aula → Actualizar*).
- [ ] Si el tutor online tarda más de 12 s o falla, la app usa sola el tutor local. No es un error visible.
- [ ] Si un teléfono muestra una versión vieja, cerrar y abrir la app una vez: el service worker nuevo se activa solo.

## 6. Límites conocidos (para no llevarse sorpresas)

- La identidad en Supabase es anónima **por teléfono**. Si alguien reinstala el APK o borra datos, vuelve a entrar como alumno nuevo y tiene que tocar *Descargar clase* otra vez.
- Las cuentas (usuario y contraseña) son locales de cada teléfono. No sirven para entrar desde otro dispositivo.
- El chat consulta mensajes nuevos cada 4 segundos. No es instantáneo, pero alcanza para una clase.
- El panel docente por tema necesita la última versión de `schema.sql`. Con un esquema viejo, muestra XP y aciertos totales, pero no el detalle por tema.
