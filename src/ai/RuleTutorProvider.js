import { concepts, errors as errorsData, exercises, glossary, quizBank, tutorJopara as tutorData, localizeCatalogItem } from '../data/catalogs.js';
import { buildQuizFeedback, evaluateQuizContext, normalizeText } from './quizEngine.js';
import { sanitizeMarkup } from '../utils/validation.js';

// Cuatro niveles de pista: observación, concepto, fórmula, cálculo.
export const HINT_LEVELS_MAX = 4;
const CHAT_STOP_WORDS = new Set('que como cual cuales cuando donde porque para pero por una uno unos unas los las del con entre sobre desde hasta este esta esto esa ese son ser sea tiene tienen vale todo toda todos durante solo parte forma muy mas hay cada me te se es al lo la un y o de en mi tu explicar explicame decir decime ayudar ayuda funciona completo completa detallado detallada paso pasos extenso extensa profundo profunda largo larga desde cero bien explicado ejemplo ejemplos con todo'.split(' '));
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
  { pattern: /(?:cuanto|tiempo|tarda|mboy).*(?:aire|vuelo|aterriz|caer)|(?:vuelo|aire).*(?:parabol|proyectil|tiempo)|(?:cuantos segundos|cuando vuelve)/, query: 'tiempo de vuelo' },
  { pattern: /(?:hasta donde|donde aterriza|que distancia|cuanto avanza|lejos llega|distancia total|mombyry|oguahe|alcance)/, query: 'alcance horizontal' },
  { pattern: /(?:punto mas alto|altura maxima|altura|deja de subir|pico de la trayectoria|yvate)/, query: 'altura máxima movimiento parabólico' },
  { pattern: /(?:eje x|horizontal|avanza hacia adelante|tenonde|coseno)/, query: 'componente horizontal de velocidad' },
  { pattern: /(?:eje y|vertical|sube o baja|ojupi|seno)/, query: 'componente vertical de velocidad' },
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
  return /^(?:si|dale|claro|exacto|ajam|eso|contame mas|decime mas|segui|continua|y eso|por que|como asi|(?:si|dale|claro|ajam)\s+(?:contame mas|decime mas|segui|continua|eso|por que|como asi))$/u.test(normalizeText(message));
}
function relatedQuestion(match, history = []) {
  const search = normalizeText(match?.search ?? '');
  const options = search.includes('alcance')
    ? ['¿Cómo influye el ángulo inicial en el alcance horizontal?', '¿Por qué dos ángulos complementarios pueden llegar igual de lejos?']
    : search.includes('vuelo')
      ? ['¿Qué pasa con la velocidad vertical en el punto más alto?', '¿Cómo cambia el tiempo de vuelo si aumenta la gravedad?']
      : search.includes('componente')
        ? ['¿Por qué se separa la velocidad en dos componentes?', '¿Qué diferencia hay entre vx y vy?']
        : search.includes('angulo') || search.includes('45')
          ? ['¿Qué pasa con el alcance si el ángulo es muy chico o muy grande?', '¿Por qué 45° maximiza el alcance en el modelo ideal?']
          : ['¿Cómo se aplica esta idea en un ejercicio con datos y unidades?', '¿Qué cambia si el objeto sale desde cierta altura?'];
  const asked = normalizeText((history ?? []).map(item => item?.text ?? '').join(' '));
  return options.find(item => !asked.includes(normalizeText(item).replace(/[¿?]/g, ''))) ?? '¿Qué cambia si el objeto sale desde cierta altura?';
}

function workedExample(exercise, language) {
  if (!exercise) return '';
  const item = localizeCatalogItem(exercise, language);
  const values = Object.entries(item.values ?? {}).map(([key, value]) => `${key} = ${value}`).join(', ');
  const hints = Array.isArray(item.hints) ? item.hints.filter(Boolean) : [];
  const answer = Number.isFinite(Number(item.correctAnswer)) ? `${item.correctAnswer}${item.unit ? ` ${item.unit}` : ''}` : '';
  const labels = language === 'es'
    ? { example: 'Ejemplo del material', data: 'Datos', steps: 'Pasos', result: 'Resultado del ejercicio' }
    : { example: 'Techapyrã material-gui', data: 'Datos', steps: 'Pasos', result: 'Resultado del ejercicio' };
  return [
    `${labels.example}: ${item.question}`,
    values ? `${labels.data}: ${values}.` : '',
    hints.length ? `${labels.steps}: ${hints.join(' ')}` : '',
    answer ? `${labels.result}: ${answer}.` : '',
  ].filter(Boolean).join('\n\n');
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
      const greetingOnly = /^(?:hola|buenas|mba\s?eichapa|maitei)(?:\s+(?:como estas|mba\s?eichapa|que tal))?$/u.test(question);
      if (greetingOnly) return this.result(this.choose('chat:greeting', this.data.greetings, language));
      const thankYouOnly = /^(?:muchas gracias|gracias|aguyje)(?:\s+(?:por todo|ndéve))?$/u.test(question);
      if (thankYouOnly) {
        return this.result(language === 'es'
          ? '¡De nada! ¿Hay algo más sobre movimiento parabólico que quieras repasar? Preguntame.'
          : '¡Aguyje ndéve! ¿Oimépa gueteri mba\'e reikuaaséva movimiento parabólico rehe? Eporandu chéve.');
      }
      const loc = (item) => localizeCatalogItem(item, language);
      const ideaClave = language === 'es' ? 'La idea clave es' : 'Pe idea clave ha\'e';
      const abrirSimulador = language === 'es' ? 'Podés abrir este ejercicio en el simulador para resolverlo paso a paso.' : 'Ikatu embojuruja ko ejercicio simulador-pe eresolve hag̃ua paso a paso.';
      const knowledge = [
        ...this.concepts.map(loc).map(item => ({ kind: 'concept', expectedConcept: item.id, search: `${item.id} ${item.name} ${item.definition} ${item.formula}`, answer: `${item.name}: ${item.definition}${item.formula ? ` Fórmula: ${item.formula}.` : ''}` })),
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
      const topicHint = CHAT_TOPIC_HINTS.find(({ pattern }) => pattern.test(question));
      const match = directMatch ?? continuationMatch ?? (topicHint ? bestKnowledgeMatch(topicHint.query, knowledge) : null);
      if (match) {
        const detailed = /\b(completo|completa|detallado|detallada|paso a paso|extenso|extensa|profundo|profunda|largo|larga|desde cero|con todo|bien explicado|mas detalle)\b/u.test(question);
        const greetingPrefix = /^(?:hola|buenas|maite[ií]|mba\s?eichapa)\b/u.test(question) ? (language === 'es' ? '¡Hola! ' : '¡Maitei! ') : '';
        const continuationPrefix = continuation ? (language === 'es' ? 'Seguimos con lo que veíamos. ' : 'Seguimos con lo que estábamos viendo. ') : '';
        const answer = continuationPrefix + match.answer;
        const example = detailed && match.expectedConcept
          ? workedExample(this.exercises.find(item => item.expectedConcept === match.expectedConcept), language)
          : '';
        const explanation = detailed
          ? (language === 'es'
            ? '\n\nPara resolverlo, identificá cada dato y su unidad; separá el movimiento horizontal del vertical; elegí la fórmula que corresponde al dato pedido; sustituí únicamente valores del enunciado y revisá que la unidad final tenga sentido.'
            : '\n\nDatos ha unidad-kuéra rehecha; emboja’o movimiento horizontal ha vertical; eiporavo fórmula oikóva pe dato rehekáva rehe; emoinge umi valor enunciado-pe oĩva año, ha ehecha unidad ipahaguápe.')
          : '';
        const followUp = language === 'es'
          ? '\n\n¿Querés seguir viendo esto? Ejemplo de pregunta para seguir: ' + relatedQuestion(match, context.history)
          : '\n\n¿Reikuaasépa avei? Techapyrã: ' + relatedQuestion(match, context.history);
        return this.result(greetingPrefix + answer + explanation + (example ? `\n\n${example}` : '') + followUp, { knowledgeType: match.kind });
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
    return this.result(this.choose([exercise?.id, context.errorType, context.expectedConcept, level].join(':'), variantsEntry, language), {
      esHint: language !== 'es' ? entry?.esHint : undefined,
      followUp: this.pickLang(entry?.followUp, language),
    });
  }
}
