import { readJSON, writeJSON, STORAGE_KEYS } from '../utils/storage.js';

export const CONFIDENCE_MIN = 0;
export const CONFIDENCE_MAX = 100;

export const CONFIDENCE_REWARDS = {
  exerciseClean: 25,
  exerciseWithHints: 15,
  flashcardConsolidated: 5,
  mistake: 0,
};

function clamp(value) {
  return Math.min(CONFIDENCE_MAX, Math.max(CONFIDENCE_MIN, value));
}

export function getConfidence() {
  const raw = readJSON(STORAGE_KEYS.CONFIDENCE, CONFIDENCE_MIN);
  const value = Number(raw);
  return clamp(Number.isFinite(value) ? value : CONFIDENCE_MIN);
}

export function increaseConfidence(amount) {
  const current = getConfidence();
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
    // Solo se aceptan incrementos positivos: la confianza nunca disminuye.
    return current;
  }
  const next = clamp(current + amount);
  writeJSON(STORAGE_KEYS.CONFIDENCE, next);
  return next;
}
