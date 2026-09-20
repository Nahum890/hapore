import StatusBadge from './StatusBadge.jsx';

export default function LaunchPanel({ values, status, result, onChange, onLaunch, onReset }) {
  const running = status === 'running';

  return (
    <section className="card launch-panel" aria-label="Datos y controles de lanzamiento">
      <h2>Datos de lanzamiento</h2>
      <div className="launch-fields">
        <div className="launch-field">
          <label htmlFor="launch-v0">Velocidad inicial</label>
          <div className="launch-field-row">
            <input
              id="launch-v0"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={values.v0}
              onChange={(event) => onChange({ v0: event.target.value })}
            />
            <span className="launch-unit">m/s</span>
          </div>
        </div>
        <div className="launch-field">
          <label htmlFor="launch-angle">Ángulo</label>
          <div className="launch-field-row">
            <input
              id="launch-angle"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={values.angle}
              onChange={(event) => onChange({ angle: event.target.value })}
            />
            <span className="launch-unit">°</span>
          </div>
        </div>
      </div>
      <div className="launch-actions">
        <button type="button" className="btn btn-primary" onClick={onLaunch} disabled={running}>
          {running ? 'Simulando...' : 'Lanzar dron'}
        </button>
        {status !== 'idle' && (
          <button type="button" className="btn btn-secondary" onClick={onReset}>
            Reiniciar
          </button>
        )}
      </div>
      {(running || result) && (
        <div className="launch-status-row">
          <StatusBadge status={status} message={result?.message} />
        </div>
      )}
      {/* TODO (motor del simulador 2D): conectar el lanzamiento con la animación
          y el dibujo de la trayectoria en el canvas. */}
    </section>
  );
}
