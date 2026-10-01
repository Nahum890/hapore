import { useMemo, useRef, useState } from 'react';
import { createDrawingChallenge, gradeDrawingStroke } from '../utils/trajectoryDrawing.js';
import { heightAtX } from '../physics/projectileMotion.js';
import { useTranslation } from '../i18n/LanguageProvider.jsx';
import './TrajectoryDrawingPractice.css';

const GRAPH = { width: 680, height: 400, left: 62, right: 22, top: 26, bottom: 56 };
const format = value => new Intl.NumberFormat('es-PY', { maximumFractionDigits: 1 }).format(value);
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const smoothPath = points => {
  if (!points.length) return '';
  if (points.length === 1) return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  let path = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let index = 1; index < points.length - 1; index += 1) {
    const middleX = (points[index].x + points[index + 1].x) / 2;
    const middleY = (points[index].y + points[index + 1].y) / 2;
    path += ` Q ${points[index].x.toFixed(1)} ${points[index].y.toFixed(1)} ${middleX.toFixed(1)} ${middleY.toFixed(1)}`;
  }
  const last = points.at(-1);
  path += ` L ${last.x.toFixed(1)} ${last.y.toFixed(1)}`;
  return path;
};

function Graph({ challenge, strokePoints, submitted, hintShown, grade, onStart, onMove, onEnd, onWrongStart, labels }) {
  const svgRef = useRef(null);
  const drawingRef = useRef(false);
  const lastScreenRef = useRef(null);
  const plotWidth = GRAPH.width - GRAPH.left - GRAPH.right;
  const plotHeight = GRAPH.height - GRAPH.top - GRAPH.bottom;
  const xMax = challenge.horizontalRange * 1.12;
  const yMax = challenge.highestPoint * 1.35;
  const xToScreen = x => GRAPH.left + (x / xMax) * plotWidth;
  const yToScreen = y => GRAPH.top + plotHeight - (y / yMax) * plotHeight;
  const ticksFor = maximum => maximum >= 30 ? 10 : maximum >= 15 ? 5 : maximum >= 7 ? 2 : 1;
  const xStep = ticksFor(xMax);
  const yStep = ticksFor(yMax);
  const xTicks = Array.from({ length: Math.floor(xMax / xStep) + 1 }, (_, index) => index * xStep);
  const yTicks = Array.from({ length: Math.floor(yMax / yStep) + 1 }, (_, index) => index * yStep);
  const idealPoints = Array.from({ length: 65 }, (_, index) => {
    const x = (challenge.horizontalRange * index) / 64;
    return { x, y: Math.max(0, heightAtX(challenge.launch, x) ?? 0) };
  }).map(point => ({ x: xToScreen(point.x), y: yToScreen(point.y) }));
  const studentPoints = strokePoints.map(point => ({ x: xToScreen(point.x), y: yToScreen(point.y) }));
  const referencePoints = [
    { x: 0, y: 0, kind: 'start' },
    { ...challenge.apex, kind: 'apex' },
    { x: challenge.horizontalRange, y: 0, kind: 'finish' },
  ];

  const mapPointer = event => {
    const bounds = svgRef.current.getBoundingClientRect();
    const screenX = ((event.clientX - bounds.left) / bounds.width) * GRAPH.width;
    const screenY = ((event.clientY - bounds.top) / bounds.height) * GRAPH.height;
    if (screenX < GRAPH.left || screenX > GRAPH.left + plotWidth || screenY < GRAPH.top || screenY > GRAPH.top + plotHeight) return null;
    return {
      x: clamp(((screenX - GRAPH.left) / plotWidth) * xMax, 0, challenge.horizontalRange * 1.08),
      y: clamp(((GRAPH.top + plotHeight - screenY) / plotHeight) * yMax, 0, yMax),
      screenX,
      screenY,
    };
  };

  const pointerDown = event => {
    const point = mapPointer(event);
    if (!point) return;
    if (point.x > challenge.horizontalRange * 0.1 || point.y > challenge.highestPoint * 0.18) {
      onWrongStart();
      return;
    }
    event.preventDefault();
    drawingRef.current = true;
    lastScreenRef.current = point;
    svgRef.current.setPointerCapture?.(event.pointerId);
    onStart({ x: point.x, y: point.y });
  };

  const pointerMove = event => {
    if (!drawingRef.current) return;
    const point = mapPointer(event);
    if (!point) return;
    const last = lastScreenRef.current;
    if (last && Math.hypot(point.screenX - last.screenX, point.screenY - last.screenY) < 3) return;
    lastScreenRef.current = point;
    onMove({ x: point.x, y: point.y });
  };

  const pointerUp = event => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    lastScreenRef.current = null;
    if (svgRef.current.hasPointerCapture?.(event.pointerId)) svgRef.current.releasePointerCapture(event.pointerId);
    onEnd();
  };

  return <svg ref={svgRef} className="drawing-graph" viewBox={`0 0 ${GRAPH.width} ${GRAPH.height}`} role="img" aria-label={labels.graph}
    onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp}>
    <rect x={GRAPH.left} y={GRAPH.top} width={plotWidth} height={plotHeight} rx="8" className="drawing-plot" />
    {xTicks.map(value => <g key={`x-${value}`}>
      <line x1={xToScreen(value)} y1={GRAPH.top} x2={xToScreen(value)} y2={GRAPH.top + plotHeight} className="drawing-gridline" />
      <text x={xToScreen(value)} y={GRAPH.top + plotHeight + 24} textAnchor="middle" className="drawing-tick">{format(value)}</text>
    </g>)}
    {yTicks.map(value => <g key={`y-${value}`}>
      <line x1={GRAPH.left} y1={yToScreen(value)} x2={GRAPH.left + plotWidth} y2={yToScreen(value)} className="drawing-gridline" />
      <text x={GRAPH.left - 10} y={yToScreen(value) + 5} textAnchor="end" className="drawing-tick">{format(value)}</text>
    </g>)}
    <line x1={GRAPH.left} y1={GRAPH.top + plotHeight} x2={GRAPH.left + plotWidth} y2={GRAPH.top + plotHeight} className="drawing-axis" />
    <line x1={GRAPH.left} y1={GRAPH.top} x2={GRAPH.left} y2={GRAPH.top + plotHeight} className="drawing-axis" />
    <text x={GRAPH.left + plotWidth / 2} y={GRAPH.height - 8} textAnchor="middle" className="drawing-axis-label">{labels.axisX}</text>
    <text x="16" y={GRAPH.top + plotHeight / 2} textAnchor="middle" className="drawing-axis-label" transform={`rotate(-90 16 ${GRAPH.top + plotHeight / 2})`}>{labels.axisY}</text>
    {(hintShown || submitted) && <path d={smoothPath(idealPoints)} className="drawing-ideal-path" />}
    {studentPoints.length > 1 && <path d={smoothPath(studentPoints)} className="drawing-student-path" />}
    {grade?.samples?.filter(sample => !sample.correct).map((sample, index) => <circle key={`miss-${index}`} cx={xToScreen(sample.x)} cy={yToScreen(sample.actualY)} r="8" className="drawing-miss-point" />)}
    {referencePoints.map(point => <g key={point.kind} className={`drawing-reference drawing-reference-${point.kind}`}>
      <circle cx={xToScreen(point.x)} cy={yToScreen(point.y)} r="7" />
      <text x={xToScreen(point.x)} y={yToScreen(point.y) - (point.kind === 'apex' ? 11 : 12)} textAnchor="middle">{labels[point.kind]}</text>
    </g>)}
  </svg>;
}

export default function TrajectoryDrawingPractice() {
  const { t } = useTranslation();
  const [level, setLevel] = useState(0);
  const [strokePoints, setStrokePoints] = useState([]);
  const strokeRef = useRef([]);
  const [grade, setGrade] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [hintShown, setHintShown] = useState(false);
  const challenge = useMemo(() => createDrawingChallenge(level), [level]);
  const complete = Boolean(grade?.correct);
  const submitted = Boolean(grade);

  const beginStroke = point => {
    strokeRef.current = [point];
    setStrokePoints(strokeRef.current);
    setGrade(null);
    setFeedback(null);
    setHintShown(false);
  };
  const continueStroke = point => {
    const last = strokeRef.current.at(-1);
    if (last && Math.hypot(point.x - last.x, point.y - last.y) < challenge.horizontalRange * 0.006) return;
    strokeRef.current = [...strokeRef.current, point];
    setStrokePoints(strokeRef.current);
  };
  const finishStroke = () => {
    const result = gradeDrawingStroke(challenge, strokeRef.current);
    setGrade(result);
    const key = result.correct ? 'draw.strokeGood'
      : result.reason === 'short' ? 'draw.strokeShort'
        : result.reason === 'start' ? 'draw.startHint'
          : result.reason === 'finish' ? 'draw.finishHint' : 'draw.strokeTry';
    setFeedback({ key, vars: { matches: result.matches ?? 0, total: result.total ?? challenge.points.length } });
  };
  const reset = nextLevel => {
    setLevel(nextLevel);
    strokeRef.current = [];
    setStrokePoints([]);
    setGrade(null);
    setFeedback(null);
    setHintShown(false);
  };

  const labels = {
    graph: t('draw.graphLabel'), axisX: t('draw.axisX'), axisY: t('draw.axisY'),
    start: t('draw.start'), apex: t('draw.apex'), finish: t('draw.finish'),
  };

  return <section className="trajectory-drawing card" aria-labelledby="trajectory-drawing-title">
    <div className="drawing-heading">
      <div><span className="panel-eyebrow">{t('draw.eyebrow')}</span><h2 id="trajectory-drawing-title">{t('draw.title')}</h2><p>{t('draw.lead')}</p></div>
      <span className="drawing-level">{t('draw.level', { n: level + 1 })}</span>
    </div>

    <div className="drawing-challenge">
      <div className="drawing-challenge-values">
        <span>{t('value.v0')} <strong>20 m/s</strong></span><span>{t('value.angle')} <strong>{challenge.angle}°</strong></span><span>{t('value.gravity')} <strong>10 m/s²</strong></span>
      </div>
      <p>{t('draw.challenge')}</p>
    </div>

    <div className="drawing-layout">
      <div className="drawing-graph-wrap">
        <div className="drawing-current-task" aria-live="polite">
          <strong>{complete ? t('draw.complete') : submitted ? t('draw.compareTitle') : t('draw.dragPrompt')}</strong>
          <span>{complete ? t('draw.completeSub') : submitted ? t('draw.compareSub') : t('draw.dragSub')}</span>
        </div>
        <Graph challenge={challenge} strokePoints={strokePoints} submitted={submitted} hintShown={hintShown} grade={grade}
          onStart={beginStroke} onMove={continueStroke} onEnd={finishStroke} onWrongStart={() => setFeedback({ key: 'draw.startHint' })}
          labels={labels} />
        <div className="drawing-legend" aria-hidden="true">
          <span><i className="drawing-legend-start" />{t('draw.start')}</span><span><i className="drawing-legend-apex" />{t('draw.apex')}</span><span><i className="drawing-legend-finish" />{t('draw.finish')}</span><span><i className="drawing-legend-student" />{t('draw.yours')}</span>
          {(hintShown || submitted) && <span><i className="drawing-legend-ideal" />{t('draw.ideal')}</span>}
        </div>
      </div>
      <aside className="drawing-help">
        <h3>{t('draw.helpTitle')}</h3>
        <p>{t('draw.helpText')}</p>
        {feedback && <p className={`drawing-feedback ${feedback.key === 'draw.strokeGood' ? 'is-correct' : 'is-retry'}`} role="status">{t(feedback.key, feedback.vars)}</p>}
        {hintShown && !submitted && <p className="drawing-hint-answer" role="status">{t('draw.hintAnswer')}</p>}
        {!complete && !hintShown && !submitted && <button type="button" className="btn btn-secondary drawing-hint-button" onClick={() => { setHintShown(true); setFeedback(null); }}>{t('draw.hint')}</button>}
        {submitted && !complete && <button type="button" className="btn btn-secondary drawing-hint-button" onClick={() => { strokeRef.current = []; setStrokePoints([]); setGrade(null); setFeedback(null); }}>{t('draw.retry')}</button>}
        {complete && <button type="button" className="btn btn-primary" onClick={() => reset((level + 1) % 2)}>{t('draw.again')}</button>}
        <small>{t('draw.note')}</small>
      </aside>
    </div>
  </section>;
}
