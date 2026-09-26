import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  FREEKICK_LEVELS,
  evaluateFreeKickShot,
  GAMES_I18N,
} from './parabolicGamesEngine.js';
import { drawScene } from '../../simulator/projectileRenderer.js';
import { planFlight } from '../../simulator/flightPlan.js';

export default function FreeKickChallenge({ langKey = 'gn-jopara', onProgress }) {
  const t = GAMES_I18N[langKey] || GAMES_I18N.es;
  const [levelIndex, setLevelIndex] = useState(0);
  const level = FREEKICK_LEVELS[levelIndex];

  const [speed, setSpeed] = useState(String(level.idealSpeed));
  const [angle, setAngle] = useState(String(level.suggestedAngle));
  const [phase, setPhase] = useState('idle'); // 'idle' | 'flying' | 'result'
  const [evalResult, setEvalResult] = useState(null);

  const canvasRef = useRef(null);
  const progressRef = useRef(0);

  useEffect(() => {
    setSpeed(String(level.idealSpeed));
    setAngle(String(level.suggestedAngle));
    setPhase('idle');
    setEvalResult(null);
    progressRef.current = 0;
  }, [levelIndex, level]);

  const flight = useMemo(() => {
    const planned = planFlight({
      speed: Number(speed) || 20,
      angle: Number(angle) || 25,
      gravity: level.gravity,
      targetX: level.distance,
      targetY: level.goalHeight,
      y0: 0,
      obstacle: { x: level.barrierDistance, height: level.barrierHeight, isFreeKick: true },
    });
    planned.isFreeKick = true;
    return planned;
  }, [speed, angle, level]);

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
        scenario: 'wall',
        verdict: evalResult?.result === 'goal',
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
      const durationMs = Math.min(3800, Math.max(2000, flight.duration * 800));
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

  const handleKick = (e) => {
    e?.preventDefault();
    const evaluation = evaluateFreeKickShot({
      speed,
      angleDeg: angle,
      distance: level.distance,
      barrierDistance: level.barrierDistance,
      barrierHeight: level.barrierHeight,
      goalHeight: level.goalHeight,
      gravity: level.gravity,
    });
    setEvalResult(evaluation);
    progressRef.current = 0;
    setPhase('flying');

    if (evaluation.score > 0) {
      onProgress?.({
        id: `freekick-${level.id}`,
        score: evaluation.score,
        result: evaluation.result,
      });
    }
  };

  const handleNext = () => {
    setLevelIndex((prev) => (prev + 1) % FREEKICK_LEVELS.length);
  };

  return (
    <div className="pgame-challenge-card" aria-label={t.fkTitle}>
      <div className="pgame-badge-row">
        <span className="pgame-level-badge">{level.name}</span>
        <span className="pgame-fifa-spec">Barrera FIFA: 9.15 m · Travesaño: 2.44 m</span>
      </div>

      <h3 className="pgame-challenge-title">{t.fkTitle}</h3>
      <p className="pgame-challenge-subtitle">{t.fkSubtitle}</p>

      {/* Datos físicos */}
      <div className="pgame-data-chips">
        <span className="pgame-chip">
          <small>{t.fkDistance}</small>
          <strong>{level.distance.toFixed(1)} m</strong>
        </span>
        <span className="pgame-chip">
          <small>{t.fkBarrier}</small>
          <strong>{level.barrierHeight.toFixed(2)} m alto</strong>
        </span>
        <span className="pgame-chip">
          <small>{t.fkGoalHeight}</small>
          <strong>{level.goalHeight.toFixed(2)} m</strong>
        </span>
        <span className="pgame-chip">
          <small>Gravedad (g)</small>
          <strong>{level.gravity} m/s²</strong>
        </span>
      </div>

      {/* Canvas */}
      <div className="pgame-canvas-wrapper">
        <canvas
          ref={canvasRef}
          className="pgame-canvas"
          role="img"
          aria-label="Simulación de tiro libre sobre barrera FIFA hacia el arco"
        />
      </div>

      {/* Formulario de disparo */}
      <form className="pgame-controls-form" onSubmit={handleKick}>
        <div className="pgame-input-group">
          <label htmlFor="fk-angle">Ángulo de elevación (θ):</label>
          <div className="pgame-input-with-slider">
            <input
              id="fk-angle"
              type="number"
              min="10"
              max="60"
              step="1"
              value={angle}
              onChange={(e) => setAngle(e.target.value)}
              className="pgame-number-input"
            />
            <span className="pgame-input-unit">°</span>
          </div>
        </div>

        <div className="pgame-input-group">
          <label htmlFor="fk-speed">Rapidez del disparo (v₀ m/s):</label>
          <div className="pgame-input-with-slider">
            <input
              id="fk-speed"
              type="text"
              inputMode="decimal"
              value={speed}
              onChange={(e) => setSpeed(e.target.value)}
              className="pgame-number-input"
            />
            <span className="pgame-input-unit">m/s</span>
          </div>
        </div>

        <div className="pgame-actions">
          <button
            type="submit"
            className="btn btn-primary pgame-btn-fire"
            disabled={phase === 'flying'}
          >
            {t.fkFireBtn}
          </button>
          {evalResult && (
            <button
              type="button"
              className="btn btn-secondary pgame-btn-next"
              onClick={handleNext}
            >
              {t.fkNextBtn}
            </button>
          )}
        </div>
      </form>

      {/* Resultado y análisis físico */}
      {phase === 'result' && evalResult && (
        <div className={`pgame-feedback ${evalResult.result === 'goal' ? 'is-success' : 'is-fail'}`} role="status">
          <strong>
            {evalResult.result === 'goal' && t.fkGoal
              .replace('{barrierY}', evalResult.barrierY)
              .replace('{goalY}', evalResult.goalY)}
            {evalResult.result === 'blocked' && t.fkBlocked.replace('{barrierY}', evalResult.barrierY)}
            {evalResult.result === 'over-bar' && t.fkOverBar.replace('{goalY}', evalResult.goalY)}
            {evalResult.result === 'ground-short' && t.fkGroundShort}
            {evalResult.result === 'miss' && 'El tiro no alcanzó el objetivo.'}
          </strong>

          <div className="pgame-calc-breakdown">
            <p><strong>Comprobación cinemática:</strong></p>
            <ul>
              <li>
                Paso sobre la barrera (x = 9.15 m):{' '}
                <code>y(9.15 m) = {evalResult.barrierY} m</code>{' '}
                {evalResult.clearsBarrier ? '✅ Superó los 1.80 m' : '❌ Impactó en la barrera (y ≤ 1.80 m)'}
              </li>
              <li>
                Llegada al arco (x = {level.distance} m):{' '}
                <code>y({level.distance} m) = {evalResult.goalY} m</code>{' '}
                {evalResult.goalY > 0 && evalResult.goalY <= level.goalHeight ? '✅ Dentro del arco (0 < y ≤ 2.44 m)' : '❌ Fuera del arco'}
              </li>
            </ul>
          </div>

          <div className="pgame-magnus-card">
            <h4>{t.fkMagnusTitle}</h4>
            <p>{t.fkMagnusBody}</p>
          </div>
        </div>
      )}
    </div>
  );
}
