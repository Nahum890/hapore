import { useEffect, useRef, useState } from 'react';
import { hasHintsLeft } from '../pedagogy/hintEngine.js';
import { validateExercise } from '../physics/physicsValidator.js';
import { diagnoseAttempt } from '../pedagogy/diagnoseAttempt.js';
export function isNumericAnswer(value) {
  const text = String(value ?? '').trim();
  return /^[+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)(?:e[+-]?\d+)?$/i.test(text) && Number.isFinite(Number(text.replace(',', '.')));
}
const VALUE_LABELS = {
  v0: ['Velocidad inicial', 'm/s'], angle: ['Ángulo', '°'], angleA: ['Primer ángulo', '°'], angleB: ['Segundo ángulo', '°'], gravity: ['Gravedad', 'm/s²'], vx: ['Velocidad horizontal', 'm/s'], t: ['Tiempo', 's'], targetDistance: ['Distancia objetivo', 'm'],
  masa: ['Masa', 'kg'], calorEspecifico: ['Calor específico', 'J/(kg·°C)'], temperaturaInicial: ['Temperatura inicial', '°C'], temperaturaFinal: ['Temperatura final', '°C'], calor: ['Calor recibido', 'J'],
  masaCaliente: ['Agua caliente', 'kg'], temperaturaCaliente: ['Temperatura caliente', '°C'], masaFria: ['Agua fría', 'kg'], temperaturaFria: ['Temperatura fría', '°C'],
  anguloIncidencia: ['Ángulo de incidencia', '°'], anguloSuperficie: ['Ángulo desde la superficie', '°'], distanciaObjeto: ['Distancia del objeto', 'cm'],
  velocidadVacio: ['Luz en vacío', 'm/s'], velocidadMedio: ['Luz en vidrio', 'm/s'],
  distancia: ['Distancia', 'm'], tiempo: ['Tiempo', 's'], rapidez: ['Rapidez', 'm/s'], velocidadDron: ['Velocidad del dron', 'm/s'], velocidadViento: ['Velocidad del viento', 'm/s'], componenteX: ['Componente X', 'm'], componenteY: ['Componente Y', 'm'], k: ['Constante elástica', 'N/m'], x: ['Deformación', 'm'], fuerza: ['Fuerza', 'N'],
};
const formatValue = value => typeof value === 'number' ? new Intl.NumberFormat('es-PY', { maximumFractionDigits: 3 }).format(value) : String(value);
export default function ExerciseCard({ exercise, onResult, onAskHint, onSimulationCheck, onSimulationClear, hintsUsed = 0, onIncrementHint }) {
  const [answer, setAnswer] = useState(''), [feedback, setFeedback] = useState(null), [waiting, setWaiting] = useState(false), [hintError, setHintError] = useState('');
  const currentId = useRef(exercise?.id), hintLock = useRef(false), startedAt = useRef(Date.now());
  currentId.current = exercise?.id;
  useEffect(() => { setAnswer(''); setFeedback(null); setHintError(''); startedAt.current = Date.now(); }, [exercise?.id]);
  const valid = isNumericAnswer(answer);
  const invalid = Boolean(answer.trim()) && !valid;
  const check = event => {
    event.preventDefault();
    if (!valid) return;
    const result = validateExercise(exercise, answer);
    setFeedback(result);
    onResult?.({ correct: result.correct, hintsUsed, exerciseId: exercise.id, durationMs: Date.now() - startedAt.current });
    onSimulationCheck?.({ exerciseId: exercise.id, answer: result.student, result });
    if (!result.correct) onAskHint?.({ type: 'mistake', topic: exercise.topic, exercise, exerciseId: exercise.id, expectedConcept: exercise.expectedConcept, studentAnswer: result.student ?? answer, expectedAnswer: result.expected, hintLevel: hintsUsed + 1 });
  };
  const hint = async () => {
    if (hintLock.current || !hasHintsLeft(exercise, hintsUsed)) return;
    hintLock.current = true; setWaiting(true); setHintError('');
    const id = exercise.id;
    try {
      const response = await onAskHint?.({ type: 'hint', topic: exercise.topic, exercise, exerciseId: id, expectedConcept: exercise.expectedConcept, hintLevel: hintsUsed + 1 });
      if (currentId.current === id) {
        if (response?.available === false) setHintError('No se pudo obtener la pista. Probá otra vez.');
        else onIncrementHint?.();
      }
    } catch { if (currentId.current === id) setHintError('No se pudo obtener la pista. Probá otra vez.'); }
    finally { hintLock.current = false; setWaiting(false); }
  };
  return (
    <section className="card exercise-card" aria-label={'Ejercicio ' + exercise.id}>
      <div className="exercise-meta"><span className="chip chip-topic">{exercise.topic}</span><span className="chip chip-difficulty">{exercise.difficulty}</span></div>
      <p className="exercise-question">{exercise.question}</p>
      {exercise.questionJopara && <p className="exercise-question-jopara"><span>Jopara</span> {exercise.questionJopara}</p>}
      <div className="values-chips">{Object.entries(exercise.values ?? {}).map(([key, value]) => <span key={key} className="chip">{VALUE_LABELS[key]?.[0] ?? key}: {formatValue(value)} {VALUE_LABELS[key]?.[1] ?? ''}</span>)}</div>
      <form onSubmit={check} noValidate>
        <div className="answer-row"><label className="answer-label" htmlFor={'answer-' + exercise.id}>Respuesta</label><input id={'answer-' + exercise.id} className="answer-input" type="text" inputMode="decimal" autoComplete="off" placeholder="Escribí tu resultado" value={answer} aria-invalid={invalid} aria-describedby={'answer-help-' + exercise.id} onChange={event => { setAnswer(event.target.value); setFeedback(null); onSimulationClear?.(); }} /><span className="answer-unit">{exercise.unit}</span></div>
        <p id={'answer-help-' + exercise.id} className={invalid ? 'field-error' : 'field-help'} aria-live="polite">{invalid ? 'Ingresá solo un número; podés usar coma o punto decimal.' : 'Escribí el valor sin la unidad y comprobá tu respuesta.'}</p>
        <div className="exercise-actions"><button type="button" className="btn btn-secondary" onClick={hint} disabled={waiting || !hasHintsLeft(exercise, hintsUsed)}>{waiting ? 'Buscando pista…' : !hasHintsLeft(exercise, hintsUsed) ? 'Sin más pistas' : 'Pedir pista'}</button><button type="submit" className="btn btn-primary" disabled={!valid}>Comprobar con el simulador</button></div>
      </form>
      {hintError && <p role="status" className="field-error">{hintError}</p>}
      {feedback && <div className={'feedback ' + (feedback.correct ? 'correct' : 'incorrect')} role="status">{feedback.correct ? '¡Bien! Mirá la simulación de este ejercicio abajo.' : <><strong>Buen intento. Probá otra vez sin perder puntos.</strong><span>{diagnoseAttempt(exercise, feedback.student)}</span></>}</div>}
    </section>
  );
}
