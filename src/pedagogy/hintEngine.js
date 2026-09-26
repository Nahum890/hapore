// Cuatro niveles de pista (observación, concepto, fórmula, cálculo), tal
// como describe la guía del proyecto. El tope real es la cantidad de pistas
// que trae cada ejercicio, para que nunca se desincronice con el contenido.
export const HINT_LEVELS_TOTAL = 4;

export function getHint(exercise, hintsUsed) {
  if (!exercise?.hints?.length) return null;
  const index = Math.min(Math.max(0, hintsUsed), exercise.hints.length - 1);
  return exercise.hints[index];
}

export function totalHints(exercise) {
  return exercise?.hints?.length || HINT_LEVELS_TOTAL;
}

export function hasHintsLeft(exercise, hintsUsed) {
  return Boolean(exercise?.hints?.length) && hintsUsed < totalHints(exercise);
}
