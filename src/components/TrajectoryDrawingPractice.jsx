import { useMemo, useRef, useState } from 'react';
import { createDrawingChallenge, gradeDrawingPoint } from '../utils/trajectoryDrawing.js';
import './TrajectoryDrawingPractice.css';

const GRAPH = { width: 680, height: 390, left: 58, right: 20, top: 24, bottom: 50 };
const format = value => new Intl.NumberFormat('es-PY', { maximumFractionDigits: 1 }).format(value);
const ticksFor = maximum => maximum >= 30 ? 10 : maximum >= 15 ? 5 : maximum >= 7 ? 2 : 1;

function Graph({ challenge, stepIndex, markedPoints, hintShown, onPlot }) {
  const svgRef = useRef(null);
  const plotWidth = GRAPH.width - GRAPH.left - GRAPH.right;
  const plotHeight = GRAPH.height - GRAPH.top - GRAPH.bottom;
  const xMax = challenge.horizontalRange * 1.12;
  const yMax = challenge.highestPoint * 1.45;
  const xToScreen = x => GRAPH.left + (x / xMax) * plotWidth;
  const yToScreen = y => GRAPH.top + plotHeight - (y / yMax) * plotHeight;
  const xStep = ticksFor(xMax);
  const yStep = ticksFor(yMax);
  const xTicks = Array.from({ length: Math.floor(xMax / xStep) + 1 }, (_, index) => index * xStep);
  const yTicks = Array.from({ length: Math.floor(yMax / yStep) + 1 }, (_, index) => index * yStep);
  const activePoint = challenge.points[stepIndex];
  const referencePoints = [
    { ...challenge.launch, x: 0, y: 0, label: 'Inicio', kind: 'start' },
    { ...challenge.apex, label: 'Punto más alto', kind: 'apex' },
    { x: challenge.horizontalRange, y: 0, label: 'Aterrizaje', kind: 'finish' },
  ];
  const pathPoints = [referencePoints[0], ...markedPoints];
  if (markedPoints.length === challenge.points.length) pathPoints.push(referencePoints[1], referencePoints[2]);
  pathPoints.sort((first, second) => first.x - second.x);
  const path = pathPoints.map((point, index) => `${index ? 'L' : 'M'} ${xToScreen(point.x)} ${yToScreen(point.y)}`).join(' ');

  const handlePointerDown = event => {
    if (!activePoint) return;
    const bounds = svgRef.current.getBoundingClientRect();
    const screenX = ((event.clientX - bounds.left) / bounds.width) * GRAPH.width;
    const screenY = ((event.clientY - bounds.top) / bounds.height) * GRAPH.height;
    if (screenX < GRAPH.left || screenX > GRAPH.width - GRAPH.right || screenY < GRAPH.top || screenY > GRAPH.height - GRAPH.bottom) return;
    onPlot({
      x: ((screenX - GRAPH.left) / plotWidth) * xMax,
      y: ((GRAPH.top + plotHeight - screenY) / plotHeight) * yMax,
    });
  };

  return <svg ref={svgRef} className="drawing-graph" viewBox={`0 0 ${GRAPH.width} ${GRAPH.height}`} role="img" aria-label={`Cuadrícula para dibujar la trayectoria. Distancia hasta ${format(challenge.horizontalRange)} metros y altura máxima ${format(challenge.highestPoint)} metros.`} onPointerDown={handlePointerDown}>
    <rect x={GRAPH.left} y={GRAPH.top} width={plotWidth} height={plotHeight} rx="8" className="drawing-plot" />
    {xTicks.map(value => <g key={`x-${value}`}>
      <line x1={xToScreen(value)} y1={GRAPH.top} x2={xToScreen(value)} y2={GRAPH.top + plotHeight} className="drawing-gridline" />
      <text x={xToScreen(value)} y={GRAPH.top + plotHeight + 23} textAnchor="middle" className="drawing-tick">{format(value)}</text>
    </g>)}
    {yTicks.map(value => <g key={`y-${value}`}>
      <line x1={GRAPH.left} y1={yToScreen(value)} x2={GRAPH.left + plotWidth} y2={yToScreen(value)} className="drawing-gridline" />
      <text x={GRAPH.left - 10} y={yToScreen(value) + 4} textAnchor="end" className="drawing-tick">{format(value)}</text>
    </g>)}
    {activePoint && <line x1={xToScreen(activePoint.x)} y1={GRAPH.top} x2={xToScreen(activePoint.x)} y2={GRAPH.top + plotHeight} className="drawing-guide-line" />}
    {hintShown && activePoint && <line x1={GRAPH.left} y1={yToScreen(activePoint.y)} x2={GRAPH.left + plotWidth} y2={yToScreen(activePoint.y)} className="drawing-hint-line" />}
    <line x1={GRAPH.left} y1={GRAPH.top + plotHeight} x2={GRAPH.left + plotWidth} y2={GRAPH.top + plotHeight} className="drawing-axis" />
    <line x1={GRAPH.left} y1={GRAPH.top} x2={GRAPH.left} y2={GRAPH.top + plotHeight} className="drawing-axis" />
    <text x={GRAPH.left + plotWidth / 2} y={GRAPH.height - 8} textAnchor="middle" className="drawing-axis-label">Distancia horizontal (m)</text>
    <text x="16" y={GRAPH.top + plotHeight / 2} textAnchor="middle" className="drawing-axis-label" transform={`rotate(-90 16 ${GRAPH.top + plotHeight / 2})`}>Altura (m)</text>
    {pathPoints.length > 1 && <path d={path} className="drawing-student-path" />}
    {referencePoints.map(point => <circle key={point.kind} cx={xToScreen(point.x)} cy={yToScreen(point.y)} r="6" className={`drawing-reference drawing-reference-${point.kind}`} />)}
    {markedPoints.map((point, index) => <circle key={`marked-${index}`} cx={xToScreen(point.x)} cy={yToScreen(point.y)} r="6" className="drawing-marked-point" />)}
  </svg>;
}

export default function TrajectoryDrawingPractice() {
  const [level, setLevel] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const [markedPoints, setMarkedPoints] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [hintShown, setHintShown] = useState(false);
  const challenge = useMemo(() => createDrawingChallenge(level), [level]);
  const complete = stepIndex >= challenge.points.length;
  const activePoint = challenge.points[stepIndex];

  const plotPoint = point => {
    if (!activePoint) return;
    const result = gradeDrawingPoint(challenge, stepIndex, point);
    if (!result.correct) {
      const note = !result.aligned
        ? `Alineá el punto con la línea vertical: x = ${format(activePoint.x)} m.`
        : point.y < activePoint.y ? 'Vas bien en la distancia. Subí un poco el punto.' : 'Vas bien en la distancia. Bajá un poco el punto.';
      setFeedback({ correct: false, text: note });
      return;
    }
    const nextPoints = [...markedPoints, activePoint];
    setMarkedPoints(nextPoints);
    setStepIndex(index => index + 1);
    setHintShown(false);
    setFeedback({ correct: true, text: `¡Bien! A ${format(activePoint.x)} m de distancia, la altura es ${format(activePoint.y)} m.` });
  };

  const reset = nextLevel => {
    setLevel(nextLevel);
    setStepIndex(0);
    setMarkedPoints([]);
    setFeedback(null);
    setHintShown(false);
  };

  return <section className="trajectory-drawing card" aria-labelledby="trajectory-drawing-title">
    <div className="drawing-heading">
      <div><span className="panel-eyebrow">APRENDER Y PRACTICAR</span><h2 id="trajectory-drawing-title">Dibujá una parábola</h2><p>Marcá los puntos en la cuadrícula. Al final vas a ver la trayectoria completa.</p></div>
      <span className="drawing-level">Ejercicio {level + 1} de 2</span>
    </div>

    <ol className="drawing-steps" aria-label="Pasos para dibujar una parábola">
      <li><span>1</span><div><strong>Ubicá el inicio</strong><small>El proyectil sale desde el suelo.</small></div></li>
      <li><span>2</span><div><strong>Buscá el punto más alto</strong><small>La trayectoria sube y luego empieza a bajar.</small></div></li>
      <li><span>3</span><div><strong>Marcá y uní los puntos</strong><small>La curva es redondeada, no tiene esquinas.</small></div></li>
    </ol>

    <div className="drawing-challenge">
      <div className="drawing-challenge-values"><span>Velocidad inicial <strong>20 m/s</strong></span><span>Ángulo <strong>{challenge.angle}°</strong></span><span>Gravedad <strong>10 m/s²</strong></span></div>
      <p>La pelota parte del suelo y vuelve al mismo nivel. Ya están marcados el inicio, el punto más alto y el aterrizaje. Completá los cuatro puntos intermedios.</p>
    </div>

    <div className="drawing-layout">
      <div className="drawing-graph-wrap">
        <div className="drawing-current-task" aria-live="polite">
          {complete ? <><strong>¡Trayectoria completa!</strong><span>Seguí la curva desde el inicio hasta el aterrizaje.</span></> : <><strong>Punto {stepIndex + 1} de {challenge.points.length}</strong><span>Marcá la altura cuando x = {format(activePoint.x)} m</span></>}
        </div>
        <Graph challenge={challenge} stepIndex={stepIndex} markedPoints={markedPoints} hintShown={hintShown} onPlot={plotPoint} />
        <div className="drawing-legend" aria-label="Puntos de referencia">
          <span><i className="drawing-legend-start" />Inicio</span><span><i className="drawing-legend-apex" />Punto más alto</span><span><i className="drawing-legend-finish" />Aterrizaje</span><span><i className="drawing-legend-student" />Tus puntos</span>
        </div>
      </div>
      <aside className="drawing-help">
        <h3>¿Cómo lo hago?</h3>
        <p>La línea vertical marca la distancia que te toca. Tocá la cuadrícula a esa distancia y elegí la altura que te parezca correcta.</p>
        {hintShown && activePoint && <p className="drawing-hint-answer" role="status">Pista: a esa distancia, la altura es cerca de <strong>{format(activePoint.y)} m</strong>. La línea horizontal muestra dónde.</p>}
        {feedback && <p className={`drawing-feedback ${feedback.correct ? 'is-correct' : 'is-retry'}`} role="status">{feedback.text}</p>}
        {!complete && <button type="button" className="btn btn-secondary drawing-hint-button" onClick={() => { setHintShown(true); setFeedback(null); }}>Mostrar pista</button>}
        {complete && <button type="button" className="btn btn-primary" onClick={() => reset((level + 1) % 2)}>Practicar otro ángulo</button>}
        <small>Modelo ideal: sin resistencia del aire. Distancias en metros.</small>
      </aside>
    </div>
  </section>;
}
