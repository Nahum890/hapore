import storage from './storage.js';

// Vínculo local docente-alumno: igual que los ejercicios propios, vive en
// este dispositivo (una computadora de aula compartida), no en un servidor.
// Un código de clase es una cadena corta derivada de la configuración
// (encodeClassConfig): dos docentes que elijan exactamente la misma
// configuración generan el mismo código. Es una limitación conocida del
// formato de código (pensado para ser corto y memorizable, no único
// globalmente); en ese caso el registro más reciente es el que queda.
const CLASS_CODES_KEY = 'guarania:classCodes';
const ROSTER_KEY = 'guarania:classRoster';

function readList(key) {
  try {
    const raw = storage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeList(key, list) {
  try {
    storage.setItem(key, JSON.stringify(list));
  } catch {
    // Si no se puede guardar, el vínculo queda solo para esta sesión.
  }
}

export function registerClassCode({ teacherId, code, config }) {
  if (!teacherId || !code) return;
  const list = readList(CLASS_CODES_KEY).filter(item => item.code !== code);
  list.push({ code, teacherId, config, createdAt: new Date().toISOString() });
  writeList(CLASS_CODES_KEY, list);
}

export function getClassCodeOwner(code) {
  if (!code) return null;
  const entry = readList(CLASS_CODES_KEY).find(item => item.code === code);
  return entry?.teacherId ?? null;
}

export function joinClass({ studentId, code }) {
  if (!studentId || !code) return;
  const teacherId = getClassCodeOwner(code);
  const list = readList(ROSTER_KEY).filter(item => item.studentId !== studentId);
  list.push({ studentId, teacherId, code, joinedAt: new Date().toISOString() });
  writeList(ROSTER_KEY, list);
}

export function leaveClass(studentId) {
  if (!studentId) return;
  writeList(ROSTER_KEY, readList(ROSTER_KEY).filter(item => item.studentId !== studentId));
}

export function getTeacherLinkForStudent(studentId) {
  if (!studentId) return null;
  return readList(ROSTER_KEY).find(item => item.studentId === studentId) ?? null;
}

export function getRosterForTeacher(teacherId) {
  if (!teacherId) return [];
  return readList(ROSTER_KEY).filter(item => item.teacherId === teacherId);
}
