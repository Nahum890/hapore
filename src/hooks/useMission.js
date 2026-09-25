import { useCallback, useMemo } from 'react';

export function buildMission(exercise, index, total) {
  if (!exercise) return null;
  return {
    id: exercise.id,
    index,
    total,
    exercise,
    objective: `Misión: ${exercise.question}`,
  };
}

export function useMission(exercises, currentExerciseId, onChange) {
  const foundIndex = exercises.findIndex((exercise) => exercise.id === currentExerciseId);
  const index = foundIndex >= 0 ? foundIndex : 0;
  const currentExercise = exercises[index];

  const mission = useMemo(
    () => buildMission(currentExercise, index, exercises.length),
    [currentExercise, index, exercises.length],
  );

  const goTo = useCallback(
    (targetIndex) => {
      if (exercises.length === 0) return;
      const clampedIndex = Math.min(Math.max(targetIndex, 0), exercises.length - 1);
      const nextExercise = exercises[clampedIndex];
      if (nextExercise && nextExercise.id !== currentExerciseId) {
        onChange?.(nextExercise.id);
      }
    },
    [exercises, currentExerciseId, onChange],
  );

  const next = useCallback(() => goTo(index + 1), [goTo, index]);
  const prev = useCallback(() => goTo(index - 1), [goTo, index]);

  return { mission, currentExercise, index, next, prev };
}

export default useMission;
