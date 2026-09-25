const memoryStore = new Map();

// Acceder a localStorage puede lanzar SecurityError incluso antes de llamar
// getItem (por ejemplo, con almacenamiento bloqueado por el navegador).
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
      // La cuota puede agotarse durante una sesión: conservamos el último valor.
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
};

export function readJSON(key, fallback) {
  try {
    const raw = safeStorage.getItem(key);
    if (raw === null || raw === undefined) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function writeJSON(key, value) {
  try {
    safeStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Valores no serializables no pueden guardarse.
  }
}

export function removeKey(key) {
  try {
    safeStorage.removeItem(key);
  } catch {
    // noop
  }
}

export default safeStorage;
