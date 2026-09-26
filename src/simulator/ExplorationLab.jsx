import { useEffect, useId, useMemo, useState } from 'react';
import activitiesData from '../data/explorationLabActivities.json' with { type: 'json' };
import { createLaunch, evaluateTrajectory, maxHeight, positionAt, range, timeOfFlight } from '../physics/projectileMotion.js';
import './ExplorationLab.css';

const CHART = { width: 760, height: 310, left: 48, right: 18, top: 18, bottom: 40 };
const TIME_CHART = { width: 560, height: 220, left: 54, right: 16, top: 16, bottom: 34 };

function launchFrom(values) {
  return createLaunch(values.v0, values.angle, { gravity: values.gravity, y0: values.y0 ?? 0 });
}

function metrics(launch) {
  return {
    range: range(launch),
    height: maxHeight(launch),
    time: timeOfFlight(launch),
    vx: launch.vx,
    vy: launch.vy,
  };
}

function number(value) {
  return new Intl.NumberFormat('es-PY', { maximumFractionDigits: 2 }).format(Number.isFinite(value) ? value : 0);
}

function Plot({ launches, elapsed = 0, labels = [] }) {
  const plotId = useId().replace(/:/g, '');
  const samples = launches.map(launch => evaluateTrajectory(launch, { step: 0.08 }));
  const allPoints = samples.flat();
  const maxX = Math.max(5, ...allPoints.map(point => point.x)) * 1.08;
  const maxY = Math.max(2, ...allPoints.map(point => point.y)) * 1.16;
  const graphWidth = CHART.width - CHART.left - CHART.right;
  const graphHeight = CHART.height - CHART.top - CHART.bottom;
  const x = value => CHART.left + (value / maxX) * graphWidth;
  const y = value => CHART.height - CHART.bottom - (value / maxY) * graphHeight;
  const current = Number.isFinite(elapsed) && launches[0] ? positionAt(launches[0], Math.min(elapsed, timeOfFlight(launches[0]))) : null;
  const colors = ['exploration-path-a', 'exploration-path-b'];
  return <figure className="exploration-plot">
    <svg viewBox={`0 0 ${CHART.width} ${CHART.height}`} role="img" aria-labelledby={`exploration-plot-title-${plotId} exploration-plot-desc-${plotId}`}>
      <title id={`exploration-plot-title-${plotId}`}>Trayectoria del lanzamiento</title>
      <desc id={`exploration-plot-desc-${plotId}`}>Gráfico de altura en metros frente a distancia horizontal en metros. La trayectoria se calcula con el motor de movimiento parabólico de la aplicación.</desc>
      {[0, 0.25, 0.5, 0.75, 1].map(fraction => <g className="exploration-gridline" key={fraction}>
        <line x1={CHART.left} x2={CHART.width - CHART.right} y1={y(maxY * fraction)} y2={y(maxY * fraction)} />
        <text x={CHART.left - 8} y={y(maxY * fraction) + 4} textAnchor="end">{number(maxY * fraction)}</text>
      </g>)}
      <line className="exploration-axis" x1={CHART.left} x2={CHART.width - CHART.right} y1={CHART.height - CHART.bottom} y2={CHART.height - CHART.bottom} />
      <line className="exploration-axis" x1={CHART.left} x2={CHART.left} y1={CHART.top} y2={CHART.height - CHART.bottom} />
      {samples.map((points, index) => <g key={index}>
        <polyline className={`exploration-path ${colors[index % colors.length]}`} points={points.map(point => `${x(point.x)},${y(point.y)}`).join(' ')} />
        <text className="exploration-legend" x={CHART.left + 12 + index * 115} y={CHART.top + 12}>{labels[index] ?? `Trayectoria ${index + 1}`}</text>
      </g>)}
      {current && <g className="exploration-projectile" transform={`translate(${x(current.x)} ${y(Math.max(0, current.y))})`}>
        <circle r="7" />
        <circle r="13" className="exploration-projectile-halo" />
      </g>}
      <text className="exploration-axis-label" x={CHART.width / 2} y={CHART.height - 5} textAnchor="middle">Distancia horizontal (m)</text>
      <text className="exploration-axis-label" transform={`translate(14 ${CHART.height / 2}) rotate(-90)`} textAnchor="middle">Altura (m)</text>
    </svg>
    <figcaption>Trayectoria ideal: gravedad constante y sin resistencia del aire.</figcaption>
  </figure>;
}

function MetricCards({ launch }) {
  const result = metrics(launch);
  return <div className="exploration-metrics" aria-label="Mediciones calculadas">
    <div><span>Alcance</span><strong>{number(result.range)} m</strong></div>
    <div><span>Altura máxima</span><strong>{number(result.height)} m</strong></div>
    <div><span>Tiempo hasta el suelo</span><strong>{number(result.time)} s</strong></div>
    <div><span>Velocidad horizontal</span><strong>{number(result.vx)} m/s</strong></div>
  </div>;
}

function KinematicsPlot({ launch, elapsed, kind }) {
  const id = useId().replace(/:/g, '');
  const total = timeOfFlight(launch);
  const samples = Array.from({ length: 41 }, (_, index) => {
    const t = total * index / 40;
    const position = positionAt(launch, t);
    return { t, x: position.x, y: position.y, vx: launch.vx, vy: launch.vy - launch.gravity * t };
  });
  const series = kind === 'position'
    ? [{ key: 'x', label: 'x(t)', color: 'exploration-path-a' }, { key: 'y', label: 'y(t)', color: 'exploration-path-b' }]
    : [{ key: 'vx', label: 'vx(t)', color: 'exploration-path-a' }, { key: 'vy', label: 'vy(t)', color: 'exploration-path-b' }];
  const allValues = samples.flatMap(point => series.map(line => point[line.key]));
  let minY = Math.min(0, ...allValues), maxY = Math.max(0, ...allValues);
  if (Math.abs(maxY - minY) < 0.001) { minY -= 1; maxY += 1; }
  const plotWidth = TIME_CHART.width - TIME_CHART.left - TIME_CHART.right;
  const plotHeight = TIME_CHART.height - TIME_CHART.top - TIME_CHART.bottom;
  const x = t => TIME_CHART.left + (total > 0 ? t / total : 0) * plotWidth;
  const y = value => TIME_CHART.top + ((maxY - value) / (maxY - minY)) * plotHeight;
  const currentT = Math.min(Math.max(0, elapsed ?? 0), total);
  const current = samples.reduce((best, point) => Math.abs(point.t - currentT) < Math.abs(best.t - currentT) ? point : best, samples[0]);
  const isPosition = kind === 'position';
  return <figure className="exploration-time-plot">
    <figcaption><strong>{isPosition ? 'Posición en el tiempo' : 'Velocidad en el tiempo'}</strong><span>{isPosition ? 'x(t), y(t) · metros' : 'vx(t), vy(t) · m/s'}</span></figcaption>
    <svg viewBox={`0 0 ${TIME_CHART.width} ${TIME_CHART.height}`} role="img" aria-labelledby={`kinematics-title-${id} kinematics-desc-${id}`}>
      <title id={`kinematics-title-${id}`}>{isPosition ? 'Gráfica de posición por tiempo' : 'Gráfica de velocidad por tiempo'}</title>
      <desc id={`kinematics-desc-${id}`}>{isPosition ? 'Posición horizontal y vertical del proyectil a lo largo del tiempo.' : 'Velocidad horizontal constante y velocidad vertical afectada por la gravedad.'}</desc>
      {[0, .25, .5, .75, 1].map(fraction => {
        const value = minY + (maxY - minY) * fraction;
        return <g className="exploration-gridline" key={fraction}><line x1={TIME_CHART.left} x2={TIME_CHART.width - TIME_CHART.right} y1={y(value)} y2={y(value)} /><text x={TIME_CHART.left - 7} y={y(value) + 3} textAnchor="end">{number(value)}</text></g>;
      })}
      <line className="exploration-axis" x1={TIME_CHART.left} x2={TIME_CHART.width - TIME_CHART.right} y1={TIME_CHART.height - TIME_CHART.bottom} y2={TIME_CHART.height - TIME_CHART.bottom} />
      <line className="exploration-axis" x1={TIME_CHART.left} x2={TIME_CHART.left} y1={TIME_CHART.top} y2={TIME_CHART.height - TIME_CHART.bottom} />
      {series.map(line => <g key={line.key}><polyline className={`exploration-path ${line.color}`} points={samples.map(point => `${x(point.t)},${y(point[line.key])}`).join(' ')} /><circle className="exploration-series-marker" cx={x(current.t)} cy={y(current[line.key])} r="4" /><text className="exploration-legend" x={TIME_CHART.left + (line.key === 'x' || line.key === 'vx' ? 12 : 105)} y={TIME_CHART.top + 10}>{line.label}</text></g>)}
      <text className="exploration-axis-label" x={TIME_CHART.width / 2} y={TIME_CHART.height - 4} textAnchor="middle">Tiempo (s)</text>
    </svg>
  </figure>;
}

function KinematicsCharts({ launch, elapsed }) {
  return <section className="exploration-kinematics" aria-label="Gráficos de posición y velocidad a lo largo del tiempo">
    <KinematicsPlot launch={launch} elapsed={elapsed} kind="position" />
    <KinematicsPlot launch={launch} elapsed={elapsed} kind="velocity" />
  </section>;
}

function ActivityLab() {
  const activities = activitiesData.activities ?? [];
  const [selectedId, setSelectedId] = useState(activities[0]?.id ?? '');
  const [prediction, setPrediction] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [reflection, setReflection] = useState('');
  const activity = activities.find(item => item.id === selectedId) ?? activities[0];
  const launchA = useMemo(() => activity ? launchFrom({ ...activity.launchA, y0: 0 }) : null, [activity]);
  const launchB = useMemo(() => activity ? launchFrom({ ...activity.launchB, y0: 0 }) : null, [activity]);

  useEffect(() => { setPrediction(''); setRevealed(false); setReflection(''); }, [selectedId]);
  if (!activity || !launchA || !launchB) return null;

  return <section className="exploration-activity card" aria-labelledby="exploration-activity-title">
    <div className="exploration-heading"><div><span className="panel-eyebrow">PREDICE · PRUEBA · EXPLICA</span><h3 id="exploration-activity-title">Investigación guiada</h3><p>Elegí una pregunta, deja registrada tu predicción y compará los dos lanzamientos.</p></div>
      <label className="exploration-activity-select">Actividad<select value={activity.id} onChange={event => setSelectedId(event.target.value)}>{activities.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
    </div>
    <div className="exploration-objective"><strong>Objetivo</strong><p>{activity.objective}</p></div>
    <ol className="exploration-instructions">{activity.instructions.map((instruction, index) => <li key={`${activity.id}-${index}`}>{instruction}</li>)}</ol>
    <div className="exploration-prediction">
      <label htmlFor="exploration-prediction">Antes de revelar las mediciones, ¿cuál crees que tendrá mayor alcance?</label>
      <select id="exploration-prediction" value={prediction} onChange={event => setPrediction(event.target.value)}>
        <option value="">Elegí una predicción</option><option value="A">Lanzamiento A</option><option value="B">Lanzamiento B</option><option value="igual">Serán aproximadamente iguales</option>
      </select>
      <button type="button" className="btn btn-primary" onClick={() => setRevealed(true)} disabled={!prediction}>Comparar la simulación</button>
    </div>
    {revealed && <div className="exploration-reveal" aria-live="polite">
      <Plot launches={[launchA, launchB]} labels={['Lanzamiento A', 'Lanzamiento B']} />
      <div className="exploration-comparison" role="table" aria-label="Comparación de mediciones de la actividad">
        <div role="row" className="exploration-comparison-head"><span role="columnheader">Medición</span><span role="columnheader">A</span><span role="columnheader">B</span></div>
        {[
          ['Rapidez inicial', number(activity.launchA.v0) + ' m/s', number(activity.launchB.v0) + ' m/s'],
          ['Ángulo', number(activity.launchA.angle) + '°', number(activity.launchB.angle) + '°'],
          ['Gravedad', number(activity.launchA.gravity) + ' m/s²', number(activity.launchB.gravity) + ' m/s²'],
          ['Alcance', number(metrics(launchA).range) + ' m', number(metrics(launchB).range) + ' m'],
          ['Altura máxima', number(metrics(launchA).height) + ' m', number(metrics(launchB).height) + ' m'],
          ['Tiempo de vuelo', number(metrics(launchA).time) + ' s', number(metrics(launchB).time) + ' s'],
        ].map(([label, a, b]) => <div role="row" key={label}><span role="cell">{label}</span><span role="cell">{a}</span><span role="cell">{b}</span></div>)}
      </div>
      <p className="exploration-explanation"><strong>Explicación para contrastar</strong><br />{activity.expectedExplanation}</p>
      <label className="exploration-reflection">{activity.exitTicket.question}<textarea value={reflection} onChange={event => setReflection(event.target.value)} rows="3" placeholder="Escribí qué evidencia observaste…" /></label>
    </div>}
  </section>;
}

export default function ExplorationLab() {
  const [values, setValues] = useState({ v0: 20, angle: 45, gravity: 9.8, y0: 0 });
  const [comparison, setComparison] = useState({ a: null, b: null });
  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState(false);
  const launch = useMemo(() => launchFrom(values), [values]);
  const result = useMemo(() => metrics(launch), [launch]);
  const comparedLaunches = [comparison.a?.launch, comparison.b?.launch].filter(Boolean);
  const chartLaunches = comparedLaunches.length ? comparedLaunches : [launch];
  const reducedMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => { setElapsed(value => Math.min(value, result.time)); }, [result.time]);
  useEffect(() => {
    if (!playing) return undefined;
    if (reducedMotion) { setElapsed(result.time); setPlaying(false); return undefined; }
    let frame = 0;
    const began = performance.now() - elapsed * 500;
    const tick = now => {
      const next = Math.min(result.time, (now - began) / 500);
      setElapsed(next);
      if (next >= result.time) setPlaying(false);
      else frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, reducedMotion, result.time]);

  const update = (key, value) => setValues(current => ({ ...current, [key]: Number(value) }));
  const saveA = () => setComparison({ a: { values: { ...values }, launch }, b: null });
  const saveB = () => setComparison(current => ({ ...current, b: { values: { ...values }, launch } }));
  const setFlightTime = value => { setPlaying(false); setElapsed(Number(value)); };
  const animate = () => {
    if (elapsed >= result.time) setElapsed(0);
    setPlaying(true);
  };

  return <div className="exploration-lab">
    <header className="exploration-lab-header card">
      <span className="panel-eyebrow">MOVIMIENTO PARABÓLICO · LABORATORIO</span>
      <h2>Explorá qué cambia en un lanzamiento</h2>
      <p>Ajustá una magnitud y observá cómo responde la trayectoria. La simulación calcula cada lanzamiento con el mismo motor físico que usa la app.</p>
      <p className="exploration-assumptions">Modelo ideal: sin resistencia del aire, gravedad constante y altura inicial medida desde el suelo.</p>
    </header>
    <section className="exploration-free card" aria-labelledby="exploration-free-title">
      <div className="exploration-heading"><div><span className="panel-eyebrow">EXPLORACIÓN LIBRE</span><h3 id="exploration-free-title">Cambiá los controles</h3><p>Los resultados y el gráfico se actualizan al mover cada control.</p></div></div>
      <div className="exploration-workspace">
        <div className="exploration-controls">
          <label><span>Rapidez inicial <strong>{number(values.v0)} m/s</strong></span><input type="range" min="5" max="40" step="0.5" value={values.v0} onChange={event => update('v0', event.target.value)} /></label>
          <label><span>Ángulo de salida <strong>{number(values.angle)}°</strong></span><input type="range" min="5" max="85" step="1" value={values.angle} onChange={event => update('angle', event.target.value)} /></label>
          <label><span>Gravedad <strong>{number(values.gravity)} m/s²</strong></span><input type="range" min="1.62" max="10" step="0.01" value={values.gravity} onChange={event => update('gravity', event.target.value)} /></label>
          <label><span>Altura inicial <strong>{number(values.y0)} m</strong></span><input type="range" min="0" max="20" step="0.5" value={values.y0} onChange={event => update('y0', event.target.value)} /></label>
          <div className="exploration-control-actions">
            {!comparison.a && <button type="button" className="btn btn-secondary" onClick={saveA}>Guardar como lanzamiento A</button>}
            {comparison.a && !comparison.b && <button type="button" className="btn btn-secondary" onClick={saveB}>Guardar el actual como B</button>}
            {comparison.a && <button type="button" className="btn btn-text" onClick={() => setComparison({ a: null, b: null })}>Borrar comparación</button>}
          </div>
        </div>
        <div className="exploration-visual">
          <Plot launches={chartLaunches} elapsed={comparedLaunches.length ? null : elapsed} labels={comparedLaunches.length ? ['Lanzamiento A', 'Lanzamiento B'] : ['Lanzamiento actual']} />
          <KinematicsCharts launch={launch} elapsed={elapsed} />
          {!comparedLaunches.length && <MetricCards launch={launch} />}
          {comparedLaunches.length === 2 && <div className="exploration-metric-comparison">
            {[
              ['Alcance', metrics(comparison.a.launch).range, metrics(comparison.b.launch).range, 'm'],
              ['Altura máxima', metrics(comparison.a.launch).height, metrics(comparison.b.launch).height, 'm'],
              ['Tiempo de vuelo', metrics(comparison.a.launch).time, metrics(comparison.b.launch).time, 's'],
            ].map(([label, a, b, unit]) => <p key={label}><span>{label}</span><strong>A {number(a)} {unit}</strong><strong>B {number(b)} {unit}</strong></p>)}
          </div>}
          {!comparedLaunches.length && <div className="exploration-time-controls">
            <label htmlFor="exploration-time">Tiempo del vuelo <strong>{number(elapsed)} s</strong></label>
            <input id="exploration-time" type="range" min="0" max={Math.max(0.01, result.time)} step="0.02" value={Math.min(elapsed, result.time)} onChange={event => setFlightTime(event.target.value)} />
            <button type="button" className="btn btn-primary" onClick={playing ? () => setPlaying(false) : animate}>{playing ? 'Pausar recorrido' : elapsed > 0 && elapsed < result.time ? 'Continuar recorrido' : 'Reproducir recorrido'}</button>
            <button type="button" className="btn btn-text" onClick={() => { setPlaying(false); setElapsed(0); }}>Volver al inicio</button>
          </div>}
        </div>
      </div>
    </section>
    <ActivityLab />
    <p className="exploration-review-note">Las actividades guiadas están en revisión de contenido. La explicación científica y el vocabulario Jopara requieren validación docente y lingüística antes de marcarse como aprobados.</p>
  </div>;
}
