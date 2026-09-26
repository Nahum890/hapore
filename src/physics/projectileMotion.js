import {
  GRAVITY,
  horizontalComponent,
  verticalComponent,
  positionX,
  positionY,
} from './formulas.js';

/**
 * Único punto de creación de un lanzamiento parabólico. Todas las escenas
 * (laboratorio, ejercicios, proyector docente) pasan por acá para evitar que
 * cada pantalla recalcule sus propias fórmulas con reglas distintas.
 */
export function createLaunch(v0, angleDeg, options = {}) {
  const { x0 = 0, y0 = 0, gravity = GRAVITY } = options;
  const safeGravity = Number.isFinite(Number(gravity)) && Number(gravity) > 0 ? Number(gravity) : GRAVITY;
  const safeV0 = Number.isFinite(Number(v0)) && Number(v0) > 0 ? Number(v0) : 0;
  const safeAngle = Number.isFinite(Number(angleDeg)) ? Number(angleDeg) : 0;
  return {
    v0: safeV0,
    angleDeg: safeAngle,
    x0: Number.isFinite(Number(x0)) ? Number(x0) : 0,
    y0: Number.isFinite(Number(y0)) ? Number(y0) : 0,
    gravity: safeGravity,
    vx: horizontalComponent(safeV0, safeAngle),
    vy: verticalComponent(safeV0, safeAngle),
  };
}

export function positionAt(launch, t) {
  return {
    t,
    x: positionX(launch.x0, launch.vx, t),
    y: positionY(launch.y0, launch.vy, t, launch.gravity),
  };
}

export function timeOfFlight(launch) {
  const { vy, y0, gravity } = launch;
  if (y0 <= 0 && vy <= 0) return 0;
  const discriminant = vy * vy + 2 * gravity * y0;
  if (discriminant < 0) return 0;
  return (vy + Math.sqrt(discriminant)) / gravity;
}

export function maxHeight(launch) {
  const { vy, y0, gravity } = launch;
  if (vy <= 0) return y0;
  return y0 + (vy * vy) / (2 * gravity);
}

export function range(launch) {
  return positionX(launch.x0, launch.vx, timeOfFlight(launch)) - launch.x0;
}

/**
 * Altura del proyectil cuando su coordenada horizontal vale x (por ejemplo,
 * para comprobar si supera un obstáculo como una pared a mitad de camino).
 * Devuelve null si el lanzamiento nunca llega a esa distancia horizontal.
 */
export function heightAtX(launch, x) {
  if (!(launch.vx > 0)) return null;
  const t = (x - launch.x0) / launch.vx;
  if (!(t >= 0)) return null;
  return positionY(launch.y0, launch.vy, t, launch.gravity);
}

export function evaluateTrajectory(launch, options = {}) {
  const { step = 0.05, tMax } = options;
  const total = tMax ?? timeOfFlight(launch);
  if (!(total > 0)) return [];
  const points = [];
  const steps = Math.ceil(total / step);
  for (let i = 0; i <= steps; i += 1) {
    const t = Math.min(i * step, total);
    points.push(positionAt(launch, t));
  }
  return points;
}
