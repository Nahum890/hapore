import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  TARGET_LEVELS,
  evaluateTargetShot,
  GAMES_I18N,
} from './parabolicGamesEngine.js';
import { drawScene } from '../../simulator/projectileRenderer.js';
import { planFlight } from '../../simulator/flightPlan.js';

export default function TargetChallenge({ langKey = 'gn-jopara', onProgress }) {
  const t = GAMES_I18N[langKey] || GAMES_I18N.es;
  const [levelIndex, setLevelIndex] = useState(0);
  const level = TARGET_LEVELS[levelIndex];

  const [speedInput, setSpeedInput] = useState('');
  const [phase, setPhase] = useState('idle');
  const [evalResult, setEvalResult] = useState(null);

  const canvasRef = useRef(null);
  const progressRef = useRef(0);

  useEffect(() => {
    setSpeedInput('');
    setPhase('idle');
    setEvalResult(null);
    progressRef.current = 0;
  }, [levelIndex, level]);

  const numSpeed = Number(speedInput.replace(',', '.')) || 0;

  const flight = useMemo(() => {
    return planFlight({
      speed: numSpeed > 0 ? numSpeed : 15,
      angle: level.angleDeg,
      gravity: level.gravity,
      targetX: level.distance,
      targetY: 0,
      y0: 0,
    });
  }, [numSpeed, level]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let frameId = 0;
    let startedAt = null;

    const draw = (now = 0) => {
      if (!width || !height) return;
      ctx.clearRect(0, 0, width, height);
      drawScene(ctx, {
        width,
        height,
        flight,
        progress: progressRef.current,
        phase: phase === 'flying' ? 'flying' : phase === 'result' ? 'landed' : 'idle',
        now,
        scenario: 'dron',
        verdict: evalResult?.result === 'perfect',
      });
    };

    const resize = () => {
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      if (!width || !height) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    if (phase === 'flying') {
      const durationMs = Math.min(3500, Math.max(1800, flight.duration * 750));
      const tick = (now) => {
        if (startedAt === null) startedAt = now;
        progressRef.current = Math.min(1, (now - startedAt) / durationMs);
        draw(now);
        if (progressRef.current < 1) {
          frameId = requestAnimationFrame(tick);
        } else {
          setPhase('result');
        }
      };
      frameId = requestAnimationFrame(tick);
    } else {
      progressRef.current = phase === 'result' ? 1 : 0;
      draw();
    }

    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
    };
  }, [flight, phase, evalResult]);

  const handleFire = (e) => {
    e?.preventDefault();
    const evaluation = evaluateTargetShot({
      speed: speedInput,
      angleDeg: level.angleDeg,
      targetDistance: level.distance,
      tolerance: level.tolerance,
      gravity: level.gravity,
    });
    setEvalResult(evaluation);
    progressRef.current = 0;
    setPhase('flying');

    if (evaluation.score > 0) {
      onProgress?.({
        id: `target-${level.id}`,
        score: evaluation.score,
        result: evaluation.result,
      });
    }
  };

  const handleNext = () => {
    setLevelIndex((prev) => (prev + 1) % TARGET_LEVELS.length);
  };

  return (
    <div className="pgame-challenge-card" aria-label={t.targetTitle}>
      <div className="pgame-badge-row">
        <span className="pgame-level-badge">Nivel {levelIndex + 1} de {TARGET_LEVELS.length}</span>
      </div>

      <h3 className="pgame-challenge-title">{t.targetTitle}</h3>
      <p className="pgame-challenge-subtitle">{t.targetSubtitle}</p>

      <div className="pgame-data-chips">
        <span className="pgame-chip">
          <small>{t.targetGoalLabel}</small>
          <strong>{level.distance.toFixed(1)} m</strong>
        </span>
        <span className="pgame-chip">
          <small>{t.targetAngleLabel}</small>
          <strong>{level.angleDeg}°</strong>
        </span>
        <span className="pgame-chip">
          <small>{t.targetGravityLabel}</small>
          <strong>{level.gravity} m/s²</strong>
        </span>
      </div>

      <div className="pgame-canvas-wrapper">
        <canvas
          ref={canvasRef}
          className="pgame-canvas"
          role="img"
          aria-label="Simulación de tiro al blanco con rapidez calculada"
        />
      </div>

      <form className="pgame-controls-form" onSubmit={handleFire}>
        <div className="pgame-input-group">
          <label htmlFor="target-speed">{t.targetInputLabel}</label>
          <div className="pgame-input-with-slider">
            <input
              id="target-speed"
              type="text"
              inputMode="decimal"
              placeholder={t.targetInputPlaceholder}
              value={speedInput}
              onChange={(e) => setSpeedInput(e.target.value)}
              className="pgame-number-input"
            />
            <span className="pgame-input-unit">m/s</span>
          </div>
        </div>

        <div className="pgame-actions">
          <button
            type="submit"
            className="btn btn-primary pgame-btn-fire"
            disabled={!speedInput.trim() || phase === 'flying'}
          >
            {t.targetFireBtn}
          </button>
          {evalResult && (
            <button
              type="button"
              className="btn btn-secondary pgame-btn-next"
              onClick={handleNext}
            >
              {t.targetNextBtn}
            </button>
          )}
        </div>
      </form>

      {phase === 'result' && evalResult && (
        <div className={`pgame-feedback ${evalResult.result === 'perfect' ? 'is-success' : 'is-fail'}`} role="status">
          <strong>
            {evalResult.result === 'perfect' && t.targetHitExact
              .replace('{speed}', evalResult.speed)
              .replace('{landing}', evalResult.landingX)
              .replace('{target}', level.distance)}
            {evalResult.result !== 'perfect' && t.targetMissFar
              .replace('{speed}', evalResult.speed)
              .replace('{landing}', evalResult.landingX)
              .replace('{diff}', evalResult.diff)
              .replace('{target}', level.distance)}
          </strong>

          <div className="pgame-calc-breakdown">
            <p><strong>Fórmula analítica de examen:</strong></p>
            <code>v₀ = √( (R · g) / sin(2θ) ) = √( ({level.distance} · {level.gravity}) / sin({level.angleDeg * 2}°) ) ≈ {level.exactSpeed} m/s</code>
          </div>
        </div>
      )}
    </div>
  );
}
