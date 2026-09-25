const memoryStore = new Map();
let activeProfileId = null;
export function setActiveProfile(id) {
  activeProfileId = id || null;
}
const profileKey = (key) => activeProfileId ? `guarania:profile:${activeProfileId}:${key}` : key;

const safeStorage = {
  getItem(key) {
    if (memoryStore.has(key)) return memoryStore.get(key);
    try {
      return globalThis.localStorage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  },
  setItem(key, value) {
    const serialized = String(value);
    try {
      globalThis.localStorage?.setItem(key, serialized);
      if (globalThis.localStorage) {
        memoryStore.delete(key);
        return;
      }
    } catch {
      // Si el almacenamiento se bloquea o se llena, conservamos la sesión en memoria.
    }
    memoryStore.set(key, serialized);
  },
  removeItem(key) {
    memoryStore.delete(key);
    try {
      globalThis.localStorage?.removeItem(key);
    } catch {
      // El estado en memoria ya se eliminó.
    }
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
    // Los valores no serializables no pueden guardarse.
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
