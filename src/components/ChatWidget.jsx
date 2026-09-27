import { useEffect, useMemo, useRef, useState } from 'react';
import { createLaunch, evaluateTrajectory, maxHeight, positionAt, range, timeOfFlight } from '../physics/projectileMotion.js';
import { planFlight } from '../simulator/flightPlan.js';
import { drawScene } from '../simulator/projectileRenderer.js';
import Trajectory3D, { seriesFromLaunch, TRAJECTORY_COLORS } from '../simulator/Trajectory3D.jsx';
import { checkPractice, fmt, solveNotebook, widgetLaunch } from '../ai/chatTools.js';
import { Formula } from './MathText.jsx';
import { useTranslation } from '../i18n/LanguageProvider.jsx';
import './ChatWidget.css';

// Herramientas interactivas que aparecen DENTRO de una respuesta del chat.
// Todas funcionan sin internet y usan el mismo motor de física de la app.

function launchOf(params) {
  const p = widgetLaunch({ params });
  return createLaunch(p.v0, p.angle, { gravity: p.g, y0: p.h0 });
}

function Metrics({ params }) {
  const { t } = useTranslation();
  const launch = launchOf(params);
  return <div className="chatw-metrics">
    <span><small>{t('free.range')}</small><strong>{fmt(range(launch))} m</strong></span>
    <span><small>{t('free.maxHeight')}</small><strong>{fmt(maxHeight(launch))} m</strong></span>
    <span><small>{t('free.flightTime')}</small><strong>{fmt(timeOfFlight(launch))} s</strong></span>
  </div>;
}

function LabButton({ params, onOpenLab }) {
  const { t } = useTranslation();
  if (!onOpenLab) return null;
  return <button type="button" className="btn btn-secondary chatw-lab-button" onClick={() => onOpenLab(widgetLaunch({ params }))}>
    <span aria-hidden="true">🧪</span>{t('chatw.openLab')}
  </button>;
}

/* ---------- Simulación 2D (misma escena que los ejercicios) ---------- */
function Simulation2D({ params, scenario = 'dron' }) {
  const { t, language } = useTranslation();
  const canvasRef = useRef(null);
  const progressRef = useRef(0);
  const [phase, setPhase] = useState('flying');
  const [playKey, setPlayKey] = useState(0);
  const flight = useMemo(() => {
    const p = widgetLaunch({ params });
    const base = { speed: p.v0, angle: p.angle, gravity: p.g, y0: p.h0, targetY: 0 };
    const probe = planFlight({ ...base, targetX: 10 });
    const landing = probe.landingX;
    const obstacle = scenario === 'wall' ? { x: landing * 0.45, height: Math.max(0.8, probe.peakY * 0.45) } : null;
    return planFlight({ ...base, targetX: landing, obstacle });
  }, [params?.v0, params?.angle, params?.g, params?.h0, scenario]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return undefined;
    let width = 0, height = 0, frame = 0, start = null;
    const draw = (now = 0) => {
      if (!width || !height) return;
      ctx.clearRect(0, 0, width, height);
      drawScene(ctx, { width, height, flight, progress: progressRef.current, phase: phase === 'flying' ? 'flying' : 'landed', now, scenario, verdict: null, language });
    };
    const resize = () => {
      width = canvas.clientWidth; height = canvas.clientHeight;
      if (!width || !height) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); draw();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas); resize();
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (phase === 'flying' && !reduced) {
      const duration = Math.min(4000, Math.max(1800, flight.duration * 750));
      const tick = now => {
        if (start === null) start = now;
        progressRef.current = Math.min(1, (now - start) / duration);
        draw(now);
        if (progressRef.current < 1) frame = requestAnimationFrame(tick); else setPhase('landed');
      };
      progressRef.current = 0;
      frame = requestAnimationFrame(tick);
    } else { progressRef.current = 1; draw(); }
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, [flight, phase, playKey, scenario, language]);

  return <div className="chatw-sim2d">
    <canvas ref={canvasRef} className="chatw-canvas" role="img" aria-label={t('chatw.simAria', { v0: fmt(params.v0), angle: fmt(params.angle) })} />
    <button type="button" className="btn btn-secondary" onClick={() => { setPhase('flying'); setPlayKey(key => key + 1); }} disabled={phase === 'flying'}>{t('chatw.replay')}</button>
  </div>;
}

function ViewToggle({ view, setView }) {
  const { t } = useTranslation();
  return <div className="chatw-toggle" role="group" aria-label={t('chatw.viewLabel')}>
    {['2d', '3d'].map(item => <button key={item} type="button" className={view === item ? 'is-active' : ''} aria-pressed={view === item} onClick={() => setView(item)}>{t(`chatw.view.${item}`)}</button>)}
  </div>;
}

function SimulationWidget({ widget, onOpenLab }) {
  const { t } = useTranslation();
  const [view, setView] = useState(widget.view === '3d' ? '3d' : '2d');
  return <div className="chatw-card">
    <header className="chatw-head"><span className="chatw-icon" aria-hidden="true">🎯</span><strong>{t('chatw.simTitle')}</strong><ViewToggle view={view} setView={setView} /></header>
    <p className="chatw-params">v0 = {fmt(widget.params.v0)} m/s · θ = {fmt(widget.params.angle)}° · g = {fmt(widget.params.g)} m/s²{widget.params.h0 ? ` · h0 = ${fmt(widget.params.h0)} m` : ''}</p>
    {view === '3d'
      ? <Trajectory3D series={[seriesFromLaunch(widget.params, `${fmt(widget.params.angle)}°`)]} compact />
      : <Simulation2D params={widget.params} scenario={widget.scenario} />}
    <Metrics params={widget.params} />
    <LabButton params={widget.params} onOpenLab={onOpenLab} />
  </div>;
}

/* ---------- Cuaderno paso a paso ---------- */
function NotebookWidget({ widget, onOpenLab }) {
  const { t } = useTranslation();
  const steps = widget.steps ?? [];
  const [shown, setShown] = useState(Math.min(2, steps.length));
  const [sim, setSim] = useState(false);
  const [copied, setCopied] = useState(false);
  const all = shown >= steps.length;
  const copy = async () => {
    const text = [widget.title, ...steps.map(step => [step.title, step.formula, ...(step.lines ?? [])].filter(Boolean).join('\n')), widget.answer ? `${t('chatw.result')}: ${widget.answer}` : ''].filter(Boolean).join('\n\n');
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* sin portapapeles */ }
  };
  return <div className="chatw-card chatw-notebook">
    <header className="chatw-head"><span className="chatw-icon" aria-hidden="true">📓</span><strong>{widget.title}</strong></header>
    <div className="chatw-paper">
      <ol className="chatw-steps">
        {steps.slice(0, shown).map((step, index) => <li key={index} className="chatw-step">
          <h4>{step.title}</h4>
          {step.formula && <div className="chatw-formula"><Formula text={step.formula} /></div>}
          {(step.lines ?? []).map((line, lineIndex) => <p key={lineIndex}>{line}</p>)}
        </li>)}
      </ol>
      {all && widget.answer && <div className="chatw-answer"><small>{t('chatw.result')}</small><strong>{widget.answer}</strong></div>}
    </div>
    <div className="chatw-actions">
      {!all && <button type="button" className="btn btn-primary" onClick={() => setShown(value => value + 1)}>{t('chatw.nextStep')} ({shown}/{steps.length})</button>}
      {!all && <button type="button" className="btn btn-secondary" onClick={() => setShown(steps.length)}>{t('chatw.showAll')}</button>}
      {all && <button type="button" className="btn btn-secondary" onClick={copy}>{copied ? t('chatw.copied') : t('chatw.copy')}</button>}
      {widget.params && <button type="button" className="btn btn-secondary" onClick={() => setSim(value => !value)} aria-expanded={sim}>{sim ? t('chatw.hideSim') : t('chatw.showSim')}</button>}
      <LabButton params={widget.params} onOpenLab={onOpenLab} />
    </div>
    {sim && widget.params && <SimulationWidget widget={{ type: 'simulation', params: widget.params, scenario: 'dron' }} onOpenLab={null} />}
  </div>;
}

/* ---------- Aprender a graficar, paso a paso ---------- */
const GRAPH_STEPS = 5;
function GraphWidget({ widget, onOpenLab }) {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [view, setView] = useState('2d');
  const launch = launchOf(widget.params);
  const T = timeOfFlight(launch);
  const H = maxHeight(launch);
  const R = range(launch);
  const rows = useMemo(() => Array.from({ length: 7 }, (_, index) => positionAt(launch, (T * index) / 6)), [T, launch.vx, launch.vy]); // eslint-disable-line react-hooks/exhaustive-deps
  const curve = useMemo(() => evaluateTrajectory(launch, { step: Math.max(T / 60, 0.01) }), [T, launch.vx, launch.vy]); // eslint-disable-line react-hooks/exhaustive-deps
  const box = { l: 44, r: 16, t: 18, b: 34, w: 360, h: 220 };
  const maxX = Math.max(R, 1) * 1.1, maxY = Math.max(H, 1) * 1.25;
  const sx = x => box.l + (x / maxX) * (box.w - box.l - box.r);
  const sy = y => box.h - box.b - (Math.max(0, y) / maxY) * (box.h - box.t - box.b);
  const ticksX = [0, 0.25, 0.5, 0.75, 1].map(f => f * maxX / 1.1);
  const ticksY = [0, 0.5, 1].map(f => f * maxY / 1.25);
  const peak = positionAt(launch, launch.vy > 0 ? launch.vy / launch.gravity : 0);

  return <div className="chatw-card chatw-graph">
    <header className="chatw-head"><span className="chatw-icon" aria-hidden="true">📈</span><strong>{t('chatw.graphTitle')}</strong><ViewToggle view={view} setView={setView} /></header>
    {view === '3d' ? <Trajectory3D series={[seriesFromLaunch(widget.params)]} compact /> : <>
      <ol className="chatw-graph-steps" aria-label={t('chatw.graphTitle')}>
        {Array.from({ length: GRAPH_STEPS }, (_, index) => <li key={index} className={index === step ? 'is-current' : index < step ? 'is-done' : ''}>{t(`chatw.graphStep${index + 1}`)}</li>)}
      </ol>
      <div className="chatw-graph-body">
        <svg viewBox={`0 0 ${box.w} ${box.h}`} className="chatw-graph-svg" role="img" aria-label={t('chatw.graphAria', { range: fmt(R), height: fmt(H) })}>
          <rect x="0" y="0" width={box.w} height={box.h} className="chatw-graph-paper" />
          {Array.from({ length: 19 }, (_, i) => <line key={`vx${i}`} x1={i * 20} y1="0" x2={i * 20} y2={box.h} className="chatw-graph-square" />)}
          {Array.from({ length: 12 }, (_, i) => <line key={`hy${i}`} x1="0" y1={i * 20} x2={box.w} y2={i * 20} className="chatw-graph-square" />)}
          <line x1={box.l} y1={sy(0)} x2={box.w - box.r + 6} y2={sy(0)} className="chatw-graph-axis" />
          <line x1={box.l} y1={sy(0)} x2={box.l} y2={box.t - 6} className="chatw-graph-axis" />
          <text x={box.w - box.r} y={sy(0) + 26} textAnchor="end" className="chatw-graph-label">x (m)</text>
          <text x={box.l + 6} y={box.t} className="chatw-graph-label">y (m)</text>
          {ticksX.map((value, i) => <text key={`tx${i}`} x={sx(value)} y={sy(0) + 13} textAnchor="middle" className="chatw-graph-tick">{fmt(value, 1)}</text>)}
          {ticksY.map((value, i) => <text key={`ty${i}`} x={box.l - 5} y={sy(value) + 3} textAnchor="end" className="chatw-graph-tick">{fmt(value, 1)}</text>)}
          {step >= 2 && rows.map((point, i) => <g key={`p${i}`} className="chatw-graph-point" style={{ animationDelay: `${i * 90}ms` }}>
            <circle cx={sx(point.x)} cy={sy(point.y)} r="4.2" />
            <text x={sx(point.x) + 5} y={sy(point.y) - 6} className="chatw-graph-point-label">P{i}</text>
          </g>)}
          {step >= 3 && <polyline className="chatw-graph-curve" points={curve.map(point => `${sx(point.x).toFixed(1)},${sy(point.y).toFixed(1)}`).join(' ')} />}
          {step >= 4 && <>
            <line x1={sx(peak.x)} y1={sy(peak.y)} x2={sx(peak.x)} y2={sy(0)} className="chatw-graph-mark" />
            <text x={sx(peak.x)} y={Math.max(12, sy(peak.y) - 18)} textAnchor="middle" className="chatw-graph-mark-label">Hmax = {fmt(H)} m</text>
            <text x={sx(R) - 6} y={sy(0) - 16} textAnchor="end" className="chatw-graph-mark-label">R = {fmt(R)} m</text>
          </>}
        </svg>
        {step >= 1 && <table className="chatw-table">
          <thead><tr><th>P</th><th>t (s)</th><th>x (m)</th><th>y (m)</th></tr></thead>
          <tbody>{rows.map((point, i) => <tr key={i}><td>P{i}</td><td>{fmt(point.t)}</td><td>{fmt(point.x)}</td><td>{fmt(Math.max(0, point.y))}</td></tr>)}</tbody>
        </table>}
      </div>
      <p className="chatw-caption">{t(`chatw.graphHelp${step + 1}`, { vx: fmt(launch.vx), vy: fmt(launch.vy), g: fmt(launch.gravity), dt: fmt(T / 6) })}</p>
      <div className="chatw-actions">
        <button type="button" className="btn btn-secondary" onClick={() => setStep(value => Math.max(0, value - 1))} disabled={step === 0}>{t('chatw.prevStep')}</button>
        <button type="button" className="btn btn-primary" onClick={() => setStep(value => Math.min(GRAPH_STEPS - 1, value + 1))} disabled={step === GRAPH_STEPS - 1}>{t('chatw.nextStep')} ({step + 1}/{GRAPH_STEPS})</button>
        <button type="button" className="btn btn-secondary" onClick={() => setStep(GRAPH_STEPS - 1)} disabled={step === GRAPH_STEPS - 1}>{t('chatw.showAll')}</button>
      </div>
    </>}
    <LabButton params={widget.params} onOpenLab={onOpenLab} />
  </div>;
}

/* ---------- Comparar ángulos ---------- */
function CompareWidget({ widget, onOpenLab }) {
  const { t } = useTranslation();
  const [view, setView] = useState('2d');
  const angles = widget.angles ?? [30, 60];
  const series = angles.map((angle, index) => seriesFromLaunch({ ...widget.params, angle }, `${fmt(angle)}°`, TRAJECTORY_COLORS[index]));
  const maxX = Math.max(1, ...series.flatMap(item => item.points.map(point => point.x))) * 1.08;
  const maxY = Math.max(1, ...series.flatMap(item => item.points.map(point => point.y))) * 1.2;
  const sx = x => 30 + (x / maxX) * 320, sy = y => 170 - (Math.max(0, y) / maxY) * 150;
  return <div className="chatw-card">
    <header className="chatw-head"><span className="chatw-icon" aria-hidden="true">⚖️</span><strong>{t('chatw.compareTitle')}</strong><ViewToggle view={view} setView={setView} /></header>
    {view === '3d' ? <Trajectory3D series={series} compact /> : <svg viewBox="0 0 360 190" className="chatw-compare-svg" role="img" aria-label={t('chatw.compareTitle')}>
      <line x1="30" y1="170" x2="354" y2="170" className="chatw-graph-axis" />
      <line x1="30" y1="170" x2="30" y2="10" className="chatw-graph-axis" />
      {series.map((item, index) => <g key={index}>
        <polyline points={item.points.map(point => `${sx(point.x).toFixed(1)},${sy(point.y).toFixed(1)}`).join(' ')} fill="none" stroke={item.color} strokeWidth="3.2" strokeLinecap="round" />
        <text x={40} y={22 + index * 15} style={{ fill: item.color }} className="chatw-legend">● {item.label}</text>
      </g>)}
    </svg>}
    <div className="chatw-compare-values">{angles.map((angle, index) => { const launch = launchOf({ ...widget.params, angle }); return <span key={angle} style={{ borderColor: TRAJECTORY_COLORS[index] }}><strong>{fmt(angle)}°</strong> R {fmt(range(launch))} m · H {fmt(maxHeight(launch))} m · T {fmt(timeOfFlight(launch))} s</span>; })}</div>
    <LabButton params={widget.params} onOpenLab={onOpenLab} />
  </div>;
}

/* ---------- Práctica con corrección ---------- */
function PracticeWidget({ widget, onOpenLab }) {
  const { t, language } = useTranslation();
  const [value, setValue] = useState('');
  const [verdict, setVerdict] = useState(null);
  const [solution, setSolution] = useState(false);
  const problem = widget.problem ?? {};
  const check = event => {
    event.preventDefault();
    const result = checkPractice(widget, Number(String(value).replace(',', '.')));
    if (result) setVerdict(result);
  };
  const notebook = useMemo(() => solveNotebook(`v0 = ${widget.params.v0} angulo ${widget.params.angle} ${problem.asked === 'range' ? 'alcance' : problem.asked === 'height' ? 'altura maxima' : 'tiempo'}`, language), [widget.params.v0, widget.params.angle, problem.asked, language]);
  return <div className="chatw-card chatw-practice">
    <header className="chatw-head"><span className="chatw-icon" aria-hidden="true">✏️</span><strong>{t('chatw.practiceTitle')}</strong></header>
    <p className="chatw-problem">{problem.text}</p>
    <form className="chatw-practice-form" onSubmit={check}>
      <input className="quiz-input" type="text" inputMode="decimal" value={value} onChange={event => { setValue(event.target.value); setVerdict(null); }} placeholder={t('chatw.practicePlaceholder')} aria-label={t('chatw.practicePlaceholder')} />
      <span className="chatw-unit">{problem.unit}</span>
      <button type="submit" className="btn btn-primary" disabled={!value.trim()}>{t('free.checkAnswer')}</button>
    </form>
    {verdict && <p className={'chatw-verdict ' + (verdict.correct ? 'is-ok' : 'is-bad')} role="status">{verdict.correct ? t('chatw.practiceOk', { value: fmt(verdict.expected) + ' ' + problem.unit }) : t(verdict.diff > 0 ? 'chatw.practiceHigh' : 'chatw.practiceLow')}</p>}
    <div className="chatw-actions">
      <button type="button" className="btn btn-secondary" onClick={() => setSolution(value => !value)} aria-expanded={solution}>{solution ? t('chatw.hideSolution') : t('chatw.showSolution')}</button>
      <LabButton params={widget.params} onOpenLab={onOpenLab} />
    </div>
    {solution && notebook && <NotebookWidget widget={notebook} onOpenLab={null} />}
  </div>;
}

/* ---------- Hoja de fórmulas ---------- */
const FORMULA_SHEET = [
  ['chatw.f.components', 'vx = v0 · cos θ ; v0y = v0 · sen θ'],
  ['chatw.f.position', 'x = vx · t ; y = h0 + v0y · t − ½ · g · t²'],
  ['chatw.f.velocity', 'vy = v0y − g · t ; v = √(vx² + vy²)'],
  ['chatw.f.rise', 'ts = v0y / g'],
  ['chatw.f.height', 'Hmax = h0 + v0y² / (2 · g)'],
  ['chatw.f.time', 'T = 2 · v0y / g'],
  ['chatw.f.range', 'R = v0² · sen(2θ) / g'],
  ['chatw.f.horizontal', 't = √(2 · h / g) ; R = v0 · t'],
];
function FormulasWidget({ onAsk }) {
  const { t } = useTranslation();
  return <div className="chatw-card">
    <header className="chatw-head"><span className="chatw-icon" aria-hidden="true">📐</span><strong>{t('chatw.formulasTitle')}</strong></header>
    <div className="chatw-formula-grid">
      {FORMULA_SHEET.map(([key, formula]) => <article key={key} className="chatw-formula-card">
        <small>{t(key)}</small>
        <Formula text={formula} />
        {onAsk && <button type="button" className="btn btn-text" onClick={() => onAsk(t('chatw.askFormula', { name: t(key), formula }))}>{t('free.insertFormula')}</button>}
      </article>)}
    </div>
  </div>;
}

export default function ChatWidget({ widget, onOpenLab, onAsk }) {
  if (!widget?.type) return null;
  if (widget.type === 'notebook') return <NotebookWidget widget={widget} onOpenLab={onOpenLab} />;
  if (widget.type === 'graph' && widget.params) return <GraphWidget widget={widget} onOpenLab={onOpenLab} />;
  if (widget.type === 'simulation' && widget.params) return <SimulationWidget widget={widget} onOpenLab={onOpenLab} />;
  if (widget.type === 'compare' && widget.params) return <CompareWidget widget={widget} onOpenLab={onOpenLab} />;
  if (widget.type === 'practice' && widget.params) return <PracticeWidget widget={widget} onOpenLab={onOpenLab} />;
  if (widget.type === 'formulas') return <FormulasWidget onAsk={onAsk} />;
  return null;
}
