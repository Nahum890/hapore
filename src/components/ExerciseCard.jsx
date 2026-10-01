import { useEffect, useRef, useState } from 'react';
import { MathText } from './MathText.jsx';
import { hasHintsLeft, totalHints } from '../pedagogy/hintEngine.js';
import { validateExercise } from '../physics/physicsValidator.js';
import { diagnoseAttempt } from '../pedagogy/diagnoseAttempt.js';
import { useTranslation } from '../i18n/LanguageProvider.jsx';
export function isNumericAnswer(value) {
  const text = String(value ?? '').trim();
  return /^[+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)(?:e[+-]?\d+)?$/i.test(text) && Number.isFinite(Number(text.replace(',', '.')));
}
// Movimiento Parabólico es el único tema: estas son todas las variables que
// aparecen en exercises.json (values de dron, básquetbol y paredón).
// Nombres visibles en messages.js (value.<clave>); acá solo las unidades.
const VALUE_UNITS = { v0: 'm/s', angle: '°', angleA: '°', angleB: '°', gravity: 'm/s²', vx: 'm/s', t: 's', targetDistance: 'm' };
const formatValue = value => typeof value === 'number' ? new Intl.NumberFormat('es-PY', { maximumFractionDigits: 3 }).format(value) : String(value);
export default function ExerciseCard({ exercise, onResult, onAskHint, onSimulationCheck, onSimulationClear, hintsUsed = 0, onIncrementHint }) {
  const { language, t } = useTranslation();
  const [answer, setAnswer] = useState(''), [feedback, setFeedback] = useState(null), [waiting, setWaiting] = useState(false), [hintError, setHintError] = useState(''), [hintMessage, setHintMessage] = useState(null);
  // Método socrático: en los niveles 1 y 2 el tutor pregunta antes de
  // explicar (ver ai/prompt.js y ai/RuleTutorProvider.js). `hintExchange`
  // guarda ese ida y vuelta corto para mostrarlo como una mini conversación.
  const [hintExchange, setHintExchange] = useState([]);
  const [hintReply, setHintReply] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const currentId = useRef(exercise?.id), hintLock = useRef(false), hintRequest = useRef(0), startedAt = useRef(Date.now());
  currentId.current = exercise?.id;
  useEffect(() => {
    hintRequest.current += 1;
    hintLock.current = false;
    setAnswer(''); setFeedback(null); setHintError(''); setHintMessage(null); setWaiting(false);
    setHintExchange([]); setHintReply(''); setSendingReply(false);
    startedAt.current = Date.now();
  }, [exercise?.id]);

  useEffect(() => {
    if (!hintMessage || !exercise) return;
    let active = true;
    onAskHint?.({
      type: 'hint',
      topic: exercise.topic,
      exercise,
      exerciseId: exercise.id,
      expectedConcept: exercise.expectedConcept,
      hintLevel: hintMessage.level,
      language,
    }).then(response => {
      if (active && response?.message) {
        setHintMessage({
          text: response.message,
          level: hintMessage.level,
          esHint: response.esHint,
          joparaHint: response.joparaHint,
          subHint: response.subHint ?? (language === 'es' ? response.esHint : (response.joparaHint ?? response.followUp)),
        });
        setHintExchange([{ role: 'tutor', text: response.message }]);
      }
    }).catch(() => {});
    return () => { active = false; };
  }, [language]);
  const valid = isNumericAnswer(answer);
  const invalid = Boolean(answer.trim()) && !valid;
  const check = event => {
    event.preventDefault();
    if (!valid) return;
    const result = validateExercise(exercise, answer);
    const diagnosis = result.correct ? null : diagnoseAttempt(exercise, answer, language);
    // El diagnóstico se recalcula al mostrarlo para que siga el idioma activo.
    setFeedback({ ...result, answerText: answer });
    onResult?.({ correct: result.correct, hintsUsed, exerciseId: exercise.id, durationMs: Date.now() - startedAt.current, errorType: diagnosis?.key ?? null, expectedConcept: exercise.expectedConcept ?? null, scenario: exercise.scenario ?? null });
    onSimulationCheck?.({ exerciseId: exercise.id, answer: result.student, result });
    if (!result.correct) onAskHint?.({ type: 'mistake', topic: exercise.topic, exercise, exerciseId: exercise.id, expectedConcept: exercise.expectedConcept, errorType: diagnosis?.key, studentAnswer: result.student ?? answer, expectedAnswer: result.expected, hintLevel: hintsUsed + 1 });
  };
  const hint = async () => {
    if (hintLock.current || !hasHintsLeft(exercise, hintsUsed)) return;
    hintLock.current = true; setWaiting(true); setHintError(''); setHintMessage(null); setHintExchange([]); setHintReply('');
    const id = exercise.id;
    const request = ++hintRequest.current;
    try {
      const response = await onAskHint?.({ type: 'hint', topic: exercise.topic, exercise, exerciseId: id, expectedConcept: exercise.expectedConcept, hintLevel: hintsUsed + 1, language });
      if (currentId.current === id && hintRequest.current === request) {
        if (response?.available === false || typeof response?.message !== 'string' || !response.message.trim()) setHintError(t('exercise.hintError'));
        else {
          setHintMessage({
            text: response.message,
            level: hintsUsed + 1,
            esHint: response.esHint,
            joparaHint: response.joparaHint,
            subHint: response.subHint ?? (language === 'es' ? response.esHint : (response.joparaHint ?? response.followUp)),
          });
          setHintExchange([{ role: 'tutor', text: response.message }]);
          onIncrementHint?.();
        }
      }
    } catch {
      if (currentId.current === id && hintRequest.current === request) setHintError(t('exercise.hintError'));
    } finally {
      if (currentId.current === id && hintRequest.current === request) { hintLock.current = false; setWaiting(false); }
    }
  };
  // Responder la pregunta del tutor (niveles 1 y 2): se manda como una
  // consulta más, con la mini conversación como historial, para que el
  // tutor confirme o corrija antes de seguir — en vez de repetir la pregunta.
  const sendReply = async () => {
    const text = hintReply.trim();
    if (!text || hintLock.current || !hintMessage) return;
    hintLock.current = true; setSendingReply(true); setHintError('');
    const id = exercise.id;
    const request = ++hintRequest.current;
    try {
      const response = await onAskHint?.({
        type: 'hint', topic: exercise.topic, exercise, exerciseId: id, expectedConcept: exercise.expectedConcept,
        hintLevel: hintMessage.level, message: text, history: hintExchange, language,
      });
      if (currentId.current === id && hintRequest.current === request) {
        if (response?.available === false || typeof response?.message !== 'string' || !response.message.trim()) setHintError(t('exercise.replyError'));
        else {
          setHintExchange(current => [...current, { role: 'alumno', text }, { role: 'tutor', text: response.message }]);
          setHintMessage(current => current ? { ...current, text: response.message, subHint: response.subHint ?? current.subHint } : current);
          setHintReply('');
        }
      }
    } catch {
      if (currentId.current === id && hintRequest.current === request) setHintError(t('exercise.replyError'));
    } finally {
      if (currentId.current === id && hintRequest.current === request) { hintLock.current = false; setSendingReply(false); }
    }
  };
  return (
    <section className="card exercise-card" aria-label={t('exercise.label', { id: exercise.id })}>
      <div className="exercise-meta">
        <span className="chip chip-topic">{exercise.topic}</span>
        <span className="chip chip-difficulty">{exercise.difficulty}</span>
        <span className="chip chip-mec" title="MEC Res. N.º 12506 · OpenStax Physics">MEC Res. 12506</span>
      </div>
      <p className="exercise-question"><MathText text={exercise.question} /></p>
      <div className="values-chips">{Object.entries(exercise.values ?? {}).map(([key, value]) => <span key={key} className="chip chip-data"><small>{t(`value.${key}`) === `value.${key}` ? key : t(`value.${key}`)}</small><strong>{formatValue(value)} {VALUE_UNITS[key] ?? ''}</strong></span>)}</div>
      <form onSubmit={check} noValidate>
        <div className="answer-row"><label className="answer-label" htmlFor={'answer-' + exercise.id}>{t('exercise.answer')}</label><input id={'answer-' + exercise.id} className="answer-input" type="text" inputMode="decimal" autoComplete="off" value={answer} aria-invalid={invalid} aria-describedby={'answer-help-' + exercise.id} onChange={event => { setAnswer(event.target.value); setFeedback(null); onSimulationClear?.(); }} /><span className="answer-unit">{exercise.unit}</span></div>
        <p id={'answer-help-' + exercise.id} className={invalid ? 'field-error' : 'field-help'} aria-live="polite">{invalid ? t('exercise.invalid') : t('exercise.help')}</p>
        <div className="exercise-actions"><button type="button" className="btn btn-secondary" onClick={hint} disabled={waiting || !hasHintsLeft(exercise, hintsUsed)}>{waiting ? t('exercise.hintLoading') : !hasHintsLeft(exercise, hintsUsed) ? t('exercise.noHints') : t('exercise.hint')}</button><button type="submit" className="btn btn-primary" disabled={!valid}>{t('exercise.check')}</button></div>
      </form>
      {hintError && <p role="status" className="field-error">{hintError}</p>}
      {hintMessage && (
        <aside className="exercise-hint" role="status" aria-live="polite">
          <span className="exercise-hint-label">{t('exercise.hintLabel', { n: hintMessage.level, m: totalHints(exercise) })}</span>
          {hintExchange.length > 1 ? (
            <ol className="hint-exchange">
              {hintExchange.map((turn, index) => (
                <li key={index} className={turn.role === 'alumno' ? 'hint-exchange-alumno' : 'hint-exchange-tutor'}>
                  <MathText as="p" text={turn.text} />
                </li>
              ))}
            </ol>
          ) : <MathText as="p" text={hintMessage.text} />}
          {hintMessage.subHint && <MathText as="small" text={hintMessage.subHint} />}
          {hintMessage.level <= 2 && (
            <div className="hint-reply">
              <label htmlFor={'hint-reply-' + exercise.id}>{t('exercise.replyLabel')}</label>
              <div className="hint-reply-row">
                <input
                  id={'hint-reply-' + exercise.id} className="quiz-input" type="text" autoComplete="off"
                  placeholder={t('exercise.replyPlaceholder')}
                  value={hintReply} disabled={sendingReply}
                  onChange={event => setHintReply(event.target.value)}
                  onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); sendReply(); } }}
                />
                <button type="button" className="btn btn-secondary" onClick={sendReply} disabled={sendingReply || !hintReply.trim()}>
                  {sendingReply ? t('common.sending') : t('exercise.reply')}
                </button>
              </div>
            </div>
          )}
        </aside>
      )}
      {feedback && (
        <div className={'feedback ' + (feedback.correct ? 'correct' : 'incorrect')} role="status">
          {feedback.correct ? (
            <>
              <strong>{t('exercise.correct')}</strong>
              <span>{t('exercise.correctSub')}</span>
            </>
          ) : (
            <>
              <strong>{t('exercise.incorrect')}</strong>
              <MathText text={diagnoseAttempt(exercise, feedback.answerText, language).message} />
            </>
          )}
        </div>
      )}
    </section>
  );
}
