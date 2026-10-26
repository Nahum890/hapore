import { positionAt, timeOfFlight } from './projectileMotion.js';

// Una sola física para el tiro al aro: la usan el veredicto del desafío
// (games/parabolic/parabolicGamesEngine.js), la animación (simulator/flightPlan.js)
// y el dibujo (simulator/projectileRenderer.js). Antes cada uno calculaba por
// su cuenta (con modelos de viento distintos y la trayectoria completa hasta el
// piso), y el balón podía atravesar el aro o el tablero y caer lejos mientras
// el mensaje decía "¡canasta!".

export const RIM_RADIUS = 0.225; // aro de 45 cm de diámetro
export const BALL_RADIUS = 0.12; // balón de 24 cm
// Plano del tablero respecto del centro del aro (modelo del juego, mismos
// umbrales de siempre para tablerazo y rebote).
export const BACKBOARD_OFFSET = 0.18;
// Tablero reglamentario: borde inferior 15 cm debajo del aro, 1,05 m de alto.
export const BACKBOARD_BELOW_RIM = 0.15;
export const BACKBOARD_HEIGHT = 1.05;
// El viento empuja con una aceleración horizontal constante a = 0,04 · v_viento.
export const WIND_FACTOR = 0.04;

export const windAcceleration = wind => (Number.isFinite(Number(wind)) ? Number(wind) : 0) * WIND_FACTOR;

/** x(t) con viento: x0 + vx·t + ½·a·t². */
export function xAtTime(launch, t, accel = 0) {
  return launch.x0 + launch.vx * t + 0.5 * accel * t * t;
}

/** Primer instante en que el proyectil llega a la coordenada x, o null si no llega. */
export function timeAtX(launch, x, accel = 0) {
  const dx = x - launch.x0;
  if (Math.abs(accel) < 1e-9) return launch.vx > 0 && dx >= 0 ? dx / launch.vx : null;
  const discriminant = launch.vx * launch.vx + 2 * accel * dx;
  if (discriminant < 0) return null;
  const t = (-launch.vx + Math.sqrt(discriminant)) / accel;
  return Number.isFinite(t) && t >= 0 ? t : null;
}

/** Altura del proyectil al pasar por x (con viento), o null si no llega antes de caer. */
export function heightAtXWithWind(launch, x, accel = 0) {
  const t = timeAtX(launch, x, accel);
  if (t === null || t > timeOfFlight(launch)) return null;
  return positionAt(launch, t).y;
}

const vyAt = (launch, t) => launch.vy - launch.gravity * t;

/**
 * Clasifica el tiro: swish, bank-in, rim-in, bank-miss, rim-miss, ascending,
 * short o high. Los umbrales son relativos a la altura del aro (con 3,05 m dan
 * exactamente los valores históricos del juego).
 */
export function classifyBasketballShot(launch, { targetX, hoopHeight = 3.05, wind = 0 }) {
  const accel = windAcceleration(wind);
  const duration = timeOfFlight(launch);
  const gravity = launch.gravity;
  const timeToHoop = timeAtX(launch, targetX, accel);
  const reaches = timeToHoop !== null && timeToHoop <= duration;
  const heightAtHoop = reaches ? positionAt(launch, timeToHoop).y : 0;
  const isDescending = timeToHoop !== null && vyAt(launch, Math.min(timeToHoop, duration)) < 0;
  const diffY = heightAtHoop - hoopHeight;

  const bbX = targetX + BACKBOARD_OFFSET;
  const timeToBb = timeAtX(launch, bbX, accel);
  const heightAtBb = timeToBb !== null && timeToBb <= duration ? positionAt(launch, timeToBb).y : null;

  const base = { accel, duration, timeToHoop, heightAtHoop, diffY, isDescending, collision: null };
  if (!reaches) return { ...base, result: 'short', score: 0 };
  if (!isDescending) return { ...base, result: 'ascending', score: 15 };
  if (Math.abs(diffY) <= 0.15) return { ...base, result: 'swish', score: 100 };

  if (heightAtBb !== null && heightAtBb >= hoopHeight - 0.2 && heightAtBb <= hoopHeight + 0.93) {
    // Choque con el tablero: rebota con pérdida de energía.
    const vxImpact = launch.vx + accel * timeToBb;
    const vyImpact = vyAt(launch, timeToBb);
    const vxRebound = -0.42 * vxImpact;
    const vyRebound = 0.52 * vyImpact;
    const tBack = BACKBOARD_OFFSET / Math.abs(vxRebound);
    const yAtHoopRebound = heightAtBb + vyRebound * tBack - 0.5 * gravity * tBack * tBack;
    const collision = { type: 'backboard', x: bbX, y: heightAtBb, time: timeToBb, vx: vxRebound, vy: vyRebound };
    const isIn = heightAtBb >= hoopHeight && heightAtBb <= hoopHeight + 0.47
      && yAtHoopRebound >= hoopHeight - 0.15 && yAtHoopRebound <= hoopHeight + 0.3;
    return { ...base, collision, result: isIn ? 'bank-in' : 'bank-miss', score: isIn ? 90 : 40 };
  }

  // Aro: un poco alto pega en el aro de atrás, un poco bajo en el de adelante.
  const frontX = targetX - RIM_RADIUS;
  const timeToFront = timeAtX(launch, frontX, accel);
  const heightAtFront = timeToFront !== null && timeToFront <= duration ? positionAt(launch, timeToFront).y : null;
  if (Math.abs(diffY) <= 0.32) {
    const side = diffY > 0 ? 1 : -1;
    const contactX = targetX + side * (RIM_RADIUS - 0.03);
    const contactTime = timeAtX(launch, contactX, accel) ?? timeToHoop;
    const collision = { type: 'rim', x: contactX, y: positionAt(launch, contactTime).y, time: contactTime, side };
    return { ...base, collision, result: 'rim-in', score: 75 };
  }
  if (heightAtFront !== null && Math.abs(heightAtFront - hoopHeight) <= 0.22) {
    const collision = { type: 'rim', x: frontX, y: heightAtFront, time: timeToFront, vx: -0.3 * (launch.vx + accel * timeToFront), vy: 1.2 };
    return { ...base, collision, result: 'rim-miss', score: 35 };
  }
  if (diffY < -0.32) return { ...base, result: 'short', score: 25 };
  return { ...base, result: 'high', score: 25 };
}

export const isBasket = result => result === 'swish' || result === 'bank-in' || result === 'rim-in';
