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
const VALUE_LABELS = {
  v0: ['Velocidad inicial', 'm/s'], angle: ['Ángulo', '°'], angleA: ['Primer ángulo', '°'], angleB: ['Segundo ángulo', '°'], gravity: ['Gravedad', 'm/s²'], vx: ['Velocidad horizontal', 'm/s'], t: ['Tiempo', 's'], targetDistance: ['Distancia objetivo', 'm'],
};
const formatValue = value => typeof value === 'number' ? new Intl.NumberFormat('es-PY', { maximumFractionDigits: 3 }).format(value) : String(value);
export default function ExerciseCard({ exercise, onResult, onAskHint, onSimulationCheck, onSimulationClear, hintsUsed = 0, onIncrementHint }) {
  const { language } = useTranslation();
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
    setFeedback({ ...result, diagnosisMessage: diagnosis?.message });
    onResult?.({ correct: result.correct, hintsUsed, exerciseId: exercise.id, durationMs: Date.now() - startedAt.current, errorType: diagnosis?.key ?? null, expectedConcept: exercise.expectedConcept });
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
        if (response?.available === false || typeof response?.message !== 'string' || !response.message.trim()) setHintError('No se pudo obtener la pista. Probá otra vez.');
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
      if (currentId.current === id && hintRequest.current === request) setHintError('No se pudo obtener la pista. Probá otra vez.');
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
        if (response?.available === false || typeof response?.message !== 'string' || !response.message.trim()) setHintError('No se pudo enviar la respuesta. Probá otra vez.');
        else {
          setHintExchange(current => [...current, { role: 'alumno', text }, { role: 'tutor', text: response.message }]);
          setHintMessage(current => current ? { ...current, text: response.message, subHint: response.subHint ?? current.subHint } : current);
          setHintReply('');
        }
      }
    } catch {
      if (currentId.current === id && hintRequest.current === request) setHintError('No se pudo enviar la respuesta. Probá otra vez.');
    } finally {
      if (currentId.current === id && hintRequest.current === request) { hintLock.current = false; setSendingReply(false); }
    }
  };
  return (
    <section className="card exercise-card" aria-label={'Ejercicio ' + exercise.id}>
      <div className="exercise-meta">
        <span className="chip chip-topic">{exercise.topic}</span>
        <span className="chip chip-difficulty">{exercise.difficulty}</span>
        <span className="chip chip-mec" title="Contenido contrastado con el Currículum Oficial del MEC (Res. N.º 12506) y OpenStax Physics">MEC Res. 12506</span>
      </div>
      <p className="exercise-question"><MathText text={exercise.question} />{language !== 'es' && exercise.questionJopara && <small className="bilingual-es" lang="es"> Jopara</small>}</p>
      <div className="values-chips">{Object.entries(exercise.values ?? {}).map(([key, value]) => <span key={key} className="chip chip-data"><small>{VALUE_LABELS[key]?.[0] ?? key}</small><strong>{formatValue(value)} {VALUE_LABELS[key]?.[1] ?? ''}</strong></span>)}</div>
      <form onSubmit={check} noValidate>
        <div className="answer-row"><label className="answer-label" htmlFor={'answer-' + exercise.id}>Respuesta</label><input id={'answer-' + exercise.id} className="answer-input" type="text" inputMode="decimal" autoComplete="off" placeholder="Escribí tu resultado" value={answer} aria-invalid={invalid} aria-describedby={'answer-help-' + exercise.id} onChange={event => { setAnswer(event.target.value); setFeedback(null); onSimulationClear?.(); }} /><span className="answer-unit">{exercise.unit}</span></div>
        <p id={'answer-help-' + exercise.id} className={invalid ? 'field-error' : 'field-help'} aria-live="polite">{invalid ? 'Ingresá solo un número; podés usar coma o punto decimal.' : 'Escribí el valor sin la unidad y comprobá tu respuesta.'}</p>
        <div className="exercise-actions"><button type="button" className="btn btn-secondary" onClick={hint} disabled={waiting || !hasHintsLeft(exercise, hintsUsed)}>{waiting ? 'Buscando pista…' : !hasHintsLeft(exercise, hintsUsed) ? 'Sin más pistas' : 'Pedir pista'}</button><button type="submit" className="btn btn-primary" disabled={!valid}>Comprobar con el simulador</button></div>
      </form>
      {hintError && <p role="status" className="field-error">{hintError}</p>}
      {hintMessage && (
        <aside className="exercise-hint" role="status" aria-live="polite">
          <span className="exercise-hint-label">
            {language === 'es'
              ? `Pista ${hintMessage.level} de ${totalHints(exercise)}`
              : `Ñepytyvõ ${hintMessage.level} / ${totalHints(exercise)}`}
          </span>
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
              <label htmlFor={'hint-reply-' + exercise.id}>
                {language === 'es' ? 'Respondé la pregunta del tutor' : 'Emondo ne respuesta tutor-pe'}
              </label>
              <div className="hint-reply-row">
                <input
                  id={'hint-reply-' + exercise.id} className="quiz-input" type="text" autoComplete="off"
                  placeholder={language === 'es' ? 'Escribí tu respuesta…' : 'Ehai ne respuesta…'}
                  value={hintReply} disabled={sendingReply}
                  onChange={event => setHintReply(event.target.value)}
                  onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); sendReply(); } }}
                />
                <button type="button" className="btn btn-secondary" onClick={sendReply} disabled={sendingReply || !hintReply.trim()}>
                  {sendingReply ? (language === 'es' ? 'Enviando…' : 'Omondo…') : (language === 'es' ? 'Responder' : 'Emondo')}
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
              <strong>¡Iporã! Tu respuesta es correcta.</strong>
              <span>Mirá la simulación de este ejercicio abajo.</span>
            </>
          ) : (
            <>
              <strong>Eñeha’ã jey · Probá otra vez sin perder puntos.</strong>
              <MathText text={feedback.diagnosisMessage} />
            </>
          )}
        </div>
      )}
    </section>
  );
}
