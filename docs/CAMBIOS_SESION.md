# Resumen de cambios — PyFis IA / GuaranIA

Rama: `codex/dibujo-parabolas` · Fecha: 26/09/2026

Este documento resume todo lo que se cambió y se configuró durante la sesión de trabajo.

**Estado actual:**
- Ya están en GitHub: los cambios del chat de IA (commits en esta rama) y la traducción Jopara (rama `codex/jopara-traduccion`).
- Todavía están solo en la computadora, sin commit: todo lo de las secciones 3 a 9.

---

## 1. Traducción Jopara (ya subido)

- Se corrigió la traducción al Jopara siguiendo las reglas de estilo del equipo (commit `60e34d1`, rama `codex/jopara-traduccion`).

## 2. Chat de IA más completo (ya subido)

- **Tutor socrático:** en las primeras pistas, PyFis hace preguntas antes de dar la respuesta, y el alumno puede contestarle dentro de la misma tarjeta del ejercicio.
- **Foto del ejercicio:** el alumno saca una foto de un problema y Gemini la lee.
- **Voz:** dictado por micrófono y lectura en voz alta (Web Speech).
- **Plan de práctica:** recomienda qué practicar según los errores del alumno.
- **Dificultades del docente:** resumen de los errores más comunes de la clase.

---

## 3. Arreglos de la interfaz

### "Predecí y ganá" (minijuego)
- **Problema:** la escena aparecía diminuta. El objetivo estaba fijado en `9999`, así que el dibujo se escalaba a unos 11 km.
- **Arreglo:**
  - el objetivo ahora es el punto real donde cae el proyectil;
  - la marca de llegada queda oculta hasta que aterriza, para no regalar la respuesta;
  - se muestra la marca de la predicción del alumno.
- Usa las escenas de dron y paredón.

### Dibujar la parábola (Ñaha'a)
- En celular era muy difícil acertar los puntos. Ahora el punto se ajusta solo a la línea guía.
- Se marca el intento fallido y la curva final se dibuja suave.
- Letras legibles en pantallas chicas, con un ajuste específico para celular.

### Flashcards vacías
- **Problema:** había una fase del mazo que no tenía pantalla, entonces la tarjeta aparecía en blanco.
- **Arreglo:** se agregó el aviso correspondiente y el estado vacío del selector.

### Chatbot
- El indicador ahora dice **"PyFis está respondiendo"** (antes decía "Jopara respondiendo").
- El indicador ya no tapa los mensajes: los elementos del chat se encogían.
- **Final del cuestionario claro:**
  - ya no se repite la última pregunta;
  - aparece un cierre con puntaje y opciones: seguir practicando, repasar errores, cambiar de tema, chat libre o volver al inicio.
- El chat baja solo al llegar un mensaje nuevo.

### Pantalla de error
- Si algo falla, la app muestra una pantalla de error con opción de recargar, en vez de quedar en blanco (`AppErrorBoundary`).

---

## 4. Auditoría completa español / Jopara

- **Textos centralizados:** todos los textos de la app pasaron a `src/i18n/messages.js`, con **672 claves** en ambos idiomas. Ninguna falta en ningún idioma.
- **Cambio de idioma en tiempo real:** al cambiar el idioma se traduce todo al instante, incluso en medio de un ejercicio o cuestionario, sin perder el avance.
- **Pantallas convertidas:** inicio, ejercicios, pistas, cuestionario, flashcards, login, perfil, aula docente, clase del alumno, chat de clase, bienvenida, aviso de privacidad y encabezado.
- **Errores traducidos:** los mensajes de error de las cuentas locales también se traducen.
- **Reglas de estilo aplicadas:**
  - no se inventan palabras;
  - "mboy" para cantidades;
  - "opyta/og̃uahẽ" en lugar de "oiko";
  - ortografía nasal correcta;
  - partículas bien separadas;
  - términos científicos en español con posposición guaraní ("velocidad-pe", "gravedad-gui").
- **Tutor:** las 10 reglas de estilo se agregaron a las instrucciones de PyFis para que Gemini también las respete.
- **Diagnóstico de errores:** se corrigieron los verbos en Jopara de los mensajes.

---

## 5. Panel docente avanzado

Componente nuevo `ClassDashboard`, usado tanto para alumnos locales como para alumnos de la nube.

- **Vista general:** cantidad de alumnos, aciertos, ejercicios resueltos y precisión.
- **Por tema,** calculado con datos reales: componentes, tiempo, altura, alcance y ángulos. Muestra el mejor tema, el peor y los temas a reforzar.
- **Dificultades frecuentes** de la clase.
- **Vista individual** de cada alumno, con su detalle.
- El Aula docente se reescribió completa y ahora es bilingüe.

---

## 6. Resultados en la nube (Supabase)

- **Qué se guarda:** el progreso de cada alumno (XP, aciertos, resueltos y estadísticas por tema) para que el docente lo vea desde su teléfono.
- **Sin internet:** la app sigue funcionando igual que antes y sincroniza cuando vuelve la conexión.
- **Bases viejas:** si la base todavía no tiene las columnas nuevas, la app se adapta sola y no se rompe.
- **Claves de Supabase:** la app acepta el formato nuevo (`sb_publishable_…`) y el anterior (`eyJ…`).
- **`supabase/schema.sql`:**
  - columnas nuevas `solved` y `topic_stats`;
  - permisos explícitos para que funcione aunque el proyecto tenga desactivada la opción "Automatically expose new tables".

---

## 7. Arranque, servidor y APK

- **Un solo comando:** doble clic en `start.bat`, o `npm run start:all`. También existen `start:dev` (desarrollo) y `start:mock` (nube simulada sin internet).
- **Servidor recomendado:**
  - **Vercel** para la app y el tutor (`/api/chat`);
  - **Supabase** para los datos;
  - todo en plan gratuito.
- **APK para Android:** se recomienda **TWA con PWABuilder** (más simple que Capacitor). Igual quedó preparado Capacitor, con `VITE_API_BASE_URL` y `CORS_ORIGINS`.
- **PWA:**
  - las actualizaciones llegan sin quedar con versiones viejas en caché;
  - el tutor online nunca se sirve desde caché;
  - se mejoró el manifest.
- **`vercel.json`:** el service worker no se guarda en caché.
- **Guía de presentación:** `docs/PRESENTACION.md` con arquitectura, checklist, prueba con 4 teléfonos, protecciones y límites.

---

## 8. Gemini

- **Modelo:** cambiado a **`gemini-3.8-flash`** en `api/chat.js`, `vite.config.js`, `src/server/apiChatHandler.js`, `.env.example`, la documentación y los tests.
- **Límite de uso:** el tutor online tiene un límite de 15 consultas por día y por usuario (tabla `tutor_daily_usage` en Supabase). Si Gemini falla, responde el tutor local.

---

## 9. Configuración hecha

### Supabase (proyecto `pyfis-ia`, región São Paulo)
- Proyecto creado.
- Login anónimo activado.
- `schema.sql` y la migración del límite diario ejecutados.
- Todo verificado desde la computadora: la clave funciona, las tablas y columnas existen y las funciones responden.
- Guía paso a paso nueva: `docs/SUPABASE_PASO_A_PASO.md`.

### `.env` local
- Creado con la URL y la clave pública de Supabase, la clave de Gemini y el modelo.
- **No se sube a GitHub** (está en `.gitignore`); se verificó que la clave no aparece en ningún archivo del repo.

### Vercel (proyecto `hapore` → **https://hapore.vercel.app**)
- Proyecto creado y conectado al fork `mathipereira13-source/hapore`, con las 4 variables cargadas: `GEMINI_API_KEY`, `GEMINI_MODEL`, `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
- La `main` del fork estaba en el primer commit del proyecto. Se actualizó con la `main` del equipo (`0548878`, que incluye el PR #19). Fue un avance directo, sin forzar.

---

## Seguridad

- La clave `service_role` / `secret` de Supabase **no se usa** en ningún lado.
- La clave de Gemini solo la lee el servidor; nunca llega al navegador.
- `.env` y `.claude/` no se suben al repo.
- **Recomendación:** la clave de Gemini se compartió por chat. Conviene reemplazarla por una nueva en Google AI Studio y actualizar `.env` y Vercel.

---

## Verificación

- Pruebas automáticas: **314/314** pasan, y el build está OK.
- Tests de nube: 14/14.
- Tests del tutor: 3/3 (después del cambio a 3.8).

## Pendiente

1. **Subir los cambios** de las secciones 3 a 9 (commit + push de `codex/dibujo-parabolas`). Vercel genera una URL de prueba (Preview).
2. **Prueba manual** con dos o más teléfonos: el docente crea la clase, el alumno se une y resuelve, el docente ve el panel, y el chat funciona.
3. **Abrir y mergear el PR** a `main` para que https://hapore.vercel.app quede con todo.
4. **Generar la APK** con PWABuilder a partir de la URL de Vercel.
5. **Revisión** de las traducciones Jopara por un hablante nativo.
