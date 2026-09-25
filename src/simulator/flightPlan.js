import { createLaunch, evaluateTrajectory, maxHeight, positionAt, range, timeOfFlight } from '../physics/projectileMotion.js';

export const SPEED_LIMITS = { min: 8, max: 35 };
export const ANGLE_LIMITS = { min: 15, max: 75 };

export function clamp(value, min, max, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
}

export function startingControls(exercise) {
  return {
    speed: clamp(exercise?.values?.v0, SPEED_LIMITS.min, SPEED_LIMITS.max, 20),
    angle: clamp(exercise?.values?.angle, ANGLE_LIMITS.min, ANGLE_LIMITS.max, 45),
  };
}

export function planFlight({ speed, angle, gravity = 9.8, targetX = 35 }) {
  const safeSpeed = clamp(speed, SPEED_LIMITS.min, SPEED_LIMITS.max, 20);
  const safeAngle = clamp(angle, 1, 89, 45);
  const safeGravity = Number.isFinite(Number(gravity)) && Number(gravity) > 0 ? Number(gravity) : 9.8;
  const launch = createLaunch(safeSpeed, safeAngle, { gravity: safeGravity });
  const duration = timeOfFlight(launch);
  const landingX = range(launch);
  const safeTargetX = Number.isFinite(Number(targetX)) && Number(targetX) > 0 ? Number(targetX) : 35;
  const error = landingX - safeTargetX;
  const tolerance = Math.max(2, safeTargetX * 0.06);
  return {
    launch, duration, landingX, targetX: safeTargetX,
    peakY: maxHeight(launch),
    points: evaluateTrajectory(launch, { step: duration / 100 }),
    hit: Math.abs(error) <= tolerance,
    error,
    positionAt: progress => positionAt(launch, duration * clamp(progress, 0, 1, 0)),
  };
}
