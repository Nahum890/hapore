import { getNextLevel } from '../utils/gamification.js';
import { Nanduti } from './Nanduti.jsx';

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
        <span className="confidence-level" aria-hidden="true"><Nanduti size={46} spokes={12} rings={2} /><strong>{currentLevel.level}</strong></span>
        <div className="confidence-title">
          <h2>Mbarete XP</h2>
          <p>{currentLevel.rank} <small>· {currentLevel.title}</small></p>
        </div>
        <span className="confidence-value">{safeXP}<small>XP</small></span>
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
        Nivel {currentLevel.level}
        {next
          ? ` · Faltan ${Math.max(0, next.xp - safeXP)} XP para el nivel ${next.level}`
          : ' · ¡Nivel máximo alcanzado!'}
      </p>
      <details className="confidence-rules">
        <summary>¿Cómo gano XP?</summary>
        <p>La XP solo sube, nunca baja. Ejercicio sin pistas +50 · con pistas +25 · tarjeta consolidada +15 · pregunta del cuestionario +30.</p>
      </details>
    </section>
  );
}
