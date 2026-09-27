import { useMemo, useState } from 'react';
import { CONCEPT_OPTIONS, SCENARIOS, buildDefaultHints, computeAnswer, createCustomExercise, deleteCustomExercise } from '../utils/customExercises.js';
import { useTranslation } from '../i18n/LanguageProvider.jsx';

const DIFFICULTIES = [
  { value: 'básico', key: 'custom.basic' },
  { value: 'intermedio', key: 'custom.intermediate' },
  { value: 'avanzado', key: 'custom.advanced' },
];

const emptyForm = {
  scenario: 'dron',
  difficulty: 'básico',
  question: '',
  conceptValue: 'componente-horizontal',
  v0: '20',
  angle: '30',
  gravity: '9.8',
  targetDistance: '30',
};

export default function CustomExerciseForm({ exercises, onChange }) {
  const { t } = useTranslation();
  const scenarioLabel = value => t(`scenario.${value}`);
  const [form, setForm] = useState(emptyForm);
  const [hints, setHints] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const [created, setCreated] = useState(false);

  const option = CONCEPT_OPTIONS.find(item => item.value === form.conceptValue);

  const previewAnswer = useMemo(() => {
    const values = option?.needsAngle
      ? { v0: form.v0, angle: form.angle, gravity: form.gravity }
      : { v0: form.v0, gravity: form.gravity, targetDistance: form.targetDistance };
    return computeAnswer(form.conceptValue, values);
  }, [form, option]);

  const defaultHints = useMemo(
    () => buildDefaultHints(form.conceptValue, previewAnswer),
    [form.conceptValue, previewAnswer],
  );

  const update = (field) => (event) => {
    setCreated(false);
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const updateHint = (index) => (event) => {
    setHints((prev) => prev.map((text, position) => (position === index ? event.target.value : text)));
  };

  const submit = (event) => {
    event.preventDefault();
    setError('');
    setCreated(false);
    if (!form.question.trim()) { setError(t('custom.errQuestion')); return; }
    if (!Number.isFinite(previewAnswer)) { setError(t('custom.errCalc')); return; }
    const exercise = createCustomExercise({ ...form, conceptValue: form.conceptValue, hints });
    if (!exercise) { setError(t('custom.errCreate')); return; }
    setCreated(true);
    setForm(emptyForm);
    setHints(['', '', '', '']);
    onChange?.();
  };

  const remove = (id) => {
    deleteCustomExercise(id);
    onChange?.();
  };

  return (
    <div className="custom-exercise-stack">
      <form className="teacher-block custom-exercise-form" onSubmit={submit}>
        <div className="custom-exercise-step"><span>1</span><label className="teacher-field">{t('custom.question')}
          <textarea className="quiz-input" rows={3} value={form.question} onChange={update('question')} required />
        </label></div>
        <div className="custom-exercise-step"><span>2</span><label className="teacher-field">{t('custom.asked')}
          <select value={form.conceptValue} onChange={update('conceptValue')}>
            {CONCEPT_OPTIONS.map(item => <option key={item.value} value={item.value}>{t(`custom.concept.${item.value}`)}</option>)}
          </select>
        </label></div>
        <div className="custom-exercise-step"><span>3</span><div className="custom-exercise-data"><h4>{t('custom.dataTitle')}</h4><p className="field-help">{t('custom.dataHelp')}</p><div className="custom-exercise-values">
          <label className="teacher-field">{t('free.speed')} · m/s
            <input className="quiz-input" type="number" step="0.1" min="1" value={form.v0} onChange={update('v0')} required />
          </label>
          {option?.needsAngle ? (
            <label className="teacher-field">{t('lesson.angle')} · °
              <input className="quiz-input" type="number" step="1" min="1" max="89" value={form.angle} onChange={update('angle')} required />
            </label>
          ) : (
            <label className="teacher-field">{t('value.targetDistance')} · m
              <input className="quiz-input" type="number" step="0.1" min="1" value={form.targetDistance} onChange={update('targetDistance')} required />
            </label>
          )}
          <label className="teacher-field">{t('free.gravity')} · m/s²
            <input className="quiz-input" type="number" step="0.1" min="1" value={form.gravity} onChange={update('gravity')} required />
          </label>
        </div></div></div>
        <p className="custom-exercise-preview" aria-live="polite">{t('custom.previewAnswer')} <strong>{Number.isFinite(previewAnswer) ? previewAnswer : '—'} {option?.unit}</strong><small>{t('custom.onlyTeacher')}</small></p>
        <details className="custom-exercise-context"><summary>{t('custom.moreOptions')}</summary>
          <label className="teacher-field">{t('custom.scenario')}
            <select value={form.scenario} onChange={update('scenario')}>
              {SCENARIOS.map(item => <option key={item.value} value={item.value}>{scenarioLabel(item.value)}</option>)}
            </select>
          </label>
          <label className="teacher-field">{t('custom.difficulty')}
            <select value={form.difficulty} onChange={update('difficulty')}>
              {DIFFICULTIES.map(item => <option key={item.value} value={item.value}>{t(item.key)}</option>)}
            </select>
          </label>
        </details>
        <details className="custom-exercise-hints">
          <summary>{t('custom.hints')}</summary>
          {hints.map((text, index) => (
            <label key={index} className="teacher-field">{t('custom.hintN', { n: index + 1 })}
              <textarea className="quiz-input" rows={1} value={text} onChange={updateHint(index)} />
            </label>
          ))}
        </details>
        {error && <p className="field-error" role="alert">{error}</p>}
        {created && <p className="field-help" role="status">{t('custom.saved')}</p>}
        <button type="submit" className="btn btn-primary">{t('custom.save')}</button>
      </form>
      {exercises.length > 0 && (
        <div className="teacher-block">
          <h3>{t('custom.yours', { n: exercises.length })}</h3>
          <ul className="aula-list">
            {exercises.map(item => (
              <li key={item.id} className="aula-item custom-exercise-item">
                <div><span className="chip chip-topic">{scenarioLabel(item.scenario)}</span> <span className="chip chip-difficulty">{item.difficulty}</span></div>
                <p>{item.question}</p>
                <small>{t('custom.previewAnswer')} {item.correctAnswer} {item.unit}</small>
                <button type="button" className="btn btn-secondary" onClick={() => remove(item.id)}>{t('lesson.delete')}</button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
