import { readJSON, writeJSON, STORAGE_KEYS } from '../utils/storage.js';
import { getConfidence, increaseConfidence, CONFIDENCE_REWARDS } from './confidenceEngine.js';
import { getXP, getLevel, recordXP, XP_REWARDS } from '../utils/gamification.js';

export function loadLearningState() {
  const xp = getXP();
  return {
    confidence: getConfidence(),
    currentExercise: readJSON(STORAGE_KEYS.CURRENT_EXERCISE, null),
    attempts: readJSON(STORAGE_KEYS.ATTEMPTS, 0),
    attemptLog: readJSON(STORAGE_KEYS.ATTEMPT_LOG, []),
    flashcardState: readJSON(STORAGE_KEYS.FLASHCARD_STATE, {}),
    completed: readJSON(STORAGE_KEYS.COMPLETED, []),
    xp,
    level: getLevel(xp),
  };
}

export function recordExerciseResult({ correct, hintsUsed = 0, exerciseId = null, durationMs = 0 } = {}) {
  const completed = readJSON(STORAGE_KEYS.COMPLETED, []);
  const alreadyCompleted = Boolean(correct && exerciseId && completed.includes(exerciseId));
  const reward = alreadyCompleted
    ? CONFIDENCE_REWARDS.mistake
    : !correct
      ? CONFIDENCE_REWARDS.mistake
      : hintsUsed > 0
        ? CONFIDENCE_REWARDS.exerciseWithHints
        : CONFIDENCE_REWARDS.exerciseClean;
  const xpReward = alreadyCompleted
    ? 0
    : !correct
      ? 0
      : hintsUsed > 0
        ? XP_REWARDS.exerciseWithHints
        : XP_REWARDS.exerciseClean;
  if (xpReward > 0) {
    recordXP(xpReward);
  }
  increaseConfidence(reward);
  const attempts = readJSON(STORAGE_KEYS.ATTEMPTS, 0) + 1;
  writeJSON(STORAGE_KEYS.ATTEMPTS, attempts);
  const attemptLog = readJSON(STORAGE_KEYS.ATTEMPT_LOG, []);
  writeJSON(STORAGE_KEYS.ATTEMPT_LOG, [...attemptLog, { exerciseId, correct: Boolean(correct), hintsUsed: Math.max(0, Number(hintsUsed) || 0), durationMs: Math.max(0, Math.round(Number(durationMs) || 0)), at: new Date().toISOString() }].slice(-200));
  if (correct && exerciseId && !alreadyCompleted) {
    writeJSON(STORAGE_KEYS.COMPLETED, [...completed, exerciseId]);
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
    recordXP(XP_REWARDS.flashcardConsolidated);
    increaseConfidence(CONFIDENCE_REWARDS.flashcardConsolidated);
  }
  return loadLearningState();
}

export function recordQuizAnswer({ questionId = null, correct = false } = {}) {
  const rewarded = readJSON(STORAGE_KEYS.QUIZ_REWARDED, []);
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
