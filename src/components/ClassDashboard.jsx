import { useMemo, useState } from 'react';
import Avatar from './Avatars.jsx';
import ContactLinks from './ContactLinks.jsx';
import { MathText } from './MathText.jsx';
import { useTranslation } from '../i18n/LanguageProvider.jsx';
import { DASHBOARD_TOPICS, commonDifficulties, mergeTopicStats, percent } from '../pedagogy/progression.js';
import './ClassDashboard.css';

const formatWhen = iso => { if (!iso) return null; try { return new Date(iso).toLocaleString('es-PY', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch { return null; } };

function Bar({ value, tone }) {
  return <span className={'dash-bar' + (tone ? ` is-${tone}` : '')} aria-hidden="true"><span style={{ width: `${Math.max(0, Math.min(100, value ?? 0))}%` }} /></span>;
}

const toneFor = value => (value === null ? null : value >= 75 ? 'good' : value >= 60 ? 'ok' : 'low');

function TopicBars({ stats }) {
  const { t } = useTranslation();
  const rows = DASHBOARD_TOPICS.map(topic => {
    const item = stats[topic] ?? { attempts: 0, correct: 0 };
    return { topic, ...item, pct: percent(item.correct, item.attempts) };
  });
  return <ul className="dash-topics">
    {rows.map(row => <li key={row.topic}>
      <div className="dash-topic-head"><strong>{t(`dash.topic.${row.topic}`)}</strong><span>{row.pct === null ? t('dash.noTopicData') : `${row.pct}%`}</span></div>
      <Bar value={row.pct} tone={toneFor(row.pct)} />
      {row.attempts > 0 && <small>{t('dash.attemptsTopic', { c: row.correct, a: row.attempts })}</small>}
    </li>)}
  </ul>;
}

function StudentDetail({ student, exercises, onBack }) {
  const { t } = useTranslation();
  const accuracy = percent(student.correct, student.attempts);
  const byId = useMemo(() => new Map((exercises ?? []).map(item => [item.id, item])), [exercises]);
  const recent = (student.log ?? []).filter(entry => entry?.exerciseId).slice(-8).reverse();
  return <div className="dash-detail">
    <button type="button" className="btn btn-text dash-back" onClick={onBack}>{t('dash.back')}</button>
    <div className="dash-detail-head">
      <Avatar id={student.avatar} size={52} />
      <div>
        <h3>{student.name}</h3>
        <p>{t('dash.xp', { n: student.xp ?? 0, l: student.level ?? 1 })} · {t('dash.confidence', { n: student.confidence ?? 0 })}</p>
        <ContactLinks person={student} />
      </div>
    </div>
    <div className="dash-cards">
      <div className="dash-card"><span>{t('dash.exercisesDone')}</span><strong>{student.attempts ?? 0}</strong></div>
      <div className="dash-card"><span>{t('dash.correct')}</span><strong>{student.correct ?? 0}</strong></div>
      <div className="dash-card"><span>{t('dash.solved')}</span><strong>{student.solved ?? 0}</strong></div>
      <div className="dash-card"><span>{t('dash.performance')}</span><strong>{accuracy === null ? '—' : `${accuracy}%`}</strong></div>
    </div>
    <h4>{t('dash.byTopic')}</h4>
    <TopicBars stats={student.topicStats ?? {}} />
    {student.log && <>
      <h4>{t('dash.recent')}</h4>
      {recent.length
        ? <ol className="dash-recent">{recent.map((entry, index) => <li key={index} className={entry.correct ? 'is-ok' : 'is-wrong'}>
          <span className="dash-recent-mark">{entry.correct ? '✓' : '✗'}</span>
          <MathText text={byId.get(entry.exerciseId)?.question ?? entry.exerciseId} />
          <small>{t(entry.correct ? 'dash.ok' : 'dash.wrong')}{entry.errorType ? ` · ${t(`error.${entry.errorType}`)}` : ''}</small>
        </li>)}</ol>
        : <p className="field-help">{t('dash.noRecent')}</p>}
    </>}
    {student.lastSync !== undefined && <p className="field-help">{t('dash.lastSync', { when: formatWhen(student.lastSync) ?? t('dash.never') })}</p>}
  </div>;
}

/**
 * Panel de rendimiento de una clase. `students` ya viene normalizado:
 * { id, name, avatar, phone, email, xp, level, confidence, attempts, correct,
 *   solved, topicStats, lastSync?, log? } — `log` solo existe para alumnos de
 * este dispositivo (permite ver intentos y errores frecuentes).
 */
export default function ClassDashboard({ students, totalExercises = 0, exercises = [] }) {
  const { t } = useTranslation();
  const [selectedId, setSelectedId] = useState(null);
  const selected = students.find(item => item.id === selectedId);

  const summary = useMemo(() => {
    const active = students.filter(item => (item.attempts ?? 0) > 0);
    const attempts = students.reduce((sum, item) => sum + (item.attempts ?? 0), 0);
    const correct = students.reduce((sum, item) => sum + (item.correct ?? 0), 0);
    const average = active.length ? Math.round(active.reduce((sum, item) => sum + (percent(item.correct, item.attempts) ?? 0), 0) / active.length) : null;
    const completed = students.length && totalExercises > 0
      ? Math.round((100 * students.reduce((sum, item) => sum + Math.min(1, (item.solved ?? 0) / totalExercises), 0)) / students.length)
      : null;
    const topics = mergeTopicStats(students.map(item => item.topicStats));
    const ranked = DASHBOARD_TOPICS.map(topic => ({ topic, pct: percent(topics[topic]?.correct ?? 0, topics[topic]?.attempts ?? 0) })).filter(item => item.pct !== null);
    const sorted = [...ranked].sort((a, b) => b.pct - a.pct);
    const logs = students.filter(item => item.log).map(item => item.log);
    return {
      attempts, correct, average, completed, topics,
      best: sorted[0] ?? null,
      worst: sorted.length > 1 ? sorted.at(-1) : null,
      reinforce: ranked.filter(item => item.pct < 60).sort((a, b) => a.pct - b.pct),
      difficulties: logs.length ? commonDifficulties(logs) : [],
    };
  }, [students, totalExercises]);

  if (selected) return <section className="dash" aria-label={t('dash.title')}><StudentDetail student={selected} exercises={exercises} onBack={() => setSelectedId(null)} /></section>;

  return <section className="dash" aria-label={t('dash.title')}>
    <div className="dash-heading"><span className="panel-eyebrow">{t('dash.eyebrow')}</span><h3>{t('dash.title')}</h3></div>
    <div className="dash-cards">
      <div className="dash-card"><span>{t('dash.students')}</span><strong>{students.length}</strong></div>
      <div className="dash-card"><span>{t('dash.activities')}</span><strong>{summary.attempts}</strong></div>
      <div className="dash-card"><span>{t('dash.average')}</span><strong>{summary.average === null ? '—' : `${summary.average}%`}</strong></div>
      <div className="dash-card"><span>{t('dash.correct')}</span><strong>{summary.attempts ? `${percent(summary.correct, summary.attempts)}%` : '—'}</strong></div>
      <div className="dash-card"><span>{t('dash.completed')}</span><strong>{summary.completed === null ? '—' : `${summary.completed}%`}</strong></div>
    </div>

    {summary.attempts === 0 ? <p className="field-help">{t('dash.noData')}</p> : <>
      <div className="dash-highlights">
        {summary.best && <div className="dash-highlight is-good"><span>{t('dash.best')}</span><strong>{t(`dash.topic.${summary.best.topic}`)} · {summary.best.pct}%</strong></div>}
        {summary.worst && <div className="dash-highlight is-low"><span>{t('dash.worst')}</span><strong>{t(`dash.topic.${summary.worst.topic}`)} · {summary.worst.pct}%</strong></div>}
        <div className="dash-highlight"><span>{t('dash.reinforce')}</span><strong>{summary.reinforce.length ? summary.reinforce.map(item => t(`dash.topic.${item.topic}`)).join(', ') : t('dash.reinforceNone')}</strong></div>
      </div>
      <h4>{t('dash.byTopic')}</h4>
      <p className="field-help">{t('dash.byTopicLead')}</p>
      <TopicBars stats={summary.topics} />
      {summary.difficulties.length > 0 && <div className="dash-difficulties">
        <h4>{t('dash.difficulties')}</h4>
        <p className="field-help">{t('dash.difficultiesNote')}</p>
        <ul>{summary.difficulties.map(item => <li key={item.errorType}><span>{t(`error.${item.errorType}`)}</span><span className="chip">{t('common.times', { n: item.count })}</span></li>)}</ul>
      </div>}
    </>}

    {students.length > 0 && <>
      <h4>{t('dash.list')}</h4>
      <p className="field-help">{t('dash.selectHint')}</p>
      <ul className="dash-students">
        {students.map(student => {
          const pct = percent(student.correct, student.attempts);
          return <li key={student.id}><button type="button" className="dash-student" onClick={() => setSelectedId(student.id)}>
            <Avatar id={student.avatar} size={36} />
            <span className="dash-student-name"><strong>{student.name}</strong><small>{t('dash.xp', { n: student.xp ?? 0, l: student.level ?? 1 })}</small></span>
            <span className="dash-student-score"><Bar value={pct} tone={toneFor(pct)} /><small>{pct === null ? '—' : `${pct}%`}</small></span>
          </button></li>;
        })}
      </ul>
    </>}
  </section>;
}
