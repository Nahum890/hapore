const memoryStore = new Map();

const safeStorage =
  typeof localStorage !== 'undefined'
    ? localStorage
    : {
        getItem(key) {
          return memoryStore.has(key) ? memoryStore.get(key) : null;
        },
        setItem(key, value) {
          memoryStore.set(key, String(value));
        },
        removeItem(key) {
          memoryStore.delete(key);
        },
      };

export const STORAGE_KEYS = {
  CONFIDENCE: 'guarania:confidence',
  CURRENT_EXERCISE: 'guarania:currentExercise',
  ATTEMPTS: 'guarania:attempts',
  FLASHCARD_STATE: 'guarania:flashcardState',
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
    // Almacenamiento no disponible o lleno: el progreso se mantiene solo en memoria.
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
