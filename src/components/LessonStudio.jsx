import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { concepts as conceptCatalog, exercises as exerciseCatalog, localizeCatalogItem } from '../data/catalogs.js';
import { useTranslation } from '../i18n/LanguageProvider.jsx';
import { isCloudConfigured } from '../cloud/cloudClient.js';
import { listTeacherClasses } from '../cloud/classCloud.js';
import { lessonPayload, sendMessage } from '../cloud/chatCloud.js';
import { pendingTeacherSync, subscribeTeacherSync } from '../cloud/teacherSyncQueue.js';
import {
  GRAVITY_PRESETS, SLIDE_TYPES, createLesson, createSlide, deleteLesson, duplicateLesson,
  createGuidedLesson, getLessons, launchErrors, moveItem, saveLesson,
} from '../utils/lessons.js';
import { SlideView, slideSummary } from './LessonSlides.jsx';
import './Aula.css';

const typeLabel = (type, t) => t(`lesson.type.${type}`);
const formatDate = iso => { try { return new Date(iso).toLocaleDateString('es-PY', { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return ''; } };

function LessonList({ lessons, syncPending = 0, exercises, onCreate, onCreateGuided, onEdit, onPresent, onDuplicate, onDelete, onCreateGroup }) {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [confirmId, setConfirmId] = useState(null);
  const [shareLessonId, setShareLessonId] = useState(null);
  const [shareGroups, setShareGroups] = useState([]);
  const [shareGroupId, setShareGroupId] = useState('');
  const [shareLoading, setShareLoading] = useState(false);
  const [shareBusy, setShareBusy] = useState(false);
  const [shareError, setShareError] = useState('');
  const [shareStatus, setShareStatus] = useState('');
  const create = event => { event.preventDefault(); onCreate(title); setTitle(''); };

  const loadGroups = async () => {
    setShareError('');
    setShareStatus('');
    if (!isCloudConfigured()) {
      setShareGroups([]);
      setShareGroupId('');
      setShareError(t('teacher.lessonShareNeedsCloud'));
      return;
    }
    setShareLoading(true);
    try {
      const groups = await listTeacherClasses();
      setShareGroups(groups);
      setShareGroupId(current => groups.some(group => group.id === current) ? current : groups[0]?.id ?? '');
    } catch (failure) {
      setShareError(t('teacher.lessonShareError', { msg: failure.message }));
    } finally {
      setShareLoading(false);
    }
  };

  const openShare = async lesson => {
    if (shareLessonId === lesson.id) {
      setShareLessonId(null);
      return;
    }
    setShareLessonId(lesson.id);
    setShareError('');
    setShareStatus('');
    await loadGroups();
  };

  const sendToGroup = async lesson => {
    if (!shareGroupId || shareBusy || !lesson.slides.length) return;
    setShareBusy(true);
    setShareError('');
    setShareStatus('');
    try {
      await sendMessage({ classId: shareGroupId, kind: 'lesson', payload: lessonPayload(lesson, exercises) });
      setShareStatus(t('teacher.lessonShareSent', { group: shareGroups.find(group => group.id === shareGroupId)?.title ?? '' }));
    } catch (failure) {
      setShareError(t('teacher.lessonShareError', { msg: failure.message }));
    } finally {
      setShareBusy(false);
    }
  };

  return <section className="card teacher-tool-panel lesson-list-panel" aria-labelledby="lesson-list-title">
    <span className="panel-eyebrow">{t('lesson.eyebrow')}</span>
    <h2 id="lesson-list-title">{t('lesson.myLessons')}</h2>
    {isCloudConfigured() && <span className={'chip teacher-sync-chip' + (syncPending ? ' is-pending' : '')} role="status">{syncPending ? '⏳ ' : '☁️ '}{t(syncPending ? 'teacherSync.pending' : 'teacherSync.saved')}</span>}
    <p className="teacher-note">{t('lesson.intro')}</p>
    <div className="aula-guided-template">
      <div><strong>{t('lesson.guidedQ')}</strong><p>{t('lesson.guidedText')}</p></div>
      <button type="button" className="btn btn-primary" onClick={onCreateGuided}>{t('lesson.createGuided')}</button>
    </div>
    <form className="lesson-create" onSubmit={create}>
      <label className="teacher-field">{t('lesson.newName')}
        <input className="quiz-input" value={title} onChange={event => setTitle(event.target.value)} maxLength={80} />
      </label>
      <button type="submit" className="btn btn-primary">{t('lesson.create')}</button>
    </form>
    {lessons.length === 0
      ? <p className="field-help">{t('lesson.empty')}</p>
      : <ul className="lesson-list">
        {[...lessons].sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt))).map(lesson => <li key={lesson.id} className="lesson-item">
          <div className="lesson-item-info">
            <h3>{lesson.title}</h3>
            <p>{t(lesson.slides.length === 1 ? 'lesson.countOne' : 'lesson.count', { n: lesson.slides.length, date: formatDate(lesson.updatedAt) })}</p>
            {lesson.description && <p className="lesson-item-description">{lesson.description}</p>}
          </div>
          <div className="lesson-item-actions">
            <button type="button" className="btn btn-primary" onClick={() => onPresent(lesson.id, 0)} disabled={!lesson.slides.length}>{t('lesson.present')}</button>
            <button type="button" className="btn btn-secondary" onClick={() => onEdit(lesson.id)}>{t('lesson.edit')}</button>
            <button type="button" className="btn btn-secondary" onClick={() => onDuplicate(lesson.id)}>{t('lesson.duplicate')}</button>
            <button type="button" className="btn btn-secondary" aria-expanded={shareLessonId === lesson.id} onClick={() => openShare(lesson)} disabled={!lesson.slides.length}>{t('teacher.lessonShare')}</button>
            {confirmId === lesson.id
              ? <><button type="button" className="btn btn-danger" onClick={() => { onDelete(lesson.id); setConfirmId(null); }}>{t('lesson.confirmDelete')}</button><button type="button" className="btn btn-secondary" onClick={() => setConfirmId(null)}>{t('common.cancel')}</button></>
              : <button type="button" className="btn btn-secondary" onClick={() => setConfirmId(lesson.id)}>{t('lesson.delete')}</button>}
          </div>
          {shareLessonId === lesson.id && <div className="lesson-share-panel">
            <p>{t('teacher.lessonShareHint')}</p>
            {shareLoading && <p className="field-help" role="status">{t('common.loading')}</p>}
            {!shareLoading && shareGroups.length > 0 && <div className="lesson-share-controls">
              <label className="teacher-field">{t('teacher.lessonShareGroup')}
                <select className="quiz-input" value={shareGroupId} onChange={event => { setShareGroupId(event.target.value); setShareStatus(''); }}>
                  {shareGroups.map(group => <option key={group.id} value={group.id}>{group.title} · {group.code}</option>)}
                </select>
              </label>
              <button type="button" className="btn btn-primary" onClick={() => sendToGroup(lesson)} disabled={!shareGroupId || shareBusy}>
                {t(shareBusy ? 'teacher.lessonShareSending' : 'teacher.lessonShareSend')}
              </button>
              <button type="button" className="btn btn-secondary" onClick={loadGroups} disabled={shareBusy}>{t('teacher.lessonShareRefresh')}</button>
            </div>}
            {!shareLoading && shareGroups.length === 0 && <div className="lesson-share-empty">
              <p className="field-help">{isCloudConfigured() ? t('teacher.lessonShareNoGroups') : t('teacher.lessonShareNeedsCloud')}</p>
              <button type="button" className="btn btn-primary" onClick={onCreateGroup}>{t('teacher.goCreateGroup')}</button>
              {isCloudConfigured() && <button type="button" className="btn btn-secondary" onClick={loadGroups}>{t('teacher.lessonShareRefresh')}</button>}
            </div>}
            {shareError && <p className="field-error" role="alert">{shareError}</p>}
            {shareStatus && <p className="teacher-share-status" role="status">{shareStatus}</p>}
          </div>}
        </li>)}
      </ul>}
  </section>;
}

function NumberField({ label, unit, value, error, onChange, step = 'any' }) {
  return <label className="teacher-field lesson-number-field">{label}{unit ? ` · ${unit}` : ''}
    <input className="quiz-input" type="number" inputMode="decimal" step={step} value={value} aria-invalid={Boolean(error)} onChange={event => onChange(event.target.value)} />
    {error && <small className="field-error">{error}</small>}
  </label>;
}

function SlideEditor({ slide, exercises, concepts, onChange }) {
  const { t } = useTranslation();
  const set = patch => onChange({ ...slide, ...patch });
  if (slide.type === 'titulo') return <div className="lesson-slide-form">
    <label className="teacher-field">{t('lesson.fTitle')}<input className="quiz-input" value={slide.title} onChange={event => set({ title: event.target.value })} maxLength={120} /></label>
    <label className="teacher-field">{t('lesson.fSubtitle')}<textarea className="quiz-input" rows={2} value={slide.subtitle} onChange={event => set({ subtitle: event.target.value })} /></label>
  </div>;
  if (slide.type === 'texto') return <div className="lesson-slide-form">
    <label className="teacher-field">{t('lesson.fTitleOpt')}<input className="quiz-input" value={slide.title} onChange={event => set({ title: event.target.value })} maxLength={120} /></label>
    <label className="teacher-field">{t('lesson.fContent')}<textarea className="quiz-input" rows={7} value={slide.body} onChange={event => set({ body: event.target.value })} /></label>
  </div>;
  if (slide.type === 'concepto') return <div className="lesson-slide-form">
    <label className="teacher-field">{t('lesson.type.concepto')}<select className="quiz-input" value={slide.conceptId} onChange={event => set({ conceptId: event.target.value })}>
      <option value="">{t('lesson.pickConcept')}</option>
      {concepts.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
    </select></label>
  </div>;
  if (slide.type === 'ejercicio') return <div className="lesson-slide-form">
    <label className="teacher-field">{t('lesson.type.ejercicio')}<select className="quiz-input" value={slide.exerciseId} onChange={event => set({ exerciseId: event.target.value })}>
      <option value="">{t('lesson.pickExercise')}</option>
      {exercises.map(item => <option key={item.id} value={item.id}>{item.custom ? t('lesson.own') : ''}{item.question}</option>)}
    </select></label>
    <p className="field-help">{t('lesson.answerHidden')}</p>
  </div>;
  if (slide.type === 'simulador') {
    const errors = launchErrors(slide);
    const compareErrors = slide.compare ? launchErrors({ v0: slide.v0B, angle: slide.angleB, gravity: slide.gravity }) : {};
    return <div className="lesson-slide-form">
      <label className="teacher-field">{t('lesson.fTitleOpt')}<input className="quiz-input" value={slide.title} onChange={event => set({ title: event.target.value })} maxLength={120} /></label>
      <p className="field-help">{t('lesson.anyValue')}</p>
      <div className="lesson-values-grid">
        <NumberField label={t('free.speed')} unit="m/s" value={slide.v0} error={errors.v0} onChange={value => set({ v0: value })} />
        <NumberField label={t('lesson.angle')} unit="°" value={slide.angle} error={errors.angle} onChange={value => set({ angle: value })} />
        <NumberField label={t('free.gravity')} unit="m/s²" value={slide.gravity} error={errors.gravity} onChange={value => set({ gravity: value })} />
      </div>
      <div className="lesson-gravity-presets" role="group" aria-label={t('lesson.quickGravity')}>
        {GRAVITY_PRESETS.map(item => <button key={item.value} type="button" className={Number(slide.gravity) === item.value ? 'is-active' : ''} aria-pressed={Number(slide.gravity) === item.value} onClick={() => set({ gravity: item.value })}>{t(`lesson.g.${item.value}`)}</button>)}
      </div>
      <label className="lesson-compare-toggle"><input type="checkbox" checked={Boolean(slide.compare)} onChange={event => set({ compare: event.target.checked })} /> {t('lesson.compare')}</label>
      {slide.compare && <div className="lesson-values-grid">
        <NumberField label={t('lesson.v0B')} unit="m/s" value={slide.v0B} error={compareErrors.v0} onChange={value => set({ v0B: value })} />
        <NumberField label={t('lesson.angleB')} unit="°" value={slide.angleB} error={compareErrors.angle} onChange={value => set({ angleB: value })} />
      </div>}
    </div>;
  }
  return null;
}

function LessonEditor({ lesson, exercises, concepts, onChange, onBack, onPresent }) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState(0);
  const slides = lesson.slides;
  const current = slides[Math.min(selected, slides.length - 1)];
  const selectedIndex = Math.min(selected, Math.max(slides.length - 1, 0));

  const updateSlides = next => onChange({ ...lesson, slides: next });
  const addSlide = type => {
    const next = [...slides];
    const at = slides.length ? selectedIndex + 1 : 0;
    next.splice(at, 0, createSlide(type));
    updateSlides(next);
    setSelected(at);
  };
  const move = (from, to) => { updateSlides(moveItem(slides, from, to)); setSelected(to); };
  const remove = index => {
    updateSlides(slides.filter((_, position) => position !== index));
    setSelected(Math.max(0, Math.min(index, slides.length - 2)));
  };
  const duplicate = index => {
    const copy = { ...slides[index], id: createSlide(slides[index].type).id };
    const next = [...slides];
    next.splice(index + 1, 0, copy);
    updateSlides(next);
    setSelected(index + 1);
  };
  const updateCurrent = slide => updateSlides(slides.map((item, position) => (position === selectedIndex ? slide : item)));

  return <section className="card teacher-tool-panel lesson-editor" aria-labelledby="lesson-editor-title">
    <div className="lesson-editor-head">
      <button type="button" className="btn btn-secondary" onClick={onBack}>← {t('lesson.myLessons')}</button>
      <span className="field-help" role="status">{t('lesson.autosave')}</span>
      <button type="button" className="btn btn-primary" onClick={() => onPresent(0)} disabled={!slides.length}>{t('lesson.presentLesson')}</button>
    </div>
    <h2 id="lesson-editor-title" className="sr-only">{t('lesson.editTitle')}</h2>
    <div className="lesson-meta">
      <label className="teacher-field">{t('lesson.name')}<input className="quiz-input" value={lesson.title} onChange={event => onChange({ ...lesson, title: event.target.value })} maxLength={80} /></label>
      <label className="teacher-field">{t('lesson.notes')}<input className="quiz-input" value={lesson.description} onChange={event => onChange({ ...lesson, description: event.target.value })} maxLength={200} /></label>
    </div>

    <div className="lesson-workspace">
      <aside className="lesson-slide-rail" aria-label={t('lesson.slides')}>
        <ol className="lesson-slide-list">
          {slides.map((slide, index) => <li key={slide.id} className={index === selectedIndex ? 'is-selected' : ''}>
            <button type="button" className="lesson-slide-thumb" aria-current={index === selectedIndex ? 'true' : undefined} onClick={() => setSelected(index)}>
              <span className="lesson-slide-number">{index + 1}</span>
              <span className="lesson-slide-text"><strong>{typeLabel(slide.type, t)}</strong><small>{slideSummary(slide, exercises, concepts, t)}</small></span>
            </button>
            <span className="lesson-slide-tools">
              <button type="button" aria-label={t('lesson.up', { n: index + 1 })} disabled={index === 0} onClick={() => move(index, index - 1)}>↑</button>
              <button type="button" aria-label={t('lesson.down', { n: index + 1 })} disabled={index === slides.length - 1} onClick={() => move(index, index + 1)}>↓</button>
              <button type="button" aria-label={t('lesson.dup', { n: index + 1 })} onClick={() => duplicate(index)}>⧉</button>
              <button type="button" aria-label={t('lesson.remove', { n: index + 1 })} onClick={() => remove(index)}>✕</button>
            </span>
          </li>)}
        </ol>
        <div className="lesson-add-slide">
          <span>{t('lesson.addSlide')}</span>
          {SLIDE_TYPES.map(item => <button key={item.type} type="button" title={t(`lesson.typeDesc.${item.type}`)} onClick={() => addSlide(item.type)}>+ {typeLabel(item.type, t)}</button>)}
        </div>
      </aside>

      <div className="lesson-slide-editor">
        {current ? <>
          <div className="lesson-slide-editor-head">
            <h3>{t('lesson.slideN', { n: selectedIndex + 1, type: typeLabel(current.type, t) })}</h3>
            <button type="button" className="btn btn-secondary" onClick={() => onPresent(selectedIndex)}>{t('lesson.presentFrom')}</button>
          </div>
          <SlideEditor slide={current} exercises={exercises} concepts={concepts} onChange={updateCurrent} />
          <div className="projector-preview" aria-live="polite">
            <span className="projector-preview-label">{t('lesson.preview')}</span>
            <SlideView slide={current} exercises={exercises} concepts={concepts} showAnswer={false} />
          </div>
        </> : <p className="field-help">{t('lesson.addFromLeft')}</p>}
      </div>
    </div>
  </section>;
}

export function Presenter({ lesson, startAt = 0, exercises, concepts, onExit }) {
  const { t } = useTranslation();
  const [index, setIndex] = useState(Math.min(startAt, lesson.slides.length - 1));
  const [showAnswer, setShowAnswer] = useState(false);
  const stageRef = useRef(null);
  const total = lesson.slides.length;
  const go = useCallback(next => { setIndex(Math.max(0, Math.min(total - 1, next))); setShowAnswer(false); }, [total]);

  useEffect(() => {
    const onKey = event => {
      if (event.key === 'Escape') onExit();
      else if (['ArrowRight', 'PageDown', ' '].includes(event.key)) { event.preventDefault(); go(index + 1); }
      else if (['ArrowLeft', 'PageUp'].includes(event.key)) { event.preventDefault(); go(index - 1); }
      else if (event.key === 'Home') go(0);
      else if (event.key === 'End') go(total - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, go, total, onExit]);

  useEffect(() => {
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = oldOverflow;
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    };
  }, []);

  const toggleFullscreen = () => {
    try {
      if (document.fullscreenElement) document.exitFullscreen?.();
      else stageRef.current?.requestFullscreen?.();
    } catch { /* El navegador puede no permitir pantalla completa. */ }
  };

  return <div ref={stageRef} className="projector-stage lesson-stage" role="dialog" aria-modal="true" aria-label={t('lesson.projection', { title: lesson.title })}>
    <div className="projector-stage-toolbar">
      <span>{lesson.title} · {index + 1} / {total}</span>
      <span className="lesson-stage-actions">
        <button type="button" className="btn btn-secondary" onClick={toggleFullscreen}>{t('lesson.fullscreen')}</button>
        <button type="button" className="btn btn-secondary" autoFocus onClick={onExit}>{t('lesson.exit')} <kbd>Esc</kbd></button>
      </span>
    </div>
    <div className="projector-stage-content" aria-live="polite">
      <SlideView slide={lesson.slides[index]} exercises={exercises} concepts={concepts} large showAnswer={showAnswer} onToggleAnswer={() => setShowAnswer(value => !value)} />
    </div>
    <div className="lesson-stage-nav">
      <button type="button" className="btn btn-secondary" onClick={() => go(index - 1)} disabled={index === 0}>← {t('lesson.prev')}</button>
      <span className="lesson-stage-dots" aria-hidden="true">{lesson.slides.map((slide, position) => <i key={slide.id} className={position === index ? 'is-active' : ''} />)}</span>
      <button type="button" className="btn btn-primary" onClick={() => go(index + 1)} disabled={index === total - 1}>{t('lesson.next')} →</button>
    </div>
  </div>;
}

export default function LessonStudio({ exercises: exercisesProp, onCreateGroup }) {
  const { language } = useTranslation();
  const exercises = useMemo(() => (exercisesProp ?? exerciseCatalog).map(item => localizeCatalogItem(item, language)), [exercisesProp, language]);
  const concepts = useMemo(() => conceptCatalog.map(item => localizeCatalogItem(item, language)), [language]);
  const [lessons, setLessons] = useState(getLessons);
  const [editingId, setEditingId] = useState(null);
  const [presenting, setPresenting] = useState(null);
  const baseRef = useRef(null);

  const refresh = () => setLessons(getLessons());
  // Si se recuperaron presentaciones desde Supabase, se muestran sin recargar.
  useEffect(() => {
    const onChange = () => setLessons(getLessons());
    window.addEventListener('lessons-changed', onChange);
    return () => window.removeEventListener('lessons-changed', onChange);
  }, []);
  const [syncPending, setSyncPending] = useState(() => pendingTeacherSync().length);
  useEffect(() => subscribeTeacherSync(setSyncPending), []);
  const editing = lessons.find(item => item.id === editingId) ?? null;
  const presentingLesson = presenting ? lessons.find(item => item.id === presenting.id) : null;

  useEffect(() => {
    const base = baseRef.current;
    if (!base) return undefined;
    base.inert = Boolean(presentingLesson);
    return () => { base.inert = false; };
  }, [presentingLesson]);

  const create = title => {
    const lesson = saveLesson(createLesson(title));
    refresh();
    setEditingId(lesson.id);
  };
  const createGuided = () => {
    const practice = exercises.find(item => item.id === 'ew-02') ?? exercises[0];
    const lesson = saveLesson(createGuidedLesson('Movimiento parabólico · clase guiada', { practiceExerciseId: practice?.id ?? '' }));
    refresh();
    setEditingId(lesson.id);
  };
  const change = lesson => {
    saveLesson(lesson);
    refresh();
  };

  return <>
    <div ref={baseRef}>
      {editing
        ? <LessonEditor key={editing.id} lesson={editing} exercises={exercises} concepts={concepts} onChange={change} onBack={() => setEditingId(null)} onPresent={at => setPresenting({ id: editing.id, at })} />
        : <LessonList
          lessons={lessons}
          syncPending={syncPending}
          exercises={exercises}
          onCreateGroup={onCreateGroup}
          onCreate={create}
          onCreateGuided={createGuided}
          onEdit={setEditingId}
          onPresent={(id, at) => setPresenting({ id, at })}
          onDuplicate={id => { duplicateLesson(id); refresh(); }}
          onDelete={id => { deleteLesson(id); refresh(); }}
        />}
    </div>
    {presentingLesson && presentingLesson.slides.length > 0 && <Presenter
      lesson={presentingLesson}
      startAt={presenting.at}
      exercises={exercises}
      concepts={concepts}
      onExit={() => setPresenting(null)}
    />}
  </>;
}
