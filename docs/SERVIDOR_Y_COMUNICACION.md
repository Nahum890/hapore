# Servidor y comunicación en GuaranIA

Esta guía aclara qué significa “servidor” en el proyecto, cómo probar la comunicación entre docente y alumno y qué servicio hace falta para publicar la aplicación.

## Mapa rápido

```text
Navegador del alumno o docente
  ├─ Interfaz y archivos → Vite durante desarrollo; sitio estático al publicar
  ├─ Clases, avance y mensajes → Supabase (Auth + Postgres + reglas RLS)
  └─ Tutor Gemini → /api/chat en Vite durante desarrollo/vista previa
                    → requiere una función de servidor propia en producción
```

GuaranIA es una aplicación React que normalmente se ejecuta en el navegador. Este repositorio no contiene un servidor Node de producción que mantenga conectado a todo el mundo. La comunicación opcional entre distintos dispositivos se guarda en Supabase; el servidor simulado del repositorio solo sirve para hacer pruebas en una computadora.

## Los tres servicios

| Servicio | Para qué sirve | Cuándo está disponible |
|---|---|---|
| **Vite** | Entrega la app y, en desarrollo, ofrece la ruta local del tutor `/api/chat`. | En tu computadora al ejecutar `npm run dev`; no es el hosting de producción. |
| **Supabase** | Mantiene las clases, integrantes, contactos, mensajes y el avance sincronizado. | Solo cuando el proyecto tiene Supabase configurado y su esquema instalado. |
| **Mock de Supabase** | Imita algunas funciones de clases y chat para pruebas, con datos temporales. | Mientras se ejecuta `node supabase/mock-server.mjs`. Se borra al cerrarlo. |

La clave de Gemini, si se usa, se lee del lado servidor mediante `GEMINI_API_KEY`. El mock de Supabase no es Gemini y no habilita por sí solo el tutor online. Para ofrecer Gemini en un sitio publicado hace falta desplegar `/api/chat` como una función de servidor y guardar allí la clave; una clave puesta en el navegador no es segura. Consulta también el apartado “Tutor e IA” del [README](../README.md).

## Probar en una sola computadora

Requisitos: Node.js 20 o posterior y dependencias del proyecto instaladas. Desde la raíz del repositorio, abre dos terminales.

**Terminal 1 — datos simulados:**

```powershell
node supabase/mock-server.mjs
```

El mock escucha solo en `127.0.0.1:54321` por defecto. Conserva esa terminal abierta.

**Terminal 2 — aplicación:**

```powershell
$env:VITE_SUPABASE_URL = 'http://127.0.0.1:54321'
$env:VITE_SUPABASE_ANON_KEY = 'mock-anon-key'
npm run dev -- --host 127.0.0.1
```

Abre la dirección que indique Vite, normalmente `http://127.0.0.1:5173`. Para simular dos personas en la misma PC usa dos navegadores o dos orígenes, por ejemplo `http://localhost:5173` y `http://127.0.0.1:5173`; cada uno tiene su almacenamiento local.

El mock vive en memoria: sus cuentas, clases y mensajes se pierden al cerrar el proceso. No lo uses con nombres, contactos ni datos reales de estudiantes.

## Probar desde un teléfono en una Wi-Fi privada

Hazlo solo en una red de confianza. El mock no autentica usuarios de Supabase ni está diseñado para exposición pública.

**PowerShell, terminal del mock:**

```powershell
$env:MOCK_SERVER_HOST = '0.0.0.0'
node supabase/mock-server.mjs
```

**Terminal de Vite:** sustituye `192.168.0.20` por la dirección IPv4 de la PC en esa red.

```powershell
$env:VITE_SUPABASE_URL = 'http://192.168.0.20:54321'
$env:VITE_SUPABASE_ANON_KEY = 'mock-anon-key'
npm run dev -- --host 0.0.0.0
```

Desde el teléfono abre `http://192.168.0.20:5173`. Si Windows solicita permiso de red, autorízalo solo en redes privadas. Al terminar, detén ambos procesos con `Ctrl+C`; el mock volverá a estar cerrado a la red.

## Usar Supabase real

Para comunicación persistente entre hogares o dispositivos, cada equipo necesita apuntar al mismo proyecto de Supabase. Una persona autorizada debe crear el proyecto, activar los inicios anónimos y ejecutar [`supabase/schema.sql`](../supabase/schema.sql). Después configura `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en el entorno de desarrollo o alojamiento. Los pasos detallados están en [supabase/README.md](../supabase/README.md).

La clave `anon public` se utiliza en el navegador; las reglas RLS del esquema limitan qué filas puede leer o cambiar cada integrante. Nunca publiques `service_role`, contraseñas ni una clave real en Git. Las identidades actuales están ligadas al navegador: no hay recuperación de cuenta por correo.

## Qué significa cada modo para el docente

- **Sin Supabase:** el código de práctica transmite una selección de situaciones y cantidades. No identifica una clase, no crea un roster compartido y no envía progreso.
- **Con Supabase:** el docente crea una clase en la nube; el alumno la descarga con internet y luego puede practicar sin conexión. El avance pendiente se sincroniza cuando regresa la conexión.
- **Con mock:** se prueba el flujo de Supabase, pero los datos son falsos y temporales. No es un entorno escolar ni un servicio de producción.

## Si algo no conecta

1. Comprueba que el proceso correspondiente siga ejecutándose.
2. Confirma que la app use `http://127.0.0.1:54321` en pruebas locales o la IP de la PC en una prueba por Wi-Fi.
3. Reinicia Vite después de cambiar variables de entorno.
4. Si la app muestra que falta el endpoint de Gemini, eso es independiente del mock de Supabase; el tutor por reglas sigue disponible.
5. Si Supabase real indica que falta una tabla o función, vuelve a ejecutar el esquema más reciente con la persona que administra el proyecto.
