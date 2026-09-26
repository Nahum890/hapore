const CODE_PREFIX = 'GP';
// El bloque de máscara es una letra (A-P, hasta 4 bits) o dos dígitos: el
// mismo encodeClassConfig produce una letra siempre que el mask cabe en 15.
const CODE_PATTERN = /^GP(\d{2})(\d{2}|[A-P])(\d{2})$/;

// Único tema (Movimiento Parabólico); lo que el docente elige es qué
// situaciones del simulador quedan habilitadas para sus estudiantes.
const BITMASK_BY_SCENARIO = {
  dron: 1,
  basketball: 2,
  wall: 4,
};

const MASK_LETTERS = 'ABCDEFGHIJKLMNOP';

const SCENARIO_IDS = Object.keys(BITMASK_BY_SCENARIO);

/**
 * Compila la configuración del docente en un código alfanumérico compacto
 * (estilo Base64 comprimido: GP + flashcards + máscara de situaciones + ejercicios).
 * El código se decodifica localmente: 100% modo avión, sin base de datos.
 */
export function encodeClassConfig({ flashcards = 10, subtemas = [], ejercicios = 3 } = {}) {
  const clampedFlashcards = Math.min(20, Math.max(5, Math.floor(Number(flashcards) || 5)));
  const clampedEjercicios = Math.min(10, Math.max(1, Math.floor(Number(ejercicios) || 1)));
  const enabled = Array.isArray(subtemas) && subtemas.length ? subtemas : SCENARIO_IDS;
  let mask = 0;
  for (const scenario of enabled) {
    mask |= BITMASK_BY_SCENARIO[scenario] ?? 0;
  }
  const maskChar = mask <= 15 ? MASK_LETTERS[mask] : String(mask).padStart(2, '0');
  const flashcardsPart = String(clampedFlashcards).padStart(2, '0');
  const ejerciciosPart = String(clampedEjercicios).padStart(2, '0');
  return `${CODE_PREFIX}${flashcardsPart}${maskChar}${ejerciciosPart}`;
}

export function decodeClassConfig(code) {
  const text = String(code ?? '').trim().toUpperCase();
  const match = CODE_PATTERN.exec(text);
  if (!match) return null;
  const flashcards = parseInt(match[1], 10);
  const mask = /^\d{2}$/.test(match[2]) ? Number(match[2]) : MASK_LETTERS.indexOf(match[2]);
  const ejercicios = parseInt(match[3], 10);
  if (flashcards < 5 || flashcards > 20 || ejercicios < 1 || ejercicios > 10 || mask <= 0 || mask > 7) return null;
  const subtemas = SCENARIO_IDS.filter((scenario) => (mask & BITMASK_BY_SCENARIO[scenario]) !== 0);
  if (!subtemas.length) return null;
  return { flashcards, subtemas, ejercicios };
}

/**
 * ¿Este ejercicio pertenece a una de las situaciones habilitadas por el
 * docente? Sin configuración (subtemas vacío), quedan todas habilitadas.
 */
export function scenarioMatchesConfig(scenario, subtemas) {
  if (!subtemas?.length) return true;
  return subtemas.includes(scenario);
}

export function selectClassExercises(exercises, config) {
  if (!config) return exercises;
  const matching = exercises.filter(item => scenarioMatchesConfig(item.scenario, config.subtemas));
  const scenarios = [...new Set(matching.map(item => item.scenario))];
  const queues = scenarios.map(scenario => matching.filter(item => item.scenario === scenario));
  const selected = [];
  while (selected.length < config.ejercicios && queues.some(queue => queue.length)) {
    for (const queue of queues) {
      if (queue.length && selected.length < config.ejercicios) selected.push(queue.shift());
    }
  }
  return selected;
}
