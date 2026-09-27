import { useEffect, useMemo, useState } from 'react';
import { createLaunch, evaluateTrajectory, maxHeight, range, timeOfFlight } from '../physics/projectileMotion.js';
import { Formula } from './MathText.jsx';
import { useTranslation } from '../i18n/LanguageProvider.jsx';

const PALETTE = ['#1d5bd8', '#d97706'];
const FORMULAS = [
  { id: 'components', formula: 'vx = v0 * cos(ángulo); vy = v0 * sen(ángulo)', key: 'free.formulaComponents' },
  { id: 'position', formula: 'x = x0 + vx * t; y = y0 + vy * t - 0,5 * g * t²', key: 'free.formulaPosition' },
  { id: 'height', formula: 'Hmax = y0 + vy² / (2 * g)', key: 'free.formulaHeight' },
  { id: 'range', formula: 'R = (v0² * sen(2 * ángulo)) / g', key: 'free.formulaRange' },
];

function format(value, language) {
  return Number(value).toLocaleString(language === 'es' ? 'es-PY' : 'es-PY', { maximumFractionDigits: 1 });
}

function TrajectoryGraph({ speed, angle, gravity, compare, language, t }) {
  const result = useMemo(() => {
    const angles = compare ? [30, 60] : [angle];
    const launches = angles.map(value => ({ angle: value, launch: createLaunch(speed, value, { gravity }), color: compare ? PALETTE[angles.indexOf(value)] : PALETTE[0] }));
    const metrics = launches.map(item => ({ ...item, distance: range(item.launch), height: maxHeight(item.launch), duration: timeOfFlight(item.launch) }));
    const maxX = Math.max(...metrics.map(item => item.distance), 1) * 1.08;
    const maxY = Math.max(...metrics.map(item => item.height), 1) * 1.14;
    const paths = metrics.map(item => {
      const points = evaluateTrajectory(item.launch, { step: Math.max(item.duration / 48, 0.01) });
      const coordinates = points.map(point => {
        const x = 34 + (point.x / maxX) * 310;
        const y = 156 - (point.y / maxY) * 126;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      }).join(' ');
      return { ...item, coordinates };
    });
    return { maxX, maxY, paths };
  }, [speed, angle, gravity, compare]);

  return <div className="tutor-graph-wrap">
    <svg className="tutor-trajectory-graph" viewBox="0 0 360 190" role="img" aria-label={t('free.graphDescription', { speed, angle: compare ? '30 y 60' : angle, gravity })}>
      <title>{t('free.graphTitle')}</title>
      <desc>{t('free.graphDescription', { speed, angle: compare ? '30 y 60' : angle, gravity })}</desc>
      {[0, 0.5, 1].map((fraction, index) => <g key={`grid-${index}`}>
        <line x1="34" y1={156 - fraction * 126} x2="344" y2={156 - fraction * 126} className="tutor-graph-grid" />
        <text x="29" y={160 - fraction * 126} textAnchor="end" className="tutor-graph-tick">{format(result.maxY * fraction, language)}</text>
      </g>)}
      <line x1="34" y1="28" x2="34" y2="157" className="tutor-graph-axis" />
      <line x1="34" y1="157" x2="345" y2="157" className="tutor-graph-axis" />
      <text x="190" y="184" textAnchor="middle" className="tutor-graph-label">{t('free.graphXAxis')}</text>
      <text x="10" y="92" textAnchor="middle" className="tutor-graph-label" transform="rotate(-90 10 92)">{t('free.graphYAxis')}</text>
      <text x="34" y="172" className="tutor-graph-tick">0</text>
      <text x="344" y="172" textAnchor="end" className="tutor-graph-tick">{format(result.maxX, language)}</text>
      {result.paths.map((item, index) => <polyline key={`${item.angle}-${index}`} points={item.coordinates} fill="none" stroke={item.color} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />)}
    </svg>
    <div className="tutor-graph-legend">
      {result.paths.map((item, index) => <span key={`${item.angle}-legend`}><i style={{ backgroundColor: item.color }} />{t('free.angleLegend', { angle: item.angle })}</span>)}
    </div>
    {compare && <div className="tutor-compare-values">{result.paths.map(item => <span key={`${item.angle}-values`}>{t('free.compareValues', { angle: item.angle, range: format(item.distance, language), height: format(item.height, language), time: format(item.duration, language) })}</span>)}</div>}
  </div>;
}

export default function TutorWorkbench({ lastPrompt = '', onInsertPrompt }) {
  const { t, language } = useTranslation();
  const [tab, setTab] = useState('graph');
  const [expanded, setExpanded] = useState(false);
  const [speed, setSpeed] = useState(20);
  const [angle, setAngle] = useState(50);
  const [gravity, setGravity] = useState(9.8);
  const [compare, setCompare] = useState(false);
  const [practiceChoice, setPracticeChoice] = useState('');
  const [practiceChecked, setPracticeChecked] = useState(false);
  const launch = useMemo(() => createLaunch(speed, angle, { gravity }), [speed, angle, gravity]);
  const metrics = useMemo(() => ({ distance: range(launch), height: maxHeight(launch), duration: timeOfFlight(launch) }), [launch]);
  const velocity = useMemo(() => ({ x: launch.vx, y: launch.vy }), [launch]);

  useEffect(() => {
    const prompt = lastPrompt.toLocaleLowerCase();
    const number = raw => Number(String(raw).replace(',', '.'));
    const speedMatch = prompt.match(/(?:v0|v₀|rapidez(?: inicial)?|velocidad inicial)\s*(?:=|:)?\s*(\d+(?:[.,]\d+)?)/u);
    const angleMatch = prompt.match(/(?:[áa]ngulo)(?:\s+de\s+lanzamiento)?\s*(?:=|:)?\s*(\d+(?:[.,]\d+)?)\s*(?:°|grados?)/u);
    const gravityMatch = prompt.match(/\bg\s*(?:=|:)\s*(\d+(?:[.,]\d+)?)/u);
    if (speedMatch && number(speedMatch[1]) > 0 && number(speedMatch[1]) <= 100) setSpeed(number(speedMatch[1]));
    if (angleMatch && number(angleMatch[1]) >= 5 && number(angleMatch[1]) <= 85) setAngle(number(angleMatch[1]));
    if (gravityMatch && number(gravityMatch[1]) >= 1 && number(gravityMatch[1]) <= 20) setGravity(number(gravityMatch[1]));
    const comparisonRequested = /(?:30\s*°?\s*(?:y|e|\/|vs\.?|contra)\s*60|compar(?:ar|a|aci[oó]n)|embojoja)/u.test(prompt);
    if (comparisonRequested) setCompare(true);
    else if (angleMatch) setCompare(false);
    if (!/(gr[aá]fic|trayectoria|simul|f[oó]rmula|alcance|practic|ejemplo|rapidez inicial|[áa]ngulo|gravedad|v0)/u.test(prompt)) return;
    setExpanded(true);
    setTab(/practic|ñeha|ñ[aá]e/u.test(prompt) ? 'practice' : /ejemplo|techapyr/u.test(prompt) ? 'example' : /f[oó]rmula/u.test(prompt) ? 'formulas' : 'graph');
  }, [lastPrompt]);

  const insertFormula = formula => {
    const topic = {
      components: ['componentes de la velocidad', 'componentes de velocidad'],
      position: ['posición y trayectoria', 'posición ha trayectoria'],
      height: ['altura máxima', 'altura máxima'],
      range: ['alcance horizontal', 'alcance horizontal'],
    }[formula.id];
    const question = language === 'es'
      ? `Explicame la fórmula de ${topic[0]}: ${formula.formula}. Decime qué significa cada símbolo y cuándo se usa.`
      : `Emyesakã chéve fórmula ${topic[1]} rehegua: ${formula.formula}. ¿Mba'épa he'ise káda símbolo ha araka'épa ojepuru?`;
    onInsertPrompt(question);
  };

  return <details className="tutor-workbench" open={expanded} onToggle={event => setExpanded(event.currentTarget.open)}>
    <summary onClick={event => { event.preventDefault(); setExpanded(value => !value); }}>
      <span className="tutor-workbench-mark" aria-hidden="true">y(x)</span>
      <span className="tutor-workbench-heading"><strong>{t('free.workbenchTitle')}</strong><small>{t('free.workbenchLead')}</small></span>
      <span className="tutor-workbench-offline">{t('free.workbenchOffline')}</span>
    </summary>
    <div className="tutor-workbench-body">
      <div className="tutor-workbench-tabs" role="tablist" aria-label={t('free.workbenchTitle')}>
        {['graph', 'formulas', 'example', 'practice'].map(item => <button key={item} type="button" role="tab" aria-selected={tab === item} className={tab === item ? 'is-active' : ''} onClick={() => setTab(item)}>{t(`free.workbench.${item}`)}</button>)}
      </div>

      {tab === 'graph' && <div className="tutor-workbench-explore" role="tabpanel">
        <div className="tutor-workbench-controls">
          <label>{t('free.speed')} <output>{speed} m/s</output><input type="range" min="8" max="32" step="1" value={speed} onChange={event => setSpeed(Number(event.target.value))} aria-label={t('free.speed')} /></label>
          <label>{t('free.angle')} <output>{angle}°</output><input type="range" min="10" max="80" step="1" value={angle} onChange={event => setAngle(Number(event.target.value))} aria-label={t('free.angle')} disabled={compare} /></label>
          <label>{t('free.gravity')} <output>{format(gravity, language)} m/s²</output><input type="range" min="1" max="20" step="0.1" value={gravity} onChange={event => setGravity(Number(event.target.value))} aria-label={t('free.gravity')} /></label>
          <label className="tutor-workbench-compare"><input type="checkbox" checked={compare} onChange={event => setCompare(event.target.checked)} />{t('free.compareAngles')}</label>
        </div>
        <TrajectoryGraph speed={speed} angle={angle} gravity={gravity} compare={compare} language={language} t={t} />
        {!compare && <div className="tutor-workbench-metrics" aria-live="polite">
          <span><small>{t('free.range')}</small><strong>{format(metrics.distance, language)} m</strong></span>
          <span><small>{t('free.maxHeight')}</small><strong>{format(metrics.height, language)} m</strong></span>
          <span><small>{t('free.flightTime')}</small><strong>{format(metrics.duration, language)} s</strong></span>
        </div>}
        {compare && <p className="tutor-workbench-note">{t('free.compareNote')}</p>}
      </div>}

      {tab === 'formulas' && <div className="tutor-formula-grid" role="tabpanel">
        {FORMULAS.map(item => <article className="tutor-formula-card" key={item.id}>
          <p>{t(item.key)}</p><Formula text={item.formula} />
          <button type="button" className="btn btn-secondary" onClick={() => insertFormula(item)}>{t('free.insertFormula')}</button>
        </article>)}
      </div>}

      {tab === 'example' && <div className="tutor-workbench-example" role="tabpanel">
        <p>{t('free.exampleLead', { speed, angle, gravity: format(gravity, language) })}</p>
        <div className="tutor-example-steps">
          <div><small>{t('free.exampleComponents')}</small><Formula text={`vx = v0 * cos(ángulo) = ${speed} * cos(${angle}°); vy = v0 * sen(ángulo) = ${speed} * sen(${angle}°)`} /></div>
          <div><small>{t('free.exampleValues')}</small><strong>vx = {format(velocity.x, language)} m/s · vy = {format(velocity.y, language)} m/s</strong></div>
          <div><small>{t('free.exampleResults')}</small><strong>{t('free.exampleResultValues', { time: format(metrics.duration, language), height: format(metrics.height, language), range: format(metrics.distance, language) })}</strong></div>
        </div>
        <p className="tutor-workbench-note">{t('free.exampleCondition')}</p>
        <button type="button" className="btn btn-secondary" onClick={() => onInsertPrompt(language === 'es'
          ? `Explicame paso a paso este lanzamiento: v0 = ${speed} m/s, ángulo = ${angle}°. Usá los resultados calculados en la pizarra y aclarame qué representa cada uno.`
          : `Emyesakã chéve paso a paso ko lanzamiento: v0 = ${speed} m/s, ángulo = ${angle}°. Eipuru umi resultado oĩva pizarra-pe ha emombe'u mba'épa he'ise káda uno.`)}>{t('free.askExample')}</button>
      </div>}

      {tab === 'practice' && <div className="tutor-workbench-practice" role="tabpanel">
        <p>{t('free.practiceQuestion')}</p>
        <div className="tutor-practice-options">
          {['double', 'quadruple', 'same'].map(option => <button key={option} type="button" className={practiceChoice === option ? 'is-selected' : ''} aria-pressed={practiceChoice === option} onClick={() => { setPracticeChoice(option); setPracticeChecked(false); }}>{t(`free.practice.${option}`)}</button>)}
        </div>
        <button type="button" className="btn btn-primary" disabled={!practiceChoice} onClick={() => setPracticeChecked(true)}>{t('free.checkAnswer')}</button>
        {practiceChecked && <p className={practiceChoice === 'quadruple' ? 'tutor-practice-feedback is-correct' : 'tutor-practice-feedback'} role="status">{t(practiceChoice === 'quadruple' ? 'free.practiceCorrect' : 'free.practiceRetry')}</p>}
      </div>}
      <footer className="tutor-workbench-sources">
        <span>{t('free.sources')}</span>
        <a href="https://www.mec.gov.py/cms_v2/adjuntos/6838" target="_blank" rel="noopener noreferrer">{t('free.sourceMec')}</a>
        <a href="https://openstax.org/books/physics/pages/5-3-projectile-motion" target="_blank" rel="noopener noreferrer">{t('free.sourceOpenStax')}</a>
      </footer>
    </div>
  </details>;
}
