import { concepts, errors as errorsData, exercises, glossary, quizBank, tutorJopara as tutorData, localizeCatalogItem } from '../data/catalogs.js';
import { buildQuizFeedback, evaluateQuizContext, normalizeText } from './quizEngine.js';
import { sanitizeMarkup } from '../utils/validation.js';
import { offlineChatAnswer } from './chatTools.js';

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
function relatedQuestion(match, history = [], language = 'es') {
  const search = normalizeText(match?.search ?? '');
  const spanishOptions = search.includes('alcance')
    ? ['¿Cómo influye el ángulo inicial en el alcance horizontal?', '¿Por qué dos ángulos complementarios pueden llegar igual de lejos?']
    : search.includes('vuelo')
      ? ['¿Qué pasa con la velocidad vertical en el punto más alto?', '¿Cómo cambia el tiempo de vuelo si aumenta la gravedad?']
      : search.includes('componente')
        ? ['¿Por qué se separa la velocidad en dos componentes?', '¿Qué diferencia hay entre vx y vy?']
        : search.includes('angulo') || search.includes('45')
          ? ['¿Qué pasa con el alcance si el ángulo es muy chico o muy grande?', '¿Por qué 45° maximiza el alcance en el modelo ideal?']
          : ['¿Cómo se aplica esta idea en un ejercicio con datos y unidades?', '¿Qué cambia si el objeto sale desde cierta altura?'];
  const joparaOptions = search.includes('alcance')
    ? ["¿Mba'éichapa pe ángulo inicial omoambue el alcance horizontal?", "¿Mba'érepa dos ángulos complementarios ikatu og̃uahẽ a la misma distancia?"]
    : search.includes('vuelo')
      ? ["Pe punto más alto-pe, ¿mba'épa oiko con la velocidad vertical?", "¿Mba'éichapa okambia el tiempo de vuelo si aumenta la gravedad?"]
      : search.includes('componente')
        ? ["¿Mba'érepa oñemboja'o la velocidad en dos componentes?", "¿Mba'épa la diferencia entre vx ha vy?"]
        : search.includes('angulo') || search.includes('45')
          ? ["¿Mba'épa oiko con el alcance si pe ángulo michĩ térã tuicha?", "¿Mba'érepa 45° ome'ẽ el mayor alcance en el modelo ideal?"]
          : ["¿Mba'éichapa ikatu reaplica esta idea en un ejercicio con datos y unidades?", "¿Mba'épa okambia si el objeto sale desde cierta altura?"];
  const options = language === 'es' ? spanishOptions : joparaOptions;
  const asked = normalizeText((history ?? []).map(item => item?.text ?? '').join(' '));
  return options.find(item => !asked.includes(normalizeText(item).replace(/[¿?]/g, '')))
    ?? (language === 'es' ? '¿Qué cambia si el objeto sale desde cierta altura?' : "¿Mba'épa okambia si el objeto sale desde cierta altura?");
}

function workedExample(exercise, language) {
  if (!exercise) return '';
  const item = localizeCatalogItem(exercise, language);
  const values = Object.entries(item.values ?? {}).map(([key, value]) => `${key} = ${value}`).join(', ');
  const hints = Array.isArray(item.hints) ? item.hints.filter(Boolean) : [];
  const answer = Number.isFinite(Number(item.correctAnswer)) ? `${item.correctAnswer}${item.unit ? ` ${item.unit}` : ''}` : '';
  const labels = language === 'es'
    ? { example: 'Ejemplo del material', data: 'Datos', steps: 'Pasos', result: 'Resultado del ejercicio' }
    : { example: 'Ejemplo material-gui', data: 'Datos', steps: 'Pasos', result: 'Resultado del ejercicio' };
  return [
    `${labels.example}: ${item.question}`,
    values ? `${labels.data}: ${values}.` : '',
    hints.length ? `${labels.steps}: ${hints.join(' ')}` : '',
    answer ? `${labels.result}: ${answer}.` : '',
  ].filter(Boolean).join('\n\n');
}
// Pregunta socrática para los dos primeros niveles de pista, cuando el
// estudiante todavía no respondió nada sobre este nivel: en vez de explicar,
// el tutor pregunta primero (ver prompt.js buildDiagnosticPrompt, la misma
// idea para el tutor online). Se arma con los datos reales del ejercicio.
function socraticQuestion(exercise, level, language) {
  const values = Object.entries(exercise?.values ?? {}).map(([key, value]) => `${key} = ${value}`).join(', ');
  if (level <= 1) {
    return language === 'es'
      ? `Este ejercicio da estos datos: ${values || 'revisá el enunciado'}. ¿Qué datos identificás vos y qué te piden encontrar exactamente?`
      : `Ko ejercicio ome'ẽ estos datos: ${values || 'ehecha jey el enunciado'}. ¿Mba'e dato rehecha ha qué te piden encontrar?`;
  }
  return language === 'es'
    ? '¿Qué relación o fórmula usarías para llegar a lo que te piden con esos datos?'
    : `¿Mba'e fórmula eiporúta con estos datos para encontrar lo que pide el ejercicio?`;
}

// Cuando el estudiante ya respondió a la pregunta del nivel (llega
// `context.history` con la pregunta anterior o `studentReply`), el tutor
// offline no puede evaluar texto libre con precisión, así que reconoce el
// esfuerzo y sigue con el contenido de ese nivel en vez de repetir la
// pregunta — igual que le pide prompt.js al tutor online.
function acknowledgeReply(language) {
  return language === 'es' ? 'Vamos a revisarlo juntos: ' : 'Jahecha jey oñondive, revisemos esto juntos: ';
}

export function obtenerVariantePista(variants, previous) {
  if (!Array.isArray(variants)) return variants ?? null;
  const choices = variants.filter(text => typeof text === 'string' && text.trim());
  const fresh = choices.filter(text => text !== previous);
  const pool = fresh.length ? fresh : choices;
  return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
}

const JOPARA_ERROR_HINTS = {
  'err-01': "v0 ha'e la velocidad inicial completa; peteĩ componente es solo una parte. Epensamína: ¿te piden la velocidad total térã una parte año?",
  'err-02': "La componente horizontal oipuru coseno: vx = v0 * cos(ángulo). La vertical katu usa seno: v0y = v0 * sen(ángulo). Ani embojehe'a las fórmulas.",
  'err-04': "La altura máxima ha'e pe punto más alto (vertical); el alcance katu es lo más lejos que llega (horizontal). Mokõive se calcula distinto.",
  'err-mec-03': "En el eje horizontal ndaipóri aceleración (MRU), pero en el vertical la gravedad frena la subida ha ombopya'e la caída (MRUV).",
  'err-mec-05': "El ángulo omoambue la proporción entre altura y distancia; pe alcance odepende de sen(2 * ángulo).",
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
      const greetingOnly = /^(?:hola|buenas|mba\s?eichapa|maitei)(?:\s+(?:como estas|mba\s?eichapa|que tal))?$/u.test(question);
      if (greetingOnly) return this.result(this.choose('chat:greeting', this.data.greetings, language));
      const thankYouOnly = /^(?:muchas gracias|gracias|aguyje)(?:\s+(?:por todo|ndéve))?$/u.test(question);
      if (thankYouOnly) {
        return this.result(language === 'es'
          ? '¡De nada! ¿Hay algo más sobre movimiento parabólico que quieras repasar? Preguntame.'
          : '¡Aguyje ndéve! ¿Oimépa gueteri algo reikuaaséva sobre movimiento parabólico? Eporandu chéve.');
      }
      // Herramientas offline: resolver como en el cuaderno, graficar paso a
      // paso, simular, comparar, practicar, fórmulas, conversiones y FAQ.
      const tool = offlineChatAnswer(context.message ?? '', context.history ?? [], language);
      // Una lección "cuaderno" sin datos se combina con la explicación del
      // temario (y su ejemplo del material); el resto responde directo.
      const lessonWidget = tool?.widget?.type === 'notebook' && tool.widget.lesson ? tool.widget : null;
      if (tool && !lessonWidget) return this.result(tool.message, { widget: tool.widget ?? null, knowledgeType: 'tool' });
      const loc = (item) => localizeCatalogItem(item, language);
      const ideaClave = language === 'es' ? 'La idea clave es' : 'Pe idea clave ha\'e';
      const abrirSimulador = language === 'es' ? 'Podés abrir este ejercicio en el simulador para resolverlo paso a paso.' : 'Ikatu eipe\'a este ejercicio en el simulador ha eresolve paso a paso.';
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
        const continuationPrefix = continuation ? (language === 'es' ? 'Seguimos con lo que veíamos. ' : 'Seguimos con esto que estábamos viendo. Jahecha jey la idea clave. ') : '';
        const answer = continuationPrefix + match.answer;
        const example = detailed && match.expectedConcept
          ? workedExample(this.exercises.find(item => item.expectedConcept === match.expectedConcept), language)
          : '';
        const explanation = detailed
          ? (language === 'es'
            ? '\n\nPara resolverlo, identificá cada dato y su unidad; separá el movimiento horizontal del vertical; elegí la fórmula que corresponde al dato pedido; sustituí únicamente valores del enunciado y revisá que la unidad final tenga sentido.'
            : '\n\nPrimero, ehecha los datos y sus unidades; después emboja\'o el movimiento horizontal ha vertical. Eiporavo la fórmula según lo que te piden, sustituí los valores del enunciado ha, al final, comprobá la unidad.')
          : '';
        const followUp = language === 'es'
          ? '\n\n¿Querés seguir viendo esto? Ejemplo de pregunta para seguir: ' + relatedQuestion(match, context.history)
          : '\n\n¿Reikuaasépa más sobre esto? Techapyrã, una pregunta para seguir: ' + relatedQuestion(match, context.history, language);
        return this.result(greetingPrefix + answer + explanation + (example ? `\n\n${example}` : '') + followUp, { knowledgeType: match.kind, ...(lessonWidget ? { widget: lessonWidget } : {}) });
      }
      if (lessonWidget) return this.result(tool.message, { widget: lessonWidget, knowledgeType: 'tool' });
      return this.result((language === 'es'
        ? 'No encontré una explicación suficientemente cercana en el material offline. Probá preguntar por componentes de la velocidad, gravedad, tiempo de vuelo, altura máxima, alcance o el ángulo óptimo del movimiento parabólico.'
        : 'Ndajuhúi una explicación suficientemente cercana en el material offline. Ikatu eporandu sobre componentes de la velocidad, gravedad, tiempo de vuelo, altura máxima, alcance térã ángulo óptimo del movimiento parabólico.')
        + (language === 'es'
          ? '\n\nTambién puedo resolver tu ejercicio paso a paso ("sale a 20 m/s con 30°, ¿alcance?"), enseñarte a graficar, simular, comparar ángulos o darte un ejercicio. Escribí "¿qué podés hacer?" para ver todo.'
          : '\n\nIkatu avei aresolve nde ejercicio paso a paso ("osẽ 20 m/s ha 30° reheve, ¿alcance?"), ambo’e ndéve regrafica hag̃ua, asimula, ambojoja ángulo térã ame’ẽ ejercicio. Ehai "¿mba’épa ikatu rejapo?" rehecha hag̃ua opavave.'));
    }
    if (context.type === 'welcome') return this.result(this.choose('welcome', this.data.greetings, language));
    if (context.type === 'section') {
      if (context.section === 'simulador' && context.exerciseId) {
        return this.result(language === 'es'
          ? `Ahora practicamos ${context.topic ?? 'Física'}. Escribí tu respuesta y comprobala con la escena de este ejercicio.`
          : `Ko'ãga practicamos ${context.topic ?? 'Física'}. Ehai ne respuesta ha ehecha la simulación-pe mba'éichapa osẽ.`);
      }
      if (context.section === 'aula') {
        if (context.role === 'maestro') {
          return this.result(language === 'es' ? 'En Aula docente elegí las situaciones y compartí el código con tus estudiantes.' : 'En Aula docente, eiporavo las situaciones y compartí el código con tus estudiantes.');
        }
        return this.result(language === 'es' ? 'En Mi clase ingresá el código que te dio tu docente para practicar lo mismo.' : 'En Mi clase emoinge el código ome\'ẽva ndéve tu docente para practicar lo mismo.');
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

    // Método socrático offline: en los dos primeros niveles, si el estudiante
    // todavía no respondió nada sobre este nivel (no llega historial de esta
    // pista), se pregunta en vez de explicar — igual que el tutor online
    // (prompt.js buildDiagnosticPrompt). Cuando sí responde, el tutor por
    // reglas no puede evaluar texto libre con precisión, así que reconoce el
    // intento y sigue con el contenido de ese nivel.
    const hasReply = Array.isArray(context.history) && context.history.length > 0;
    const socratic = level <= 2 && exercise && !hasReply;
    const message = socratic
      ? socraticQuestion(exercise, level, language)
      : (hasReply ? acknowledgeReply(language) : '') + (this.choose([exercise?.id, context.errorType, context.expectedConcept, level, language].join(':'), variantsEntry, language) ?? '');

    return this.result(message, {
      esHint: entry?.esHint,
      joparaHint: JOPARA_ERROR_HINTS[error?.id] ?? this.pickLang(entry?.followUp, 'gn-jopara'),
      subHint,
      followUp: this.pickLang(entry?.followUp, language),
      socratic,
    });
  }
}
