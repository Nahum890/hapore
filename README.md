# PyFis IA

PWA educativa para aprender Física de 3.º curso con ejercicios, simulaciones ligadas a cada problema, tutor en Jopara, práctica sin conexión y herramientas para docentes.

## Contenido principal

La propuesta para la competencia se concentra en:

- **Termodinámica:** calor sensible, temperatura final y equilibrio térmico.
- **Óptica:** reflexión, espejos planos e índice de refracción.
- Situaciones cercanas como agua para el mate o tereré, recipientes, espejos y objetos dentro del agua.

Movimiento parabólico, cinemática, vectores y Ley de Hooke permanecen como práctica complementaria.

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
- Selección de temas, cantidad de tarjetas y cantidad de ejercicios.
- Generación de un código de clase que se interpreta sin base de datos.
- Vista de configuración aplicada.
- Laboratorio complementario para proyectar trayectorias.
- Generación de una ficha PDF imprimible y disponible sin conexión.

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

Las cuentas, sesiones, códigos de clase y progreso se guardan en el navegador de cada dispositivo. No existe sincronización remota entre dispositivos.

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

La suite actual cubre cuentas y roles, motor físico, contenido, códigos de clase, simulaciones, progresión, fallback, reintentos, streaming, servidor y criterios de Termodinámica y Óptica.

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
- Matriz de trazabilidad con las fuentes del programa MEC.
- Endpoint `/api/chat` desplegable si se presenta la IA generativa online.
- Pruebas de instalación y modo avión en teléfonos reales.
- Pitch, guion de demostración, evidencia de colaboración y plan de continuidad.

La evaluación detallada de preparación y fusión se encuentra en `EVALUACION_FUSION.md`.
