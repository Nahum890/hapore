import {
  createLaunch,
  evaluateTrajectory,
  maxHeight,
  positionAt,
  range,
  timeOfFlight,
  velocityAt,
} from '../physics/projectileMotion.js';
import { GRAVITY } from '../physics/formulas.js';

export const LAB_LIMITS = {
  minSpeed: 1,
  maxSpeed: 60,
  minAngle: 0,
  maxAngle: 90,
  minHeight: 0,
  maxHeight: 40,
  minGravity: 0.5,
  maxGravity: 30,
};

export const PRESET_GRAVITIES = [
  { id: 'earth', labelEs: 'Tierra (9,8 m/s²)', labelJopara: 'Yvy (9,8 m/s²)', value: 9.8 },
  { id: 'earth-round', labelEs: 'Tierra redondeada (10 m/s²)', labelJopara: 'Yvy apu\'a (10 m/s²)', value: 10.0 },
  { id: 'moon', labelEs: 'Luna (1,62 m/s²)', labelJopara: 'Jasy (1,62 m/s²)', value: 1.62 },
  { id: 'mars', labelEs: 'Marte (3,71 m/s²)', labelJopara: 'Marte (3,71 m/s²)', value: 3.71 },
  { id: 'jupiter', labelEs: 'Júpiter (24,79 m/s²)', labelJopara: 'Júpiter (24,79 m/s²)', value: 24.79 },
];

export const LAB_I18N = {
  'gn-jopara': {
    title: 'Laboratorio de Movimiento Parabólico',
    subtitle: 'Emoambue umi variable ha ehecha mba\'éichapa oveve pe mba\'epu\'a offline.',
    assumptionsBadge: 'Condición ideal offline',
    assumptionsTitle: 'Mba\'éichapa oikuaa ko tembiapo (Supuestos físicos)',
    assumption1: 'Ndaipóri yvytu jepoko (sin resistencia del aire): noñemomichĩri pe pya\'ekue.',
    assumption2: 'Gravedad constante: opa hendápe omboguejy iguýpe peteĩcha.',
    assumption3: 'Yvy karapã: y = 0 m pe yvy tuichakue javeve.',
    speed: 'Pya\'ekue ñepyrũ (v₀)',
    angle: 'Ángulo de disparo (θ)',
    height: 'Yvatekue ñepyrũ (y₀)',
    gravity: 'Gravedad (g)',
    vectors: 'Hechauka vectores',
    velocityVector: 'Vector velocidad (v)',
    components: 'Componentes (vx, vy)',
    launchBtn: 'Mbovove',
    pauseBtn: 'Pausa',
    resumeBtn: 'Segui',
    resetBtn: 'Mopotĩ / Jehecha jey',
    saveGhostBtn: 'Ñongatu comparartyrã',
    clearGhostBtn: 'Moguete comparasión',
    metricsTitle: 'Mba\'e ojeipapáva (Métricas en tiempo real)',
    timeFlight: 'Tiempo de vuelo total',
    currentTime: 'Tiempo ko\'ág̃a',
    maxHeight: 'Yvatekue tuichavéva (Hmax)',
    maxRange: 'Alcance tuichavéva (R)',
    currentPos: 'Posición ko\'ág̃a (x, y)',
    currentSpeed: 'Pya\'ekue ko\'ág̃a (v)',
    horizontalVel: 'Pya\'ekue horizontal (vx)',
    verticalVel: 'Pya\'ekue vertical (vy)',
    ghostLegend: 'Trayectoria ñongatupyre (comparación)',
    currentLegend: 'Trayectoria ko\'ag̃agua',
    complementaryHint: 'Ángulo complementario: Mokõi ángulo ombotyva 90° (techapyrã 30° ha 60°) oguereko alcance peteĩchagua y₀ = 0 jave.',
  },
  es: {
    title: 'Laboratorio de Movimiento Parabólico',
    subtitle: 'Manipulá variables físicas y observá la trayectoria en tiempo real sin conexión.',
    assumptionsBadge: 'Modelo ideal offline',
    assumptionsTitle: 'Condiciones e hipótesis físicas del modelo',
    assumption1: 'Sin resistencia del aire (F_arrastre = 0): no hay pérdidas aerodinámicas.',
    assumption2: 'Gravedad constante y vertical hacia abajo en todo el recorrido.',
    assumption3: 'Suelo horizontal plano situado en y = 0 m.',
    speed: 'Rapidez inicial (v₀)',
    angle: 'Ángulo de elevación (θ)',
    height: 'Altura inicial (y₀)',
    gravity: 'Gravedad (g)',
    vectors: 'Mostrar vectores',
    velocityVector: 'Vector velocidad (v)',
    components: 'Componentes (vx, vy)',
    launchBtn: 'Lanzar',
    pauseBtn: 'Pausar',
    resumeBtn: 'Reanudar',
    resetBtn: 'Reiniciar',
    saveGhostBtn: 'Guardar para comparar',
    clearGhostBtn: 'Borrar comparación',
    metricsTitle: 'Métricas físicas calculadas',
    timeFlight: 'Tiempo total de vuelo',
    currentTime: 'Tiempo actual',
    maxHeight: 'Altura máxima (Hmax)',
    maxRange: 'Alcance horizontal (R)',
    currentPos: 'Posición actual (x, y)',
    currentSpeed: 'Rapidez actual (v)',
    horizontalVel: 'Componente horizontal (vx)',
    verticalVel: 'Componente vertical (vy)',
    ghostLegend: 'Trayectoria guardada (comparación)',
    currentLegend: 'Trayectoria actual',
    complementaryHint: 'Ángulos complementarios: Dos ángulos que suman 90° (por ejemplo 30° y 60°) logran el mismo alcance horizontal cuando y₀ = 0.',
  },
};

export function clampValue(val, min, max, fallback) {
  const n = Number(val);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

export function calculateLabPhysics({
  v0 = 20,
  angleDeg = 45,
  y0 = 0,
  gravity = GRAVITY,
  step = 0.04,
} = {}) {
  const safeV0 = clampValue(v0, LAB_LIMITS.minSpeed, LAB_LIMITS.maxSpeed, 20);
  const safeAngle = clampValue(angleDeg, LAB_LIMITS.minAngle, LAB_LIMITS.maxAngle, 45);
  const safeY0 = clampValue(y0, LAB_LIMITS.minHeight, LAB_LIMITS.maxHeight, 0);
  const safeGravity = clampValue(gravity, LAB_LIMITS.minGravity, LAB_LIMITS.maxGravity, GRAVITY);

  const launch = createLaunch(safeV0, safeAngle, { x0: 0, y0: safeY0, gravity: safeGravity });
  const duration = timeOfFlight(launch);
  const peakY = maxHeight(launch);
  const landingX = range(launch);

  // Peak time
  const tPeak = launch.vy > 0 ? launch.vy / launch.gravity : 0;
  const peakX = positionAt(launch, tPeak).x;

  const points = evaluateTrajectory(launch, { step, tMax: duration });

  return {
    launch,
    v0: safeV0,
    angleDeg: safeAngle,
    y0: safeY0,
    gravity: safeGravity,
    duration,
    peakY,
    peakX,
    tPeak,
    landingX,
    points,
    sampleAt: (t) => positionAt(launch, t),
    velocityAt: (t) => velocityAt(launch, t),
  };
}

export function compareTrajectories(physicsA, physicsB) {
  if (!physicsA || !physicsB) return null;
  const angleSum = physicsA.angleDeg + physicsB.angleDeg;
  const isComplementary = Math.abs(angleSum - 90) < 0.01;
  const rangeDiff = Math.abs(physicsA.landingX - physicsB.landingX);
  const heightDiff = physicsA.peakY - physicsB.peakY;
  const durationDiff = physicsA.duration - physicsB.duration;

  return {
    isComplementary,
    sameRange: rangeDiff < 0.05 && physicsA.y0 === 0 && physicsB.y0 === 0,
    rangeDiff,
    heightDiff,
    durationDiff,
    descriptionEs: isComplementary && physicsA.y0 === 0 && physicsB.y0 === 0
      ? `Ángulos complementarios (${physicsA.angleDeg}° y ${physicsB.angleDeg}°): alcanzan exactamente la misma distancia horizontal (${physicsA.landingX.toFixed(2)} m), pero el de mayor ángulo vuela más alto (${Math.max(physicsA.peakY, physicsB.peakY).toFixed(2)} m) y permanece más tiempo en el aire.`
      : `Diferencia de alcance: ${rangeDiff.toFixed(2)} m. Diferencia de altura máxima: ${Math.abs(heightDiff).toFixed(2)} m.`,
    descriptionJopara: isComplementary && physicsA.y0 === 0 && physicsB.y0 === 0
      ? `Ángulo complementario (${physicsA.angleDeg}° ha ${physicsB.angleDeg}°): og̃uahẽ peteĩ mombyrykue horizontal-pe (${physicsA.landingX.toFixed(2)} m), hákatu pe ángulo tuichavéva ojupi yvateve (${Math.max(physicsA.peakY, physicsB.peakY).toFixed(2)} m).`
      : `Diferencia alcance rehegua: ${rangeDiff.toFixed(2)} m. Diferencia yvatekue rehegua: ${Math.abs(heightDiff).toFixed(2)} m.`,
  };
}
