# Prompt de implementación: PyFis, tutor interactivo bilingüe y offline

Este documento es un encargo para una futura implementación. No describe funcionalidades que ya estén terminadas.

## Encargo

Trabajá sobre el repositorio actual de GuaranIA / PyFis IA. Convertí el tutor en un espacio de aprendizaje que combine conversación, pizarra matemática, gráficos, simulaciones, ejemplos y práctica. Debe ser atractivo para una demostración ante jurados y fácil de usar por estudiantes de Educación Media en celulares modestos.

La prioridad pedagógica es que el alumno prediga, razone, experimente y pueda resolver un problema nuevo. Una respuesta larga o una animación vistosa por sí sola no demuestra aprendizaje.

Implementá por etapas completas y comprobables. Primero inspeccioná el código, las instrucciones del repositorio y los cambios locales. Reutilizá los motores y componentes existentes y preservá los aportes de otros integrantes. No hagas una reescritura general si una ampliación permite obtener el mismo resultado.

## Contexto real del proyecto

- React + Vite, PWA, publicación en Vercel y grupos/progreso con Supabase.
- El endpoint de Gemini está en `api/chat.js` y `src/server/apiChatHandler.js`; la clave debe permanecer exclusivamente en el servidor.
- `gemini-3.8-flash` es el modelo configurado. Verificá su disponibilidad para el proyecto sin exponer credenciales. El código tiene un modelo alternativo: registrá qué modelo respondió realmente, sin etiquetar como 3.8 una respuesta de otro modelo.
- Las instrucciones actuales están en `src/ai/prompt.js`; obligan a responder en texto plano y prohíben LaTeX. Esa política debe evolucionar junto con el renderizador y la validación: cambiar únicamente el prompt no alcanza.
- El tutor offline está en `src/ai/RuleTutorProvider.js` y ya recupera conceptos, glosario, errores, preguntas y ejercicios locales.
- El cuestionario usa `src/ai/quizEngine.js` y `src/hooks/useQuiz.js`.
- La notación escolar ya existe en `src/components/MathText.jsx` y `src/utils/mathText.js`. `Formula` muestra fracciones; el chat utiliza principalmente `MathText`.
- Hay motores de movimiento parabólico, simuladores, laboratorio, dibujo de trayectorias, progresión y material bilingüe que se deben reutilizar.

## 1. Corregir el cuestionario antes de ampliar el tutor

No califiques una idea física por cuánto se parece su redacción a una única respuesta española. Reemplazá la coincidencia superficial como criterio principal por rúbricas de conceptos: ideas expresadas, ideas faltantes, contradicciones y nivel de certeza. Las equivalencias deben cubrir español y Jopara, incluyendo negaciones como `ndaha’éi` y expresiones como `ndokambiái`. No conviertas una coincidencia de palabras en prueba suficiente de comprensión.

Usá estados explícitos: correcta, parcialmente correcta, incorrecta y necesita aclaración. Si una formulación local no alcanza para decidir, pedí una aclaración concreta; no penalices una respuesta solo porque el vocabulario no esté contemplado.

En verdadero/falso evaluá por separado la opción elegida y la justificación. Si el alumno identifica correctamente una afirmación falsa y da una explicación válida, reconocé ambas. Si la opción es correcta pero la explicación no está clara, conservá ese acierto y solicitá precisión en la justificación.

Casos obligatorios:

1. Pregunta: «Pe gravedad omboacelera movimiento horizontal proyectil rehegua». Respuesta: falso, con la justificación «Gravedad omboacelera pe movimiento vertical, ndaha’éi pe horizontal». Debe aceptarse bajo el modelo ideal sin resistencia del aire.
2. Definición: «Movimiento parabólico ha’e peteĩ mba’e oñemombo ha oho tenonde gotyo ha yvate, gravedad omoambuévo hape, ojapóvo peteĩ trayectoria curva». Reconocé lo acertado; explicá que faltan la componente horizontal constante y la vertical acelerada por la gravedad. No la elogies como definición técnica completa ni la trates como una respuesta sin ideas válidas.
3. Una respuesta breve pero completa debe aceptarse sin exigir repetir el texto de referencia.
4. La negación de una idea correcta o una contradicción física debe detectarse en ambos idiomas.

La interfaz debe presentar el estado de corrección de manera determinista. Gemini puede redactar la explicación o ayudar a interpretar una respuesta ambigua, pero su texto no puede contradecir el estado validado. No conviertas un fallo del comparador actual en una verdad inmutable para el modelo.

La corrección comienza reconociendo lo que el estudiante hizo, desarrolla una explicación corta y propone un siguiente paso. No te presentes de nuevo en cada turno, no desalientes a quien acertó y no repitas una pregunta ya contestada. Los cuestionarios y sus correcciones locales siguen siendo ilimitados y no descuentan las 15 consultas diarias del chat libre. Ilimitado para el estudiante no implica solicitudes ilimitadas y sin control a una API: evitá llamar a Gemini para correcciones que la rúbrica local resuelve y conservá controles de uso en el servidor.

## 2. Una misma respuesta visual para ambos proveedores

Diseñá un contrato versionado de respuesta con bloques permitidos: explicación, fórmula, ejemplo trabajado, gráfico, simulación, pregunta de práctica, retroalimentación y referencia. Separá el texto visible, los identificadores de concepto, las especificaciones físicas y los recursos de aprendizaje.

El proveedor offline y Gemini deben poder producir ese mismo contrato. La aplicación renderiza los bloques con componentes compartidos. Validá el formato y cada parámetro antes de dibujar, calcular o abrir una actividad. Si un bloque falla, mostrale al alumno una explicación utilizable y permití continuar.

No permitas que Gemini devuelva código JavaScript/HTML ejecutable. Para operar herramientas debe elegir funciones y parámetros autorizados, por ejemplo: simular un lanzamiento, comparar dos lanzamientos, consultar una fórmula, preparar un ejemplo o generar práctica. La aplicación ejecuta esas acciones con sus propios motores y devuelve resultados comprobados.

Gemini 3.8 Flash admite entrada de texto, imágenes, audio, video y PDF; su salida es texto y admite respuestas estructuradas y llamadas a funciones. No presupongas que ese modelo genera imágenes, audio o una sesión Live. Los gráficos y las animaciones los construye la aplicación a partir de especificaciones validadas. Verificá cualquier capacidad adicional en la documentación oficial antes de implementarla.

## 3. Fórmulas como en un libro

Usá la notación escolar estilo Bonjorno que ya sigue la aplicación: subíndices reales, exponentes, fracciones apiladas, raíces, θ, vectores cuando correspondan, signos matemáticos y unidades correctas. No dejes visibles asteriscos de programación, comandos LaTeX, delimitadores de dólar ni sintaxis del formato interno.

Ejemplos del resultado visual esperado: componente inicial v₀ₓ = v₀ cos θ; posición y(t) = y₀ + v₀ᵧt − ½gt²; alcance R = v₀² sen(2θ)/g mostrado con fracción tipográfica. Indicá que la última fórmula requiere salida y llegada al mismo nivel. Distinguí la componente inicial de la velocidad vertical de su valor instantáneo.

Permití que el estudiante escriba y envíe fórmulas mediante una paleta sencilla: fracción, potencia, raíz, seno, coseno, θ y variables frecuentes. Mostrá una vista previa antes de enviar. También aceptá escritura simple con teclado y coma decimal. El analizador debe admitir una gramática limitada y segura; no uses `eval`.

Cada fórmula puede desplegar «Qué significa cada símbolo», «Cuándo se usa», «Ver un ejemplo» y «Probar en el simulador». La representación matemática debe incluir una lectura accesible para lectores de pantalla y voz. Todos sus recursos deben estar empaquetados para funcionar offline.

## 4. Pizarra dentro de la conversación

Incorporá gráficos y simulaciones pequeños en las respuestas, ampliables cuando el alumno quiera explorar. Priorizá trayectoria y(x), altura y(t), componentes de velocidad frente al tiempo y vectores horizontal/vertical.

Cada gráfico incluye ejes, unidades, leyenda, escala adecuada, descripción accesible y controles táctiles. Permití inspeccionar un punto y mostrar sus valores; conectá la posición del proyectil con el gráfico cuando sea útil.

Ofrecé comparaciones que cambien una variable a la vez: 30°/60° a la misma rapidez y nivel; misma dirección con distinta rapidez; misma rapidez y ángulo con distinta gravedad o altura inicial. No uses curvas decorativas ni puntos inventados por el modelo.

Antes de revelar el resultado, el tutor puede preguntar qué lanzamiento llegará más lejos. Después el alumno compara, explica lo observado y resuelve una variante. Animaciones breves, pausa, repetición y respeto a la preferencia de movimiento reducido.

## 5. Offline completo y honesto

Ampliá el material local como paquetes por concepto: explicación corta, versión detallada, notación, supuestos, ejemplos verificados, simulación, errores comunes, rúbrica, práctica y referencias. Vinculá estos recursos por identificadores estables y versiones bilingües.

Mejorá la recuperación local con sinónimos, vocabulario de aula y continuidad de conversación. Conservá el problema activo, sus datos, la última pregunta y lo que ya respondió el estudiante. No devuelvas repetidamente el mismo párrafo ni redirijas al alumno a un menú para cada exploración.

Generá ejercicios numéricos de plantillas parametrizadas y calculá sus respuestas con el motor físico compartido. Validá que los datos produzcan un problema coherente y que la solución no se filtre en el campo de respuesta.

Ofrecé actividades de «predecí, probá y explicá», pistas progresivas, revisión de unidades y detección de errores frecuentes. Adaptá la siguiente práctica al patrón de dificultades; un único fallo no debe etiquetar al alumno como incapaz.

Precaché de todos los recursos necesarios: interfaz, fuentes matemáticas, contenidos, gráficos y motores. Tras una primera instalación completa, comprobá que funcionan al desconectar realmente la red. Si no es un modelo generativo local, describilo como tutor local basado en material y reglas, sin prometer conversación general ilimitada.

OCR de fotos y reconocimiento/lectura de voz sin red son ampliaciones opcionales: no prometas que existen por usar APIs del navegador. Medí disponibilidad, tamaño, rendimiento y calidad en español/Jopara. Ofrecé siempre ingreso manual de datos y texto.

## 6. Gemini como tutor con herramientas

Usá respuestas estructuradas y funciones autorizadas para elegir la visualización adecuada, recuperar contenido y guiar al estudiante. El motor local calcula y valida las magnitudes; Gemini interpreta el resultado y decide cómo explicarlo.

En fotos de cuaderno, identificá enunciado, datos, unidades y el primer paso dudoso. Mostrá una transcripción editable y pedí confirmar los datos ambiguos antes de simular. Separá claramente cámara, galería y carga de documento. Limitá tamaño y páginas para no encarecer ni demorar una consulta simple.

En PDF, permití seleccionar páginas. Vinculá las explicaciones con el fragmento realmente leído; no inventes citas ni páginas. Para consultas basadas en material del curso recuperá primero las fuentes verificadas del proyecto.

Una respuesta comienza por resolver la duda concreta, y agrega un ejemplo o una herramienta cuando ayude. Mostrá como máximo tres acciones siguientes pertinentes, tales como ver un ejemplo, explorar el gráfico o practicar. No llenes cada mensaje de botones.

Streaming: el texto puede aparecer progresivamente; los bloques interactivos se habilitan al completar y validar su estructura. Conservá lo escrito si hay una falla de conexión. Explicá con claridad cuándo continúa el tutor local, sin presentarlo como una respuesta de Gemini.

## 7. Aprender, recordar y transferir

Separá los modos «Entender», «Practicar» y «Revisar mi procedimiento» por su comportamiento pedagógico. En práctica, pedí un paso por vez y avanzá según la respuesta; en un ejemplo trabajado, explicá la resolución completa con datos distintos del ejercicio que el alumno todavía debe resolver.

Guardá errores conceptuales, uso de pistas y respuestas de práctica por perfil. Proponé una sesión breve de repaso espaciado y un problema nuevo que compruebe transferencia. Permití exportar una hoja de estudio con fórmulas, ejemplos y dudas pendientes.

El análisis docente puede resumir conceptos que necesitan refuerzo y avance por grupo, usando datos verificables. No expongas conversaciones privadas a otros alumnos ni publiques diagnósticos personales innecesarios.

## 8. Español y Jopara con paridad real

Toda herramienta debe funcionar igual en ambos idiomas: entradas, correcciones, gráficos, fórmulas, ayudas, ejemplos, resultados, errores, estados de carga, accesibilidad y exportaciones. Traducir solo los botones es insuficiente.

Jopara significa una mezcla natural y comprensible de español paraguayo y guaraní cotidiano. Evitá una respuesta casi exclusivamente española con sufijos agregados, y evitá trasladar toda la explicación al guaraní. No impongas porcentajes mecánicos de palabras: priorizá claridad, naturalidad y el vocabulario validado del proyecto. Conservá los términos científicos escolares cuando haga falta y no inventes formas guaraníes.

Los símbolos, magnitudes, supuestos, resultados y criterios de corrección permanecen iguales al cambiar idioma. Conservá el gráfico, los datos y el paso actual. Localizá el contenido estructurado sin recalcular el ejercicio ni descontar otra consulta por traducir controles locales. Identificá el material lingüístico que requiera revisión humana; no afirmes que está validado si no lo está.

## 9. Citas breves y verificables

Mostrá una referencia compacta junto a la explicación: por ejemplo «OpenStax, §5.3» o «MEC, Res. 12506, pp. 251–253» solo cuando ese fragmento corresponda al contenido citado. Al tocarla se abre la ficha completa de la fuente.

Distinguí una referencia curricular de una fuente que respalda una fórmula física. Solo citá Bonjorno con edición y ubicación verificadas en el material disponible; usar su estilo de notación no autoriza a inventar una página. Cada referencia proviene de un registro local verificado, no de un texto libre generado por el modelo. Si no existe página conocida, usá sección o capítulo comprobado.

## 10. Diseño y comprobación

Mantené la estética de PyFis: limpia, escolar y sobria; matemática legible, espacios claros, acciones fáciles de tocar, sin emojis decorativos repetidos ni paneles sobrecargados. La conversación es el hilo conductor; las herramientas aparecen cuando ayudan a aprender.

Probá 360 px, 390 px y escritorio. No debe haber desplazamiento horizontal de la página, texto cortado, gráficos con ejes ilegibles ni campos que revelen respuestas mediante ejemplos. Usá perfiles sintéticos y el entorno local/mock para pruebas que creen cuentas, grupos o mensajes; no agregues datos de prueba a producción.

Orden recomendado:

1. Cuestionario justo y bilingüe, correcciones consistentes, formato matemático y citas.
2. Contrato compartido, pizarra interactiva y primeras herramientas locales.
3. Gemini con herramientas y lectura guiada de fotos/PDF.
4. Recuperación offline ampliada, práctica adaptativa y hoja de estudio.
5. Mejoras de voz/OCR local si las mediciones justifican incorporarlas.

Cada etapa entrega una función utilizable de principio a fin. No presentes una colección de maquetas como implementación terminada. Verificá los motores con casos físicos conocidos, las rúbricas con respuestas equivalentes/contradictorias en ambos idiomas, la desconexión real y los errores de red/proveedor. Ejecutá las pruebas existentes y la compilación; agregá pruebas donde exista riesgo concreto.

## Entrega

Entregá los cambios, una explicación breve para el usuario, evidencias de los casos comprobados y limitaciones reales. Prepará una demostración de tres minutos: predicción → gráfico → cambio de parámetro → explicación del alumno → práctica nueva → cambio a Jopara → desconexión y continuación local.

Preservá la autorización y las preferencias de Git/publicación del usuario. Antes de publicar, revisá el remoto y respetá commits nuevos del equipo. No uses force push para integrar el trabajo. Nunca incluyas claves, archivos privados ni datos sintéticos de pruebas en el commit.

Documentación oficial para verificar la integración:

- https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash
- https://ai.google.dev/gemini-api/docs/structured-output
- https://ai.google.dev/gemini-api/docs/function-calling
