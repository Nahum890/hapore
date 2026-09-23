export const HINT_LEVELS_TOTAL = 5;

export function getHint(exercise, hintsUsed) {
  if (!exercise?.hints?.length) return null;
  const index = Math.min(Math.max(0, hintsUsed), exercise.hints.length - 1);
  return exercise.hints[index];
}

export function hasHintsLeft(exercise, hintsUsed) {
  return Boolean(exercise?.hints?.length) && hintsUsed < HINT_LEVELS_TOTAL;
}
