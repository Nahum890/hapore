import { useEffect, useState } from 'react';
import { hasHintsLeft } from '../pedagogy/hintEngine.js';
import { validateExercise } from '../physics/physicsValidator.js';

export default function ExerciseCard({ exercise, onResult, onAskHint, hintsUsed = 0, onIncrementHint }) {
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    setAnswer('');
    setFeedback(null);
  }, [exercise?.id]);

  const handleCheck = () => {
    const result = validateExercise(exercise, answer);
    setFeedback(result);
    onResult?.({ correct: result.correct, hintsUsed, exerciseId: exercise.id });
    if (!result.correct) {
      onAskHint?.({
        type: 'mistake',
        topic: exercise.topic,
        exerciseId: exercise.id,
        expectedConcept: exercise.expectedConcept,
        studentAnswer: result.student ?? answer,
        expectedAnswer: result.expected ?? null,
        hintLevel: hintsUsed + 1,
      });
    }
  };

  const handleHint = async () => {
    if (!hasHintsLeft(exercise, hintsUsed)) return;
    const level = hintsUsed + 1;
    await onAskHint?.({
      type: 'hint',
      topic: exercise.topic,
      exerciseId: exercise.id,
      expectedConcept: exercise.expectedConcept,
      hintLevel: level,
    });
    onIncrementHint?.();
  };

  const noHintsLeft = !hasHintsLeft(exercise, hintsUsed);

  return (
    <section className="card exercise-card" aria-label={`Ejercicio ${exercise.id}`}>
      <div className="exercise-meta">
        <span className="chip chip-topic">{exercise.topic}</span>
        <span className="chip chip-difficulty">{exercise.difficulty}</span>
      </div>
      <p className="exercise-question">{exercise.question}</p>
      <div className="values-chips">
        {Object.entries(exercise.values ?? {}).map(([key, value]) => (
          <span key={key} className="chip">
            {key} = {String(value).replace('.', ',')}
          </span>
        ))}
      </div>
      <div className="answer-row">
        <label className="answer-label" htmlFor={`answer-${exercise.id}`}>
          Respuesta
        </label>
        <input
          id={`answer-${exercise.id}`}
          className="answer-input"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder="Ej: 17,32"
          value={answer}
          onChange={(event) => setAnswer(event.target.value)}
        />
        <span className="answer-unit">{exercise.unit}</span>
      </div>
      <div className="exercise-actions">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={handleHint}
          disabled={noHintsLeft}
        >
          {noHintsLeft ? 'Sin más pistas' : 'Pedir pista'}
        </button>
        <button type="button" className="btn btn-primary" onClick={handleCheck}>
          Comprobar
        </button>
      </div>
      {feedback && (
        <div className={`feedback ${feedback.correct ? 'correct' : 'incorrect'}`} role="status">
          {feedback.correct
            ? '¡Ikatu! Respuesta correcta.'
            : feedback.message ?? 'Todavía no. Mirá el mensaje del tutor y volvé a intentarlo.'}
        </div>
      )}
    </section>
  );
}
