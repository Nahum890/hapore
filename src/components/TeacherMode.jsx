import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
const LessonStudio = lazy(() => import('./LessonStudio.jsx'));
import { encodeClassConfig, decodeClassConfig } from '../utils/classCode.js';
import { exercises, flashcards as flashcardsData, quizBank } from '../data/catalogs.js';
import { getCustomExercises } from '../utils/customExercises.js';
import { createCustomFlashcard, deleteCustomFlashcard, getCustomFlashcards } from '../utils/customFlashcards.js';
import CustomExerciseForm from './CustomExerciseForm.jsx';
import StudentRoster from './StudentRoster.jsx';
import Avatar from './Avatars.jsx';
import ContactLinks from './ContactLinks.jsx';
import { registerClassCode } from '../utils/classroom.js';
import { isCloudConfigured } from '../cloud/cloudClient.js';
import { buildClassContent, createCloudClass, deleteCloudClass, listTeacherClasses } from '../cloud/classCloud.js';

const SUBTEMAS = [
  { id: 'dron', label: 'Dron' },
  { id: 'basketball', label: 'Básquetbol' },
  { id: 'wall', label: 'Paredón' },
];

const TOOLS = [
  { id: 'clase', label: 'Compartir clase', description: 'Elegí materiales y creá una clase con seguimiento.' },
  { id: 'ejercicios', label: 'Crear ejercicio', description: 'Prepará un problema propio.' },
  { id: 'clases', label: 'Mis clases', description: 'Prepará diapositivas y proyectalas.' },
];

export function validClassCode(text) {
  const code = String(text ?? '').trim().toUpperCase();
  const config = decodeClassConfig(code);
  return config && encodeClassConfig(config) === code ? config : null;
}

const formatWhen = iso => { if (!iso) return 'todavía no'; try { return new Date(iso).toLocaleString('es-PY', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch { return iso; } };

function CustomCardForm({ onCreated }) {
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [formula, setFormula] = useState('');
  const [error, setError] = useState('');
  // No es un <form>: vive dentro del formulario de la clase y los formularios
  // anidados son HTML inválido (el navegador terminaba enviando la página).
  const save = () => {
    try {
      const card = createCustomFlashcard({ front, back, formula });
      setFront(''); setBack(''); setFormula(''); setError('');
      onCreated(card);
    } catch (failure) { setError(failure.message); }
  };
  const onEnter = event => { if (event.key === 'Enter') { event.preventDefault(); save(); } };
  return <div className="teacher-block custom-card-form" role="group" aria-label="Nueva tarjeta propia" onKeyDown={event => { if (event.target.tagName === 'INPUT') onEnter(event); }}>
    <h4>Nueva tarjeta propia</h4>
    <label className="teacher-field">Pregunta (frente)<input className="quiz-input" value={front} onChange={event => setFront(event.target.value)} maxLength={300} placeholder="Ej.: ¿Por qué vx no cambia durante el vuelo?" /></label>
    <label className="teacher-field">Respuesta (dorso)<textarea className="quiz-input" rows={2} value={back} onChange={event => setBack(event.target.value)} maxLength={600} placeholder="Ej.: Porque no hay aceleración horizontal si despreciamos el aire." /></label>
    <label className="teacher-field">Fórmula (opcional)<input className="quiz-input" value={formula} onChange={event => setFormula(event.target.value)} maxLength={160} placeholder="Ej.: vx = v0 · cos(ángulo)" /></label>
    {error && <p className="field-error" role="alert">{error}</p>}
    <button type="button" className="btn btn-secondary" onClick={save}>Guardar tarjeta</button>
  </div>;
}

function CardPicker({ cards, selected, onChange, customIds, onDeleteCustom }) {
  const toggle = id => onChange(selected.includes(id) ? selected.filter(item => item !== id) : [...selected, id]);
  return <fieldset className="card-picker"><legend>Tarjetas para compartir ({selected.length} de {cards.length})</legend>
    <div className="card-picker-actions">
      <button type="button" className="btn btn-secondary" onClick={() => onChange(cards.map(card => card.id))}>Elegir todas</button>
      <button type="button" className="btn btn-secondary" onClick={() => onChange([])}>Ninguna</button>
    </div>
    <ul className="card-picker-list">{cards.map(card => <li key={card.id}>
      <label><input type="checkbox" checked={selected.includes(card.id)} onChange={() => toggle(card.id)} />
        <span><strong>{card.frente_es ?? card.front}</strong>{customIds.has(card.id) && <em className="chip">Propia</em>}<small>{card.dorso_concepto ?? card.back}</small></span>
      </label>
      {customIds.has(card.id) && <button type="button" className="card-picker-delete" aria-label={`Eliminar tarjeta propia: ${card.frente_es}`} onClick={() => onDeleteCustom(card.id)}>✕</button>}
    </li>)}</ul>
  </fieldset>;
}

function CloudClassList({ refreshKey }) {
  const [classes, setClasses] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmId, setConfirmId] = useState(null);
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setClasses(await listTeacherClasses()); }
    catch (failure) { setError(failure.offline ? 'Sin conexión: la lista de alumnos se actualiza cuando vuelva internet.' : `No se pudo cargar la lista: ${failure.message}`); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load, refreshKey]);
  useEffect(() => {
    window.addEventListener('online', load);
    return () => window.removeEventListener('online', load);
  }, [load]);

  return <section className="teacher-block cloud-class-list" aria-label="Tus clases y alumnos">
    <div className="cloud-class-list-head"><h3>Tus clases y alumnos</h3><button type="button" className="btn btn-secondary" onClick={load} disabled={loading}>{loading ? 'Actualizando…' : 'Actualizar'}</button></div>
    {error && <p className="field-error" role="status">{error}</p>}
    {classes && classes.length === 0 && <p className="field-help">Todavía no creaste clases en la nube.</p>}
    {classes?.map(item => <article key={item.id} className="cloud-class-card">
      <header>
        <div><strong>{item.title}</strong><span className="class-code-display">Código <strong>{item.code}</strong></span></div>
        {confirmId === item.id
          ? <span className="cloud-class-delete"><button type="button" className="btn btn-danger" onClick={async () => { try { await deleteCloudClass(item.id); } catch (failure) { setError(failure.message); } setConfirmId(null); load(); }}>Sí, eliminar</button><button type="button" className="btn btn-secondary" onClick={() => setConfirmId(null)}>Cancelar</button></span>
          : <button type="button" className="btn btn-secondary" onClick={() => setConfirmId(item.id)}>Eliminar clase</button>}
      </header>
      {item.class_members?.length
        ? <ul className="aula-list roster-list">{item.class_members.map(member => <li key={member.student_id} className="aula-item roster-item">
          <Avatar id={member.avatar} size={40} />
          <div className="roster-info">
            <h4>{member.display_name}</h4>
            <div className="roster-stats">
              <span className="chip">{member.xp} XP · Nivel {member.level}</span>
              <span className="chip">{member.correct} de {member.attempts} ejercicios bien</span>
              <span className="chip">{member.cards_consolidated} tarjetas dominadas</span>
              <span className="chip">Confianza {member.confidence}/100</span>
            </div>
            <ContactLinks person={member} />
            <small>Último avance recibido: {formatWhen(member.last_sync)}</small>
          </div>
        </li>)}</ul>
        : <p className="field-help">Todavía no se unió ningún alumno.</p>}
    </article>)}
  </section>;
}

function CloudClassSetup({ teacher, allExercises, customExercises }) {
  const [customCards, setCustomCards] = useState(getCustomFlashcards);
  const allCards = useMemo(() => [...flashcardsData, ...customCards], [customCards]);
  const customIds = useMemo(() => new Set(customCards.map(card => card.id)), [customCards]);
  const [title, setTitle] = useState('');
  const [subtopics, setSubtopics] = useState(SUBTEMAS.map(item => item.id));
  const [selectedCards, setSelectedCards] = useState(() => flashcardsData.map(card => card.id));
  const [selectedExercises, setSelectedExercises] = useState(() => customExercises.map(item => item.id));
  const [exerciseCount, setExerciseCount] = useState(3);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const pool = allExercises.filter(item => subtopics.includes(item.scenario) && (!item.custom || selectedExercises.includes(item.id)));
  const valid = subtopics.length > 0 && selectedCards.length >= 5 && Number(exerciseCount) >= 1 && Number(exerciseCount) <= pool.length && title.trim().length > 0;

  const toggleTopic = id => setSubtopics(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);
  const toggleExercise = id => setSelectedExercises(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);

  const submit = async event => {
    event.preventDefault();
    if (!valid || busy) return;
    setBusy(true); setError(''); setCopied(false);
    try {
      const cards = allCards.filter(card => selectedCards.includes(card.id));
      const sharedExercises = customExercises.filter(item => selectedExercises.includes(item.id) && subtopics.includes(item.scenario));
      const content = buildClassContent({ config: { subtemas: subtopics, ejercicios: Number(exerciseCount) }, cards, exercises: sharedExercises });
      const result = await createCloudClass({ title: title.trim(), teacherName: teacher.name, teacherAvatar: teacher.avatar, teacherPhone: teacher.phone, teacherEmail: teacher.email, content });
      setCreated(result);
      setRefreshKey(value => value + 1);
    } catch (failure) {
      setError(failure.offline ? 'Se necesita internet para crear la clase en la nube.' : `No se pudo crear la clase: ${failure.message}`);
    } finally { setBusy(false); }
  };

  const copy = async () => {
    try { await navigator.clipboard.writeText(created.code); setCopied(true); } catch { setError('No se pudo copiar. Seleccioná el código y copialo.'); }
  };

  return <>
    <form className="teacher-block class-setup-form" onSubmit={submit}>
      <label className="teacher-field">1. Nombre de la clase<input className="quiz-input" value={title} onChange={event => { setTitle(event.target.value); setCreated(null); }} maxLength={80} placeholder="Ej.: 3.º B · Tiro parabólico" /></label>
      <fieldset className="teacher-topic-picker"><legend>2. ¿Qué situaciones van a practicar?</legend>
        <div className="teacher-topic-options">{SUBTEMAS.map(item => <button key={item.id} type="button" aria-pressed={subtopics.includes(item.id)} className={subtopics.includes(item.id) ? 'is-selected' : ''} onClick={() => toggleTopic(item.id)}>{item.label}</button>)}</div>
      </fieldset>
      <div className="class-setup-step"><h4>3. Tarjetas de repaso</h4>
        <CardPicker cards={allCards} selected={selectedCards} onChange={ids => { setSelectedCards(ids); setCreated(null); }} customIds={customIds} onDeleteCustom={id => { deleteCustomFlashcard(id); setCustomCards(getCustomFlashcards()); setSelectedCards(current => current.filter(item => item !== id)); }} />
        <CustomCardForm onCreated={card => { setCustomCards(getCustomFlashcards()); setSelectedCards(current => [...current, card.id]); }} />
        {selectedCards.length < 5 && <p className="field-error">Elegí al menos 5 tarjetas.</p>}
      </div>
      <div className="class-setup-step"><h4>4. Ejercicios</h4>
        <label className="teacher-field">Cantidad de ejercicios para practicar (hay {pool.length} disponibles)<input className="quiz-input" type="number" min="1" max={Math.max(1, pool.length)} step="1" value={exerciseCount} onChange={event => setExerciseCount(event.target.value)} /></label>
        {customExercises.length > 0 && <fieldset className="card-picker"><legend>Incluir tus ejercicios propios</legend>
          <ul className="card-picker-list">{customExercises.map(item => <li key={item.id}><label><input type="checkbox" checked={selectedExercises.includes(item.id)} onChange={() => toggleExercise(item.id)} /><span><strong>{item.question}</strong><small>{SUBTEMAS.find(topic => topic.id === item.scenario)?.label ?? item.scenario}{!subtopics.includes(item.scenario) ? ' · situación no elegida' : ''}</small></span></label></li>)}</ul>
        </fieldset>}
      </div>
      {!title.trim() && <p className="field-help">Poné un nombre para identificar la clase.</p>}
      {error && <p className="teacher-error" role="alert">{error}</p>}
      {!created && <button type="submit" className="btn btn-primary" disabled={!valid || busy}>{busy ? 'Creando…' : '5. Crear clase y código'}</button>}
      {created && <div className="class-code-result" role="status">
        <span className="panel-eyebrow">LISTO PARA COMPARTIR</span>
        <p className="class-code-display">Código de clase <strong>{created.code}</strong></p>
        <button type="button" className="btn btn-primary" onClick={copy}>{copied ? 'Código copiado' : 'Copiar código'}</button>
        <p className="field-help">El alumno lo escribe en “Mi clase”, toca “Descargar clase” y ya puede resolver sin internet. Su avance te llega cuando tenga conexión.</p>
        <button type="button" className="btn btn-secondary" onClick={() => { setCreated(null); setTitle(''); }}>Crear otra clase</button>
      </div>}
    </form>
    <CloudClassList refreshKey={refreshKey} />
  </>;
}

function ClassSetup({ allExercises, customExercises, teacher, classConfig, onLeaveClass }) {
  const cloud = isCloudConfigured();
  return <section className="card teacher-tool-panel" aria-label="Compartir configuración de clase">
    <span className="panel-eyebrow">PASO A PASO</span>
    <h2>{cloud ? 'Compartí una clase' : 'Compartí una práctica'}</h2>
    <p className="teacher-note">{cloud
      ? 'Elegí qué tarjetas y ejercicios comparten tus alumnos. Ellos descargan la clase con el código, la resuelven aunque no tengan internet y su avance te llega acá.'
      : 'Elegí las situaciones y compartí un código de práctica. Sirve para aplicar la misma selección en otro dispositivo; no crea una clase sincronizada ni envía el progreso.'}</p>
    {cloud
      ? <CloudClassSetup teacher={teacher} allExercises={allExercises} customExercises={customExercises} />
      : <>
        <p className="field-help cloud-missing">La nube no está configurada. El código de práctica comparte cantidades y situaciones, pero no identifica una clase ni sincroniza alumnos o progreso. Para el seguimiento entre dispositivos, configurá Supabase; ver <code>supabase/README.md</code>.</p>
        {classConfig ? <div className="teacher-block">
      <p>Esta cuenta tiene una selección de práctica guardada.</p>
      <p className="class-code-display">Código de práctica <strong>{encodeClassConfig(classConfig)}</strong></p>
          <button type="button" className="btn btn-secondary" onClick={onLeaveClass}>Quitar configuración</button>
        </div> : <TeacherControls allExercises={allExercises} teacherId={teacher.id} />}
        <details className="teacher-roster-details"><summary>Alumnos en esta computadora</summary>
          <StudentRoster teacherId={teacher.id} />
        </details>
      </>}
  </section>;
}

export default function TeacherMode({ classConfig, onJoinClass, teacher }) {
  const [tool, setTool] = useState('clase');
  const cloudEnabled = isCloudConfigured();
  const [customExercises, setCustomExercises] = useState(getCustomExercises);
  const refreshCustomExercises = () => setCustomExercises(getCustomExercises());
  const allExercises = useMemo(() => [...exercises, ...customExercises], [customExercises]);

  return <section className="teacher-hub" aria-label="Herramientas para docentes">
    <div className="teacher-tool-picker" role="group" aria-label="Elegí una herramienta">
      {TOOLS.map(item => {
        const localPractice = item.id === 'clase' && !cloudEnabled;
        return <button key={item.id} type="button" className={tool === item.id ? 'is-active' : ''} aria-pressed={tool === item.id} onClick={() => setTool(item.id)}>
          <strong>{localPractice ? 'Compartir práctica' : item.label}</strong><span>{localPractice ? 'Compartí una selección de materiales, sin seguimiento sincronizado.' : item.description}</span>
        </button>;
      })}
    </div>

    <div hidden={tool !== 'clase'}><ClassSetup allExercises={allExercises} customExercises={customExercises} teacher={teacher} classConfig={classConfig} onLeaveClass={() => onJoinClass?.(null)} /></div>
    <section hidden={tool !== 'ejercicios'} className="card teacher-tool-panel" aria-label="Crear ejercicios propios">
      <span className="panel-eyebrow">EJERCICIOS PROPIOS</span><h2>Armá un ejercicio</h2>
      <p className="teacher-note">Completá el enunciado y los datos. La respuesta se calcula sola.</p>
      <CustomExerciseForm exercises={customExercises} onChange={refreshCustomExercises} />
    </section>
    <div hidden={tool !== 'clases'}><Suspense fallback={<p className="teacher-note">Cargando tus clases…</p>}>
      <LessonStudio exercises={allExercises} />
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
      <p className="class-code-display">Código de práctica <strong>{code}</strong></p>
      <button type="button" className="btn btn-primary" onClick={copyCode}>{copied ? 'Código copiado' : 'Copiar código'}</button>
      <p className="field-help">El alumno ingresa este código en “Mi clase” para aplicar la selección en su dispositivo. No crea una clase sincronizada ni comparte el progreso; eso requiere Supabase.</p>
      <button type="button" className="btn btn-secondary" onClick={() => { setCode(''); setCopied(false); }}>Crear otro código</button>
    </div>}
    {error && <p className="teacher-error" role="alert">{error}</p>}
  </form>;
}
