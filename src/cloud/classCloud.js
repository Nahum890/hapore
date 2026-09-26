import { rpc, rest, isCloudConfigured } from './cloudClient.js';
import { readJSON, writeJSON, removeKey } from '../utils/storage.js';

// Paquete de clase que descarga el alumno: queda en su perfil local para
// practicar sin internet. Pendiente de subida: la última foto del avance que
// todavía no llegó a la nube (se reintenta al volver la conexión).
const PACKAGE_KEY = 'guarania:classPackage';
const PENDING_KEY = 'guarania:cloudPendingProgress';

export const CLOUD_CODE_PATTERN = /^[A-HJ-NP-Z2-9]{6}$/;

export function normalizeCloudCode(text) {
  return String(text ?? '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/** Contenido que el docente comparte. Las tarjetas y ejercicios viajan
 * completos para que el alumno los tenga aunque no existan en su navegador. */
export function buildClassContent({ config, cards, exercises }) {
  return {
    version: 1,
    config: { subtemas: config.subtemas, ejercicios: Number(config.ejercicios), flashcards: cards.length },
    cards: cards.map(card => ({
      id: card.id, topic: card.topic ?? 'Movimiento Parabólico', frente_es: card.frente_es ?? card.front ?? '',
      dorso_concepto: card.dorso_concepto ?? card.back ?? '', formula: card.formula ?? '', ...(card.custom ? { custom: true } : {}),
    })),
    exercises,
  };
}

export async function createCloudClass({ title, teacherName, teacherAvatar, content }) {
  const rows = await rpc('create_class', { p_title: title, p_teacher_name: teacherName, p_teacher_avatar: teacherAvatar ?? null, p_content: content });
  const row = Array.isArray(rows) ? rows[0] : rows;
  if (!row?.code) throw new Error('La nube no devolvió un código de clase.');
  return row;
}

export async function listTeacherClasses() {
  const select = 'id,code,title,created_at,class_members(student_id,display_name,avatar,xp,level,attempts,correct,confidence,cards_consolidated,last_sync,joined_at)';
  return rest(session => `classes?select=${select}&teacher_id=eq.${session.userId}&order=created_at.desc`);
}

export async function deleteCloudClass(id) {
  await rest(`classes?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export function getClassPackage() {
  const stored = readJSON(PACKAGE_KEY, null);
  return stored && stored.classId && stored.content ? stored : null;
}

/** "Descargar clase": se une en la nube y guarda todo para usarlo offline. */
export async function downloadClass({ code, displayName, avatar }) {
  const rows = await rpc('join_class', { p_code: normalizeCloudCode(code), p_display_name: displayName, p_avatar: avatar ?? null });
  const row = Array.isArray(rows) ? rows[0] : rows;
  if (!row?.class_id) throw new Error('No se pudo descargar la clase.');
  const pkg = {
    classId: row.class_id, code: row.code, title: row.title,
    teacherName: row.teacher_name, teacherAvatar: row.teacher_avatar,
    content: row.content, downloadedAt: new Date().toISOString(),
  };
  writeJSON(PACKAGE_KEY, pkg);
  return pkg;
}

export async function leaveCloudClass() {
  const pkg = getClassPackage();
  removeKey(PACKAGE_KEY);
  removeKey(PENDING_KEY);
  if (!pkg || !isCloudConfigured()) return;
  try {
    await rest(session => `class_members?class_id=eq.${pkg.classId}&student_id=eq.${session.userId}`, { method: 'DELETE' });
  } catch {
    // Sin conexión: la clase ya se quitó de este dispositivo; el docente la verá hasta que vuelva a sincronizar.
  }
}

export function progressSnapshot(learning) {
  const log = Array.isArray(learning?.attemptLog) ? learning.attemptLog : [];
  const cards = learning?.flashcardState && typeof learning.flashcardState === 'object' ? Object.values(learning.flashcardState) : [];
  return {
    xp: Math.max(0, Math.floor(Number(learning?.xp) || 0)),
    level: Math.max(1, Math.floor(Number(learning?.level?.level) || 1)),
    attempts: Math.max(0, Math.floor(Number(learning?.attempts) || 0)),
    correct: log.filter(item => item?.correct).length,
    confidence: Math.max(0, Math.min(100, Math.round(Number(learning?.confidence) || 0))),
    cards_consolidated: cards.filter(item => item?.consolidated).length,
  };
}

export function queueProgress(snapshot) {
  const pkg = getClassPackage();
  if (!pkg) return null;
  const pending = { classId: pkg.classId, stats: snapshot, at: new Date().toISOString() };
  writeJSON(PENDING_KEY, pending);
  return pending;
}

export function getPendingProgress() {
  return readJSON(PENDING_KEY, null);
}

/** Sube la última foto pendiente. Si no hay conexión, la deja guardada. */
export async function flushProgress() {
  const pending = getPendingProgress();
  if (!pending || !isCloudConfigured()) return { status: pending ? 'pending' : 'idle' };
  try {
    await rest(session => `class_members?class_id=eq.${pending.classId}&student_id=eq.${session.userId}`, {
      method: 'PATCH',
      body: { ...pending.stats, last_sync: new Date().toISOString() },
      headers: { Prefer: 'return=minimal' },
    });
    if (getPendingProgress()?.at === pending.at) removeKey(PENDING_KEY);
    return { status: 'synced', at: new Date().toISOString() };
  } catch (error) {
    return { status: error.offline ? 'offline' : 'error', error };
  }
}
