import {
  GRAVITY,
  horizontalComponent,
  verticalComponent,
  positionX,
  positionY,
} from './formulas.js';

export function createLaunch(v0, angleDeg, options = {}) {
  const { x0 = 0, y0 = 0, gravity = GRAVITY } = options;
  return {
    v0,
    angleDeg,
    x0,
    y0,
    gravity,
    vx: horizontalComponent(v0, angleDeg),
    vy: verticalComponent(v0, angleDeg),
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
