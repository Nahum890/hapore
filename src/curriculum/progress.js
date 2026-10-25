// Preferencias y progreso del alumno en los temas (por cuenta, en el
// dispositivo; storage.js ya separa los datos de cada perfil).
import { readJSON, writeJSON } from '../utils/storage.js';
import { COURSES } from './curriculum.js';

const KEYS = { mine: 'pyfis:myTopics', course: 'pyfis:course', last: 'pyfis:lastTopic', teacher: 'pyfis:teacherTopics' };

export const getMyTopics = () => { const value = readJSON(KEYS.mine, []); return Array.isArray(value) ? value : []; };
export function toggleMyTopic(topicId) {
  const current = getMyTopics();
  const next = current.includes(topicId) ? current.filter(id => id !== topicId) : [...current, topicId];
  writeJSON(KEYS.mine, next);
  return next;
}

export const getCourse = () => { const value = readJSON(KEYS.course, 'c1'); return COURSES.some(course => course.id === value) ? value : 'c1'; };
export const setCourse = courseId => writeJSON(KEYS.course, courseId);

export const getLastTopic = () => readJSON(KEYS.last, null);
export const setLastTopic = topicId => writeJSON(KEYS.last, topicId);

/** Temas elegidos por el docente en este dispositivo (plan local). */
export const getTeacherTopics = () => { const value = readJSON(KEYS.teacher, []); return Array.isArray(value) ? value : []; };
export const setTeacherTopics = ids => writeJSON(KEYS.teacher, [...new Set(ids)]);

// Los ejercicios fijos de tiro parabólico guardan su situación (dron,
// básquet, paredón) en vez del id del tema.
const LEGACY_SCENARIOS = { dron: 'movimiento-parabolico', basketball: 'movimiento-parabolico', wall: 'movimiento-parabolico' };

/** Ejercicios resueltos bien por tema (a partir del registro de intentos). */
export function topicStats(attemptLog = []) {
  const stats = {};
  for (const attempt of attemptLog) {
    const id = LEGACY_SCENARIOS[attempt?.scenario] ?? attempt?.scenario;
    if (!id) continue;
    stats[id] ??= { attempts: 0, correct: 0 };
    stats[id].attempts += 1;
    if (attempt.correct) stats[id].correct += 1;
  }
  return stats;
}
