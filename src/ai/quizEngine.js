import { sanitizeMarkup } from '../utils/validation.js';

export function normalizeText(text) {
  return String(text ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[$\\`_]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const MATCH_CORRECT = 0.8;
const MATCH_CLOSE = 0.5;

/**
 * Interpreta la respuesta del alumno de todas las maneras posibles:
 * coincide con la respuesta canónica o con las palabras clave del tema
 * (incluyendo raíces de palabras para tolerar sinónimos y variantes).
 */
export function matchAnswer(question, userAnswer) {
  const user = normalizeText(userAnswer);
  const claves = (question?.claves ?? []).map((clave) => normalizeText(clave)).filter(Boolean);
  if (!user) {
    return { correct: false, close: false, score: 0, coincidentes: [] };
  }

  const canonical = normalizeText(question?.respuesta);
  if (canonical && (user === canonical || user.includes(canonical))) {
    return { correct: true, close: false, score: 1, coincidentes: claves };
  }

  const coincidentes = claves.filter((clave) => {
    if (user.includes(clave)) return true;
    const stem = clave.length >= 6 ? clave.slice(0, 5) : clave;
    return user.includes(stem);
  });
  const score = claves.length ? coincidentes.length / claves.length : 0;
  return {
    correct: score >= MATCH_CORRECT,
    close: score >= MATCH_CLOSE && score < MATCH_CORRECT,
    score,
    coincidentes,
  };
}

export function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Arma el cuestionario mezclando preguntas abiertas y de verdadero/falso,
 * acotado a la cantidad pedida y sin desbordes de índice.
 */
export function buildQuiz(bank, quantity) {
  const abiertas = shuffle((bank ?? []).filter((question) => question.tipo === 'abierta'));
  const vf = shuffle((bank ?? []).filter((question) => question.tipo === 'vf'));
  const mixed = [];
  const max = Math.max(abiertas.length, vf.length);
  for (let i = 0; i < max; i += 1) {
    if (abiertas[i]) mixed.push(abiertas[i]);
    if (vf[i]) mixed.push(vf[i]);
  }
  const clamped = Math.min(Math.max(Number(quantity) || 1, 1), mixed.length);
  return mixed.slice(0, clamped);
}

/**
 * Encuentra la mejor coincidencia conceptual del banco para la pregunta
 * del estudiante (soporte offline de la charla libre): matcheo tolerante
 * por palabras clave y raíces de palabras.
 */
export function findBestMatch(question, bank) {
  const userText = normalizeText(question);
  if (!userText) return null;
  const userWords = new Set(userText.split(' ').filter((word) => word.length > 3));
  let best = null;
  let bestScore = 0;
  for (const entry of bank ?? []) {
    const haystack = normalizeText(
      [entry?.pregunta, entry?.enunciado, entry?.respuesta, entry?.explicacion, entry?.tema]
        .filter(Boolean)
        .join(' '),
    );
    const entryWords = new Set(haystack.split(' ').filter((word) => word.length > 3));
    let hits = 0;
    for (const word of userWords) {
      if (entryWords.has(word)) {
        hits += 1;
      } else if (word.length >= 6 && haystack.includes(word.slice(0, 5))) {
        hits += 1;
      }
    }
    const score = userWords.size ? hits / userWords.size : 0;
    if (score > bestScore) {
      bestScore = score;
      best = entry;
    }
  }
  if (best && bestScore >= 0.25) {
    return { entry: best, score: bestScore };
  }
  return null;
}

const QUIZ_ENCOURAGEMENTS = [
  '¡Ndaipóri problema! Fue un buen intento.',
  '¡Ani kaneo! Casi lo tenés, seguí así.',
  '¡Ikatu jey! Fue un buen intento, ahora mirá la respuesta.',
  '¡Poraha iteréi! Pero vas aprendiendo: ehécha la respuesta.',
];

function encouragement() {
  return QUIZ_ENCOURAGEMENTS[Math.floor(Math.random() * QUIZ_ENCOURAGEMENTS.length)];
}

/**
 * Corrección offline del cuestionario (reglas + JSON local):
 * - Si acierta o se acerca: confirma, muestra la respuesta real y por qué se acercó.
 * - Si se equivoca: palabras de aliento + la respuesta correcta en jopara.
 */
export function buildQuizFeedback(context = {}) {
  const {
    esCorrecta = false,
    esCercana = false,
    esVerdadero = false,
    marcadoVerdadero = false,
    respuestaCorrecta = '',
    respuestaJopara = '',
    explicacion = '',
    explicacionJopara = '',
    coincidentes = [],
  } = context;

  if (typeof context.esVerdadero === 'boolean') {
    if (esVerdadero && marcadoVerdadero) {
      return sanitizeMarkup(
        `¡Ikatu! Estás en lo correcto. Es verdadero porque: ${explicacion} ${explicacionJopara}`,
      );
    }
    if (esVerdadero && !marcadoVerdadero) {
      return sanitizeMarkup(
        `${encouragement()} En realidad la afirmación es verdadera: ${explicacion} ${explicacionJopara}`,
      );
    }
    if (!esVerdadero && marcadoVerdadero) {
      return sanitizeMarkup(
        `${encouragement()} En realidad es falsa: ${explicacion} ${explicacionJopara}`,
      );
    }
    return sanitizeMarkup(
      `${encouragement()} Es falsa porque: ${explicacion} ${explicacionJopara}`,
    );
  }

  if (esCorrecta) {
    return sanitizeMarkup(
      `¡Ikatu! Respuesta correcta. ${respuestaJopara || explicacion}`,
    );
  }
  if (esCercana) {
    const cerca = coincidentes.length ? ` Coincidiste en: ${coincidentes.join(', ')}.` : '';
    return sanitizeMarkup(
      `¡Iporã! Te acercaste mucho a la respuesta.${cerca} La respuesta real es: ${respuestaCorrecta}. ${explicacion}`,
    );
  }
  return sanitizeMarkup(
    `${encouragement()} La respuesta real es: ${respuestaCorrecta}. ${respuestaJopara || explicacion}`,
  );
}
