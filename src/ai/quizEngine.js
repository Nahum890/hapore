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
// Aperturas del feedback en los dos idiomas soportados. El resto del mensaje
// (explicación, respuesta correcta) ya viene del banco de preguntas, que trae
// su propio campo *Jopara cuando existe.
const QUIZ_OPENINGS = {
  vf_correct: { es: '¡Bien! Tu respuesta y la explicación son correctas.', jopara: '¡Iporã! Nde respuesta ha explicación ha\'e correcta.' },
  vf_identified_false: { es: 'Identificaste que es falsa. Revisemos la justificación.', jopara: 'Ere ha\'eha falsa. Jahecha jey pe justificación.' },
  vf_attempt: { es: 'Buen intento. La afirmación es', jopara: 'Eñeha\'ã porã. Pe afirmación ha\'e' },
  vf_true: { es: 'verdadera', jopara: 'verdadera' },
  vf_false: { es: 'falsa', jopara: 'falsa' },
  open_correct: { es: '¡Bien! Respuesta correcta.', jopara: '¡Iporã! Respuesta correcta.' },
  open_close: { es: 'Te acercaste: algunas ideas coinciden.', jopara: 'Eñemboja porãma: peteĩ heta idea ojoja.' },
  open_retry: { es: 'Buen intento. Vamos a repasarlo.', jopara: 'Eñeha\'ã porã. Jahecha jey.' },
  answer_is: { es: 'La respuesta es:', jopara: 'Pe respuesta ha\'e:' },
};
function say(key, language) {
  const entry = QUIZ_OPENINGS[key];
  return language === 'es' ? entry.es : entry.jopara;
}
export function buildQuizFeedback(context = {}) {
  const language = context.language === 'es' ? 'es' : 'gn-jopara';
  const verdict = evaluateQuizContext(context);
  const explanation = context.explicacion ?? '';
  const translation = language !== 'es' ? (context.respuestaJopara || context.explicacionJopara || '') : '';
  if (typeof context.esVerdadero === 'boolean') {
    const opening = verdict.correct ? say('vf_correct', language)
      : !context.marcadoVerdadero && !context.esVerdadero ? say('vf_identified_false', language)
      : say('vf_attempt', language) + ' ' + say(context.esVerdadero ? 'vf_true' : 'vf_false', language) + '.';
    return sanitizeMarkup([opening, explanation, translation].filter(Boolean).join(' '));
  }
  if (verdict.correct) return sanitizeMarkup([say('open_correct', language), context.respuestaCorrecta, explanation, translation].filter(Boolean).join(' '));
  const opening = verdict.close ? say('open_close', language) : say('open_retry', language);
  return sanitizeMarkup([opening, say('answer_is', language) + ' ' + (context.respuestaCorrecta || explanation), explanation, translation].filter(Boolean).join(' '));
}
