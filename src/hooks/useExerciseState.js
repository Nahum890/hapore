import { useCallback, useEffect, useRef, useState } from 'react';
import { getHint, hasHintsLeft } from '../pedagogy/hintEngine.js';
import { validateExercise } from '../physics/physicsValidator.js';

export function useExerciseState(exercise, callbacks = {}) {
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  const [answer, setAnswer] = useState('');
  const [hintsUsed, setHintsUsed] = useState(0);
  const [currentHint, setCurrentHint] = useState(null);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    setAnswer('');
    setHintsUsed(0);
    setCurrentHint(null);
    setFeedback(null);
  }, [exercise?.id]);

  const changeAnswer = useCallback((value) => setAnswer(value), []);

  const check = useCallback(() => {
    if (!exercise) return null;
    const result = validateExercise(exercise, answer);
    setFeedback({
      status: result.correct ? 'success' : 'error',
      message: result.correct
        ? '¡Ikatu! Respuesta correcta.'
        : 'Todavía no. Revisá la pista del tutor y volvé a intentarlo.',
    });
    callbacksRef.current.onResult?.({ correct: result.correct, hintsUsed });
    if (!result.correct) {
      callbacksRef.current.onMistake?.({
        expectedConcept: exercise.expectedConcept,
        exerciseId: exercise.id,
      });
    }
    return result;
  }, [exercise, answer, hintsUsed]);

  const requestHint = useCallback(() => {
    if (!hasHintsLeft(exercise, hintsUsed)) return null;
    const hint = getHint(exercise, hintsUsed);
    setCurrentHint(hint);
    setHintsUsed(hintsUsed + 1);
    return hint;
  }, [exercise, hintsUsed]);

  return {
    answer,
    feedback,
    hintsUsed,
    currentHint,
    hasHints: hasHintsLeft(exercise, hintsUsed),
    changeAnswer,
    check,
    requestHint,
  };
}

export default useExerciseState;
