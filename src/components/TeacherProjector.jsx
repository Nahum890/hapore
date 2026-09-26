import { useEffect, useMemo, useRef, useState } from 'react';
import { createLaunch, evaluateTrajectory, maxHeight, range, timeOfFlight } from '../physics/projectileMotion.js';
import { concepts as conceptCatalog, exercises as exerciseCatalog, localizeCatalogItem } from '../data/catalogs.js';
import { useTranslation } from '../i18n/LanguageProvider.jsx';

const MODES = [
  { id: 'simulador', label: 'Simulador' },
  { id: 'ejercicio', label: 'Ejercicio' },
  { id: 'concepto', label: 'Concepto' },
];

const VALUE_LABELS = {
  v0: 'Velocidad inicial', angle: 'Ángulo', angleA: 'Primer ángulo', angleB: 'Segundo ángulo',
  gravity: 'Gravedad', vx: 'Velocidad horizontal', t: 'Tiempo', targetDistance: 'Distancia objetivo',
};

function Trajectory({ v0, angle, gravity, large = false }) {
  const launch = useMemo(() => createLaunch(Number(v0), Number(angle), { gravity: Number(gravity) }), [v0, angle, gravity]);
  const data = useMemo(() => {
    const distance = range(launch);
    const height = maxHeight(launch);
    const points = evaluateTrajectory(launch, { step: Math.max(0.04, timeOfFlight(launch) / 100) });
    const width = 960, chartHeight = large ? 440 : 300, padX = 42, padY = 34;
    const xMax = Math.max(distance * 1.08, 1), yMax = Math.max(height * 1.18, 1);
    const x = value => padX + value / xMax * (width - padX * 2);
    const y = value => chartHeight - padY - value / yMax * (chartHeight - padY * 2);
    const path = points.map((point, index) => `${index ? 'L' : 'M'} ${x(point.x).toFixed(1)} ${y(point.y).toFixed(1)}`).join(' ');
    return { launch, distance, height, duration: timeOfFlight(launch), path, x, y, width, chartHeight, padX, padY };
  }, [launch, large]);

  return <div className={'projector-trajectory' + (large ? ' is-large' : '')}>
    <svg viewBox={`0 0 ${data.width} ${data.chartHeight}`} role="img" aria-label={`Trayectoria: ${data.distance.toFixed(1)} metros de alcance y ${data.height.toFixed(1)} metros de altura máxima`}>
      <line x1={data.padX} y1={data.chartHeight - data.padY} x2={data.width - data.padX} y2={data.chartHeight - data.padY} className="trajectory-ground" />
      <line x1={data.padX} y1={data.padY} x2={data.padX} y2={data.chartHeight - data.padY} className="trajectory-axis" />
      <path d={data.path} className="trajectory-path" />
      <circle cx={data.x(data.distance)} cy={data.y(0)} r={large ? 8 : 6} className="trajectory-finish" />
      <text x={data.x(data.distance)} y={data.y(0) - 12} textAnchor="middle" className="trajectory-label">{data.distance.toFixed(1)} m</text>
    </svg>
    <div className="projector-metrics" aria-label="Resultados de la simulación">
      <span><strong>{data.distance.toFixed(1)} m</strong>Alcance</span>
      <span><strong>{data.height.toFixed(1)} m</strong>Altura máxima</span>
      <span><strong>{data.duration.toFixed(1)} s</strong>Tiempo de vuelo</span>
    </div>
  </div>;
}

function ExerciseSlide({ exercise, showAnswer, onToggleAnswer, language }) {
  if (!exercise) return <p className="projector-empty">No hay ejercicios disponibles.</p>;
  return <div className="projector-slide projector-exercise-slide">
    <span className="projector-kicker">{exercise.topic || 'Ejercicio'} · {exercise.difficulty || 'Práctica'}</span>
    <h2>{exercise.question}</h2>
    <div className="projector-given-values">
      {Object.entries(exercise.values ?? {}).map(([key, value]) => <span key={key}><small>{VALUE_LABELS[key] ?? key}</small><strong>{value}{key.startsWith('angle') ? '°' : key === 'v0' || key === 'vx' ? ' m/s' : key === 'gravity' ? ' m/s²' : key === 't' ? ' s' : key === 'targetDistance' ? ' m' : ''}</strong></span>)}
    </div>
    {language !== 'es' && <p className="projector-language-note">Jopara</p>}
    {showAnswer && <p className="projector-answer">Respuesta: {exercise.correctAnswer} {exercise.unit}</p>}
    <button type="button" className="btn btn-secondary" onClick={onToggleAnswer}>{showAnswer ? 'Ocultar respuesta' : 'Mostrar respuesta'}</button>
  </div>;
}

function ConceptSlide({ concept }) {
  if (!concept) return <p className="projector-empty">No hay conceptos disponibles.</p>;
  return <div className="projector-slide projector-concept-slide">
    <span className="projector-kicker">Movimiento parabólico</span>
    <h2>{concept.name}</h2>
    <p>{concept.definition}</p>
    {concept.formula && <div className="projector-formula">{concept.formula}</div>}
  </div>;
}

export default function TeacherProjector({ exercises: exercisesProp }) {
  const { language } = useTranslation();
  const exercises = useMemo(() => (exercisesProp ?? exerciseCatalog).map(item => localizeCatalogItem(item, language)), [exercisesProp, language]);
  const concepts = useMemo(() => conceptCatalog.map(item => localizeCatalogItem(item, language)), [language]);
  const [mode, setMode] = useState('simulador');
  const [v0, setV0] = useState(20);
  const [angle, setAngle] = useState(45);
  const [gravity, setGravity] = useState(10);
  const [exerciseId, setExerciseId] = useState(exercises[0]?.id ?? '');
  const [conceptId, setConceptId] = useState(concepts[0]?.id ?? '');
  const [showAnswer, setShowAnswer] = useState(false);
  const [projecting, setProjecting] = useState(false);
  const baseViewRef = useRef(null);
  const exercise = exercises.find(item => item.id === exerciseId) ?? exercises[0];
  const concept = concepts.find(item => item.id === conceptId) ?? concepts[0];

  useEffect(() => {
    if (baseViewRef.current) {
      baseViewRef.current.inert = projecting;
      baseViewRef.current.setAttribute('aria-hidden', String(projecting));
    }
    return () => {
      if (baseViewRef.current) {
        baseViewRef.current.inert = false;
        baseViewRef.current.removeAttribute('aria-hidden');
      }
    };
  }, [projecting]);

  useEffect(() => {
    if (!projecting) return undefined;
    const closeOnEscape = event => { if (event.key === 'Escape') setProjecting(false); };
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = oldOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [projecting]);

  const changeMode = nextMode => { setMode(nextMode); setShowAnswer(false); };
  const content = mode === 'simulador'
    ? <Trajectory v0={v0} angle={angle} gravity={gravity} large={projecting} />
    : mode === 'ejercicio'
      ? <ExerciseSlide exercise={exercise} showAnswer={showAnswer} onToggleAnswer={() => setShowAnswer(value => !value)} language={language} />
      : <ConceptSlide concept={concept} />;

  return <>
    <section ref={baseViewRef} className="card teacher-projector" aria-labelledby="teacher-projector-title">
    <div className="projector-heading">
      <div><span className="panel-eyebrow">PARA MOSTRAR EN CLASE</span><h2 id="teacher-projector-title">Proyector</h2><p>Elegí qué querés compartir y abrí la vista grande.</p></div>
      <button type="button" className="btn btn-primary" onClick={() => setProjecting(true)}>Abrir proyección</button>
    </div>

    <div className="projector-mode-picker" role="group" aria-label="Qué querés proyectar">
      {MODES.map(item => <button key={item.id} type="button" className={mode === item.id ? 'is-active' : ''} aria-pressed={mode === item.id} onClick={() => changeMode(item.id)}>{item.label}</button>)}
    </div>

    {mode === 'simulador' && <div className="projector-controls" aria-label="Ajustes del lanzamiento">
      <label>Velocidad inicial <strong>{v0} m/s</strong><input type="range" min="5" max="50" step="1" value={v0} onChange={event => setV0(Number(event.target.value))} /></label>
      <label>Ángulo <strong>{angle}°</strong><input type="range" min="5" max="85" step="1" value={angle} onChange={event => setAngle(Number(event.target.value))} /></label>
      <label>Gravedad <select value={gravity} onChange={event => setGravity(Number(event.target.value))}><option value="10">10 m/s² · convención escolar</option><option value="9.8">9,8 m/s² · estándar</option></select></label>
    </div>}

    {mode === 'ejercicio' && <label className="teacher-field projector-select">Elegí un ejercicio
      <select value={exercise?.id ?? ''} onChange={event => { setExerciseId(event.target.value); setShowAnswer(false); }}>
        {exercises.map(item => <option key={item.id} value={item.id}>{item.custom ? 'Propio · ' : ''}{item.question}</option>)}
      </select>
    </label>}
    {mode === 'concepto' && <label className="teacher-field projector-select">Elegí un concepto de movimiento parabólico
      <select value={concept?.id ?? ''} onChange={event => setConceptId(event.target.value)}>
        {concepts.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select>
    </label>}

    <div className="projector-preview" aria-live="polite">
      <span className="projector-preview-label">Vista previa</span>
      {content}
    </div>

    </section>
    {projecting && <div className="projector-stage" role="dialog" aria-modal="true" aria-label="Vista de proyección">
      <div className="projector-stage-toolbar"><span>{mode === 'simulador' ? 'Simulador' : mode === 'ejercicio' ? 'Ejercicio' : 'Concepto'} · Movimiento parabólico</span><button type="button" className="btn btn-secondary" autoFocus onClick={() => setProjecting(false)}>Volver al aula <kbd>Esc</kbd></button></div>
      <div className="projector-stage-content">{content}</div>
    </div>}
  </>;
}
