import { createLaunch, maxHeight, positionAt, timeOfFlight } from '../physics/projectileMotion.js';
import {
  BACKBOARD_BELOW_RIM, BACKBOARD_HEIGHT, BACKBOARD_OFFSET, RIM_RADIUS,
  classifyBasketballShot, heightAtXWithWind, isBasket, timeAtX, windAcceleration, xAtTime,
} from '../physics/basketballShot.js';

export const SPEED_LIMITS = { min: 8, max: 35 };
export const ANGLE_LIMITS = { min: 15, max: 75 };
// Profundidad de la red del arco de fútbol (el balón que entra se frena ahí).
const GOAL_NET_DEPTH = 1.6;
const SAMPLES = 140;

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

// ---- Recorrido animado por tramos ------------------------------------------
// La animación sigue exactamente lo que pasa físicamente: el vuelo, y después
// el choque (aro, tablero, barrera, paredón) o la entrada (red del aro o del
// arco). Antes se dibujaba siempre la parábola completa hasta el piso, así que
// el balón atravesaba el aro, el tablero o la barrera y caía lejos.

/** Tramo balístico desde (x0, y0) con velocidad (vx, vy) hasta tocar el piso. */
function ballistic(x0, y0, vx, vy, gravity, { xMin = -Infinity, xMax = Infinity, duration } = {}) {
  const toFloor = (vy + Math.sqrt(Math.max(0, vy * vy + 2 * gravity * Math.max(0, y0)))) / gravity;
  return {
    duration: duration ?? Math.max(0.05, toFloor),
    at: t => ({
      x: Math.min(xMax, Math.max(xMin, Math.max(0, x0 + vx * t))),
      y: Math.max(0, y0 + vy * t - 0.5 * gravity * t * t),
    }),
    velocityAt: t => ({ vx, vy: vy - gravity * t }),
  };
}

/** Arco que va de un punto a otro en un tiempo dado (rebote que entra al aro). */
function arcBetween(from, to, time, gravity) {
  const vx = (to.x - from.x) / time;
  const vy = (to.y - from.y + 0.5 * gravity * time * time) / time;
  return ballistic(from.x, from.y, vx, vy, gravity, { duration: time });
}

function launchSegment(launch, accel, duration) {
  return {
    duration,
    at: t => ({ x: Math.max(0, xAtTime(launch, t, accel)), y: positionAt(launch, t).y }),
    velocityAt: t => ({ vx: launch.vx + accel * t, vy: launch.vy - launch.gravity * t }),
  };
}

/** Balón que pasó por el aro: cae casi vertical dentro de la red y hasta el piso. */
function netDrop(hoopX, hoopY, incoming, gravity) {
  const vx = Math.max(-0.3, Math.min(0.3, 0.1 * incoming.vx));
  const vy = Math.min(0, 0.45 * incoming.vy);
  return ballistic(hoopX, hoopY, vx, vy, gravity, { xMin: hoopX - 0.12, xMax: hoopX + 0.12 });
}

function buildPath(segments) {
  const total = segments.reduce((sum, segment) => sum + segment.duration, 0);
  const at = T => {
    let remaining = Math.max(0, Math.min(total, T));
    for (const segment of segments) {
      if (remaining <= segment.duration) return { ...segment.at(remaining), t: Math.max(0, Math.min(total, T)) };
      remaining -= segment.duration;
    }
    const last = segments[segments.length - 1];
    return { ...last.at(last.duration), t: total };
  };
  // Muestras parejas en el tiempo: el dibujo de la estela usa el progreso
  // como índice, así que la estela y el balón avanzan juntos.
  const points = Array.from({ length: SAMPLES }, (_, i) => at((total * i) / (SAMPLES - 1)));
  return { total, at, points };
}

function basketballSegments(launch, shot, { targetX, hoopHeight }) {
  const { accel } = shot;
  const g = launch.gravity;
  const hoop = { x: targetX, y: hoopHeight };
  const flightTo = t => launchSegment(launch, accel, t);
  const c = shot.collision;
  switch (shot.result) {
    case 'swish': {
      const first = flightTo(shot.timeToHoop);
      return [first, netDrop(hoop.x, hoop.y, first.velocityAt(shot.timeToHoop), g)];
    }
    case 'rim-in': {
      // Toca el aro, da un saltito y cae por el centro.
      const hop = arcBetween({ x: c.x, y: c.y }, hoop, 0.32, g);
      return [flightTo(c.time), hop, netDrop(hoop.x, hoop.y, hop.velocityAt(hop.duration), g)];
    }
    case 'bank-in': {
      const time = Math.min(0.45, Math.max(0.12, BACKBOARD_OFFSET / Math.max(0.01, Math.abs(c.vx))));
      const back = arcBetween({ x: c.x, y: c.y }, hoop, time, g);
      return [flightTo(c.time), back, netDrop(hoop.x, hoop.y, back.velocityAt(back.duration), g)];
    }
    case 'bank-miss':
    case 'rim-miss':
      return [flightTo(c.time), ballistic(c.x, c.y, c.vx, c.vy, g)];
    default: {
      // Sin canasta: igual choca si pasa por el aro o por el tablero dibujados.
      const tFront = timeAtX(launch, targetX - RIM_RADIUS, accel);
      const yFront = tFront !== null && tFront <= shot.duration ? positionAt(launch, tFront).y : null;
      if (shot.result === 'ascending' && yFront !== null && yFront >= hoopHeight - 0.15 && yFront <= hoopHeight + 0.12) {
        // Sube y pega en el aro desde abajo.
        return [flightTo(tFront), ballistic(targetX - RIM_RADIUS, yFront, -0.3 * (launch.vx + accel * tFront), -1, g)];
      }
      const bbX = targetX + BACKBOARD_OFFSET;
      const tBb = timeAtX(launch, bbX, accel);
      const yBb = tBb !== null && tBb <= shot.duration ? positionAt(launch, tBb).y : null;
      if (yBb !== null && yBb >= hoopHeight - BACKBOARD_BELOW_RIM && yBb <= hoopHeight - BACKBOARD_BELOW_RIM + BACKBOARD_HEIGHT) {
        const vx = launch.vx + accel * tBb;
        const vy = launch.vy - g * tBb;
        return [flightTo(tBb), ballistic(bbX, yBb, -0.42 * vx, 0.52 * vy, g)];
      }
      return [flightTo(shot.duration)];
    }
  }
}

/**
 * Calcula un vuelo completo para dibujar en el simulador. La franja de acierto
 * visual (hit) es solo ilustrativa: la respuesta se califica siempre con
 * physicsValidator, nunca con esta tolerancia gráfica.
 *
 * `duration` es el tiempo de vuelo físico (llegada al piso sin obstáculos);
 * `animationDuration` es lo que dura el recorrido animado con choques y rebotes.
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
  basket = false,
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
  const accel = windAcceleration(safeWind);

  const launch = createLaunch(safeSpeed, safeAngle, { gravity: safeGravity, y0: safeY0 });
  const duration = timeOfFlight(launch);
  // Con viento el punto de caída se corre (mismo modelo que la animación).
  const landingX = xAtTime(launch, duration, accel) - launch.x0;
  const safeTargetX = Number.isFinite(Number(targetX)) && Number(targetX) > 0 ? Number(targetX) : 35;
  const error = landingX - safeTargetX;

  // Franja de acierto visual angosta para aterrizaje en suelo
  const tolerance = Math.max(1, safeTargetX * 0.035);

  const safeObstacle = obstacle && Number.isFinite(Number(obstacle.x)) && Number.isFinite(Number(obstacle.height))
    ? { x: Number(obstacle.x), height: Number(obstacle.height), ...(obstacle.isFreeKick ? { isFreeKick: true } : {}) }
    : null;
  const obstacleHeight = safeObstacle ? heightAtXWithWind(launch, safeObstacle.x, accel) : null;
  const clearsObstacle = safeObstacle ? obstacleHeight !== null && obstacleHeight >= safeObstacle.height : true;

  // Evaluación en el objetivo (targetX, targetY) — canasta elevada a 3.05 m o arco a 2.44 m
  const timeToTarget = timeAtX(launch, safeTargetX, accel);
  const heightAtTarget = timeToTarget !== null && timeToTarget <= duration ? positionAt(launch, timeToTarget).y : null;
  const vyAtTarget = timeToTarget !== null ? launch.vy - safeGravity * timeToTarget : null;
  const isDescending = vyAtTarget !== null && vyAtTarget < 0;

  const isBasketball = Boolean(basket) || safeTargetY === 3.05;
  let segments;
  let collision = null;
  let bballOutcome = 'miss';

  if (isBasketball) {
    const shot = classifyBasketballShot(launch, { targetX: safeTargetX, hoopHeight: safeTargetY || 3.05, wind: safeWind });
    bballOutcome = shot.result;
    segments = basketballSegments(launch, shot, { targetX: safeTargetX, hoopHeight: safeTargetY || 3.05 });
    if (shot.collision) collision = { type: shot.collision.type, x: shot.collision.x, y: shot.collision.y, time: shot.collision.time };
  } else if (safeObstacle && !clearsObstacle && obstacleHeight !== null) {
    // Choca con el paredón o la barrera y cae delante.
    const tHit = timeAtX(launch, safeObstacle.x, accel);
    const vx = launch.vx + accel * tHit;
    const vy = launch.vy - safeGravity * tHit;
    segments = [launchSegment(launch, accel, tHit), ballistic(safeObstacle.x, obstacleHeight, -0.25 * vx, Math.min(0, vy) * 0.3, safeGravity)];
    collision = { type: 'obstacle', x: safeObstacle.x, y: obstacleHeight, time: tHit };
  } else if (safeObstacle?.isFreeKick && safeTargetY > 0 && heightAtTarget !== null && heightAtTarget > 0 && heightAtTarget <= safeTargetY) {
    // Gol: el balón entra al arco y se frena en la red.
    const vx = launch.vx + accel * timeToTarget;
    segments = [launchSegment(launch, accel, timeToTarget), ballistic(safeTargetX, heightAtTarget, 0.35 * vx, 0.5 * vyAtTarget, safeGravity, { xMax: safeTargetX + GOAL_NET_DEPTH })];
  } else {
    segments = [launchSegment(launch, accel, duration)];
  }

  const path = buildPath(segments);
  const basketSwish = isBasketball ? isBasket(bballOutcome) : (safeTargetY > 0 && heightAtTarget !== null && isDescending && Math.abs(heightAtTarget - safeTargetY) <= 0.35);
  const hit = isBasketball ? basketSwish : Math.abs(error) <= tolerance;

  return {
    launch,
    duration,
    animationDuration: path.total,
    landingX,
    // Punto más lejano del recorrido animado (para la escala del dibujo).
    extentX: Math.max(...path.points.map(point => point.x)),
    targetX: safeTargetX,
    targetY: safeTargetY,
    y0: safeY0,
    peakY: maxHeight(launch),
    points: path.points,
    hit,
    error,
    obstacle: safeObstacle,
    obstacleHeight,
    clearsObstacle,
    heightAtTarget,
    isDescending,
    basketSwish,
    isBasketball,
    collision: collision ? { ...collision, progress: path.total > 0 ? collision.time / path.total : 0, isBasket: basketSwish } : null,
    bballOutcome,
    environment: {
      wind: safeWind,
      temperature: safeTemp,
      isIndoor: safeWind === 0,
    },
    positionAt: progress => path.at(path.total * clamp(progress, 0, 1, 0)),
  };
}
