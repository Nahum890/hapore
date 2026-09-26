// Notación de libro de texto (como en Bonjorno) en vez de notación de
// programación: "v0 * cos(ángulo)" → "v₀ · cos θ", "sen(2 * ángulo)" →
// "sen 2θ", "(2 * g)" → "(2g)". Los datos no se reescriben: se traducen al
// mostrarlos. Los subíndices se marcan como _{...} para que la interfaz los
// dibuje con <sub> y el texto plano (PDF) use caracteres Unicode.

const SUBSCRIPT_DIGITS = { 0: '₀', 1: '₁', 2: '₂', 3: '₃', 4: '₄', 5: '₅', 6: '₆', 7: '₇', 8: '₈', 9: '₉', x: 'ₓ' };

const TRIG = '(sen|cos|tan|tg)';
// \b de JavaScript no considera letras acentuadas ("á"), así que se usan
// límites de palabra Unicode.
const word = w => new RegExp(`(?<![\\p{L}\\d_])${w}(?![\\p{L}\\d_])`, 'gu');

/** Traduce a notación de libro, dejando subíndices marcados como _{...}. */
export function toTextbookMarked(input) {
  let text = String(input ?? '');
  // θ dentro de funciones trigonométricas y en expresiones con ángulo.
  text = text.replace(new RegExp(`(?<![\\p{L}])${TRIG}(²?)\\(([^()]*)\\)`, 'gu'), (_, fn, square, inner) => {
    const arg = inner.replace(word('ángulo'), 'θ').replace(/(\d)\s*\*\s*θ/g, '$1θ').trim();
    return `${fn}${square} ${arg}`;
  });
  text = text.replace(word('ángulo_max'), 'θ_{máx}');
  text = text.replace(/(\d)\s*\*\s*ángulo(?![\p{L}\d_])/gu, '$1θ');
  // Variables con subíndice.
  text = text.replace(/\bv0x\b/g, 'v_{0x}').replace(/\bv0y\b/g, 'v_{0y}').replace(/\bv0\b/g, 'v_{0}');
  text = text.replace(/\bvx\b/g, 'v_{x}').replace(/\bvy\b/g, 'v_{y}');
  text = text.replace(/\bx0\b/g, 'x_{0}').replace(/\by0\b/g, 'y_{0}');
  text = text.replace(/\bHmax\b/g, 'H_{máx}').replace(/\bR_A\b/g, 'R_{A}');
  // Multiplicación: 0,5 · g → ½ g ; 2 * g → 2g ; resto → ·
  text = text.replace(/\b0[,.]5\s*\*\s*/g, '½ ');
  text = text.replace(/(\b\d+)\s*\*\s*(g|t|θ)(?![\w_])/g, '$1$2');
  text = text.replace(/\s*\*\s*/g, ' · ');
  return text;
}

/** Texto plano con Unicode (para PDF o lugares sin HTML). */
export function toTextbookPlain(input) {
  return toTextbookMarked(input).replace(/_\{([^}]*)\}/g, (_, sub) => (
    /^[0-9xy]+$/.test(sub) ? [...sub].map(char => SUBSCRIPT_DIGITS[char] ?? char).join('') : sub
  ));
}

/** Parte un texto marcado en trozos { text } y { sub } para dibujarlo. */
export function mathSegments(marked) {
  const segments = [];
  const pattern = /_\{([^}]*)\}/g;
  let last = 0;
  for (let match = pattern.exec(marked); match; match = pattern.exec(marked)) {
    if (match.index > last) segments.push({ text: marked.slice(last, match.index) });
    segments.push({ sub: match[1] });
    last = match.index + match[0].length;
  }
  if (last < marked.length) segments.push({ text: marked.slice(last) });
  return segments;
}

function stripOuterParens(expr) {
  let text = expr.trim();
  while (text.startsWith('(') && text.endsWith(')')) {
    let depth = 0, wraps = true;
    for (let index = 0; index < text.length; index += 1) {
      if (text[index] === '(') depth += 1;
      if (text[index] === ')') depth -= 1;
      if (depth === 0 && index < text.length - 1) { wraps = false; break; }
    }
    if (!wraps) break;
    text = text.slice(1, -1).trim();
  }
  return text;
}

/** Si la expresión es una división de primer nivel devuelve { num, den }. */
export function splitFraction(expr) {
  let depth = 0, slash = -1;
  for (let index = 0; index < expr.length; index += 1) {
    const char = expr[index];
    if (char === '(') depth += 1;
    else if (char === ')') depth -= 1;
    else if (char === '/' && depth === 0) {
      if (slash !== -1) return null;
      slash = index;
    }
  }
  if (slash === -1) return null;
  const num = stripOuterParens(expr.slice(0, slash));
  const den = stripOuterParens(expr.slice(slash + 1));
  return num && den ? { num, den } : null;
}

/** Divide una fórmula en partes separadas por =, →, ≈ y ; para poder
 * dibujar cada lado (y sus fracciones) por separado. */
export function formulaParts(marked) {
  return marked.split(/(\s*(?:=|→|≈|;)\s*)/).filter(part => part !== '');
}
