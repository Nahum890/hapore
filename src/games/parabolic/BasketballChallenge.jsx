import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  BASKETBALL_LEVELS,
  evaluateBasketballShot,
  GAMES_I18N,
} from './parabolicGamesEngine.js';
import { drawScene } from '../../simulator/projectileRenderer.js';
import { planFlight } from '../../simulator/flightPlan.js';

export default function BasketballChallenge({ langKey = 'gn-jopara', onProgress }) {
  const t = GAMES_I18N[langKey] || GAMES_I18N.es;
  const [levelIndex, setLevelIndex] = useState(0);
  const level = BASKETBALL_LEVELS[levelIndex];

  // Variables de control de tiro
  const [speed, setSpeed] = useState(String(level.idealSpeed));
  const [angle, setAngle] = useState(String(level.targetAngle));

  // Variables de simulación ambiental
  const [isIndoor, setIsIndoor] = useState(true);
  const [wind, setWind] = useState(0); // m/s (positivo: a favor, negativo: en contra)
  const [temperature, setTemperature] = useState(21); // °C

  const [phase, setPhase] = useState('idle'); // 'idle' | 'flying' | 'result'
  const [evalResult, setEvalResult] = useState(null);

  const canvasRef = useRef(null);
  const progressRef = useRef(0);

  // Al cambiar de nivel, reseteamos controles
  useEffect(() => {
    setSpeed(String(level.idealSpeed));
    setAngle(String(level.targetAngle));
    setPhase('idle');
    setEvalResult(null);
    progressRef.current = 0;
  }, [levelIndex, level]);

  const effectiveWind = isIndoor ? 0 : Number(wind);

  // Vuelo calculado con el motor físico unificado
  const flight = useMemo(() => {
    return planFlight({
      speed: Number(speed) || 10,
      angle: Number(angle) || 45,
      gravity: level.gravity,
      targetX: level.distance,
      targetY: level.hoopHeight,
      y0: level.releaseHeight,
      wind: effectiveWind,
      temperature,
    });
  }, [speed, angle, level, effectiveWind, temperature]);

  // Manejo de canvas y animación
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
        scenario: 'basketball',
        verdict: evalResult?.result === 'swish' || evalResult?.result === 'rim-in',
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

  const handleShoot = (e) => {
    e?.preventDefault();
    const evaluation = evaluateBasketballShot({
      speed,
      angleDeg: angle,
      distance: level.distance,
      hoopHeight: level.hoopHeight,
      releaseHeight: level.releaseHeight,
      gravity: level.gravity,
      wind: effectiveWind,
    });
    setEvalResult(evaluation);
    progressRef.current = 0;
    setPhase('flying');

    if (evaluation.score > 0) {
      onProgress?.({
        id: `basketball-${level.id}`,
        score: evaluation.score,
        result: evaluation.result,
      });
    }
  };

  const handleNextLevel = () => {
    setLevelIndex((prev) => (prev + 1) % BASKETBALL_LEVELS.length);
  };

  return (
    <div className="pgame-challenge-card" aria-label={t.bballTitle}>
      <div className="pgame-badge-row">
        <span className="pgame-level-badge">{level.name}</span>
        <span className="pgame-hoop-spec">Aro: 3.05 m | Ø 45 cm</span>
      </div>

      <h3 className="pgame-challenge-title">{t.bballTitle}</h3>
      <p className="pgame-challenge-subtitle">{t.bballSubtitle}</p>

      {/* Datos físicos reglamentarios */}
      <div className="pgame-data-chips">
        <span className="pgame-chip">
          <small>{t.bballDistance}</small>
          <strong>{level.distance.toFixed(2)} m</strong>
        </span>
        <span className="pgame-chip">
          <small>{t.bballHoopHeight}</small>
          <strong>{level.hoopHeight.toFixed(2)} m</strong>
        </span>
        <span className="pgame-chip">
          <small>{t.bballReleaseHeight}</small>
          <strong>{level.releaseHeight.toFixed(2)} m</strong>
        </span>
        <span className="pgame-chip">
          <small>Gravedad (g)</small>
          <strong>{level.gravity} m/s²</strong>
        </span>
      </div>

      {/* Controles de Simulación Ambiental */}
      <fieldset className="pgame-env-fieldset">
        <legend className="pgame-env-legend">{t.bballEnvTitle}</legend>
        <div className="pgame-env-toggle-row">
          <button
            type="button"
            className={`pgame-env-btn ${isIndoor ? 'is-active' : ''}`}
            onClick={() => { setIsIndoor(true); setWind(0); }}
          >
            {t.bballEnvIndoor}
          </button>
          <button
            type="button"
            className={`pgame-env-btn ${!isIndoor ? 'is-active' : ''}`}
            onClick={() => setIsIndoor(false)}
          >
            {t.bballEnvOutdoor}
          </button>
        </div>

        {!isIndoor && (
          <div className="pgame-env-sliders">
            <label className="pgame-slider-label">
              <span>{t.bballWindLabel} <strong>{wind > 0 ? `+${wind}` : wind} m/s</strong></span>
              <input
                type="range"
                min="-5"
                max="5"
                step="0.5"
                value={wind}
                onChange={(e) => setWind(Number(e.target.value))}
                className="pgame-range-slider"
              />
            </label>
            <label className="pgame-slider-label">
              <span>Temperatura: <strong>{temperature}°C</strong></span>
              <input
                type="range"
                min="5"
                max="38"
                step="1"
                value={temperature}
                onChange={(e) => setTemperature(Number(e.target.value))}
                className="pgame-range-slider"
              />
            </label>
          </div>
        )}
      </fieldset>

      {/* Canvas interactivo */}
      <div className="pgame-canvas-wrapper">
        <canvas
          ref={canvasRef}
          className="pgame-canvas"
          role="img"
          aria-label={`Simulación de básquetbol con aro a 3.05 m`}
        />
      </div>

      {/* Formulario de tiro */}
      <form className="pgame-controls-form" onSubmit={handleShoot}>
        <div className="pgame-input-group">
          <label htmlFor="bball-angle">{t.bballAngleLabel}</label>
          <div className="pgame-input-with-slider">
            <input
              id="bball-angle"
              type="number"
              min="20"
              max="85"
              step="1"
              value={angle}
              onChange={(e) => setAngle(e.target.value)}
              className="pgame-number-input"
            />
            <span className="pgame-input-unit">°</span>
          </div>
        </div>

        <div className="pgame-input-group">
          <label htmlFor="bball-speed">{t.bballSpeedLabel}</label>
          <div className="pgame-input-with-slider">
            <input
              id="bball-speed"
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
            {t.bballFireBtn}
          </button>
          {evalResult && (
            <button
              type="button"
              className="btn btn-secondary pgame-btn-next"
              onClick={handleNextLevel}
            >
              {t.bballNextBtn}
            </button>
          )}
        </div>
      </form>

      {/* Resultado y explicación física */}
      {phase === 'result' && evalResult && (
        <div className={`pgame-feedback ${evalResult.score >= 70 ? 'is-success' : 'is-fail'}`} role="status">
          <strong>
            {evalResult.result === 'swish' && t.bballSwish
              .replace('{speed}', evalResult.speed)
              .replace('{angle}', evalResult.angleDeg)
              .replace('{hoopH}', level.hoopHeight)
              .replace('{ballY}', evalResult.heightAtHoop)}
            {evalResult.result === 'rim-in' && t.bballRimHit}
            {evalResult.result === 'ascending' && t.bballAscending}
            {evalResult.result === 'short' && t.bballShort.replace('{ballY}', evalResult.heightAtHoop)}
            {evalResult.result === 'high' && t.bballHigh.replace('{ballY}', evalResult.heightAtHoop)}
          </strong>

          <div className="pgame-calc-breakdown">
            <p><strong>Cálculo en x = {level.distance} m:</strong></p>
            <ul>
              <li>Tiempo de llegada al aro: <code>t = x / vx = {evalResult.timeToHoop?.toFixed(2)} s</code></li>
              <li>Altura del balón al llegar: <code>y(t) = {evalResult.heightAtHoop} m</code> (Aro reglamentario: <code>3.05 m</code>, margen ±0.32 m)</li>
              <li>Sentido vertical: <code>{evalResult.isDescending ? '⬇️ Descendente (requisito de enceste cumplido)' : '⬆️ Ascendente (imposible encestar desde abajo)'}</code></li>
            </ul>
          </div>

          {isIndoor && (
            <p className="pgame-physics-explainer">{t.bballPhysicsNote}</p>
          )}
        </div>
      )}
    </div>
  );
}
