import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
const LessonStudio = lazy(() => import('./LessonStudio.jsx'));
import { encodeClassConfig, decodeClassConfig } from '../utils/classCode.js';
import { exercises, flashcards as flashcardsData, quizBank } from '../data/catalogs.js';
import { getCustomExercises } from '../utils/customExercises.js';
import { createCustomFlashcard, deleteCustomFlashcard, getCustomFlashcards } from '../utils/customFlashcards.js';
import CustomExerciseForm from './CustomExerciseForm.jsx';
import StudentRoster from './StudentRoster.jsx';
import ClassDashboard from './ClassDashboard.jsx';
import { registerClassCode } from '../utils/classroom.js';
import { isCloudConfigured } from '../cloud/cloudClient.js';
import { buildClassContent, createCloudClass, deleteCloudClass, listTeacherClasses } from '../cloud/classCloud.js';
import { useTranslation } from '../i18n/LanguageProvider.jsx';

// Situaciones de práctica (nombres visibles en messages.js: scenario.<id>).
const SUBTEMAS = ['dron', 'basketball', 'wall'];
const TOOLS = ['clase', 'ejercicios', 'clases'];

export function validClassCode(text) {
  const code = String(text ?? '').trim().toUpperCase();
  const config = decodeClassConfig(code);
  return config && encodeClassConfig(config) === code ? config : null;
}

// Fila de class_members (Supabase) → alumno normalizado para ClassDashboard.
// topic_stats/solved existen desde la versión del esquema con panel docente;
// con un esquema anterior quedan vacíos y el panel muestra lo que hay.
function cloudMemberToStudent(member) {
  return {
    id: member.student_id,
    name: member.display_name,
    avatar: member.avatar,
    phone: member.phone,
    email: member.email,
    xp: member.xp,
    level: member.level,
    confidence: member.confidence,
    attempts: member.attempts,
    correct: member.correct,
    solved: member.solved ?? 0,
    topicStats: member.topic_stats ?? {},
    lastSync: member.last_sync ?? null,
  };
}

function CustomCardForm({ onCreated }) {
  const { t } = useTranslation();
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
  return <div className="teacher-block custom-card-form" role="group" aria-label={t('teacher.newCard')} onKeyDown={event => { if (event.target.tagName === 'INPUT') onEnter(event); }}>
    <h4>{t('teacher.newCard')}</h4>
    <label className="teacher-field">{t('teacher.front')}<input className="quiz-input" value={front} onChange={event => setFront(event.target.value)} maxLength={300} placeholder={t('teacher.frontPh')} /></label>
    <label className="teacher-field">{t('teacher.back')}<textarea className="quiz-input" rows={2} value={back} onChange={event => setBack(event.target.value)} maxLength={600} placeholder={t('teacher.backPh')} /></label>
    <label className="teacher-field">{t('teacher.formula')}<input className="quiz-input" value={formula} onChange={event => setFormula(event.target.value)} maxLength={160} placeholder={t('teacher.formulaPh')} /></label>
    {error && <p className="field-error" role="alert">{error}</p>}
    <button type="button" className="btn btn-secondary" onClick={save}>{t('teacher.saveCard')}</button>
  </div>;
}

function CardPicker({ cards, selected, onChange, customIds, onDeleteCustom }) {
  const { t } = useTranslation();
  const toggle = id => onChange(selected.includes(id) ? selected.filter(item => item !== id) : [...selected, id]);
  return <fieldset className="card-picker"><legend>{t('teacher.cardsPick', { n: selected.length, total: cards.length })}</legend>
    <div className="card-picker-actions">
      <button type="button" className="btn btn-secondary" onClick={() => onChange(cards.map(card => card.id))}>{t('teacher.all')}</button>
      <button type="button" className="btn btn-secondary" onClick={() => onChange([])}>{t('teacher.none')}</button>
    </div>
    <ul className="card-picker-list">{cards.map(card => <li key={card.id}>
      <label><input type="checkbox" checked={selected.includes(card.id)} onChange={() => toggle(card.id)} />
        <span><strong>{card.frente_es ?? card.front}</strong>{customIds.has(card.id) && <em className="chip">{t('teacher.own')}</em>}<small>{card.dorso_concepto ?? card.back}</small></span>
      </label>
      {customIds.has(card.id) && <button type="button" className="card-picker-delete" aria-label={t('teacher.deleteCard', { name: card.frente_es })} onClick={() => onDeleteCustom(card.id)}>✕</button>}
    </li>)}</ul>
  </fieldset>;
}

function CloudClassList({ refreshKey }) {
  const { t } = useTranslation();
  const [classes, setClasses] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmId, setConfirmId] = useState(null);
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setClasses(await listTeacherClasses()); }
    catch (failure) { setError(failure.offline ? 'offline' : failure.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load, refreshKey]);
  useEffect(() => {
    window.addEventListener('online', load);
    return () => window.removeEventListener('online', load);
  }, [load]);

  return <section className="teacher-block cloud-class-list" aria-label={t('teacher.classesTitle')}>
    <div className="cloud-class-list-head"><h3>{t('teacher.classesTitle')}</h3><button type="button" className="btn btn-secondary" onClick={load} disabled={loading}>{t(loading ? 'teacher.refreshing' : 'teacher.refresh')}</button></div>
    {error && <p className="field-error" role="status">{error === 'offline' ? t('teacher.listOffline') : t('teacher.listError', { msg: error })}</p>}
    {classes && classes.length === 0 && <p className="field-help">{t('teacher.noClasses')}</p>}
    {classes?.map(item => <article key={item.id} className="cloud-class-card">
      <header>
        <div><strong>{item.title}</strong><span className="class-code-display">{t('teacher.code')} <strong>{item.code}</strong></span></div>
        {confirmId === item.id
          ? <span className="cloud-class-delete"><button type="button" className="btn btn-danger" onClick={async () => { try { await deleteCloudClass(item.id); } catch (failure) { setError(failure.message); } setConfirmId(null); load(); }}>{t('teacher.confirmDelete')}</button><button type="button" className="btn btn-secondary" onClick={() => setConfirmId(null)}>{t('common.cancel')}</button></span>
          : <button type="button" className="btn btn-secondary" onClick={() => setConfirmId(item.id)}>{t('teacher.deleteClass')}</button>}
      </header>
      {item.class_members?.length
        ? <ClassDashboard students={item.class_members.map(cloudMemberToStudent)} totalExercises={Number(item.config?.ejercicios) || 0} />
        : <p className="field-help">{t('teacher.noStudentsYet')}</p>}
    </article>)}
  </section>;
}

function TopicButtons({ selected, onToggle }) {
  const { t } = useTranslation();
  return <div className="teacher-topic-options">{SUBTEMAS.map(id => <button key={id} type="button" aria-pressed={selected.includes(id)} className={selected.includes(id) ? 'is-selected' : ''} onClick={() => onToggle(id)}>{t(`scenario.${id}`)}</button>)}</div>;
}

function CloudClassSetup({ teacher, allExercises, customExercises }) {
  const { t } = useTranslation();
  const [customCards, setCustomCards] = useState(getCustomFlashcards);
  const allCards = useMemo(() => [...flashcardsData, ...customCards], [customCards]);
  const customIds = useMemo(() => new Set(customCards.map(card => card.id)), [customCards]);
  const [title, setTitle] = useState('');
  const [subtopics, setSubtopics] = useState(SUBTEMAS);
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
      setError(failure.offline ? t('teacher.createOffline') : t('teacher.createError', { msg: failure.message }));
    } finally { setBusy(false); }
  };

  const copy = async () => {
    try { await navigator.clipboard.writeText(created.code); setCopied(true); } catch { setError(t('teacher.copyError')); }
  };

  return <>
    <form className="teacher-block class-setup-form" onSubmit={submit}>
      <label className="teacher-field">{t('teacher.s1')}<input className="quiz-input" value={title} onChange={event => { setTitle(event.target.value); setCreated(null); }} maxLength={80} placeholder={t('teacher.s1ph')} /></label>
      <fieldset className="teacher-topic-picker"><legend>{t('teacher.s2')}</legend>
        <TopicButtons selected={subtopics} onToggle={toggleTopic} />
      </fieldset>
      <div className="class-setup-step"><h4>{t('teacher.s3')}</h4>
        <CardPicker cards={allCards} selected={selectedCards} onChange={ids => { setSelectedCards(ids); setCreated(null); }} customIds={customIds} onDeleteCustom={id => { deleteCustomFlashcard(id); setCustomCards(getCustomFlashcards()); setSelectedCards(current => current.filter(item => item !== id)); }} />
        <CustomCardForm onCreated={card => { setCustomCards(getCustomFlashcards()); setSelectedCards(current => [...current, card.id]); }} />
        {selectedCards.length < 5 && <p className="field-error">{t('teacher.min5')}</p>}
      </div>
      <div className="class-setup-step"><h4>{t('teacher.s4')}</h4>
        <label className="teacher-field">{t('teacher.exerciseCount', { n: pool.length })}<input className="quiz-input" type="number" min="1" max={Math.max(1, pool.length)} step="1" value={exerciseCount} onChange={event => setExerciseCount(event.target.value)} /></label>
        {customExercises.length > 0 && <fieldset className="card-picker"><legend>{t('teacher.includeOwn')}</legend>
          <ul className="card-picker-list">{customExercises.map(item => <li key={item.id}><label><input type="checkbox" checked={selectedExercises.includes(item.id)} onChange={() => toggleExercise(item.id)} /><span><strong>{item.question}</strong><small>{t(`scenario.${item.scenario}`)}{!subtopics.includes(item.scenario) ? t('teacher.notChosen') : ''}</small></span></label></li>)}</ul>
        </fieldset>}
      </div>
      {!title.trim() && <p className="field-help">{t('teacher.nameHelp')}</p>}
      {error && <p className="teacher-error" role="alert">{error}</p>}
      {!created && <button type="submit" className="btn btn-primary" disabled={!valid || busy}>{t(busy ? 'teacher.creating' : 'teacher.s5')}</button>}
      {created && <div className="class-code-result" role="status">
        <span className="panel-eyebrow">{t('teacher.ready')}</span>
        <p className="class-code-display">{t('teacher.classCode')} <strong>{created.code}</strong></p>
        <button type="button" className="btn btn-primary" onClick={copy}>{t(copied ? 'teacher.copied' : 'teacher.copy')}</button>
        <p className="field-help">{t('teacher.cloudHelp')}</p>
        <button type="button" className="btn btn-secondary" onClick={() => { setCreated(null); setTitle(''); }}>{t('teacher.another')}</button>
      </div>}
    </form>
    <CloudClassList refreshKey={refreshKey} />
  </>;
}

function ClassSetup({ allExercises, customExercises, teacher, classConfig, onLeaveClass }) {
  const { t } = useTranslation();
  const cloud = isCloudConfigured();
  return <section className="card teacher-tool-panel" aria-label={t('teacher.shareLabel')}>
    <span className="panel-eyebrow">{t('teacher.stepByStep')}</span>
    <h2>{t(cloud ? 'teacher.shareClass' : 'teacher.sharePractice')}</h2>
    <p className="teacher-note">{t(cloud ? 'teacher.shareCloudText' : 'teacher.shareLocalText')}</p>
    {cloud
      ? <CloudClassSetup teacher={teacher} allExercises={allExercises} customExercises={customExercises} />
      : <>
        <p className="field-help cloud-missing">{t('teacher.cloudMissing')}</p>
        {classConfig ? <div className="teacher-block">
          <p>{t('teacher.savedPractice')}</p>
          <p className="class-code-display">{t('teacher.practiceCode')} <strong>{encodeClassConfig(classConfig)}</strong></p>
          <button type="button" className="btn btn-secondary" onClick={onLeaveClass}>{t('teacher.removeConfig')}</button>
        </div> : <TeacherControls allExercises={allExercises} teacherId={teacher.id} />}
        <details className="teacher-roster-details" open><summary>{t('teacher.localStudents')}</summary>
          <StudentRoster teacherId={teacher.id} totalExercises={classConfig?.ejercicios} />
        </details>
      </>}
  </section>;
}

export default function TeacherMode({ classConfig, onJoinClass, teacher }) {
  const { t } = useTranslation();
  const [tool, setTool] = useState('clase');
  const cloudEnabled = isCloudConfigured();
  const [customExercises, setCustomExercises] = useState(getCustomExercises);
  const refreshCustomExercises = () => setCustomExercises(getCustomExercises());
  const allExercises = useMemo(() => [...exercises, ...customExercises], [customExercises]);

  return <section className="teacher-hub" aria-label={t('teacher.hub')}>
    <div className="teacher-tool-picker" role="group" aria-label={t('teacher.pickTool')}>
      {TOOLS.map(id => {
        const key = id === 'clase' && !cloudEnabled ? 'practice' : id;
        return <button key={id} type="button" className={tool === id ? 'is-active' : ''} aria-pressed={tool === id} onClick={() => setTool(id)}>
          <strong>{t(`teacher.tool.${key}`)}</strong><span>{t(`teacher.tool.${key}Text`)}</span>
        </button>;
      })}
    </div>

    <div hidden={tool !== 'clase'}><ClassSetup allExercises={allExercises} customExercises={customExercises} teacher={teacher} classConfig={classConfig} onLeaveClass={() => onJoinClass?.(null)} /></div>
    <section hidden={tool !== 'ejercicios'} className="card teacher-tool-panel" aria-label={t('teacher.ownLabel')}>
      <span className="panel-eyebrow">{t('teacher.ownEyebrow')}</span><h2>{t('teacher.ownTitle')}</h2>
      <p className="teacher-note">{t('teacher.ownText')}</p>
      <CustomExerciseForm exercises={customExercises} onChange={refreshCustomExercises} />
    </section>
    <div hidden={tool !== 'clases'}><Suspense fallback={<p className="teacher-note">{t('teacher.lessonsLoading')}</p>}>
      <LessonStudio exercises={allExercises} />
    </Suspense></div>
  </section>;
}

function TeacherControls({ allExercises = exercises, teacherId }) {
  const { t } = useTranslation();
  const totalCards = flashcardsData.length + quizBank.filter(item => item.tipo === 'abierta').length;
  const availableExercises = Math.min(10, allExercises.length);
  const availableCards = Math.min(20, totalCards);
  const [flashcards, setFlashcards] = useState(Math.min(10, availableCards));
  const [exerciseCount, setExerciseCount] = useState(Math.min(3, availableExercises));
  const [subtopics, setSubtopics] = useState(SUBTEMAS);
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
    catch { setCopied(false); setError(t('teacher.copyError')); }
  };

  const updateCount = (setter, value) => { setter(value); setCode(''); setCopied(false); };

  return <form className="teacher-block class-setup-form" onSubmit={createCode}>
    <fieldset className="teacher-topic-picker"><legend>{t('teacher.p1')}</legend>
      <TopicButtons selected={subtopics} onToggle={toggle} />
      <small>{t('teacher.p1note')}</small>
    </fieldset>

    <details className="class-quantity-options"><summary>{t('teacher.adjust')}</summary>
      <label className="teacher-field">{t('teacher.cards')}<input className="quiz-input" type="number" min="5" max={availableCards} step="1" value={flashcards} onChange={event => updateCount(setFlashcards, event.target.value)} /></label>
      <label className="teacher-field">{t('teacher.exercises')}<input className="quiz-input" type="number" min="1" max={availableExercises} step="1" value={exerciseCount} onChange={event => updateCount(setExerciseCount, event.target.value)} /></label>
      <small>{t('teacher.keep')}</small>
    </details>

    {!subtopics.length && <p className="field-error">{t('teacher.pickOne')}</p>}
    {!valid && subtopics.length > 0 && <p className="field-error">{t('teacher.checkCounts')}</p>}
    {!code && <button type="submit" className="btn btn-primary" disabled={!valid}>{t('teacher.p2')}</button>}
    {code && <div className="class-code-result" role="status">
      <span className="panel-eyebrow">{t('teacher.ready')}</span>
      <p className="class-code-display">{t('teacher.practiceCode')} <strong>{code}</strong></p>
      <button type="button" className="btn btn-primary" onClick={copyCode}>{t(copied ? 'teacher.copied' : 'teacher.copy')}</button>
      <p className="field-help">{t('teacher.localHelp')}</p>
      <button type="button" className="btn btn-secondary" onClick={() => { setCode(''); setCopied(false); }}>{t('teacher.anotherCode')}</button>
    </div>}
    {error && <p className="teacher-error" role="alert">{error}</p>}
  </form>;
}
