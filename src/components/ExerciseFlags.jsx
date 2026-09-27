import { useEffect, useMemo, useState } from 'react';
import { MathText } from './MathText.jsx';
import { useTranslation } from '../i18n/LanguageProvider.jsx';
import { localizeCatalogItem } from '../data/catalogs.js';
import { topicForExercise } from '../pedagogy/progression.js';
import { FLAG_COLORS, allFlags, createFlag, deleteFlag, getFlagState, setExerciseFlag } from '../pedagogy/flags.js';
import './ExerciseFlags.css';

// Banderitas: el docente marca cada ejercicio con un tema o una bandera
// propia; el panel de rendimiento agrupa los aciertos de los alumnos por
// bandera para ver qué entienden más y qué menos.
export default function ExerciseFlags({ exercises = [] }) {
  const { t, language } = useTranslation();
  const [state, setState] = useState(getFlagState);
  const [name, setName] = useState('');
  const [color, setColor] = useState(FLAG_COLORS[0]);
  const [filter, setFilter] = useState('all');
  useEffect(() => {
    const refresh = () => setState(getFlagState());
    window.addEventListener('exercise-flags-changed', refresh);
    return () => window.removeEventListener('exercise-flags-changed', refresh);
  }, []);
  const flags = allFlags(state);
  const labelOf = flag => (flag?.builtin ? t(`dash.topic.${flag.id}`) : flag?.name ?? '—');
  const flagById = useMemo(() => new Map(flags.map(flag => [flag.id, flag])), [flags]);
  const rows = useMemo(() => exercises.map(item => {
    const own = state.byExercise[item.id];
    const auto = topicForExercise({ ...item, flag: undefined });
    return { item: localizeCatalogItem(item, language), own, auto, current: own ?? item.flag ?? auto };
  }).filter(row => filter === 'all' || row.current === filter), [exercises, state, language, filter]);

  const add = event => {
    event.preventDefault();
    if (createFlag(name, color)) setName('');
  };

  return <div className="teacher-block exercise-flags">
    <h3>⚑ {t('flags.title')}</h3>
    <p className="field-help">{t('flags.lead')}</p>

    <div className="flag-chips" aria-label={t('flags.available')}>
      {flags.map(flag => <span key={flag.id} className="flag-chip" style={{ '--flag': flag.color }}>
        <span aria-hidden="true">⚑</span>{labelOf(flag)}
        {!flag.builtin && <button type="button" aria-label={t('flags.delete', { name: flag.name })} onClick={() => { if (window.confirm(t('flags.deleteConfirm', { name: flag.name }))) deleteFlag(flag.id); }}>×</button>}
      </span>)}
    </div>

    <form className="flag-create" onSubmit={add}>
      <label>{t('flags.newName')}<input className="quiz-input" value={name} maxLength={32} placeholder={t('flags.placeholder')} onChange={event => setName(event.target.value)} /></label>
      <div className="flag-colors" role="radiogroup" aria-label={t('pdfo.color')}>
        {FLAG_COLORS.map(value => <button key={value} type="button" role="radio" aria-checked={color === value} aria-label={value} className={color === value ? 'is-active' : ''} style={{ background: value }} onClick={() => setColor(value)} />)}
      </div>
      <button type="submit" className="btn btn-primary" disabled={!name.trim()}>{t('flags.create')}</button>
    </form>

    <div className="flag-filter">
      <label>{t('flags.filter')}<select className="quiz-input" value={filter} onChange={event => setFilter(event.target.value)}>
        <option value="all">{t('pdfo.all')}</option>
        {flags.map(flag => <option key={flag.id} value={flag.id}>{labelOf(flag)}</option>)}
      </select></label>
    </div>
    <ul className="flag-list">
      {rows.map(({ item, own, auto, current }) => <li key={item.id} style={{ '--flag': flagById.get(current)?.color ?? '#94a3b8' }}>
        <span className="flag-mark" aria-hidden="true">⚑</span>
        <div className="flag-question">
          <MathText text={item.question} />
          <small>{item.custom ? t('slides.ownExercise') : t('flags.catalog')} · {item.difficulty}</small>
        </div>
        <label className="flag-select">
          <span className="sr-only">{t('flags.assign')}</span>
          <select className="quiz-input" value={own ?? ''} onChange={event => setExerciseFlag(item.id, event.target.value)} aria-label={t('flags.assign')}>
            <option value="">{t('flags.auto', { name: auto ? labelOf(flagById.get(auto)) : '—' })}</option>
            {flags.map(flag => <option key={flag.id} value={flag.id}>⚑ {labelOf(flag)}</option>)}
          </select>
        </label>
      </li>)}
    </ul>
  </div>;
}
