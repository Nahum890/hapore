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
    .replace(/\\frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, '($1) / ($2)')
    .replace(/\\sqrt\s*\{([^{}]+)\}/g, '√($1)')
    .replace(/\\(?:times|cdot)\b/g, '*')
    .replace(/\\(?:theta|alpha|beta|Delta|delta|pi)\b/g, (name) => ({
      '\\theta': 'θ', '\\alpha': 'α', '\\beta': 'β',
      '\\Delta': 'Δ', '\\delta': 'δ', '\\pi': 'π',
    })[name] ?? name)
    .replace(/\\(?:text|mathrm)\s*\{([^{}]+)\}/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/[$\\`{}]/g, '')
    .replace(/([A-Za-z0-9])_([A-Za-z0-9])(?![A-Za-z0-9])/g, '$1$2')
    .replace(/(^|\s)_+/g, '$1')
    .replace(/_+(\s|$|[.,;:!?])/g, '$1')
    .replace(/\*\*/g, '')
    .trim();
}
