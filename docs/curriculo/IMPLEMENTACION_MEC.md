# PyFis IA · Implementación del currículo de Física del MEC

Este documento explica cómo PyFis IA organiza sus temas según los documentos del
Ministerio de Educación y Ciencias (MEC) de Paraguay, y dónde está cada cosa en
el código. Alcance: **Educación Media** (1.º, 2.º y 3.º curso). El Tercer Ciclo
de la Educación Escolar Básica queda fuera por decisión del equipo.

Fuente del análisis: [`pyfis_especificacion_fisica_curriculo_paraguay.txt`](pyfis_especificacion_fisica_curriculo_paraguay.txt).

## Documentos usados

| Doc. | Documento | Resolución | Uso en PyFis |
|---|---|---|---|
| A | Desarrollo de capacidades en la Educación Media. Bachillerato Científico con énfasis en Ciencias Básicas y Tecnología. Plan ajustado (2010-2012) | **Res. MEC N° 12.506/09 BIS** | Programa base: unidades y capacidades de cada curso (Plan Común pp. 139-145; Plan Específico pp. 251-253) |
| B | Priorización Curricular 2021 (3.er ciclo EEB y Educación Media) | No muestra resolución propia en las páginas analizadas: no se le atribuye ninguna | Marca "Priorizado 2021" en capacidades y temas |
| C | Guía para la planificación de clases en tiempos de pandemia. Educación Media | — | Cronogramas semanales 2021 (fechas históricas) |

El marco normativo citado en los documentos (Res. 308/2020, 602/2020, 832/2020 y
otras normas) se muestra en la app en **Temas → Fuentes y resoluciones**.

**Fórmulas:** el programa del MEC nombra los temas y las leyes, pero no transcribe
fórmulas. Las fórmulas de PyFis son de física estándar de nivel medio, y la app
lo aclara debajo de cada lista de fórmulas.

## Cursos en la app

| Curso | Plan | Base | Priorización 2021 |
|---|---|---|---|
| 1.er curso | Plan Común | Doc. A pp. 140-142 | Doc. B pp. impresas 66-67 / PDF 74-75 |
| 2.º curso | Plan Común | Doc. A pp. 143-145 | Doc. B pp. impresas 66-67 / PDF 74-75 |
| 3.er curso | Plan Común (Guía 2021) | Solo cronograma del doc. C (pp. impresas 114-117 / PDF 124-127) | — |
| 3.er curso | Plan Específico · Ciencias Básicas | Doc. A pp. 251-253 | Doc. B p. impresa 91 / PDF 99 |

**Discrepancia que se conserva tal cual:** la Guía 2021 rotula una tabla como
"Plan Común, Tercer curso", pero el programa base no tiene Física de Plan Común
en 3.º. La app la muestra aparte, con esa advertencia, sin asumir equivalencias.

## Qué ve cada usuario

- **Alumno:** sección **Temas** con su curso, las unidades del programa y una
  tarjeta por tema. Puede marcar "Mis temas", filtrar los priorizados 2021 y
  ver el orden de la Guía 2021. Cada tema tiene:
  - **Aprender**: lo importante, fórmulas, un ejemplo real, el error común y
    el panel **Según el MEC** (curso, capacidad textual, resolución, páginas,
    priorización y semanas de la Guía);
  - **Simulador**: 24 simuladores interactivos;
  - **Practicar**: ejercicios ilimitados con datos al azar, corrección
    automática (avisa errores de unidades o de signo), pista y resolución paso
    a paso;
  - **Preguntas**: opción múltiple con explicación.
- **Docente:** en Aula, la herramienta **Plan MEC** muestra las capacidades de
  cada curso para marcar los temas del grupo (aparecen al alumno en "Elegidos
  por tu docente" y viajan con el grupo de la nube), el cronograma de la Guía
  2021 y un **proyector** a pantalla completa con fórmulas y simulador.
- **Tutor sin internet:** reconoce el tema de la pregunta, explica, cita dónde
  figura en el programa, resuelve con los datos que escribe el alumno y
  propone ejercicios que corrige. Escribí "¿qué temas hay?" para ver la lista.

## Dónde está en el código

| Archivo | Contenido |
|---|---|
| `src/curriculum/sources.js` | Documentos A/B/C (páginas, SHA-256), resoluciones y competencias |
| `src/curriculum/curriculum.js` | Cursos, unidades, capacidades (texto del MEC, n.º de priorización) y cronogramas de la Guía 2021 |
| `src/curriculum/topics/*.js` | Los 38 temas: resumen, fórmulas, ejemplo, error común, simulador, ejercicios y preguntas |
| `src/curriculum/practice.js` | Generadores de ejercicios y corrección |
| `src/sims/` | Kit visual y simuladores |
| `src/components/topics/` | Sección Temas, página de tema, fuentes y Plan MEC |
| `src/ai/topicTutor.js` | Tutor sin internet para los temas |
| `tests/curriculum.test.js`, `tests/topicTutor.test.js` | Pruebas de datos, física y tutor |

## Trazabilidad tema por tema

Tabla generada desde `src/curriculum/` (los mismos datos que muestra la app).

| Tema | Dónde figura en el MEC | Priorización 2021 | Guía 2021 |
|---|---|---|---|
| Magnitudes y unidades | 1.er curso Plan Común, cap. 1 (Res. MEC N° 12.506/09 BIS, doc. A pp. 140-142) | 1.er curso Plan Común: n.º 1 (doc. B pp. impresas 66-67 / PDF 74-75) | Plan Común, 2.º curso: sem. C, 1 |
| Vectores | 1.er curso Plan Común, cap. 2 (Res. MEC N° 12.506/09 BIS, doc. A pp. 140-142) | 1.er curso Plan Común: n.º 2 (doc. B pp. impresas 66-67 / PDF 74-75) | Plan Común, 2.º curso: sem. 2 |
| Características del movimiento | 1.er curso Plan Común, cap. 3 (Res. MEC N° 12.506/09 BIS, doc. A pp. 140-142) | 1.er curso Plan Común: n.º 3 (doc. B pp. impresas 66-67 / PDF 74-75) | Plan Común, 2.º curso: sem. 3 |
| Movimiento rectilíneo uniforme (MRU) | 1.er curso Plan Común, cap. 4 (Res. MEC N° 12.506/09 BIS, doc. A pp. 140-142)<br>3.er curso Plan Específico · Ciencias Básicas, cap. 1 (Res. MEC N° 12.506/09 BIS, doc. A pp. 251-253) | 1.er curso Plan Común: n.º 4 (doc. B pp. impresas 66-67 / PDF 74-75)<br>3.er curso Plan Específico · Ciencias Básicas: n.º 1 (doc. B p. impresa 91 / PDF 99) | Plan Común, 2.º curso: sem. D, 4<br>Plan Específico, 3.er curso: sem. 1 |
| Movimiento uniformemente variado (MRUV) | 1.er curso Plan Común, cap. 4 (Res. MEC N° 12.506/09 BIS, doc. A pp. 140-142)<br>3.er curso Plan Específico · Ciencias Básicas, cap. 1 (Res. MEC N° 12.506/09 BIS, doc. A pp. 251-253) | 1.er curso Plan Común: n.º 4 (doc. B pp. impresas 66-67 / PDF 74-75)<br>3.er curso Plan Específico · Ciencias Básicas: n.º 1 (doc. B p. impresa 91 / PDF 99) | Plan Común, 2.º curso: sem. D, 5<br>Plan Específico, 3.er curso: sem. 2 |
| Movimiento vertical en el vacío | 1.er curso Plan Común, cap. 4 (Res. MEC N° 12.506/09 BIS, doc. A pp. 140-142)<br>3.er curso Plan Específico · Ciencias Básicas, cap. 1 (Res. MEC N° 12.506/09 BIS, doc. A pp. 251-253) | 1.er curso Plan Común: n.º 4 (doc. B pp. impresas 66-67 / PDF 74-75)<br>3.er curso Plan Específico · Ciencias Básicas: n.º 1 (doc. B p. impresa 91 / PDF 99) | Plan Común, 2.º curso: sem. 6<br>Plan Específico, 3.er curso: sem. 3 |
| Movimiento parabólico | 3.er curso Plan Específico · Ciencias Básicas, cap. 1 (Res. MEC N° 12.506/09 BIS, doc. A pp. 251-253) | 3.er curso Plan Específico · Ciencias Básicas: n.º 1 (doc. B p. impresa 91 / PDF 99) | Plan Específico, 3.er curso: sem. D, 4 |
| Movimiento circular | 3.er curso Plan Específico · Ciencias Básicas, cap. 1 (Res. MEC N° 12.506/09 BIS, doc. A pp. 251-253) | 3.er curso Plan Específico · Ciencias Básicas: n.º 1 (doc. B p. impresa 91 / PDF 99) | Plan Específico, 3.er curso: sem. 5 |
| Leyes de Newton | 1.er curso Plan Común, cap. 5 (Res. MEC N° 12.506/09 BIS, doc. A pp. 140-142)<br>3.er curso Plan Específico · Ciencias Básicas, cap. 2 (Res. MEC N° 12.506/09 BIS, doc. A pp. 251-253) | 1.er curso Plan Común: n.º 7 (doc. B pp. impresas 66-67 / PDF 74-75)<br>3.er curso Plan Específico · Ciencias Básicas: n.º 2 (doc. B p. impresa 91 / PDF 99) | Plan Común, 2.º curso: sem. E, 11, 12, 13<br>Plan Específico, 3.er curso: sem. C, 6 |
| Equilibrio y momento de una fuerza | 1.er curso Plan Común, cap. 6 (Res. MEC N° 12.506/09 BIS, doc. A pp. 140-142)<br>3.er curso Plan Específico · Ciencias Básicas, cap. 3 (Res. MEC N° 12.506/09 BIS, doc. A pp. 251-253) | 1.er curso Plan Común: n.º 5 (doc. B pp. impresas 66-67 / PDF 74-75)<br>3.er curso Plan Específico · Ciencias Básicas: n.º 3 (doc. B p. impresa 91 / PDF 99) | Plan Común, 2.º curso: sem. 7, 8, 9<br>Plan Específico, 3.er curso: sem. 7, 8 |
| Elasticidad y Ley de Hooke | 1.er curso Plan Común, cap. 7 (Res. MEC N° 12.506/09 BIS, doc. A pp. 140-142) | 1.er curso Plan Común: n.º 6 (doc. B pp. impresas 66-67 / PDF 74-75) | Plan Común, 2.º curso: sem. 10 |
| Trabajo, energía y potencia | 1.er curso Plan Común, cap. 8 (Res. MEC N° 12.506/09 BIS, doc. A pp. 140-142)<br>3.er curso Plan Específico · Ciencias Básicas, cap. 4 (Res. MEC N° 12.506/09 BIS, doc. A pp. 251-253) | 1.er curso Plan Común: n.º 8 (doc. B pp. impresas 66-67 / PDF 74-75)<br>3.er curso Plan Específico · Ciencias Básicas: n.º 4 (doc. B p. impresa 91 / PDF 99) | Plan Común, 2.º curso: sem. 14, 15, 16<br>Plan Específico, 3.er curso: sem. 9, 10, 11 |
| Impulso y cantidad de movimiento | 1.er curso Plan Común, cap. 9 (Res. MEC N° 12.506/09 BIS, doc. A pp. 140-142) | 1.er curso Plan Común: no figura | — |
| Gravitación universal y Kepler | 3.er curso Plan Específico · Ciencias Básicas, cap. 6 (Res. MEC N° 12.506/09 BIS, doc. A pp. 251-253) | 3.er curso Plan Específico · Ciencias Básicas: n.º 6 (doc. B p. impresa 91 / PDF 99) | Plan Específico, 3.er curso: sem. 14, 15 |
| Hidrostática: presión y Pascal | 1.er curso Plan Común, cap. 10 (Res. MEC N° 12.506/09 BIS, doc. A pp. 140-142)<br>3.er curso Plan Específico · Ciencias Básicas, cap. 5 (Res. MEC N° 12.506/09 BIS, doc. A pp. 251-253) | 1.er curso Plan Común: n.º 9 (doc. B pp. impresas 66-67 / PDF 74-75)<br>3.er curso Plan Específico · Ciencias Básicas: n.º 5 (doc. B p. impresa 91 / PDF 99) | Plan Común, 2.º curso: sem. F, 17, 18<br>Plan Específico, 3.er curso: sem. 12 |
| Empuje y Principio de Arquímedes | 1.er curso Plan Común, cap. 10 (Res. MEC N° 12.506/09 BIS, doc. A pp. 140-142)<br>3.er curso Plan Específico · Ciencias Básicas, cap. 5 (Res. MEC N° 12.506/09 BIS, doc. A pp. 251-253) | 1.er curso Plan Común: n.º 9 (doc. B pp. impresas 66-67 / PDF 74-75)<br>3.er curso Plan Específico · Ciencias Básicas: n.º 5 (doc. B p. impresa 91 / PDF 99) | Plan Común, 2.º curso: sem. F, 19<br>Plan Específico, 3.er curso: sem. E, 13 |
| Hidrodinámica: caudal y Bernoulli | 1.er curso Plan Común, cap. 11 (Res. MEC N° 12.506/09 BIS, doc. A pp. 140-142) | 1.er curso Plan Común: no figura | — |
| Temperatura y escalas | 1.er curso Plan Común, cap. 12 (Res. MEC N° 12.506/09 BIS, doc. A pp. 140-142)<br>1.er curso Plan Común, cap. 13 (Res. MEC N° 12.506/09 BIS, doc. A pp. 140-142)<br>3.er curso Plan Común (Guía 2021) (doc. C pp. impresas 114-117 / PDF 124-127)<br>3.er curso Plan Específico · Ciencias Básicas, cap. 7 (Res. MEC N° 12.506/09 BIS, doc. A pp. 251-253)<br>3.er curso Plan Específico · Ciencias Básicas, cap. 8 (Res. MEC N° 12.506/09 BIS, doc. A pp. 251-253) | 1.er curso Plan Común: n.º 10 (doc. B pp. impresas 66-67 / PDF 74-75)<br>1.er curso Plan Común: no figura<br>3.er curso Plan Específico · Ciencias Básicas: n.º 7 (doc. B p. impresa 91 / PDF 99)<br>3.er curso Plan Específico · Ciencias Básicas: no figura | Plan Común, 2.º curso: sem. 20<br>Plan Común, 3.er curso: sem. C<br>Plan Específico, 3.er curso: sem. 16 |
| Calorimetría | 1.er curso Plan Común, cap. 12 (Res. MEC N° 12.506/09 BIS, doc. A pp. 140-142)<br>1.er curso Plan Común, cap. 13 (Res. MEC N° 12.506/09 BIS, doc. A pp. 140-142)<br>3.er curso Plan Común (Guía 2021) (doc. C pp. impresas 114-117 / PDF 124-127)<br>3.er curso Plan Específico · Ciencias Básicas, cap. 7 (Res. MEC N° 12.506/09 BIS, doc. A pp. 251-253) | 1.er curso Plan Común: n.º 10 (doc. B pp. impresas 66-67 / PDF 74-75)<br>1.er curso Plan Común: no figura<br>3.er curso Plan Específico · Ciencias Básicas: n.º 7 (doc. B p. impresa 91 / PDF 99) | Plan Común, 2.º curso: sem. 21<br>Plan Común, 3.er curso: sem. C<br>Plan Específico, 3.er curso: sem. 17 |
| Dilatación térmica | 1.er curso Plan Común, cap. 12 (Res. MEC N° 12.506/09 BIS, doc. A pp. 140-142) | 1.er curso Plan Común: n.º 10 (doc. B pp. impresas 66-67 / PDF 74-75) | Plan Común, 2.º curso: sem. 22 |
| Principios de la termodinámica | 2.º curso Plan Común, cap. 1 (Res. MEC N° 12.506/09 BIS, doc. A pp. 143-145)<br>3.er curso Plan Común (Guía 2021) (doc. C pp. impresas 114-117 / PDF 124-127) | 2.º curso Plan Común: n.º 1 (doc. B pp. impresas 66-67 / PDF 74-75) | Plan Común, 3.er curso: sem. 2 |
| Procesos de los gases | 2.º curso Plan Común, cap. 1 (Res. MEC N° 12.506/09 BIS, doc. A pp. 143-145)<br>2.º curso Plan Común, cap. 2 (Res. MEC N° 12.506/09 BIS, doc. A pp. 143-145)<br>3.er curso Plan Común (Guía 2021) (doc. C pp. impresas 114-117 / PDF 124-127) | 2.º curso Plan Común: n.º 1 (doc. B pp. impresas 66-67 / PDF 74-75)<br>2.º curso Plan Común: no figura | Plan Común, 3.er curso: sem. 1 |
| Naturaleza y propagación de la luz | 2.º curso Plan Común, cap. 3 (Res. MEC N° 12.506/09 BIS, doc. A pp. 143-145)<br>3.er curso Plan Común (Guía 2021) (doc. C pp. impresas 114-117 / PDF 124-127) | 2.º curso Plan Común: n.º 2 (doc. B pp. impresas 66-67 / PDF 74-75) | Plan Común, 3.er curso: sem. 3 |
| Reflexión y espejos | 2.º curso Plan Común, cap. 4 (Res. MEC N° 12.506/09 BIS, doc. A pp. 143-145)<br>3.er curso Plan Común (Guía 2021) (doc. C pp. impresas 114-117 / PDF 124-127) | 2.º curso Plan Común: n.º 3 (doc. B pp. impresas 66-67 / PDF 74-75) | Plan Común, 3.er curso: sem. D, 4, 5, 6 |
| Refracción | 2.º curso Plan Común, cap. 5 (Res. MEC N° 12.506/09 BIS, doc. A pp. 143-145)<br>3.er curso Plan Común (Guía 2021) (doc. C pp. impresas 114-117 / PDF 124-127) | 2.º curso Plan Común: n.º 4 (doc. B pp. impresas 66-67 / PDF 74-75) | Plan Común, 3.er curso: sem. 7 |
| Lentes | 2.º curso Plan Común, cap. 5 (Res. MEC N° 12.506/09 BIS, doc. A pp. 143-145)<br>3.er curso Plan Común (Guía 2021) (doc. C pp. impresas 114-117 / PDF 124-127) | 2.º curso Plan Común: n.º 4 (doc. B pp. impresas 66-67 / PDF 74-75) | Plan Común, 3.er curso: sem. 8 |
| Ondas | 2.º curso Plan Común, cap. 6 (Res. MEC N° 12.506/09 BIS, doc. A pp. 143-145)<br>3.er curso Plan Común (Guía 2021) (doc. C pp. impresas 114-117 / PDF 124-127) | 2.º curso Plan Común: n.º 5 (doc. B pp. impresas 66-67 / PDF 74-75) | Plan Común, 3.er curso: sem. 9, 10 |
| Acústica: el sonido | 2.º curso Plan Común, cap. 7 (Res. MEC N° 12.506/09 BIS, doc. A pp. 143-145)<br>3.er curso Plan Común (Guía 2021) (doc. C pp. impresas 114-117 / PDF 124-127) | 2.º curso Plan Común: n.º 6 (doc. B pp. impresas 66-67 / PDF 74-75) | Plan Común, 3.er curso: sem. 11, 12 |
| Carga eléctrica y electrización | 2.º curso Plan Común, cap. 8 (Res. MEC N° 12.506/09 BIS, doc. A pp. 143-145)<br>3.er curso Plan Específico · Ciencias Básicas, cap. 9 (Res. MEC N° 12.506/09 BIS, doc. A pp. 251-253) | 2.º curso Plan Común: no figura<br>3.er curso Plan Específico · Ciencias Básicas: n.º 8 (doc. B p. impresa 91 / PDF 99) | Plan Específico, 3.er curso: sem. F, 18 |
| Ley de Coulomb | 2.º curso Plan Común, cap. 9 (Res. MEC N° 12.506/09 BIS, doc. A pp. 143-145)<br>3.er curso Plan Común (Guía 2021) (doc. C pp. impresas 114-117 / PDF 124-127)<br>3.er curso Plan Específico · Ciencias Básicas, cap. 10 (Res. MEC N° 12.506/09 BIS, doc. A pp. 251-253) | 2.º curso Plan Común: n.º 7 (doc. B pp. impresas 66-67 / PDF 74-75)<br>3.er curso Plan Específico · Ciencias Básicas: n.º 9 (doc. B p. impresa 91 / PDF 99) | Plan Común, 3.er curso: sem. 13<br>Plan Específico, 3.er curso: sem. F, 19 |
| Campo eléctrico | 2.º curso Plan Común, cap. 10 (Res. MEC N° 12.506/09 BIS, doc. A pp. 143-145)<br>3.er curso Plan Común (Guía 2021) (doc. C pp. impresas 114-117 / PDF 124-127) | 2.º curso Plan Común: n.º 8 (doc. B pp. impresas 66-67 / PDF 74-75) | Plan Común, 3.er curso: sem. E, 14 |
| Potencial eléctrico | 2.º curso Plan Común, cap. 11 (Res. MEC N° 12.506/09 BIS, doc. A pp. 143-145)<br>3.er curso Plan Común (Guía 2021) (doc. C pp. impresas 114-117 / PDF 124-127) | 2.º curso Plan Común: no figura | Plan Común, 3.er curso: sem. E, 15 |
| Condensadores | 2.º curso Plan Común, cap. 12 (Res. MEC N° 12.506/09 BIS, doc. A pp. 143-145)<br>3.er curso Plan Común (Guía 2021) (doc. C pp. impresas 114-117 / PDF 124-127) | 2.º curso Plan Común: n.º 9 (doc. B pp. impresas 66-67 / PDF 74-75) | Plan Común, 3.er curso: sem. F, 16, 17 |
| Corriente y circuito eléctrico | 2.º curso Plan Común, cap. 13 (Res. MEC N° 12.506/09 BIS, doc. A pp. 143-145)<br>3.er curso Plan Común (Guía 2021) (doc. C pp. impresas 114-117 / PDF 124-127)<br>3.er curso Plan Específico · Ciencias Básicas, cap. 11 (Res. MEC N° 12.506/09 BIS, doc. A pp. 251-253) | 2.º curso Plan Común: n.º 10 (doc. B pp. impresas 66-67 / PDF 74-75)<br>3.er curso Plan Específico · Ciencias Básicas: n.º 10 (doc. B p. impresa 91 / PDF 99) | Plan Común, 3.er curso: sem. 18, 19<br>Plan Específico, 3.er curso: sem. 20 |
| Ley de Ohm y resistencias | 2.º curso Plan Común, cap. 14 (Res. MEC N° 12.506/09 BIS, doc. A pp. 143-145)<br>3.er curso Plan Común (Guía 2021) (doc. C pp. impresas 114-117 / PDF 124-127)<br>3.er curso Plan Específico · Ciencias Básicas, cap. 11 (Res. MEC N° 12.506/09 BIS, doc. A pp. 251-253) | 2.º curso Plan Común: n.º 11 (doc. B pp. impresas 66-67 / PDF 74-75)<br>3.er curso Plan Específico · Ciencias Básicas: n.º 10 (doc. B p. impresa 91 / PDF 99) | Plan Común, 3.er curso: sem. 20, 21, 22<br>Plan Específico, 3.er curso: sem. 20 |
| Campo magnético, Oersted y Ampère | 3.er curso Plan Específico · Ciencias Básicas, cap. 12 (Res. MEC N° 12.506/09 BIS, doc. A pp. 251-253) | 3.er curso Plan Específico · Ciencias Básicas: n.º 11 (doc. B p. impresa 91 / PDF 99) | Plan Específico, 3.er curso: sem. 21, 22 |
| Teoría de la Relatividad | 3.er curso Plan Específico · Ciencias Básicas, cap. 13 (Res. MEC N° 12.506/09 BIS, doc. A pp. 251-253) | 3.er curso Plan Específico · Ciencias Básicas: no figura | — |
| Mecánica cuántica | 3.er curso Plan Específico · Ciencias Básicas, cap. 14 (Res. MEC N° 12.506/09 BIS, doc. A pp. 251-253) | 3.er curso Plan Específico · Ciencias Básicas: no figura | — |
