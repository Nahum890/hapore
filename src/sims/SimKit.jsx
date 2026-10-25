// Kit común de los simuladores de PyFis: escena, controles, lecturas y
// gráficos con la misma estética (hoja cuadriculada, trazo de tinta, paleta
// de la app). Cada simulador solo describe su física y su dibujo.
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from '../i18n/LanguageProvider.jsx';
import './sims.css';

export const INK = '#1b2a41';
export const COLORS = {
  blue: '#1d5bd8', sky: '#2f80c1', red: '#e11d48', earth: '#c8552f', amber: '#f59e0b', sun: '#eba431',
  green: '#0e7c66', violet: '#7047eb', grass: '#6aa66f', paper: '#fbfcfe', water: '#3b9ad9', muted: '#64748b',
};
// Colores fijos de los vectores físicos (ver docs/ESTETICA_PYFIS_IA.txt).
export const VECTOR = { v: '#0e7c66', vx: '#e4572e', vy: '#2f80c1', force: '#e11d48', accel: '#7047eb' };

/** Elige el texto del idioma activo: tx('Velocidad', 'Velocidad'). */
export function useTx() {
  const { language } = useTranslation();
  return useCallback((es, gn) => (language === 'es' ? es : (gn ?? es)), [language]);
}

// Coma decimal y miles con espacio fino (1 536,45): igual que en la práctica.
const FORMATTERS = new Map();
const formatter = digits => {
  if (!FORMATTERS.has(digits)) FORMATTERS.set(digits, new Intl.NumberFormat('es-PY', { maximumFractionDigits: digits }));
  return FORMATTERS.get(digits);
};
const spaced = (value, digits) => formatter(digits).formatToParts(value).map(part => (part.type === 'group' ? ' ' : part.value)).join('');
export function num(value, digits = 2) {
  if (!Number.isFinite(value)) return '—';
  if (Math.abs(value) < 1e-9) value = 0; // evita "−0" en ejes y lecturas
  const abs = Math.abs(value);
  if (abs !== 0 && (abs >= 1e6 || abs < 1e-3)) {
    const exponent = Math.floor(Math.log10(abs));
    const sup = String(exponent).replace(/-/g, '⁻').replace(/\d/g, digit => '⁰¹²³⁴⁵⁶⁷⁸⁹'[digit]);
    return `${spaced(value / 10 ** exponent, 2)} × 10${sup}`;
  }
  return spaced(value, abs >= 1000 ? 0 : digits);
}

/** Bucle de animación: llama a onFrame(dt en segundos) mientras active. */
export function useFrame(onFrame, active) {
  const ref = useRef(onFrame);
  ref.current = onFrame;
  useEffect(() => {
    if (!active) return undefined;
    let raf = 0;
    let last = performance.now();
    const loop = now => {
      // El primer cuadro puede traer una marca de tiempo anterior a `last`.
      const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
      last = now;
      ref.current(dt);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [active]);
}

export const prefersReducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/* ---------- Estructura ---------- */

/** Texto HTML con subíndices: "T_f", "ρ_líq", "v_{0x}" → T<sub>f</sub>… */
export function Sub({ text }) {
  if (typeof text !== 'string' || !text.includes('_')) return text;
  const parts = [];
  const pattern = /(\S)_(\{[^}]+\}|[\p{L}\d]+)/gu;
  let last = 0;
  for (let match = pattern.exec(text); match; match = pattern.exec(text)) {
    parts.push(text.slice(last, match.index + 1), <sub key={match.index}>{match[2].replace(/^\{|\}$/g, '')}</sub>);
    last = match.index + match[0].length;
  }
  parts.push(text.slice(last));
  return <>{parts}</>;
}

export function Sim({ title, subtitle, children, controls, readouts, graphs, footer, actions, className = '' }) {
  return <section className={`sim ${className}`} aria-label={title}>
    <header className="sim-head">
      <div className="sim-head-copy">
        <h3>{title}</h3>
        {subtitle && <p><Sub text={subtitle} /></p>}
      </div>
      {actions && <div className="sim-head-actions">{actions}</div>}
    </header>
    <div className="sim-body">
      <div className="sim-stage">{children}</div>
      {(controls || readouts) && <aside className="sim-panel">
        {controls && <div className="sim-controls">{controls}</div>}
        {readouts && <div className="sim-readouts">{readouts}</div>}
      </aside>}
    </div>
    {graphs && <div className="sim-graphs">{graphs}</div>}
    {footer && <p className="sim-note"><Sub text={footer} /></p>}
  </section>;
}

/** Escena SVG con hoja cuadriculada de fondo. */
export function Stage({ width = 640, height = 360, children, grid = true, label, className = '' }) {
  const id = useId().replace(/:/g, '');
  return <svg className={`sim-svg ${className}`} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label} preserveAspectRatio="xMidYMid meet">
    {grid && <>
      <defs>
        <pattern id={`g${id}`} width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="rgba(29,91,216,.07)" strokeWidth="1" /></pattern>
      </defs>
      <rect width={width} height={height} fill={COLORS.paper} />
      <rect width={width} height={height} fill={`url(#g${id})`} />
    </>}
    {children}
  </svg>;
}

/* ---------- Controles ---------- */

export function Slider({ label, value, min, max, step = 1, unit = '', onChange, digits = 2, disabled = false }) {
  const id = useId();
  const pct = ((value - min) / (max - min)) * 100;
  return <div className={`sim-slider${disabled ? ' is-disabled' : ''}`}>
    <label htmlFor={id}><span>{label}</span><output htmlFor={id}>{num(value, digits)}{unit && <small> {unit}</small>}</output></label>
    <input id={id} type="range" min={min} max={max} step={step} value={value} disabled={disabled}
      style={{ '--pct': `${pct}%` }} onChange={event => onChange(Number(event.target.value))} />
  </div>;
}

export function Choice({ label, options, value, onChange }) {
  return <div className="sim-choice" role="group" aria-label={label}>
    {label && <span className="sim-choice-label">{label}</span>}
    <div className="sim-choice-row">
      {options.map(option => <button key={option.id} type="button" aria-pressed={value === option.id} className={value === option.id ? 'is-active' : ''} onClick={() => onChange(option.id)}>{option.label}</button>)}
    </div>
  </div>;
}

export function Toggle({ label, checked, onChange }) {
  return <label className="sim-toggle"><input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} /><span aria-hidden="true" /><b>{label}</b></label>;
}

const ICON = {
  play: 'M8 5.5v13l10.5-6.5z',
  pause: 'M7.5 5.5h3v13h-3zM13.5 5.5h3v13h-3z',
  reset: 'M5 12a7 7 0 1 0 2.1-5M5 4.5V9h4.5',
  step: 'M6 5.5v13l8.5-6.5zM16 5.5h2.5v13H16z',
};
export function PlayBar({ running, onToggle, onReset, onStep, time, extra }) {
  const tx = useTx();
  return <div className="sim-playbar">
    <button type="button" className="sim-play" onClick={onToggle} aria-label={running ? tx('Pausar', 'Ejopyta') : tx('Iniciar', 'Eñepyrũ')}>
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d={running ? ICON.pause : ICON.play} fill="currentColor" /></svg>
      {running ? tx('Pausa', 'Pausa') : tx('Iniciar', 'Eñepyrũ')}
    </button>
    {onStep && <button type="button" className="sim-icon-btn" onClick={onStep} aria-label={tx('Avanzar un paso', 'Tenonde peteĩ paso')} title={tx('Avanzar un paso', 'Tenonde peteĩ paso')}><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d={ICON.step} fill="currentColor" /></svg></button>}
    <button type="button" className="sim-icon-btn" onClick={onReset} aria-label={tx('Reiniciar', 'Ñepyrũjey')} title={tx('Reiniciar', 'Ñepyrũjey')}><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d={ICON.reset} /></svg></button>
    {time !== undefined && <span className="sim-clock">t = {num(time, 2)} s</span>}
    {extra}
  </div>;
}

/* ---------- Lecturas ---------- */

export function Readouts({ items }) {
  return <dl className="sim-readout-grid">
    {items.filter(Boolean).map(item => <div key={item.label} className={`sim-readout${item.tone ? ` is-${item.tone}` : ''}`}>
      <dt><Sub text={item.label} /></dt>
      <dd>{typeof item.value === 'number' ? num(item.value, item.digits ?? 2) : item.value}{item.unit && <small> {item.unit}</small>}</dd>
    </div>)}
  </dl>;
}

export function Verdict({ tone = 'info', children }) {
  return <p className={`sim-verdict is-${tone}`} role="status">{children}</p>;
}

/* ---------- Dibujo ---------- */

/** Vector con punta: (x1,y1) → (x2,y2) en coordenadas de la escena. */
export function Arrow({ x1, y1, x2, y2, color = INK, width = 3, label, labelDx = 6, labelDy = -6, dashed = false, head = 9, labelAtMiddle = false }) {
  const dx = x2 - x1, dy = y2 - y1;
  const length = Math.hypot(dx, dy);
  if (length < 0.5) return null;
  const ux = dx / length, uy = dy / length;
  const h = Math.min(head, length * 0.6);
  const bx = x2 - ux * h, by = y2 - uy * h;
  const px = -uy * h * 0.55, py = ux * h * 0.55;
  return <g className="sim-arrow">
    <line x1={x1} y1={y1} x2={bx} y2={by} stroke={color} strokeWidth={width} strokeLinecap="round" strokeDasharray={dashed ? '6 5' : undefined} />
    <path d={`M${x2},${y2} L${bx + px},${by + py} L${bx - px},${by - py} Z`} fill={color} />
    {label && <text x={(labelAtMiddle ? (x1 + x2) / 2 : x2) + labelDx} y={(labelAtMiddle ? (y1 + y2) / 2 : y2) + labelDy} className="sim-label" fill={color}><SubText text={label} /></text>}
  </g>;
}

/** "a_c" → a con subíndice c (dentro de un <text> SVG). */
export function SubText({ text }) {
  const [main, sub] = String(text).split('_');
  return sub === undefined ? main : <>{main}<tspan dy="4" fontSize="0.78em">{sub}</tspan><tspan dy="-4" /></>;
}

/** Línea de cota con flechas en los extremos y valor en el medio. */
export function Dimension({ x1, y1, x2, y2, text, color = INK, offset = 0 }) {
  const dx = x2 - x1, dy = y2 - y1;
  const length = Math.hypot(dx, dy) || 1;
  const nx = -dy / length * offset, ny = dx / length * offset;
  const ax = x1 + nx, ay = y1 + ny, bx = x2 + nx, by = y2 + ny;
  const ux = dx / length * 6, uy = dy / length * 6;
  const px = -uy * 0.5, py = ux * 0.5;
  return <g className="sim-dimension" opacity=".85">
    <line x1={ax} y1={ay} x2={bx} y2={by} stroke={color} strokeWidth="1.3" />
    <path d={`M${ax},${ay} l${ux + px},${uy + py} M${ax},${ay} l${ux - px},${uy - py} M${bx},${by} l${-ux + px},${-uy + py} M${bx},${by} l${-ux - px},${-uy - py}`} stroke={color} strokeWidth="1.3" fill="none" />
    {text && <text x={(ax + bx) / 2} y={(ay + by) / 2 - 6} textAnchor="middle" className="sim-label sim-label-small" fill={color}>{text}</text>}
  </g>;
}

/** Regla horizontal con marcas (para distancias). */
export function Ruler({ x, y, length, from = 0, to = 100, step = 10, unit = 'm', vertical = false }) {
  const count = Math.round((to - from) / step);
  const ticks = Array.from({ length: count + 1 }, (_, index) => from + index * step);
  return <g className="sim-ruler">
    {vertical
      ? <rect x={x - 14} y={y - length} width="14" height={length} rx="3" fill="#fff7e0" stroke={INK} strokeWidth="1.2" />
      : <rect x={x} y={y} width={length} height="14" rx="3" fill="#fff7e0" stroke={INK} strokeWidth="1.2" />}
    {ticks.map((value, index) => {
      const pos = (index / count) * length;
      const major = index % 2 === 0 || count <= 6;
      return vertical
        ? <g key={value}><line x1={x - 14} y1={y - pos} x2={x - (major ? 4 : 8)} y2={y - pos} stroke={INK} strokeWidth="1" />{major && <text x={x - 18} y={y - pos + 3.5} textAnchor="end" className="sim-tick">{num(value)}</text>}</g>
        : <g key={value}><line x1={x + pos} y1={y} x2={x + pos} y2={y + (major ? 10 : 6)} stroke={INK} strokeWidth="1" />{major && <text x={x + pos} y={y + 26} textAnchor="middle" className="sim-tick">{num(value)}</text>}</g>;
    })}
    <text x={vertical ? x - 7 : x + length + 6} y={vertical ? y - length - 6 : y + 11} textAnchor={vertical ? 'middle' : 'start'} className="sim-tick sim-tick-unit">{unit}</text>
  </g>;
}

/* ---------- Gráficos ---------- */

function niceStep(range, target = 5) {
  const raw = range / target;
  const power = 10 ** Math.floor(Math.log10(raw || 1));
  const n = raw / power;
  return (n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10) * power;
}

/**
 * Gráfico de líneas en hoja cuadriculada. series: [{ points: [[x,y]], color,
 * label, dashed }]. marker: [x,y] punto actual. Ejes con unidades.
 */
export function Graph({ title, series, xLabel, yLabel, xMin = 0, xMax, yMin, yMax, marker, markerColor = COLORS.red, height = 170, area = false }) {
  const W = 420, H = height, L = 46, R = 14, T = 16, B = 30;
  const all = series.flatMap(item => item.points);
  const xs = all.map(p => p[0]), ys = all.map(p => p[1]);
  const x0 = xMin, x1 = xMax ?? Math.max(1e-9, ...xs, marker?.[0] ?? 0);
  let y0 = yMin ?? Math.min(0, ...ys, marker?.[1] ?? 0);
  let y1 = yMax ?? Math.max(1e-9, ...ys, marker?.[1] ?? 0);
  if (y1 - y0 < 1e-9) { y1 = y0 + 1; }
  const pad = (y1 - y0) * 0.08;
  if (yMax === undefined) y1 += pad;
  if (yMin === undefined && y0 < 0) y0 -= pad;
  const sx = x => L + ((x - x0) / (x1 - x0 || 1)) * (W - L - R);
  const sy = y => H - B - ((y - y0) / (y1 - y0)) * (H - T - B);
  const xStep = niceStep(x1 - x0, 5), yStep = niceStep(y1 - y0, 4);
  const xTicks = []; for (let v = Math.ceil(x0 / xStep) * xStep; v <= x1 + 1e-9; v += xStep) xTicks.push(v);
  const yTicks = []; for (let v = Math.ceil(y0 / yStep) * yStep; v <= y1 + 1e-9; v += yStep) yTicks.push(v);
  return <figure className="sim-graph">
    {title && <figcaption>{title}</figcaption>}
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={title}>
      <rect x={L} y={T} width={W - L - R} height={H - T - B} fill="#fff" stroke="#e2e8f0" />
      {xTicks.map(v => <g key={`x${v}`}><line x1={sx(v)} y1={T} x2={sx(v)} y2={H - B} stroke="rgba(29,91,216,.08)" /><text x={sx(v)} y={H - B + 13} textAnchor="middle" className="sim-tick">{num(v)}</text></g>)}
      {yTicks.map(v => <g key={`y${v}`}><line x1={L} y1={sy(v)} x2={W - R} y2={sy(v)} stroke="rgba(29,91,216,.08)" /><text x={L - 5} y={sy(v) + 3.5} textAnchor="end" className="sim-tick">{num(v)}</text></g>)}
      {y0 < 0 && y1 > 0 && <line x1={L} y1={sy(0)} x2={W - R} y2={sy(0)} stroke={INK} strokeOpacity=".45" />}
      {series.map((item, index) => {
        if (!item.points.length) return null;
        const d = item.points.map((p, i) => `${i ? 'L' : 'M'}${sx(p[0]).toFixed(1)},${sy(p[1]).toFixed(1)}`).join(' ');
        return <g key={index}>
          {area && index === 0 && <path d={`${d} L${sx(item.points.at(-1)[0])},${sy(Math.max(y0, 0))} L${sx(item.points[0][0])},${sy(Math.max(y0, 0))} Z`} fill={item.color} opacity=".12" />}
          <path d={d} fill="none" stroke={item.color} strokeWidth="2.4" strokeLinejoin="round" strokeDasharray={item.dashed ? '5 4' : undefined} />
        </g>;
      })}
      {marker && <circle cx={sx(marker[0])} cy={sy(marker[1])} r="4.5" fill={markerColor} stroke="#fff" strokeWidth="1.5" />}
      <text x={W - R} y={H - 4} textAnchor="end" className="sim-axis">{xLabel}</text>
      <text x={6} y={T - 3} className="sim-axis">{yLabel}</text>
    </svg>
    {series.some(item => item.label) && <div className="sim-legend">{series.filter(item => item.label).map(item => <span key={item.label}><i style={{ background: item.color }} />{item.label}</span>)}</div>}
  </figure>;
}

/** Gráfico dentro de una escena SVG (para ponerlo al lado del dibujo). */
export function Plot({ x, y, width, height, series, xMin = 0, xMax, yMin = 0, yMax, marker, markerColor = COLORS.red, xLabel, yLabel, area = false }) {
  const all = series.flatMap(item => item.points);
  const x1 = xMax ?? Math.max(1e-9, ...all.map(p => p[0]));
  const y1 = yMax ?? Math.max(1e-9, ...all.map(p => p[1])) * 1.08;
  const sx = v => x + ((v - xMin) / (x1 - xMin || 1)) * width;
  const sy = v => y + height - ((v - yMin) / (y1 - yMin || 1)) * height;
  const xStep = niceStep(x1 - xMin, 4), yStep = niceStep(y1 - yMin, 4);
  const xTicks = []; for (let v = Math.ceil(xMin / xStep) * xStep; v <= x1 + 1e-9; v += xStep) xTicks.push(v);
  const yTicks = []; for (let v = Math.ceil(yMin / yStep) * yStep; v <= y1 + 1e-9; v += yStep) yTicks.push(v);
  return <g className="sim-plot">
    <rect x={x} y={y} width={width} height={height} fill="#fff" stroke="#e2e8f0" />
    {xTicks.map(v => <g key={`x${v}`}><line x1={sx(v)} y1={y} x2={sx(v)} y2={y + height} stroke="rgba(29,91,216,.08)" /><text x={sx(v)} y={y + height + 13} textAnchor="middle" className="sim-tick">{num(v)}</text></g>)}
    {yTicks.map(v => <g key={`y${v}`}><line x1={x} y1={sy(v)} x2={x + width} y2={sy(v)} stroke="rgba(29,91,216,.08)" /><text x={x - 5} y={sy(v) + 3.5} textAnchor="end" className="sim-tick">{num(v)}</text></g>)}
    {series.map((item, index) => {
      if (!item.points.length) return null;
      const d = item.points.map((p, i) => `${i ? 'L' : 'M'}${sx(p[0]).toFixed(1)},${sy(p[1]).toFixed(1)}`).join(' ');
      return <g key={index}>
        {area && index === 0 && <path d={`${d} L${sx(item.points.at(-1)[0])},${sy(yMin)} L${sx(item.points[0][0])},${sy(yMin)} Z`} fill={item.color} opacity=".14" />}
        <path d={d} fill="none" stroke={item.color} strokeWidth="2.6" strokeLinejoin="round" strokeDasharray={item.dashed ? '5 4' : undefined} />
      </g>;
    })}
    {marker && <circle cx={sx(marker[0])} cy={sy(marker[1])} r="5" fill={markerColor} stroke="#fff" strokeWidth="1.6" />}
    {xLabel && <text x={x + width} y={y + height + 28} textAnchor="end" className="sim-axis">{xLabel}</text>}
    {yLabel && <text x={x} y={y - 8} className="sim-axis">{yLabel}</text>}
  </g>;
}

/** Hook de estado de simulación con tiempo, play/pausa y reinicio. */
export function useSimClock({ maxTime = Infinity, speed = 1 } = {}) {
  const [time, setTimeState] = useState(0);
  const [running, setRunning] = useState(false);
  const timeRef = useRef(0);
  const setTime = useCallback(value => { timeRef.current = value; setTimeState(value); }, []);
  const reset = useCallback(() => { setRunning(false); setTime(0); }, [setTime]);
  const toggle = useCallback(() => {
    // Si terminó, "Iniciar" vuelve a empezar desde cero.
    if (!running && timeRef.current >= maxTime) setTime(0);
    setRunning(value => !value);
  }, [running, maxTime, setTime]);
  useFrame(dt => {
    let next = timeRef.current + dt * speed;
    if (next >= maxTime) { next = maxTime; setRunning(false); }
    timeRef.current = next;
    setTimeState(next);
  }, running);
  return { time, setTime, running, setRunning, reset, toggle };
}
