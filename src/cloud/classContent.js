// Contenido que llega del docente por la nube (paquete de clase, clases y
// actividades del chat). La app del docente lo arma bien, pero cualquiera con
// una sesión puede escribirlo a mano contra la API: un campo con otro tipo
// (hints que no es lista, slides que falta, números absurdos) rompía la app
// del alumno cada vez que la abría, porque el paquete queda guardado. Acá se
// normaliza antes de guardarlo o mostrarlo.

const KEY = /^[A-Za-z_][A-Za-z0-9_]{0,40}$/;
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const SCENARIOS = new Set(['dron', 'basketball', 'wall']);
const SLIDE_TYPES = new Set(['titulo', 'texto', 'concepto', 'ejercicio', 'simulador']);
// Rangos físicamente razonables; fuera de esto el dato se descarta.
const NUMBER_LIMITS = {
  v0: [0, 1000], v0B: [0, 1000], vx: [-1000, 1000], t: [0, 1000],
  angle: [0, 90], angleA: [0, 90], angleB: [0, 90],
  gravity: [0.01, 100], targetDistance: [0, 100000], x0: [0, 10000], y0: [0, 10000], h0: [0, 10000],
};

const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = (value, max = 2000) => (typeof value === 'string' ? value.slice(0, max) : '');

function boundedNumber(key, value) {
  const number = Number(value);
  if (typeof value === 'boolean' || value === null || value === '' || !Number.isFinite(number)) return undefined;
  const [min, max] = NUMBER_LIMITS[key] ?? [-1e9, 1e9];
  return number >= min && number <= max ? number : undefined;
}

/** Copia solo campos simples: textos (recortados), números finitos dentro de
 * rango, booleanos y listas de textos. Descarta objetos anidados y claves raras. */
function plainFields(raw, { maxString = 2000, maxList = 12 } = {}) {
  const out = {};
  if (!isObject(raw)) return out;
  for (const [key, value] of Object.entries(raw).slice(0, 80)) {
    if (!KEY.test(key) || FORBIDDEN_KEYS.has(key)) continue;
    if (typeof value === 'string') out[key] = value.slice(0, maxString);
    else if (typeof value === 'number') { const number = boundedNumber(key, value); if (number !== undefined) out[key] = number; }
    else if (typeof value === 'boolean') out[key] = value;
    else if (Array.isArray(value) && value.every(item => typeof item === 'string')) out[key] = value.slice(0, maxList).map(item => item.slice(0, maxString));
  }
  return out;
}

export function sanitizeExercise(raw) {
  if (!isObject(raw)) return null;
  const base = plainFields(raw);
  const id = text(base.id, 120);
  if (!id) return null;
  const values = {};
  if (isObject(raw.values)) {
    for (const key of Object.keys(NUMBER_LIMITS)) {
      const number = boundedNumber(key, raw.values[key]);
      if (number !== undefined) values[key] = number;
    }
  }
  const obstacle = isObject(raw.obstacle)
    ? { x: boundedNumber('targetDistance', raw.obstacle.x), height: boundedNumber('y0', raw.obstacle.height) }
    : null;
  return {
    ...base,
    id,
    topic: base.topic || 'Movimiento Parabólico',
    scenario: SCENARIOS.has(base.scenario) ? base.scenario : 'dron',
    question: base.question ?? '',
    values,
    hints: Array.isArray(base.hints) ? base.hints : [],
    tolerance: Number.isFinite(base.tolerance) && base.tolerance >= 0 ? base.tolerance : 0.01,
    ...(obstacle && obstacle.x !== undefined && obstacle.height !== undefined ? { obstacle } : {}),
  };
}

export function sanitizeCard(raw) {
  if (!isObject(raw)) return null;
  const base = plainFields(raw);
  const id = text(base.id, 120);
  return id ? { ...base, id } : null;
}

export function sanitizeLesson(raw) {
  if (!isObject(raw)) return null;
  const slides = (Array.isArray(raw.slides) ? raw.slides : []).slice(0, 80)
    .filter(isObject)
    .map(slide => ({ ...plainFields(slide, { maxString: 4000 }), type: SLIDE_TYPES.has(slide.type) ? slide.type : 'texto' }));
  if (!slides.length) return null;
  return { id: text(raw.id, 120) || 'clase', title: text(raw.title, 200), description: text(raw.description, 2000), slides };
}

const list = (value, max, sanitize) => (Array.isArray(value) ? value.slice(0, max).map(sanitize).filter(Boolean) : []);

function sanitizeFlags(raw) {
  if (!isObject(raw)) return null;
  const defs = list(raw.defs, 30, def => {
    const clean = plainFields(def, { maxString: 64 });
    if (!clean.id || !clean.name) return null;
    return { ...clean, color: /^#[0-9a-f]{3,8}$/i.test(clean.color ?? '') ? clean.color : '#475569' };
  });
  const byExercise = Object.fromEntries(Object.entries(isObject(raw.byExercise) ? raw.byExercise : {})
    .filter(([key, value]) => typeof key === 'string' && key.length <= 120 && !FORBIDDEN_KEYS.has(key) && typeof value === 'string' && value.length <= 64)
    .slice(0, 600));
  return { defs, byExercise };
}

/** Paquete de clase que descarga el alumno (classes.content). */
export function sanitizeClassContent(raw) {
  const content = isObject(raw) ? raw : {};
  const config = isObject(content.config) ? content.config : {};
  const flags = sanitizeFlags(content.flags);
  return {
    version: Number.isFinite(content.version) ? content.version : 1,
    ...(flags ? { flags } : {}),
    config: {
      subtemas: Array.isArray(config.subtemas) ? config.subtemas.filter(item => typeof item === 'string').slice(0, 30).map(item => item.slice(0, 60)) : [],
      ejercicios: Math.max(0, Math.min(500, Math.floor(Number(config.ejercicios) || 0))),
      flashcards: Math.max(0, Math.min(1000, Math.floor(Number(config.flashcards) || 0))),
      ...(Array.isArray(config.topics) ? { topics: config.topics.filter(id => typeof id === 'string' && id.length <= 40).slice(0, 60) } : {}),
    },
    cards: list(content.cards, 400, sanitizeCard),
    exercises: list(content.exercises, 300, sanitizeExercise),
  };
}

/** Adjuntos del chat: clase ("lesson") y actividad ("activity"). */
export function sanitizeLessonPayload(payload) {
  const lesson = sanitizeLesson(payload?.lesson);
  return lesson ? { lesson, exercises: list(payload?.exercises, 100, sanitizeExercise) } : null;
}

export function sanitizeActivityPacket(raw) {
  if (!isObject(raw)) return null;
  const cards = list(raw.cards, 200, sanitizeCard);
  const exercises = list(raw.exercises, 100, sanitizeExercise);
  return { id: text(raw.id, 120) || 'actividad', title: text(raw.title, 200), description: text(raw.description, 2000), cards, exercises };
}
