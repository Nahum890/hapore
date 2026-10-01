import { isCloudConfigured, rest } from './cloudClient.js';
import { pendingTeacherSync, registerTeacherFlush, writeTeacherSyncQueue } from './teacherSyncQueue.js';
import { getLessons, replaceLessons } from '../utils/lessons.js';
import { getCustomExercises, replaceCustomExercises } from '../utils/customExercises.js';
import { replaceFlagState } from '../pedagogy/flags.js';

// Respaldo en Supabase de lo que crea el docente: presentaciones de clase y
// ejercicios propios. Todo sigue funcionando sin internet (se guarda primero
// en el dispositivo); la cola se sube apenas hay conexión y, al volver a
// entrar, se recupera lo guardado en la nube.
let flushing = null;

function isMissingTable(error) {
  return error?.status === 404 || /teacher_content|relation .* does not exist|schema cache/i.test(error?.message ?? '');
}

export async function flushTeacherSync() {
  if (!isCloudConfigured() || (typeof navigator !== 'undefined' && navigator.onLine === false)) return false;
  if (flushing) return flushing;
  flushing = (async () => {
    const queue = pendingTeacherSync();
    if (!queue.length) return true;
    try {
      await rest('teacher_content?on_conflict=owner_id,kind,item_id', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: queue.map(entry => ({ kind: entry.kind, item_id: entry.itemId, data: entry.data ?? {}, deleted: Boolean(entry.deleted), updated_at: entry.updatedAt })),
      });
      // Solo se sacan de la cola los cambios que se enviaron (pudo entrar otro mientras tanto).
      const sent = new Set(queue.map(entry => `${entry.kind}:${entry.itemId}:${entry.updatedAt}`));
      writeTeacherSyncQueue(pendingTeacherSync().filter(entry => !sent.has(`${entry.kind}:${entry.itemId}:${entry.updatedAt}`)));
      return true;
    } catch (error) {
      if (isMissingTable(error)) console.warn('Falta ejecutar supabase/migrations/20260927_teacher_content.sql en Supabase.');
      return false;
    } finally {
      flushing = null;
    }
  })();
  return flushing;
}
registerTeacherFlush(() => { flushTeacherSync(); });

function mergeByTime(local, remote, getTime) {
  const byId = new Map(local.map(item => [item.id, item]));
  for (const row of remote) {
    const current = byId.get(row.item_id);
    const remoteTime = Date.parse(row.updated_at) || 0;
    const localTime = current ? Date.parse(getTime(current)) || 0 : 0;
    if (current && localTime > remoteTime) continue; // lo local es más nuevo: se sube con la cola
    if (row.deleted) byId.delete(row.item_id);
    else if (row.data?.id) byId.set(row.item_id, row.data);
  }
  return [...byId.values()];
}

/** Trae de Supabase las presentaciones y ejercicios del docente y los combina con los locales. */
export async function pullTeacherContent() {
  if (!isCloudConfigured() || (typeof navigator !== 'undefined' && navigator.onLine === false)) return false;
  await flushTeacherSync();
  try {
    const rows = await rest('teacher_content?select=kind,item_id,data,deleted,updated_at&order=updated_at.asc');
    if (!Array.isArray(rows) || !rows.length) return true;
    const pending = new Set(pendingTeacherSync().map(entry => `${entry.kind}:${entry.itemId}`));
    const fresh = rows.filter(row => !pending.has(`${row.kind}:${row.item_id}`));
    replaceLessons(mergeByTime(getLessons(), fresh.filter(row => row.kind === 'lesson'), item => item.updatedAt));
    replaceCustomExercises(mergeByTime(getCustomExercises(), fresh.filter(row => row.kind === 'exercise'), item => item.createdAt));
    const flags = fresh.filter(row => row.kind === 'flags' && !row.deleted).at(-1);
    if (flags?.data) replaceFlagState(flags.data);
    return true;
  } catch (error) {
    if (isMissingTable(error)) console.warn('Falta ejecutar supabase/migrations/20260927_teacher_content.sql en Supabase.');
    return false;
  }
}

/** Al entrar un docente: sube lo pendiente, recupera lo guardado y reintenta al volver internet. */
export function startTeacherSync() {
  if (!isCloudConfigured()) return () => {};
  pullTeacherContent();
  const onOnline = () => pullTeacherContent();
  window.addEventListener('online', onOnline);
  return () => window.removeEventListener('online', onOnline);
}
