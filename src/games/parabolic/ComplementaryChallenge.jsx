import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  COMPLEMENTARY_LEVELS,
  evaluateComplementaryChallenge,
  GAMES_I18N,
} from './parabolicGamesEngine.js';
import { toCanvasPoints, toCanvasPoint } from '../../simulator/trajectory.js';

export default function ComplementaryChallenge({ langKey = 'gn-jopara', onProgress }) {
  const t = GAMES_I18N[langKey] || GAMES_I18N.es;
  const [levelIndex, setLevelIndex] = useState(0);
  const level = COMPLEMENTARY_LEVELS[levelIndex];

  const [angleInput, setAngleInput] = useState('');
  const [phase, setPhase] = useState('idle');
  const [evalResult, setEvalResult] = useState(null);

  const canvasRef = useRef(null);
  const progressRef = useRef(0);

  useEffect(() => {
    setAngleInput('');
    setPhase('idle');
    setEvalResult(null);
    progressRef.current = 0;
  }, [levelIndex, level]);

  // Manejo del dibujo comparativo de ambas parábolas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let frameId = 0;
    let startedAt = null;

    const draw = () => {
      if (!width || !height) return;
      ctx.clearRect(0, 0, width, height);

      const groundY = height - 35;
      const originX = 40;
      const maxR = Math.max(level.range * 1.25, 40);
      const scale = Math.min((width - originX - 30) / maxR, (groundY - 30) / (level.speed * level.speed / (2 * level.gravity) + 2));
      const options = { scale, originX, groundY };

      // Fondo
      const sky = ctx.createLinearGradient(0, 0, 0, groundY);
      sky.addColorStop(0, '#f0fdf4');
      sky.addColorStop(1, '#dcfce7');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, width, height);

      // Suelo
      ctx.fillStyle = '#15803d';
      ctx.fillRect(0, groundY, width, height - groundY);

      // Meta (alcance base)
      const targetPt = toCanvasPoint({ x: level.range, y: 0 }, options);
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(targetPt.x, groundY, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1e293b';
      ctx.font = '700 10px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`Meta: ${level.range} m`, targetPt.x, groundY + 16);

      // Curva 1 (Ángulo inicial)
      if (evalResult?.pointsBase?.length > 1) {
        const pts1 = toCanvasPoints(evalResult.pointsBase, options);
        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = 3;
        ctx.beginPath();
        pts1.forEach((p, idx) => (idx === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
        ctx.stroke();
      }

      // Curva 2 (Ángulo propuesto por el usuario)
      if (evalResult?.pointsUser?.length > 1) {
        const pts2 = toCanvasPoints(evalResult.pointsUser, options);
        const count = Math.max(2, Math.round(progressRef.current * pts2.length));
        ctx.strokeStyle = evalResult.isComplementary ? '#16a34a' : '#d97706';
        ctx.lineWidth = 3;
        ctx.setLineDash(evalResult.isComplementary ? [] : [4, 4]);
        ctx.beginPath();
        pts2.slice(0, count).forEach((p, idx) => (idx === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
        ctx.stroke();
        ctx.setLineDash([]);
      }
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
      const durationMs = 2000;
      const tick = (now) => {
        if (startedAt === null) startedAt = now;
        progressRef.current = Math.min(1, (now - startedAt) / durationMs);
        draw();
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
  }, [evalResult, phase, level]);

  const handleTest = (e) => {
    e?.preventDefault();
    const evaluation = evaluateComplementaryChallenge({
      baseAngle: level.baseAngle,
      proposedAngle: angleInput,
      speed: level.speed,
      gravity: level.gravity,
    });
    setEvalResult(evaluation);
    progressRef.current = 0;
    setPhase('flying');

    if (evaluation.score > 0) {
      onProgress?.({
        id: `comp-${level.id}`,
        score: evaluation.score,
        result: evaluation.result,
      });
    }
  };

  const handleNext = () => {
    setLevelIndex((prev) => (prev + 1) % COMPLEMENTARY_LEVELS.length);
  };

  return (
    <div className="pgame-challenge-card" aria-label={t.compTitle}>
      <div className="pgame-badge-row">
        <span className="pgame-level-badge">Reto {levelIndex + 1} de {COMPLEMENTARY_LEVELS.length}</span>
        <span className="pgame-fifa-spec">Simetría: θ₁ + θ₂ = 90°</span>
      </div>

      <h3 className="pgame-challenge-title">{t.compTitle}</h3>

      <div className="pgame-data-chips">
        <span className="pgame-chip">
          <small>{t.compSpeed}</small>
          <strong>{level.speed} m/s</strong>
        </span>
        <span className="pgame-chip">
          <small>{t.compBaseAngle}</small>
          <strong>{level.baseAngle}°</strong>
        </span>
        <span className="pgame-chip">
          <small>{t.compRangeObtained}</small>
          <strong>{level.range} m</strong>
        </span>
      </div>

      <p className="pgame-question-highlight">
        {t.compQuestion.replace('{range}', level.range)}
      </p>

      <div className="pgame-canvas-wrapper">
        <canvas
          ref={canvasRef}
          className="pgame-canvas"
          role="img"
          aria-label="Comparación de trayectorias complementarias"
        />
      </div>

      <form className="pgame-controls-form" onSubmit={handleTest}>
        <div className="pgame-input-group">
          <label htmlFor="comp-angle">{t.compInputLabel}</label>
          <div className="pgame-input-with-slider">
            <input
              id="comp-angle"
              type="text"
              inputMode="decimal"
              placeholder={t.compInputPlaceholder}
              value={angleInput}
              onChange={(e) => setAngleInput(e.target.value)}
              className="pgame-number-input"
            />
            <span className="pgame-input-unit">°</span>
          </div>
        </div>

        <div className="pgame-actions">
          <button
            type="submit"
            className="btn btn-primary pgame-btn-fire"
            disabled={!angleInput.trim() || phase === 'flying'}
          >
            {t.compTestBtn}
          </button>
          {evalResult && (
            <button
              type="button"
              className="btn btn-secondary pgame-btn-next"
              onClick={handleNext}
            >
              Siguiente reto
            </button>
          )}
        </div>
      </form>

      {phase === 'result' && evalResult && (
        <div className={`pgame-feedback ${evalResult.isComplementary ? 'is-success' : 'is-fail'}`} role="status">
          <strong>
            {evalResult.isComplementary && t.compSuccess
              .replace('{angle}', evalResult.proposedAngle)
              .replace('{range}', level.range)}
            {evalResult.isSameAngle && t.compSameAngle.replace('{baseAngle}', level.baseAngle)}
            {!evalResult.isComplementary && !evalResult.isSameAngle && t.compFail
              .replace('{angle}', evalResult.proposedAngle)
              .replace('{userRange}', evalResult.rangeUser)}
          </strong>

          <div className="pgame-calc-breakdown">
            <p><strong>Demostración trigonométrica:</strong></p>
            <code>sin(2·θ₂) = sin(2·(90° - {level.baseAngle}°)) = sin(180° - {level.baseAngle * 2}°) = sin({level.baseAngle * 2}°)</code>
            <p>Por lo tanto, ambos ángulos logran exactamente el mismo alcance horizontal <code>R = {level.range} m</code>.</p>
          </div>
        </div>
      )}
    </div>
  );
}
