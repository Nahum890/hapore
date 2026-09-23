const CODE_PREFIX = 'GP';
const CODE_PATTERN = /^GP(\d{2})([A-Z])(\d{2})$/;

const BITMASK_BY_SUBTEMA = {
  parabolico: 1,
  cinematica: 2,
  vectores: 4,
  hooke: 8,
};

const BASE36_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const TEMA_MATCHERS = [
  { id: 'parabolico', match: (tema) => tema.includes('parabolico') },
  { id: 'cinematica', match: (tema) => tema.includes('cinematica') },
  { id: 'vectores', match: (tema) => tema.includes('vectores') },
  { id: 'hooke', match: (tema) => tema.includes('hooke') },
];

/**
 * Compila la configuración del docente en un código alfanumérico compacto
 * (estilo Base64 comprimido: GP + flashcards + máscara de subtemas + ejercicios).
 * El código se decodifica localmente: 100% modo avión, sin base de datos.
 */
export function encodeClassConfig({ flashcards = 10, subtemas = [], ejercicios = 3 } = {}) {
  const clampedFlashcards = Math.min(20, Math.max(5, Math.floor(Number(flashcards) || 5)));
  const clampedEjercicios = Math.min(10, Math.max(1, Math.floor(Number(ejercicios) || 1)));
  const enabled = subtemas.length ? subtemas : Object.keys(BITMASK_BY_SUBTEMA);
  let mask = 0;
  for (const subtema of enabled) {
    mask |= BITMASK_BY_SUBTEMA[subtema] ?? 0;
  }
  const maskChar = BASE36_ALPHABET[mask] ?? BASE36_ALPHABET[15];
  const flashcardsPart = String(clampedFlashcards).padStart(2, '0');
  const ejerciciosPart = String(clampedEjercicios).padStart(2, '0');
  return `${CODE_PREFIX}${flashcardsPart}${maskChar}${ejerciciosPart}`;
}

export function decodeClassConfig(code) {
  const match = CODE_PATTERN.exec(String(code ?? '').trim().toUpperCase());
  if (!match) return null;
  const flashcards = Math.min(20, Math.max(5, parseInt(match[1], 10)));
  const mask = BASE36_ALPHABET.indexOf(match[2]);
  const ejercicios = Math.min(10, Math.max(1, parseInt(match[3], 10)));
  if (mask < 0) return null;
  const subtemas = TEMA_MATCHERS.filter((tema) => (mask & BITMASK_BY_SUBTEMA[tema.id]) !== 0).map(
    (tema) => tema.id,
  );
  if (!subtemas.length) return null;
  return { flashcards, subtemas, ejercicios };
}

/**
 * Filtra los temas disponibles según los subtemas habilitados por el docente.
 */
export function temaMatchesSubtemas(tema, subtemas) {
  if (!subtemas?.length) return true;
  const normalized = String(tema ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return TEMA_MATCHERS.some(
    (matcher) => subtemas.includes(matcher.id) && matcher.match(normalized),
  );
}
