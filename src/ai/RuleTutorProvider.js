import { concepts, errors as errorsData, exercises, glossary, quizBank, tutorJopara as tutorData, localizeCatalogItem } from '../data/catalogs.js';
import { buildQuizFeedback, evaluateQuizContext, normalizeText } from './quizEngine.js';
import { sanitizeMarkup } from '../utils/validation.js';

// Cuatro niveles de pista: observación, concepto, fórmula, cálculo.
export const HINT_LEVELS_MAX = 4;
const CHAT_STOP_WORDS = new Set('que como cual cuales cuando donde porque para pero por una uno unos unas los las del con entre sobre desde hasta este esta esto esa ese son ser sea tiene tienen vale todo toda todos durante solo parte forma muy mas hay cada me te se es al lo la un y o de en mi tu explicar explicame decir decime ayudar ayuda funciona'.split(' '));
// Palabras habituales en jopara/guaraní informal que aparecen en preguntas
// sobre movimiento parabólico: se traducen a la palabra clave en español que
// ya usan las búsquedas internas, para que una pregunta informal en jopara
// encuentre la misma respuesta que su equivalente en castellano.
const JOPARA_CHAT_ALIASES = {
  yvate: 'altura', mombyry: 'alcance', oguahe: 'alcance', ojupi: 'sube',
  tenonde: 'horizontal', guive: 'desde', mboy: 'cuanto', mbovy: 'cuanto',
  angulo: 'angulo', velocidad: 'velocidad', gravedad: 'gravedad',
};
const stemWord = (word) => word.replace(/idades$/u, 'idad').replace(/(aciones|acion|imientos|imiento|amientos|amiento|idad|mente|ando|iendo|ados|adas|idos|idas|es|os|as|s)$/u, '');
function chatTokens(value) {
  return [...new Set(normalizeText(value).split(/[^a-z0-9]+/u).map(stemWord).filter(word => word.length > 2 && !CHAT_STOP_WORDS.has(word)).map(word => JOPARA_CHAT_ALIASES[word] ?? word))];
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
const CHAT_TOPIC_HINTS = [
  { pattern: /(?:cuanto|tiempo|tarda|mboy).*(?:aire|vuelo|aterriz)|(?:vuelo|aire).*(?:parabol|proyectil|tiempo)/, query: 'tiempo de vuelo' },
  { pattern: /(?:hasta donde|que distancia|cuanto avanza|lejos llega|distancia total|mombyry|oguahe)/, query: 'alcance horizontal' },
  { pattern: /(?:punto mas alto|altura maxima|deja de subir|pico de la trayectoria|yvate)/, query: 'altura máxima movimiento parabólico' },
  { pattern: /(?:eje x|horizontal|avanza hacia adelante|tenonde)/, query: 'componente horizontal de velocidad' },
  { pattern: /(?:eje y|vertical|sube o baja|ojupi)/, query: 'componente vertical de velocidad' },
  { pattern: /(?:mba.?epa|mba.?erepa|por que).*(?:ho.?a|cae|baja)|(?:cae|baja).*(?:rapido|pya.?e)/, query: 'gravedad cae rápido' },
  { pattern: /(?:que angulo|mba.?e angulo).*(?:iporave|mejor|optimo)|angulo.*(?:optimo|mejor|iporave)/, query: 'ángulo óptimo 45 grados mayor alcance' },
  { pattern: /(?:30|60).*(?:angulo|grados)|complementari/, query: 'ángulos complementarios mismo alcance' },
  { pattern: /(?:resistencia del aire|supuesto|modelo ideal|real de verdad)/, query: 'resistencia del aire modelo ideal' },
];
function previousTutorText(history = []) {
  if (!Array.isArray(history)) return '';
  return [...history].reverse().find((message) => ['tutor', 'assistant'].includes(message?.role))?.text ?? '';
}
function isShortContinuation(message) {
  return /^(si|dale|claro|exacto|eso|ajam|contame mas|decime mas|segui|continua|y eso|por que|como asi)$/u.test(normalizeText(message));
}
function relatedQuestion(match) {
  const search = normalizeText(match?.search ?? '');
  if (search.includes('alcance')) return '¿Cómo influye el ángulo inicial en el alcance horizontal?';
  if (search.includes('vuelo')) return '¿Qué pasa con la velocidad vertical en el punto más alto?';
  if (search.includes('componente')) return '¿Por qué se separa la velocidad en dos componentes?';
  if (search.includes('angulo') || search.includes('45')) return '¿Qué pasa con el alcance si el ángulo es muy chico o muy grande?';
  return '¿Cómo se aplica esta idea en un ejercicio con datos y unidades?';
}
export function obtenerVariantePista(variants, previous) {
  if (!Array.isArray(variants)) return variants ?? null;
  const choices = variants.filter(text => typeof text === 'string' && text.trim());
  const fresh = choices.filter(text => text !== previous);
  const pool = fresh.length ? fresh : choices;
  return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
}

const JOPARA_ERROR_HINTS = {
  'err-01': "v0 ha'e la velocidad inicial tuichakue; peteĩ componente ha'e peteĩ parte año. Epensamína: ¿ojerurepa pe velocidad total térã peteĩ parte año?",
  'err-02': "Horizontal oipuru coseno: vx = v0 * cos(ángulo). Vertical oipuru seno: v0y = v0 * sen(ángulo). Ani embojehe'a.",
  'err-04': "Altura máxima ha'e pe yvatevéva ohupytýva (vertical); alcance ha'e pe mombyryvéva ho'ahápe (horizontal). Mokõive fórmula opaichagua.",
  'err-mec-03': "Eje horizontal-pe ndaipóri aceleración (MRU), pero eje vertical-pe gravedad omboguejy pe subida ha ombopya'e pe caída (MRUV).",
  'err-mec-05': "Ángulo omoambue altura ha distancia proporción. Pe alcance odepende sen(2 * ángulo)-gui.",
};

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
  // Un texto bilingüe se guarda como { jopara, es }. pickLang elige la rama
  // según el idioma activo; un valor "de siempre" (array/string suelto) se
  // devuelve sin cambios, para no romper contenido legado.
  pickLang(entry, language) {
    if (entry && typeof entry === 'object' && !Array.isArray(entry) && ('jopara' in entry || 'es' in entry)) {
      return entry[language === 'es' ? 'es' : 'jopara'] ?? entry.jopara ?? entry.es ?? null;
    }
    return entry ?? null;
  }
  choose(key, entry, language) {
    const variants = this.pickLang(entry, language);
    const text = obtenerVariantePista(variants, this.previous.get(key));
    this.previous.set(key, text);
    return text;
  }
  result(message, extra = {}) {
    return { message: sanitizeMarkup(message || this.data.fallbackHint?.es || 'Revisá el enunciado paso a paso.'), source: this.id, available: true, ...extra };
  }
  async respond(context = {}) {
    const language = context.language === 'es' ? 'es' : 'gn-jopara';
    if (context.tipo === 'evaluacion_cuestionario') {
      const verdict = evaluateQuizContext(context);
      return this.result(buildQuizFeedback({ ...context, esCorrecta: verdict.correct }), verdict);
    }
    if (context.tipo === 'charla_libre') {
      const question = normalizeText(context.message);
      if (/^(hola|buenas|mba.?eichapa|maitei)\b/.test(question)) return this.result(this.choose('chat:greeting', this.data.greetings, language));
      if (/\b(gracias|aguyje)\b/.test(question)) {
        return this.result(language === 'es'
          ? '¡De nada! ¿Hay algo más sobre movimiento parabólico que quieras repasar? Preguntame.'
          : '¡Aguyje ndéve! ¿Oimépa gueteri mba\'e reikuaaséva movimiento parabólico rehe? Eporandu chéve.');
      }
      const loc = (item) => localizeCatalogItem(item, language);
      const ideaClave = language === 'es' ? 'La idea clave es' : 'Pe idea clave ha\'e';
      const abrirSimulador = language === 'es' ? 'Podés abrir este ejercicio en el simulador para resolverlo paso a paso.' : 'Ikatu embojuruja ko ejercicio simulador-pe eresolve hag̃ua paso a paso.';
      const knowledge = [
        ...this.concepts.map(loc).map(item => ({ kind: 'concept', search: `${item.id} ${item.name} ${item.definition} ${item.formula}`, answer: `${item.name}: ${item.definition}${item.formula ? ` Fórmula: ${item.formula}.` : ''}` })),
        ...this.glossary.map(loc).map(item => ({ kind: 'glossary', search: `${item.term} ${item.joparaTerm} ${item.definition}`, answer: `${item.term}: ${item.definition}` })),
        ...this.errors.map(loc).map(item => ({ kind: 'error', search: `${item.name} ${item.description} ${item.example} ${item.expectedConcept}`, answer: `${item.name}: ${item.description} ${item.example}` })),
        ...this.bank.map(loc).map(item => ({ kind: 'question', search: `${item.pregunta} ${item.enunciado} ${item.respuesta} ${item.explicacion} ${item.tema}`, answer: item.respuesta || item.explicacion || '' })),
        ...this.exercises.map(loc).map(item => ({ kind: 'exercise', search: `${item.topic} ${item.scenario} ${item.question} ${item.expectedConcept}`, answer: `${item.question} ${ideaClave} ${item.expectedConcept?.replaceAll('-', ' ')}. ${abrirSimulador}` })),
        ...(this.data.topicSupport ?? []).map(item => ({ kind: 'topic', search: item.search, answer: this.pickLang(item, language) })),
      ];
      const lastTutorText = previousTutorText(context.history);
      const continuation = isShortContinuation(context.message ?? '') && lastTutorText;
      const directMatch = bestKnowledgeMatch(context.message ?? '', knowledge);
      const continuationMatch = continuation ? bestKnowledgeMatch(lastTutorText, knowledge) : null;
      const topicHint = CHAT_TOPIC_HINTS.find(({ pattern }) => pattern.test(question + ' ' + normalizeText(lastTutorText)));
      const match = directMatch ?? continuationMatch ?? (topicHint ? bestKnowledgeMatch(topicHint.query, knowledge) : null);
      if (match) {
        const detailed = /\b(completo|completa|detallado|detallada|paso a paso|extenso|extensa|profundo|profunda|largo|larga|desde cero|con todo|bien explicado|mas detalle)\b/u.test(question);
        const answer = continuation ? (language === 'es' ? 'Seguimos con lo que veíamos. ' : '¡Iporã! Seguimos con lo que estábamos viendo. ') + match.answer : match.answer;
        const explanation = detailed
          ? ' Para aplicarlo paso a paso, identificá los datos y sus unidades, elegí la relación correspondiente y reemplazá cada símbolo con el dato correcto; no inventes los que falten.'
          : '';
        const followUp = language === 'es'
          ? '\n\n¿Querés seguir viendo esto? Podés preguntarme, por ejemplo: ' + relatedQuestion(match)
          : '\n\n¿Reikuaasépa avei? Ejemplo de pregunta para seguir: ' + relatedQuestion(match);
        return this.result(answer + explanation + followUp, { knowledgeType: match.kind });
      }
      return this.result(language === 'es'
        ? 'No encontré una explicación suficientemente cercana en el material offline. Probá preguntar por componentes de la velocidad, gravedad, tiempo de vuelo, altura máxima, alcance o el ángulo óptimo del movimiento parabólico.'
        : 'Ndajuhúi peteĩ explicación cerca guive material offline-pe. Eporandumína componentes de la velocidad, gravedad, tiempo de vuelo, altura máxima, alcance térã ángulo óptimo movimiento parabólico rehe.');
    }
    if (context.type === 'welcome') return this.result(this.choose('welcome', this.data.greetings, language));
    if (context.type === 'section') {
      if (context.section === 'simulador' && context.exerciseId) {
        return this.result(language === 'es'
          ? `Ahora practicamos ${context.topic ?? 'Física'}. Escribí tu respuesta y comprobala con la escena de este ejercicio.`
          : `Ko'ãga jaha'ã ${context.topic ?? 'Física'}. Ehai ne respuesta ha ehecha simulación-pe.`);
      }
      if (context.section === 'aula') {
        if (context.role === 'maestro') {
          return this.result(language === 'es' ? 'En Aula docente elegí las situaciones y compartí el código con tus estudiantes.' : 'Aula docente-pe eiporavo umi situación ha eme\'ẽ pe código ne estudiante-kuérape.');
        }
        return this.result(language === 'es' ? 'En Mi clase ingresá el código que te dio tu docente para practicar lo mismo.' : 'Mi clase-pe emoinge pe código ne mbo\'ehára ome\'ẽva ndéve.');
      }
      return this.result(this.choose('section:' + context.section, this.data.sectionGreetings?.[context.section] ?? this.data.greetings, language));
    }

    const error = this.errors.find(item => context.errorId
      ? item.id === context.errorId
      : context.errorType
        ? item.key === context.errorType
        : item.expectedConcept === context.expectedConcept);
    const entry = this.data.errors?.find(item => item.errorId === error?.id);
    const level = Math.min(HINT_LEVELS_MAX, Math.max(1, Math.floor(Number(context.hintLevel) || 1)));
    const levelKey = 'nivel_' + level;
    // Las pistas propias del ejercicio evitan que una respuesta numérica
    // genérica se use para un problema distinto.
    const exercise = context.exercise ?? this.exercises.find(item => item.id === (context.exerciseId ?? context.ejercicio));
    const specific = this.levels?.byExercise?.[exercise?.id]?.[levelKey];
    let variantsEntry = specific
      // La solución trabajada del ejercicio tiene prioridad en el último nivel.
      ?? (level === HINT_LEVELS_MAX && exercise?.hints?.length ? exercise.hints.at(-1) : null)
      ?? this.levels?.byErrorType?.[context.errorType ?? error?.key]?.[levelKey];
    if (!variantsEntry && exercise?.hints?.length) {
      const hints = exercise.hints;
      variantsEntry = hints[level - 1] ?? hints.at(-1);
    }
    const subHint = language === 'es'
      ? entry?.esHint
      : (JOPARA_ERROR_HINTS[error?.id] ?? this.pickLang(entry?.followUp, 'gn-jopara'));

    return this.result(this.choose([exercise?.id, context.errorType, context.expectedConcept, level, language].join(':'), variantsEntry, language), {
      esHint: entry?.esHint,
      joparaHint: JOPARA_ERROR_HINTS[error?.id] ?? this.pickLang(entry?.followUp, 'gn-jopara'),
      subHint,
      followUp: this.pickLang(entry?.followUp, language),
    });
  }
}
