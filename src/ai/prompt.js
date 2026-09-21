/**
 * Prompts para el futuro tutor con modelo local.
 * En esta versión no se usan en producción: quedan preparados para que
 * LocalAIProvider los consuma cuando se conecte el modelo.
 *
 * Regla clave: el modelo NUNCA valida resultados numéricos ni decide si una
 * respuesta es correcta; eso lo hace physicsValidator con cálculo físico.
 */

export const SYSTEM_PROMPT = [
  'Sos "Jopara", el tutor de Física de GuaranIA.',
  'Respondé en castellano sencillo con apoyos cortos en jopara (guaraní paraguayo).',
  'Tu trabajo es guiar con pistas progresivas, no dar la respuesta directa.',
  'Nunca valides resultados numéricos: la corrección la calcula el motor de Física de la app.',
  'Si el estudiante se equivoca, señalá el error frecuente asociado y proponé un paso concreto.',
  'Mantené las respuestas cortas para pantalla de celular.',
].join(' ');

export function buildTutorPrompt(context = {}) {
  const { type = 'hint', exercise, expectedConcept, hintsUsed = 0 } = context;
  const parts = [`Tipo de interacción: ${type}.`];
  if (exercise) {
    parts.push(`Ejercicio (${exercise.difficulty ?? 'básico'}): ${exercise.question}`);
    parts.push(`Concepto esperado: ${exercise.expectedConcept ?? expectedConcept ?? 'desconocido'}.`);
    parts.push(`Datos: ${JSON.stringify(exercise.values ?? {})}.`);
  }
  if (expectedConcept && !exercise) {
    parts.push(`Concepto esperado: ${expectedConcept}.`);
  }
  parts.push(`Pistas ya mostradas: ${hintsUsed}.`);
  parts.push('No repitas pistas anteriores y no reveles la respuesta final.');
  return parts.join(' ');
}

/**
 * Prompt para el diagnóstico cerrado que entrega el motor de Física.
 * El modelo solo interpreta y redacta la guía pedagógica en Jopara:
 * jamás calcula trayectoria, alcance o tiempo de vuelo, ni valida números.
 */
export function buildDiagnosticPrompt(context = {}) {
  const {
    message,
    subtema,
    ejercicio,
    respuestaAlumno,
    respuestaCorrecta,
    tipoError,
    nivelPista = 0,
  } = context;
  const parts = [];
  if (message) parts.push(`Consulta del estudiante: ${message}.`);
  if (subtema) parts.push(`Subtema: ${subtema}.`);
  if (ejercicio) parts.push(`Ejercicio: ${ejercicio}.`);
  if (respuestaAlumno !== null && respuestaAlumno !== undefined) {
    parts.push(`Respuesta del alumno: ${respuestaAlumno}.`);
  }
  if (respuestaCorrecta !== null && respuestaCorrecta !== undefined) {
    parts.push(`Resultado correcto (ya calculado por el motor de Física): ${respuestaCorrecta}.`);
  }
  if (tipoError) parts.push(`Tipo de error detectado: ${tipoError}.`);
  parts.push(`Nivel de pista: ${nivelPista}.`);
  parts.push(
    'Redactá una guía pedagógica progresiva en jopara, corta para pantalla de celular.',
    'No reveles el resultado final, no repitas pistas anteriores y no valides números.',
  );
  return parts.join(' ');
}
