import {
  GRAVITY,
  horizontalComponent,
  verticalComponent,
  positionX,
  positionY,
} from './formulas.js';

export function createLaunch(v0, angleDeg, options = {}) {
  const numV0 = Number.isFinite(Number(v0)) ? Math.max(0, Number(v0)) : 0;
  const numAngle = Number.isFinite(Number(angleDeg)) ? Number(angleDeg) : 0;
  const numX0 = Number.isFinite(Number(options?.x0)) ? Number(options.x0) : 0;
  const numY0 = Number.isFinite(Number(options?.y0)) ? Number(options.y0) : 0;
  const rawGravity = Number(options?.gravity);
  const gravity = Number.isFinite(rawGravity) && rawGravity > 0 ? rawGravity : GRAVITY;

  return {
    v0: numV0,
    angleDeg: numAngle,
    x0: numX0,
    y0: numY0,
    gravity,
    vx: horizontalComponent(numV0, numAngle),
    vy: verticalComponent(numV0, numAngle),
  };
}

export function positionAt(launch, t) {
  const safeT = Number.isFinite(Number(t)) ? Math.max(0, Number(t)) : 0;
  return {
    t: safeT,
    x: positionX(launch.x0, launch.vx, safeT),
    y: positionY(launch.y0, launch.vy, safeT, launch.gravity),
  };
}

export function velocityAt(launch, t) {
  const safeT = Number.isFinite(Number(t)) ? Math.max(0, Number(t)) : 0;
  const vy = launch.vy - launch.gravity * safeT;
  return {
    vx: launch.vx,
    vy,
    speed: Math.hypot(launch.vx, vy),
    angleDeg: (Math.atan2(vy, launch.vx) * 180) / Math.PI,
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
