export default function ConfidenceBar({ confidence }) {
  const safeValue = Math.max(0, Math.min(100, Math.round(confidence)));

  return (
    <section className="card confidence-bar" aria-label="Nivel de Confianza">
      <div className="confidence-row">
        <h2>Nivel de Confianza</h2>
        <span className="confidence-value">{safeValue}%</span>
      </div>
      <div
        className="confidence-track"
        role="progressbar"
        aria-label="Nivel de Confianza"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={safeValue}
      >
        <div className="confidence-fill" style={{ width: `${safeValue}%` }} />
      </div>
      <p className="confidence-hint">
        Solo puede subir: ejercicio sin pistas +25 · con pistas +15 · tarjeta consolidada +5.
      </p>
    </section>
  );
}
