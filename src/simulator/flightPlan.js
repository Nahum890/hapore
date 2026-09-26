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
  // Sin tope superior: un ejercicio propio del docente con v0 = 50 m/s debe
  // simularse a 50 m/s, no recortarse en silencio. El renderizador ya se
  // auto-escala al alcance y la altura del vuelo.
  const safeSpeed = Number.isFinite(Number(speed)) && Number(speed) > 0 ? Number(speed) : 20;
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

  // Aerodinámica ambiental: viento y temperatura (densidad del aire respecto a 21 °C)
  const isEnvActive = safeWind !== 0 || safeTemp !== 21;
  const densityFactor = isEnvActive ? 294.15 / (273.15 + safeTemp) : 1;
  const windAcc = safeWind * 0.35 * densityFactor;
  const tempDragX = isEnvActive ? (densityFactor - 1) * 0.15 : 0;
  const tempDragY = isEnvActive ? (densityFactor - 1) * 0.10 : 0;

  const posWithEnv = (t) => {
    const base = positionAt(launch, t);
    if (!isEnvActive) return base;
    const xEnv = base.x + 0.5 * windAcc * (t * t) - tempDragX * launch.vx * t;
    const yEnv = base.y - tempDragY * t;
    return {
      t,
      x: Math.max(0, xEnv),
      y: Math.max(0, yEnv),
    };
  };

  // Evaluación en el objetivo (targetX, targetY) — calculando el cruce real con viento/temperatura
  let timeToTarget = null;
  if (launch.vx > 0) {
    let tIter = (safeTargetX - launch.x0) / launch.vx;
    for (let iter = 0; iter < 4; iter += 1) {
      const p = posWithEnv(tIter);
      const vxEff = launch.vx + windAcc * tIter - tempDragX * launch.vx;
      if (vxEff > 0) {
        tIter += (safeTargetX - p.x) / vxEff;
      }
    }
    timeToTarget = tIter >= 0 && tIter <= duration * 1.5 ? tIter : null;
  }

  const heightAtTarget = timeToTarget !== null ? posWithEnv(timeToTarget).y : null;
  const vyAtTarget = timeToTarget !== null ? launch.vy - safeGravity * timeToTarget : null;
  const isDescending = vyAtTarget !== null && vyAtTarget < 0;

  // Para aro de básquetbol (3.05 m): debe estar descendiendo y cruzar a la altura del aro (±0.35m de margen)
  const hoopMargin = 0.35;
  const basketSwish = safeTargetY > 0 && heightAtTarget !== null && isDescending && Math.abs(heightAtTarget - safeTargetY) <= hoopMargin;

  // Puntos de trayectoria (con deriva física de viento y temperatura si se activa en exterior)
  const basePoints = evaluateTrajectory(launch, { step: duration / 100 });
  const points = !isEnvActive ? basePoints : basePoints.map((pt) => posWithEnv(pt.t));

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
      isIndoor: safeWind === 0 && safeTemp === 21,
    },
    positionAt: (progress) => {
      const t = duration * clamp(progress, 0, 1, 0);
      return posWithEnv(t);
    },
  };
}
