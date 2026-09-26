import { formulaParts, mathSegments, splitFraction, toTextbookMarked, toTextbookPlain } from '../utils/mathText.js';

function Segments({ marked }) {
  return mathSegments(marked).map((segment, index) => (
    segment.sub !== undefined ? <sub key={index}>{segment.sub}</sub> : <span key={index}>{segment.text}</span>
  ));
}

/** Texto corrido (pistas, respuestas del tutor, enunciados) con notación de
 * libro: subíndices reales, "·" en vez de "*", θ en vez de "ángulo". */
export function MathText({ text, as: Tag = 'span', className }) {
  return <Tag className={className}><Segments marked={toTextbookMarked(text)} /></Tag>;
}

/** Fórmula destacada: además, las divisiones se dibujan como fracción. */
export function Formula({ text, className = '' }) {
  const marked = toTextbookMarked(text);
  return <span className={`math-formula ${className}`} role="math" aria-label={toTextbookPlain(text)}>
    {formulaParts(marked).map((part, index) => {
      const fraction = /^\s*(=|→|≈|;)\s*$/.test(part) ? null : splitFraction(part);
      if (!fraction) return <span key={index} className="math-inline"><Segments marked={part} /></span>;
      return <span key={index} className="math-fraction">
        <span className="math-num"><Segments marked={fraction.num} /></span>
        <span className="math-den"><Segments marked={fraction.den} /></span>
      </span>;
    })}
  </span>;
}
