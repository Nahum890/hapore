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

  // Evaluación en el objetivo (targetX, targetY) — para canasta elevada a 3.05 m o arco a 2.44 m
  const timeToTarget = launch.vx > 0 ? (safeTargetX - launch.x0) / launch.vx : null;
  const heightAtTarget = timeToTarget !== null && timeToTarget <= duration ? heightAtX(launch, safeTargetX) : null;
  const vyAtTarget = timeToTarget !== null ? launch.vy - safeGravity * timeToTarget : null;
  const isDescending = vyAtTarget !== null && vyAtTarget < 0;

  const isBasketball = safeTargetY === 3.05;
  let hasCollision = false;
  let collisionType = null; // 'backboard' | 'rim'
  let collisionX = 0;
  let collisionY = 0;
  let collisionTime = 0;
  let v_x_reb = 0;
  let v_y_reb = 0;
  let bballOutcome = 'miss';

  if (isBasketball) {
    const bbX = safeTargetX + 0.18;
    const timeToBb = launch.vx > 0 ? bbX / (launch.vx + safeWind * 0.04) : null;
    const heightAtBb = timeToBb !== null && timeToBb <= duration ? heightAtX(launch, bbX) : null;

    if (timeToTarget === null || timeToTarget > duration) {
      bballOutcome = 'short';
    } else if (!isDescending) {
      bballOutcome = 'ascending';
    } else if (heightAtTarget !== null && Math.abs(heightAtTarget - safeTargetY) <= 0.15) {
      // 1. Canasta limpia directa (Swish)
      bballOutcome = 'swish';
    } else if (timeToBb !== null && timeToBb <= duration && heightAtBb !== null && heightAtBb >= 2.85 && heightAtBb <= 3.98) {
      // 2. Colisión con tablero (el tiro superó la vertical del aro y choca en el tablero)
      hasCollision = true;
      collisionType = 'backboard';
      collisionTime = timeToBb;
      collisionX = bbX;
      collisionY = heightAtBb;

      const vyImpact = launch.vy - safeGravity * timeToBb;
      const vxImpact = launch.vx + safeWind * 0.04;
      v_x_reb = -0.42 * vxImpact;
      v_y_reb = 0.52 * vyImpact;

      const tToHoop = 0.18 / Math.abs(v_x_reb);
      const yAtHoopReb = collisionY + v_y_reb * tToHoop - 0.5 * safeGravity * tToHoop * tToHoop;

      if (collisionY >= 3.05 && collisionY <= 3.52 && yAtHoopReb >= 2.90 && yAtHoopReb <= 3.35) {
        bballOutcome = 'bank-in';
      } else {
        bballOutcome = 'bank-miss';
      }
    } else {
      // 3. Evaluar aro o fallo
      const rfX = safeTargetX - 0.225;
      const timeToRf = launch.vx > 0 ? rfX / (launch.vx + safeWind * 0.04) : null;
      const heightAtRf = timeToRf !== null && timeToRf <= duration ? heightAtX(launch, rfX) : null;

      if (heightAtTarget !== null && Math.abs(heightAtTarget - safeTargetY) <= 0.32) {
        bballOutcome = 'rim-in';
        hasCollision = true;
        collisionType = 'rim';
        collisionTime = timeToRf || timeToTarget;
        collisionX = rfX;
        collisionY = heightAtRf || safeTargetY;
        v_x_reb = 0.45 * launch.vx;
        v_y_reb = -0.8;
      } else if (heightAtRf !== null && Math.abs(heightAtRf - safeTargetY) <= 0.22) {
        bballOutcome = 'rim-miss';
        hasCollision = true;
        collisionType = 'rim';
        collisionTime = timeToRf;
        collisionX = rfX;
        collisionY = heightAtRf;
        v_x_reb = -0.3 * launch.vx;
        v_y_reb = 1.2;
      } else if (heightAtTarget < safeTargetY - 0.32) {
        bballOutcome = 'short';
      } else {
        bballOutcome = 'high';
      }
    }
  }

  const basketSwish = isBasketball ? (bballOutcome === 'swish' || bballOutcome === 'bank-in' || bballOutcome === 'rim-in') : (safeTargetY > 0 && heightAtTarget !== null && isDescending && Math.abs(heightAtTarget - safeTargetY) <= 0.35);
  const hit = isBasketball ? basketSwish : Math.abs(error) <= tolerance;

  // Puntos de trayectoria
  let points = [];
  let totalDuration = duration;

  if (hasCollision) {
    const steps1 = 50;
    for (let i = 0; i <= steps1; i += 1) {
      const t = (collisionTime * i) / steps1;
      const pos = positionAt(launch, t);
      if (safeWind !== 0) pos.x = Math.max(0, pos.x + 0.5 * (safeWind * 0.04) * (t * t));
      points.push({ x: pos.x, y: pos.y, t });
    }

    const rebGroundDuration = (v_y_reb + Math.sqrt(Math.max(0, v_y_reb * v_y_reb + 2 * safeGravity * collisionY))) / safeGravity;
    const tRebMax = Math.min(1.4, Math.max(0.55, rebGroundDuration));
    totalDuration = collisionTime + tRebMax;

    const steps2 = 35;
    for (let i = 1; i <= steps2; i += 1) {
      const tPrime = (tRebMax * i) / steps2;
      const xReb = Math.max(0, collisionX + v_x_reb * tPrime);
      const yReb = Math.max(0, collisionY + v_y_reb * tPrime - 0.5 * safeGravity * tPrime * tPrime);
      points.push({ x: xReb, y: yReb, t: collisionTime + tPrime });
    }
  } else {
    const basePoints = evaluateTrajectory(launch, { step: duration / 100 });
    points = safeWind === 0 ? basePoints : basePoints.map((pt) => {
      const driftX = 0.5 * (safeWind * 0.04) * (pt.t * pt.t);
      return { ...pt, x: Math.max(0, pt.x + driftX) };
    });
  }

  return {
    launch,
    duration: totalDuration,
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
    collision: hasCollision ? {
      type: collisionType,
      x: collisionX,
      y: collisionY,
      time: collisionTime,
      progress: collisionTime / totalDuration,
      isBasket: basketSwish,
    } : null,
    bballOutcome,
    environment: {
      wind: safeWind,
      temperature: safeTemp,
      isIndoor: safeWind === 0,
    },
    positionAt: (progress) => {
      const p = clamp(progress, 0, 1, 0);
      if (!hasCollision) {
        const t = duration * p;
        const pos = positionAt(launch, t);
        if (safeWind !== 0) {
          pos.x = Math.max(0, pos.x + 0.5 * (safeWind * 0.04) * (t * t));
        }
        return pos;
      }
      const currentT = totalDuration * p;
      if (currentT <= collisionTime) {
        const pos = positionAt(launch, currentT);
        if (safeWind !== 0) {
          pos.x = Math.max(0, pos.x + 0.5 * (safeWind * 0.04) * (currentT * currentT));
        }
        return pos;
      }
      const tPrime = currentT - collisionTime;
      return {
        x: Math.max(0, collisionX + v_x_reb * tPrime),
        y: Math.max(0, collisionY + v_y_reb * tPrime - 0.5 * safeGravity * tPrime * tPrime),
        t: currentT,
      };
    },
  };
}
