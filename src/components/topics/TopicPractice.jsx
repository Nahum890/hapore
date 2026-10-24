// Práctica ilimitada de un tema: ejercicios generados con datos al azar,
// corrección automática (con avisos de unidades y signo), pista y resolución
// paso a paso. Cada resultado suma al progreso del alumno (XP, intentos).
import { useMemo, useRef, useState } from 'react';
import { generateExercise, checkAnswer, fmt } from '../../curriculum/practice.js';
import { pickLang } from '../../curriculum/topics/index.js';
import { useTranslation } from '../../i18n/LanguageProvider.jsx';
import { Formula, MathText } from '../MathText.jsx';
import TopicIcon from './TopicIcon.jsx';

const newSeed = () => Math.floor(Math.random() * 1e9) + 1;

export default function TopicPractice({ topic, onResult }) {
  const { t, language } = useTranslation();
  const [index, setIndex] = useState(0);
  const [seed, setSeed] = useState(newSeed);
  const [input, setInput] = useState('');
  const [result, setResult] = useState(null);
  const [showHint, setShowHint] = useState(false);
  const [showSteps, setShowSteps] = useState(false);
  const [streak, setStreak] = useState(0);
  const recorded = useRef(false);
  const started = useRef(Date.now());
  const genId = topic.practice[index % topic.practice.length];
  const exercise = useMemo(() => generateExercise(genId, seed), [genId, seed]);

  const next = () => {
    setIndex(value => value + 1); setSeed(newSeed()); setInput(''); setResult(null);
    setShowHint(false); setShowSteps(false); recorded.current = false; started.current = Date.now();
  };
  const check = event => {
    event.preventDefault();
    const verdict = checkAnswer(exercise, input);
    setResult(verdict);
    if (!verdict.valid) return;
    setStreak(value => (verdict.correct ? value + 1 : 0));
    if (!recorded.current) {
      recorded.current = true;
      onResult?.({
        correct: verdict.correct, hintsUsed: showHint ? 1 : 0, exerciseId: `${topic.id}:${exercise.id}`,
        durationMs: Date.now() - started.current, scenario: topic.id, expectedConcept: topic.id,
        errorType: verdict.correct ? null : verdict.unitSlip ? 'unidades' : verdict.signSlip ? 'signo' : 'calculo',
      });
    }
    if (!verdict.correct) setShowHint(true);
  };

  if (!exercise) return null;
  return <section className="topic-practice card">
    <div className="topic-practice-head">
      <span className="panel-eyebrow">{t('topics.tabPractice')}</span>
      {streak > 1 && <span className="topic-chip is-done">{t('practice.streak', { n: streak })}</span>}
    </div>
    <MathText as="p" className="topic-practice-prompt" text={pickLang(exercise.prompt, language)} />
    <div className="topic-practice-data" aria-label={t('practice.data')}>
      {exercise.data.map(item => <span key={item.sym}><small><Formula text={item.sym} /></small><strong>{item.value}{item.unit && ` ${item.unit}`}</strong></span>)}
    </div>
    <form className="topic-practice-form" onSubmit={check}>
      <label className="topic-practice-label" htmlFor={`ans-${topic.id}`}><Formula text={exercise.ask} /> =</label>
      <input id={`ans-${topic.id}`} className="quiz-input" inputMode="decimal" autoComplete="off" value={input} onChange={event => { setInput(event.target.value); if (result && !result.correct) setResult(null); }} placeholder={t('practice.answer')} aria-label={t('practice.answer')} />
      {exercise.unit && <span className="topic-practice-unit">{exercise.unit}</span>}
      <button type="submit" className="btn btn-primary" disabled={!input.trim()}>{t('practice.check')}</button>
    </form>
    {result && <p className={`topic-feedback ${result.correct ? 'is-good' : result.valid ? 'is-bad' : 'is-warn'}`} role="status">
      {!result.valid ? t('practice.invalid') : result.correct ? t('practice.correct') : result.unitSlip ? t('practice.unitSlip') : result.signSlip ? t('practice.signSlip') : t('practice.wrong')}
    </p>}
    {showHint && !result?.correct && <p className="topic-hint"><TopicIcon name="bolt" size={16} />{pickLang(exercise.hint, language)}</p>}
    {showSteps && <ol className="topic-steps">{exercise.steps.map((step, i) => <li key={i}><Formula text={step} /></li>)}</ol>}
    <div className="topic-practice-actions">
      {!showHint && <button type="button" className="btn btn-secondary" onClick={() => setShowHint(true)}>{t('practice.hint')}</button>}
      {!showSteps && <button type="button" className="btn btn-secondary" onClick={() => setShowSteps(true)}>{t('practice.solution')}</button>}
      <button type="button" className={`btn ${result?.correct ? 'btn-primary' : 'btn-secondary'}`} onClick={next}>{t('practice.next')}</button>
    </div>
    {showSteps && !result?.correct && <p className="topic-expected">{t('practice.expected', { value: `${fmt(exercise.answer, exercise.decimals)} ${exercise.unit}` })}</p>}
  </section>;
}
