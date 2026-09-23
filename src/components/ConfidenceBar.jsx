import { getNextLevel } from '../utils/gamification.js';

export default function ConfidenceBar({ xp, level }) {
  const safeXP = Math.max(0, Math.floor(Number(xp) || 0));
  const currentLevel =
    level ?? { level: 1, xp: 0, rank: 'Temimbo\'e Pyahu', title: 'Iniciante' };
  const next = getNextLevel(safeXP);
  const span = next ? next.xp - currentLevel.xp : 0;
  const progress = next
    ? Math.min(100, Math.max(0, Math.round(((safeXP - currentLevel.xp) / span) * 100)))
    : 100;

  return (
    <section className="card confidence-bar" aria-label="Mbarete XP y Nivel de Cuenta">
      <div className="confidence-row">
        <h2>Mbarete XP</h2>
        <span className="confidence-value">{safeXP} XP</span>
      </div>
      <div
        className="confidence-track"
        role="progressbar"
        aria-label="Progreso al siguiente nivel"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
      >
        <div className="confidence-fill" style={{ width: `${progress}%` }} />
      </div>
      <p className="confidence-hint">
        Nivel {currentLevel.level} — {currentLevel.rank} ({currentLevel.title})
        {next
          ? ` · Faltan ${Math.max(0, next.xp - safeXP)} XP para Nivel ${next.level}`
          : ' · ¡Nivel máximo alcanzado!'}
      </p>
      <p className="confidence-hint">
        Solo puede subir: aterrizaje sin pistas +50 · con pistas +25 · tarjeta consolidada +15 ·
        pregunta del cuestionario +30.
      </p>
    </section>
  );
}
