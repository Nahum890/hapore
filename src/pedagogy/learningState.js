import { readJSON, writeJSON, STORAGE_KEYS } from '../utils/storage.js';
import { getConfidence, increaseConfidence, CONFIDENCE_REWARDS } from './confidenceEngine.js';
import { getXP, getLevel, recordXP, XP_REWARDS } from '../utils/gamification.js';

const storedList = (key) => {
  const value = readJSON(key, []);
  return Array.isArray(value) ? value : [];
};

const storedFlashcards = () => {
  const value = readJSON(STORAGE_KEYS.FLASHCARD_STATE, {});
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
};

const storedAttempts = () => {
  const value = Number(readJSON(STORAGE_KEYS.ATTEMPTS, 0));
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
};

export function loadLearningState() {
  const xp = getXP();
  return {
    confidence: getConfidence(),
    currentExercise: readJSON(STORAGE_KEYS.CURRENT_EXERCISE, null),
    attempts: storedAttempts(),
    flashcardState: storedFlashcards(),
    completed: storedList(STORAGE_KEYS.COMPLETED),
    xp,
    level: getLevel(xp),
  };
}

export function recordExerciseResult({ correct, hintsUsed = 0, exerciseId = null } = {}) {
  const completed = storedList(STORAGE_KEYS.COMPLETED);
  const alreadyCompleted = Boolean(exerciseId && completed.includes(exerciseId));
  const reward = alreadyCompleted
    ? CONFIDENCE_REWARDS.mistake
    : !correct || !exerciseId
      ? CONFIDENCE_REWARDS.mistake
      : hintsUsed > 0
        ? CONFIDENCE_REWARDS.exerciseWithHints
        : CONFIDENCE_REWARDS.exerciseClean;
  const xpReward = alreadyCompleted
    ? 0
    : !correct || !exerciseId
      ? 0
      : hintsUsed > 0
        ? XP_REWARDS.exerciseWithHints
        : XP_REWARDS.exerciseClean;
  if (xpReward > 0) {
    recordXP(xpReward);
  }
  increaseConfidence(reward);
  const attempts = storedAttempts() + 1;
  writeJSON(STORAGE_KEYS.ATTEMPTS, attempts);
  if (correct && exerciseId && !alreadyCompleted) {
    writeJSON(STORAGE_KEYS.COMPLETED, [...completed, exerciseId]);
  }
  return loadLearningState();
}

export function recordFlashcardConsolidated(flashcardId) {
  if (!flashcardId) return loadLearningState();
  const state = storedFlashcards();
  const entry = state[flashcardId] && typeof state[flashcardId] === 'object'
    ? state[flashcardId]
    : { consolidated: false, reviews: 0 };
  const firstConsolidation = !entry.consolidated;
  const previousReviews = Number(entry.reviews);
  writeJSON(STORAGE_KEYS.FLASHCARD_STATE, {
    ...state,
    [flashcardId]: {
      consolidated: true,
      reviews: (Number.isFinite(previousReviews) ? Math.max(0, Math.floor(previousReviews)) : 0) + 1,
    },
  });
  if (firstConsolidation) {
    recordXP(XP_REWARDS.flashcardConsolidated);
    increaseConfidence(CONFIDENCE_REWARDS.flashcardConsolidated);
  }
  return loadLearningState();
}

export function recordQuizAnswer({ questionId = null, correct = false } = {}) {
  const rewarded = storedList(STORAGE_KEYS.QUIZ_REWARDED);
  const alreadyRewarded = Boolean(correct && questionId && rewarded.includes(questionId));
  if (correct && questionId && !alreadyRewarded) {
    recordXP(XP_REWARDS.quizAnswer);
    writeJSON(STORAGE_KEYS.QUIZ_REWARDED, [...rewarded, questionId]);
  }
  return loadLearningState();
}

export function setCurrentExercise(exerciseId) {
  writeJSON(STORAGE_KEYS.CURRENT_EXERCISE, exerciseId);
  return loadLearningState();
}
