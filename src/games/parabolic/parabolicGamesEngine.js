import {
  createLaunch,
  evaluateTrajectory,
  maxHeight,
  positionAt,
  range,
  timeOfFlight,
} from '../../physics/projectileMotion.js';
import { GRAVITY } from '../../physics/formulas.js';

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
    subtitle: 'Ehecha ne katupyry umi reto offline rupive: embota pe blanco ha ehesa\'ỹijo umi ángulo complementario.',
    targetTab: 'Reto 1: Mbota Blanco-pe (Examen)',
    compTab: 'Reto 2: Ángulo Complementario (Examen)',
    targetTitle: 'Reto 1: Tiro al Blanco (Cálculo de Rapidez)',
    targetSubtitle: 'Eipuru pe fórmula física ehupyty hag̃ua pe blanco exacto, ndaha\'éi tanteo rupive.',
    targetProblemData: 'Datos del problema:',
    targetGoalLabel: 'Blanco mombyrykue (R)',
    targetAngleLabel: 'Ángulo fijo (θ)',
    targetGravityLabel: 'Gravedad (g)',
    targetInputLabel: 'Ehai ne rapidez calculada (v₀):',
    targetInputPlaceholder: 'Techapyrã: 15.65',
    targetCalcHelpBtn: '📖 Mba\'éichapa oñedespeha ko fórmula',
    targetFireBtn: '🚀 Mbovove proyectil',
    targetNextBtn: 'Nivel pyahu',
    targetHitExact: '¡Impacto Exacto! Rejapóma pe cálculo porã ({speed} m/s). Pe proyectil ho\'a exactamente {landing} m-pe (Objetivo: {target} m).',
    targetMissFar: 'Tiro desviado: Rehai {speed} m/s ha ho\'a {landing} m-pe (ojoavy {diff} m pe blanco {target} m-gui). Examen-pe eipuru: v₀ = √(R · g / sin(2θ)).',
    targetInvalid: 'Ehai peteĩ número válido (techapyrã: 15.65).',
    targetFormulaHelp: 'Fórmula alcance rehegua: R = (v₀² · sin(2θ)) / g. Edespehávo v₀: v₀ = √( (R · g) / sin(2θ) ).',
    distanceLabel: 'Blanco mombyrykue',
    speedLabel: 'Pya\'ekue (v₀)',
    angleLabel: 'Ángulo (θ)',
    compTitle: 'Reto: Problema de Examen — Ángulo Complementario',
    compProblemTitle: 'Problema de Física',
    compProblemData: 'Datos del lanzamiento inicial:',
    compSpeed: 'Pya\'ekue ñepyrũ (v₀)',
    compBaseAngle: 'Ángulo ñepyrũ (θ₁)',
    compGravity: 'Gravedad (g)',
    compRangeObtained: 'Alcance horizontal ohupytýva (R)',
    compQuestion: '¿Mba\'e ambue ángulo θ₂ (ojoavýva θ₁-gui) reheve ojehupytýta exactamente ko alcance {range} mite?',
    compInputLabel: 'Ehai ne ángulo calculado (θ₂):',
    compInputPlaceholder: 'Techapyrã: 60',
    compTestBtn: '🧪 Ehesa\'ỹijo fórmula ha simulación',
    compSuccess: '¡Cálculo Exacto! θ₂ = {angle}° ha\'e pe ángulo complementario añeteguáva. Mokõive disparo og̃uahẽ exactamente {range} m-pe.',
    compFail: 'Cálculo incorrecto: Ne ángulo {angle}° ome\'ẽ alcance {userRange} m (ojoavy {diff} m pe objetivo {baseRange} m-gui). Examen-pe eipuru: θ₂ = 90° - θ₁.',
    compSameAngle: 'Rehai jey pe ángulo ñepyrũgua ({baseAngle}°). Tekotevẽ eikuaa pe ambue ángulo ojoavýva ohupytýva upe distancia.',
    compInvalidNumber: 'Ehai peteĩ número válido (techapyrã: 60 térã 65.5).',
    scoreLabel: 'Puntaje',
    compProofTitle: 'Mba\'éichapa oñemyesakã ko problema (Resolución analítica):',
    compProof1: 'Fórmula de alcance horizontal:',
    compProof2: 'Mba\'érepa mokõi ángulo ohupyty peteĩchagua alcance?',
    compProof3: 'Identidad trigonométrica: sin(2·θ₂) = sin(2·(90° - θ₁)) = sin(180° - 2θ₁) = sin(2θ₁). Upévare mokõive ángulo oguereko alcance idéntico.',
    compTableTitle: 'Mbojoja trayectorias rehegua:',
    compTableCol1: 'Mba\'e ojeipapáva',
    compTableCol2: 'Disparo 1 (θ₁ = {baseAngle}°)',
    compTableCol3: 'Disparo 2 (θ₂ = {userAngle}°)',
    compTableRange: 'Alcance horizontal (R)',
    compTableHeight: 'Yvatekue tuichavéva (Hmax)',
    compTableDuration: 'Tiempo de vuelo (t)',
  },
  es: {
    title: 'Minijuegos de Movimiento Parabólico',
    subtitle: 'Poné a prueba tus habilidades físicas sin conexión: acertá al blanco y resolvé el problema de ángulos complementarios con precisión de examen.',
    targetTab: 'Reto 1: Tiro al Blanco (Examen)',
    compTab: 'Reto 2: Ángulo Complementario (Examen)',
    targetTitle: 'Reto 1: Tiro al Blanco (Cálculo de Rapidez)',
    targetSubtitle: 'Resolvé el problema con la fórmula de cinemática para acertar exactamente al blanco sin tanteos.',
    targetProblemData: 'Datos del problema:',
    targetGoalLabel: 'Distancia al blanco (R)',
    targetAngleLabel: 'Ángulo de elevación fijo (θ)',
    targetGravityLabel: 'Gravedad (g)',
    targetInputLabel: 'Ingresá tu rapidez calculada (v₀):',
    targetInputPlaceholder: 'Ej: 15.65',
    targetCalcHelpBtn: '📖 ¿Cómo despejar y resolver este ejercicio? (Paso a paso)',
    targetFireBtn: '🚀 Disparar proyectil',
    targetNextBtn: 'Siguiente nivel',
    targetHitExact: '¡Impacto exacto! Tu cálculo de v₀ = {speed} m/s es correcto. El proyectil cayó a {landing} m (Objetivo: {target} m).',
    targetMissFar: 'Tiro desviado: Con {speed} m/s el proyectil cayó a {landing} m (diferencia de {diff} m respecto al blanco de {target} m). En un examen aplicá: v₀ = √(R · g / sin(2θ)).',
    targetInvalid: 'Ingresá un número válido (ejemplo: 15.65 o 19.80).',
    targetFormulaHelp: 'Fórmula del alcance: R = (v₀² · sin(2θ)) / g. Despejando la rapidez inicial v₀: v₀ = √( (R · g) / sin(2θ) ).',
    distanceLabel: 'Distancia al blanco',
    speedLabel: 'Rapidez (v₀)',
    angleLabel: 'Ángulo (θ)',
    compTitle: 'Reto: Problema de Examen — Ángulos Complementarios',
    compProblemTitle: 'Problema de Física Teórica',
    compProblemData: 'Datos del enunciado:',
    compSpeed: 'Rapidez inicial (v₀)',
    compBaseAngle: 'Ángulo inicial (θ₁)',
    compGravity: 'Gravedad (g)',
    compRangeObtained: 'Alcance horizontal obtenido (R)',
    compQuestion: '¿Con qué otro ángulo θ₂ (distinto de θ₁) se logrará exactamente el mismo alcance de {range} m?',
    compInputLabel: 'Ingresá tu ángulo calculado (θ₂):',
    compInputPlaceholder: 'Ej: 60',
    compTestBtn: '🧪 Probar fórmula y simular',
    compSuccess: '¡Cálculo exacto! θ₂ = {angle}° es el ángulo complementario correcto. Ambos disparos logran exactamente {range} m.',
    compFail: 'Cálculo incorrecto: Tu ángulo {angle}° dio un alcance de {userRange} m (diferencia de {diff} m respecto al objetivo {baseRange} m). En un examen recordá aplicar: θ₂ = 90° - θ₁.',
    compSameAngle: 'Ingresaste el mismo ángulo inicial ({baseAngle}°). El problema pide hallar el otro ángulo diferente que logre la misma distancia.',
    compInvalidNumber: 'Ingresá un valor numérico válido (por ejemplo: 60 o 65.5).',
    scoreLabel: 'Puntaje',
    compProofTitle: 'Resolución analítica paso a paso (demostración de examen):',
    compProof1: 'Fórmula de alcance horizontal ideal:',
    compProof2: 'Condición de simetría complementaria:',
    compProof3: 'Identidad trigonométrica: sin(2·θ₂) = sin(2·(90° - θ₁)) = sin(180° - 2θ₁) = sin(2θ₁). Por ende, R₁ = R₂ exactamente.',
    compTableTitle: 'Comparación analítica entre trayectorias:',
    compTableCol1: 'Parámetro físico',
    compTableCol2: 'Disparo inicial (θ₁ = {baseAngle}°)',
    compTableCol3: 'Tu disparo (θ₂ = {userAngle}°)',
    compTableRange: 'Alcance horizontal (R)',
    compTableHeight: 'Altura máxima (Hmax)',
    compTableDuration: 'Tiempo de vuelo (t)',
  },
};

/**
 * Evaluates a shot against a target with strict academic precision.
 */
export function evaluateTargetShot({
  speed,
  angleDeg = 45,
  targetDistance,
  tolerance = 0.2,
  gravity = GRAVITY,
}) {
  const rawInput = typeof speed === 'string'
    ? speed.trim().replace(',', '.')
    : speed;
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
      sampleAt: () => ({ x: 0, y: 0 }),
    };
  }

  const launch = createLaunch(numSpeed, angleDeg, { x0: 0, y0: 0, gravity });
  const landingX = range(launch);
  const peakY = maxHeight(launch);
  const duration = timeOfFlight(launch);
  const diff = Math.abs(landingX - targetDistance);

  let result = 'miss';
  let score = 0;

  // Strict precision: only within academic rounding tolerance is considered a hit
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
    landingX,
    peakY,
    duration,
    targetDistance,
    diff,
    tolerance,
    result,
    score,
    points,
    sampleAt: (t) => positionAt(launch, t),
  };
}

/**
 * Evaluates complementary angle prediction with strict academic precision.
 */
export function evaluateComplementaryChallenge({
  baseAngle,
  proposedAngle,
  speed = 20,
  gravity = GRAVITY,
}) {
  const numBase = Number(baseAngle);
  const rawInput = typeof proposedAngle === 'string'
    ? proposedAngle.trim().replace(',', '.')
    : proposedAngle;
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
      peakBase: 0,
      peakUser: 0,
      durationBase: 0,
      durationUser: 0,
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

  const durationBase = timeOfFlight(launchBase);
  const durationUser = timeOfFlight(launchUser);

  const peakBase = maxHeight(launchBase);
  const peakUser = maxHeight(launchUser);

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
    rangeBase,
    rangeUser,
    diff,
    peakBase,
    peakUser,
    durationBase,
    durationUser,
    result,
    score,
    pointsBase: evaluateTrajectory(launchBase, { step: durationBase / 70 }),
    pointsUser: evaluateTrajectory(launchUser, { step: durationUser / 70 }),
  };
}
