import { useState } from 'react';
import {
  loadLearningState,
  recordExerciseResult,
  recordFlashcardConsolidated,
  setCurrentExercise,
} from '../pedagogy/learningState.js';

export function useOfflineStorage() {
  const [state, setState] = useState(loadLearningState);
  const [hintsUsed, setHintsUsed] = useState(0);

  const onExerciseResult = (result) => setState(recordExerciseResult(result));
  const onFlashcardConsolidated = (flashcardId) => setState(recordFlashcardConsolidated(flashcardId));
  const onSelectExercise = (exerciseId) => {
    setHintsUsed(0);
    setState(setCurrentExercise(exerciseId));
  };
  const incrementHints = () => setHintsUsed((prev) => prev + 1);
  const resetHints = () => setHintsUsed(0);

  return {
    confidence: state.confidence,
    currentExercise: state.currentExercise,
    attempts: state.attempts,
    completed: state.completed,
    flashcardState: state.flashcardState,
    hintsUsed,
    onExerciseResult,
    onFlashcardConsolidated,
    onSelectExercise,
    incrementHints,
    resetHints,
  };
}

export default useOfflineStorage;
