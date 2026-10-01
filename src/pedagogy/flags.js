import { readJSON, writeJSON } from '../utils/storage.js';
import { queueTeacherSync } from '../cloud/teacherSyncQueue.js';

// "Banderitas" de ejercicios: cada ejercicio pertenece a una bandera y las
// estadísticas de los alumnos se agrupan por bandera. Las cinco banderas de
// tema vienen por defecto; el docente puede crear las suyas (por ejemplo
// "Examen 1") y cambiar la bandera de cualquier ejercicio, propio o del catálogo.
export const DEFAULT_FLAGS = [
  { id: 'componentes', color: '#1d5bd8', builtin: true },
  { id: 'tiempo', color: '#0891b2', builtin: true },
  { id: 'altura', color: '#d97706', builtin: true },
  { id: 'alcance', color: '#16a34a', builtin: true },
  { id: 'angulos', color: '#7c3aed', builtin: true },
];
export const FLAG_COLORS = ['#e11d48', '#ea580c', '#ca8a04', '#16a34a', '#0891b2', '#1d5bd8', '#7c3aed', '#db2777', '#475569'];
const FLAGS_KEY = 'guarania:exerciseFlags';
const EMPTY = { defs: [], byExercise: {} };

export function getFlagState() {
  const stored = readJSON(FLAGS_KEY, EMPTY);
  return {
    defs: Array.isArray(stored?.defs) ? stored.defs.filter(item => item?.id && item?.name) : [],
    byExercise: stored?.byExercise && typeof stored.byExercise === 'object' ? stored.byExercise : {},
  };
}

function save(state) {
  const clean = { defs: state.defs.slice(0, 30), byExercise: state.byExercise };
  writeJSON(FLAGS_KEY, clean);
  queueTeacherSync('flags', { id: 'exercise-flags', ...clean, updatedAt: new Date().toISOString() });
  try { window.dispatchEvent(new Event('exercise-flags-changed')); } catch { /* SSR/tests */ }
  return clean;
}

/** Reemplaza las banderas con las recuperadas de Supabase (sin volver a subirlas). */
export function replaceFlagState(state) {
  writeJSON(FLAGS_KEY, { defs: Array.isArray(state?.defs) ? state.defs : [], byExercise: state?.byExercise ?? {} });
  try { window.dispatchEvent(new Event('exercise-flags-changed')); } catch { /* SSR/tests */ }
}

export function createFlag(name, color = FLAG_COLORS[0]) {
  const label = String(name ?? '').trim().slice(0, 32);
  if (!label) return null;
  const state = getFlagState();
  const flag = { id: `f-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, name: label, color };
  save({ ...state, defs: [...state.defs, flag] });
  return flag;
}

export function deleteFlag(id) {
  const state = getFlagState();
  const byExercise = Object.fromEntries(Object.entries(state.byExercise).filter(([, flagId]) => flagId !== id));
  save({ defs: state.defs.filter(item => item.id !== id), byExercise });
}

/** Asigna una bandera a un ejercicio ('' vuelve a la bandera automática de su tema). */
export function setExerciseFlag(exerciseId, flagId) {
  const state = getFlagState();
  const byExercise = { ...state.byExercise };
  if (flagId) byExercise[exerciseId] = flagId; else delete byExercise[exerciseId];
  save({ ...state, byExercise });
}

/** Todas las banderas disponibles (de tema + propias del docente). */
export function allFlags(state = getFlagState()) {
  return [...DEFAULT_FLAGS, ...state.defs];
}

/** Devuelve los ejercicios con su propiedad `flag` aplicada según las asignaciones. */
export function withFlags(exercises = [], byExercise = {}) {
  return exercises.map(item => (byExercise[item.id] ? { ...item, flag: byExercise[item.id] } : item));
}
