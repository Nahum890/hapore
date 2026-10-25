// Página de un tema: Aprender (corto), Simulador, Practicar y Preguntas,
// con la cita del MEC (curso, capacidad, resolución, páginas, Priorización
// 2021 y semana de la Guía 2021).
import { useEffect, useState } from 'react';
import { topicById, topicCurriculum, pickLang } from '../../curriculum/topics/index.js';
import { SOURCES, FORMULA_NOTE } from '../../curriculum/sources.js';
import { GUIDE_SCHEDULES } from '../../curriculum/curriculum.js';
import { getMyTopics, toggleMyTopic, setLastTopic } from '../../curriculum/progress.js';
import { useTranslation } from '../../i18n/LanguageProvider.jsx';
import { Formula } from '../MathText.jsx';
import TopicIcon from './TopicIcon.jsx';
import TopicPractice from './TopicPractice.jsx';
import TopicQuiz from './TopicQuiz.jsx';
import SimLoader from './SimLoader.jsx';
import MecSources from './MecSources.jsx';
import './topics.css';

const TABS = ['learn', 'sim', 'practice', 'quiz'];
const TAB_KEYS = { learn: 'topics.tabLearn', sim: 'topics.tabSim', practice: 'topics.tabPractice', quiz: 'topics.tabQuiz' };

// Una línea por cronograma de la Guía 2021, con todas sus semanas juntas.
function groupGuideWeeks(guideWeeks) {
  const groups = new Map();
  for (const { schedule, week } of guideWeeks) {
    if (!groups.has(schedule)) groups.set(schedule, { schedule, weeks: [] });
    groups.get(schedule).weeks.push(week);
  }
  return [...groups.values()];
}

function MecPanel({ topicId, onOpenSources }) {
  const { t, language } = useTranslation();
  const { placements, guideWeeks } = topicCurriculum(topicId);
  return <section className="topic-mec card" aria-label={t('topics.source')}>
    <div className="topic-mec-head"><span className="panel-eyebrow">{t('topics.source')}</span>
      <button type="button" className="topics-link" onClick={onOpenSources}><TopicIcon name="source" size={16} />{t('topics.sourcesBtn')}</button>
    </div>
    <ul className="topic-mec-list">
      {placements.map(({ course, unit, capacity }) => <li key={`${course.id}-${unit.id}-${capacity.n}`}>
        <strong>{pickLang(course.name, language)} · {pickLang(course.planName, language)} · {pickLang(unit.name, language)}</strong>
        <p>{capacity.n ? `${t('topics.capacity', { n: capacity.n })}: ` : ''}“{capacity.text}”</p>
        <small>{course.base ? `${SOURCES.A.resolution} · ${pickLang(SOURCES.A.short, language)}, ${course.base.pages}` : `${pickLang(SOURCES.C.short, language)}, ${GUIDE_SCHEDULES[course.id]?.pages ?? ''}`}
          {course.prio && <> · {capacity.prio ? `${t('topics.prioBadge')} (n.º ${capacity.prio}, ${course.prio.pages})` : t('topics.notPrio')}</>}</small>
      </li>)}
    </ul>
    {guideWeeks.length > 0
      ? <ul className="topic-mec-guide">{groupGuideWeeks(guideWeeks).map(({ schedule, weeks }) => {
        const codes = weeks.map(week => (week.kind === 'nivelacion' ? `${t('topics.leveling')} ${week.code}` : week.code));
        const label = t(weeks.length > 1 ? 'topics.weeksLabel' : 'topics.weekLabel').toLowerCase();
        const dates = weeks.length > 1 ? `${weeks[0].dates} … ${weeks.at(-1).dates}` : weeks[0].dates;
        return <li key={schedule.label.es}>{t('topics.guideWeek', { course: pickLang(schedule.label, language).replace(/^Guía 2021 · /, ''), code: `${label} ${codes.join(', ')}`, dates: `${dates} de 2021` })}</li>;
      })}</ul>
      : <p className="topic-mec-guide">{t('topics.guideNone')}</p>}
  </section>;
}

export default function TopicPage({ topicId, initialTab = 'learn', onBack, learning, renderLegacy }) {
  const { t, language } = useTranslation();
  const topic = topicById(topicId);
  const [tab, setTab] = useState(TABS.includes(initialTab) ? initialTab : 'learn');
  const [mine, setMine] = useState(() => getMyTopics().includes(topicId));
  const [sourcesOpen, setSourcesOpen] = useState(false);
  useEffect(() => { setLastTopic(topicId); setTab(TABS.includes(initialTab) ? initialTab : 'learn'); setMine(getMyTopics().includes(topicId)); window.scrollTo?.({ top: 0 }); }, [topicId, initialTab]);
  if (!topic) return null;
  const { placements } = topicCurriculum(topic.id);
  const prio = placements.some(item => item.capacity.prio !== null);

  return <div className={`topic-page area-${topic.area}`}>
    <button type="button" className="topic-back" onClick={onBack}><TopicIcon name="back" size={18} />{t('topics.back')}</button>
    <header className="topic-header">
      <span className="topic-header-icon"><TopicIcon name={topic.icon} size={34} /></span>
      <div className="topic-header-copy">
        <h2>{pickLang(topic.name, language)}</h2>
        <p>{pickLang(topic.tagline, language)}</p>
        <div className="topic-header-chips">
          {[...new Set(placements.map(item => `${pickLang(item.course.name, language)} · ${pickLang(item.course.planName, language)}`))].map(label => <span key={label} className="topic-chip">{label}</span>)}
          {prio && <span className="topic-chip is-prio">{t('topics.prioBadge')}</span>}
        </div>
      </div>
      <button type="button" className={`topic-star is-large${mine ? ' is-on' : ''}`} aria-pressed={mine} aria-label={t(mine ? 'topics.removeMine' : 'topics.addMine')} title={t(mine ? 'topics.removeMine' : 'topics.addMine')} onClick={() => setMine(toggleMyTopic(topic.id).includes(topic.id))}><TopicIcon name="star" size={22} filled={mine} /></button>
    </header>

    <nav className="topic-tabs" role="tablist" aria-label={pickLang(topic.name, language)}>
      {TABS.map(id => <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? 'is-active' : ''} onClick={() => setTab(id)}>{t(TAB_KEYS[id])}</button>)}
    </nav>

    {tab === 'learn' && <div className="topic-learn">
      <section className="card topic-summary">
        <span className="panel-eyebrow">{t('topics.summary')}</span>
        <ul>{pickLang(topic.summary, language).map((line, i) => <li key={i}>{line}</li>)}</ul>
      </section>
      <section className="card topic-formulas">
        <span className="panel-eyebrow">{t('topics.formulas')}</span>
        <div className="topic-formula-grid">{topic.formulas.map((item, i) => <div key={i} className="topic-formula"><Formula text={item.f} /><small>{pickLang(item, language)}</small></div>)}</div>
        <p className="topic-formula-note">{pickLang(FORMULA_NOTE, language)}</p>
      </section>
      <div className="topic-pair">
        <section className="card topic-aside is-example"><span className="panel-eyebrow">{t('topics.example')}</span><p>{pickLang(topic.example, language)}</p></section>
        <section className="card topic-aside is-mistake"><span className="panel-eyebrow">{t('topics.mistake')}</span><p>{pickLang(topic.mistake, language)}</p></section>
      </div>
      {topic.experiment && <section className="card topic-aside is-experiment"><span className="panel-eyebrow">{t('topics.experiment')}</span><p>{pickLang(topic.experiment, language)}</p></section>}
      <MecPanel topicId={topic.id} onOpenSources={() => setSourcesOpen(true)} />
    </div>}

    {tab === 'sim' && <SimLoader sim={topic.sim} />}
    {tab === 'practice' && <>
      <TopicPractice topic={topic} onResult={learning?.onExerciseResult} />
      {topic.legacyPractice && renderLegacy && <details className="topic-legacy card" open>
        <summary>{t('topics.legacy')}</summary>
        {renderLegacy()}
      </details>}
    </>}
    {tab === 'quiz' && <TopicQuiz topic={topic} onAnswer={learning?.onQuizAnswer} />}
    <MecSources open={sourcesOpen} onClose={() => setSourcesOpen(false)} />
  </div>;
}
