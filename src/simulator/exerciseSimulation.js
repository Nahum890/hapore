import { planFlight, startingControls } from './flightPlan.js';
import {
  hookeDeformation,
  hookeForce,
  hookeSpringConstant,
  kinematicsDistance,
  kinematicsSpeed,
  kinematicsTime,
  opticsAngleFromSurface,
  opticsPlaneMirrorImageDistance,
  opticsReflectedAngle,
  opticsRefractiveIndex,
  thermalEquilibriumTemperature,
  thermalFinalTemperature,
  thermalSensibleHeat,
  toDegrees,
  vectorCollinearResultant,
  vectorMagnitude,
} from '../physics/formulas.js';

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
    speed = vectorMagnitude(Number(values.vx), vy);
    angle = toDegrees(Math.atan2(vy, Number(values.vx)));
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
    if (exercise.unit === 'm/s') return kinematicsSpeed(values.distancia, values.tiempo);
    if (exercise.unit === 'm') return kinematicsDistance(values.rapidez, values.tiempo);
    if (exercise.unit === 's') return kinematicsTime(values.distancia, values.rapidez);
  }
  if (exercise?.topic === 'Vectores') {
    if ('componenteX' in values) return vectorMagnitude(values.componenteX, values.componenteY);
    return vectorCollinearResultant(values.velocidadDron, values.velocidadViento);
  }
  if (exercise?.topic === 'Ley de Hooke') {
    if (exercise.unit === 'N') return hookeForce(values.k, values.x);
    if (exercise.unit === 'N/m') return hookeSpringConstant(values.fuerza, values.x);
    if (exercise.unit === 'm') return hookeDeformation(values.fuerza, values.k);
  }
  if (exercise?.topic === 'Termodinámica') {
    if (exercise.expectedConcept === 'calor-sensible') {
      return thermalSensibleHeat(
        values.masa,
        values.calorEspecifico,
        Number(values.temperaturaFinal) - Number(values.temperaturaInicial),
      );
    }
    if (exercise.expectedConcept === 'temperatura-final') {
      return thermalFinalTemperature(
        values.temperaturaInicial,
        values.calor,
        values.masa,
        values.calorEspecifico,
      );
    }
    if (exercise.expectedConcept === 'equilibrio-termico') {
      return thermalEquilibriumTemperature(
        values.masaCaliente,
        values.temperaturaCaliente,
        values.masaFria,
        values.temperaturaFria,
      );
    }
  }
  if (exercise?.topic === 'Óptica') {
    if (exercise.expectedConcept === 'ley-reflexion') {
      return 'anguloSuperficie' in values
        ? opticsAngleFromSurface(values.anguloSuperficie)
        : opticsReflectedAngle(values.anguloIncidencia);
    }
    if (exercise.expectedConcept === 'espejo-plano') return opticsPlaneMirrorImageDistance(values.distanciaObjeto);
    if (exercise.expectedConcept === 'indice-refraccion') return opticsRefractiveIndex(values.velocidadVacio, values.velocidadMedio);
  }
  return Number(exercise?.correctAnswer);
}

export function formatMeasure(value) {
  if (!Number.isFinite(Number(value))) return '—';
  return new Intl.NumberFormat('es-PY', { maximumFractionDigits: 2 }).format(Number(value));
}
