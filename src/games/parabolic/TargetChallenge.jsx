import React, { useEffect, useRef, useState } from 'react';
import {
  GAMES_I18N,
  TARGET_LEVELS,
  evaluateTargetShot,
} from './parabolicGamesEngine.js';
import { drawRoundedRect } from '../../simulator/projectileRenderer.js';

export default function TargetChallenge({ langKey = 'gn-jopara', onProgress }) {
  const t = GAMES_I18N[langKey] || GAMES_I18N.es;

  const [levelIndex, setLevelIndex] = useState(0);
  const currentLevel = TARGET_LEVELS[levelIndex];

  // Exact typed speed input box (NO SLIDERS)
  const [speedInput, setSpeedInput] = useState('');
  const [lastShot, setLastShot] = useState(null);
  const [animProgress, setAnimProgress] = useState(0);
  const [isFiring, setIsFiring] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showHelp, setShowHelp] = useState(false);

  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);

  // When level changes, reset state
  useEffect(() => {
    setSpeedInput('');
    setLastShot(null);
    setAnimProgress(0);
    setIsFiring(false);
    setErrorMsg('');
    setShowHelp(false);
  }, [levelIndex, currentLevel]);

  // Animation effect
  useEffect(() => {
    if (!isFiring || !lastShot) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      setAnimProgress(1);
      setIsFiring(false);
      return;
    }

    let startTime = null;
    const durationMs = Math.min(3500, Math.max(1500, lastShot.duration * 750));

    const step = (timestamp) => {
      if (startTime === null) startTime = timestamp;
      const progress = Math.min(1, (timestamp - startTime) / durationMs);
      setAnimProgress(progress);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(step);
      } else {
        setIsFiring(false);
      }
    };

    animFrameRef.current = requestAnimationFrame(step);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isFiring, lastShot]);

  // Canvas drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let heightPx = 0;

    const render = () => {
      if (width <= 0 || heightPx <= 0) return;
      ctx.clearRect(0, 0, width, heightPx);

      const groundY = heightPx - Math.max(34, heightPx * 0.14);
      const originX = Math.max(36, width * 0.08);

      const maxWorldX = Math.max(
        currentLevel.distance * 1.25,
        lastShot ? lastShot.landingX * 1.15 : 0,
        35,
      );
      const maxWorldY = Math.max(
        lastShot ? lastShot.peakY * 1.35 : 0,
        15,
      );

      const scale = Math.min(
        (width - originX - 40) / maxWorldX,
        (groundY - 35) / maxWorldY,
      );

      const toPx = (x, y) => ({
        x: originX + x * scale,
        y: groundY - y * scale,
      });

      // Sky
      ctx.fillStyle = '#f7faf8';
      ctx.fillRect(0, 0, width, groundY);

      // Earth & Grass
      ctx.fillStyle = '#8f6843';
      ctx.fillRect(0, groundY, width, heightPx - groundY);
      ctx.fillStyle = '#4e9b67';
      ctx.fillRect(0, groundY - 4, width, 6);

      // Target Zone on Ground
      const targetCenterPx = toPx(currentLevel.distance, 0);
      const targetRadiusPx = currentLevel.tolerance * scale;

      // Target ellipse
      ctx.fillStyle = 'rgba(214, 104, 54, 0.25)';
      ctx.beginPath();
      ctx.ellipse(targetCenterPx.x, groundY - 1, Math.max(6, targetRadiusPx), 5, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#d66836';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Flag pole
      ctx.strokeStyle = '#17483b';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(targetCenterPx.x, groundY);
      ctx.lineTo(targetCenterPx.x, groundY - 32);
      ctx.stroke();

      // Flag banner
      ctx.fillStyle = '#d66836';
      ctx.beginPath();
      ctx.moveTo(targetCenterPx.x, groundY - 32);
      ctx.lineTo(targetCenterPx.x + 18, groundY - 24);
      ctx.lineTo(targetCenterPx.x, groundY - 16);
      ctx.closePath();
      ctx.fill();

      // Target distance label
      ctx.fillStyle = '#17483b';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`Blanco: ${currentLevel.distance.toFixed(1)} m`, targetCenterPx.x, groundY + 18);

      // Cannon
      const launchBase = toPx(0, 0);
      ctx.save();
      ctx.translate(launchBase.x, launchBase.y - 2);
      ctx.rotate(-((currentLevel.angleDeg * Math.PI) / 180));
      ctx.fillStyle = '#17483b';
      drawRoundedRect(ctx, 0, -5, 22, 10, 3);
      ctx.fill();
      ctx.restore();

      ctx.fillStyle = '#203b39';
      ctx.beginPath();
      ctx.arc(launchBase.x, launchBase.y - 2, 7, 0, Math.PI * 2);
      ctx.fill();

      // Shot trajectory
      if (lastShot && lastShot.points.length > 1) {
        const pointCount = Math.max(2, Math.round(animProgress * (lastShot.points.length - 1)) + 1);
        const visiblePoints = lastShot.points.slice(0, pointCount);

        ctx.strokeStyle = lastShot.result === 'perfect' ? '#2e8b57' : '#d66836';
        ctx.lineWidth = 3;
        ctx.beginPath();
        visiblePoints.forEach((pt, idx) => {
          const px = toPx(pt.x, pt.y);
          if (idx === 0) ctx.moveTo(px.x, px.y);
          else ctx.lineTo(px.x, px.y);
        });
        ctx.stroke();

        // Projectile ball at current progress
        const currentT = animProgress * lastShot.duration;
        const currentPos = lastShot.sampleAt(currentT);
        const ballPx = toPx(currentPos.x, currentPos.y);

        ctx.fillStyle = '#d66836';
        ctx.beginPath();
        ctx.arc(ballPx.x, ballPx.y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // If finished, draw landing marker
        if (animProgress >= 1) {
          const landingPx = toPx(lastShot.landingX, 0);
          ctx.fillStyle = lastShot.result === 'perfect' ? '#2e8b57' : '#ba3d32';
          ctx.beginPath();
          ctx.arc(landingPx.x, groundY - 2, 6, 0, Math.PI * 2);
          ctx.fill();

          ctx.font = 'bold 11px system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(`${lastShot.landingX.toFixed(2)} m`, landingPx.x, groundY - 12);
        }
      }
    };

    const resize = () => {
      width = canvas.clientWidth;
      heightPx = canvas.clientHeight;
      if (!width || !heightPx) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(heightPx * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      render();
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    return () => {
      observer.disconnect();
    };
  }, [currentLevel, lastShot, animProgress]);

  const handleFire = (e) => {
    e?.preventDefault();
    setErrorMsg('');

    if (!speedInput.trim()) {
      setErrorMsg(t.targetInvalid);
      return;
    }

    const shot = evaluateTargetShot({
      speed: speedInput,
      angleDeg: currentLevel.angleDeg,
      targetDistance: currentLevel.distance,
      tolerance: currentLevel.tolerance,
      gravity: currentLevel.gravity,
    });

    if (shot.result === 'invalid') {
      setErrorMsg(t.targetInvalid);
      return;
    }

    setLastShot(shot);
    setAnimProgress(0);
    setIsFiring(true);

    onProgress?.({
      id: 'target-challenge',
      result: shot.result,
      score: shot.score,
    });
  };

  const handleNextLevel = () => {
    setLevelIndex((prev) => (prev + 1) % TARGET_LEVELS.length);
  };

  return (
    <div className="pgame-challenge">
      {/* Exam-Style Problem Statement Card */}
      <div className="pgame-problem-card">
        <div className="pgame-problem-header">
          <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#17483b' }}>
            {t.targetTitle} #{levelIndex + 1}
          </h3>
          <span className="pgame-problem-badge">Precisión Académica</span>
        </div>

        <p style={{ margin: 0, fontSize: '0.875rem', color: '#38564b' }}>
          {t.targetSubtitle}
        </p>

        <div className="pgame-data-grid">
          <div className="pgame-data-item">
            <span className="pgame-data-label">{t.targetGoalLabel}</span>
            <span className="pgame-data-val">{currentLevel.distance.toFixed(2)} m</span>
          </div>
          <div className="pgame-data-item">
            <span className="pgame-data-label">{t.targetAngleLabel}</span>
            <span className="pgame-data-val">{currentLevel.angleDeg}°</span>
          </div>
          <div className="pgame-data-item">
            <span className="pgame-data-label">{t.targetGravityLabel}</span>
            <span className="pgame-data-val">{currentLevel.gravity} m/s²</span>
          </div>
        </div>

        {/* Precise Input Box Form (NO SLIDERS) */}
        <form onSubmit={handleFire} className="pgame-input-row">
          <label htmlFor="pgame-speed-exact" style={{ fontWeight: 600, color: '#17483b' }}>
            {t.targetInputLabel}
          </label>
          <input
            id="pgame-speed-exact"
            type="text"
            inputMode="decimal"
            className="pgame-text-input"
            placeholder={t.targetInputPlaceholder}
            value={speedInput}
            disabled={isFiring}
            onChange={(e) => setSpeedInput(e.target.value)}
          />
          <span className="pgame-unit-tag">m/s</span>

          <button
            type="submit"
            className="pgame-btn pgame-btn-accent"
            disabled={isFiring}
          >
            {t.targetFireBtn}
          </button>

          {lastShot && lastShot.result === 'perfect' && (
            <button
              type="button"
              className="pgame-btn pgame-btn-primary"
              onClick={handleNextLevel}
            >
              {t.targetNextBtn}
            </button>
          )}

          <button
            type="button"
            className="pgame-btn pgame-btn-secondary"
            onClick={() => setShowHelp((prev) => !prev)}
          >
            {t.targetCalcHelpBtn}
          </button>
        </form>

        {errorMsg && (
          <p style={{ margin: '0.25rem 0 0 0', color: '#b93c30', fontSize: '0.875rem', fontWeight: 600 }}>
            {errorMsg}
          </p>
        )}

        {showHelp && (
          <div className="pgame-explanation" style={{ marginTop: '0.5rem' }}>
            <p><strong>{t.targetFormulaHelp}</strong></p>
            <p>
              Para este ejercicio: <code>R = {currentLevel.distance} m</code>, <code>θ = {currentLevel.angleDeg}°</code>, <code>g = {currentLevel.gravity} m/s²</code>:
            </p>
            <p>
              <code>v₀ = √( ({currentLevel.distance} · {currentLevel.gravity}) / sin({currentLevel.angleDeg * 2}°) ) = {currentLevel.exactSpeed} m/s</code>
            </p>
          </div>
        )}
      </div>

      {/* Visual Canvas */}
      <div className="pgame-canvas-wrapper">
        <canvas
          ref={canvasRef}
          className="pgame-canvas"
          role="img"
          aria-label={`${t.targetTitle}: Blanco a ${currentLevel.distance} metros.`}
        >
          {t.targetTitle}
        </canvas>
      </div>

      {/* Strict Feedback Banner */}
      {lastShot && animProgress >= 1 && (
        <div
          className={`pgame-feedback is-${lastShot.result === 'perfect' ? 'perfect' : 'miss'}`}
          role="status"
          aria-live="polite"
        >
          <strong>
            {lastShot.result === 'perfect'
              ? t.targetHitExact
                  .replace('{speed}', lastShot.speed)
                  .replace('{landing}', lastShot.landingX.toFixed(2))
                  .replace('{target}', currentLevel.distance.toFixed(2))
              : t.targetMissFar
                  .replace('{speed}', lastShot.speed)
                  .replace('{landing}', lastShot.landingX.toFixed(2))
                  .replace('{diff}', lastShot.diff.toFixed(2))
                  .replace('{target}', currentLevel.distance.toFixed(2))}
          </strong>
          <span>
            {t.scoreLabel}: {lastShot.score}/100 — Distancia lograda:{' '}
            {lastShot.landingX.toFixed(2)} m (Meta exacta: {currentLevel.distance.toFixed(2)} m)
          </span>
        </div>
      )}
    </div>
  );
}
