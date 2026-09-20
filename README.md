# GuaranIA

PWA educativa **mobile-first** para enseñar **Física de 3.º curso** (Movimiento Parabólico) mediante aprendizaje interactivo, con **funcionamiento offline** para todo el contenido estático.

## Qué es GuaranIA

GuaranIA es una aplicación web progresiva que funciona en el navegador del estudiante sin necesidad de Internet: incluye un simulador 2D, tarjetas de estudio, un aula con conceptos y glosario, un tutor offline por reglas y un sistema de **Nivel de Confianza** que registra el progreso en el dispositivo.

## Problema que resuelve

En contextos con conectividad limitada o intermitente, las herramientas educativas dependientes de la nube dejan de funcionar. GuaranIA garantiza que el estudiante pueda practicar Física **aunque no haya conexión**, con todo el contenido y el progreso guardados localmente.

## Objetivo del MVP

Este primer commit construye la **base limpia, modular y extensible** sobre la cual se conectará después un modelo de IA local. El MVP ya permite:

- Ver la pantalla principal con cabecera, ConfidenceBar, tres pestañas y tutor.
- Cambiar entre **Simulador**, **Tarjetas** y **Aula**.
- Consultar ejercicios de Movimiento Parabólico con pistas progresivas offline.
- Usar flashcards con giro y consolidación.
- Aumentar el Nivel de Confianza (nunca disminuye).
- Recargar la página y **conservar el progreso** (localStorage).

**Aún no incluye** (deliberadamente): modelo de IA local, entrenamiento/fine-tuning, API externa, login, base de datos, backend, APK ni modo docente completo.

## Arquitectura

La aplicación separa tres capas que nunca se mezclan:

```
Física (physics/)      → cálculo determinista. La IA jamás decide si una respuesta es correcta.
Pedagogy (pedagogy/)   → confianza, pistas y estado de aprendizaje.
IA (ai/)               → abstracción AIProvider para conectar un modelo local después.
```

Flujo de datos:

```
UI (components/, simulator/)
   ↓ consume
hooks (useOfflineStorage, useTutor, useMission)
   ↓ consume
pedagogy/ + ai/ + physics/
   ↓ usa
data/ (JSON) + utils/ (storage)
```

### Arquitectura de IA futura

```
AIProvider (interfaz conceptual: respond(context))
   ├── RuleTutorProvider  → tutor 100% offline por reglas (activo hoy)
   └── LocalAIProvider    → preparado para un modelo local (inactivo hoy)
```

- Los componentes **nunca importan librerías de modelos directamente**: solo consumen `createAIProvider()` (`src/ai/AIProvider.js`).
- En el futuro se conectará un modelo local (por ejemplo, **Transformers.js** u otro runtime de navegador) implementándolo **dentro de `LocalAIProvider`**, sin modificar el resto de la aplicación.
- `src/ai/prompt.js` ya contiene el prompt del sistema y el constructor de prompts para el futuro modelo.
- El modelo local, cuando se conecte, **nunca validará resultados numéricos**: eso sigue siendo responsabilidad de `physics/physicsValidator.js` (cálculo físico determinista).

## Estructura de carpetas

```
src/
├── assets/                  # Recursos estáticos (reservado)
├── data/                    # Contenido educativo en JSON
│   ├── exercises.json       # Ejercicios de Movimiento Parabólico
│   ├── flashcards.json      # Tarjetas de estudio
│   ├── tutor_jopara.json    # Saludos y pistas jopara del tutor (BORRADOR: requiere revisión lingüística)
│   ├── concepts.json        # Definiciones de conceptos
│   ├── errors.json          # Errores frecuentes
│   └── glossary.json        # Glosario
├── ai/                      # Capa de IA (abstracción)
│   ├── AIProvider.js        # Interfaz + fábrica createAIProvider()
│   ├── RuleTutorProvider.js # Tutor offline por reglas (activo)
│   ├── LocalAIProvider.js   # Stub preparado para modelo local (inactivo)
│   └── prompt.js            # Prompts para el futuro modelo
├── physics/                 # Motor físico (separado de la IA)
│   ├── projectileMotion.js  # Lanzamiento, trayectoria, altura, alcance
│   ├── formulas.js          # Ecuaciones estándar del movimiento parabólico
│   └── physicsValidator.js  # Comparación determinista de respuestas
├── pedagogy/                # Capa pedagógica
│   ├── hintEngine.js        # Pistas progresivas
│   ├── confidenceEngine.js  # Nivel de Confianza (0-100, nunca disminuye)
│   └── learningState.js     # Estado de aprendizaje persistido
├── simulator/               # Simulador 2D (Canvas)
│   ├── CanvasSimulator.jsx  # Canvas con placeholders y TODOs
│   ├── projectileRenderer.js# Funciones de dibujo
│   └── trajectory.js        # Mapeo físico → coordenadas de canvas
├── components/              # Componentes de UI
│   ├── Header.jsx           # Cabecera + badge "100% OFFLINE"
│   ├── ConfidenceBar.jsx    # Barra de Nivel de Confianza
│   ├── TabNavigation.jsx    # Pestañas Simulador / Tarjetas / Aula
│   ├── TutorCard.jsx        # Tutor con mensaje castellano + jopara
│   ├── ExerciseCard.jsx     # Ejercicio con pistas y comprobación
│   ├── Flashcard.jsx        # Tarjeta con giro y consolidación
│   ├── TeacherMode.jsx      # Modo docente (placeholder)
│   └── PdfButton.jsx        # Ficha Aula PDF (placeholder)
├── hooks/
│   ├── useOfflineStorage.js # Persistencia (confianza, ejercicio, intentos, flashcards)
│   ├── useTutor.js          # Consume AIProvider y expone ask()
│   └── useMission.js        # Misión actual y navegación entre ejercicios
├── utils/
│   ├── storage.js           # localStorage seguro (con fallback en memoria)
│   ├── units.js             # Conversiones de unidades (km/h ↔ m/s) y formato
│   └── validation.js        # Validaciones genéricas reutilizables
├── App.jsx                  # Composición de la pantalla principal
├── main.jsx                 # Entry point + registro del service worker
└── index.css                # Design tokens + estilos mobile-first
```

> Nota: `src/data/tutor_jopara.json` contiene textos en jopara que son un **borrador inicial no validado lingüísticamente**; deben ser revisados por el responsable lingüístico antes de usarse con estudiantes.

## Cómo ejecutar

```bash
npm install
npm run dev
```

Abrí la URL que muestra Vite (por defecto `http://localhost:5173`).

Otros comandos:

```bash
npm test        # pruebas con node:test (sin dependencias extra)
npm run build   # producción con PWA (service worker + manifest)
npm run preview # servir la build de producción
```

## Cómo funciona el modo offline

- `vite-plugin-pwa` genera un **service worker** que cachea todos los recursos estáticos (JS, CSS, HTML, iconos, manifest) con actualización automática.
- El contenido educativo (JSON) se incluye en el bundle, por lo que también está disponible sin conexión.
- El progreso (confianza, ejercicio actual, intentos, estado de flashcards) se guarda en **localStorage** a través de `src/utils/storage.js`, que tiene un fallback en memoria si localStorage no está disponible.
- En este primer commit, "offline" significa: **interfaz, ejercicios, JSON, tutor de reglas, simulador, flashcards y progreso**. La IA generativa local todavía no forma parte de la aplicación.

### Nivel de Confianza

- Rango de 0 a 100; **nunca disminuye** (no existe `decreaseConfidence()`).
- Solo acepta incrementos positivos.
- Recompensas: ejercicio correcto sin ayuda **+25**, con pistas **+15**, tarjeta consolidada **+5** (solo la primera vez por tarjeta), error **+0**.

### Diferencia entre RuleTutorProvider y LocalAIProvider

| | `RuleTutorProvider` | `LocalAIProvider` |
|---|---|---|
| Estado | **Activo**: la app funciona completamente con él | **Inactivo**: stub que responde "módulo en desarrollo" |
| Cómo responde | Reglas + JSON local (errores frecuentes → pistas jopara) | Delegaría en un modelo local (Transformers.js u otro) |
| Conexión | 100% offline, sin red | Sin red, pero requiere cargar el modelo en el navegador |
| Cuándo usarlo | Hoy, siempre | Cuando se implemente el modelo local en un próximo commit |

## Próximos pasos

1. Simulador completo: controles de lanzamiento (v0, ángulo), animación con `requestAnimationFrame`, trayectoria real dibujada y comparación con el objetivo.
2. Conexión del modelo de IA local dentro de `LocalAIProvider` usando `src/ai/prompt.js`, sin modificar el resto de la aplicación.
3. Generación real de la **Ficha Aula PDF** (`PdfButton`).
4. Modo docente completo (`TeacherMode`).
5. Revisión lingüística de los textos jopara por el responsable correspondiente.
6. Repetición espaciada para las flashcards.
7. Más ejercicios y temas del programa de Física de 3.º curso.
