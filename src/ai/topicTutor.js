// Tutor sin internet para los temas del programa del MEC (Educación Media).
// Reconoce el tema de la pregunta, lo explica con el resumen y las fórmulas
// del tema, cita dónde figura en el programa (curso, capacidad, resolución y
// páginas), resuelve cuentas con los datos que escribe el alumno y propone
// ejercicios generados con corrección. El tiro parabólico sigue a cargo de
// chatTools.js, que tiene su propio motor (cuaderno, gráfico, simulación).
import { TOPICS, topicById, topicCurriculum, pickLang, normalize } from '../curriculum/topics/index.js';
import { COURSES, GUIDE_SCHEDULES, courseTopicIds } from '../curriculum/curriculum.js';
import { SOURCES } from '../curriculum/sources.js';
import { generateExercise, checkAnswer, fmt, parseUserNumber } from '../curriculum/practice.js';

const L = (lang, es, gn) => (lang === 'es' ? es : gn);
const G = 9.8, K = 9e9, C_LIGHT = 3e8, H = 6.63e-34, V_SOUND = 340, G_UNIV = 6.67e-11;

/* ---------- ¿De qué tema habla? ---------- */

// Palabras que aparecen en muchos temas: suman poco y solas no deciden.
const WEAK = new Set(['cae', 'gravedad', 'grados', 'masa', 'peso', 'imagen', 'foco', 'mecanica', 'momento', 'escala',
  'unidad', 'acelera', 'alcanza', 'normal', 'vacio', 'hacia abajo', 'brazo', 'modulo', 'sol', 'luna', 'universal',
  'atraccion', 'continua', 'elastico', 'coeficiente', 'junta', 'consumo', 'capacidad', 'rendimiento', 'ciclo',
  'resultante', 'convertir', 'conversion', 'km/h', 'grave', 'serie', 'paralelo', 'rayo', 'trayectoria', 'posicion',
  'propagacion', 'mezcla', 'flujo', 'escalar', 'prefijo', 'concurrentes', 'calesita', 'vueltas', 'alarga', 'estira']);
// El tiro parabólico (y sus escenas) lo responde el motor de chatTools.js.
const PARABOLIC = /parabol|proyectil|tiro oblicuo|alcance|altura maxima|tiempo de vuelo|angulo optimo|\bdron|basquet|paredon|\bv0|\bvx\b|\bvy\b|lanzamiento|componente (?:horizontal|vertical)|yvate|mombyry/;

const KEYWORD_TESTS = TOPICS.filter(topic => topic.id !== 'movimiento-parabolico').map(topic => ({
  topic,
  tests: (topic.keywords ?? []).map(word => {
    const key = normalize(word);
    const escaped = key.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
    return { key, re: new RegExp(`(?:^|[^a-z0-9])${escaped}(?:s|es)?(?=$|[^a-z0-9])`), weight: WEAK.has(key) ? 0.4 : key.includes(' ') ? 2 : 1 };
  }),
}));

/** Tema de Física del que habla el texto (o null si no queda claro). */
export function detectTopic(text) {
  const s = normalize(text);
  if (!s || PARABOLIC.test(s)) return null;
  if (/\d+\s*(?:°|grados?)\b/.test(s) && /m\s*\/\s*s/.test(s) && !/celsius|fahrenheit|kelvin|°\s*[cf]\b/.test(s)) return null;
  let best = null;
  for (const { topic, tests } of KEYWORD_TESTS) {
    const score = tests.reduce((sum, test) => sum + (test.re.test(s) ? test.weight : 0), 0);
    if (score >= 1 && (!best || score > best.score)) best = { topic, score };
  }
  return best?.topic ?? null;
}

/* ---------- Cita del MEC ---------- */

function mecCitation(topic, lang) {
  const { placements } = topicCurriculum(topic.id);
  if (!placements.length) return '';
  const lines = placements.slice(0, 2).map(({ course, capacity }) => {
    const where = `${pickLang(course.name, lang)} (${pickLang(course.planName, lang)})`;
    const cap = capacity.n ? L(lang, `capacidad ${capacity.n}`, `capacidad ${capacity.n}`) : L(lang, 'cronograma', 'cronograma');
    const source = course.base
      ? `${SOURCES.A.resolution}, ${pickLang(SOURCES.A.short, lang)}, ${course.base.pages}`
      : `${pickLang(SOURCES.C.short, lang)}, ${GUIDE_SCHEDULES[course.id]?.pages ?? ''}`;
    const prio = course.prio ? (capacity.prio !== null ? L(lang, ` · Priorizado 2021 (n.º ${capacity.prio})`, ` · Priorizado 2021 (n.º ${capacity.prio})`) : '') : '';
    return `${where}, ${cap}: “${capacity.text}” — ${source}${prio}.`;
  });
  const extra = placements.length - 2;
  const more = extra > 0 ? L(lang, ` (y ${extra} ${extra === 1 ? 'lugar' : 'lugares'} más del programa: mirá Temas)`, ` (ha ${extra} ambue programa-pe: ehecha Tema-kuéra)`) : '';
  return `${L(lang, 'Según el MEC', 'MEC he’iháicha')}: ${lines.join(' ')}${more}`;
}

const whereToOpen = (topic, lang) => L(lang,
  `Para verlo en movimiento: Temas → ${pickLang(topic.name, lang)} → Simulador.`,
  `Rehecha hag̃ua omýiva: Tema-kuéra → ${pickLang(topic.name, lang)} → Simulador.`);

/* ---------- Explicación ---------- */

function explain(topic, lang, detailed, onlyFormulas) {
  const formulas = topic.formulas.map(item => `${item.f}  (${pickLang(item, lang).replace(/\.$/, '')})`);
  if (onlyFormulas) {
    return [`${L(lang, 'Fórmulas de', 'Fórmula-kuéra')} ${pickLang(topic.name, lang)}:`, ...formulas.map(line => `• ${line}`), '', mecCitation(topic, lang)].join('\n');
  }
  const parts = [
    `${pickLang(topic.name, lang)}: ${pickLang(topic.tagline, lang)}.`,
    ...pickLang(topic.summary, lang).map(line => `• ${line}`),
    '',
    `${L(lang, 'Fórmulas', 'Fórmula-kuéra')}:`,
    ...formulas.slice(0, detailed ? formulas.length : 3).map(line => `• ${line}`),
    '',
    `${L(lang, 'En la vida real', 'Tekove añetéme')}: ${pickLang(topic.example, lang)}`,
  ];
  if (detailed) {
    parts.push(`${L(lang, 'Error común', 'Javy ojehujepíva')}: ${pickLang(topic.mistake, lang)}`);
    if (topic.experiment) parts.push(`${L(lang, 'Experiencia para hacer', 'Experiencia rejapo hag̃ua')}: ${pickLang(topic.experiment, lang)}`);
  }
  parts.push('', mecCitation(topic, lang), whereToOpen(topic, lang));
  parts.push(L(lang, `¿Seguimos? Pedime "un ejercicio de ${pickLang(topic.name, lang).toLowerCase()}" o escribí tus datos y lo resolvemos.`,
    `¿Jasegi? Ejerure "peteĩ ejercicio ${pickLang(topic.name, lang).toLowerCase()}" térã ehai nde dato-kuéra ha jaresolve.`));
  return parts.join('\n');
}

/* ---------- Datos con unidades ---------- */

const NUMBER = /[-−]?\d+(?:[.,]\d+)*(?:\s*(?:[x×*·]\s*10\s*\^?\s*[-−]?\d+|e[-−]?\d+))?/g;
// [magnitud, unidad que sigue al número, factor al SI (o escala de temperatura)]
const UNITS = [
  ['a', /^(?:m\s*\/\s*s\s*(?:²|2|\^2)|metros? por segundo al cuadrado)/i, 1],
  ['v', /^(?:km\s*\/\s*h|kmh|km por hora|kilometros? por hora)/i, 1 / 3.6],
  ['v', /^(?:m\s*\/\s*s|metros? por segundo)/i, 1],
  ['rho', /^(?:kg\s*\/\s*m\s*(?:³|3)|kilogramos? por metro cubico)/i, 1],
  ['rho', /^g\s*\/\s*cm\s*(?:³|3)/i, 1000],
  ['k', /^n\s*\/\s*m\b/i, 1],
  ['c', /^j\s*\/\s*\(?\s*kg\s*[·.*]?\s*(?:°\s*c|k)\)?/i, 1],
  ['c', /^cal\s*\/\s*\(?\s*g\s*[·.*]?\s*°?\s*c\)?/i, 4186],
  ['vol', /^(?:m\s*(?:³|3)|metros? cubicos?)/i, 1],
  ['vol', /^(?:cm\s*(?:³|3)|centimetros? cubicos?)/i, 1e-6],
  ['vol', /^(?:l|litros?)\b/i, 1e-3],
  // Antes que kelvin: "2 kΩ" no es una temperatura.
  ['R', /^(?:k\s*Ω|kohms?|kiloohms?)/i, 1e3], ['R', /^(?:Ω|ohms?|ohmios?)/i, 1],
  ['T', /^(?:[°º]\s*c\b|grados? (?:celsius|centigrados?))/i, 'C'],
  ['T', /^(?:[°º]\s*f\b|grados? fahrenheit|fahrenheit)/i, 'F'],
  ['T', /^(?:k|kelvin)\b/i, 'K'],
  ['rpm', /^rpm\b/i, 1],
  ['f', /^khz\b/i, 1e3], ['f', /^(?:hz|hertz)\b/i, 1],
  ['P', /^(?:kw|kilowatts?)\b/i, 1e3], ['P', /^(?:w|watts?|vatios?)\b/i, 1],
  ['E', /^(?:kj|kilojoules?)\b/i, 1e3], ['E', /^(?:j|joules?|julios?)\b/i, 1],
  ['E', /^(?:kcal|kilocalorias?)\b/i, 4186], ['E', /^(?:cal|calorias?)\b/i, 4.186],
  ['p', /^kpa\b/i, 1e3], ['p', /^(?:pa|pascales?)\b/i, 1], ['p', /^(?:atm|atmosferas?)\b/i, 101300],
  ['q', /^(?:(?:μ|µ|u|micro)\s*c\b|microcoulombs?)/i, 1e-6], ['q', /^(?:nc|nanocoulombs?)\b/i, 1e-9], ['q', /^(?:c|coulombs?)\b/i, 1],
  ['C', /^(?:(?:μ|µ|u|micro)\s*f\b|microfaradios?)/i, 1e-6], ['C', /^faradios?\b/i, 1],
  ['V', /^kv\b/i, 1e3], ['V', /^(?:v|volts?|voltios?)\b/i, 1],
  ['I', /^(?:ma|miliamperios?)\b/i, 1e-3], ['I', /^(?:A\b|[Aa]mperios?|[Aa]mperes?)/, 1],
  ['F', /^kn\b/i, 1e3], ['F', /^(?:n|newtons?)\b/i, 1],
  ['m', /^(?:kg|kilos?|kilogramos?)\b/i, 1], ['m', /^(?:g|gramos?)\b/i, 1e-3], ['m', /^toneladas?\b/i, 1000],
  ['d', /^(?:km|kilometros?)\b/i, 1e3], ['d', /^(?:cm|centimetros?)\b/i, 1e-2], ['d', /^(?:mm|milimetros?)\b/i, 1e-3],
  ['d', /^(?:nm|nanometros?)\b/i, 1e-9], ['d', /^(?:m|metros?)\b/i, 1],
  ['t', /^(?:ms|milisegundos?)\b/i, 1e-3], ['t', /^(?:s|seg|segundos?)\b/i, 1], ['t', /^(?:min|minutos?)\b/i, 60], ['t', /^(?:h|hs|horas?)\b/i, 3600],
  ['T', /^grados?\b/i, 'C?'],
];

/** Números con unidad del texto, agrupados por magnitud y pasados al SI. */
export function extractQuantities(text) {
  const out = {};
  const source = String(text ?? '').replace(/−/g, '-');
  NUMBER.lastIndex = 0;
  for (let match = NUMBER.exec(source); match; match = NUMBER.exec(source)) {
    // "R1", "q2", "m/s2": el dígito pegado a una letra no es un dato.
    if (/[\p{L}_/]$/u.test(source.slice(0, match.index))) continue;
    const value = parseUserNumber(match[0]);
    if (!Number.isFinite(value)) continue;
    const rest = source.slice(match.index + match[0].length).replace(/^\s+/, '');
    for (const [dim, unit, factor] of UNITS) {
      const found = rest.match(unit);
      if (!found) continue;
      (out[dim] ??= []).push(typeof factor === 'number' ? value * factor : { value, scale: factor });
      break;
    }
  }
  return out;
}

/* ---------- Resolver con los datos del alumno ---------- */

const n = (value, d = 2) => fmt(value, d);
const step = (formula, subst, sym, value, unit, d = 2) => ({ formula, subst, result: `${sym} = ${n(value, d)}${unit ? ` ${unit}` : ''}` });
const toCelsius = ({ value, scale }) => (scale === 'F' ? (value - 32) * 5 / 9 : scale === 'K' ? value - 273.15 : value);
const asks = (s, re) => re.test(s);

const SOLVERS = {
  ohm(q, s) {
    const R = q.R ?? [], [V] = q.V ?? [], [I] = q.I ?? [];
    if (R.length >= 2) {
      const parallel = /paralel/.test(s);
      const req = parallel ? 1 / R.reduce((acc, r) => acc + 1 / r, 0) : R.reduce((acc, r) => acc + r, 0);
      const formula = parallel ? `1/R_{eq} = ${R.map((_, i) => `1/R_{${i + 1}}`).join(' + ')}` : `R_{eq} = ${R.map((_, i) => `R_{${i + 1}}`).join(' + ')}`;
      const subst = parallel ? `1/R_{eq} = ${R.map(r => `1/${n(r)}`).join(' + ')}` : `R_{eq} = ${R.map(r => n(r)).join(' + ')}`;
      const steps = [step(formula, subst, 'R_{eq}', req, 'Ω')];
      if (V !== undefined) steps.push(step('I = V / R_{eq}', `I = ${n(V)} / ${n(req)}`, 'I', V / req, 'A'));
      return steps;
    }
    const [r] = R;
    if (asks(s, /potencia/)) {
      if (V !== undefined && I !== undefined) return [step('P = V · I', `P = ${n(V)} · ${n(I)}`, 'P', V * I, 'W')];
      if (I !== undefined && r !== undefined) return [step('P = I² · R', `P = ${n(I)}² · ${n(r)}`, 'P', I * I * r, 'W')];
      if (V !== undefined && r !== undefined) return [step('P = V² / R', `P = ${n(V)}² / ${n(r)}`, 'P', V * V / r, 'W')];
    }
    if (V !== undefined && r !== undefined) return [step('I = V / R', `I = ${n(V)} / ${n(r)}`, 'I', V / r, 'A')];
    if (I !== undefined && r !== undefined) return [step('V = I · R', `V = ${n(I)} · ${n(r)}`, 'V', I * r, 'V')];
    if (V !== undefined && I !== undefined) return [step('R = V / I', `R = ${n(V)} / ${n(I)}`, 'R', V / I, 'Ω')];
    return null;
  },
  corriente(q) {
    const [Q] = q.q ?? [], [t] = q.t ?? [], [I] = q.I ?? [];
    if (Q !== undefined && t) return [step('I = q / t', `I = ${n(Q)} / ${n(t)}`, 'I', Q / t, 'A')];
    if (I !== undefined && t) return [step('q = I · t', `q = ${n(I)} · ${n(t)}`, 'q', I * t, 'C')];
    return SOLVERS.ohm(q, '');
  },
  mru(q, s) {
    const [d] = q.d ?? [], [v] = q.v ?? [], [t] = q.t ?? [];
    if (d !== undefined && t && !asks(s, /distancia|recorre|cuanto avanza/)) return [step('v = d / t', `v = ${n(d)} / ${n(t)}`, 'v', d / t, 'm/s')];
    if (v !== undefined && t) return [step('d = v · t', `d = ${n(v)} · ${n(t)}`, 'd', v * t, 'm')];
    if (d !== undefined && v) return [step('t = d / v', `t = ${n(d)} / ${n(v)}`, 't', d / v, 's')];
    return null;
  },
  mruv(q, s) {
    const vs = q.v ?? [], [a] = q.a ?? [], [t] = q.t ?? [], [d] = q.d ?? [];
    const v0 = /reposo/.test(s) ? 0 : vs[0] ?? 0;
    if (vs.length >= 2 && t) return [step('a = (v − v_{0}) / t', `a = (${n(vs[1])} − ${n(vs[0])}) / ${n(t)}`, 'a', (vs[1] - vs[0]) / t, 'm/s²')];
    if (a !== undefined && t) {
      const steps = [step('v = v_{0} + a · t', `v = ${n(v0)} + ${n(a)} · ${n(t)}`, 'v', v0 + a * t, 'm/s')];
      steps.push(step('d = v_{0} · t + ½ · a · t²', `d = ${n(v0)} · ${n(t)} + ½ · ${n(a)} · ${n(t)}²`, 'd', v0 * t + a * t * t / 2, 'm'));
      return steps;
    }
    if (a !== undefined && d !== undefined) return [step('v² = v_{0}² + 2 · a · d', `v² = ${n(v0)}² + 2 · ${n(a)} · ${n(d)}`, 'v', Math.sqrt(Math.max(0, v0 * v0 + 2 * a * d)), 'm/s')];
    if (vs.length >= 2 && d !== undefined) return [step('a = (v² − v_{0}²) / (2 · d)', `a = (${n(vs[1])}² − ${n(vs[0])}²) / (2 · ${n(d)})`, 'a', (vs[1] ** 2 - vs[0] ** 2) / (2 * d), 'm/s²')];
    return null;
  },
  'caida-libre'(q, s) {
    const [t] = q.t ?? [], [h] = q.d ?? [];
    if (t) {
      const steps = [];
      if (!asks(s, /altura|distancia|cuanto cae|metros/) || asks(s, /velocidad|rapidez/)) steps.push(step('v = g · t', `v = 9,8 · ${n(t)}`, 'v', G * t, 'm/s'));
      if (!asks(s, /velocidad|rapidez/) || asks(s, /altura|distancia|cuanto cae/)) steps.push(step('h = ½ · g · t²', `h = ½ · 9,8 · ${n(t)}²`, 'h', G * t * t / 2, 'm'));
      return steps;
    }
    if (h !== undefined) return [step('t = √(2h / g)', `t = √(2 · ${n(h)} / 9,8)`, 't', Math.sqrt(2 * h / G), 's'), step('v = √(2 · g · h)', `v = √(2 · 9,8 · ${n(h)})`, 'v', Math.sqrt(2 * G * h), 'm/s')];
    return null;
  },
  newton(q, s) {
    const [F] = q.F ?? [], [m] = q.m ?? [], [a] = q.a ?? [];
    if (m !== undefined && a !== undefined) return [step('F = m · a', `F = ${n(m)} · ${n(a)}`, 'F', m * a, 'N')];
    if (F !== undefined && m) return [step('a = F / m', `a = ${n(F)} / ${n(m)}`, 'a', F / m, 'm/s²')];
    if (F !== undefined && a) return [step('m = F / a', `m = ${n(F)} / ${n(a)}`, 'm', F / a, 'kg')];
    if (m !== undefined && asks(s, /peso/)) return [step('P = m · g', `P = ${n(m)} · 9,8`, 'P', m * G, 'N')];
    return null;
  },
  equilibrio(q) {
    const F = q.F ?? [], d = q.d ?? [];
    if (F.length >= 1 && d.length >= 2) return [step('F_{1} · d_{1} = F_{2} · d_{2}', `F_{2} = ${n(F[0])} · ${n(d[0])} / ${n(d[1])}`, 'F_{2}', F[0] * d[0] / d[1], 'N')];
    if (F.length >= 1 && d.length === 1) return [step('M = F · d', `M = ${n(F[0])} · ${n(d[0])}`, 'M', F[0] * d[0], 'N·m')];
    return null;
  },
  elasticidad(q) {
    const [F] = q.F ?? [], [k] = q.k ?? [], [x] = q.d ?? [];
    if (k !== undefined && x !== undefined) return [step('F = k · x', `F = ${n(k)} · ${n(x, 3)}`, 'F', k * x, 'N')];
    if (F !== undefined && x) return [step('k = F / x', `k = ${n(F)} / ${n(x, 3)}`, 'k', F / x, 'N/m')];
    if (F !== undefined && k) return [step('x = F / k', `x = ${n(F)} / ${n(k)}`, 'x', F / k, 'm', 3)];
    return null;
  },
  energia(q, s) {
    const [m] = q.m ?? [], [v] = q.v ?? [], [h] = q.d ?? [], [F] = q.F ?? [], [E] = q.E ?? [], [t] = q.t ?? [], [P] = q.P ?? [];
    if (asks(s, /potencia/) && E !== undefined && t) return [step('P = W / t', `P = ${n(E)} / ${n(t)}`, 'P', E / t, 'W')];
    if (P !== undefined && t) return [step('W = P · t', `W = ${n(P)} · ${n(t)}`, 'W', P * t, 'J')];
    if (F !== undefined && h !== undefined) return [step('W = F · d', `W = ${n(F)} · ${n(h)}`, 'W', F * h, 'J')];
    const steps = [];
    if (m !== undefined && v !== undefined && !asks(s, /potencial/)) steps.push(step('E_{c} = ½ · m · v²', `E_{c} = ½ · ${n(m)} · ${n(v)}²`, 'E_{c}', m * v * v / 2, 'J'));
    if (m !== undefined && h !== undefined && !asks(s, /cinetica/)) steps.push(step('E_{p} = m · g · h', `E_{p} = ${n(m)} · 9,8 · ${n(h)}`, 'E_{p}', m * G * h, 'J'));
    return steps.length ? steps : null;
  },
  'cantidad-movimiento'(q) {
    const [m] = q.m ?? [], [v] = q.v ?? [], [F] = q.F ?? [], [t] = q.t ?? [];
    if (m !== undefined && v !== undefined) return [step('p = m · v', `p = ${n(m)} · ${n(v)}`, 'p', m * v, 'kg·m/s')];
    if (F !== undefined && t !== undefined) return [step('I = F · Δt', `I = ${n(F)} · ${n(t)}`, 'I', F * t, 'N·s')];
    return null;
  },
  gravitacion(q) {
    const m = q.m ?? [], [d] = q.d ?? [];
    if (m.length >= 2 && d) return [step('F = G · m_{1} · m_{2} / d²', `F = 6,67 × 10⁻¹¹ · ${n(m[0])} · ${n(m[1])} / ${n(d)}²`, 'F', G_UNIV * m[0] * m[1] / (d * d), 'N')];
    return null;
  },
  hidrostatica(q, s) {
    const [rho0] = q.rho ?? [], [h] = q.d ?? [];
    const rho = rho0 ?? (/agua|pileta|lago|rio|mar/.test(s) || !q.rho ? 1000 : undefined);
    if (h !== undefined && rho) return [step('P = ρ · g · h', `P = ${n(rho)} · 9,8 · ${n(h)}`, 'P', rho * G * h, 'Pa')];
    return null;
  },
  arquimedes(q) {
    const [vol] = q.vol ?? [], [rho0] = q.rho ?? [];
    const rho = rho0 ?? 1000;
    if (vol !== undefined) return [step('E = ρ_{líq} · g · V_{sum}', `E = ${n(rho)} · 9,8 · ${n(vol, 4)}`, 'E', rho * G * vol, 'N')];
    return null;
  },
  hidrodinamica(q) {
    const [vol] = q.vol ?? [], [t] = q.t ?? [];
    if (vol !== undefined && t) return [step('Q = V / t', `Q = ${n(vol, 4)} / ${n(t)}`, 'Q', vol / t, 'm³/s', 5)];
    return null;
  },
  termometria(q) {
    const [first] = q.T ?? [];
    if (!first) return null;
    // "grados" sin escala se toma como Celsius.
    const scale = first.scale === 'C?' ? 'C' : first.scale;
    const c = toCelsius({ ...first, scale });
    const steps = [];
    if (scale === 'F') steps.push(step('T_{C} = (T_{F} − 32) / 1,8', `T_{C} = (${n(first.value)} − 32) / 1,8`, 'T_{C}', c, '°C'));
    if (scale === 'K') steps.push(step('T_{C} = T_{K} − 273', `T_{C} = ${n(first.value)} − 273`, 'T_{C}', c, '°C'));
    if (scale !== 'F') steps.push(step('T_{F} = 1,8 · T_{C} + 32', `T_{F} = 1,8 · ${n(c)} + 32`, 'T_{F}', c * 1.8 + 32, '°F'));
    if (scale !== 'K') steps.push(step('T_{K} = T_{C} + 273', `T_{K} = ${n(c)} + 273`, 'T_{K}', c + 273, 'K'));
    return steps;
  },
  calorimetria(q, s) {
    const [m] = q.m ?? [], [c0] = q.c ?? [], [Q] = q.E ?? [];
    const temps = (q.T ?? []).map(item => toCelsius({ ...item, scale: item.scale === 'C?' ? 'C' : item.scale }));
    // Sin calor específico en el texto se usa el del agua.
    const c = c0 ?? (/agua/.test(s) || !q.c ? 4186 : undefined);
    const dT = temps.length >= 2 ? temps[1] - temps[0] : temps[0];
    if (m !== undefined && c && dT !== undefined && Q === undefined) return [step('Q = m · c · ΔT', `Q = ${n(m)} · ${n(c)} · ${n(dT)}`, 'Q', m * c * dT, 'J')];
    if (Q !== undefined && m && c) return [step('ΔT = Q / (m · c)', `ΔT = ${n(Q)} / (${n(m)} · ${n(c)})`, 'ΔT', Q / (m * c), '°C')];
    return null;
  },
  'procesos-gases'(q) {
    const p = q.p ?? [], vol = q.vol ?? [];
    if (p.length >= 1 && vol.length >= 2) return [step('p_{1} · V_{1} = p_{2} · V_{2}', `p_{2} = ${n(p[0])} · ${n(vol[0], 4)} / ${n(vol[1], 4)}`, 'p_{2}', p[0] * vol[0] / vol[1], 'Pa')];
    if (p.length >= 2 && vol.length >= 1) return [step('p_{1} · V_{1} = p_{2} · V_{2}', `V_{2} = ${n(p[0])} · ${n(vol[0], 4)} / ${n(p[1])}`, 'V_{2}', p[0] * vol[0] / p[1], 'm³', 5)];
    return null;
  },
  coulomb(q) {
    const charges = q.q ?? [], [d] = q.d ?? [];
    if (charges.length >= 2 && d) return [step('F = k · q_{1} · q_{2} / d²', `F = 9 × 10⁹ · ${n(charges[0])} · ${n(charges[1])} / ${n(d)}²`, 'F', K * Math.abs(charges[0] * charges[1]) / (d * d), 'N')];
    if (charges.length === 1 && d) return SOLVERS['campo-electrico'](q);
    return null;
  },
  'campo-electrico'(q) {
    const [Q] = q.q ?? [], [d] = q.d ?? [], [F] = q.F ?? [];
    if (F !== undefined && Q) return [step('E = F / q', `E = ${n(F)} / ${n(Q)}`, 'E', F / Q, 'N/C')];
    if (Q !== undefined && d) return [step('E = k · q / d²', `E = 9 × 10⁹ · ${n(Q)} / ${n(d)}²`, 'E', K * Math.abs(Q) / (d * d), 'N/C')];
    return null;
  },
  'potencial-electrico'(q) {
    const [Q] = q.q ?? [], [d] = q.d ?? [];
    if (Q !== undefined && d) return [step('V = k · q / d', `V = 9 × 10⁹ · ${n(Q)} / ${n(d)}`, 'V', K * Q / d, 'V')];
    return null;
  },
  condensadores(q) {
    const [C] = q.C ?? [], [V] = q.V ?? [];
    if (C !== undefined && V !== undefined) return [step('Q = C · V', `Q = ${n(C)} · ${n(V)}`, 'Q', C * V, 'C'), step('E = ½ · C · V²', `E = ½ · ${n(C)} · ${n(V)}²`, 'E', C * V * V / 2, 'J')];
    return null;
  },
  ondas(q) {
    const [f] = q.f ?? [], [lambda] = q.d ?? [], [v] = q.v ?? [], [T] = q.t ?? [];
    if (f !== undefined && lambda !== undefined) return [step('v = λ · f', `v = ${n(lambda)} · ${n(f)}`, 'v', lambda * f, 'm/s')];
    if (v !== undefined && f) return [step('λ = v / f', `λ = ${n(v)} / ${n(f)}`, 'λ', v / f, 'm', 3)];
    if (v !== undefined && lambda) return [step('f = v / λ', `f = ${n(v)} / ${n(lambda)}`, 'f', v / lambda, 'Hz')];
    if (T) return [step('f = 1 / T', `f = 1 / ${n(T)}`, 'f', 1 / T, 'Hz')];
    return null;
  },
  acustica(q, s) {
    const [t] = q.t ?? [], [f] = q.f ?? [], [d] = q.d ?? [];
    if (t && /eco/.test(s)) return [step('d = v · t / 2', `d = 340 · ${n(t)} / 2`, 'd', V_SOUND * t / 2, 'm')];
    if (f) return [step('λ = v / f', `λ = 340 / ${n(f)}`, 'λ', V_SOUND / f, 'm', 3)];
    if (d !== undefined) return [step('t = d / v', `t = ${n(d)} / 340`, 't', d / V_SOUND, 's', 3)];
    return null;
  },
  'movimiento-circular'(q) {
    const [rpm] = q.rpm ?? [], [T] = q.t ?? [], [v] = q.v ?? [], [r] = q.d ?? [];
    if (rpm) return [step('f = rpm / 60', `f = ${n(rpm)} / 60`, 'f', rpm / 60, 'Hz'), step('T = 1 / f', `T = 60 / ${n(rpm)}`, 'T', 60 / rpm, 's', 3), step('ω = 2π · f', `ω = 2π · ${n(rpm / 60)}`, 'ω', 2 * Math.PI * rpm / 60, 'rad/s')];
    if (v !== undefined && r) return [step('a_{c} = v² / r', `a_{c} = ${n(v)}² / ${n(r)}`, 'a_{c}', v * v / r, 'm/s²')];
    if (T) return [step('f = 1 / T', `f = 1 / ${n(T)}`, 'f', 1 / T, 'Hz'), step('ω = 2π / T', `ω = 2π / ${n(T)}`, 'ω', 2 * Math.PI / T, 'rad/s')];
    return null;
  },
  luz(q) {
    const [d] = q.d ?? [];
    if (d !== undefined) return [step('t = d / c', `t = ${n(d)} / (3 × 10⁸)`, 't', d / C_LIGHT, 's')];
    return null;
  },
  cuantica(q) {
    const [f] = q.f ?? [], [lambda] = q.d ?? [];
    if (f) return [step('E = h · f', `E = 6,63 × 10⁻³⁴ · ${n(f)}`, 'E', H * f, 'J')];
    if (lambda) return [step('E = h · c / λ', `E = 6,63 × 10⁻³⁴ · 3 × 10⁸ / ${n(lambda)}`, 'E', H * C_LIGHT / lambda, 'J')];
    return null;
  },
};

function solve(topic, text, lang) {
  const solver = SOLVERS[topic.id];
  if (!solver) return null;
  const quantities = extractQuantities(text);
  if (!Object.keys(quantities).length) return null;
  const steps = solver(quantities, normalize(text));
  if (!steps?.length) return null;
  const lines = [L(lang, `Lo resolvemos como en el cuaderno (${pickLang(topic.name, lang)}):`, `Jaresolve cuaderno-pe ojapoháicha (${pickLang(topic.name, lang)}):`)];
  steps.forEach((item, index) => {
    if (steps.length > 1) lines.push('', `${index + 1})`);
    lines.push(`${L(lang, 'Fórmula', 'Fórmula')}: ${item.formula}`, `${L(lang, 'Reemplazo', 'Reemplazo')}: ${item.subst}`, `${L(lang, 'Resultado', 'Resultado')}: ${item.result}`);
  });
  lines.push('', L(lang, 'Revisá que cada dato esté en la unidad del SI (m, kg, s, …) antes de reemplazar.', 'Ehecha káda dato oĩpa SI unidad-pe (m, kg, s, …) remoĩ mboyve.'));
  lines.push(mecCitation(topic, lang));
  return lines.join('\n');
}

/* ---------- Ejercicios generados ---------- */

const randomSeed = () => Math.floor(Math.random() * 1e9) + 1;

function exerciseText(topic, exercise, lang) {
  const data = exercise.data.map(item => `${item.sym} = ${item.value}${item.unit ? ` ${item.unit}` : ''}`).join(' ; ');
  return [
    L(lang, `Ejercicio de ${pickLang(topic.name, lang)}:`, `Ejercicio ${pickLang(topic.name, lang)}:`),
    pickLang(exercise.prompt, lang),
    `${L(lang, 'Datos', 'Dato-kuéra')}: ${data}`,
    L(lang, `Calculá ${exercise.ask}${exercise.unit ? ` (en ${exercise.unit})` : ''} y escribime solo el número. Si te trabás, escribí "pista" o "resolución".`,
      `Ecalcula ${exercise.ask}${exercise.unit ? ` (${exercise.unit}-pe)` : ''} ha ehai chéve número año. Rejejokóramo, ehai "pista" térã "resolución".`),
  ].join('\n');
}

function newExercise(topic, lang) {
  const genId = topic.practice[Math.floor(Math.random() * topic.practice.length)];
  const seed = randomSeed();
  const exercise = generateExercise(genId, seed);
  if (!exercise) return null;
  return { message: exerciseText(topic, exercise, lang), widget: { type: 'topic-exercise', topicId: topic.id, genId, seed } };
}

function resolution(exercise, lang) {
  return [`${L(lang, 'Resolución', 'Resolución')}:`, ...exercise.steps.map((line, index) => `${index + 1}. ${line}`)].join('\n');
}

// Respuesta del alumno al ejercicio que quedó abierto en la conversación.
function followExercise(open, text, lang) {
  const topic = topicById(open.topicId);
  const exercise = topic && generateExercise(open.genId, open.seed);
  if (!exercise) return null;
  const s = normalize(text);
  const keep = { widget: open };
  const done = { widget: { type: 'topic', topicId: topic.id } };
  if (/^(?:otro|otra|otro ejercicio|dame otro|siguiente|ambue)\b/.test(s)) return newExercise(topic, lang);
  if (/\bpista\b|ayuda|no se como/.test(s)) return { message: `${L(lang, 'Pista', 'Pista')}: ${pickLang(exercise.hint, lang)}\n${L(lang, 'Fórmula', 'Fórmula')}: ${exercise.formula}`, ...keep };
  if (/resolucion|solucion|como se resuelve|me rindo|respuesta correcta|mostrame/.test(s)) {
    return { message: `${resolution(exercise, lang)}\n\n${L(lang, '¿Otro? Escribí "otro".', '¿Ambue? Ehai "otro".')}`, ...done };
  }
  if (!/^\s*(?:(?:es|da|me da|me dio|resultado|respuesta|creo que|ha'?e)\s*)?[-−+]?\d/.test(s)) return null;
  const verdict = checkAnswer(exercise, text);
  if (!verdict.valid) return null;
  if (verdict.correct) {
    return { message: `${L(lang, `¡Correcto! ${exercise.ask} = ${fmt(exercise.answer, exercise.decimals)} ${exercise.unit}.`, `¡Iporã! ${exercise.ask} = ${fmt(exercise.answer, exercise.decimals)} ${exercise.unit}.`)}\n\n${resolution(exercise, lang)}\n\n${L(lang, '¿Otro? Escribí "otro".', '¿Ambue? Ehai "otro".')}`, ...done };
  }
  const why = verdict.unitSlip
    ? L(lang, 'Revisá las unidades: tu número difiere por un factor de 10, 100 o 1000.', 'Ehecha unidad: nde número iñambue 10, 100 térã 1000 rehe.')
    : verdict.signSlip
      ? L(lang, 'Revisá el signo: el número está bien, pero el signo no.', 'Ehecha signo: número oĩ porã, signo katu nahániri.')
      : L(lang, 'Todavía no.', 'Ndaha’éi gueteri.');
  return { message: `${why} ${L(lang, 'Pista', 'Pista')}: ${pickLang(exercise.hint, lang)}\n${L(lang, 'Probá de nuevo, o escribí "resolución".', 'Eñeha’ã jey, térã ehai "resolución".')}`, ...keep };
}

/* ---------- Lista de temas ---------- */

function topicList(lang) {
  const lines = [L(lang, 'Temas de Física de la Educación Media (programa del MEC):', 'Educación Media Física tema-kuéra (MEC programa):')];
  for (const course of COURSES) {
    const names = courseTopicIds(course.id).map(id => pickLang(topicById(id)?.name, lang)).filter(Boolean);
    lines.push(`• ${pickLang(course.name, lang)} (${pickLang(course.planName, lang)}): ${names.join(', ')}.`);
  }
  lines.push('', L(lang, 'Preguntame por cualquiera ("¿qué es la ley de Ohm?", "dame un ejercicio de MRU") o abrilos en Temas, con simulador y práctica.',
    'Eporandu chéve oimeraẽre ("¿mba’épa ley de Ohm?", "eme’ẽ peteĩ ejercicio MRU") térã eipe’a Tema-kuéra-pe, simulador ha práctica reheve.'));
  lines.push(`${L(lang, 'Fuente', 'Fuente')}: ${SOURCES.A.resolution} · ${pickLang(SOURCES.A.short, lang)}; ${pickLang(SOURCES.B.short, lang)}; ${pickLang(SOURCES.C.short, lang)}.`);
  return lines.join('\n');
}

/* ---------- Entrada principal ---------- */

/**
 * Respuesta del tutor sin internet para los temas del MEC, o null si la
 * pregunta no es de esos temas (entonces responde el motor de tiro parabólico).
 * `widget` nunca se dibuja: guarda el tema (y el ejercicio abierto) en la
 * conversación para poder seguirla.
 */
export function topicTutorAnswer(text, history = [], language = 'gn-jopara') {
  const lang = language === 'es' ? 'es' : 'gn-jopara';
  const s = normalize(text);
  if (!s) return null;
  const lastTutor = [...(history ?? [])].reverse().find(item => item?.role === 'tutor' || item?.role === 'assistant');
  const open = lastTutor?.widget?.type === 'topic-exercise' ? lastTutor.widget : null;
  if (open) {
    const reply = followExercise(open, text, lang);
    if (reply) return reply;
  }
  if (/(?:que|cuales|mba.?e) temas|temario|lista de temas|programa (?:del mec|de fisica)|tema-?kuera|que (?:puedo|podes|se puede) (?:estudiar|aprender|ensenar)/.test(s)) {
    return { message: topicList(lang), widget: { type: 'topic' } };
  }
  const previous = lastTutor?.widget?.type === 'topic' && lastTutor.widget.topicId ? topicById(lastTutor.widget.topicId) : null;
  const topic = detectTopic(text) ?? (previous && /^(?:si|dale|otro|otra|un ejercicio|dame un ejercicio|ejercicio|formulas?|y la formula|mas|contame mas|pista)\b/.test(s) ? previous : null);
  if (!topic) return null;
  const widget = { type: 'topic', topicId: topic.id };
  if (/practic|ejercicio|problema para|ponme a prueba|evaluame|desafiame|eme.?e/.test(s) && !Object.keys(extractQuantities(text)).length) {
    const exercise = newExercise(topic, lang);
    if (exercise) return exercise;
  }
  const solved = solve(topic, text, lang);
  if (solved) return { message: solved, widget };
  const detailed = /completo|completa|detallad|paso a paso|desde cero|todo sobre|explica(?:me)? bien|mas detalle|resumen/.test(s);
  const onlyFormulas = /formula/.test(s) && !/explica|que es|que son/.test(s);
  return { message: explain(topic, lang, detailed, onlyFormulas), widget };
}
