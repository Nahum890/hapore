import { formulaParts, mathSegments, splitFraction, toTextbookMarked, toTextbookPlain } from '../utils/mathText.js';

function Segments({ marked }) {
  return mathSegments(marked).map((segment, index) => (
    segment.sub !== undefined ? <sub key={index}>{segment.sub}</sub> : <span key={index}>{segment.text}</span>
  ));
}

/** Texto corrido (pistas, respuestas del tutor, enunciados) con notación de
 * libro: subíndices reales, "·" en vez de "*", θ en vez de "ángulo". */
export function MathText({ text, as: Tag = 'span', className }) {
  const formulaPattern = /^(.*?:\s*)?((?:v0x|v0y|v0|vx|vy|x0|y0|y_max|Hmax|x|y|R|T|g|t)\s*=.+)$/i;
  const lines = String(text ?? '').split('\n');
  return <Tag className={['math-text', className].filter(Boolean).join(' ')}>{lines.map((line, index) => {
    const match = line.trim().match(formulaPattern);
    if (!match) return <span className="math-text-line" key={index}>{index > 0 && <br />}<Segments marked={toTextbookMarked(line)} /></span>;
    const label = match[1] ?? '';
    const formula = match[2].trim().replace(/[.;]+$/, '');
    return <span className="math-text-line math-text-formula-line" key={index}>{index > 0 && <br />}{label && <Segments marked={toTextbookMarked(label)} />}<Formula text={formula} className="math-text-formula" /></span>;
  })}</Tag>;
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
