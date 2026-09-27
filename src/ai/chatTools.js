import { createLaunch, maxHeight, positionAt, range, timeOfFlight, velocityAt } from '../physics/projectileMotion.js';

// Herramientas del chat libre que funcionan SIN internet.
// 1) Entiende qué pide el estudiante (resolver, cuaderno, graficar, simular…).
// 2) Lee los datos del enunciado (v0, ángulo, g, altura, alcance, tiempo).
// 3) Calcula todo con el mismo motor de física de la app (projectileMotion).
// 4) Devuelve un texto corto + un "widget" que el chat dibuja (cuaderno paso
//    a paso, gráfico que se arma por pasos, simulación 2D/3D, práctica…).
// El tutor online (Gemini) puede pedir los mismos widgets con etiquetas
// [[simular …]] que se leen con parseWidgetTags.

const G_EARTH = 9.8;
const PLANETS = [
  { id: 'luna', pattern: /\bluna\b|\bjasy\b/, g: 1.62, es: 'la Luna', gn: 'Jasy' },
  { id: 'marte', pattern: /\bmarte\b/, g: 3.71, es: 'Marte', gn: 'Marte' },
  { id: 'jupiter', pattern: /\bjupiter\b/, g: 24.79, es: 'Júpiter', gn: 'Júpiter' },
  { id: 'venus', pattern: /\bvenus\b/, g: 8.87, es: 'Venus', gn: 'Venus' },
  { id: 'mercurio', pattern: /\bmercurio\b/, g: 3.7, es: 'Mercurio', gn: 'Mercurio' },
];

const L = (language, es, gn) => (language === 'es' ? es : gn);
export const fmt = (value, digits = 2) => new Intl.NumberFormat('es-PY', { maximumFractionDigits: digits }).format(Number.isFinite(value) ? value : 0);
const round = (value, digits = 2) => Math.round(value * 10 ** digits) / 10 ** digits;
const deg = rad => (rad * 180) / Math.PI;
const rad = degrees => (degrees * Math.PI) / 180;

/** Minúsculas, sin tildes, pero conservando números, comas, puntos y símbolos útiles. */
export function simplify(text) {
  return String(text ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[’`´]/g, "'").replace(/₀/g, '0').replace(/º/g, '°').replace(/\s+/g, ' ').trim();
}
const num = raw => Number(String(raw).replace(',', '.'));
const NUMBER = '(\\d+(?:[.,]\\d+)?)';
// "m" de metros, pero no el comienzo de "m/s" ni "m/s²".
const M = 'm(?:etros?)?(?![a-z\\/²2])';

/** Lee los datos físicos de un enunciado escrito con palabras comunes. */
export function parseProblem(text) {
  const s = simplify(text);
  const data = {};
  const grab = (regex, key, transform = value => value) => {
    if (data[key] !== undefined) return;
    const match = s.match(regex);
    if (match) {
      const value = transform(num(match[1]), match);
      if (Number.isFinite(value)) data[key] = value;
    }
  };
  // Etiquetas explícitas: v0 = 20, angulo 30, g = 10, h0 = 5, t = 2, R = 40
  grab(new RegExp(`\\b(?:v0|vo|vi)\\s*(?:=|:|de)?\\s*${NUMBER}`), 'v0');
  grab(new RegExp(`${NUMBER}\\s*(?:km\\/h|kmh|km por hora)`), 'v0', value => value / 3.6);
  grab(new RegExp(`(?:velocidad|rapidez)(?: inicial)?(?: de)?\\s*(?:=|:)?\\s*${NUMBER}\\s*(?:m\\/s|metros por segundo)?(?!\\s*(?:m\\/s2|m\\/s²|°|grados))`), 'v0');
  grab(new RegExp(`${NUMBER}\\s*(?:m\\/s|metros por segundo)(?!\\s*(?:2|²|cuadrado))`), 'v0');
  grab(new RegExp(`(?:angulo|inclinacion|elevacion|theta|θ)(?: de (?:lanzamiento|tiro|elevacion))?(?: de)?\\s*(?:=|:)?\\s*${NUMBER}`), 'angle');
  grab(new RegExp(`${NUMBER}\\s*(?:°|grados?|gra\\b)`), 'angle');
  grab(new RegExp(`\\bg\\s*(?:=|:)\\s*${NUMBER}`), 'g');
  grab(new RegExp(`gravedad(?: de)?\\s*(?:=|:)?\\s*${NUMBER}`), 'g');
  grab(new RegExp(`${NUMBER}\\s*(?:m\\/s2|m\\/s²|m\\/s\\^2|metros por segundo al cuadrado)`), 'g');
  grab(new RegExp(`\\b(?:h0|h|yo|y0)\\s*(?:=|:)\\s*${NUMBER}`), 'h0');
  grab(new RegExp(`(?:desde|de) (?:una |un |lo alto de (?:una |un )?)?(?:altura|edificio|torre|mesa|acantilado|puente|techo|balcon|terraza|muro|colina|trampolin)(?: de)?\\s*${NUMBER}\\s*${M}`), 'h0');
  grab(new RegExp(`(?:altura inicial|altura de salida|a una altura de|desde)\\s*(?:=|:)?\\s*${NUMBER}\\s*${M}`), 'h0');
  grab(new RegExp(`${NUMBER}\\s*${M} de (?:altura|alto)`), 'h0');
  grab(new RegExp(`\\bt\\s*(?:=|:)\\s*${NUMBER}`), 't');
  grab(new RegExp(`(?:a los|despues de|luego de|en|al cabo de)\\s*${NUMBER}\\s*(?:s|seg|segundos?)\\b`), 't');
  grab(new RegExp(`(?:altura maxima|hmax)\\s*(?:=|:|de)?\\s*${NUMBER}\\s*${M}`), 'H');
  grab(new RegExp(`\\b(?:r|alcance|distancia(?: horizontal)?)\\s*(?:=|:|de)?\\s*${NUMBER}\\s*${M}`), 'R');
  grab(new RegExp(`(?:llega|llegue|llegar|cae|caiga|caer|aterriza|aterrice|alcanza|alcance|recorre|recorra)(?: a| hasta)?\\s*${NUMBER}\\s*${M}`), 'R');
  if (data.R === undefined && data.h0 === undefined) grab(new RegExp(`(?:\\ba|hasta) ${NUMBER}\\s*${M}(?! de (?:altura|alto))`), 'R');
  const planet = PLANETS.find(item => item.pattern.test(s));
  if (planet && data.g === undefined) { data.g = planet.g; data.planet = planet; }
  if (/(?:lanzad[oa]|lanza|tira|arroja|sale|patea|dispara)[a-z]* horizontal|horizontalmente|tiro horizontal|lanzamiento horizontal/.test(s) && data.angle === undefined) data.angle = 0;
  return data;
}

/** ¿Qué quiere saber? (para resaltar esa magnitud en la resolución). */
export function askedQuantity(text) {
  // Se quitan las frases que describen la altura de salida ("mesa de 1,2 m
  // de altura") para no confundirlas con lo que se pregunta.
  const s = simplify(text)
    .replace(/\d+(?:[.,]\d+)?\s*m(?:etros?)? de (?:altura|alto)/g, ' ')
    .replace(/(?:desde|de) (?:una |un )?(?:altura|edificio|torre|mesa|acantilado|puente|techo|balcon|terraza)(?: de)? \d+(?:[.,]\d+)?\s*m(?:etros?)?/g, ' ');
  if (/cuanto tarda|tarda en|cuanto tiempo|tiempo de (?:vuelo|caida)|cuantos segundos/.test(s)) return 'time';
  if (/(?:que|con que|cual es la|cuanta|mba'?e) (?:velocidad|rapidez)(?: inicial)? (?:necesit|debe|hace falta|tiene que|requier)|velocidad necesaria|rapidez necesaria|con que (?:velocidad|rapidez)/.test(s)) return 'v0';
  if (/(?:que|con que|cual|mba'?e) angulo|angulo necesario|angulos? posibles?/.test(s)) return 'angle';
  if (/(?:posicion|donde esta|donde se encuentra|coordenadas?)/.test(s)) return 'position';
  if (/velocidad (?:final|de impacto|al (?:llegar|caer|tocar))|con que velocidad (?:llega|cae|impacta)/.test(s)) return 'impact';
  if (/alcance|distancia|lejos|donde (?:cae|aterriza|llega)|mombyry/.test(s)) return 'range';
  if (/altura maxima|altura|punto mas alto|que tan alto|yvate/.test(s)) return 'height';
  if (/tiempo|cuanto tarda|segundos|cuanto dura|en el aire|aravo/.test(s)) return 'time';
  if (/componente|vx|vy|descompon/.test(s)) return 'components';
  return 'all';
}

const has = (s, regex) => regex.test(s);

/** Detecta la intención principal del mensaje. */
export function detectIntent(text, history = []) {
  const s = simplify(text);
  const data = parseProblem(text);
  const lastTutor = [...(history ?? [])].reverse().find(item => item?.role === 'tutor' || item?.role === 'assistant');
  const awaitingPractice = lastTutor?.widget?.type === 'practice' && !lastTutor.widget.checked;
  if (awaitingPractice && /^\s*(?:(?:me (?:da|dio|sale|salio)|es|da|resultado|respuesta|mi respuesta es|creo que|ha'?e)\s*)?[-+]?\d+(?:[.,]\d+)?\s*(?:m\/s|m|s|°|grados|segundos|metros)?\.?\s*$/.test(s)) return 'answer-practice';
  if (has(s, /^(?:ayuda|help|menu|opciones)$|que (?:podes|puedes|sabes) hacer|como (?:te uso|funcionas|me ayudas)|mba'?e(?:pa)? ikatu (?:rejapo|ejapo)|en que me (?:podes|puedes) ayudar/)) return 'help';
  if (has(s, /km ?\/ ?h|kmh|km por hora/) && has(s, /m ?\/ ?s|metros por segundo|pasar|convert|cambiar|a cuanto/) && !(data.angle !== undefined)) return 'convert';
  if (has(s, /(?:todas las|hoja de|resumen de|lista de|dame las|cuales son las|mostrame las) formulas|formulario|formulas del (?:tema|movimiento)|fórmula-kuera|formula-kuera/)) return 'formulas';
  if (has(s, /practic|dame (?:un|otro) (?:ejercicio|problema)|ponme a prueba|ponele a prueba|evalua(?:me|rme)|tomame|examen de prueba|quiero (?:practicar|entrenar)|desafiame|ejercicio para resolver|eme'?e(?: che)?(?:ve)? (?:peteĩ|peteí|pete[iĩ]) ejercicio|ñeha'?a|neha'?a/)) return 'practice';
  if (has(s, /\b3d\b|tres dimensiones|tridimensional|en 3 d\b/)) return '3d';
  const twoAngles = (s.match(/\d+(?:[.,]\d+)?\s*(?:°|grados?)/g) ?? []).length >= 2 || /\b(?:30|15|20|25|35|40)\s*(?:y|e|vs|contra|con)\s*(?:60|75|70|65|55|50)\b/.test(s);
  if (has(s, /compar|diferencia entre|embojoja|versus|\bvs\b|cual llega mas lejos/) && (twoAngles || has(s, /angulos?/))) return 'compare';
  if (has(s, /dibuj|grafic|trazar|traza |plano cartesiano|tabla de valores|hacer (?:el|un) grafico|ta'?anga|mbohasa papel|en (?:el|mi) cuaderno.*(?:grafico|curva|parabola)/)) return 'graph';
  if (has(s, /simul|animaci|anima(?:lo|la|r)?\b|mostrame (?:el|un|como (?:vuela|cae|se mueve))|quiero ver (?:el|un|como)|ver (?:el )?lanzamiento|lanzalo|hacelo volar|ehechauka/)) return 'simulate';
  const values = ['v0', 'angle', 'h0', 'R', 'H', 't'].filter(key => data[key] !== undefined).length;
  const solveWords = has(s, /calcul|resolv|resuelv|halla|hallar|encontr|determin|cuanto|cuanta|cual es|mboy|ejercicio|problema|ayudame con|como saco|que (?:velocidad|angulo|altura|alcance|tiempo)|ejapo/);
  if ((values >= 2 && (solveWords || values >= 3)) || (values >= 2 && data.v0 !== undefined && data.angle !== undefined)) return 'solve';
  if (has(s, /paso a paso|cuaderno|ensen[a]|explica(?:me)? (?:como|desde cero)|como se (?:calcula|saca|hace|resuelve)|como (?:calculo|saco|resuelvo|hago)|leccion|clase de|aprender a|mbo'?e|embo'?e/)) return 'notebook';
  return null;
}

/* ------------------------------------------------------------------ */
/* Resolución "como en el cuaderno"                                     */
/* ------------------------------------------------------------------ */

function launchData(data) {
  return {
    v0: data.v0 ?? 20,
    angle: data.angle ?? 45,
    g: data.g ?? G_EARTH,
    h0: data.h0 ?? 0,
  };
}

/** Resuelve un lanzamiento y devuelve los pasos del cuaderno (bilingüe). */
export function solveNotebook(text, language) {
  const data = parseProblem(text);
  const asked = askedQuantity(text);
  const g = data.g ?? G_EARTH;
  const gNote = data.g === undefined ? L(language, ' (no la diste: usamos la de la Tierra)', ' (nde nome’ẽi: ñaipuru Yvy mba’e)') : data.planet ? L(language, ` (en ${data.planet.es})`, ` (${data.planet.gn}-pe)`) : '';

  // Problemas inversos: calcular v0 o el ángulo a partir del alcance.
  if (asked === 'v0' && data.R !== undefined && data.angle !== undefined) return inverseSpeed(data, g, gNote, language);
  if (asked === 'angle' && data.R !== undefined && data.v0 !== undefined) return inverseAngle(data, g, gNote, language);
  if (asked === 'v0' && data.H !== undefined && data.angle !== undefined) return inverseSpeedFromHeight(data, g, gNote, language);

  if (data.v0 === undefined || data.angle === undefined) return null;
  const { v0, angle, h0 } = launchData(data);
  const launch = createLaunch(v0, angle, { gravity: g, y0: h0 });
  const T = timeOfFlight(launch);
  const H = maxHeight(launch);
  const R = range(launch);
  const tUp = launch.vy > 0 ? launch.vy / g : 0;
  const vx = launch.vx, vy = launch.vy;
  const impact = velocityAt(launch, T);
  const steps = [];

  steps.push({
    title: L(language, '1. Anotamos los datos', '1. Jahai umi dato'),
    lines: [
      `v0 = ${fmt(v0)} m/s`,
      `θ = ${fmt(angle)}°`,
      `g = ${fmt(g)} m/s²${gNote}`,
      ...(h0 ? [L(language, `Altura inicial h0 = ${fmt(h0)} m`, `Altura inicial h0 = ${fmt(h0)} m`)] : []),
      ...(data.t !== undefined ? [`t = ${fmt(data.t)} s`] : []),
      L(language, `Nos piden: ${askedLabel(asked, 'es')}.`, `Ojejerure: ${askedLabel(asked, 'gn')}.`),
    ],
  });
  steps.push({
    title: L(language, '2. Separamos la velocidad en dos ejes', '2. Jamboja’o velocidad mokõi eje-pe'),
    formula: 'vx = v0 · cos θ ; v0y = v0 · sen θ',
    lines: [
      `vx = ${fmt(v0)} · cos ${fmt(angle)}° = ${fmt(vx)} m/s`,
      `v0y = ${fmt(v0)} · sen ${fmt(angle)}° = ${fmt(vy)} m/s`,
      L(language, 'En x la velocidad no cambia (MRU); en y la gravedad la frena y después la acelera (MRUV).', 'Eje x-pe velocidad nomoambuéi (MRU); eje y-pe gravedad ojoko ha upéi omboguejy pya’eve (MRUV).'),
    ],
  });
  if (vy > 0) {
    steps.push({
      title: L(language, '3. Tiempo de subida y altura máxima', '3. Tiempo de subida ha altura máxima'),
      formula: h0 ? 'ts = v0y / g ; Hmax = h0 + v0y² / (2 · g)' : 'ts = v0y / g ; Hmax = v0y² / (2 · g)',
      lines: [
        `ts = ${fmt(vy)} / ${fmt(g)} = ${fmt(tUp)} s`,
        `Hmax = ${h0 ? `${fmt(h0)} + ` : ''}${fmt(vy)}² / (2 · ${fmt(g)}) = ${fmt(H)} m`,
        L(language, 'En el punto más alto vy = 0: solo queda vx.', 'Punto yvatevévape vy = 0: opyta vx año.'),
      ],
    });
  }
  steps.push({
    title: L(language, `${vy > 0 ? 4 : 3}. Tiempo total de vuelo`, `${vy > 0 ? 4 : 3}. Tiempo de vuelo completo`),
    formula: h0 ? 'T = (v0y + √(v0y² + 2 · g · h0)) / g' : 'T = 2 · v0y / g',
    lines: h0
      ? [`T = (${fmt(vy)} + √(${fmt(vy)}² + 2 · ${fmt(g)} · ${fmt(h0)})) / ${fmt(g)} = ${fmt(T)} s`, L(language, 'Sale desde arriba del suelo, por eso tarda más que 2 · ts.', 'Osẽ yvate guive, upévare ohasa hetave tiempo 2 · ts-gui.')]
      : [`T = 2 · ${fmt(vy)} / ${fmt(g)} = ${fmt(T)} s`, L(language, 'Sube y baja en el mismo tiempo (trayectoria simétrica).', 'Ojupi ha oguejy peteĩ tiempo-pe (trayectoria simétrica).')],
  });
  steps.push({
    title: L(language, `${vy > 0 ? 5 : 4}. Alcance horizontal`, `${vy > 0 ? 5 : 4}. Alcance horizontal`),
    formula: 'R = vx · T',
    lines: [
      `R = ${fmt(vx)} · ${fmt(T)} = ${fmt(R)} m`,
      ...(!h0 && vy > 0 ? [L(language, `Verificación con R = v0² · sen(2θ) / g = ${fmt((v0 * v0 * Math.sin(rad(2 * angle))) / g)} m ✔`, `Jahecha jey R = v0² · sen(2θ) / g = ${fmt((v0 * v0 * Math.sin(rad(2 * angle))) / g)} m ✔`)] : []),
    ],
  });
  if (data.t !== undefined) {
    const t = Math.min(data.t, T);
    const p = positionAt(launch, t);
    const v = velocityAt(launch, t);
    steps.push({
      title: L(language, `Extra: dónde está a los ${fmt(data.t)} s`, `Extra: moõpa oĩ ${fmt(data.t)} s-pe`),
      formula: 'x = vx · t ; y = h0 + v0y · t − ½ · g · t² ; vy = v0y − g · t',
      lines: [
        `x = ${fmt(vx)} · ${fmt(t)} = ${fmt(p.x)} m`,
        `y = ${h0 ? `${fmt(h0)} + ` : ''}${fmt(vy)} · ${fmt(t)} − ½ · ${fmt(g)} · ${fmt(t)}² = ${fmt(Math.max(0, p.y))} m`,
        `vy = ${fmt(vy)} − ${fmt(g)} · ${fmt(t)} = ${fmt(v.vy)} m/s ${v.vy > 0 ? L(language, '(todavía sube)', '(ojupi gueteri)') : v.vy < 0 ? L(language, '(ya baja)', '(oguejýma)') : L(language, '(punto más alto)', '(punto yvatevéva)')}`,
        ...(data.t > T ? [L(language, `Ojo: a los ${fmt(data.t)} s ya había caído (vuela ${fmt(T)} s).`, `Ehecha: ${fmt(data.t)} s-pe ho’ama (ovola ${fmt(T)} s).`)] : []),
      ],
    });
  }
  if (asked === 'impact') {
    steps.push({
      title: L(language, 'Extra: velocidad al llegar al suelo', 'Extra: velocidad og̃uahẽvo yvýpe'),
      formula: 'vy = v0y − g · T ; v = √(vx² + vy²)',
      lines: [`vy = ${fmt(vy)} − ${fmt(g)} · ${fmt(T)} = ${fmt(impact.vy)} m/s`, `v = √(${fmt(vx)}² + ${fmt(impact.vy)}²) = ${fmt(impact.speed)} m/s`],
    });
  }
  steps.push({
    title: L(language, 'Revisamos que tenga sentido', 'Jahecha jey oĩ porãpa'),
    lines: [
      L(language, 'Unidades: distancias en m, tiempos en s, velocidades en m/s. ✔', 'Unidades: distancia m-pe, tiempo s-pe, velocidad m/s-pe. ✔'),
      L(language, 'Calculadora en modo DEG (grados), no RAD.', 'Calculadora modo DEG-pe (grados), ndaha’éi RAD.'),
      L(language, 'Modelo ideal: sin resistencia del aire.', 'Modelo ideal: ndaipóri resistencia del aire.'),
    ],
  });

  const answer = answerLine({ asked, R, H, T, vx, vy, impact, data, launch, language });
  return {
    type: 'notebook',
    title: L(language, 'Resolución en el cuaderno', 'Resolución cuaderno-pe'),
    params: { v0: round(v0), angle: round(angle), g: round(g), h0: round(h0) },
    steps,
    answer,
  };
}

function askedLabel(asked, lang) {
  const es = { range: 'el alcance horizontal', height: 'la altura máxima', time: 'el tiempo de vuelo', components: 'las componentes de la velocidad', impact: 'la velocidad al llegar al suelo', position: 'la posición en ese instante', v0: 'la velocidad inicial', angle: 'el ángulo', all: 'describir todo el movimiento' };
  const gn = { range: 'alcance horizontal', height: 'altura máxima', time: 'tiempo de vuelo', components: 'componentes de la velocidad', impact: 'velocidad og̃uahẽvo yvýpe', position: 'posición upe instante-pe', v0: 'velocidad inicial', angle: 'ángulo', all: 'movimiento completo' };
  return (lang === 'es' ? es : gn)[asked] ?? (lang === 'es' ? es.all : gn.all);
}

function answerLine({ asked, R, H, T, vx, vy, impact, data, launch, language }) {
  const map = {
    range: `R = ${fmt(R)} m`,
    height: `Hmax = ${fmt(H)} m`,
    time: `T = ${fmt(T)} s`,
    components: `vx = ${fmt(vx)} m/s · v0y = ${fmt(vy)} m/s`,
    impact: `v = ${fmt(impact.speed)} m/s`,
  };
  if (asked === 'position' && data.t !== undefined) {
    const p = positionAt(launch, Math.min(data.t, T));
    return `x = ${fmt(p.x)} m · y = ${fmt(Math.max(0, p.y))} m`;
  }
  return map[asked] ?? L(language, `R = ${fmt(R)} m · Hmax = ${fmt(H)} m · T = ${fmt(T)} s`, `R = ${fmt(R)} m · Hmax = ${fmt(H)} m · T = ${fmt(T)} s`);
}

function inverseSpeed(data, g, gNote, language) {
  const s2 = Math.sin(rad(2 * data.angle));
  if (!(s2 > 0)) return null;
  const v0 = Math.sqrt((data.R * g) / s2);
  return {
    type: 'notebook',
    title: L(language, 'Resolución en el cuaderno', 'Resolución cuaderno-pe'),
    params: { v0: round(v0), angle: data.angle, g: round(g), h0: 0 },
    steps: [
      { title: L(language, '1. Datos', '1. Dato-kuéra'), lines: [`R = ${fmt(data.R)} m`, `θ = ${fmt(data.angle)}°`, `g = ${fmt(g)} m/s²${gNote}`, L(language, 'Nos piden: la velocidad inicial v0.', 'Ojejerure: velocidad inicial v0.')] },
      { title: L(language, '2. Elegimos la fórmula del alcance', '2. Jaiporavo fórmula del alcance'), formula: 'R = v0² · sen(2θ) / g', lines: [L(language, 'Sirve si sale y llega a la misma altura.', 'Ojepuru osẽ ha og̃uahẽ jave peteĩ altura-pe.')] },
      { title: L(language, '3. Despejamos v0', '3. Jaheja v0 ha’eño'), formula: 'v0 = √( R · g / sen(2θ) )', lines: [`v0 = √( ${fmt(data.R)} · ${fmt(g)} / sen(${fmt(2 * data.angle)}°) )`, `v0 = √( ${fmt(data.R * g)} / ${fmt(s2, 3)} ) = ${fmt(v0)} m/s`] },
      { title: L(language, 'Revisamos', 'Jahecha jey'), lines: [L(language, `Con v0 = ${fmt(v0)} m/s y ${fmt(data.angle)}° el alcance da ${fmt((v0 * v0 * s2) / g)} m ✔`, `v0 = ${fmt(v0)} m/s ha ${fmt(data.angle)}° reheve alcance osẽ ${fmt((v0 * v0 * s2) / g)} m ✔`)] },
    ],
    answer: `v0 = ${fmt(v0)} m/s`,
  };
}

function inverseAngle(data, g, gNote, language) {
  const ratio = (data.R * g) / (data.v0 * data.v0);
  const base = [
    { title: L(language, '1. Datos', '1. Dato-kuéra'), lines: [`R = ${fmt(data.R)} m`, `v0 = ${fmt(data.v0)} m/s`, `g = ${fmt(g)} m/s²${gNote}`, L(language, 'Nos piden: el ángulo θ.', 'Ojejerure: ángulo θ.')] },
    { title: L(language, '2. Despejamos sen(2θ)', '2. Jaheja sen(2θ) ha’eño'), formula: 'sen(2θ) = R · g / v0²', lines: [`sen(2θ) = ${fmt(data.R)} · ${fmt(g)} / ${fmt(data.v0)}² = ${fmt(ratio, 3)}`] },
  ];
  if (ratio > 1) {
    return {
      type: 'notebook', title: L(language, 'Resolución en el cuaderno', 'Resolución cuaderno-pe'),
      params: { v0: data.v0, angle: 45, g: round(g), h0: 0 },
      steps: [...base, { title: L(language, '3. Conclusión', '3. Conclusión'), lines: [L(language, `sen(2θ) no puede ser mayor que 1: con ${fmt(data.v0)} m/s el alcance máximo (a 45°) es ${fmt((data.v0 * data.v0) / g)} m. No llega a ${fmt(data.R)} m.`, `sen(2θ) ndaikatúi tuichave 1-gui: ${fmt(data.v0)} m/s reheve alcance máximo (45°-pe) ha’e ${fmt((data.v0 * data.v0) / g)} m. Nog̃uahẽi ${fmt(data.R)} m-pe.`)] }],
      answer: L(language, 'No hay ángulo posible', 'Ndaipóri ángulo ikatúva'),
    };
  }
  const a1 = deg(Math.asin(ratio)) / 2;
  const a2 = 90 - a1;
  return {
    type: 'notebook', title: L(language, 'Resolución en el cuaderno', 'Resolución cuaderno-pe'),
    params: { v0: data.v0, angle: round(a1), g: round(g), h0: 0 },
    steps: [...base,
      { title: L(language, '3. Calculamos los ángulos', '3. Jacalcula umi ángulo'), formula: 'θ1 = ½ · arcsen(…) ; θ2 = 90° − θ1', lines: [`θ1 = ½ · arcsen(${fmt(ratio, 3)}) = ${fmt(a1)}°`, `θ2 = 90° − ${fmt(a1)}° = ${fmt(a2)}°`] },
      { title: L(language, 'Revisamos', 'Jahecha jey'), lines: [L(language, 'Dos ángulos complementarios dan el mismo alcance: el bajo vuela menos tiempo, el alto sube más.', 'Mokõi ángulo complementario ome’ẽ peteĩ alcance: pe michĩva ovola sa’ive, pe tuichavéva ojupi yvateve.')] },
    ],
    answer: `θ = ${fmt(a1)}° ${L(language, 'o', 'térã')} ${fmt(a2)}°`,
  };
}

function inverseSpeedFromHeight(data, g, gNote, language) {
  const s = Math.sin(rad(data.angle));
  if (!(s > 0)) return null;
  const vy = Math.sqrt(2 * g * data.H);
  const v0 = vy / s;
  return {
    type: 'notebook', title: L(language, 'Resolución en el cuaderno', 'Resolución cuaderno-pe'),
    params: { v0: round(v0), angle: data.angle, g: round(g), h0: 0 },
    steps: [
      { title: L(language, '1. Datos', '1. Dato-kuéra'), lines: [`Hmax = ${fmt(data.H)} m`, `θ = ${fmt(data.angle)}°`, `g = ${fmt(g)} m/s²${gNote}`] },
      { title: L(language, '2. Primero la velocidad vertical', '2. Ñepyrũrã velocidad vertical'), formula: 'Hmax = v0y² / (2g) → v0y = √(2 · g · Hmax)', lines: [`v0y = √(2 · ${fmt(g)} · ${fmt(data.H)}) = ${fmt(vy)} m/s`] },
      { title: L(language, '3. Después v0', '3. Upéi v0'), formula: 'v0 = v0y / sen θ', lines: [`v0 = ${fmt(vy)} / sen ${fmt(data.angle)}° = ${fmt(v0)} m/s`] },
    ],
    answer: `v0 = ${fmt(v0)} m/s`,
  };
}

/* ------------------------------------------------------------------ */
/* Lecciones "cuaderno" sin datos                                       */
/* ------------------------------------------------------------------ */

const LESSONS = {
  range: {
    match: /alcance|distancia|lejos|mombyry/,
    es: { title: 'Cómo calcular el alcance', steps: [
      ['1. Datos', ['Anotá v0, el ángulo θ y g (9,8 m/s² en la Tierra).']],
      ['2. Separá la velocidad', ['vx = v0 · cos θ (horizontal)', 'v0y = v0 · sen θ (vertical)']],
      ['3. Tiempo de vuelo', ['Si sale y llega al mismo nivel: T = 2 · v0y / g']],
      ['4. Alcance', ['R = vx · T', 'Atajo: R = v0² · sen(2θ) / g'], 'R = v0² · sen(2θ) / g'],
      ['5. Revisá', ['El resultado va en metros. El máximo alcance es a 45°.']],
    ] },
    gn: { title: 'Mba’éichapa ojecalcula alcance', steps: [
      ['1. Dato-kuéra', ['Ehai v0, ángulo θ ha g (9,8 m/s² Yvy-pe).']],
      ['2. Emboja’o velocidad', ['vx = v0 · cos θ (horizontal)', 'v0y = v0 · sen θ (vertical)']],
      ['3. Tiempo de vuelo', ['Osẽ ha og̃uahẽ jave peteĩ nivel-pe: T = 2 · v0y / g']],
      ['4. Alcance', ['R = vx · T', 'Tape mbykyve: R = v0² · sen(2θ) / g'], 'R = v0² · sen(2θ) / g'],
      ['5. Ehecha jey', ['Resultado oĩ metro-pe. Alcance tuichavéva 45°-pe.']],
    ] },
  },
  height: {
    match: /altura|punto mas alto|yvate/,
    es: { title: 'Cómo calcular la altura máxima', steps: [
      ['1. Solo importa lo vertical', ['v0y = v0 · sen θ']],
      ['2. Arriba vy = 0', ['En el punto más alto el objeto deja de subir.']],
      ['3. Fórmula', ['Hmax = v0y² / (2 · g)', 'Si sale desde una altura h0, sumala: Hmax = h0 + v0y² / (2g)'], 'Hmax = v0y² / (2 · g)'],
      ['4. Tiempo hasta arriba', ['ts = v0y / g']],
      ['5. Revisá', ['Resultado en metros; más ángulo o más v0 → más altura.']],
    ] },
    gn: { title: 'Mba’éichapa ojecalcula altura máxima', steps: [
      ['1. Vertical año', ['v0y = v0 · sen θ']],
      ['2. Yvate vy = 0', ['Punto yvatevévape objeto nojupivéima.']],
      ['3. Fórmula', ['Hmax = v0y² / (2 · g)', 'Osẽ ramo h0 altura guive, embojoapy: Hmax = h0 + v0y² / (2g)'], 'Hmax = v0y² / (2 · g)'],
      ['4. Tiempo yvate peve', ['ts = v0y / g']],
      ['5. Ehecha jey', ['Resultado metro-pe; ángulo térã v0 tuichave → altura tuichave.']],
    ] },
  },
  time: {
    match: /tiempo|tarda|segundos|aravo/,
    es: { title: 'Cómo calcular el tiempo de vuelo', steps: [
      ['1. Velocidad vertical', ['v0y = v0 · sen θ']],
      ['2. Tiempo de subida', ['ts = v0y / g']],
      ['3. Mismo nivel', ['Baja en el mismo tiempo que sube: T = 2 · v0y / g'], 'T = 2 · v0y / g'],
      ['4. Si sale desde una altura h0', ['T = (v0y + √(v0y² + 2 · g · h0)) / g']],
      ['5. Revisá', ['El tiempo va en segundos y no depende de vx.']],
    ] },
    gn: { title: 'Mba’éichapa ojecalcula tiempo de vuelo', steps: [
      ['1. Velocidad vertical', ['v0y = v0 · sen θ']],
      ['2. Tiempo de subida', ['ts = v0y / g']],
      ['3. Peteĩ nivel', ['Oguejy peteĩ tiempo-pe ojupiháicha: T = 2 · v0y / g'], 'T = 2 · v0y / g'],
      ['4. Osẽ ramo h0 altura guive', ['T = (v0y + √(v0y² + 2 · g · h0)) / g']],
      ['5. Ehecha jey', ['Tiempo oĩ segundo-pe ha nodependéi vx-gui.']],
    ] },
  },
  components: {
    match: /componente|vx|vy|descompon|seno|coseno/,
    es: { title: 'Cómo descomponer la velocidad', steps: [
      ['1. Dibujá el vector', ['Una flecha v0 inclinada θ sobre la horizontal.']],
      ['2. Formá un triángulo', ['El cateto horizontal es vx y el vertical es v0y.']],
      ['3. Usá trigonometría', ['vx = v0 · cos θ (cateto adyacente)', 'v0y = v0 · sen θ (cateto opuesto)'], 'vx = v0 · cos θ ; v0y = v0 · sen θ'],
      ['4. Controlá', ['vx² + v0y² = v0² (Pitágoras).']],
      ['5. Error típico', ['Cambiar seno por coseno: el coseno va con el ángulo que toca la horizontal.']],
    ] },
    gn: { title: 'Mba’éichapa jamboja’o velocidad', steps: [
      ['1. Ehai vector', ['Peteĩ flecha v0 ojejoko’íva θ horizontal ári.']],
      ['2. Ejapo triángulo', ['Cateto horizontal ha’e vx ha vertical ha’e v0y.']],
      ['3. Eipuru trigonometría', ['vx = v0 · cos θ (cateto adyacente)', 'v0y = v0 · sen θ (cateto opuesto)'], 'vx = v0 · cos θ ; v0y = v0 · sen θ'],
      ['4. Ehecha jey', ['vx² + v0y² = v0² (Pitágoras).']],
      ['5. Javy ojehujepíva', ['Emoambue seno coseno ndive: coseno oho ángulo opokóva horizontal ndive.']],
    ] },
  },
  horizontal: {
    match: /horizontal(?:mente)?|desde una mesa|desde un edificio|tiro horizontal/,
    es: { title: 'Tiro horizontal paso a paso', steps: [
      ['1. Datos', ['Sale con v0 horizontal (θ = 0°) desde una altura h.']],
      ['2. Vertical: caída libre', ['v0y = 0, entonces h = ½ · g · t²']],
      ['3. Tiempo de caída', ['t = √(2 · h / g)'], 't = √(2 · h / g)'],
      ['4. Alcance', ['R = v0 · t']],
      ['5. Idea clave', ['Tarda lo mismo en caer que un objeto soltado desde la misma altura.']],
    ] },
    gn: { title: 'Tiro horizontal paso a paso', steps: [
      ['1. Dato-kuéra', ['Osẽ v0 horizontal reheve (θ = 0°) h altura guive.']],
      ['2. Vertical: caída libre', ['v0y = 0, upévare h = ½ · g · t²']],
      ['3. Tiempo de caída', ['t = √(2 · h / g)'], 't = √(2 · h / g)'],
      ['4. Alcance', ['R = v0 · t']],
      ['5. Idea clave', ['Ho’a peteĩ tiempo-pe objeto ojepoíva upe altura guive ndive.']],
    ] },
  },
  general: {
    match: /./,
    es: { title: 'Método para cualquier ejercicio', steps: [
      ['1. Leé y dibujá', ['Hacé un dibujo con el punto de salida, la parábola y lo que te piden.']],
      ['2. Datos con unidades', ['v0 (m/s), θ (°), g (m/s²), alturas y distancias (m).']],
      ['3. Separá ejes', ['x: MRU → x = vx · t', 'y: MRUV → y = h0 + v0y · t − ½ g t²']],
      ['4. Elegí la fórmula', ['Alcance, altura máxima o tiempo según lo que piden.']],
      ['5. Sustituí y revisá', ['Reemplazá con cuidado, calculadora en DEG, revisá unidades y sentido.']],
    ] },
    gn: { title: 'Método oimeraẽ ejercicio-pe g̃uarã', steps: [
      ['1. Emoñe’ẽ ha ehai', ['Ejapo peteĩ dibujo punto de salida, parábola ha ojejeruréva reheve.']],
      ['2. Dato unidad reheve', ['v0 (m/s), θ (°), g (m/s²), altura ha distancia (m).']],
      ['3. Emboja’o eje', ['x: MRU → x = vx · t', 'y: MRUV → y = h0 + v0y · t − ½ g t²']],
      ['4. Eiporavo fórmula', ['Alcance, altura máxima térã tiempo, ojejeruréva rupi.']],
      ['5. Emoĩ valor ha ehecha jey', ['Emoĩ porã, calculadora DEG-pe, ehecha unidad ha sentido.']],
    ] },
  },
};

export function lessonNotebook(text, language) {
  const s = simplify(text);
  const key = /horizontal/.test(s) ? 'horizontal' : ['range', 'height', 'time', 'components'].find(item => LESSONS[item].match.test(s)) ?? 'general';
  const lesson = LESSONS[key][language === 'es' ? 'es' : 'gn'];
  return {
    type: 'notebook',
    title: lesson.title,
    params: { v0: 20, angle: key === 'horizontal' ? 0 : 45, g: G_EARTH, h0: key === 'horizontal' ? 10 : 0 },
    steps: lesson.steps.map(([title, lines, formula]) => ({ title, lines, ...(formula ? { formula } : {}) })),
    answer: null,
    lesson: key,
  };
}

/* ------------------------------------------------------------------ */
/* Práctica generada                                                    */
/* ------------------------------------------------------------------ */

export function makePractice(language, seed = Math.random()) {
  const pick = list => list[Math.floor(seed * 997) % list.length];
  const v0 = pick([10, 12, 15, 18, 20, 24, 25, 30]);
  const angle = pick([30, 37, 45, 53, 60]);
  const asked = pick(['range', 'height', 'time']);
  const launch = createLaunch(v0, angle, { gravity: G_EARTH });
  const answer = asked === 'range' ? range(launch) : asked === 'height' ? maxHeight(launch) : timeOfFlight(launch);
  const unit = asked === 'time' ? 's' : 'm';
  const text = L(language,
    `Una pelota sale con v0 = ${v0} m/s y un ángulo de ${angle}° (g = 9,8 m/s², sale y llega al mismo nivel). ¿Cuál es ${askedLabel(asked, 'es')}?`,
    `Peteĩ pelota osẽ v0 = ${v0} m/s ha ángulo ${angle}° reheve (g = 9,8 m/s², osẽ ha og̃uahẽ peteĩ nivel-pe). ¿Mboýpa ${askedLabel(asked, 'gn')}?`);
  return { type: 'practice', params: { v0, angle, g: G_EARTH, h0: 0 }, problem: { asked, answer: round(answer), unit, text } };
}

export function checkPractice(widget, value) {
  const expected = widget?.problem?.answer;
  if (!Number.isFinite(expected) || !Number.isFinite(value)) return null;
  const tolerance = Math.max(0.05 * Math.abs(expected), 0.1);
  return { correct: Math.abs(value - expected) <= tolerance, expected, diff: value - expected };
}

/* ------------------------------------------------------------------ */
/* Preguntas frecuentes offline                                         */
/* ------------------------------------------------------------------ */

const FAQ = [
  { pattern: /calculadora|radian|\brad\b|\bdeg\b|me da raro|me sale raro|me da mal el seno|me da negativo el seno/, es: 'Revisá el modo de la calculadora: tiene que estar en DEG (grados). En RAD, sen 30 da −0,99 en vez de 0,5. Probá: sen 30 = 0,5 → si te da eso, está bien configurada.', gn: 'Ehecha calculadora modo: oĩvaerã DEG-pe (grados). RAD-pe, sen 30 ome’ẽ −0,99, ndaha’éi 0,5. Eñeha’ã: sen 30 = 0,5 → upéva osẽ ramo, oĩ porã.' },
  { pattern: /(?:de donde sale|deduc|demostr).*(?:alcance|formula)|por que r ?= ?v0/, es: 'Deducción del alcance: T = 2·v0·sen θ / g y R = vx·T = v0·cos θ · 2·v0·sen θ / g. Como 2·sen θ·cos θ = sen(2θ), queda R = v0²·sen(2θ)/g. Vale solo si sale y llega a la misma altura.', gn: 'Alcance deducción: T = 2·v0·sen θ / g ha R = vx·T = v0·cos θ · 2·v0·sen θ / g. 2·sen θ·cos θ = sen(2θ) rupi, opyta R = v0²·sen(2θ)/g. Ojepuru osẽ ha og̃uahẽ jave peteĩ altura-pe año.' },
  { pattern: /(?:por que|mba'?erepa).*45|45.*(?:mejor|maximo|mas lejos|optimo)|angulo (?:optimo|ideal|perfecto)/, es: 'Porque el alcance depende de sen(2θ), y el seno vale como máximo 1 cuando 2θ = 90°, o sea θ = 45°. Con menos ángulo vuela poco tiempo; con más, avanza poco en x. 45° equilibra las dos cosas (en el modelo sin aire).', gn: 'Alcance odepende sen(2θ)-gui, ha seno tuichavéva ha’e 1, 2θ = 90° jave, he’ise θ = 45°. Ángulo michĩve reheve ovola sa’i tiempo; tuichave reheve, oho sa’i x-pe. 45° omoĩ porã mokõivéva (modelo ndaipóriva aire).' },
  { pattern: /punto mas alto|arriba de todo|en la cima|velocidad (?:es )?cero|vy ?= ?0/, es: 'En el punto más alto vy = 0, pero la velocidad NO es cero: sigue vx = v0·cos θ. Por eso el objeto sigue avanzando. La aceleración sigue siendo g hacia abajo.', gn: 'Punto yvatevévape vy = 0, ha katu velocidad NDAHA’ÉI cero: opyta vx = v0·cos θ. Upévare objeto oho tenonde gueteri. Aceleración ha’e g guýpe gotyo.' },
  { pattern: /masa|peso|mas pesad[oa]|liviano|pesa mas/, es: 'La masa no aparece en ninguna fórmula del modelo ideal: una piedra y una pelota con la misma v0 y ángulo hacen la misma parábola (sin aire). La gravedad acelera igual a todos los cuerpos.', gn: 'Masa noĩri mba’eve fórmula-pe modelo ideal-pe: peteĩ ita ha peteĩ pelota, peteĩ v0 ha ángulo reheve, ojapo peteĩ parábola (ndaipóri aire). Gravedad omboguejy peteĩcha opaite mba’e.' },
  { pattern: /(?:duplic|doble|triplic).*(?:velocidad|rapidez|v0)|(?:velocidad|rapidez|v0).*(?:duplic|doble)/, es: 'Si duplicás v0 (mismo ángulo y nivel), el alcance y la altura se multiplican por 4 (v0 está al cuadrado) y el tiempo de vuelo se duplica.', gn: 'Emomokõi ramo v0 (peteĩ ángulo ha nivel), alcance ha altura oñembohetave 4 jey (v0 oĩ al cuadrado) ha tiempo de vuelo mokõi jey.' },
  { pattern: /resistencia del aire|rozamiento|friccion|viento|vida real|realidad/, es: 'La app usa el modelo ideal: sin resistencia del aire. En la realidad el aire frena el objeto, la trayectoria deja de ser simétrica y el alcance es menor. El modelo ideal sirve para objetos pesados, lentos y trayectos cortos.', gn: 'App oipuru modelo ideal: ndaipóri resistencia del aire. Añetehápe aire ojoko objeto, trayectoria nosimétricavéima ha alcance michĩve. Modelo ideal ojepuru objeto pohýi, mbegue ha trayecto mbyky-pe.' },
  { pattern: /ejemplos? (?:de la )?vida|ejemplos? (?:reales|cotidianos)|donde se (?:usa|ve) (?:el )?(?:movimiento|tiro)|aplicaciones? (?:del|de la) (?:movimiento|fisica|tiro)|en la vida real/, es: 'Ejemplos: un tiro libre de fútbol, un lanzamiento al aro de básquet, el agua de una manguera, un dron que suelta un paquete, un clavadista, un chorro de fuente. En todos, x avanza parejo y y sube y baja por la gravedad.', gn: 'Techapyrã: tiro libre fútbol-pe, lanzamiento aro básquet-pe, y manguera-gui osẽva, dron omoñeñóva paquete, clavadista, fuente y. Opavavévape, x oho peteĩcha ha y ojupi ha oguejy gravedad rupi.' },
  { pattern: /que es (?:un )?proyectil|que es (?:el )?movimiento parabolico|mba'?e pa (?:ha'?e )?movimiento parabolico|definicion/, es: 'Un proyectil es un objeto lanzado que, después de salir, solo siente la gravedad. Su movimiento combina un MRU horizontal (vx constante) con un MRUV vertical (aceleración g hacia abajo): el resultado es una parábola.', gn: 'Proyectil ha’e objeto ojeitýva ha, osẽ rire, gravedad año oñandu. Imovimiento ombojoaju MRU horizontal (vx constante) ha MRUV vertical (aceleración g guýpe gotyo): osẽ peteĩ parábola.' },
  { pattern: /simetric|simetria|sube y baja igual/, es: 'Si sale y llega al mismo nivel, la trayectoria es simétrica: tarda lo mismo en subir que en bajar y llega con la misma rapidez con que salió (pero apuntando hacia abajo).', gn: 'Osẽ ha og̃uahẽ ramo peteĩ nivel-pe, trayectoria simétrica: ojupi ha oguejy peteĩ tiempo-pe ha og̃uahẽ upe rapidez osẽháicha (ha katu guýpe gotyo).' },
  { pattern: /unidad|m\/s o km|metros o|convertir|pasar de km/, es: 'Usá siempre m, s y m/s. Para pasar km/h a m/s dividí por 3,6 (72 km/h = 20 m/s). Para pasar m/s a km/h multiplicá por 3,6.', gn: 'Eipuru meme m, s ha m/s. km/h m/s-pe ehasa hag̃ua emboja’o 3,6-pe (72 km/h = 20 m/s). m/s km/h-pe, embohetave 3,6 reheve.' },
  { pattern: /error(?:es)? (?:comun|tipic|frecuent)|en que me equivoco|que no tengo que hacer|javy/, es: 'Errores típicos: 1) calculadora en RAD; 2) usar sen para vx (va cos); 3) olvidar que en el punto más alto vy = 0; 4) usar R = v0²·sen(2θ)/g cuando sale desde una altura; 5) mezclar km/h con m/s; 6) poner g positiva hacia arriba.', gn: 'Javy ojehujepíva: 1) calculadora RAD-pe; 2) eipuru sen vx-pe g̃uarã (oho cos); 3) nde resarái punto yvatevévape vy = 0; 4) eipuru R = v0²·sen(2θ)/g osẽ jave altura guive; 5) embojehe’a km/h m/s ndive; 6) emoĩ g positiva yvate gotyo.' },
  { pattern: /como estudi|prueba|examen|me va a tomar|repasar para/, es: 'Plan para la prueba: 1) repasá las 4 fórmulas (vx, v0y, Hmax, R); 2) resolvé 3 ejercicios con datos distintos; 3) practicá uno desde una altura; 4) revisá unidades y calculadora en DEG. Pedime "dame un ejercicio" y te tomo uno.', gn: 'Plan prueba-pe g̃uarã: 1) ehecha jey 4 fórmula (vx, v0y, Hmax, R); 2) eresolve 3 ejercicio dato iñambuéva reheve; 3) epractica peteĩ altura guive; 4) ehecha unidad ha calculadora DEG-pe. Ejerure chéve "eme’ẽ peteĩ ejercicio" ha ame’ẽta ndéve.' },
  { pattern: /signo|negativ|positiv|hacia abajo|g negativa/, es: 'Convención común: hacia arriba positivo. Entonces la gravedad aparece restando: y = y0 + v0y·t − ½·g·t², con g = 9,8 positiva en la fórmula. Si vy te da negativa, significa que el objeto ya está bajando.', gn: 'Convención ojepurúva: yvate gotyo positivo. Upévare gravedad oñemboguejy: y = y0 + v0y·t − ½·g·t², g = 9,8 positiva fórmula-pe. vy osẽ ramo negativa, he’ise objeto oguejýmaha.' },
  { pattern: /(?:por que|mba'?erepa) (?:es una |forma )?parabola|por que curva/, es: 'Porque x crece proporcional al tiempo (x = vx·t) mientras y tiene un término con t² por la gravedad. Si reemplazás t = x/vx en y, queda una ecuación cuadrática en x: y = x·tan θ − g·x²/(2·vx²). Eso es una parábola.', gn: 'x okakuaa tiempo ndive (x = vx·t) ha y oguereko t² gravedad rupi. Emoĩ ramo t = x/vx y-pe, opyta ecuación cuadrática x-pe: y = x·tan θ − g·x²/(2·vx²). Upéva ha’e parábola.' },
  { pattern: /30.*60|complementari|mismo alcance/, es: 'Con la misma v0, dos ángulos que suman 90° (como 30° y 60°) llegan igual de lejos, porque sen(2·30°) = sen(2·60°). El de 60° sube más y vuela más tiempo. Pedime "compará 30 y 60" para verlo.', gn: 'Peteĩ v0 reheve, mokõi ángulo ombojoapýva 90° (30° ha 60°) og̃uahẽ peteĩ distancia-pe, sen(2·30°) = sen(2·60°) rupi. 60° ojupi yvateve ha ovola hetave tiempo. Ejerure chéve "embojoja 30 ha 60" rehecha hag̃ua.' },
];

export function faqAnswer(text, language) {
  const s = simplify(text);
  const entry = FAQ.find(item => item.pattern.test(s));
  return entry ? L(language, entry.es, entry.gn) : null;
}

/* ------------------------------------------------------------------ */
/* Widgets y respuesta offline completa                                 */
/* ------------------------------------------------------------------ */

function paramsFrom(text, fallback = {}) {
  const data = parseProblem(text);
  const base = launchData({ ...fallback, ...data });
  return { v0: round(base.v0), angle: round(base.angle), g: round(base.g), h0: round(base.h0) };
}

function metricsLine(params, language) {
  const launch = createLaunch(params.v0, params.angle, { gravity: params.g, y0: params.h0 });
  return L(language,
    `Con v0 = ${fmt(params.v0)} m/s, θ = ${fmt(params.angle)}° y g = ${fmt(params.g)} m/s²${params.h0 ? ` desde ${fmt(params.h0)} m` : ''}: alcance ${fmt(range(launch))} m, altura máxima ${fmt(maxHeight(launch))} m y vuelo de ${fmt(timeOfFlight(launch))} s.`,
    `v0 = ${fmt(params.v0)} m/s, θ = ${fmt(params.angle)}° ha g = ${fmt(params.g)} m/s² reheve${params.h0 ? ` ${fmt(params.h0)} m guive` : ''}: alcance ${fmt(range(launch))} m, altura máxima ${fmt(maxHeight(launch))} m ha vuelo ${fmt(timeOfFlight(launch))} s.`);
}

const HELP = {
  es: 'Esto es lo que puedo hacer, también sin internet:\n\n• Resolver tu ejercicio paso a paso como en el cuaderno: "una pelota sale a 20 m/s con 30°, ¿cuál es el alcance?"\n• Enseñarte a dibujar el gráfico de la parábola con tabla de valores: "enseñame a graficar un lanzamiento de 15 m/s a 45°".\n• Mostrarte la simulación en 2D y 3D: "simulá 25 m/s a 60°".\n• Comparar ángulos: "compará 30° y 60°".\n• Darte ejercicios para practicar y corregirlos: "dame un ejercicio".\n• Explicarte un tema desde cero: "explicame paso a paso el tiempo de vuelo".\n• Hoja de fórmulas, conversión de km/h a m/s, otros planetas ("¿y en la Luna?"), errores comunes y consejos para la prueba.',
  gn: 'Ko’ãva ikatu ajapo, internet’ỹre avei:\n\n• Aresolve nde ejercicio paso a paso cuaderno-pe ojapoháicha: "peteĩ pelota osẽ 20 m/s ha 30° reheve, ¿mboýpa alcance?"\n• Ambo’e ndéve rehai hag̃ua parábola gráfico tabla de valores reheve: "embo’e chéve graficar 15 m/s ha 45°".\n• Ahechauka simulación 2D ha 3D-pe: "simulá 25 m/s ha 60°".\n• Ambojoja ángulo: "embojoja 30° ha 60°".\n• Ame’ẽ ejercicio repractica hag̃ua ha acorregi: "eme’ẽ chéve peteĩ ejercicio".\n• Amyesakã peteĩ tema ñepyrũ guive: "emyesakã chéve paso a paso tiempo de vuelo".\n• Fórmula-kuéra, km/h m/s-pe, ambue planeta ("¿ha Jasy-pe?"), javy ojehujepíva ha consejo prueba-pe g̃uarã.',
};

/**
 * Respuesta completa del chat sin internet: { message, widget } o null si no
 * es una consulta que estas herramientas sepan atender (entonces el tutor por
 * reglas busca en su base de conocimiento).
 */
export function offlineChatAnswer(text, history = [], language = 'gn-jopara') {
  const intent = detectIntent(text, history);
  const lang = language === 'es' ? 'es' : 'gn-jopara';
  if (intent === 'help') return { message: L(lang, HELP.es, HELP.gn), widget: null };
  if (intent === 'answer-practice') {
    const lastTutor = [...history].reverse().find(item => item?.role === 'tutor' || item?.role === 'assistant');
    const value = num((simplify(text).match(/[-+]?\d+(?:[.,]\d+)?/) ?? [])[0]);
    const verdict = checkPractice(lastTutor.widget, value);
    if (verdict) {
      const unit = lastTutor.widget.problem.unit;
      const notebook = solveNotebook(`v0 = ${lastTutor.widget.params.v0} angulo ${lastTutor.widget.params.angle} ${lastTutor.widget.problem.asked === 'range' ? 'alcance' : lastTutor.widget.problem.asked === 'height' ? 'altura maxima' : 'tiempo'}`, lang);
      return {
        message: verdict.correct
          ? L(lang, `¡Correcto! ${fmt(value)} ${unit} está bien (exacto: ${fmt(verdict.expected)} ${unit}). Acá tenés la resolución para comparar con tu cuaderno. ¿Otro? Escribí "dame otro ejercicio".`, `¡Iporã! ${fmt(value)} ${unit} oĩ porã (exacto: ${fmt(verdict.expected)} ${unit}). Ko’ápe oĩ resolución rembojoja hag̃ua nde cuaderno ndive. ¿Ambue? Ehai "eme’ẽ ambue ejercicio".`)
          : L(lang, `Todavía no: tu resultado (${fmt(value)} ${unit}) ${verdict.diff > 0 ? 'se pasa' : 'se queda corto'}. Revisá la resolución paso a paso y fijate en qué paso cambia tu cuenta.`, `Ndaha’éi gueteri: nde resultado (${fmt(value)} ${unit}) ${verdict.diff > 0 ? 'ohasa' : 'nog̃uahẽi'}. Ehecha resolución paso a paso ha ehecha moõ paso-pe iñambue nde cuenta.`),
        widget: notebook,
      };
    }
  }
  if (intent === 'convert') {
    const kmh = num((simplify(text).match(/(\d+(?:[.,]\d+)?)\s*(?:km ?\/ ?h|kmh|km por hora)/) ?? [])[1]);
    const ms = num((simplify(text).match(/(\d+(?:[.,]\d+)?)\s*(?:m ?\/ ?s|metros por segundo)/) ?? [])[1]);
    if (Number.isFinite(kmh)) return { message: L(lang, `${fmt(kmh)} km/h ÷ 3,6 = ${fmt(kmh / 3.6)} m/s. (Para volver: m/s × 3,6 = km/h.)`, `${fmt(kmh)} km/h ÷ 3,6 = ${fmt(kmh / 3.6)} m/s. (Rejevy hag̃ua: m/s × 3,6 = km/h.)`), widget: null };
    if (Number.isFinite(ms)) return { message: L(lang, `${fmt(ms)} m/s × 3,6 = ${fmt(ms * 3.6)} km/h.`, `${fmt(ms)} m/s × 3,6 = ${fmt(ms * 3.6)} km/h.`), widget: null };
  }
  if (intent === 'formulas') {
    return { message: L(lang, 'Estas son las fórmulas del movimiento parabólico (modelo sin aire). Tocá una para preguntarme cómo se usa.', 'Ko’ãva hína movimiento parabólico fórmula-kuéra (modelo ndaipóriva aire). Epoko peteĩre eporandu hag̃ua mba’éichapa ojepuru.'), widget: { type: 'formulas' } };
  }
  if (intent === 'practice') {
    const widget = makePractice(lang);
    return { message: L(lang, 'Te preparé un ejercicio 👇 Resolvelo en tu cuaderno y escribí tu resultado en la tarjeta o acá en el chat. Acepto hasta ±5 % de diferencia por redondeo.', 'Ambosako’i ndéve peteĩ ejercicio 👇 Eresolve nde cuaderno-pe ha ehai nde resultado tarjeta-pe térã ko’ápe chat-pe. Ahecha porã ±5 % peve diferencia redondeo rupi.'), widget };
  }
  if (intent === 'compare') {
    const s = simplify(text);
    const angles = [...s.matchAll(/(\d+(?:[.,]\d+)?)\s*(?:°|grados?)?/g)].map(match => num(match[1])).filter(value => value > 0 && value < 90);
    const params = paramsFrom(text);
    const pair = angles.length >= 2 ? angles.slice(0, 2) : [30, 60];
    const [a, b] = pair.map(angle => createLaunch(params.v0, angle, { gravity: params.g, y0: params.h0 }));
    return {
      message: L(lang,
        `Comparación con v0 = ${fmt(params.v0)} m/s:\n• ${fmt(pair[0])}° → alcance ${fmt(range(a))} m, altura ${fmt(maxHeight(a))} m, vuelo ${fmt(timeOfFlight(a))} s.\n• ${fmt(pair[1])}° → alcance ${fmt(range(b))} m, altura ${fmt(maxHeight(b))} m, vuelo ${fmt(timeOfFlight(b))} s.\n\n${Math.abs(pair[0] + pair[1] - 90) < 0.01 && !params.h0 ? 'Suman 90°: por eso llegan igual de lejos.' : range(a) > range(b) ? `Llega más lejos ${fmt(pair[0])}°.` : `Llega más lejos ${fmt(pair[1])}°.`} Miralo en el gráfico (también en 3D).`,
        `Ñembojoja v0 = ${fmt(params.v0)} m/s reheve:\n• ${fmt(pair[0])}° → alcance ${fmt(range(a))} m, altura ${fmt(maxHeight(a))} m, vuelo ${fmt(timeOfFlight(a))} s.\n• ${fmt(pair[1])}° → alcance ${fmt(range(b))} m, altura ${fmt(maxHeight(b))} m, vuelo ${fmt(timeOfFlight(b))} s.\n\n${Math.abs(pair[0] + pair[1] - 90) < 0.01 && !params.h0 ? 'Ombojoapy 90°: upévare og̃uahẽ peteĩ distancia-pe.' : range(a) > range(b) ? `Og̃uahẽ mombyryve ${fmt(pair[0])}°.` : `Og̃uahẽ mombyryve ${fmt(pair[1])}°.`} Ehecha gráfico-pe (3D-pe avei).`),
      widget: { type: 'compare', params, angles: pair },
    };
  }
  if (intent === 'graph') {
    const params = paramsFrom(text, { v0: 20, angle: 45 });
    return {
      message: L(lang,
        `Vamos a dibujar la parábola como en el cuaderno, paso a paso:\n1) Dibujá los ejes: x (distancia, m) e y (altura, m).\n2) Armá la tabla de valores con x = vx·t e y = h0 + v0y·t − ½·g·t².\n3) Marcá cada punto (x, y).\n4) Uní los puntos con una curva suave (no con rectas).\n5) Señalá la altura máxima y el alcance.\n\n${metricsLine(params, 'es')} Tocá "Siguiente paso" para ver cómo se arma.`,
        `Jahai parábola cuaderno-pe ojapoháicha, paso a paso:\n1) Ehai eje-kuéra: x (distancia, m) ha y (altura, m).\n2) Ejapo tabla de valores x = vx·t ha y = h0 + v0y·t − ½·g·t² reheve.\n3) Emoĩ káda punto (x, y).\n4) Embojoaju punto-kuéra peteĩ curva suave reheve (ndaha’éi recta).\n5) Ehechauka altura máxima ha alcance.\n\n${metricsLine(params, 'gn')} Epoko "Paso oúva" rehecha hag̃ua mba’éichapa oñemoĩ.`),
      widget: { type: 'graph', params },
    };
  }
  if (intent === 'simulate' || intent === '3d') {
    const params = paramsFrom(text);
    const scenario = /basquet|aro|canasta/.test(simplify(text)) ? 'basketball' : /pared|muro|valla|barrera/.test(simplify(text)) ? 'wall' : 'dron';
    return {
      message: L(lang, `Acá tenés la simulación. ${metricsLine(params, 'es')} Podés verla en 2D o en 3D, repetirla y abrirla en el Laboratorio PyFis para cambiar los datos.`, `Ko’ápe oĩ simulación. ${metricsLine(params, 'gn')} Ikatu rehecha 2D térã 3D-pe, rehechajey ha reipe’a Laboratorio PyFis-pe remoambue hag̃ua dato.`),
      widget: { type: 'simulation', params, scenario, view: intent === '3d' ? '3d' : '2d' },
    };
  }
  if (intent === 'solve') {
    const notebook = solveNotebook(text, lang);
    if (notebook) {
      return {
        message: L(lang, `Lo resolví como en el cuaderno, paso a paso 👇\n\nResultado: ${notebook.answer}.\n\nCopiá cada paso en tu cuaderno; abajo podés ver la simulación con estos mismos datos.`, `Aresolve cuaderno-pe ojapoháicha, paso a paso 👇\n\nResultado: ${notebook.answer}.\n\nEhai káda paso nde cuaderno-pe; iguýpe ikatu rehecha simulación ko’ã dato reheve.`),
        widget: notebook,
      };
    }
  }
  if (intent === 'notebook') {
    const lesson = lessonNotebook(text, lang);
    return {
      message: L(lang, `Te lo explico como una clase en el cuaderno: ${lesson.title.toLowerCase()}. Seguí los pasos de a uno y copialos. Cuando termines, pedime "dame un ejercicio" para practicarlo.`, `Amyesakã ndéve clase cuaderno-pe ojapoháicha: ${lesson.title.toLowerCase()}. Ehai paso peteĩteĩ. Remohu’ã vove, ejerure chéve "eme’ẽ peteĩ ejercicio" repractica hag̃ua.`),
      widget: lesson,
    };
  }
  const faq = faqAnswer(text, lang);
  if (faq) return { message: faq, widget: null };
  return null;
}

/**
 * Para respuestas online: aunque Gemini escriba el texto, las herramientas
 * locales agregan el widget que corresponde a lo que pidió el estudiante.
 */
export function widgetForMessage(text, history = [], language = 'gn-jopara') {
  const intent = detectIntent(text, history);
  if (!intent || ['help', 'convert', 'answer-practice'].includes(intent)) return null;
  return offlineChatAnswer(text, history, language)?.widget ?? null;
}

const TAG = /\[\[\s*(simular|simulacion|3d|grafico|graficar|cuaderno|resolver|comparar|practica|formulas)([^\]]*)\]\]/i;

/** Lee una etiqueta [[simular v0=20 angulo=45 g=9.8 h0=0]] escrita por la IA. */
export function parseWidgetTags(aiText, language = 'gn-jopara') {
  const text = String(aiText ?? '');
  const match = text.match(TAG);
  const clean = text.replace(new RegExp(TAG.source, 'gi'), '').replace(/\n{3,}/g, '\n\n').trim();
  if (!match) return { text: clean, widget: null };
  const kind = match[1].toLowerCase();
  const args = simplify(match[2]);
  const read = key => { const m = args.match(new RegExp(`\\b${key}\\s*=\\s*(-?\\d+(?:[.,]\\d+)?)`)); return m ? num(m[1]) : undefined; };
  const params = {
    v0: read('v0') ?? 20,
    angle: read('angulo') ?? read('angle') ?? 45,
    g: read('g') ?? G_EARTH,
    h0: read('h0') ?? 0,
  };
  const sane = params.v0 > 0 && params.v0 <= 200 && params.angle >= 0 && params.angle < 90 && params.g > 0 && params.g <= 50 && params.h0 >= 0 && params.h0 <= 500;
  if (!sane) return { text: clean, widget: null };
  if (kind === 'formulas') return { text: clean, widget: { type: 'formulas' } };
  if (kind === 'practica') return { text: clean, widget: makePractice(language) };
  if (kind === 'grafico' || kind === 'graficar') return { text: clean, widget: { type: 'graph', params } };
  if (kind === 'comparar') {
    const angles = (args.match(/angulos\s*=\s*([\d.,\s]+)/)?.[1] ?? '30,60').split(/[\s,;]+/).map(num).filter(value => value > 0 && value < 90).slice(0, 2);
    return { text: clean, widget: { type: 'compare', params, angles: angles.length === 2 ? angles : [30, 60] } };
  }
  if (kind === 'cuaderno' || kind === 'resolver') {
    const notebook = solveNotebook(`v0 = ${params.v0} angulo ${params.angle} g = ${params.g} h0 = ${params.h0}`, language);
    return { text: clean, widget: notebook };
  }
  return { text: clean, widget: { type: 'simulation', params, scenario: 'dron', view: kind === '3d' ? '3d' : '2d' } };
}

/** Datos del lanzamiento de un widget (para abrirlo en el laboratorio). */
export function widgetLaunch(widget) {
  const p = widget?.params ?? {};
  return { v0: p.v0 ?? 20, angle: p.angle ?? 45, g: p.g ?? G_EARTH, h0: p.h0 ?? 0 };
}
