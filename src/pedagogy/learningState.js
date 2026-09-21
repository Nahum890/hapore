import { readJSON, writeJSON, STORAGE_KEYS } from '../utils/storage.js';
import { getConfidence, increaseConfidence, CONFIDENCE_REWARDS } from './confidenceEngine.js';

export function loadLearningState() {
  return {
    confidence: getConfidence(),
    currentExercise: readJSON(STORAGE_KEYS.CURRENT_EXERCISE, null),
    attempts: readJSON(STORAGE_KEYS.ATTEMPTS, 0),
    flashcardState: readJSON(STORAGE_KEYS.FLASHCARD_STATE, {}),
    completed: readJSON(STORAGE_KEYS.COMPLETED, []),
  };
}

export function recordExerciseResult({ correct, hintsUsed = 0, exerciseId = null } = {}) {
  const reward = !correct
    ? CONFIDENCE_REWARDS.mistake
    : hintsUsed > 0
      ? CONFIDENCE_REWARDS.exerciseWithHints
      : CONFIDENCE_REWARDS.exerciseClean;
  increaseConfidence(reward);
  const attempts = readJSON(STORAGE_KEYS.ATTEMPTS, 0) + 1;
  writeJSON(STORAGE_KEYS.ATTEMPTS, attempts);
  if (correct && exerciseId) {
    const completed = readJSON(STORAGE_KEYS.COMPLETED, []);
    if (!completed.includes(exerciseId)) {
      writeJSON(STORAGE_KEYS.COMPLETED, [...completed, exerciseId]);
    }
  }
  return loadLearningState();
}

export function recordFlashcardConsolidated(flashcardId) {
  if (!flashcardId) return loadLearningState();
  const state = readJSON(STORAGE_KEYS.FLASHCARD_STATE, {});
  const entry = state[flashcardId] ?? { consolidated: false, reviews: 0 };
  const firstConsolidation = !entry.consolidated;
  writeJSON(STORAGE_KEYS.FLASHCARD_STATE, {
    ...state,
    [flashcardId]: { consolidated: true, reviews: entry.reviews + 1 },
  });
  if (firstConsolidation) {
    increaseConfidence(CONFIDENCE_REWARDS.flashcardConsolidated);
  }
  return loadLearningState();
}

export function setCurrentExercise(exerciseId) {
  writeJSON(STORAGE_KEYS.CURRENT_EXERCISE, exerciseId);
  return loadLearningState();
}
