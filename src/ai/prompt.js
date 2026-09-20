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
