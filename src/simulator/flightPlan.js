import { createLaunch, evaluateTrajectory, heightAtX, maxHeight, positionAt, range, timeOfFlight } from '../physics/projectileMotion.js';

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

/**
 * Calcula un vuelo completo para dibujar en el simulador. La franja de acierto
 * visual (hit) es solo ilustrativa: la respuesta se califica siempre con
 * physicsValidator, nunca con esta tolerancia gráfica.
 */
export function planFlight({ speed, angle, gravity = 9.8, targetX = 35, obstacle = null }) {
  // Sin tope superior: un ejercicio propio del docente con v0 = 50 m/s debe
  // simularse a 50 m/s, no recortarse en silencio. El renderizador ya se
  // auto-escala al alcance y la altura del vuelo.
  const safeSpeed = Number.isFinite(Number(speed)) && Number(speed) > 0 ? Number(speed) : 20;
  const safeAngle = clamp(angle, 1, 89, 45);
  const safeGravity = Number.isFinite(Number(gravity)) && Number(gravity) > 0 ? Number(gravity) : 9.8;
  const launch = createLaunch(safeSpeed, safeAngle, { gravity: safeGravity });
  const duration = timeOfFlight(launch);
  const landingX = range(launch);
  const safeTargetX = Number.isFinite(Number(targetX)) && Number(targetX) > 0 ? Number(targetX) : 35;
  const error = landingX - safeTargetX;
  // Franja de acierto visual angosta: un lanzamiento debe caer cerca de la meta
  // para "verse" acertado, en vez de una zona amplia y poco exigente.
  const tolerance = Math.max(1, safeTargetX * 0.035);
  const safeObstacle = obstacle && Number.isFinite(Number(obstacle.x)) && Number.isFinite(Number(obstacle.height))
    ? { x: Number(obstacle.x), height: Number(obstacle.height) }
    : null;
  const obstacleHeight = safeObstacle ? heightAtX(launch, safeObstacle.x) : null;
  const clearsObstacle = safeObstacle ? obstacleHeight !== null && obstacleHeight >= safeObstacle.height : true;
  return {
    launch, duration, landingX, targetX: safeTargetX,
    peakY: maxHeight(launch),
    points: evaluateTrajectory(launch, { step: duration / 100 }),
    hit: Math.abs(error) <= tolerance,
    error,
    obstacle: safeObstacle,
    obstacleHeight,
    clearsObstacle,
    positionAt: progress => positionAt(launch, duration * clamp(progress, 0, 1, 0)),
  };
}
