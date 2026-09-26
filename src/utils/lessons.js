import { readJSON, writeJSON } from './storage.js';

// Clases armadas por el docente, tipo presentación: una lista ordenada de
// diapositivas que se editan antes y se proyectan después. Se guardan en el
// perfil del docente (cada cuenta ve solo sus clases), en este dispositivo.
const LESSONS_KEY = 'guarania:lessons';

export const SLIDE_TYPES = [
  { type: 'titulo', label: 'Portada', description: 'Título y subtítulo de la clase.' },
  { type: 'texto', label: 'Texto', description: 'Explicación o lista de ideas.' },
  { type: 'concepto', label: 'Concepto', description: 'Definición y fórmula del catálogo.' },
  { type: 'ejercicio', label: 'Ejercicio', description: 'Un problema con sus datos.' },
  { type: 'simulador', label: 'Simulación', description: 'Un lanzamiento con los valores que elijas.' },
];

export const GRAVITY_PRESETS = [
  { value: 9.8, label: 'Tierra · 9,8' },
  { value: 10, label: 'Aula · 10' },
  { value: 1.62, label: 'Luna · 1,62' },
  { value: 3.71, label: 'Marte · 3,71' },
];

const newId = prefix => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export function createSlide(type, defaults = {}) {
  const base = { id: newId('slide'), type };
  if (type === 'titulo') return { ...base, title: defaults.title ?? 'Movimiento parabólico', subtitle: defaults.subtitle ?? '' };
  if (type === 'texto') return { ...base, title: '', body: '' };
  if (type === 'concepto') return { ...base, conceptId: defaults.conceptId ?? '' };
  if (type === 'ejercicio') return { ...base, exerciseId: defaults.exerciseId ?? '' };
  if (type === 'simulador') return { ...base, title: '', v0: 20, angle: 45, gravity: 9.8, compare: false, v0B: 20, angleB: 30 };
  throw new Error(`Tipo de diapositiva desconocido: ${type}`);
}

export function createLesson(title = 'Nueva clase') {
  const now = new Date().toISOString();
  const name = String(title).trim() || 'Nueva clase';
  return { id: newId('lesson'), title: name, description: '', createdAt: now, updatedAt: now, slides: [createSlide('titulo', { title: name })] };
}

/** Valida los valores de un lanzamiento sin imponer topes arbitrarios: solo
 * exige que tengan sentido físico (velocidad y gravedad positivas, ángulo
 * entre 0° y 90°). Devuelve un mensaje por campo inválido. */
export function launchErrors({ v0, angle, gravity }) {
  const errors = {};
  if (!(Number(v0) > 0)) errors.v0 = 'La velocidad inicial tiene que ser mayor que 0.';
  if (!(Number(angle) > 0 && Number(angle) < 90)) errors.angle = 'El ángulo tiene que estar entre 0° y 90°.';
  if (!(Number(gravity) > 0)) errors.gravity = 'La gravedad tiene que ser mayor que 0.';
  return errors;
}

export function moveItem(list, from, to) {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function getLessons() {
  const stored = readJSON(LESSONS_KEY, []);
  return Array.isArray(stored) ? stored : [];
}

export function saveLesson(lesson) {
  const updated = { ...lesson, updatedAt: new Date().toISOString() };
  const list = getLessons();
  const index = list.findIndex(item => item.id === lesson.id);
  const next = index === -1 ? [...list, updated] : list.map(item => (item.id === lesson.id ? updated : item));
  writeJSON(LESSONS_KEY, next);
  return updated;
}

export function deleteLesson(id) {
  writeJSON(LESSONS_KEY, getLessons().filter(item => item.id !== id));
}

export function duplicateLesson(id) {
  const original = getLessons().find(item => item.id === id);
  if (!original) return null;
  const copy = createLesson(`${original.title} (copia)`);
  copy.description = original.description;
  copy.slides = original.slides.map(slide => ({ ...slide, id: newId('slide') }));
  return saveLesson(copy);
}
