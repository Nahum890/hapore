import { useMemo } from 'react';
import { createLaunch, evaluateTrajectory, maxHeight, range, timeOfFlight } from '../physics/projectileMotion.js';
import { launchErrors } from '../utils/lessons.js';

const VALUE_LABELS = {
  v0: 'Velocidad inicial', angle: 'Ángulo', angleA: 'Primer ángulo', angleB: 'Segundo ángulo',
  gravity: 'Gravedad', vx: 'Velocidad horizontal', t: 'Tiempo', targetDistance: 'Distancia objetivo',
};
const VALUE_UNITS = { v0: ' m/s', vx: ' m/s', gravity: ' m/s²', t: ' s', targetDistance: ' m' };

const fmt = value => new Intl.NumberFormat('es-PY', { maximumFractionDigits: 2 }).format(value);

function describeLaunch(v0, angle, gravity) {
  const launch = createLaunch(Number(v0), Number(angle), { gravity: Number(gravity) });
  const duration = timeOfFlight(launch);
  const points = evaluateTrajectory(launch, { step: Math.max(duration / 120, 0.001) });
  return { distance: range(launch), height: maxHeight(launch), duration, points };
}

/** Trayectoria con los valores elegidos por el docente, sin topes: la escala
 * se ajusta al vuelo más grande. Opcionalmente dibuja un segundo lanzamiento
 * para comparar (por ejemplo, 30° contra 60°). */
export function Trajectory({ v0, angle, gravity, compare = null, large = false }) {
  const errors = launchErrors({ v0, angle, gravity });
  const compareErrors = compare ? launchErrors({ v0: compare.v0, angle: compare.angle, gravity }) : {};
  const valid = !Object.keys(errors).length;
  const showCompare = Boolean(compare) && valid && !Object.keys(compareErrors).length;

  const data = useMemo(() => {
    if (!valid) return null;
    const main = describeLaunch(v0, angle, gravity);
    const other = showCompare ? describeLaunch(compare.v0, compare.angle, gravity) : null;
    const width = 960, chartHeight = large ? 440 : 300, padX = 42, padY = 34;
    const xMax = Math.max(main.distance, other?.distance ?? 0, 1) * 1.08;
    const yMax = Math.max(main.height, other?.height ?? 0, 1) * 1.18;
    const x = value => padX + value / xMax * (width - padX * 2);
    const y = value => chartHeight - padY - value / yMax * (chartHeight - padY * 2);
    const toPath = points => points.map((point, index) => `${index ? 'L' : 'M'} ${x(point.x).toFixed(1)} ${y(point.y).toFixed(1)}`).join(' ');
    return { main, other, x, y, width, chartHeight, padX, padY, mainPath: toPath(main.points), otherPath: other ? toPath(other.points) : '' };
  }, [valid, showCompare, v0, angle, gravity, compare?.v0, compare?.angle, large]);

  if (!data) {
    return <p className="projector-empty">{Object.values(errors).join(' ')}</p>;
  }

  return <div className={'projector-trajectory' + (large ? ' is-large' : '')}>
    <svg viewBox={`0 0 ${data.width} ${data.chartHeight}`} role="img" aria-label={`Trayectoria: ${fmt(data.main.distance)} metros de alcance y ${fmt(data.main.height)} metros de altura máxima`}>
      <line x1={data.padX} y1={data.chartHeight - data.padY} x2={data.width - data.padX} y2={data.chartHeight - data.padY} className="trajectory-ground" />
      <line x1={data.padX} y1={data.padY} x2={data.padX} y2={data.chartHeight - data.padY} className="trajectory-axis" />
      {data.other && <path d={data.otherPath} className="trajectory-path trajectory-path-compare" />}
      <path d={data.mainPath} className="trajectory-path" />
      <circle cx={data.x(data.main.distance)} cy={data.y(0)} r={large ? 8 : 6} className="trajectory-finish" />
      <text x={data.x(data.main.distance)} y={data.y(0) - 12} textAnchor="middle" className="trajectory-label">{fmt(data.main.distance)} m</text>
    </svg>
    {data.other && <p className="trajectory-legend"><span className="legend-main">{fmt(v0)} m/s · {fmt(angle)}°</span><span className="legend-compare">{fmt(compare.v0)} m/s · {fmt(compare.angle)}° → {fmt(data.other.distance)} m</span></p>}
    <div className="projector-metrics" aria-label="Resultados de la simulación">
      <span><strong>{fmt(data.main.distance)} m</strong>Alcance</span>
      <span><strong>{fmt(data.main.height)} m</strong>Altura máxima</span>
      <span><strong>{fmt(data.main.duration)} s</strong>Tiempo de vuelo</span>
    </div>
  </div>;
}

function TitleSlide({ slide }) {
  return <div className="projector-slide lesson-title-slide">
    <span className="projector-kicker">Clase de Física</span>
    <h2>{slide.title || 'Sin título'}</h2>
    {slide.subtitle && <p>{slide.subtitle}</p>}
  </div>;
}

function TextSlide({ slide }) {
  const lines = String(slide.body ?? '').split('\n').map(line => line.trim()).filter(Boolean);
  const isList = lines.length > 1 && lines.every(line => /^[-•*]\s*/.test(line));
  return <div className="projector-slide lesson-text-slide">
    {slide.title && <h2>{slide.title}</h2>}
    {isList
      ? <ul>{lines.map((line, index) => <li key={index}>{line.replace(/^[-•*]\s*/, '')}</li>)}</ul>
      : lines.map((line, index) => <p key={index}>{line}</p>)}
    {!slide.title && !lines.length && <p className="projector-empty">Diapositiva vacía</p>}
  </div>;
}

function ConceptSlide({ concept }) {
  if (!concept) return <p className="projector-empty">Elegí un concepto para esta diapositiva.</p>;
  return <div className="projector-slide projector-concept-slide">
    <span className="projector-kicker">Movimiento parabólico</span>
    <h2>{concept.name}</h2>
    <p>{concept.definition}</p>
    {concept.formula && <div className="projector-formula">{concept.formula}</div>}
  </div>;
}

function ExerciseSlide({ exercise, showAnswer, onToggleAnswer }) {
  if (!exercise) return <p className="projector-empty">Elegí un ejercicio para esta diapositiva (si era un ejercicio propio, pudo haberse eliminado).</p>;
  return <div className="projector-slide projector-exercise-slide">
    <span className="projector-kicker">{exercise.custom ? 'Ejercicio propio' : 'Ejercicio'} · {exercise.difficulty || 'Práctica'}</span>
    <h2>{exercise.question}</h2>
    <div className="projector-given-values">
      {Object.entries(exercise.values ?? {}).map(([key, value]) => <span key={key}><small>{VALUE_LABELS[key] ?? key}</small><strong>{value}{key.startsWith('angle') ? '°' : VALUE_UNITS[key] ?? ''}</strong></span>)}
    </div>
    {showAnswer && <p className="projector-answer">Respuesta: {exercise.correctAnswer} {exercise.unit}</p>}
    {onToggleAnswer && <button type="button" className="btn btn-secondary" onClick={onToggleAnswer}>{showAnswer ? 'Ocultar respuesta' : 'Mostrar respuesta'}</button>}
  </div>;
}

function SimulatorSlide({ slide, large }) {
  return <div className="projector-slide lesson-sim-slide">
    {slide.title && <h2>{slide.title}</h2>}
    <Trajectory
      v0={slide.v0}
      angle={slide.angle}
      gravity={slide.gravity}
      compare={slide.compare ? { v0: slide.v0B, angle: slide.angleB } : null}
      large={large}
    />
    <p className="lesson-sim-values">v0 = {fmt(Number(slide.v0) || 0)} m/s · ángulo = {fmt(Number(slide.angle) || 0)}° · g = {fmt(Number(slide.gravity) || 0)} m/s² · sin resistencia del aire</p>
  </div>;
}

export function SlideView({ slide, exercises, concepts, large = false, showAnswer = false, onToggleAnswer }) {
  if (!slide) return <p className="projector-empty">Esta clase todavía no tiene diapositivas.</p>;
  if (slide.type === 'titulo') return <TitleSlide slide={slide} />;
  if (slide.type === 'texto') return <TextSlide slide={slide} />;
  if (slide.type === 'concepto') return <ConceptSlide concept={concepts.find(item => item.id === slide.conceptId)} />;
  if (slide.type === 'ejercicio') return <ExerciseSlide exercise={exercises.find(item => item.id === slide.exerciseId)} showAnswer={showAnswer} onToggleAnswer={onToggleAnswer} />;
  if (slide.type === 'simulador') return <SimulatorSlide slide={slide} large={large} />;
  return <p className="projector-empty">Tipo de diapositiva desconocido.</p>;
}

export function slideSummary(slide, exercises, concepts) {
  if (slide.type === 'titulo') return slide.title || 'Portada';
  if (slide.type === 'texto') return slide.title || String(slide.body ?? '').split('\n')[0] || 'Texto';
  if (slide.type === 'concepto') return concepts.find(item => item.id === slide.conceptId)?.name ?? 'Concepto sin elegir';
  if (slide.type === 'ejercicio') return exercises.find(item => item.id === slide.exerciseId)?.question ?? 'Ejercicio sin elegir';
  if (slide.type === 'simulador') return slide.title || `${slide.v0} m/s · ${slide.angle}°`;
  return slide.type;
}
