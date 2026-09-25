import { sanitizeMarkup } from '../utils/validation.js';

export function normalizeText(text) {
  return String(text ?? '').toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

export const MATCH_DEFAULTS = Object.freeze({ correctThreshold: 0.8, closeThreshold: 0.5 });
export const SYNONYMS = Object.freeze({
  'no cambia': ['permanece constante', 'se mantiene constante', 'sigue igual', 'no varia'],
  disminuye: ['se reduce', 'decrece', 'baja', 'disminuir'],
  aumenta: ['se incrementa', 'crece', 'aumentar'],
  gravedad: ['aceleracion gravitatoria', 'atraccion terrestre'],
  parabola: ['parabolica', 'parabolico'],
  horizontal: ['eje x'], vertical: ['eje y'],
  altura: ['elevacion'], 'altura maxima': ['punto mas alto', 'cuspide'],
  combinacion: ['composicion', 'union', 'suma'],
  cero: ['nula', 'nulo', '0'], frena: ['desacelera', 'reduce la velocidad'],
  alargamiento: ['elongacion', 'estiramiento'],
  resorte: ['muelle'], rigidez: ['constante elastica'],
  direccion: ['orientacion'], rapidez: ['modulo de la velocidad'],
});
const STOP = new Set(('que como cual cuales cuando donde porque para pero por una uno unos unas los las del con entre sobre desde hasta este esta esto esa ese son ser sea tiene tienen vale todo toda todos durante solo siempre parte forma muy mas hay cada').split(' '));
const NEGATION = new Set(['no', 'nunca', 'sin', 'jamas']);

function canonicalize(text, synonyms = {}) {
  let result = ' ' + normalizeText(text) + ' ';
  const replacements = Object.entries({ ...SYNONYMS, ...synonyms })
    .flatMap(([key, variants]) => (Array.isArray(variants) ? variants : []).map(value => [normalizeText(value), normalizeText(key)]))
    .sort((a, b) => b[0].length - a[0].length);
  for (const [from, to] of replacements) {
    if (from) result = result.replaceAll(' ' + from + ' ', ' ' + to + ' ');
  }
  return result.trim();
}
function threshold(value, fallback) {
  return Number.isFinite(value) && value >= 0 && value <= 1 ? value : fallback;
}
function polarities(text, phrase) {
  const words = text.split(' '), needle = phrase.split(' '), result = [];
  for (let i = 0; i <= words.length - needle.length; i += 1) {
    if (needle.every((word, offset) => words[i + offset] === word)) {
      result.push(words.slice(Math.max(0, i - 3), i).some(word => NEGATION.has(word)));
    }
  }
  return result;
}
function compare(userAnswer, expectedText, keys, options = {}) {
  const user = canonicalize(userAnswer, options.synonyms);
  const expected = canonicalize(expectedText, options.synonyms);
  const empty = { correct: false, close: false, score: 0, coincidentes: [] };
  if (!user || !expected) return empty;
  const normalizedKeys = [...new Set(keys.map(key => canonicalize(key, options.synonyms)).filter(Boolean))];
  const coincidentes = normalizedKeys.filter(key => polarities(user, key).length > 0);
  const opposite = (expected.includes('no cambia') && /\b(aumenta|disminuye)\b/.test(user))
    || (expected.includes('disminuye') && user.includes('aumenta'))
    || (expected.includes('aumenta') && user.includes('disminuye'));
  const contradiction = opposite || coincidentes.some(key => {
    const reference = polarities(expected, key), answers = polarities(user, key);
    return reference.length && answers.some(polarity => !reference.includes(polarity));
  });
  if (contradiction) return { ...empty, contradiction: true, coincidentes };
  const score = user === expected ? 1 : normalizedKeys.length ? coincidentes.length / normalizedKeys.length : 0;
  const correctAt = threshold(options.correctThreshold, MATCH_DEFAULTS.correctThreshold);
  const closeAt = Math.min(correctAt, threshold(options.closeThreshold, MATCH_DEFAULTS.closeThreshold));
  return { correct: score >= correctAt && score > 0, close: score >= closeAt && score < correctAt && score > 0, score, coincidentes };
}
export function matchAnswer(question, answer, options = {}) {
  return compare(answer, question?.respuesta, question?.claves ?? [], options);
}
export function matchText(answer, expected, options = {}) {
  const keys = canonicalize(expected, options.synonyms).split(' ').filter(word => word.length > 3 && !STOP.has(word));
  return compare(answer, expected, keys, { correctThreshold: 0.5, closeThreshold: 0.25, ...options });
}
export function evaluateQuizContext(context = {}) {
  const local = typeof context.esCorrecta === 'boolean'
    ? { correct: context.esCorrecta, close: Boolean(context.esCercana), coincidentes: context.coincidentes ?? [] }
    : matchText(context.respuestaAlumno ?? context.justificacion ?? '', context.respuestaCorrecta || context.explicacion || '');
  const correct = typeof context.esVerdadero === 'boolean'
    ? context.marcadoVerdadero === context.esVerdadero && (context.marcadoVerdadero || local.correct)
    : local.correct;
  return { ...local, correct: Boolean(correct) };
}
export function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
export function buildQuiz(bank, quantity) {
  const unique = [...new Map((bank ?? []).filter(q => q?.id).map(q => [q.id, q])).values()];
  const abiertas = shuffle(unique.filter(q => q.tipo === 'abierta'));
  const vf = shuffle(unique.filter(q => q.tipo === 'vf'));
  const mixed = [];
  for (let i = 0; i < Math.max(abiertas.length, vf.length); i += 1) {
    if (abiertas[i]) mixed.push(abiertas[i]);
    if (vf[i]) mixed.push(vf[i]);
  }
  const count = Number.isFinite(Number(quantity)) ? Math.max(0, Math.floor(Number(quantity))) : 0;
  return mixed.slice(0, count);
}
export function findBestMatch(question, bank, options = {}) {
  const words = [...new Set(canonicalize(question, options.synonyms).split(' ').filter(word => word.length > 3 && !STOP.has(word)))];
  if (!words.length) return null;
  let best = null;
  for (const entry of bank ?? []) {
    const text = canonicalize([entry.pregunta, entry.enunciado, entry.respuesta, entry.explicacion, entry.tema].filter(Boolean).join(' '), options.synonyms);
    const hits = words.filter(word => polarities(text, word).length).length;
    const score = hits / words.length;
    if (score >= threshold(options.minScore, 0.4) && (!best || score > best.score)) best = { entry, score };
  }
  return best;
}
export function buildQuizFeedback(context = {}) {
  const verdict = evaluateQuizContext(context);
  const explanation = context.explicacion ?? '';
  const translation = context.respuestaJopara || context.explicacionJopara || '';
  if (typeof context.esVerdadero === 'boolean') {
    const truth = context.esVerdadero ? 'verdadera' : 'falsa';
    const opening = verdict.correct ? '¡Bien! Tu respuesta y la explicación son correctas.'
      : !context.marcadoVerdadero && !context.esVerdadero ? 'Identificaste que es falsa. Revisemos la justificación.'
      : 'Buen intento. La afirmación es ' + truth + '.';
    return sanitizeMarkup([opening, explanation, translation].filter(Boolean).join(' '));
  }
  if (verdict.correct) return sanitizeMarkup(['¡Bien! Respuesta correcta.', context.respuestaCorrecta, explanation, translation].filter(Boolean).join(' '));
  const opening = verdict.close ? 'Te acercaste: algunas ideas coinciden.' : 'Buen intento. Vamos a repasarlo.';
  return sanitizeMarkup([opening, 'La respuesta es: ' + (context.respuestaCorrecta || explanation), explanation, translation].filter(Boolean).join(' '));
}
