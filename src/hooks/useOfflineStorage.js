import { useCallback, useEffect, useState } from 'react';
import {
  loadLearningState,
  recordExerciseResult,
  recordFlashcardConsolidated,
  recordQuizAnswer,
  setCurrentExercise,
} from '../pedagogy/learningState.js';
import { STORAGE_KEYS } from '../utils/storage.js';

const LEARNING_KEYS = [
  STORAGE_KEYS.CONFIDENCE,
  STORAGE_KEYS.CURRENT_EXERCISE,
  STORAGE_KEYS.ATTEMPTS,
  STORAGE_KEYS.ATTEMPT_LOG,
  STORAGE_KEYS.FLASHCARD_STATE,
  STORAGE_KEYS.COMPLETED,
  STORAGE_KEYS.XP,
  STORAGE_KEYS.QUIZ_REWARDED,
];

const matchesStorageKey = (eventKey, key) => eventKey === key || eventKey?.endsWith(`:${key}`);

export function useOfflineStorage() {
  const [state, setState] = useState(loadLearningState);
  const [hintsUsed, setHintsUsed] = useState(0);

  useEffect(() => {
    const sync = (event) => {
      if (event.key !== null && !LEARNING_KEYS.some((key) => matchesStorageKey(event.key, key))) return;
      setState(loadLearningState());
      if (event.key === null || matchesStorageKey(event.key, STORAGE_KEYS.CURRENT_EXERCISE)) setHintsUsed(0);
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  const onExerciseResult = useCallback((result) => setState(recordExerciseResult(result)), []);
  const onFlashcardConsolidated = useCallback((flashcardId) => setState(recordFlashcardConsolidated(flashcardId)), []);
  const onQuizAnswer = useCallback((result) => setState(recordQuizAnswer(result)), []);
  const onSelectExercise = useCallback((exerciseId) => {
    setHintsUsed(0);
    setState(setCurrentExercise(exerciseId));
  }, []);
  const incrementHints = useCallback(() => setHintsUsed((prev) => Math.min(prev + 1, 4)), []);
  const resetHints = useCallback(() => setHintsUsed(0), []);

  return {
    confidence: state.confidence,
    currentExercise: state.currentExercise,
    attempts: state.attempts,
    attemptLog: state.attemptLog,
    completed: state.completed,
    flashcardState: state.flashcardState,
    xp: state.xp,
    level: state.level,
    hintsUsed,
    onExerciseResult,
    onFlashcardConsolidated,
    onQuizAnswer,
    onSelectExercise,
    incrementHints,
    resetHints,
  };
}

export default useOfflineStorage;
