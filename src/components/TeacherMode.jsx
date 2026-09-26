import { lazy, Suspense, useMemo, useState } from 'react';
const TeacherProjector = lazy(() => import('./TeacherProjector.jsx'));
import { encodeClassConfig, decodeClassConfig } from '../utils/classCode.js';
import { exercises, flashcards as flashcardsData, quizBank } from '../data/catalogs.js';
import { getCustomExercises } from '../utils/customExercises.js';
import CustomExerciseForm from './CustomExerciseForm.jsx';
import StudentRoster from './StudentRoster.jsx';
import { registerClassCode } from '../utils/classroom.js';

const SUBTEMAS = [
  { id: 'dron', label: 'Dron' },
  { id: 'basketball', label: 'Básquetbol' },
  { id: 'wall', label: 'Paredón' },
];

const TOOLS = [
  { id: 'clase', label: 'Compartir clase', description: 'Elegí situaciones y creá un código.' },
  { id: 'ejercicios', label: 'Crear ejercicio', description: 'Prepará un problema propio.' },
  { id: 'proyector', label: 'Proyectar', description: 'Mostrá una simulación, ejercicio o concepto.' },
];

export function validClassCode(text) {
  const code = String(text ?? '').trim().toUpperCase();
  const config = decodeClassConfig(code);
  return config && encodeClassConfig(config) === code ? config : null;
}

function ClassSetup({ allExercises, teacherId, classConfig, onLeaveClass }) {
  return <section className="card teacher-tool-panel" aria-label="Compartir configuración de clase">
    <span className="panel-eyebrow">PASO A PASO</span>
    <h2>Compartí una clase</h2>
    <p className="teacher-note">Elegí las situaciones y creá un código para que tus alumnos tengan los mismos materiales.</p>
    {classConfig ? <div className="teacher-block">
      <p>Esta cuenta tiene una configuración de clase guardada.</p>
      <p className="class-code-display">Código <strong>{encodeClassConfig(classConfig)}</strong></p>
      <button type="button" className="btn btn-secondary" onClick={onLeaveClass}>Quitar configuración</button>
    </div> : <TeacherControls allExercises={allExercises} teacherId={teacherId} />}
    <details className="teacher-roster-details"><summary>Alumnos en esta computadora</summary>
      <p className="field-help">La app guarda los datos aquí. No recibe avances de alumnos conectados desde otros dispositivos.</p>
      <StudentRoster teacherId={teacherId} />
    </details>
  </section>;
}

export default function TeacherMode({ classConfig, onJoinClass, teacherId }) {
  const [tool, setTool] = useState('clase');
  const [customExercises, setCustomExercises] = useState(getCustomExercises);
  const refreshCustomExercises = () => setCustomExercises(getCustomExercises());
  const allExercises = useMemo(() => [...exercises, ...customExercises], [customExercises]);

  return <section className="teacher-hub" aria-label="Herramientas para docentes">
    <div className="teacher-tool-picker" role="group" aria-label="Elegí una herramienta">
      {TOOLS.map(item => <button key={item.id} type="button" className={tool === item.id ? 'is-active' : ''} aria-pressed={tool === item.id} onClick={() => setTool(item.id)}>
        <strong>{item.label}</strong><span>{item.description}</span>
      </button>)}
    </div>

    <div hidden={tool !== 'clase'}><ClassSetup allExercises={allExercises} teacherId={teacherId} classConfig={classConfig} onLeaveClass={() => onJoinClass?.(null)} /></div>
    <section hidden={tool !== 'ejercicios'} className="card teacher-tool-panel" aria-label="Crear ejercicios propios">
      <span className="panel-eyebrow">EJERCICIOS PROPIOS</span><h2>Armá un ejercicio</h2>
      <p className="teacher-note">Completá el enunciado y los datos. La respuesta se calcula sola.</p>
      <CustomExerciseForm exercises={customExercises} onChange={refreshCustomExercises} />
    </section>
    <div hidden={tool !== 'proyector'}><Suspense fallback={<p className="teacher-note">Cargando proyector…</p>}>
      <TeacherProjector exercises={allExercises} />
    </Suspense></div>
  </section>;
}

function TeacherControls({ allExercises = exercises, teacherId }) {
  const totalCards = flashcardsData.length + quizBank.filter(item => item.tipo === 'abierta').length;
  const availableExercises = Math.min(10, allExercises.length);
  const availableCards = Math.min(20, totalCards);
  const [flashcards, setFlashcards] = useState(Math.min(10, availableCards));
  const [exerciseCount, setExerciseCount] = useState(Math.min(3, availableExercises));
  const [subtopics, setSubtopics] = useState(SUBTEMAS.map(item => item.id));
  const [code, setCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const config = useMemo(() => ({ flashcards: Number(flashcards), ejercicios: Number(exerciseCount), subtemas: subtopics }), [flashcards, exerciseCount, subtopics]);
  const valid = Number.isInteger(config.flashcards) && config.flashcards >= 5 && config.flashcards <= availableCards
    && Number.isInteger(config.ejercicios) && config.ejercicios >= 1 && config.ejercicios <= availableExercises
    && subtopics.length > 0;
  const nextCode = valid ? encodeClassConfig(config) : '';

  const toggle = id => {
    setCode(''); setCopied(false); setError('');
    setSubtopics(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);
  };

  const createCode = event => {
    event.preventDefault();
    if (!valid) return;
    setCode(nextCode); setCopied(false); setError('');
    registerClassCode({ teacherId, code: nextCode, config });
  };

  const copyCode = async () => {
    try { await navigator.clipboard.writeText(code); setCopied(true); setError(''); }
    catch { setCopied(false); setError('No se pudo copiar. Seleccioná el código y copialo.'); }
  };

  const updateCount = (setter, value) => { setter(value); setCode(''); setCopied(false); };

  return <form className="teacher-block class-setup-form" onSubmit={createCode}>
    <fieldset className="teacher-topic-picker"><legend>1. ¿Qué van a practicar?</legend>
      <div className="teacher-topic-options">{SUBTEMAS.map(item => <button key={item.id} type="button" aria-pressed={subtopics.includes(item.id)} className={subtopics.includes(item.id) ? 'is-selected' : ''} onClick={() => toggle(item.id)}>{item.label}</button>)}</div>
      <small>Podés elegir más de una situación.</small>
    </fieldset>

    <details className="class-quantity-options"><summary>Ajustar cantidad de tarjetas y ejercicios</summary>
      <label className="teacher-field">Tarjetas de repaso<input className="quiz-input" type="number" min="5" max={availableCards} step="1" value={flashcards} onChange={event => updateCount(setFlashcards, event.target.value)} /></label>
      <label className="teacher-field">Ejercicios prácticos<input className="quiz-input" type="number" min="1" max={availableExercises} step="1" value={exerciseCount} onChange={event => updateCount(setExerciseCount, event.target.value)} /></label>
      <small>Dejá los valores sugeridos si no necesitás cambiarlos.</small>
    </details>

    {!subtopics.length && <p className="field-error">Elegí al menos una situación.</p>}
    {!valid && subtopics.length > 0 && <p className="field-error">Revisá la cantidad de tarjetas y ejercicios disponibles.</p>}
    {!code && <button type="submit" className="btn btn-primary" disabled={!valid}>2. Crear código</button>}
    {code && <div className="class-code-result" role="status">
      <span className="panel-eyebrow">LISTO PARA COMPARTIR</span>
      <p className="class-code-display">Código de clase <strong>{code}</strong></p>
      <button type="button" className="btn btn-primary" onClick={copyCode}>{copied ? 'Código copiado' : 'Copiar código'}</button>
      <p className="field-help">El alumno escribe este código en “Mi clase”. Los materiales se ajustan en su dispositivo; el progreso no se envía a esta pantalla.</p>
      <button type="button" className="btn btn-secondary" onClick={() => { setCode(''); setCopied(false); }}>Crear otro código</button>
    </div>}
    {error && <p className="teacher-error" role="alert">{error}</p>}
  </form>;
}
