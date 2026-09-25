import { concepts, errors as errorsData, exercises, glossary, quizBank, tutorJopara as tutorData } from '../data/catalogs.js';
import { buildQuizFeedback, evaluateQuizContext, normalizeText } from './quizEngine.js';
import { sanitizeMarkup } from '../utils/validation.js';

export const HINT_LEVELS_MAX = 5;
const CHAT_STOP_WORDS = new Set('que como cual cuales cuando donde porque para pero por una uno unos unas los las del con entre sobre desde hasta este esta esto esa ese son ser sea tiene tienen vale todo toda todos durante solo parte forma muy mas hay cada me te se es al lo la un y o de en mi tu explicar explicame decir decime ayudar ayuda funciona'.split(' '));
const stemWord = (word) => word.replace(/idades$/u, 'idad').replace(/(aciones|acion|imientos|imiento|amientos|amiento|idad|mente|ando|iendo|ados|adas|idos|idas|es|os|as|s)$/u, '');
function chatTokens(value) {
  return [...new Set(normalizeText(value).split(/[^a-z0-9]+/u).map(stemWord).filter(word => word.length > 2 && !CHAT_STOP_WORDS.has(word)))];
}
function bestKnowledgeMatch(message, records) {
  const query = chatTokens(message);
  if (!query.length) return null;
  let best = null;
  for (const record of records) {
    const words = new Set(chatTokens(record.search));
    const hits = query.filter(word => words.has(word) || (word.length >= 6 && [...words].some(candidate => candidate.length >= 6 && (candidate.startsWith(word) || word.startsWith(candidate)))));
    const score = hits.reduce((sum, word) => sum + (word.length > 6 ? 1.2 : 1), 0) / query.reduce((sum, word) => sum + (word.length > 6 ? 1.2 : 1), 0);
    if (score >= 0.35 && (!best || score > best.score)) best = { ...record, score };
  }
  return best;
}
export function obtenerVariantePista(variants, previous) {
  if (!Array.isArray(variants)) return variants ?? null;
  const choices = variants.filter(text => typeof text === 'string' && text.trim());
  const fresh = choices.filter(text => text !== previous);
  const pool = fresh.length ? fresh : choices;
  return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
}

export default class RuleTutorProvider {
  constructor(options = {}) {
    this.id = 'rule-tutor';
    this.data = options.data ?? tutorData;
    this.errors = options.errors ?? errorsData;
    this.exercises = options.exercises ?? exercises;
    this.bank = options.bank ?? quizBank;
    this.concepts = options.concepts ?? concepts;
    this.glossary = options.glossary ?? glossary;
    this.levels = options.levels ?? this.data.hintLevels;
    this.previous = new Map();
  }
  choose(key, variants) {
    const text = obtenerVariantePista(variants, this.previous.get(key));
    this.previous.set(key, text);
    return text;
  }
  result(message, extra = {}) {
    return { message: sanitizeMarkup(message || this.data.fallbackHint || 'Revisá el enunciado paso a paso.'), source: this.id, available: true, ...extra };
  }
  async respond(context = {}) {
    if (context.tipo === 'evaluacion_cuestionario') {
      const verdict = evaluateQuizContext(context);
      return this.result(buildQuizFeedback({ ...context, esCorrecta: verdict.correct }), verdict);
    }
    if (context.tipo === 'charla_libre') {
      const question = normalizeText(context.message);
      if (/^(hola|buenas|mba.?eichapa|maitei)\b/.test(question)) return this.result(this.choose('chat:greeting', this.data.greetings));
      if (/\b(gracias|aguyje)\b/.test(question)) return this.result('¡De nada! Seguí preguntando: podemos repasar un concepto o resolver un ejercicio paso a paso.');
      const knowledge = [
        ...this.concepts.map(item => ({ kind: 'concept', search: `${item.id} ${item.name} ${item.definition} ${item.formula}`, answer: `${item.name}: ${item.definition}${item.formula ? ` Fórmula: ${item.formula}.` : ''}` })),
        ...this.glossary.map(item => ({ kind: 'glossary', search: `${item.term} ${item.joparaTerm} ${item.definition}`, answer: `${item.term}: ${item.definition}` })),
        ...this.errors.map(item => ({ kind: 'error', search: `${item.name} ${item.description} ${item.example} ${item.expectedConcept}`, answer: `${item.name}: ${item.description} ${item.example}` })),
        ...this.bank.map(item => ({ kind: 'question', search: `${item.pregunta} ${item.enunciado} ${item.respuesta} ${item.explicacion} ${item.tema}`, answer: [item.respuesta || item.explicacion, item.respuestaJopara || item.explicacionJopara].filter(Boolean).join(' ') })),
        ...this.exercises.map(item => ({ kind: 'exercise', search: `${item.topic} ${item.subtema} ${item.question} ${item.expectedConcept}`, answer: `${item.question} La idea clave es ${item.expectedConcept?.replaceAll('-', ' ')}. Podés abrir este ejercicio en el simulador para resolverlo paso a paso.` })),
      ];
      const match = bestKnowledgeMatch(context.message ?? '', knowledge);
      if (match) return this.result(match.answer, { knowledgeType: match.kind });
      return this.result('No encontré una explicación suficientemente cercana en el material offline. Probá preguntar por calor específico, reflexión de la luz, movimiento parabólico, componentes de velocidad, vectores o ley de Hooke.');
    }
    if (context.type === 'welcome') return this.result(this.choose('welcome', this.data.greetings));
    if (context.type === 'section') {
      if (context.section === 'simulador' && context.exerciseId) return this.result(`Ahora practicamos ${context.topic ?? 'Física'}. Escribí tu respuesta y comprobala con la escena de este ejercicio.`);
      if (context.section === 'aula') return this.result(context.role === 'maestro' ? 'En Aula docente elegí los temas de Física de 3.º y compartí el código con tus estudiantes.' : 'En Mi clase ingresá el código que te dio tu docente para practicar los mismos temas.');
      return this.result(this.choose('section:' + context.section, this.data.sectionGreetings?.[context.section] ?? this.data.greetings));
    }

    const error = this.errors.find(item => context.errorId ? item.id === context.errorId : item.expectedConcept === context.expectedConcept);
    const entry = this.data.errors?.find(item => item.errorId === error?.id);
    const level = Math.min(HINT_LEVELS_MAX, Math.max(1, Math.floor(Number(context.hintLevel) || 1)));
    const levelKey = 'nivel_' + level;
    // Exercise-specific hints prevent a generic numeric answer being used for a different problem.
    const exercise = context.exercise ?? this.exercises.find(item => item.id === (context.exerciseId ?? context.ejercicio));
    const specific = this.levels?.byExercise?.[exercise?.id]?.[levelKey];
    let variants = specific
      // A worked solution for the selected exercise takes priority over a generic error hint.
      ?? (level === HINT_LEVELS_MAX && exercise?.hints?.length ? exercise.hints.at(-1) : null)
      ?? this.levels?.byErrorType?.[context.errorType ?? error?.key]?.[levelKey]
      ?? this.levels?.byConcept?.[context.expectedConcept]?.[levelKey]
      ?? entry?.levels?.[levelKey];
    if (!variants && exercise?.hints?.length) {
      const hints = exercise.hints;
      // Most legacy exercises contain an observation, a formula, and a worked answer.
      // Keep the worked answer until level five and provide a usable intermediate step.
      const fallback = hints.length >= HINT_LEVELS_MAX ? hints[level - 1]
        : level === 1 ? hints[0]
          : level === 2 ? 'Identificá la magnitud que te piden y anotá los datos con sus unidades antes de calcular.'
            : level === 3 ? (hints[1] ?? hints[0])
              : level === 4 ? 'Aplicá la relación indicada y resolvé primero la operación intermedia; todavía no hace falta escribir el resultado final.'
                : hints.at(-1);
      variants = fallback;
    }
    variants ??= entry?.joparaHint;
    return this.result(this.choose([exercise?.id, context.errorType, context.expectedConcept, level].join(':'), variants), {
      esHint: entry?.esHint,
      followUp: entry?.followUp,
    });
  }
}
