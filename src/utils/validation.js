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
 * simple usado como multiplicación y los guiones bajos internos del
 * glosario canónico (V_resultante, V_dron), colapsando subíndices LaTeX
 * de una sola letra (v_x -> vx).
 */
export function sanitizeMarkup(text) {
  return String(text ?? '')
    .replace(/[$\\`{}]/g, '')
    .replace(/([A-Za-z0-9])_([A-Za-z0-9])(?![A-Za-z0-9])/g, '$1$2')
    .replace(/(^|\s)_+/g, '$1')
    .replace(/_+(\s|$|[.,;:!?])/g, '$1')
    .replace(/\*\*/g, '*')
    .trim();
}
