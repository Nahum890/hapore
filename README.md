# GuaranIA / PyFis IA

PWA educativa para aprender Física de 3.º curso con ejercicios, simulaciones ligadas a cada problema, tutor en Jopara, práctica sin conexión y herramientas para docentes.

## Sistema Visual y Rebranding (GuaranIA)

La interfaz utiliza un sistema de diseño educativo y tecnológico moderno:
- **Base Navy (`--navy-base`, `--text-primary`):** Alto contraste, lectura sobria y profesional.
- **Azul Tecnológico (`--brand-blue`):** Identidad central de la plataforma, botones primarios y enfoque interactivo.
- **Violeta Innovación (`--brand-violet`):** Acento para el tutor Jopara y capacidades de IA.
- **Ámbar de Acción (`--action-amber`):** Destacados, progreso Mbarete XP y elementos pedagógicos de atención.
- **Coral Constructivo (`--danger-coral`):** Retroalimentación de error no punitiva y alertas cálidas.
- **Proyector de Aula de Alto Impacto:** Tipografía ampliada, métricas físicas nítidas y presets pedagógicos interactivos (30°, 45°, 60°, 20°) legibles a distancia.
- **Microanimaciones y Rendimiento:** Transiciones suaves (240ms pantallas, 500ms confianza), cero dependencias pesadas de animación y soporte total para `prefers-reduced-motion`.

## Contenido principal

El único tema educativo de la app es **Movimiento Parabólico**, con tres situaciones que comparten el mismo motor físico:

- **Dron:** entregas con salida y llegada a la misma altura.
- **Básquetbol:** lanzamientos a la canasta.
- **Pelota sobre un paredón:** tiro que debe superar un obstáculo.

Velocidad, gravedad, vectores y ángulo de lanzamiento se explican como apoyo conceptual para entender el movimiento parabólico, no como temas propios.

## Funciones disponibles

### Para estudiantes

- Registro e inicio de sesión local como alumno.
- Tutorial inicial con tarjetas que explican el funcionamiento.
- Ejercicios de dificultad básica, intermedia y avanzada.
- Respuestas numéricas comprobadas por un motor determinista.
- Simulación visual que cambia según el ejercicio activo.
- Diagnóstico específico de errores y reintentos sin penalización.
- Pistas progresivas en el tutor, con apoyo en castellano y Jopara.
- Cuestionario conceptual y conversación libre con fallback sin conexión.
- Flashcards, progreso, precisión, tiempo medio y recomendaciones adaptativas.
- Acceso a una clase mediante código compartido por el docente.

### Para docentes

- Registro e inicio de sesión local como maestro.
- Preparación de una clase guiada con gancho, demostración, práctica y ticket de salida.
- En modo local, un código de práctica aplica la misma selección en otro dispositivo, sin crear un roster ni enviar progreso.
- Con Supabase, clases reales con materiales compartidos y avance sincronizado entre dispositivos.
- Creación de ejercicios propios con respuesta calculada automáticamente.
- Proyector con vista grande para simulaciones, ejercicios y conceptos.
- Biblioteca con conceptos, ejercicios resueltos, errores frecuentes, glosario y fuentes.
- Generación de una ficha PDF imprimible y disponible sin conexión.

### Minijuego

- "Predecí y lanzá": el alumno estima el resultado (alcance o ángulo) antes de ver la simulación, compara su predicción con el resultado real y puede reintentar. Usa el mismo motor físico que el resto de la app.

## Tutor e IA

La aplicación separa la validación de Física de la redacción del tutor:

```text
Motor de Física        -> calcula y valida respuestas numéricas
Tutor por reglas       -> responde inmediatamente sin conexión
Proveedor de IA        -> mejora la conversación cuando /api/chat está disponible
```

El proveedor online incluye:

- límite total de 3,5 segundos;
- reintentos breves con espera exponencial;
- recepción por streaming;
- sanitización del texto;
- fallback automático al tutor por reglas;
- punto de extensión para un futuro modelo local en el navegador.

La clave de Gemini se lee desde el servidor de desarrollo o vista previa y nunca se incluye en el bundle. Para una publicación en alojamiento estático se debe desplegar `/api/chat` como función de servidor o mantener solo el tutor por reglas.

## Uso sin conexión

Después de la primera carga, el service worker guarda la interfaz, los contenidos y los recursos estáticos. El tutor por reglas, las simulaciones, los ejercicios, las flashcards, el PDF y el progreso local siguen disponibles sin Internet.

Las cuentas, sesiones y el progreso se guardan en el navegador de cada dispositivo.

## Clases compartidas entre dispositivos (opcional)

Si se configura Supabase (ver [`supabase/README.md`](supabase/README.md)), el docente crea una clase con un código, elige qué tarjetas y ejercicios compartir y ve el avance sincronizado de sus alumnos. El alumno descarga la clase una vez con internet, la resuelve sin conexión y su avance se sube cuando vuelve la conexión. Sin Supabase, el código comparte solo una selección de situaciones y cantidades: no crea una clase identificada ni sincroniza progreso. Para entender la diferencia entre Vite, Supabase y el servidor simulado, consulta [docs/SERVIDOR_Y_COMUNICACION.md](docs/SERVIDOR_Y_COMUNICACION.md).

## Instalación y ejecución

```bash
npm install
npm run dev
```

Para usar el tutor online, copiar `.env.example` a `.env` y configurar una clave válida:

```text
GEMINI_API_KEY=...
GEMINI_MODEL=...
```

La app puede funcionar sin esas variables mediante el tutor offline.

## Verificación

```bash
npm test
npm run build
npm run preview
```

La suite actual cubre cuentas y roles, motor físico, contenido, códigos de clase, simulaciones, progresión, fallback, reintentos, streaming y servidor, todo sobre movimiento parabólico.

## Estructura principal

```text
src/
├── ai/          Tutor por reglas, proveedor online y banco conceptual
├── auth/        Cuentas y sesiones locales
├── components/  Interfaz de alumno, maestro, onboarding y PDF
├── data/        Ejercicios, conceptos, errores, glosario y flashcards
├── pedagogy/    Progreso, diagnóstico y recomendaciones
├── physics/     Cálculo y validación determinista
├── simulator/   Escenas y modelos visuales por ejercicio
└── utils/       Persistencia, códigos de clase y validaciones
```

## Pendientes antes de la competencia

- Validación lingüística de todos los textos en Jopara por una persona competente.
- Revisión y aprobación del contenido por un docente de Física.
- Matriz de trazabilidad con las fuentes del programa MEC: se buscó un programa oficial de Física de 3.º curso publicado en mec.gov.py y no se encontró un documento puntual sobre movimiento parabólico verificable en línea; falta que el equipo aporte la fuente oficial exacta (ver `src/data/contentReviewStatus.json`).
- Endpoint `/api/chat` desplegable si se presenta la IA generativa online (hoy depende del servidor de desarrollo/vista previa de Vite; no está pensado para tocarse en esta etapa).
- Pruebas de instalación y modo avión en teléfonos reales.
- Pitch, guion de demostración, evidencia de colaboración y plan de continuidad.

La evaluación detallada de preparación y fusión se encuentra en `EVALUACION_FUSION.md`.
