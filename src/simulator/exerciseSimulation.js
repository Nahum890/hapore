import { planFlight, startingControls } from './flightPlan.js';

export const shouldRevealSimulatorAnswer = phase => phase === 'landed';

export function sceneForExercise(exercise, studentAnswer) {
  const values = exercise?.values ?? {};
  const topic = exercise?.topic ?? 'Movimiento Parabólico';
  if (topic !== 'Movimiento Parabólico') return { topic, measured: measureExercise(exercise), flight: null };

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
  const flight = planFlight({ speed, angle, gravity, targetX: exercise?.targetX ?? values.targetDistance });
  return { topic, flight, measured: measureExercise(exercise, flight) };
}

export function measureExercise(exercise, flight) {
  const values = exercise?.values ?? {};
  if (exercise?.topic === 'Movimiento Parabólico') {
    if (exercise.unit === '°') return Number(exercise.correctAnswer);
    if (exercise.expectedConcept === 'componente-horizontal') return flight?.launch.vx;
    if (exercise.expectedConcept === 'componente-vertical') return flight?.launch.vy;
    if (exercise.expectedConcept === 'altura-maxima') return flight?.peakY;
    if (exercise.expectedConcept === 'tiempo-de-vuelo') return flight?.duration;
    if (exercise.expectedConcept === 'alcance') return flight?.landingX;
  }
  if (exercise?.topic === 'Cinemática') {
    if (exercise.unit === 'm/s') return Number(values.distancia) / Number(values.tiempo);
    if (exercise.unit === 'm') return Number(values.rapidez) * Number(values.tiempo);
    if (exercise.unit === 's') return Number(values.distancia) / Number(values.rapidez);
  }
  if (exercise?.topic === 'Vectores') {
    if ('componenteX' in values) return Math.hypot(Number(values.componenteX), Number(values.componenteY));
    return Math.abs(Number(values.velocidadDron) + Number(values.velocidadViento));
  }
  if (exercise?.topic === 'Ley de Hooke') {
    if (exercise.unit === 'N') return Number(values.k) * Number(values.x);
    if (exercise.unit === 'N/m') return Number(values.fuerza) / Number(values.x);
    if (exercise.unit === 'm') return Number(values.fuerza) / Number(values.k);
  }
  if (exercise?.topic === 'Termodinámica') {
    if (exercise.expectedConcept === 'calor-sensible') return Number(values.masa) * Number(values.calorEspecifico) * (Number(values.temperaturaFinal) - Number(values.temperaturaInicial));
    if (exercise.expectedConcept === 'temperatura-final') return Number(values.temperaturaInicial) + Number(values.calor) / (Number(values.masa) * Number(values.calorEspecifico));
    if (exercise.expectedConcept === 'equilibrio-termico') return (Number(values.masaCaliente) * Number(values.temperaturaCaliente) + Number(values.masaFria) * Number(values.temperaturaFria)) / (Number(values.masaCaliente) + Number(values.masaFria));
  }
  if (exercise?.topic === 'Óptica') {
    if (exercise.expectedConcept === 'ley-reflexion') return 'anguloSuperficie' in values ? 90 - Number(values.anguloSuperficie) : Number(values.anguloIncidencia);
    if (exercise.expectedConcept === 'espejo-plano') return Number(values.distanciaObjeto);
    if (exercise.expectedConcept === 'indice-refraccion') return Number(values.velocidadVacio) / Number(values.velocidadMedio);
  }
  return Number(exercise?.correctAnswer);
}

export function formatMeasure(value) {
  if (!Number.isFinite(Number(value))) return '—';
  return new Intl.NumberFormat('es-PY', { maximumFractionDigits: 2 }).format(Number(value));
}
