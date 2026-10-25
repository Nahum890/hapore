// Plan MEC del docente: elige el curso, ve las capacidades del programa (con
// resolución, páginas y Priorización 2021) y marca los temas que va a enseñar.
// Esos temas aparecen al alumno en "Elegidos por tu docente" y viajan con el
// grupo de la nube. Cada tema se puede proyectar en pantalla completa.
import { useEffect, useState } from 'react';
import { COURSES, GUIDE_SCHEDULES, GUIDE_C1_NOTE, courseById, courseTopicIds } from '../../curriculum/curriculum.js';
import { SOURCES } from '../../curriculum/sources.js';
import { topicById, pickLang } from '../../curriculum/topics/index.js';
import { getCourse, setCourse as saveCourse, getTeacherTopics, setTeacherTopics } from '../../curriculum/progress.js';
import { useTranslation } from '../../i18n/LanguageProvider.jsx';
import { Formula } from '../MathText.jsx';
import TopicIcon from './TopicIcon.jsx';
import SimLoader from './SimLoader.jsx';
import MecSources from './MecSources.jsx';
import './topics.css';

function Projector({ topicId, onClose }) {
  const { t, language } = useTranslation();
  const topic = topicById(topicId);
  useEffect(() => {
    const onKey = event => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [onClose]);
  if (!topic) return null;
  return <div className={`plan-projector area-${topic.area}`} role="dialog" aria-modal="true" aria-label={pickLang(topic.name, language)}>
    <header className="plan-projector-head">
      <span className="topic-header-icon"><TopicIcon name={topic.icon} size={30} /></span>
      <div><h2>{pickLang(topic.name, language)}</h2><p>{pickLang(topic.tagline, language)}</p></div>
      <button type="button" className="btn btn-secondary" onClick={onClose}>{t('plan.closeProjector')}</button>
    </header>
    <div className="plan-projector-formulas">{topic.formulas.slice(0, 4).map((item, i) => <span key={i} className="topic-formula"><Formula text={item.f} /></span>)}</div>
    <div className="plan-projector-sim"><SimLoader sim={topic.sim} /></div>
  </div>;
}

export default function TeacherCurriculum() {
  const { t, language } = useTranslation();
  const [courseId, setCourseId] = useState(getCourse);
  const [view, setView] = useState('program');
  const [selected, setSelected] = useState(getTeacherTopics);
  const [saved, setSaved] = useState(false);
  const [projected, setProjected] = useState(null);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const course = courseById(courseId);
  const schedule = GUIDE_SCHEDULES[courseId];

  const chooseCourse = id => { setCourseId(id); saveCourse(id); };
  const change = next => { setSelected(next); setSaved(false); };
  const toggle = id => change(selected.includes(id) ? selected.filter(item => item !== id) : [...selected, id]);
  const toggleUnit = ids => change(ids.every(id => selected.includes(id)) ? selected.filter(id => !ids.includes(id)) : [...new Set([...selected, ...ids])]);
  const save = () => { setTeacherTopics(selected); setSaved(true); };

  const topicChip = id => {
    const topic = topicById(id);
    if (!topic) return null;
    const on = selected.includes(id);
    return <span key={id} className={`plan-topic area-${topic.area}${on ? ' is-on' : ''}`}>
      <button type="button" className="plan-topic-toggle" aria-pressed={on} onClick={() => toggle(id)}>
        <span className="plan-topic-check" aria-hidden="true">{on && <TopicIcon name="check" size={14} />}</span>{pickLang(topic.name, language)}
      </button>
      <button type="button" className="plan-topic-project" title={t('plan.project')} aria-label={`${t('plan.project')}: ${pickLang(topic.name, language)}`} onClick={() => setProjected(id)}><TopicIcon name="play" size={14} /></button>
    </span>;
  };

  return <section className="card teacher-tool-panel teacher-plan" aria-label={t('plan.title')}>
    <span className="panel-eyebrow">{t('plan.tool')}</span>
    <h2>{t('plan.title')}</h2>
    <p className="teacher-note">{t('plan.lead')}</p>

    <div className="topics-courses-row" role="tablist" aria-label={t('topics.course')}>
      {COURSES.map(item => <button key={item.id} type="button" role="tab" aria-selected={item.id === courseId} className={`topics-course${item.id === courseId ? ' is-active' : ''}`} onClick={() => chooseCourse(item.id)}>
        <strong>{pickLang(item.name, language)}</strong><small>{pickLang(item.planName, language)}</small>
      </button>)}
    </div>
    <div className="topics-source-line">
      <span>{course.base ? `${SOURCES.A.resolution} · ${course.base.pages}${course.prio ? ` · ${pickLang(SOURCES.B.short, language)} ${course.prio.pages}` : ''}` : `${pickLang(SOURCES.C.short, language)} · ${schedule?.pages ?? ''}`}</span>
      <button type="button" className="topics-link" onClick={() => setSourcesOpen(true)}><TopicIcon name="source" size={16} />{t('topics.sourcesBtn')}</button>
    </div>

    <div className="topics-toolbar">
      <div className="topics-segment" role="group">
        {[['program', 'topics.programOrder'], ['guide', 'plan.schedule']].map(([id, key]) => <button key={id} type="button" aria-pressed={view === id} className={view === id ? 'is-active' : ''} onClick={() => setView(id)}>{t(key)}</button>)}
      </div>
    </div>

    {view === 'guide'
      ? (!schedule ? <p className="topics-note">{pickLang(GUIDE_C1_NOTE, language)}</p> : <>
        <p className="topics-note"><strong>{pickLang(schedule.label, language)}</strong> · {schedule.pages}</p>
        <ol className="topics-weeks">{schedule.weeks.map((week, index) => <li key={index} className={`is-${week.kind}`}>
          <span className="topics-week-code">{week.code ?? '—'}</span>
          <div><small>{week.dates}</small><p>{week.text}</p>{week.topics.length > 0 && <div className="topics-week-links">{week.topics.map(topicChip)}</div>}</div>
        </li>)}</ol>
      </>)
      : course.units.map(unit => {
        const unitIds = [...new Set(unit.capacities.flatMap(capacity => capacity.topics))];
        return <section key={unit.id} className="plan-unit">
          <div className="plan-unit-head"><h3>{pickLang(unit.name, language)}</h3>
            <button type="button" className="topics-link" onClick={() => toggleUnit(unitIds)}>{t('plan.selectAll')}</button></div>
          <ol className="plan-capacities">{unit.capacities.map((capacity, index) => <li key={`${capacity.n ?? 'g'}-${index}`}>
            <div className="plan-capacity-text">
              {capacity.n && <span className="topic-chip">{t('topics.capacity', { n: capacity.n })}</span>}
              {capacity.prio !== null && <span className="topic-chip is-prio">{t('topics.prioBadge')} n.º {capacity.prio}</span>}
              <p>“{capacity.text}”</p>
            </div>
            <div className="plan-topic-list">{capacity.topics.map(topicChip)}</div>
          </li>)}</ol>
        </section>;
      })}

    <div className="plan-footer" role="status">
      <strong>{t('plan.selected', { n: selected.length })}</strong>
      <span className="plan-footer-actions">
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => change([])} disabled={!selected.length}>{t('plan.clear')}</button>
        <button type="button" className="btn btn-primary btn-sm" onClick={save}>{t('plan.save')}</button>
      </span>
      {saved && <p className="plan-saved">{t('plan.saved')}</p>}
    </div>
    <p className="field-help">{t('plan.courseCount', { n: courseTopicIds(courseId).length })}</p>
    {projected && <Projector topicId={projected} onClose={() => setProjected(null)} />}
    <MecSources open={sourcesOpen} onClose={() => setSourcesOpen(false)} />
  </section>;
}
