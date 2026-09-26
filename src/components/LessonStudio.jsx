import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { concepts as conceptCatalog, exercises as exerciseCatalog, localizeCatalogItem } from '../data/catalogs.js';
import { useTranslation } from '../i18n/LanguageProvider.jsx';
import {
  GRAVITY_PRESETS, SLIDE_TYPES, createLesson, createSlide, deleteLesson, duplicateLesson,
  getLessons, launchErrors, moveItem, saveLesson,
} from '../utils/lessons.js';
import { SlideView, slideSummary } from './LessonSlides.jsx';

const typeLabel = type => SLIDE_TYPES.find(item => item.type === type)?.label ?? type;
const formatDate = iso => { try { return new Date(iso).toLocaleDateString('es-PY', { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return ''; } };

function LessonList({ lessons, onCreate, onEdit, onPresent, onDuplicate, onDelete }) {
  const [title, setTitle] = useState('');
  const [confirmId, setConfirmId] = useState(null);
  const create = event => { event.preventDefault(); onCreate(title); setTitle(''); };
  return <section className="card teacher-tool-panel lesson-list-panel" aria-labelledby="lesson-list-title">
    <span className="panel-eyebrow">PRESENTACIONES</span>
    <h2 id="lesson-list-title">Mis clases</h2>
    <p className="teacher-note">Prepará tu clase como una presentación: agregá diapositivas de portada, texto, conceptos, ejercicios y simulaciones con los valores que quieras. Después proyectala desde acá.</p>
    <form className="lesson-create" onSubmit={create}>
      <label className="teacher-field">Nombre de la nueva clase
        <input className="quiz-input" value={title} onChange={event => setTitle(event.target.value)} placeholder="Ej.: Tiro parabólico · 3.º B" maxLength={80} />
      </label>
      <button type="submit" className="btn btn-primary">Crear clase</button>
    </form>
    {lessons.length === 0
      ? <p className="field-help">Todavía no creaste ninguna clase. Las clases quedan guardadas en tu cuenta, en este dispositivo.</p>
      : <ul className="lesson-list">
        {[...lessons].sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt))).map(lesson => <li key={lesson.id} className="lesson-item">
          <div className="lesson-item-info">
            <h3>{lesson.title}</h3>
            <p>{lesson.slides.length} {lesson.slides.length === 1 ? 'diapositiva' : 'diapositivas'} · editada el {formatDate(lesson.updatedAt)}</p>
            {lesson.description && <p className="lesson-item-description">{lesson.description}</p>}
          </div>
          <div className="lesson-item-actions">
            <button type="button" className="btn btn-primary" onClick={() => onPresent(lesson.id, 0)} disabled={!lesson.slides.length}>Proyectar</button>
            <button type="button" className="btn btn-secondary" onClick={() => onEdit(lesson.id)}>Editar</button>
            <button type="button" className="btn btn-secondary" onClick={() => onDuplicate(lesson.id)}>Duplicar</button>
            {confirmId === lesson.id
              ? <><button type="button" className="btn btn-danger" onClick={() => { onDelete(lesson.id); setConfirmId(null); }}>Sí, eliminar</button><button type="button" className="btn btn-secondary" onClick={() => setConfirmId(null)}>Cancelar</button></>
              : <button type="button" className="btn btn-secondary" onClick={() => setConfirmId(lesson.id)}>Eliminar</button>}
          </div>
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
  const set = patch => onChange({ ...slide, ...patch });
  if (slide.type === 'titulo') return <div className="lesson-slide-form">
    <label className="teacher-field">Título<input className="quiz-input" value={slide.title} onChange={event => set({ title: event.target.value })} maxLength={120} /></label>
    <label className="teacher-field">Subtítulo (opcional)<textarea className="quiz-input" rows={2} value={slide.subtitle} onChange={event => set({ subtitle: event.target.value })} placeholder="Ej.: Docente, curso, fecha" /></label>
  </div>;
  if (slide.type === 'texto') return <div className="lesson-slide-form">
    <label className="teacher-field">Título (opcional)<input className="quiz-input" value={slide.title} onChange={event => set({ title: event.target.value })} maxLength={120} /></label>
    <label className="teacher-field">Contenido<textarea className="quiz-input" rows={7} value={slide.body} onChange={event => set({ body: event.target.value })} placeholder={'Una idea por línea.\n- Empezá cada línea con un guion\n- para que se vea como lista'} /></label>
  </div>;
  if (slide.type === 'concepto') return <div className="lesson-slide-form">
    <label className="teacher-field">Concepto<select className="quiz-input" value={slide.conceptId} onChange={event => set({ conceptId: event.target.value })}>
      <option value="">Elegí un concepto…</option>
      {concepts.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
    </select></label>
  </div>;
  if (slide.type === 'ejercicio') return <div className="lesson-slide-form">
    <label className="teacher-field">Ejercicio<select className="quiz-input" value={slide.exerciseId} onChange={event => set({ exerciseId: event.target.value })}>
      <option value="">Elegí un ejercicio…</option>
      {exercises.map(item => <option key={item.id} value={item.id}>{item.custom ? 'Propio · ' : ''}{item.question}</option>)}
    </select></label>
    <p className="field-help">La respuesta queda oculta al proyectar; la mostrás con un botón cuando la clase terminó de resolverlo.</p>
  </div>;
  if (slide.type === 'simulador') {
    const errors = launchErrors(slide);
    const compareErrors = slide.compare ? launchErrors({ v0: slide.v0B, angle: slide.angleB, gravity: slide.gravity }) : {};
    return <div className="lesson-slide-form">
      <label className="teacher-field">Título (opcional)<input className="quiz-input" value={slide.title} onChange={event => set({ title: event.target.value })} placeholder="Ej.: ¿Qué pasa si duplicamos la velocidad?" maxLength={120} /></label>
      <p className="field-help">Escribí cualquier valor: no hay topes, solo tienen que tener sentido físico.</p>
      <div className="lesson-values-grid">
        <NumberField label="Velocidad inicial" unit="m/s" value={slide.v0} error={errors.v0} onChange={value => set({ v0: value })} />
        <NumberField label="Ángulo" unit="°" value={slide.angle} error={errors.angle} onChange={value => set({ angle: value })} />
        <NumberField label="Gravedad" unit="m/s²" value={slide.gravity} error={errors.gravity} onChange={value => set({ gravity: value })} />
      </div>
      <div className="lesson-gravity-presets" role="group" aria-label="Gravedad rápida">
        {GRAVITY_PRESETS.map(item => <button key={item.value} type="button" className={Number(slide.gravity) === item.value ? 'is-active' : ''} aria-pressed={Number(slide.gravity) === item.value} onClick={() => set({ gravity: item.value })}>{item.label}</button>)}
      </div>
      <label className="lesson-compare-toggle"><input type="checkbox" checked={Boolean(slide.compare)} onChange={event => set({ compare: event.target.checked })} /> Comparar con otro lanzamiento (misma gravedad)</label>
      {slide.compare && <div className="lesson-values-grid">
        <NumberField label="Velocidad del segundo" unit="m/s" value={slide.v0B} error={compareErrors.v0} onChange={value => set({ v0B: value })} />
        <NumberField label="Ángulo del segundo" unit="°" value={slide.angleB} error={compareErrors.angle} onChange={value => set({ angleB: value })} />
      </div>}
    </div>;
  }
  return null;
}

function LessonEditor({ lesson, exercises, concepts, onChange, onBack, onPresent }) {
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
      <button type="button" className="btn btn-secondary" onClick={onBack}>← Mis clases</button>
      <span className="field-help" role="status">Los cambios se guardan solos.</span>
      <button type="button" className="btn btn-primary" onClick={() => onPresent(0)} disabled={!slides.length}>Proyectar clase</button>
    </div>
    <h2 id="lesson-editor-title" className="sr-only">Editar clase</h2>
    <div className="lesson-meta">
      <label className="teacher-field">Nombre de la clase<input className="quiz-input" value={lesson.title} onChange={event => onChange({ ...lesson, title: event.target.value })} maxLength={80} /></label>
      <label className="teacher-field">Descripción o notas (solo las ves vos)<input className="quiz-input" value={lesson.description} onChange={event => onChange({ ...lesson, description: event.target.value })} placeholder="Ej.: curso, objetivo de la clase" maxLength={200} /></label>
    </div>

    <div className="lesson-workspace">
      <aside className="lesson-slide-rail" aria-label="Diapositivas">
        <ol className="lesson-slide-list">
          {slides.map((slide, index) => <li key={slide.id} className={index === selectedIndex ? 'is-selected' : ''}>
            <button type="button" className="lesson-slide-thumb" aria-current={index === selectedIndex ? 'true' : undefined} onClick={() => setSelected(index)}>
              <span className="lesson-slide-number">{index + 1}</span>
              <span className="lesson-slide-text"><strong>{typeLabel(slide.type)}</strong><small>{slideSummary(slide, exercises, concepts)}</small></span>
            </button>
            <span className="lesson-slide-tools">
              <button type="button" aria-label={`Subir diapositiva ${index + 1}`} disabled={index === 0} onClick={() => move(index, index - 1)}>↑</button>
              <button type="button" aria-label={`Bajar diapositiva ${index + 1}`} disabled={index === slides.length - 1} onClick={() => move(index, index + 1)}>↓</button>
              <button type="button" aria-label={`Duplicar diapositiva ${index + 1}`} onClick={() => duplicate(index)}>⧉</button>
              <button type="button" aria-label={`Eliminar diapositiva ${index + 1}`} onClick={() => remove(index)}>✕</button>
            </span>
          </li>)}
        </ol>
        <div className="lesson-add-slide">
          <span>Agregar diapositiva</span>
          {SLIDE_TYPES.map(item => <button key={item.type} type="button" title={item.description} onClick={() => addSlide(item.type)}>+ {item.label}</button>)}
        </div>
      </aside>

      <div className="lesson-slide-editor">
        {current ? <>
          <div className="lesson-slide-editor-head">
            <h3>Diapositiva {selectedIndex + 1} · {typeLabel(current.type)}</h3>
            <button type="button" className="btn btn-secondary" onClick={() => onPresent(selectedIndex)}>Proyectar desde acá</button>
          </div>
          <SlideEditor slide={current} exercises={exercises} concepts={concepts} onChange={updateCurrent} />
          <div className="projector-preview" aria-live="polite">
            <span className="projector-preview-label">Vista previa</span>
            <SlideView slide={current} exercises={exercises} concepts={concepts} showAnswer={false} />
          </div>
        </> : <p className="field-help">Agregá una diapositiva desde el panel de la izquierda.</p>}
      </div>
    </div>
  </section>;
}

export function Presenter({ lesson, startAt = 0, exercises, concepts, onExit }) {
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

  return <div ref={stageRef} className="projector-stage lesson-stage" role="dialog" aria-modal="true" aria-label={`Proyección de ${lesson.title}`}>
    <div className="projector-stage-toolbar">
      <span>{lesson.title} · {index + 1} / {total}</span>
      <span className="lesson-stage-actions">
        <button type="button" className="btn btn-secondary" onClick={toggleFullscreen}>Pantalla completa</button>
        <button type="button" className="btn btn-secondary" autoFocus onClick={onExit}>Salir <kbd>Esc</kbd></button>
      </span>
    </div>
    <div className="projector-stage-content" aria-live="polite">
      <SlideView slide={lesson.slides[index]} exercises={exercises} concepts={concepts} large showAnswer={showAnswer} onToggleAnswer={() => setShowAnswer(value => !value)} />
    </div>
    <div className="lesson-stage-nav">
      <button type="button" className="btn btn-secondary" onClick={() => go(index - 1)} disabled={index === 0}>← Anterior</button>
      <span className="lesson-stage-dots" aria-hidden="true">{lesson.slides.map((slide, position) => <i key={slide.id} className={position === index ? 'is-active' : ''} />)}</span>
      <button type="button" className="btn btn-primary" onClick={() => go(index + 1)} disabled={index === total - 1}>Siguiente →</button>
    </div>
  </div>;
}

export default function LessonStudio({ exercises: exercisesProp }) {
  const { language } = useTranslation();
  const exercises = useMemo(() => (exercisesProp ?? exerciseCatalog).map(item => localizeCatalogItem(item, language)), [exercisesProp, language]);
  const concepts = useMemo(() => conceptCatalog.map(item => localizeCatalogItem(item, language)), [language]);
  const [lessons, setLessons] = useState(getLessons);
  const [editingId, setEditingId] = useState(null);
  const [presenting, setPresenting] = useState(null);
  const baseRef = useRef(null);

  const refresh = () => setLessons(getLessons());
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
          onCreate={create}
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
