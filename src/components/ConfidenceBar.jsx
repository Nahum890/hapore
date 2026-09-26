import { useEffect, useRef, useState } from 'react';
import { getNextLevel } from '../utils/gamification.js';
import { Nanduti } from './Nanduti.jsx';

export default function ConfidenceBar({ xp, level, confidence }) {
  const safeXP = Math.max(0, Math.floor(Number(xp) || 0));
  const safeConfidence = Math.max(0, Math.min(100, Math.round(Number(confidence) || 0)));
  const currentLevel =
    level ?? { level: 1, xp: 0, rank: 'Temimbo\'e Pyahu', title: 'Iniciante' };
  const next = getNextLevel(safeXP);
  const span = next ? next.xp - currentLevel.xp : 0;
  const progress = next
    ? Math.min(100, Math.max(0, Math.round(((safeXP - currentLevel.xp) / span) * 100)))
    : 100;

  const [isLevelUp, setIsLevelUp] = useState(false);
  const [xpDelta, setXpDelta] = useState(0);
  const prevLevelRef = useRef(currentLevel.level);
  const prevXpRef = useRef(safeXP);

  useEffect(() => {
    if (currentLevel.level > prevLevelRef.current) {
      setIsLevelUp(true);
      const timer = setTimeout(() => setIsLevelUp(false), 450);
      prevLevelRef.current = currentLevel.level;
      return () => clearTimeout(timer);
    }
    prevLevelRef.current = currentLevel.level;
    return undefined;
  }, [currentLevel.level]);

  useEffect(() => {
    if (safeXP > prevXpRef.current) {
      const delta = safeXP - prevXpRef.current;
      setXpDelta(delta);
      const timer = setTimeout(() => setXpDelta(0), 600);
      prevXpRef.current = safeXP;
      return () => clearTimeout(timer);
    }
    prevXpRef.current = safeXP;
    return undefined;
  }, [safeXP]);

  return (
    <section className="card confidence-bar" aria-label="Mbarete XP y Nivel de Cuenta">
      <div className="confidence-row">
        <span
          className={`confidence-level ${isLevelUp ? 'is-leveling' : ''}`}
          aria-hidden="true"
          title={`Nivel ${currentLevel.level}: ${currentLevel.title}`}
        >
          <Nanduti size={46} spokes={12} rings={2} />
          <strong>{currentLevel.level}</strong>
        </span>
        <div className="confidence-title">
          <h2>Mbarete XP</h2>
          <p>
            {currentLevel.rank} <small>· {currentLevel.title}</small>
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span className="confidence-value">
            {safeXP}
            <small>XP</small>
          </span>
          {xpDelta > 0 && (
            <span className="confidence-xp-gain" aria-live="polite">
              +{xpDelta}
            </span>
          )}
        </div>
      </div>
      <div
        className="confidence-track"
        role="progressbar"
        aria-label="Progreso hacia el siguiente nivel"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
        aria-valuetext={`${progress}% completado para alcanzar nivel ${next ? next.level : currentLevel.level}`}
      >
        <div className="confidence-fill" style={{ width: `${progress}%` }} />
      </div>
      <p className="confidence-hint">
        Nivel {currentLevel.level}
        {next
          ? ` · Faltan ${Math.max(0, next.xp - safeXP)} XP para el nivel ${next.level}`
          : ' · ¡Nivel máximo alcanzado!'}
      </p>
      <p className="confidence-explainer">
        XP mide cuánto practicaste; el nivel es un logro por acumular XP. Nunca bajan, aunque te equivoques.
      </p>
      <div className="confidence-meter" aria-label="Confianza pedagógica">
        <div className="confidence-meter-head">
          <span>Confianza</span>
          <strong>{safeConfidence}/100</strong>
        </div>
        <div
          className="confidence-track"
          role="progressbar"
          aria-label="Nivel de confianza sobre 100"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={safeConfidence}
          aria-valuetext={`Confianza ${safeConfidence} sobre 100`}
        >
          <div className="confidence-fill confidence-fill-metric" style={{ width: `${safeConfidence}%` }} />
        </div>
        <p className="confidence-explainer">
          Mide qué tan seguido acertás sin pistas. Sube con cada acierto y nunca baja con un error.
        </p>
      </div>
      <details className="confidence-rules">
        <summary>¿Cómo gano XP?</summary>
        <p>
          La XP solo sube, nunca baja. Ejercicio sin pistas +50 · con pistas +25 · tarjeta consolidada +15 · pregunta del cuestionario +30.
        </p>
      </details>
    </section>
  );
}
