const memoryStore = new Map();
let activeProfileId = null;
export function setActiveProfile(id) {
  activeProfileId = id || null;
}
const profileKey = (key) => activeProfileId ? `guarania:profile:${activeProfileId}:${key}` : key;

const safeStorage = {
  getItem(key) {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : memoryStore.has(key) ? memoryStore.get(key) : null;
  },
  setItem(key, value) {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
    else memoryStore.set(key, String(value));
  },
  removeItem(key) {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
    else memoryStore.delete(key);
  },
};

export const STORAGE_KEYS = {
  CONFIDENCE: 'guarania:confidence',
  CURRENT_EXERCISE: 'guarania:currentExercise',
  ATTEMPTS: 'guarania:attempts',
  FLASHCARD_STATE: 'guarania:flashcardState',
  COMPLETED: 'guarania:completed',
  XP: 'guarania:xp',
  QUIZ_REWARDED: 'guarania:quizRewarded',
  CHAT_HISTORY: 'guarania_chat_history',
  ATTEMPT_LOG: 'guarania:attemptLog',
};

export function readJSON(key, fallback) {
  try {
    const raw = safeStorage.getItem(profileKey(key));
    if (raw === null || raw === undefined) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function writeJSON(key, value) {
  try {
    safeStorage.setItem(profileKey(key), JSON.stringify(value));
  } catch {
    // Almacenamiento no disponible o lleno: el progreso se mantiene solo en memoria.
  }
}

export function removeKey(key) {
  try {
    safeStorage.removeItem(profileKey(key));
  } catch {
    // noop
  }
}

export default safeStorage;
