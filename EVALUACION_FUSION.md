# Evaluación para fusionar PyFis IA

Fecha de revisión: 25 de septiembre de 2026.

## Conclusión

La versión de `modificacion propia` debe ser la base funcional de la fusión. El repositorio principal debe aportar el historial Git y servir como punto de integración. No conviene intentar resolver la unión archivo por archivo eligiendo siempre la versión del repositorio principal: la copia ya reemplaza de manera coherente la navegación, el contenido, la tutoría, las simulaciones y el modo docente.

La fusión debe realizarse en una rama nueva, copiando solo código y recursos del proyecto. Deben excluirse `node_modules`, `dist` y archivos temporales.

## Evidencia comparativa

| Área | Repositorio principal | Modificación propia | Decisión |
|---|---:|---:|---|
| Ejercicios | 3, todos de movimiento parabólico | 24; incluye 4 de Termodinámica y 4 de Óptica | Usar la copia |
| Flashcards | 4 | 31; incluye Termodinámica y Óptica | Usar la copia |
| Conceptos | 6 | 16 | Usar la copia |
| Errores diagnosticados | 4 | 15 | Usar la copia |
| Glosario | 5 | 15 | Usar la copia |
| Pruebas automáticas | 23 aprobadas | 64 aprobadas | Usar la copia y conservar toda la suite |
| Build PWA | Correcta, 248 KiB precargados | Correcta, 1.169 KiB precargados | La copia incluye PDF y más funciones; revisar peso después |
| Tutor en red | Consulta simple con timeout y fallback | Timeout global, reintentos, streaming, sanitización, fallback y punto de extensión para modelo local | Usar la copia |
| Simulación | Movimiento parabólico | Simulación vinculada al ejercicio activo, incluidas escenas de Termodinámica y Óptica | Usar la copia |
| Roles y cuentas | No están completos | Alumno y maestro, cuentas locales y progreso separado | Usar la copia, explicando su alcance local |
| Modo docente | Parcial | Código de clase, selección de temas, proyector y PDF | Usar la copia |
| UX | Navegación básica | Inicio guiado, tarjetas de tutorial, navegación por rol, adaptación móvil y accesibilidad | Usar la copia |

La diferencia de código en `src` es de 41 archivos, con 3.716 líneas agregadas y 1.240 eliminadas en la copia.

## Estimación interna según la guía del jurado

Esta estimación ayuda a priorizar el trabajo; no sustituye la decisión del jurado.

| Criterio | Máximo | Estado actual estimado | Evidencia y riesgo |
|---|---:|---:|---|
| Función pedagógica e IA generativa | 25 | 22 | Hay pistas progresivas, diagnóstico por procedimiento, reintento sin penalización, adaptación, contexto local y medición. Falta validar la calidad didáctica con docentes y demostrar claramente cuándo responde la IA generativa. |
| Corrección y pertinencia del contenido | 20 | 15 | Termodinámica y Óptica están alineadas con Física de 3.º, usan cálculo determinista y unidades. Falta revisión formal de un docente y trazabilidad a fuentes MEC. |
| Jopara | 20 | 10 | Está presente en tutor, banco conceptual y retroalimentación, pero el propio archivo declara que la revisión lingüística sigue pendiente. La guía puede limitar esta sección si el Jopara no está validado. |
| Funcionalidad | 15 | 13 | El flujo principal, fallback sin conexión, manejo de errores y PWA funcionan. La IA online depende del servidor de Vite y no está lista para un alojamiento estático común. |
| Experiencia de usuario | 10 | 9 | Hay onboarding, jerarquía clara, vista móvil, roles y ayudas. Conviene una prueba final en dos teléfonos reales y con usuarios nuevos. |
| Presentación y trabajo en equipo | 10 | 1 | El código no demuestra pitch, colaboración ni plan de continuidad. Deben prepararse como entregables separados. |
| **Total estimado actual** | **100** | **70** | Puede subir por encima de 85 al cerrar validación lingüística, validación docente, despliegue y presentación. |

## Faltantes prioritarios

### Bloqueantes antes de presentar

1. **Revisión lingüística del Jopara.** Una persona competente debe revisar cada texto visible, registrar correcciones y firmar o dejar evidencia de validación.
2. **Validación docente y fuentes.** Revisar fórmulas, enunciados, resultados, notación y unidades de Termodinámica y Óptica. Agregar una matriz que relacione cada contenido con el programa o material MEC utilizado.
3. **Despliegue real de la IA.** El endpoint `/api/chat` funciona en desarrollo y en la vista previa de Vite. En un alojamiento puramente estático no existe ese servidor. Se necesita una función de servidor desplegable o un modelo local real. El tutor por reglas sí mantiene la app utilizable sin conexión.
4. **Actualizar la documentación.** El README describe un prototipo antiguo: dice Movimiento Parabólico, sin login, sin modo docente y con PDF pendiente. Debe reflejar la versión que verá el jurado.
5. **Preparar la presentación.** Crear pitch, guion de demostración, distribución de tareas del equipo y plan de continuidad.

### Importantes para fortalecer la puntuación

1. Probar la PWA instalada y en modo avión después de una primera carga, en Android y en una computadora.
2. Ejecutar los cuatro casos rápidos sugeridos por la guía: respuesta incorrecta, ejercicio no preparado, Jopara informal y funcionamiento sin conexión.
3. Añadir pruebas de accesibilidad con teclado y lector de pantalla, además de una sesión breve con estudiantes que no conozcan la app.
4. Reducir el peso de la descarga inicial. La build de la copia precarga aproximadamente 1,17 MB; jsPDF y sus dependencias son la mayor parte y pueden cargarse solo cuando el docente pide el PDF.
5. Renombrar identificadores internos antiguos (`guarania:*`, `generateGuaraniaPdf`) mediante una migración compatible. No afectan el nombre visible, pero dificultan el mantenimiento.
6. Aclarar en la interfaz y en el pitch que las cuentas, sesiones, progreso y códigos de clase son locales al dispositivo. No existe autenticación central ni sincronización remota entre dispositivos.

## Plan seguro de fusión

1. Guardar el estado actual del repositorio principal en un commit o respaldo, porque su árbol de trabajo contiene muchos cambios sin registrar.
2. Crear una rama nueva con prefijo `codex/`, por ejemplo `codex/fusion-pyfis-ia`.
3. Copiar desde `modificacion propia` únicamente `src`, `public`, `tests`, `index.html`, `package.json`, `package-lock.json`, `vite.config.js`, `.env.example` y la documentación actualizada.
4. No copiar `node_modules`, `dist` ni carpetas temporales.
5. Resolver los seis archivos que antes chocaban usando la versión de la copia como punto de partida, y revisar la intención de cualquier cambio nuevo de `main` antes de descartarlo.
6. Ejecutar las 64 pruebas, compilar la PWA y recorrer manualmente los flujos de alumno y maestro.
7. Probar instalación y modo avión sobre la build de producción.
8. Recién después crear el commit y el pull request de fusión.

## Demostración recomendada para el jurado

1. Entrar como alumno y completar el tutorial inicial.
2. Resolver mal un ejercicio de Termodinámica usando un procedimiento reconocible; mostrar el diagnóstico específico y el reintento sin penalización.
3. Resolver un ejercicio de Óptica y comprobar que la escena visual coincide con el cálculo.
4. Hacer una pregunta informal en Jopara con y sin conexión.
5. Entrar como maestro, elegir Termodinámica y Óptica, generar un código de clase y descargar la ficha PDF.
6. Cortar la conexión y repetir un ejercicio para demostrar la continuidad del tutor por reglas y del progreso local.
