export default function ExerciseCard({
  exercise,
  answer,
  feedback,
  hintsUsed,
  currentHint,
  hasHints,
  onChange,
  onCheck,
  onHint,
}) {
  return (
    <section className="card exercise-card" aria-label={`Ejercicio ${exercise.id}`}>
      <div className="exercise-meta">
        <span className="chip chip-topic">{exercise.topic}</span>
        <span className="chip chip-difficulty">{exercise.difficulty}</span>
      </div>
      <p className="exercise-question">{exercise.question}</p>
      <div className="values-chips" aria-label="Datos del ejercicio">
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
          onChange={(event) => onChange(event.target.value)}
        />
        <span className="answer-unit">{exercise.unit}</span>
      </div>
      <div className="exercise-actions">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onHint}
          disabled={!hasHints}
        >
          {hasHints ? 'Pedir pista' : 'Sin más pistas'}
        </button>
        <button type="button" className="btn btn-primary" onClick={onCheck}>
          Comprobar
        </button>
      </div>
      {currentHint && (
        <div className="hint-box" role="status">
          <strong>Pista {hintsUsed}:</strong> {currentHint}
        </div>
      )}
      {feedback && (
        <div className={`feedback ${feedback.status}`} role="status">
          <span className={`feedback-icon ${feedback.status}`} aria-hidden="true">
            {feedback.status === 'success' ? (
              <svg viewBox="0 0 24 24" width="16" height="16" focusable="false">
                <path d="M5 12.5 L10 17.5 L19 7" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="16" height="16" focusable="false">
                <path d="M12 4 L21 19 H3 Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                <line x1="12" y1="10" x2="12" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <circle cx="12" cy="16.6" r="0.9" fill="currentColor" />
              </svg>
            )}
          </span>
          {feedback.message}
        </div>
      )}
      {/* TODO (integración): recibir hint del tutor cuando el estudiante se equivoca. */}
    </section>
  );
}
