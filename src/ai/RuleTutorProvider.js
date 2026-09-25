import { errors as errorsData, exercises, quizBank, tutorJopara as tutorData } from '../data/catalogs.js';
import { buildQuizFeedback, evaluateQuizContext, findBestMatch, normalizeText } from './quizEngine.js';
import { sanitizeMarkup } from '../utils/validation.js';

export const HINT_LEVELS_MAX = 5;
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
      const offlineTopic = /\b(haku|calor|temperatura|terere|mate)\b/.test(question) ? 'Termodinámica'
        : /\b(luz|tesape|espejo|pajita|refraccion)\b/.test(question) ? 'Óptica' : null;
      const offlineAnswer = offlineTopic && this.data.topicSupport?.find(item => item.tema === offlineTopic);
      if (offlineAnswer) return this.result(offlineAnswer.respuesta);
      const match = findBestMatch(context.message, this.bank);
      if (match) return this.result([match.entry.respuesta || match.entry.explicacion, match.entry.respuestaJopara || match.entry.explicacionJopara].filter(Boolean).join(' '));
      const concept = findBestMatch(context.message, this.data.topicSupport ?? []);
      return this.result(concept?.entry.respuesta || 'Puedo ayudarte con termodinámica y óptica. También hay ejercicios complementarios de movimiento y vectores. Probá con una pregunta sobre calor, temperatura, espejos o luz.');
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
    let variants = specific ?? this.levels?.byErrorType?.[context.errorType]?.[levelKey];
    if (!variants && exercise?.hints?.length) {
      const index = level <= 2 ? 0 : level === 3 ? 1 : 2;
      variants = exercise.hints[Math.min(index, exercise.hints.length - 1)];
    }
    variants ??= this.levels?.byConcept?.[context.expectedConcept]?.[levelKey] ?? entry?.levels?.[levelKey] ?? entry?.joparaHint;
    return this.result(this.choose([exercise?.id, context.errorType, context.expectedConcept, level].join(':'), variants), {
      esHint: entry?.esHint,
      followUp: entry?.followUp,
    });
  }
}
