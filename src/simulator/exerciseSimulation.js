import { planFlight, startingControls } from './flightPlan.js';

// Todo el contenido es Movimiento Parabólico: una sola fuente de física
// (src/physics/projectileMotion.js) alimenta el simulador, sin recalcular
// fórmulas por escena.
const SCENARIOS = { dron: 'dron', basketball: 'basketball', wall: 'wall' };

export function scenarioOf(exercise) {
  return SCENARIOS[exercise?.scenario] ?? SCENARIOS.dron;
}

// El valor exacto solo debe mostrarse una vez que termina la animación.
export const shouldRevealSimulatorAnswer = phase => phase === 'landed';

export function sceneForExercise(exercise, studentAnswer) {
  const values = exercise?.values ?? {};
  const initial = startingControls(exercise);
  let speed = initial.speed;
  let angle = Number(values.angleB ?? values.angle ?? initial.angle);
  const gravity = Number(values.gravity) || 9.8;
  if (Number.isFinite(Number(values.vx)) && Number.isFinite(Number(values.t)) && !values.v0) {
    const vy = gravity * Number(values.t) / 2;
    speed = Math.hypot(Number(values.vx), vy);
    angle = Math.atan2(vy, Number(values.vx)) * 180 / Math.PI;
  }
  if (exercise?.unit === '°' && Number.isFinite(Number(studentAnswer))) angle = Number(studentAnswer);
  const flight = planFlight({
    speed,
    angle,
    gravity,
    targetX: exercise?.targetX ?? values.targetDistance,
    obstacle: exercise?.obstacle ?? null,
  });
  return { scenario: scenarioOf(exercise), flight, measured: measureExercise(exercise, flight) };
}

export function measureExercise(exercise, flight) {
  if (exercise?.unit === '°') return Number(exercise.correctAnswer);
  if (exercise?.expectedConcept === 'componente-horizontal') return flight?.launch.vx;
  if (exercise?.expectedConcept === 'componente-vertical') return flight?.launch.vy;
  if (exercise?.expectedConcept === 'altura-maxima') return flight?.peakY;
  if (exercise?.expectedConcept === 'tiempo-de-vuelo') return flight?.duration;
  if (exercise?.expectedConcept === 'alcance') return flight?.landingX;
  return Number(exercise?.correctAnswer);
}

export function formatMeasure(value) {
  if (!Number.isFinite(Number(value))) return '—';
  return new Intl.NumberFormat('es-PY', { maximumFractionDigits: 2 }).format(Number(value));
}
