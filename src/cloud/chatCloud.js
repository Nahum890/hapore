import { getCloudSession, rest } from './cloudClient.js';
import { readJSON, writeJSON } from '../utils/storage.js';

// Chat de la clase sobre la tabla `messages` de Supabase (ver
// supabase/schema.sql). recipient_id null = chat grupal. Las reglas de quién
// ve qué y quién puede enviar imágenes/clases/actividades están en la base
// (RLS); acá solo se arma y se lee. Los últimos mensajes quedan en el perfil
// local para poder leerlos sin conexión.
const CACHE_KEY = 'guarania:chatCache';
const READ_KEY = 'guarania:chatRead';
const CACHE_LIMIT = 80;
export const GROUP = 'grupo';
export const MAX_BODY = 2000;
export const TEACHER_KINDS = ['image', 'lesson', 'activity'];

const COLUMNS = 'id,class_id,sender_id,recipient_id,kind,body,payload,created_at';

export async function getMyCloudId() {
  return (await getCloudSession()).userId;
}

/** Clave de conversación: 'grupo' o el id de la otra persona. */
export function conversationOf(message, myId) {
  if (!message.recipient_id) return GROUP;
  return message.sender_id === myId ? message.recipient_id : message.sender_id;
}

export function fetchMessages(classId, afterId = 0) {
  return rest(`messages?select=${COLUMNS}&class_id=eq.${encodeURIComponent(classId)}&id=gt.${Number(afterId) || 0}&order=id.asc&limit=200`);
}

export function validateMessage({ kind = 'text', body = '', payload = null }) {
  const text = String(body ?? '').trim();
  if (text.length > MAX_BODY) throw new Error(`El mensaje es muy largo (máximo ${MAX_BODY} caracteres).`);
  if (kind === 'text' && !text) throw new Error('Escribí un mensaje.');
  if (kind === 'image' && !/^data:image\/(jpeg|png|webp);base64,/.test(payload?.dataUrl ?? '')) throw new Error('La imagen no es válida.');
  if (kind === 'lesson' && !(payload?.lesson?.slides?.length > 0)) throw new Error('La clase no tiene diapositivas.');
  if (kind === 'activity' && !payload?.exercise?.id) throw new Error('Elegí un ejercicio para la actividad.');
  if (!['text', ...TEACHER_KINDS].includes(kind)) throw new Error('Tipo de mensaje desconocido.');
  return { kind, body: text, payload: kind === 'text' ? null : payload };
}

export async function sendMessage({ classId, recipientId = null, kind = 'text', body = '', payload = null }) {
  const clean = validateMessage({ kind, body, payload });
  const rows = await rest('messages', {
    method: 'POST',
    body: { class_id: classId, recipient_id: recipientId, ...clean },
    headers: { Prefer: 'return=representation' },
  });
  return Array.isArray(rows) ? rows[0] : rows;
}

/** Clase de "Mis clases" lista para enviar: viajan también los ejercicios
 * propios que usa, porque el alumno no los tiene en su dispositivo. */
export function lessonPayload(lesson, allExercises) {
  const ids = new Set(lesson.slides.filter(slide => slide.type === 'ejercicio').map(slide => slide.exerciseId));
  const exercises = allExercises.filter(item => item.custom && ids.has(item.id));
  const { id, title, description, slides } = lesson;
  return { lesson: { id, title, description, slides }, exercises };
}

export function mergeMessages(current, incoming) {
  const byId = new Map(current.map(item => [item.id, item]));
  for (const item of incoming) byId.set(item.id, item);
  return [...byId.values()].sort((a, b) => a.id - b.id);
}

export function getCachedMessages(classId) {
  const cache = readJSON(CACHE_KEY, {});
  return Array.isArray(cache?.[classId]) ? cache[classId] : [];
}

/** Guarda los últimos mensajes. Para no llenar el almacenamiento del
 * dispositivo, solo las últimas imágenes conservan su contenido. */
export function cacheMessages(classId, messages, keepImages = 6) {
  const recent = messages.slice(-CACHE_LIMIT);
  let images = 0;
  const trimmed = [...recent].reverse().map(item => {
    if (item.kind !== 'image') return item;
    images += 1;
    return images > keepImages ? { ...item, payload: null } : item;
  }).reverse();
  const cache = readJSON(CACHE_KEY, {});
  writeJSON(CACHE_KEY, { ...(cache && typeof cache === 'object' ? cache : {}), [classId]: trimmed });
}

export function getReadMarks(classId) {
  const marks = readJSON(READ_KEY, {});
  return marks?.[classId] ?? {};
}

export function markRead(classId, conversation, lastId) {
  const marks = readJSON(READ_KEY, {}) ?? {};
  const forClass = marks[classId] ?? {};
  if ((forClass[conversation] ?? 0) >= lastId) return;
  writeJSON(READ_KEY, { ...marks, [classId]: { ...forClass, [conversation]: lastId } });
}

export function unreadCounts(messages, myId, marks) {
  const counts = {};
  for (const message of messages) {
    if (message.sender_id === myId) continue;
    const key = conversationOf(message, myId);
    if (message.id > (marks[key] ?? 0)) counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}
