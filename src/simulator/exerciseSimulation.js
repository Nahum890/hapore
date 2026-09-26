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

const toRad = degrees => (degrees * Math.PI) / 180;
const toDeg = radians => (radians * 180) / Math.PI;

export function sceneForExercise(exercise, studentAnswer) {
  const values = exercise?.values ?? {};
  const initial = startingControls(exercise);
  let speed = initial.speed;
  let angle = Number(values.angleB ?? values.angle ?? initial.angle);
  const gravity = Number(values.gravity) || 9.8;
  const v0 = Number(values.v0);
  const definedByVxT = Number.isFinite(Number(values.vx)) && Number.isFinite(Number(values.t)) && !values.v0;
  if (definedByVxT) {
    const vy = gravity * Number(values.t) / 2;
    speed = Math.hypot(Number(values.vx), vy);
    angle = toDeg(Math.atan2(vy, Number(values.vx)));
  }
  // La escena se recalcula a partir de lo que escribió el alumno (correcto o
  // no), no solo del dato "verdadero" del enunciado: si la respuesta es una
  // componente de velocidad, una altura o un tiempo, se reconstruye un vuelo
  // hipotético consistente con esos datos, para que un cálculo equivocado se
  // vea realmente distinto en vez de dibujar siempre el mismo lanzamiento.
  const guess = Number(String(studentAnswer ?? '').replace(',', '.'));
  if (Number.isFinite(guess)) {
    const concept = exercise?.expectedConcept;
    const baseAngleRad = toRad(Number(values.angle) || 0);
    if (exercise?.unit === '°') {
      angle = guess;
    } else if (concept === 'componente-horizontal' && Number.isFinite(v0) && guess !== 0) {
      const vy = v0 * Math.sin(baseAngleRad);
      speed = Math.hypot(guess, vy);
      angle = toDeg(Math.atan2(vy, guess));
    } else if (concept === 'componente-vertical' && Number.isFinite(v0)) {
      const vx = v0 * Math.cos(baseAngleRad);
      speed = Math.hypot(vx, guess);
      angle = toDeg(Math.atan2(guess, vx));
    } else if (concept === 'altura-maxima' && Number.isFinite(v0) && guess >= 0) {
      const vx = v0 * Math.cos(baseAngleRad);
      const vy = Math.sqrt(2 * gravity * guess);
      speed = Math.hypot(vx, vy);
      angle = toDeg(Math.atan2(vy, vx));
    } else if (concept === 'tiempo-de-vuelo' && Number.isFinite(v0) && guess > 0) {
      const vx = v0 * Math.cos(baseAngleRad);
      const vy = gravity * guess / 2;
      speed = Math.hypot(vx, vy);
      angle = toDeg(Math.atan2(vy, vx));
    } else if (concept === 'alcance' && guess > 0) {
      if (definedByVxT) {
        const vx = Number(values.vx);
        const flightTime = guess / vx;
        const vy = gravity * flightTime / 2;
        speed = Math.hypot(vx, vy);
        angle = toDeg(Math.atan2(vy, vx));
      } else if (Number.isFinite(v0) && v0 > 0) {
        const ratio = Math.max(-1, Math.min(1, (guess * gravity) / (v0 * v0)));
        angle = toDeg(Math.asin(ratio) / 2);
        speed = v0;
      }
    }
  }
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
