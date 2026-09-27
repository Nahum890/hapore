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

  // Variables de control de tiro (la casilla de rapidez inicia vacía para exigir el cálculo del estudiante)
  const [speed, setSpeed] = useState('');
  const [angle, setAngle] = useState(String(level.targetAngle));

  // Variables de simulación ambiental
  const [isIndoor, setIsIndoor] = useState(true);
  const [wind, setWind] = useState(0); // m/s
  const [temperature, setTemperature] = useState(21); // °C

  // Estados de juego y dinamismo
  const [phase, setPhase] = useState('idle'); // 'idle' | 'flying' | 'result'
  const [evalResult, setEvalResult] = useState(null);
  const [activeFlight, setActiveFlight] = useState(null);

  // Reloj de posesión de 24 segundos y marcador dinámico
  const [shotClock, setShotClock] = useState(24.0);
  const [isViolation, setIsViolation] = useState(false);
  const [totalScore, setTotalScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [showTactics, setShowTactics] = useState(false);

  const canvasRef = useRef(null);
  const progressRef = useRef(0);

  // Al cambiar de nivel, reseteamos controles y reloj con la casilla vacía
  useEffect(() => {
    setSpeed('');
    setAngle(String(level.targetAngle));
    setPhase('idle');
    setEvalResult(null);
    setActiveFlight(null);
    progressRef.current = 0;
    setShotClock(24.0);
    setIsViolation(false);
  }, [levelIndex, level]);

  // Reloj de posesión regresivo de 24s durante 'idle'
  useEffect(() => {
    if (phase !== 'idle' || isViolation) return undefined;
    const interval = setInterval(() => {
      setShotClock((prev) => {
        if (prev <= 0.1) {
          setIsViolation(true);
          return 0;
        }
        return Math.round((prev - 0.1) * 10) / 10;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [phase, isViolation]);

  // Violación de 24s: reinicio automático tras aviso
  useEffect(() => {
    if (!isViolation) return undefined;
    const timeout = setTimeout(() => {
      setIsViolation(false);
      setShotClock(24.0);
    }, 2600);
    return () => clearTimeout(timeout);
  }, [isViolation]);

  const effectiveWind = isIndoor ? 0 : Number(wind);

  const numCurrentSpeed = Number(String(speed).replace(',', '.'));
  const hasValidSpeed = !isNaN(numCurrentSpeed) && numCurrentSpeed > 0;

  // Vuelo base para el escenario en reposo (idle)
  const idleFlight = useMemo(() => {
    const planned = planFlight({
      speed: hasValidSpeed ? numCurrentSpeed : 10,
      angle: Number(angle) || level.targetAngle,
      gravity: level.gravity,
      targetX: level.distance,
      targetY: level.hoopHeight,
      y0: level.releaseHeight,
      wind: effectiveWind,
      temperature,
    });
    planned.hasUserSpeed = hasValidSpeed;
    planned.userSpeed = hasValidSpeed ? numCurrentSpeed : null;
    return planned;
  }, [level, angle, hasValidSpeed, numCurrentSpeed]);

  // La simulación solo usa el vuelo lanzado cuando no está en reposo
  const flight = (phase !== 'idle' && activeFlight) ? activeFlight : idleFlight;

  const resetToIdleIfActive = () => {
    if (phase !== 'idle') {
      setPhase('idle');
      setEvalResult(null);
      setActiveFlight(null);
      progressRef.current = 0;
    }
  };

  const handleAngleChange = (e) => {
    setAngle(e.target.value);
    resetToIdleIfActive();
  };

  const handleSpeedChange = (e) => {
    setSpeed(e.target.value);
    resetToIdleIfActive();
  };

  const adjustSpeed = (delta) => {
    const cur = Number(String(speed).replace(',', '.')) || level.idealSpeed;
    const next = Math.max(3, Math.min(30, Math.round((cur + delta) * 10) / 10));
    setSpeed(String(next));
    resetToIdleIfActive();
  };

  const adjustAngle = (delta) => {
    const cur = Number(angle) || level.targetAngle;
    const next = Math.max(15, Math.min(85, cur + delta));
    setAngle(String(next));
    resetToIdleIfActive();
  };

  const handleWindChange = (val) => {
    setWind(val);
    resetToIdleIfActive();
  };

  const handleTemperatureChange = (val) => {
    setTemperature(val);
    resetToIdleIfActive();
  };

  const handleIndoorSelect = (indoor) => {
    setIsIndoor(indoor);
    if (indoor) setWind(0);
    resetToIdleIfActive();
  };

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
        verdict: evalResult?.result === 'swish' || evalResult?.result === 'bank-in' || evalResult?.result === 'rim-in',
        language: langKey,
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

    const windIsAnimated = Math.abs(Number(flight.environment?.wind) || 0) > 0.05
      && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (phase === 'flying' || windIsAnimated) {
      const durationMs = Math.min(3500, Math.max(1800, flight.duration * 750));
      const tick = (now) => {
        if (phase === 'flying') {
          if (startedAt === null) startedAt = now;
          progressRef.current = Math.min(1, (now - startedAt) / durationMs);
        }
        draw(now);
        if ((phase === 'flying' && progressRef.current < 1) || (phase !== 'flying' && windIsAnimated)) {
          frameId = requestAnimationFrame(tick);
        } else if (phase === 'flying') {
          setPhase('result');
        }
      };
      frameId = requestAnimationFrame(tick);
    } else {
      progressRef.current = phase === 'result' ? 1 : 0;
      draw(performance.now());
    }

    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
    };
  }, [flight, phase, evalResult, langKey]);

  const handleShoot = (e) => {
    e?.preventDefault();
    const numSpeed = Number(String(speed).replace(',', '.'));
    const numAngle = Number(angle);
    if (isNaN(numSpeed) || numSpeed <= 0 || isNaN(numAngle) || numAngle <= 0 || phase === 'flying') {
      return;
    }

    const evaluation = evaluateBasketballShot({
      speed: numSpeed,
      angleDeg: numAngle,
      distance: level.distance,
      hoopHeight: level.hoopHeight,
      releaseHeight: level.releaseHeight,
      gravity: level.gravity,
      wind: effectiveWind,
    });

    const shotFlight = planFlight({
      speed: numSpeed,
      angle: numAngle,
      gravity: level.gravity,
      targetX: level.distance,
      targetY: level.hoopHeight,
      y0: level.releaseHeight,
      wind: effectiveWind,
      temperature,
    });

    // Puntuación deportiva y racha
    let ptsEarned = 0;
    if (evaluation.result === 'swish') ptsEarned = 3;
    else if (evaluation.result === 'bank-in') ptsEarned = 2;
    else if (evaluation.result === 'rim-in') ptsEarned = 2;

    if (ptsEarned > 0) {
      if (shotClock > 10) ptsEarned += 1; // bonus de tiro rápido
      setTotalScore((prev) => prev + ptsEarned);
      setStreak((prev) => prev + 1);
    } else {
      setStreak(0);
    }

    setActiveFlight(shotFlight);
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

  const numSpeed = Number(String(speed).replace(',', '.'));
  const numAngle = Number(angle);
  const canShoot = phase !== 'flying' && speed.trim().length > 0 && !isNaN(numSpeed) && numSpeed > 0 && !isNaN(numAngle) && numAngle > 0;

  // Cálculo cinemático teórico para el ángulo actual (asistente de pizarra)
  const curAngleDeg = Number(angle) || level.targetAngle;
  const curAngleRad = (curAngleDeg * Math.PI) / 180;
  const deltaY = level.hoopHeight - level.releaseHeight; // 1.25 m
  const denom = 2 * (level.distance * Math.tan(curAngleRad) - deltaY);
  const theoreticalSpeed = denom > 0
    ? (level.distance / Math.cos(curAngleRad)) * Math.sqrt(level.gravity / denom)
    : null;

  // Verificación en vivo si el alumno ya ingresó un número en el casillero
  let liveCalcCheck = null;
  if (!isNaN(numSpeed) && numSpeed > 0) {
    const vx = numSpeed * Math.cos(curAngleRad);
    const vy = numSpeed * Math.sin(curAngleRad);
    const tHoop = vx > 0 ? level.distance / vx : 0;
    const yHoop = level.releaseHeight + vy * tHoop - 0.5 * level.gravity * tHoop * tHoop;
    const isDes = vy - level.gravity * tHoop < 0;
    const diff = yHoop - level.hoopHeight;
    liveCalcCheck = {
      tHoop: tHoop.toFixed(2),
      yHoop: yHoop.toFixed(2),
      isDes,
      diff: diff.toFixed(2),
    };
  }

  return (
    <div className="pgame-challenge-card" aria-label={t.bballTitle}>
      {/* Marcador dinámico superior con Shot Clock */}
      <div className="pgame-bball-scoreboard" aria-label={t.bballScoreboardLabel}>
        <div className="pgame-sb-item pgame-sb-level">
          <span className="pgame-sb-label">{t.bballLevelLabel}</span>
          <span className="pgame-sb-val pgame-sb-level-value">{level.name}</span>
        </div>
        <div className="pgame-sb-item">
          <span className="pgame-sb-label">{t.scoreLabel || 'Puntos'}</span>
          <span className="pgame-sb-val">{totalScore} PTS</span>
        </div>
        <div className="pgame-sb-item">
          <span className="pgame-sb-label">{t.bballStreakLabel}</span>
          <span className={`pgame-sb-val ${streak >= 2 ? 'is-hot' : ''}`}>
            {streak > 0 ? `x${streak}` : '0'}
          </span>
        </div>
        <div className={`pgame-shot-clock ${shotClock <= 5.0 ? 'is-low' : ''}`}>
          <span className="pgame-sb-label">{t.bballClockLabel}</span>
          <span className="pgame-clock-digits">{shotClock.toFixed(1)}s</span>
        </div>
      </div>

      {isViolation && (
        <div className="pgame-feedback is-fail" role="alert">
          <strong>{t.bballShotClockViolation}</strong>
        </div>
      )}

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

      {/* Botón y contenedor interactivo de Pizarra de Cálculo del DT */}
      <button
        type="button"
        className="pgame-tactics-toggle"
        onClick={() => setShowTactics((prev) => !prev)}
      >
        <span>{t.bballTacticsTitle}</span>
        <span>{showTactics ? '▲ Ocultar pizarra' : '▼ Abrir pizarra de cálculo'}</span>
      </button>

      {showTactics && (
        <div className="pgame-tactics-box">
          <p><strong>{t.bballCalcBoardTitle}</strong></p>
          <p>{t.bballCalcBoardDesc}</p>
          <div style={{ background: '#ffffff', padding: '0.6rem 0.85rem', borderRadius: '0.5rem', margin: '0.5rem 0', border: '1px solid #ccfbf1' }}>
            <code>v₀ = (x / cos θ) · √( g / (2 · [x · tg θ - Δy]) )</code>
          </div>
          <p style={{ margin: '0.35rem 0' }}>
            Datos: <code>x = {level.distance.toFixed(2)} m</code>, <code>Δy = {deltaY.toFixed(2)} m</code>, <code>g = {level.gravity} m/s²</code>, <code>θ = {curAngleDeg}°</code>.
          </p>
          {theoreticalSpeed && (
            <div style={{ marginTop: '0.6rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem' }}>
              <span>Fórmula resuelta para {curAngleDeg}°: <strong>v₀ = {theoreticalSpeed.toFixed(2)} m/s</strong></span>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.82rem' }}
                onClick={() => { setSpeed(theoreticalSpeed.toFixed(2)); resetToIdleIfActive(); }}
                disabled={phase === 'flying'}
              >
                {t.bballApplyBtn}
              </button>
            </div>
          )}
          {liveCalcCheck && (
            <div style={{ marginTop: '0.6rem', padding: '0.5rem', background: '#f8fafc', borderRadius: '0.4rem', border: '1px solid #e2e8f0' }}>
              <strong>Comprobación física de tu cálculo ({numSpeed} m/s):</strong>
              <div>• Tiempo de llegada al aro: <code>t ≈ {liveCalcCheck.tHoop} s</code></div>
              <div>• Altura al llegar a x = {level.distance} m: <code>y ≈ {liveCalcCheck.yHoop} m</code> (Aro: <code>3.05 m</code>)</div>
              <div style={{ marginTop: '0.25rem', fontWeight: 600 }}>
                {Math.abs(Number(liveCalcCheck.diff)) <= 0.15 && liveCalcCheck.isDes ? (
                  <span style={{ color: '#16a34a' }}>{t.bballValidCalc}</span>
                ) : Number(liveCalcCheck.diff) > 0.15 && Number(liveCalcCheck.diff) <= 0.45 && liveCalcCheck.isDes ? (
                  <span style={{ color: '#0284c7' }}>Buen tiro con tablero: impactará a {liveCalcCheck.yHoop} m y rebotará al aro.</span>
                ) : Number(liveCalcCheck.diff) < -0.15 ? (
                  <span style={{ color: '#dc2626' }}>{t.bballShortCalc}</span>
                ) : (
                  <span style={{ color: '#dc2626' }}>{t.bballHighCalc}</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Controles de Simulación Ambiental */}
      <fieldset className="pgame-env-fieldset">
        <legend className="pgame-env-legend">{t.bballEnvTitle}</legend>
        <div className="pgame-env-toggle-row">
          <button
            type="button"
            className={`pgame-env-btn ${isIndoor ? 'is-active' : ''}`}
            onClick={() => handleIndoorSelect(true)}
            disabled={phase === 'flying'}
          >
            {t.bballEnvIndoor}
          </button>
          <button
            type="button"
            className={`pgame-env-btn ${!isIndoor ? 'is-active' : ''}`}
            onClick={() => handleIndoorSelect(false)}
            disabled={phase === 'flying'}
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
                onChange={(e) => handleWindChange(Number(e.target.value))}
                disabled={phase === 'flying'}
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
                onChange={(e) => handleTemperatureChange(Number(e.target.value))}
                disabled={phase === 'flying'}
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

      {/* Formulario de tiro con botones rápidos */}
      <form className="pgame-controls-form" onSubmit={handleShoot}>
        <div className="pgame-input-group">
          <label htmlFor="bball-angle">{t.bballAngleLabel}</label>
          <div className="pgame-step-row">
            <button
              type="button"
              className="pgame-step-btn"
              onClick={() => adjustAngle(-1)}
              disabled={phase === 'flying'}
              title="Restar 1 grado"
            >
              - 1°
            </button>
            <div className="pgame-input-with-slider" style={{ flex: '1 1 auto' }}>
              <input
                id="bball-angle"
                type="number"
                min="20"
                max="85"
                step="1"
                value={angle}
                onChange={handleAngleChange}
                disabled={phase === 'flying'}
                className="pgame-number-input"
              />
              <span className="pgame-input-unit">°</span>
            </div>
            <button
              type="button"
              className="pgame-step-btn"
              onClick={() => adjustAngle(1)}
              disabled={phase === 'flying'}
              title="Sumar 1 grado"
            >
              + 1°
            </button>
          </div>
        </div>

        <div className="pgame-input-group">
          <label htmlFor="bball-speed">{t.bballSpeedLabel}</label>
          <div className="pgame-step-row">
            <button
              type="button"
              className="pgame-step-btn"
              onClick={() => adjustSpeed(-0.5)}
              disabled={phase === 'flying'}
              title="Restar 0.5 m/s"
            >
              - 0.5
            </button>
            <div className="pgame-input-with-slider" style={{ flex: '1 1 auto' }}>
              <input
                id="bball-speed"
                type="text"
                inputMode="decimal"
                value={speed}
                onChange={handleSpeedChange}
                disabled={phase === 'flying'}
                className="pgame-number-input"
              />
              <span className="pgame-input-unit">m/s</span>
            </div>
            <button
              type="button"
              className="pgame-step-btn"
              onClick={() => adjustSpeed(0.5)}
              disabled={phase === 'flying'}
              title="Sumar 0.5 m/s"
            >
              + 0.5
            </button>
          </div>
        </div>

        <div className="pgame-actions">
          <button
            type="submit"
            className="btn btn-primary pgame-btn-fire"
            disabled={!canShoot}
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

      {/* Resultado y explicación física con colisiones */}
      {phase === 'result' && evalResult && (
        <div className={`pgame-feedback ${evalResult.score >= 70 ? 'is-success' : 'is-fail'}`} role="status">
          <strong>
            {evalResult.result === 'swish' && t.bballSwish
              .replace('{speed}', evalResult.speed)
              .replace('{angle}', evalResult.angleDeg)
              .replace('{hoopH}', level.hoopHeight)
              .replace('{ballY}', evalResult.heightAtHoop)}
            {evalResult.result === 'bank-in' && t.bballBankIn
              .replace('{speed}', evalResult.speed)
              .replace('{angle}', evalResult.angleDeg)}
            {evalResult.result === 'rim-in' && t.bballRimHit}
            {evalResult.result === 'bank-miss' && t.bballBankMiss.replace('{ballY}', evalResult.heightAtHoop)}
            {evalResult.result === 'rim-miss' && t.bballRimMiss}
            {evalResult.result === 'ascending' && t.bballAscending}
            {evalResult.result === 'short' && t.bballShort.replace('{ballY}', evalResult.heightAtHoop)}
            {evalResult.result === 'high' && t.bballHigh.replace('{ballY}', evalResult.heightAtHoop)}
          </strong>

          <div className="pgame-calc-breakdown">
            <p><strong>{t.bballCalcAtDistance.replace('{distance}', level.distance)}</strong></p>
            <ul>
              <li>{t.bballTimeToHoop} <code>t = x / vx = {evalResult.timeToHoop?.toFixed(2)} s</code></li>
              <li>{t.bballBallHeightAtHoop} <code>y(t) = {evalResult.heightAtHoop} m</code> ({t.bballRegulationHoop} <code>{level.hoopHeight.toFixed(2)} m</code>)</li>
              <li>{t.bballVerticalDirection} <code>{evalResult.isDescending ? `↓ ${t.bballDescending}` : `↑ ${t.bballAscendingDirection}`}</code></li>
              {evalResult.collision?.type === 'backboard' && (
                <li>{t.bballBackboardImpact} <code>h = {evalResult.collision.y.toFixed(2)} m</code> ({t.bballBackboardBox.replace('{min}', level.hoopHeight.toFixed(2)).replace('{max}', (level.hoopHeight + 0.47).toFixed(2))}).</li>
              )}
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
