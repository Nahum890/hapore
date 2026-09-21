export function isPositiveNumber(value) {
  const num = typeof value === 'number' ? value : Number(String(value).replace(',', '.'));
  return Number.isFinite(num) && num > 0;
}

export function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Elimina marcadores de formato crudo (LaTeX, énfasis markdown) de textos
 * del tutor para que se lean legibles en pantalla. Conserva el asterisco
 * simple usado como multiplicación en las fórmulas de texto plano.
 */
export function sanitizeMarkup(text) {
  return String(text ?? '')
    .replace(/[$\\`_]/g, '')
    .replace(/\*\*/g, '*')
    .trim();
}
