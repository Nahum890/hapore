import { readJSON, writeJSON } from '../utils/storage.js';
import { isCloudConfigured } from './cloudClient.js';

// Cola de cambios del docente (presentaciones y ejercicios propios) que
// todavía no llegaron a Supabase. Se guarda en el dispositivo, así que un
// cambio hecho sin internet se sube cuando vuelve la conexión.
export const TEACHER_SYNC_QUEUE_KEY = 'guarania:teacherSyncQueue';
const listeners = new Set();

export function pendingTeacherSync() {
  const queue = readJSON(TEACHER_SYNC_QUEUE_KEY, []);
  return Array.isArray(queue) ? queue : [];
}

export function writeTeacherSyncQueue(queue) {
  writeJSON(TEACHER_SYNC_QUEUE_KEY, queue);
  listeners.forEach(listener => { try { listener(queue.length); } catch { /* UI */ } });
}

export function subscribeTeacherSync(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

let flushHandler = null;
/** teacherContent.js registra acá la función que sube la cola. */
export function registerTeacherFlush(handler) { flushHandler = handler; }

/** Anota un cambio (el último cambio de cada elemento reemplaza al anterior). */
export function queueTeacherSync(kind, item, deleted = false) {
  // kind: 'lesson' | 'exercise' | 'flags'
  if (!isCloudConfigured() || !item?.id) return;
  const entry = { kind, itemId: String(item.id), data: deleted ? {} : item, deleted, updatedAt: new Date().toISOString() };
  const queue = pendingTeacherSync().filter(existing => !(existing.kind === kind && existing.itemId === entry.itemId));
  writeTeacherSyncQueue([...queue, entry]);
  flushHandler?.();
}
