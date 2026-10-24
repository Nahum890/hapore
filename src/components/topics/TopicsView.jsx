// Lista de temas por curso: el alumno elige su curso (Educación Media), ve las
// unidades del programa del MEC y entra a un tema. Puede marcar "mis temas" y
// ver el orden de la Guía 2021.
import { useMemo, useState } from 'react';
import { COURSES, GUIDE_SCHEDULES, GUIDE_C1_NOTE, courseById } from '../../curriculum/curriculum.js';
import { SOURCES } from '../../curriculum/sources.js';
import { topicById, pickLang, normalize, AREAS } from '../../curriculum/topics/index.js';
import { getCourse, setCourse as saveCourse, getMyTopics, toggleMyTopic, topicStats } from '../../curriculum/progress.js';
import { useTranslation } from '../../i18n/LanguageProvider.jsx';
import TopicIcon from './TopicIcon.jsx';
import MecSources from './MecSources.jsx';
import './topics.css';

function TopicCard({ topic, prio, solved, mine, onOpen, onToggleMine, language, t, picked }) {
  return <article className={`topic-card area-${topic.area}${picked ? ' is-picked' : ''}`}>
    <button type="button" className="topic-card-main" onClick={() => onOpen(topic.id)}>
      <span className="topic-card-icon"><TopicIcon name={topic.icon} size={26} /></span>
      <span className="topic-card-text">
        <strong>{pickLang(topic.name, language)}</strong>
        <small>{pickLang(topic.tagline, language)}</small>
      </span>
    </button>
    <div className="topic-card-foot">
      {prio && <span className="topic-chip is-prio">{t('topics.prioBadge')}</span>}
      {solved > 0 && <span className="topic-chip is-done"><TopicIcon name="check" size={13} />{t('topics.solved', { n: solved })}</span>}
      <button type="button" className={`topic-star${mine ? ' is-on' : ''}`} aria-pressed={mine} aria-label={t(mine ? 'topics.removeMine' : 'topics.addMine')} title={t(mine ? 'topics.removeMine' : 'topics.addMine')} onClick={() => onToggleMine(topic.id)}>
        <TopicIcon name="star" size={18} filled={mine} />
      </button>
    </div>
  </article>;
}

export default function TopicsView({ learning, teacherTopics = [], onOpenTopic }) {
  const { t, language } = useTranslation();
  const [courseId, setCourseId] = useState(getCourse);
  const [filter, setFilter] = useState('all');
  const [order, setOrder] = useState('program');
  const [query, setQuery] = useState('');
  const [mine, setMine] = useState(getMyTopics);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const course = courseById(courseId);
  const stats = useMemo(() => topicStats(learning.attemptLog), [learning.attemptLog]);
  const schedule = GUIDE_SCHEDULES[courseId];
  const chooseCourse = id => { setCourseId(id); saveCourse(id); if (id !== 'c1' && order === 'guide' && !GUIDE_SCHEDULES[id]) setOrder('program'); };
  const toggle = id => setMine(toggleMyTopic(id));
  const q = normalize(query);
  const matches = topic => !q || normalize(`${topic.name.es} ${topic.name.gn} ${(topic.keywords ?? []).join(' ')}`).includes(q);
  const passes = (topic, prio) => matches(topic) && (filter === 'all' || (filter === 'mine' && mine.includes(topic.id)) || (filter === 'prio' && prio));
  const picked = teacherTopics.map(topicById).filter(Boolean);

  const card = (topic, prio, key) => <TopicCard key={key ?? topic.id} topic={topic} prio={prio} solved={stats[topic.id]?.correct ?? 0} mine={mine.includes(topic.id)} picked={teacherTopics.includes(topic.id)} onOpen={onOpenTopic} onToggleMine={toggle} language={language} t={t} />;

  const units = course.units.map(unit => {
    const seen = new Set();
    const items = [];
    for (const capacity of unit.capacities) for (const id of capacity.topics) {
      if (seen.has(id)) continue;
      seen.add(id);
      const topic = topicById(id);
      if (topic && passes(topic, capacity.prio !== null)) items.push({ topic, prio: capacity.prio !== null });
    }
    return { unit, items };
  }).filter(group => group.items.length);

  return <div className="topics-view">
    <section className="topics-courses" aria-label={t('topics.course')}>
      <div className="topics-courses-row" role="tablist">
        {COURSES.map(item => <button key={item.id} type="button" role="tab" aria-selected={item.id === courseId} className={`topics-course${item.id === courseId ? ' is-active' : ''}`} onClick={() => chooseCourse(item.id)}>
          <strong>{pickLang(item.name, language)}</strong>
          <small>{pickLang(item.planName, language)}</small>
        </button>)}
      </div>
      <p className="topics-course-scope">{pickLang(course.scope, language)}</p>
      <div className="topics-source-line">
        <span>{course.base ? `${SOURCES.A.resolution} · ${t('topics.levelNote')} · ${course.base.pages}` : `${pickLang(SOURCES.C.short, language)} · ${GUIDE_SCHEDULES.c3c.pages}`}</span>
        <button type="button" className="topics-link" onClick={() => setSourcesOpen(true)}><TopicIcon name="source" size={16} />{t('topics.sourcesBtn')}</button>
      </div>
      {course.guideNote && <p className="topics-note">{pickLang(course.guideNote, language)}</p>}
    </section>

    {picked.length > 0 && <section className="topics-picked">
      <h2>{t('topics.teacherPicked')}</h2>
      <div className="topic-grid">{picked.map(topic => card(topic, false, `p-${topic.id}`))}</div>
    </section>}

    <div className="topics-toolbar">
      <div className="topics-segment" role="group" aria-label={t('topics.filter')}>
        {[['all', 'topics.all'], ['mine', 'topics.mine'], ['prio', 'topics.prio']].map(([id, key]) => <button key={id} type="button" aria-pressed={filter === id} className={filter === id ? 'is-active' : ''} onClick={() => setFilter(id)}>{t(key)}</button>)}
      </div>
      {courseId !== 'c3c' && <div className="topics-segment" role="group" aria-label={t('topics.order')}>
        {[['program', 'topics.programOrder'], ['guide', 'topics.guideOrder']].map(([id, key]) => <button key={id} type="button" aria-pressed={order === id} className={order === id ? 'is-active' : ''} onClick={() => setOrder(id)}>{t(key)}</button>)}
      </div>}
      <input className="quiz-input topics-search" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={t('topics.search')} aria-label={t('topics.search')} />
    </div>

    {order === 'guide' && courseId !== 'c3c' ? <section className="topics-guide">
      {!schedule ? <p className="topics-note">{pickLang(GUIDE_C1_NOTE, language)}</p> : <>
        <p className="topics-note"><strong>{pickLang(schedule.label, language)}</strong> · {schedule.pages}{schedule.note ? ` — ${pickLang(schedule.note, language)}` : ''}</p>
        <ol className="topics-weeks">{schedule.weeks.map((week, index) => <li key={index} className={`is-${week.kind}`}>
          <span className="topics-week-code">{week.code ?? '—'}</span>
          <div><small>{week.dates}</small><p>{week.text}</p>
            {week.topics.length > 0 && <div className="topics-week-links">{week.topics.map(id => { const topic = topicById(id); return topic && <button key={id} type="button" className="topic-chip is-link" onClick={() => onOpenTopic(id)}>{pickLang(topic.name, language)}</button>; })}</div>}
          </div>
        </li>)}</ol>
      </>}
    </section> : units.length ? units.map(({ unit, items }) => <section key={unit.id} className="topics-unit">
      <h2>{pickLang(unit.name, language)}</h2>
      <div className="topic-grid">{items.map(item => card(item.topic, item.prio))}</div>
    </section>) : <p className="topics-empty">{t(filter === 'mine' ? 'topics.emptyMine' : 'topics.emptySearch')}</p>}

    {course.prioNote && order === 'program' && <p className="topics-note">{pickLang(course.prioNote, language)}</p>}
    <MecSources open={sourcesOpen} onClose={() => setSourcesOpen(false)} />
  </div>;
}

export { AREAS };
