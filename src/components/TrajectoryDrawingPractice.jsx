import { useMemo, useRef, useState } from 'react';
import { createDrawingChallenge, gradeDrawingPoint } from '../utils/trajectoryDrawing.js';
import { heightAtX } from '../physics/projectileMotion.js';
import { useTranslation } from '../i18n/LanguageProvider.jsx';
import './TrajectoryDrawingPractice.css';

const GRAPH = { width: 680, height: 400, left: 62, right: 22, top: 26, bottom: 56 };
const format = value => new Intl.NumberFormat('es-PY', { maximumFractionDigits: 1 }).format(value);
const ticksFor = maximum => maximum >= 30 ? 10 : maximum >= 15 ? 5 : maximum >= 7 ? 2 : 1;

function Graph({ challenge, stepIndex, markedPoints, missPoint, hintShown, onPlot, labels }) {
  const svgRef = useRef(null);
  const plotWidth = GRAPH.width - GRAPH.left - GRAPH.right;
  const plotHeight = GRAPH.height - GRAPH.top - GRAPH.bottom;
  const xMax = challenge.horizontalRange * 1.12;
  const yMax = challenge.highestPoint * 1.35;
  const xToScreen = x => GRAPH.left + (x / xMax) * plotWidth;
  const yToScreen = y => GRAPH.top + plotHeight - (y / yMax) * plotHeight;
  const xStep = ticksFor(xMax);
  const yStep = ticksFor(yMax);
  const xTicks = Array.from({ length: Math.floor(xMax / xStep) + 1 }, (_, index) => index * xStep);
  const yTicks = Array.from({ length: Math.floor(yMax / yStep) + 1 }, (_, index) => index * yStep);
  const activePoint = challenge.points[stepIndex];
  const complete = !activePoint;
  const referencePoints = [
    { x: 0, y: 0, kind: 'start' },
    { ...challenge.apex, kind: 'apex' },
    { x: challenge.horizontalRange, y: 0, kind: 'finish' },
  ];
  // Mientras se marca: segmentos entre los puntos ya ubicados. Al terminar:
  // la parábola real, suave (la guía dice que la curva no tiene esquinas).
  const pathPoints = complete
    ? Array.from({ length: 49 }, (_, index) => {
      const x = (challenge.horizontalRange * index) / 48;
      return { x, y: Math.max(0, heightAtX(challenge.launch, x) ?? 0) };
    })
    : [referencePoints[0], ...markedPoints].sort((first, second) => first.x - second.x);
  const path = pathPoints.map((point, index) => `${index ? 'L' : 'M'} ${xToScreen(point.x).toFixed(1)} ${yToScreen(point.y).toFixed(1)}`).join(' ');

  // El punto se ubica siempre sobre la línea guía (x del paso actual): en un
  // celular es casi imposible acertar la x con el dedo, y lo que se evalúa es
  // si el alumno entiende la altura de la trayectoria en esa distancia.
  const handlePointerDown = event => {
    if (!activePoint) return;
    const bounds = svgRef.current.getBoundingClientRect();
    const screenY = ((event.clientY - bounds.top) / bounds.height) * GRAPH.height;
    if (screenY < GRAPH.top - 8 || screenY > GRAPH.top + plotHeight + 8) return;
    const y = Math.max(0, Math.min(yMax, ((GRAPH.top + plotHeight - screenY) / plotHeight) * yMax));
    onPlot({ x: activePoint.x, y });
  };

  return <svg ref={svgRef} className={'drawing-graph' + (complete ? ' is-complete' : '')} viewBox={`0 0 ${GRAPH.width} ${GRAPH.height}`} role="img" aria-label={labels.graph} onPointerDown={handlePointerDown}>
    <rect x={GRAPH.left} y={GRAPH.top} width={plotWidth} height={plotHeight} rx="8" className="drawing-plot" />
    {xTicks.map(value => <g key={`x-${value}`}>
      <line x1={xToScreen(value)} y1={GRAPH.top} x2={xToScreen(value)} y2={GRAPH.top + plotHeight} className="drawing-gridline" />
      <text x={xToScreen(value)} y={GRAPH.top + plotHeight + 24} textAnchor="middle" className="drawing-tick">{format(value)}</text>
    </g>)}
    {yTicks.map(value => <g key={`y-${value}`}>
      <line x1={GRAPH.left} y1={yToScreen(value)} x2={GRAPH.left + plotWidth} y2={yToScreen(value)} className="drawing-gridline" />
      <text x={GRAPH.left - 10} y={yToScreen(value) + 5} textAnchor="end" className="drawing-tick">{format(value)}</text>
    </g>)}
    {activePoint && <>
      <rect x={xToScreen(activePoint.x) - 14} y={GRAPH.top} width="28" height={plotHeight} className="drawing-guide-band" />
      <line x1={xToScreen(activePoint.x)} y1={GRAPH.top} x2={xToScreen(activePoint.x)} y2={GRAPH.top + plotHeight} className="drawing-guide-line" />
      <text x={xToScreen(activePoint.x)} y={GRAPH.top - 8} textAnchor="middle" className="drawing-guide-label">x = {format(activePoint.x)} m</text>
    </>}
    {hintShown && activePoint && <line x1={GRAPH.left} y1={yToScreen(activePoint.y)} x2={GRAPH.left + plotWidth} y2={yToScreen(activePoint.y)} className="drawing-hint-line" />}
    <line x1={GRAPH.left} y1={GRAPH.top + plotHeight} x2={GRAPH.left + plotWidth} y2={GRAPH.top + plotHeight} className="drawing-axis" />
    <line x1={GRAPH.left} y1={GRAPH.top} x2={GRAPH.left} y2={GRAPH.top + plotHeight} className="drawing-axis" />
    <text x={GRAPH.left + plotWidth / 2} y={GRAPH.height - 8} textAnchor="middle" className="drawing-axis-label">{labels.axisX}</text>
    <text x="16" y={GRAPH.top + plotHeight / 2} textAnchor="middle" className="drawing-axis-label" transform={`rotate(-90 16 ${GRAPH.top + plotHeight / 2})`}>{labels.axisY}</text>
    {pathPoints.length > 1 && <path d={path} className="drawing-student-path" />}
    {missPoint && activePoint && <circle cx={xToScreen(missPoint.x)} cy={yToScreen(missPoint.y)} r="8" className="drawing-miss-point" />}
    {referencePoints.map(point => <circle key={point.kind} cx={xToScreen(point.x)} cy={yToScreen(point.y)} r="7" className={`drawing-reference drawing-reference-${point.kind}`} />)}
    {markedPoints.map((point, index) => <circle key={`marked-${index}`} cx={xToScreen(point.x)} cy={yToScreen(point.y)} r="7" className="drawing-marked-point" />)}
  </svg>;
}

export default function TrajectoryDrawingPractice() {
  const { t } = useTranslation();
  const [level, setLevel] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const [markedPoints, setMarkedPoints] = useState([]);
  const [missPoint, setMissPoint] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [hintShown, setHintShown] = useState(false);
  const challenge = useMemo(() => createDrawingChallenge(level), [level]);
  const complete = stepIndex >= challenge.points.length;
  const activePoint = challenge.points[stepIndex];

  const plotPoint = point => {
    if (!activePoint) return;
    const result = gradeDrawingPoint(challenge, stepIndex, point);
    if (!result.correct) {
      setMissPoint(point);
      setFeedback({ correct: false, key: point.y < activePoint.y ? 'draw.up' : 'draw.down' });
      return;
    }
    setMarkedPoints(current => [...current, activePoint]);
    setStepIndex(index => index + 1);
    setMissPoint(null);
    setHintShown(false);
    setFeedback({ correct: true, key: 'draw.good', vars: { x: format(activePoint.x), y: format(activePoint.y) } });
  };

  const reset = nextLevel => {
    setLevel(nextLevel);
    setStepIndex(0);
    setMarkedPoints([]);
    setMissPoint(null);
    setFeedback(null);
    setHintShown(false);
  };

  const labels = { graph: t('draw.graphLabel'), axisX: t('draw.axisX'), axisY: t('draw.axisY') };

  return <section className="trajectory-drawing card" aria-labelledby="trajectory-drawing-title">
    <div className="drawing-heading">
      <div><span className="panel-eyebrow">{t('draw.eyebrow')}</span><h2 id="trajectory-drawing-title">{t('draw.title')}</h2><p>{t('draw.lead')}</p></div>
      <span className="drawing-level">{t('draw.level', { n: level + 1 })}</span>
    </div>

    <ol className="drawing-steps" aria-label={t('draw.stepsLabel')}>
      <li><span>1</span><div><strong>{t('draw.s1')}</strong><small>{t('draw.s1t')}</small></div></li>
      <li><span>2</span><div><strong>{t('draw.s2')}</strong><small>{t('draw.s2t')}</small></div></li>
      <li><span>3</span><div><strong>{t('draw.s3')}</strong><small>{t('draw.s3t')}</small></div></li>
    </ol>

    <div className="drawing-challenge">
      <div className="drawing-challenge-values">
        <span>{t('value.v0')} <strong>20 m/s</strong></span><span>{t('value.angle')} <strong>{challenge.angle}°</strong></span><span>{t('value.gravity')} <strong>10 m/s²</strong></span>
      </div>
      <p>{t('draw.challenge')}</p>
    </div>

    <div className="drawing-layout">
      <div className="drawing-graph-wrap">
        <div className="drawing-current-task" aria-live="polite">
          {complete
            ? <><strong>{t('draw.complete')}</strong><span>{t('draw.completeSub')}</span></>
            : <><strong>{t('draw.point', { n: stepIndex + 1, total: challenge.points.length })}</strong><span>{t('draw.pointSub', { x: format(activePoint.x) })}</span></>}
        </div>
        <Graph challenge={challenge} stepIndex={stepIndex} markedPoints={markedPoints} missPoint={missPoint} hintShown={hintShown} onPlot={plotPoint} labels={labels} />
        <div className="drawing-legend" aria-hidden="true">
          <span><i className="drawing-legend-start" />{t('draw.start')}</span><span><i className="drawing-legend-apex" />{t('draw.apex')}</span><span><i className="drawing-legend-finish" />{t('draw.finish')}</span><span><i className="drawing-legend-student" />{t('draw.yours')}</span><span><i className="drawing-legend-miss" />{t('draw.miss')}</span>
        </div>
      </div>
      <aside className="drawing-help">
        <h3>{t('draw.helpTitle')}</h3>
        <p>{t('draw.helpText')}</p>
        {feedback && <p className={`drawing-feedback ${feedback.correct ? 'is-correct' : 'is-retry'}`} role="status">{t(feedback.key, feedback.vars)}</p>}
        {hintShown && activePoint && <p className="drawing-hint-answer" role="status">{t('draw.hintAnswer', { y: format(activePoint.y) })}</p>}
        {!complete && !hintShown && <button type="button" className="btn btn-secondary drawing-hint-button" onClick={() => { setHintShown(true); setFeedback(null); }}>{t('draw.hint')}</button>}
        {complete && <button type="button" className="btn btn-primary" onClick={() => reset((level + 1) % 2)}>{t('draw.again')}</button>}
        <small>{t('draw.note')}</small>
      </aside>
    </div>
  </section>;
}
