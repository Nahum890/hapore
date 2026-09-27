import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
const LessonStudio = lazy(() => import('./LessonStudio.jsx'));
import TeacherActivityStudio from './TeacherActivityStudio.jsx';
import { encodeClassConfig, decodeClassConfig } from '../utils/classCode.js';
import { exercises, flashcards as flashcardsData, quizBank } from '../data/catalogs.js';
import { getCustomExercises } from '../utils/customExercises.js';
import ExerciseFlags from './ExerciseFlags.jsx';
import { getFlagState, withFlags } from '../pedagogy/flags.js';
import CustomExerciseForm from './CustomExerciseForm.jsx';
import TeacherMeetings from './TeacherMeetings.jsx';
import StudentRoster from './StudentRoster.jsx';
import ClassDashboard from './ClassDashboard.jsx';
import { registerClassCode } from '../utils/classroom.js';
import { isCloudConfigured } from '../cloud/cloudClient.js';
import { buildClassContent, createCloudClass, deleteCloudClass, listTeacherClasses } from '../cloud/classCloud.js';
import { useTranslation } from '../i18n/LanguageProvider.jsx';

// Situaciones de práctica (nombres visibles en messages.js: scenario.<id>).
const SUBTEMAS = ['dron', 'basketball', 'wall'];
const TOOLS = ['grupo', 'actividad', 'reuniones', 'analisis', 'ejercicios', 'clase'];

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
          ? <span className="cloud-class-delete"><button type="button" className="btn btn-danger" onClick={async () => { try { await deleteCloudClass(item.id); } catch (failure) { setError(failure.message); } setConfirmId(null); load(); window.dispatchEvent(new Event('teacher-classes-changed')); }}>{t('teacher.confirmDelete')}</button><button type="button" className="btn btn-secondary" onClick={() => setConfirmId(null)}>{t('common.cancel')}</button></span>
          : <button type="button" className="btn btn-secondary" onClick={() => setConfirmId(item.id)}>{t('teacher.deleteClass')}</button>}
      </header>
      <p className="field-help">{t('teacher.groupMemberCount', { n: item.class_members?.length ?? 0 })}</p>
    </article>)}
  </section>;
}

function TeacherAnalytics({ active, exercises: allExercises }) {
  const { t } = useTranslation();
  const [groups, setGroups] = useState(null);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    if (!isCloudConfigured()) return;
    setLoading(true); setError('');
    try {
      const found = await listTeacherClasses();
      setGroups(found);
      setSelectedId(current => found.some(item => item.id === current) ? current : found[0]?.id ?? '');
    } catch (failure) { setError(failure.offline ? 'offline' : failure.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { if (active) load(); }, [active, load]);
  useEffect(() => {
    if (!active) return undefined;
    window.addEventListener('online', load);
    return () => window.removeEventListener('online', load);
  }, [active, load]);

  if (!isCloudConfigured()) return <section className="card teacher-tool-panel"><h2>{t('teacher.analysisTitle')}</h2><p className="field-help">{t('teacher.analysisNeedsCloud')}</p></section>;
  const selected = groups?.find(item => item.id === selectedId);
  return <section className="card teacher-tool-panel teacher-analytics" aria-label={t('teacher.analysisTitle')}>
    <span className="panel-eyebrow">{t('teacher.analysisEyebrow')}</span><h2>{t('teacher.analysisTitle')}</h2>
    <p className="teacher-note">{t('teacher.analysisLead')}</p>
    <div className="teacher-analytics-picker">
      <label className="teacher-field">{t('teacher.analysisGroup')}<select className="quiz-input" value={selectedId} onChange={event => setSelectedId(event.target.value)} disabled={loading || !groups?.length}>
        {!groups?.length && <option value="">{loading ? t('common.loading') : t('teacher.noClasses')}</option>}
        {groups?.map(group => <option key={group.id} value={group.id}>{group.title} · {group.code}</option>)}
      </select></label>
      <button type="button" className="btn btn-secondary" onClick={load} disabled={loading}>{t(loading ? 'teacher.refreshing' : 'teacher.refresh')}</button>
    </div>
    {error && <p className="field-error" role="alert">{error === 'offline' ? t('teacher.listOffline') : t('teacher.listError', { msg: error })}</p>}
    {!loading && groups?.length === 0 && <p className="field-help">{t('teacher.noClasses')}</p>}
    {selected && (selected.class_members?.length
      ? <ClassDashboard students={selected.class_members.map(cloudMemberToStudent)} totalExercises={Number(selected.config?.ejercicios) || 0} exercises={allExercises} />
      : <p className="field-help">{t('teacher.noStudentsYet')}</p>)}
  </section>;
}

function CloudClassSetup({ teacher }) {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const submit = async event => {
    event.preventDefault();
    if (!title.trim() || busy) return;
    setBusy(true); setError(''); setCopied(false);
    try {
      const content = buildClassContent({
        config: { subtemas: SUBTEMAS, ejercicios: Math.min(10, exercises.length), flashcards: flashcardsData.length },
        cards: flashcardsData,
        // Ejercicios propios del docente (con su banderita) viajan con la clase.
        exercises: withFlags(getCustomExercises(), getFlagState().byExercise),
        flags: getFlagState(),
      });
      const result = await createCloudClass({ title: title.trim(), teacherName: teacher.name, teacherAvatar: teacher.avatar, teacherPhone: teacher.phone, teacherEmail: teacher.email, content });
      setCreated(result);
      setRefreshKey(value => value + 1);
      window.dispatchEvent(new Event('teacher-classes-changed'));
    } catch (failure) {
      setError(failure.offline ? t('teacher.createOffline') : t('teacher.createError', { msg: failure.message }));
    } finally { setBusy(false); }
  };

  const copy = async () => {
    try { await navigator.clipboard.writeText(created.code); setCopied(true); } catch { setError(t('teacher.copyError')); }
  };

  return <>
    <form className="teacher-block class-setup-form" onSubmit={submit}>
      <label className="teacher-field">{t('teacher.s1')}<input className="quiz-input" value={title} onChange={event => { setTitle(event.target.value); setCreated(null); }} maxLength={80} /></label>
      {!title.trim() && <p className="field-help">{t('teacher.nameHelp')}</p>}
      {error && <p className="teacher-error" role="alert">{error}</p>}
      {!created && <button type="submit" className="btn btn-primary" disabled={!title.trim() || busy}>{t(busy ? 'teacher.creating' : 'teacher.s5')}</button>}
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

function ClassSetup({ allExercises, teacher, classConfig, onLeaveClass }) {
  const { t } = useTranslation();
  const cloud = isCloudConfigured();
  return <section className="card teacher-tool-panel" aria-label={t('teacher.shareLabel')}>
    <span className="panel-eyebrow">{t('teacher.stepByStep')}</span>
    <h2>{t(cloud ? 'teacher.createGroup' : 'teacher.sharePractice')}</h2>
    <p className="teacher-note">{t(cloud ? 'teacher.shareCloudText' : 'teacher.shareLocalText')}</p>
    {cloud
      ? <CloudClassSetup teacher={teacher} />
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
  const [tool, setTool] = useState('grupo');
  const cloudEnabled = isCloudConfigured();
  const [customExercises, setCustomExercises] = useState(getCustomExercises);
  const refreshCustomExercises = () => setCustomExercises(getCustomExercises());
  const allExercises = useMemo(() => [...exercises, ...customExercises], [customExercises]);

  return <section className="teacher-hub" aria-label={t('teacher.hub')}>
    <div className="teacher-tool-picker" role="group" aria-label={t('teacher.pickTool')}>
      {TOOLS.map(id => {
        const key = id === 'grupo' && !cloudEnabled ? 'practice' : id;
        return <button key={id} type="button" className={tool === id ? 'is-active' : ''} aria-pressed={tool === id} onClick={() => setTool(id)}>
          <strong>{t(`teacher.tool.${key}`)}</strong><span>{t(`teacher.tool.${key}Text`)}</span>
        </button>;
      })}
    </div>

    <div hidden={tool !== 'grupo'}><ClassSetup allExercises={allExercises} teacher={teacher} classConfig={classConfig} onLeaveClass={() => onJoinClass?.(null)} /></div>
    <div hidden={tool !== 'actividad'}><TeacherActivityStudio exercises={allExercises} /></div>
    <div hidden={tool !== 'reuniones'}><TeacherMeetings /></div>
    <div hidden={tool !== 'analisis'}><TeacherAnalytics active={tool === 'analisis'} exercises={allExercises} /></div>
    <section hidden={tool !== 'ejercicios'} className="card teacher-tool-panel" aria-label={t('teacher.ownLabel')}>
      <span className="panel-eyebrow">{t('teacher.ownEyebrow')}</span><h2>{t('teacher.ownTitle')}</h2>
      <p className="teacher-note">{t('teacher.ownText')}</p>
      <CustomExerciseForm exercises={customExercises} onChange={refreshCustomExercises} />
      <ExerciseFlags exercises={allExercises} />
    </section>
    <div hidden={tool !== 'clase'}><Suspense fallback={<p className="teacher-note">{t('teacher.lessonsLoading')}</p>}>
      <LessonStudio exercises={allExercises} onCreateGroup={() => setTool('grupo')} />
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
