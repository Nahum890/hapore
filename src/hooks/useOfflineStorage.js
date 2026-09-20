import { useState } from 'react';
import {
  loadLearningState,
  recordExerciseResult,
  recordFlashcardConsolidated,
  setCurrentExercise,
} from '../pedagogy/learningState.js';

export function useOfflineStorage() {
  const [state, setState] = useState(loadLearningState);

  const onExerciseResult = (result) => setState(recordExerciseResult(result));
  const onFlashcardConsolidated = (flashcardId) => setState(recordFlashcardConsolidated(flashcardId));
  const onSelectExercise = (exerciseId) => setState(setCurrentExercise(exerciseId));

  return {
    confidence: state.confidence,
    currentExercise: state.currentExercise,
    attempts: state.attempts,
    flashcardState: state.flashcardState,
    onExerciseResult,
    onFlashcardConsolidated,
    onSelectExercise,
  };
}

export default useOfflineStorage;
