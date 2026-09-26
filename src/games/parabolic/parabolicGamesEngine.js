import {
  createLaunch,
  evaluateTrajectory,
  maxHeight,
  positionAt,
  range,
  timeOfFlight,
  velocityAt,
} from '../../physics/projectileMotion.js';
import { GRAVITY } from '../../physics/formulas.js';

// Retos de Básquetbol con aro suspendido a 3.05 m y diámetro de 45 cm (balón 24 cm)
export const BASKETBALL_LEVELS = [
  {
    id: 'bball-1',
    name: 'Tiro Libre (4.60 m)',
    distance: 4.60,
    hoopHeight: 3.05,
    releaseHeight: 1.80,
    targetAngle: 52,
    gravity: 9.8,
    idealSpeed: 7.68,
  },
  {
    id: 'bball-2',
    name: 'Línea de 3 Puntos (6.75 m)',
    distance: 6.75,
    hoopHeight: 3.05,
    releaseHeight: 1.80,
    targetAngle: 48,
    gravity: 9.8,
    idealSpeed: 8.93,
  },
  {
    id: 'bball-3',
    name: 'Tiro de Media Cancha (14.0 m)',
    distance: 14.0,
    hoopHeight: 3.05,
    releaseHeight: 1.80,
    targetAngle: 45,
    gravity: 9.8,
    idealSpeed: 12.27,
  },
];

// Retos de Tiro Libre (estilo Roberto Carlos) superando la barrera FIFA
export const FREEKICK_LEVELS = [
  {
    id: 'fk-1',
    name: 'Tiro Libre al Borde del Área (25 m)',
    distance: 25.0,
    barrierDistance: 9.15,
    barrierHeight: 1.80,
    goalHeight: 2.44,
    gravity: 9.8,
    suggestedAngle: 24,
    idealSpeed: 18.5,
  },
  {
    id: 'fk-2',
    name: 'Tiro Libre Frontal (30 m)',
    distance: 30.0,
    barrierDistance: 9.15,
    barrierHeight: 1.80,
    goalHeight: 2.44,
    gravity: 9.8,
    suggestedAngle: 22,
    idealSpeed: 21.0,
  },
  {
    id: 'fk-3',
    name: 'El Tiro Imposible de Roberto Carlos (35 m - 1997)',
    distance: 35.0,
    barrierDistance: 9.15,
    barrierHeight: 1.80,
    goalHeight: 2.44,
    gravity: 9.8,
    suggestedAngle: 20,
    idealSpeed: 23.5,
    historicalNote: 'En el torneo de Francia 1997, Roberto Carlos pateó desde 35 m a 137 km/h (~38 m/s). La comba lateral extrema se debió al Efecto Magnus por la rotación del balón en el aire.',
  },
];

export const TARGET_LEVELS = [
  {
    id: 'target-1',
    distance: 25.0,
    angleDeg: 45,
    gravity: 9.8,
    exactSpeed: 15.65,
    tolerance: 0.15,
  },
  {
    id: 'target-2',
    distance: 40.0,
    angleDeg: 45,
    gravity: 9.8,
    exactSpeed: 19.80,
    tolerance: 0.15,
  },
  {
    id: 'target-3',
    distance: 50.0,
    angleDeg: 30,
    gravity: 9.8,
    exactSpeed: 23.79,
    tolerance: 0.2,
  },
];

export const COMPLEMENTARY_LEVELS = [
  { id: 'comp-1', baseAngle: 30, expectedAngle: 60, speed: 20, gravity: 9.8, range: 35.35 },
  { id: 'comp-2', baseAngle: 25, expectedAngle: 65, speed: 22, gravity: 9.8, range: 37.95 },
  { id: 'comp-3', baseAngle: 40, expectedAngle: 50, speed: 25, gravity: 9.8, range: 62.77 },
  { id: 'comp-4', baseAngle: 15, expectedAngle: 75, speed: 24, gravity: 9.8, range: 29.39 },
];

export const GAMES_I18N = {
  'gn-jopara': {
    title: 'Minijuegos de Movimiento Parabólico',
    subtitle: 'Ehecha ne katupyry umi reto offline rupive: básquetbol aro suspendido reheve, tiro libre Roberto Carlos, tiro al blanco ha ángulos complementarios.',
    tabBasketball: '🏀 Básquetbol (3.05 m)',
    tabFreeKick: '⚽ Tiro Libre (Roberto Carlos)',
    tabTarget: '🎯 Tiro al Blanco',
    tabComplementary: '📐 Ángulo Complementario',
    scoreLabel: 'Puntaje',
    // Básquetbol
    bballTitle: 'Reto de Básquetbol: Tiro a la Canasta (3.05 m)',
    bballSubtitle: 'Pe aro opyta 3.05 m yvatépe ha i-circunferencia (Ø 45 cm) tuichave pe balón-gui (Ø 24 cm). Pe balón tekotevẽ ho\'a yvate guive (descendente) oike hag̃ua.',
    bballDistance: 'Aro mombyrykue (x)',
    bballHoopHeight: 'Aro yvatekue (y)',
    bballReleaseHeight: 'Salida yvatekue (y₀)',
    bballEnvTitle: 'Ambiente simulación:',
    bballEnvIndoor: '🏟️ Cancha Techada (21°C · Viento 0 m/s · Vuelo Ideal)',
    bballEnvOutdoor: '🌬️ Cancha Abierta (Yvytu reheve)',
    bballWindLabel: 'Yvytu pya\'ekue (m/s):',
    bballAngleLabel: 'Ángulo de tiro (θ):',
    bballSpeedLabel: 'Rapidez de tiro (v₀ m/s):',
    bballFireBtn: '🏀 Emombo balón',
    bballNextBtn: 'Ambue nivel',
    bballSwish: '¡CANASTA PERFECTA! Rehecha porã pe tiro ({speed} m/s, {angle}°). Pe balón ohasa aro {hoopH} m-pe ho\'ávo ({ballY} m). ¡Limpio!',
    bballRimHit: '¡Enceste con aro! Pe balón ojepota aro rembe\'ýpe ha oike canasta-pe.',
    bballAscending: 'Tiro fallado: Pe balón og̃uahẽ aro-pe ojupi jave gueteri (subiendo). Ndaikatúi oike guype guive.',
    bballShort: 'Tiro corto: Pe balón noñembo\'y porãi térã opyta yvýpe aro mboyve ({ballY} m).',
    bballHigh: 'Tiro pasado: Pe balón ohasa yvateiterei aro ári ({ballY} m).',
    bballPhysicsNote: 'Física en Cancha Techada: Ndoguerekóigui yvytu ha temperatura templada rupive, pe básquetbol oiko movimiento parabólico ideal reheve exacto.',
    // Tiro Libre
    fkTitle: 'Reto: Tiro Libre sobre la Barrera (Estilo Roberto Carlos)',
    fkSubtitle: 'Ehasa pe barrera FIFA (1.80 m yvatekue, 9.15 m-pe) ha emoingéke pe arco-pe (2.44 m travesaño).',
    fkDistance: 'Mombyrykue arco-pe',
    fkBarrier: 'Barrera FIFA (9.15 m)',
    fkGoalHeight: 'Arco yvatekue',
    fkFireBtn: '⚽ Epatea tiro libre',
    fkNextBtn: 'Ambue nivel',
    fkGoal: '¡GOLAZO HISTÓRICO! Rehasáma pe barrera ({barrierY} m > 1.80 m) ha pe balón oike arco-pe {goalY} m-pe.',
    fkBlocked: 'Barrera omboty pe tiro: Pe balón nohasái 1.80 m yvatekue ({barrierY} m). Eipotave ángulo térã rapidez.',
    fkOverBar: 'Ohasa yvate: Rehasa pe barrera, pero pe balón ohasa travesaño ári ({goalY} m > 2.44 m).',
    fkGroundShort: 'Tiro corto: Pe balón ho\'a yvýpe arco mboyve.',
    fkMagnusTitle: '📚 Roberto Carlos ha Efecto Magnus (Física Teórica):',
    fkMagnusBody: 'Ko reto-pe jastudia pe componente vertical parabólico. Pe tiro histórico 1997-pe (Francia vs Brasil), Roberto Carlos ombovove pe balón 137 km/h-pe ha heta rotación reheve: upéva ojapo peteĩ diferencia de presión de aire (Efecto Magnus) omokurva va\'ekue pe balón lateralmente.',
    // Tiro al blanco
    targetTab: 'Reto: Tiro al Blanco',
    targetTitle: 'Reto 1: Tiro al Blanco (Cálculo de Rapidez)',
    targetSubtitle: 'Eipuru pe fórmula física ehupyty hag̃ua pe blanco exacto, ndaha\'éi tanteo rupive.',
    targetGoalLabel: 'Blanco mombyrykue (R)',
    targetAngleLabel: 'Ángulo fijo (θ)',
    targetGravityLabel: 'Gravedad (g)',
    targetInputLabel: 'Ehai ne rapidez calculada (v₀):',
    targetInputPlaceholder: 'Techapyrã: 15.65',
    targetFireBtn: '🚀 Mbovove proyectil',
    targetNextBtn: 'Nivel pyahu',
    targetHitExact: '¡Impacto Exacto! Rejapóma pe cálculo porã ({speed} m/s). Pe proyectil ho\'a {landing} m-pe (Objetivo: {target} m).',
    targetMissFar: 'Tiro desviado: Rehai {speed} m/s ha ho\'a {landing} m-pe (ojoavy {diff} m pe blanco {target} m-gui). Examen-pe eipuru: v₀ = √(R · g / sin(2θ)).',
    // Ángulos complementarios
    compTab: 'Reto: Ángulo Complementario',
    compTitle: 'Reto: Ángulos Complementarios (Demostración de Examen)',
    compProblemData: 'Datos del lanzamiento inicial:',
    compSpeed: 'Pya\'ekue ñepyrũ (v₀)',
    compBaseAngle: 'Ángulo ñepyrũ (θ₁)',
    compRangeObtained: 'Alcance horizontal ohupytýva (R)',
    compQuestion: '¿Mba\'e ambue ángulo θ₂ (ojoavýva θ₁-gui) reheve ojehupytýta exactamente ko alcance {range} m?',
    compInputLabel: 'Ehai ne ángulo calculado (θ₂):',
    compInputPlaceholder: 'Techapyrã: 60',
    compTestBtn: '🧪 Ehesa\'ỹijo fórmula ha simulación',
    compSuccess: '¡Cálculo Exacto! θ₂ = {angle}° ha\'e pe ángulo complementario añeteguáva (θ₁ + θ₂ = 90°). Mokõive disparo og̃uahẽ {range} m-pe.',
    compFail: 'Cálculo incorrecto: Ne ángulo {angle}° ome\'ẽ alcance {userRange} m. Examen-pe: θ₂ = 90° - θ₁.',
    compSameAngle: 'Rehai jey pe ángulo ñepyrũgua ({baseAngle}°). Tekotevẽ eikuaa pe ambue ángulo ojoavýva.',
  },
  es: {
    title: 'Minijuegos de Movimiento Parabólico',
    subtitle: 'Poné a prueba tus habilidades físicas sin conexión: básquetbol con aro suspendido a 3.05 m, tiro libre de Roberto Carlos, tiro al blanco y ángulos complementarios.',
    tabBasketball: '🏀 Básquetbol (3.05 m)',
    tabFreeKick: '⚽ Tiro Libre (Roberto Carlos)',
    tabTarget: '🎯 Tiro al Blanco',
    tabComplementary: '📐 Ángulo Complementario',
    scoreLabel: 'Puntaje',
    // Básquetbol
    bballTitle: 'Reto de Básquetbol: Tiro a la Canasta (3.05 m)',
    bballSubtitle: 'El aro oficial está suspendido a 3.05 m y su diámetro (45 cm) es notablemente más ancho que el balón (24 cm). El balón debe entrar en trayectoria descendente.',
    bballDistance: 'Distancia al aro (x)',
    bballHoopHeight: 'Altura del aro (y)',
    bballReleaseHeight: 'Altura de salida (y₀)',
    bballEnvTitle: 'Simulación ambiental:',
    bballEnvIndoor: '🏟️ Cancha Techada (21°C · Sin viento · Vuelo parabólico ideal)',
    bballEnvOutdoor: '🌬️ Cancha Exterior (Con viento)',
    bballWindLabel: 'Velocidad del viento (m/s):',
    bballAngleLabel: 'Ángulo de tiro (θ):',
    bballSpeedLabel: 'Rapidez inicial (v₀ m/s):',
    bballFireBtn: '🏀 Lanzar balón',
    bballNextBtn: 'Siguiente nivel',
    bballSwish: '¡CANASTA LIMPIA (SWISH)! Calculaste perfecto ({speed} m/s, {angle}°). El balón cruzó el aro a {ballY} m (altura 3.05 m) en trayectoria descendente.',
    bballRimHit: '¡Canasta! El balón tocó el aro y entró limpiamente a la red.',
    bballAscending: 'Tiro rechazado: El balón llegó a la altura del aro en trayectoria ascendente (subiendo). Físicamente no puede encestar desde abajo.',
    bballShort: 'Tiro corto: El balón no alcanzó la altura requerida al llegar al aro ({ballY} m vs 3.05 m).',
    bballHigh: 'Tiro largo: El balón superó por mucho el tablero y aro ({ballY} m vs 3.05 m).',
    bballPhysicsNote: 'Física en Cancha Techada: Al ser un espacio cerrado sin ráfagas de viento y con temperatura templada, el básquetbol reproduce fielmente el modelo parabólico ideal sin resistencia del aire.',
    // Tiro Libre
    fkTitle: 'Reto: Tiro Libre sobre la Barrera (Estilo Roberto Carlos)',
    fkSubtitle: 'Superá la barrera FIFA (1.80 m a 9.15 m) y encajá el balón en el arco reglamentario (2.44 m de travesaño).',
    fkDistance: 'Distancia al arco',
    fkBarrier: 'Barrera FIFA (9.15 m)',
    fkGoalHeight: 'Altura del travesaño',
    fkFireBtn: '⚽ Patear tiro libre',
    fkNextBtn: 'Siguiente nivel',
    fkGoal: '¡GOLAZO! Superaste la barrera defensiva ({barrierY} m > 1.80 m) y el balón descendió dentro del arco a {goalY} m (bajo los 2.44 m).',
    fkBlocked: 'Tiro bloqueado: El balón no superó la barrera defensiva de 1.80 m ({barrierY} m). Aumentá el ángulo o la velocidad.',
    fkOverBar: 'Por encima del travesaño: Superaste la barrera pero el balón no llegó a bajar lo suficiente ({goalY} m > 2.44 m).',
    fkGroundShort: 'Tiro corto: El balón picó en el pasto antes de cruzar la línea de gol.',
    fkMagnusTitle: '📚 Roberto Carlos y el Efecto Magnus (Física Aplicada):',
    fkMagnusBody: 'En este reto calculamos el componente vertical del movimiento parabólico. En el histórico gol de 1997 contra Francia (35 m a 137 km/h), Roberto Carlos combinó esta parábola vertical con una rotación de más de 10 revoluciones por segundo, creando una fuerza aerodinámica lateral (Efecto Magnus) que engañó a la física convencional.',
    // Tiro al blanco
    targetTab: 'Reto: Tiro al Blanco',
    targetTitle: 'Reto 1: Tiro al Blanco (Cálculo de Rapidez)',
    targetSubtitle: 'Resolvé el problema con la fórmula de cinemática para acertar exactamente al blanco sin tanteos.',
    targetGoalLabel: 'Distancia al blanco (R)',
    targetAngleLabel: 'Ángulo de elevación fijo (θ)',
    targetGravityLabel: 'Gravedad (g)',
    targetInputLabel: 'Ingresá tu rapidez calculada (v₀):',
    targetInputPlaceholder: 'Ej: 15.65',
    targetFireBtn: '🚀 Disparar proyectil',
    targetNextBtn: 'Siguiente nivel',
    targetHitExact: '¡Impacto exacto! Tu cálculo de v₀ = {speed} m/s es correcto. El proyectil cayó a {landing} m (Objetivo: {target} m).',
    targetMissFar: 'Tiro desviado: Con {speed} m/s el proyectil cayó a {landing} m (diferencia de {diff} m respecto al blanco de {target} m). En un examen aplicá: v₀ = √(R · g / sin(2θ)).',
    // Ángulos complementarios
    compTab: 'Reto: Ángulo Complementario',
    compTitle: 'Reto: Problema de Examen — Ángulos Complementarios',
    compProblemData: 'Datos del enunciado:',
    compSpeed: 'Rapidez inicial (v₀)',
    compBaseAngle: 'Ángulo inicial (θ₁)',
    compRangeObtained: 'Alcance horizontal obtenido (R)',
    compQuestion: '¿Con qué otro ángulo θ₂ (distinto de θ₁) se logrará exactamente el mismo alcance de {range} m?',
    compInputLabel: 'Ingresá tu ángulo calculado (θ₂):',
    compInputPlaceholder: 'Ej: 60',
    compTestBtn: '🧪 Probar fórmula y simular',
    compSuccess: '¡Cálculo exacto! θ₂ = {angle}° es el ángulo complementario correcto (θ₁ + θ₂ = 90°). Ambos disparos logran exactamente {range} m.',
    compFail: 'Cálculo incorrecto: Tu ángulo {angle}° dio un alcance de {userRange} m. En un examen recordá: θ₂ = 90° - θ₁.',
    compSameAngle: 'Ingresaste el mismo ángulo inicial ({baseAngle}°). El problema pide hallar el otro ángulo diferente que logre la misma distancia.',
  },
};

/**
 * Evalúa un tiro de básquetbol con aro suspendido a 3.05 m y diámetro de 45 cm.
 */
export function evaluateBasketballShot({
  speed,
  angleDeg = 50,
  distance = 4.60,
  hoopHeight = 3.05,
  releaseHeight = 1.80,
  gravity = GRAVITY,
  wind = 0,
}) {
  const numSpeed = Number(typeof speed === 'string' ? speed.trim().replace(',', '.') : speed);
  const numAngle = Number(angleDeg);
  const numWind = Number(wind) || 0;

  if (!Number.isFinite(numSpeed) || numSpeed <= 0 || !Number.isFinite(numAngle) || numAngle <= 0 || numAngle >= 90) {
    return {
      launch: null,
      speed: NaN,
      angleDeg: numAngle,
      result: 'invalid',
      score: 0,
      points: [],
      heightAtHoop: 0,
      isDescending: false,
    };
  }

  const launch = createLaunch(numSpeed, numAngle, { x0: 0, y0: releaseHeight, gravity });
  const duration = timeOfFlight(launch);
  const timeToHoop = distance / (launch.vx + numWind * 0.04);
  const velAtHoop = velocityAt(launch, Math.min(timeToHoop, duration));
  const isDescending = velAtHoop.vy < 0;

  // Altura en el aro (con deriva de viento si existe)
  const posAtHoop = positionAt(launch, Math.min(timeToHoop, duration));
  const heightAtHoop = timeToHoop <= duration ? posAtHoop.y : 0;
  const diffY = heightAtHoop - hoopHeight;

  let result = 'miss';
  let score = 0;

  // Condiciones de enceste
  if (timeToHoop > duration) {
    result = 'short';
    score = 0;
  } else if (!isDescending) {
    result = 'ascending';
    score = 15;
  } else if (Math.abs(diffY) <= 0.14) {
    // Enceste limpio (swish)
    result = 'swish';
    score = 100;
  } else if (Math.abs(diffY) <= 0.32) {
    // Enceste con aro
    result = 'rim-in';
    score = 75;
  } else if (diffY < -0.32) {
    result = 'short';
    score = 25;
  } else {
    result = 'high';
    score = 25;
  }

  const basePoints = evaluateTrajectory(launch, { step: duration / 75 });
  const points = numWind === 0 ? basePoints : basePoints.map((pt) => ({
    ...pt,
    x: Math.max(0, pt.x + 0.5 * (numWind * 0.04) * (pt.t * pt.t)),
  }));

  return {
    launch,
    speed: numSpeed,
    angleDeg: numAngle,
    distance,
    hoopHeight,
    releaseHeight,
    duration,
    timeToHoop,
    heightAtHoop: Math.round(heightAtHoop * 100) / 100,
    diffY: Math.round(diffY * 100) / 100,
    isDescending,
    result,
    score,
    points,
    environment: { wind: numWind, isIndoor: numWind === 0 },
  };
}

/**
 * Evalúa un tiro libre estilo Roberto Carlos superando la barrera reglamentaria a 9.15 m hacia el arco a 2.44 m.
 */
export function evaluateFreeKickShot({
  speed,
  angleDeg = 24,
  distance = 25.0,
  barrierDistance = 9.15,
  barrierHeight = 1.80,
  goalHeight = 2.44,
  gravity = GRAVITY,
  wind = 0,
}) {
  const numSpeed = Number(typeof speed === 'string' ? speed.trim().replace(',', '.') : speed);
  const numAngle = Number(angleDeg);
  const numWind = Number(wind) || 0;

  if (!Number.isFinite(numSpeed) || numSpeed <= 0 || !Number.isFinite(numAngle) || numAngle <= 0 || numAngle >= 90) {
    return {
      launch: null,
      speed: NaN,
      angleDeg: numAngle,
      result: 'invalid',
      score: 0,
      points: [],
      barrierY: 0,
      goalY: 0,
    };
  }

  const launch = createLaunch(numSpeed, numAngle, { x0: 0, y0: 0, gravity });
  const duration = timeOfFlight(launch);
  const totalRange = range(launch);

  const tBarrier = barrierDistance / (launch.vx + numWind * 0.04);
  const barrierY = tBarrier <= duration ? positionAt(launch, tBarrier).y : 0;
  const clearsBarrier = barrierY > barrierHeight;

  const tGoal = distance / (launch.vx + numWind * 0.04);
  const goalY = tGoal <= duration ? positionAt(launch, tGoal).y : 0;

  let result = 'miss';
  let score = 0;

  if (!clearsBarrier) {
    result = 'blocked';
    score = 0;
  } else if (totalRange < distance - 1.5) {
    result = 'ground-short';
    score = 25;
  } else if (goalY > goalHeight) {
    result = 'over-bar';
    score = 45;
  } else if (goalY > 0 && goalY <= goalHeight) {
    result = 'goal';
    score = 100;
  } else {
    result = 'miss';
    score = 20;
  }

  const basePoints = evaluateTrajectory(launch, { step: duration / 80 });
  const points = numWind === 0 ? basePoints : basePoints.map((pt) => ({
    ...pt,
    x: Math.max(0, pt.x + 0.5 * (numWind * 0.04) * (pt.t * pt.t)),
  }));

  return {
    launch,
    speed: numSpeed,
    angleDeg: numAngle,
    distance,
    barrierDistance,
    barrierHeight,
    goalHeight,
    duration,
    barrierY: Math.round(barrierY * 100) / 100,
    goalY: Math.round(goalY * 100) / 100,
    clearsBarrier,
    totalRange: Math.round(totalRange * 100) / 100,
    result,
    score,
    points,
  };
}

/**
 * Evalúa un disparo a un blanco fijo calculando la rapidez inicial v0.
 */
export function evaluateTargetShot({
  speed,
  angleDeg = 45,
  targetDistance,
  tolerance = 0.2,
  gravity = GRAVITY,
}) {
  const rawInput = typeof speed === 'string' ? speed.trim().replace(',', '.') : speed;
  const numSpeed = Number(rawInput);

  if (!Number.isFinite(numSpeed) || numSpeed <= 0) {
    return {
      launch: null,
      speed: NaN,
      angleDeg,
      landingX: 0,
      peakY: 0,
      duration: 0,
      targetDistance,
      diff: 0,
      tolerance,
      result: 'invalid',
      score: 0,
      points: [],
    };
  }

  const launch = createLaunch(numSpeed, angleDeg, { x0: 0, y0: 0, gravity });
  const landingX = range(launch);
  const peakY = maxHeight(launch);
  const duration = timeOfFlight(launch);
  const diff = Math.abs(landingX - targetDistance);

  let result = 'miss';
  let score = 0;

  if (diff <= tolerance) {
    result = 'perfect';
    score = 100;
  } else if (diff <= tolerance * 2) {
    result = 'close';
    score = 40;
  } else {
    result = 'miss';
    score = 0;
  }

  const points = evaluateTrajectory(launch, { step: duration / 80 });

  return {
    launch,
    speed: numSpeed,
    angleDeg,
    landingX: Math.round(landingX * 100) / 100,
    peakY: Math.round(peakY * 100) / 100,
    duration: Math.round(duration * 100) / 100,
    targetDistance,
    diff: Math.round(diff * 100) / 100,
    tolerance,
    result,
    score,
    points,
  };
}

/**
 * Evalúa el reto de ángulos complementarios (θ1 + θ2 = 90° tienen el mismo alcance).
 */
export function evaluateComplementaryChallenge({
  baseAngle,
  proposedAngle,
  speed = 20,
  gravity = GRAVITY,
}) {
  const numBase = Number(baseAngle);
  const rawInput = typeof proposedAngle === 'string' ? proposedAngle.trim().replace(',', '.') : proposedAngle;
  const numProposed = Number(rawInput);

  if (!Number.isFinite(numProposed) || numProposed <= 0 || numProposed >= 90) {
    return {
      baseAngle: numBase,
      proposedAngle: NaN,
      speed,
      gravity,
      isComplementary: false,
      isSameAngle: false,
      result: 'invalid',
      score: 0,
      rangeBase: 0,
      rangeUser: 0,
      diff: 0,
      pointsBase: [],
      pointsUser: [],
    };
  }

  const isSameAngle = Math.abs(numProposed - numBase) < 0.001;
  const angleSum = numBase + numProposed;
  const isComplementary = Math.abs(angleSum - 90) < 0.1 && !isSameAngle;

  const launchBase = createLaunch(speed, numBase, { x0: 0, y0: 0, gravity });
  const launchUser = createLaunch(speed, numProposed, { x0: 0, y0: 0, gravity });

  const rangeBase = range(launchBase);
  const rangeUser = range(launchUser);
  const diff = Math.abs(rangeBase - rangeUser);

  let result = 'miss';
  let score = 0;

  if (isComplementary) {
    result = 'perfect';
    score = 100;
  } else if (isSameAngle) {
    result = 'same-angle';
    score = 0;
  } else {
    result = 'miss';
    score = 0;
  }

  return {
    baseAngle: numBase,
    proposedAngle: numProposed,
    speed,
    gravity,
    isComplementary,
    isSameAngle,
    rangeBase: Math.round(rangeBase * 100) / 100,
    rangeUser: Math.round(rangeUser * 100) / 100,
    diff: Math.round(diff * 100) / 100,
    result,
    score,
    pointsBase: evaluateTrajectory(launchBase, { step: timeOfFlight(launchBase) / 70 }),
    pointsUser: evaluateTrajectory(launchUser, { step: timeOfFlight(launchUser) / 70 }),
  };
}
