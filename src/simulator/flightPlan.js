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
export function planFlight({
  speed,
  angle,
  gravity = 9.8,
  targetX = 35,
  targetY = 0,
  y0 = 0,
  obstacle = null,
  wind = 0,
  temperature = 21,
}) {
  const safeSpeed = clamp(speed, 1, 100, 20);
  const safeAngle = clamp(angle, 1, 89, 45);
  const safeGravity = Number.isFinite(Number(gravity)) && Number(gravity) > 0 ? Number(gravity) : 9.8;
  const safeY0 = Number.isFinite(Number(y0)) && Number(y0) >= 0 ? Number(y0) : 0;
  const safeWind = Number.isFinite(Number(wind)) ? Number(wind) : 0;
  const safeTemp = Number.isFinite(Number(temperature)) ? Number(temperature) : 21;
  const safeTargetY = Number.isFinite(Number(targetY)) && Number(targetY) >= 0 ? Number(targetY) : 0;

  const launch = createLaunch(safeSpeed, safeAngle, { gravity: safeGravity, y0: safeY0 });
  const duration = timeOfFlight(launch);
  const landingX = range(launch);
  const safeTargetX = Number.isFinite(Number(targetX)) && Number(targetX) > 0 ? Number(targetX) : 35;
  const error = landingX - safeTargetX;

  // Franja de acierto visual angosta para aterrizaje en suelo
  const tolerance = Math.max(1, safeTargetX * 0.035);

  const safeObstacle = obstacle && Number.isFinite(Number(obstacle.x)) && Number.isFinite(Number(obstacle.height))
    ? { x: Number(obstacle.x), height: Number(obstacle.height) }
    : null;
  const obstacleHeight = safeObstacle ? heightAtX(launch, safeObstacle.x) : null;
  const clearsObstacle = safeObstacle ? obstacleHeight !== null && obstacleHeight >= safeObstacle.height : true;

  // Evaluación en el objetivo (targetX, targetY) — para canasta elevada a 3.05 m o arco a 2.44 m
  const timeToTarget = launch.vx > 0 ? (safeTargetX - launch.x0) / launch.vx : null;
  const heightAtTarget = timeToTarget !== null && timeToTarget <= duration ? heightAtX(launch, safeTargetX) : null;
  const vyAtTarget = timeToTarget !== null ? launch.vy - safeGravity * timeToTarget : null;
  const isDescending = vyAtTarget !== null && vyAtTarget < 0;

  // Para aro de básquetbol (3.05 m): debe estar descendiendo y cruzar a la altura del aro (±0.35m de margen)
  const hoopMargin = 0.35;
  const basketSwish = safeTargetY > 0 && heightAtTarget !== null && isDescending && Math.abs(heightAtTarget - safeTargetY) <= hoopMargin;

  // Puntos de trayectoria (con leve deriva por viento si se activa en simulación ambiental)
  const basePoints = evaluateTrajectory(launch, { step: duration / 100 });
  const points = safeWind === 0 ? basePoints : basePoints.map((pt) => {
    // Deriva aerodinámica según velocidad del viento (0.04 m/s² por cada m/s de viento)
    const driftX = 0.5 * (safeWind * 0.04) * (pt.t * pt.t);
    return { ...pt, x: Math.max(0, pt.x + driftX) };
  });

  const hit = safeTargetY > 0 ? basketSwish : Math.abs(error) <= tolerance;

  return {
    launch,
    duration,
    landingX,
    targetX: safeTargetX,
    targetY: safeTargetY,
    y0: safeY0,
    peakY: maxHeight(launch),
    points,
    hit,
    error,
    obstacle: safeObstacle,
    obstacleHeight,
    clearsObstacle,
    heightAtTarget,
    isDescending,
    basketSwish,
    environment: {
      wind: safeWind,
      temperature: safeTemp,
      isIndoor: safeWind === 0,
    },
    positionAt: (progress) => {
      const t = duration * clamp(progress, 0, 1, 0);
      const pos = positionAt(launch, t);
      if (safeWind !== 0) {
        pos.x = Math.max(0, pos.x + 0.5 * (safeWind * 0.04) * (t * t));
      }
      return pos;
    },
  };
}
