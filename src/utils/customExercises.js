import concepts from '../data/concepts.json' with { type: 'json' };
import { createLaunch, maxHeight, timeOfFlight, range } from '../physics/projectileMotion.js';
import storage from './storage.js';

// Los ejercicios que crea el docente se guardan en este dispositivo, sin
// distinguir por cuenta: la misma lógica que el código de clase (todo local,
// sin servidor), pensada para una computadora compartida del aula donde el
// docente prepara contenido y sus alumnos practican en el mismo dispositivo.
const CUSTOM_EXERCISES_KEY = 'guarania:customExercises';

export const CONCEPT_OPTIONS = [
  { value: 'componente-horizontal', label: 'Velocidad horizontal (vx)', unit: 'm/s', needsAngle: true },
  { value: 'componente-vertical', label: 'Velocidad vertical (vy)', unit: 'm/s', needsAngle: true },
  { value: 'altura-maxima', label: 'Altura máxima', unit: 'm', needsAngle: true },
  { value: 'tiempo-de-vuelo', label: 'Tiempo de vuelo', unit: 's', needsAngle: true },
  { value: 'alcance', label: 'Alcance (distancia)', unit: 'm', needsAngle: true },
  { value: 'angulo', label: 'Ángulo necesario para llegar a una distancia', unit: '°', needsAngle: false },
];

export const SCENARIOS = [
  { value: 'dron', label: 'Dron' },
  { value: 'basketball', label: 'Básquetbol' },
  { value: 'wall', label: 'Pelota sobre el paredón' },
];

function round2(value) {
  return Math.round(Number(value) * 100) / 100;
}

function formatNum(value) {
  if (!Number.isFinite(value)) return '?';
  return round2(value).toString().replace('.', ',');
}

/** Calcula la respuesta correcta con el mismo motor físico que el resto de
 * la app (src/physics/projectileMotion.js), para que el docente no tenga que
 * hacer la cuenta a mano ni pueda equivocarse al cargarla. */
export function computeAnswer(conceptValue, { v0, angle, gravity, targetDistance }) {
  const g = Number(gravity) || 9.8;
  if (conceptValue === 'angulo') {
    const speed = Number(v0);
    const target = Number(targetDistance);
    if (!(speed > 0) || !(target > 0)) return null;
    const ratio = Math.max(-1, Math.min(1, (target * g) / (speed * speed)));
    return round2((Math.asin(ratio) / 2) * (180 / Math.PI));
  }
  const speed = Number(v0);
  const ang = Number(angle);
  if (!(speed > 0) || !Number.isFinite(ang)) return null;
  const launch = createLaunch(speed, ang, { gravity: g });
  if (conceptValue === 'componente-horizontal') return round2(launch.vx);
  if (conceptValue === 'componente-vertical') return round2(launch.vy);
  if (conceptValue === 'altura-maxima') return round2(maxHeight(launch));
  if (conceptValue === 'tiempo-de-vuelo') return round2(timeOfFlight(launch));
  if (conceptValue === 'alcance') return round2(range(launch));
  return null;
}

/** targetX alimenta el simulador y el proyector (dónde "debería" caer). */
export function computeTargetX(conceptValue, values, answer) {
  const g = Number(values.gravity) || 9.8;
  if (conceptValue === 'angulo') return round2(Number(values.targetDistance));
  const speed = Number(values.v0);
  const ang = Number(values.angle);
  if (!(speed > 0) || !Number.isFinite(ang)) return null;
  const launch = createLaunch(speed, ang, { gravity: g });
  return round2(range(launch));
}

export function buildDefaultHints(conceptValue, answer) {
  const lookupId = conceptValue === 'angulo' ? 'alcance' : conceptValue;
  const info = concepts.find(item => item.id === lookupId);
  const generic = 'Fijate qué datos te da el problema y qué te pide exactamente.';
  const definition = info ? `${info.name}: ${info.definition}` : generic;
  const formula = info?.formula ? `Fórmula: ${info.formula}` : generic;
  const worked = Number.isFinite(answer)
    ? `Con los datos de este ejercicio, el resultado es ${formatNum(answer)}.`
    : generic;
  return [generic, definition, formula, worked];
}

function readAll() {
  try {
    const raw = storage.getItem(CUSTOM_EXERCISES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(list) {
  try {
    storage.setItem(CUSTOM_EXERCISES_KEY, JSON.stringify(list));
  } catch {
    // Si no se puede guardar, el ejercicio queda solo para esta sesión.
  }
  // Mismo patrón que tutor-quota-change: avisa a cualquier pantalla abierta
  // (Practicar, el proyector) para que relea la lista sin recargar la app.
  try { window.dispatchEvent(new Event('custom-exercises-changed')); } catch { /* SSR/tests */ }
}

export function getCustomExercises() {
  return readAll();
}

export function createCustomExercise({ scenario, difficulty, question, conceptValue, v0, angle, gravity, targetDistance, hints }) {
  const values = conceptValue === 'angulo'
    ? { v0: Number(v0), gravity: Number(gravity) || 9.8, targetDistance: Number(targetDistance) }
    : { v0: Number(v0), angle: Number(angle), gravity: Number(gravity) || 9.8 };
  const answer = computeAnswer(conceptValue, values);
  if (!Number.isFinite(answer)) return null;
  const option = CONCEPT_OPTIONS.find(item => item.value === conceptValue);
  const exercise = {
    id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    topic: 'Movimiento Parabólico',
    scenario,
    difficulty: difficulty || 'básico',
    question: question.trim(),
    values,
    expectedConcept: conceptValue === 'angulo' ? 'alcance' : conceptValue,
    correctAnswer: answer,
    unit: option?.unit ?? '',
    tolerance: 0.01,
    targetX: computeTargetX(conceptValue, values, answer) ?? undefined,
    targetY: 0,
    hints: (hints?.some(text => text?.trim()) ? hints.map(text => text?.trim() || '') : buildDefaultHints(conceptValue, answer)),
    custom: true,
    createdAt: new Date().toISOString(),
  };
  const list = readAll();
  list.push(exercise);
  writeAll(list);
  return exercise;
}

export function deleteCustomExercise(id) {
  writeAll(readAll().filter(item => item.id !== id));
}
