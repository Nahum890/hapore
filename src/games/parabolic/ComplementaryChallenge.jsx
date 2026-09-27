import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  COMPLEMENTARY_LEVELS,
  evaluateComplementaryChallenge,
  GAMES_I18N,
} from './parabolicGamesEngine.js';
import { toCanvasPoints, toCanvasPoint } from '../../simulator/trajectory.js';
import { planFlight } from '../../simulator/flightPlan.js';

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

  const basePoints = useMemo(() => {
    return planFlight({
      speed: level.speed,
      angle: level.baseAngle,
      gravity: level.gravity,
      targetX: level.range,
      targetY: 0,
      y0: 0,
    }).points;
  }, [level]);

  const handleAngleChange = (e) => {
    setAngleInput(e.target.value);
    if (phase !== 'idle') {
      setPhase('idle');
      setEvalResult(null);
      progressRef.current = 0;
    }
  };

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

      // Solo dibujo: la escala, las curvas y la evaluación son las mismas de siempre.
      const pill = (x, y, text, bg, color = '#fff', align = 'center') => {
        ctx.font = '700 11px system-ui, sans-serif';
        const w = ctx.measureText(text).width + 14;
        const left = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
        ctx.fillStyle = bg;
        ctx.beginPath(); ctx.roundRect(left, y - 14, w, 20, 10); ctx.fill();
        ctx.fillStyle = color; ctx.textAlign = 'left';
        ctx.fillText(text, left + 7, y);
      };
      const peakOf = (pts) => pts.reduce((best, p) => (p.y < best.y ? p : best), pts[0]);

      // Fondo: cielo de laboratorio con grilla en metros
      const sky = ctx.createLinearGradient(0, 0, 0, groundY);
      sky.addColorStop(0, '#e0f2fe');
      sky.addColorStop(1, '#f8fafc');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, width, height);

      const step = [1, 2, 5, 10, 20, 25, 50].find((s) => s * scale >= 42) || 100;
      ctx.lineWidth = 1;
      ctx.font = '600 10px system-ui, sans-serif';
      for (let m = 0; originX + m * scale < width; m += step) {
        const x = originX + m * scale;
        ctx.strokeStyle = m === 0 ? 'rgba(15, 23, 42, 0.35)' : 'rgba(14, 116, 144, 0.12)';
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, groundY); ctx.stroke();
      }
      for (let m = step; groundY - m * scale > 0; m += step) {
        const y = groundY - m * scale;
        ctx.strokeStyle = 'rgba(14, 116, 144, 0.12)';
        ctx.beginPath(); ctx.moveTo(originX, y); ctx.lineTo(width, y); ctx.stroke();
        ctx.fillStyle = '#64748b'; ctx.textAlign = 'right';
        ctx.fillText(`${m} m`, originX - 6, y + 3);
      }

      // Suelo con césped y regla de distancias
      const grass = ctx.createLinearGradient(0, groundY, 0, height);
      grass.addColorStop(0, '#22c55e');
      grass.addColorStop(1, '#15803d');
      ctx.fillStyle = grass;
      ctx.fillRect(0, groundY, width, height - groundY);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.fillRect(0, groundY, width, 2);
      ctx.fillStyle = '#f0fdf4'; ctx.textAlign = 'center';
      for (let m = 0; originX + m * scale < width - 10; m += step) {
        const x = originX + m * scale;
        ctx.fillRect(x - 0.5, groundY + 2, 1, 5);
        ctx.fillText(`${m}`, x, groundY + 18);
      }

      // Meta: banderín en el alcance obtenido
      const targetPt = toCanvasPoint({ x: level.range, y: 0 }, options);
      ctx.strokeStyle = '#334155'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(targetPt.x, groundY); ctx.lineTo(targetPt.x, groundY - 34); ctx.stroke();
      ctx.fillStyle = '#dc2626';
      ctx.beginPath(); ctx.moveTo(targetPt.x, groundY - 34); ctx.lineTo(targetPt.x + 18, groundY - 28); ctx.lineTo(targetPt.x, groundY - 22); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(220, 38, 38, 0.18)';
      ctx.beginPath(); ctx.ellipse(targetPt.x, groundY + 1, 16, 4, 0, 0, Math.PI * 2); ctx.fill();
      // A la derecha del banderín: las curvas llegan desde la izquierda.
      pill(targetPt.x + 22, groundY - 24, `R = ${level.range} m`, '#dc2626', '#fff', 'left');

      // Curva 1 (Ángulo inicial de referencia)
      const pointsBase = evalResult?.pointsBase || basePoints;
      if (pointsBase?.length > 1) {
        const pts1 = toCanvasPoints(pointsBase, options);
        ctx.save();
        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.shadowColor = 'rgba(37, 99, 235, 0.35)';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        pts1.forEach((p, idx) => (idx === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
        ctx.stroke();
        ctx.restore();
        const top = peakOf(pts1);
        pill(top.x, top.y - 10, `θ₁ = ${level.baseAngle}°`, '#2563eb');
      }

      // Cañón en el origen, apuntando al ángulo de referencia (o al del alumno al lanzar)
      const aimDeg = phase !== 'idle' && evalResult?.proposedAngle ? Number(evalResult.proposedAngle) : level.baseAngle;
      const aim = (aimDeg * Math.PI) / 180;
      ctx.save();
      ctx.translate(originX, groundY - 6);
      ctx.fillStyle = 'rgba(37, 99, 235, 0.12)';
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 30, -aim, 0); ctx.closePath(); ctx.fill();
      ctx.rotate(-aim);
      ctx.fillStyle = '#334155';
      ctx.beginPath(); ctx.roundRect(-4, -5, 30, 10, 4); ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#1e293b';
      ctx.beginPath(); ctx.arc(originX, groundY - 4, 9, Math.PI, 0); ctx.fill();

      // Curva 2 (Ángulo propuesto por el usuario al lanzar)
      if (phase !== 'idle' && evalResult?.pointsUser?.length > 1) {
        const pts2 = toCanvasPoints(evalResult.pointsUser, options);
        const count = Math.max(2, Math.round(progressRef.current * pts2.length));
        const color = evalResult.isComplementary ? '#16a34a' : '#d97706';
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.setLineDash(evalResult.isComplementary ? [] : [6, 5]);
        ctx.beginPath();
        pts2.slice(0, count).forEach((p, idx) => (idx === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
        ctx.stroke();
        ctx.restore();
        // Pelota recorriendo la curva
        const head = pts2[Math.min(count, pts2.length) - 1];
        ctx.fillStyle = 'rgba(15, 23, 42, 0.18)';
        ctx.beginPath(); ctx.ellipse(head.x, groundY + 1, 7, 2.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(head.x, head.y, 6.5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.stroke();
        if (progressRef.current >= 1) {
          const top = peakOf(pts2);
          pill(top.x, top.y - 10, `θ₂ = ${evalResult.proposedAngle}°`, color);
        }
      }

      // Leyenda
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.beginPath(); ctx.roundRect(width - 168, 10, 158, phase !== 'idle' ? 46 : 28, 8); ctx.fill();
      ctx.font = '600 11px system-ui, sans-serif'; ctx.textAlign = 'left';
      ctx.fillStyle = '#2563eb'; ctx.fillRect(width - 158, 22, 16, 3);
      ctx.fillStyle = '#334155'; ctx.fillText('Referencia (θ₁)', width - 136, 27);
      if (phase !== 'idle') {
        ctx.fillStyle = evalResult?.isComplementary ? '#16a34a' : '#d97706'; ctx.fillRect(width - 158, 40, 16, 3);
        ctx.fillStyle = '#334155'; ctx.fillText('Tu ángulo (θ₂)', width - 136, 45);
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

  const numInputAngle = Number(String(angleInput).replace(',', '.'));
  const canTest = phase !== 'flying' && angleInput.trim().length > 0 && !isNaN(numInputAngle) && numInputAngle > 0 && numInputAngle < 90;

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
          aria-label={langKey === 'es' ? 'Comparación de trayectorias complementarias' : 'Trayectoria complementaria ñembojoja'}
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
              value={angleInput}
              onChange={handleAngleChange}
              disabled={phase === 'flying'}
              className="pgame-number-input"
            />
            <span className="pgame-input-unit">°</span>
          </div>
        </div>

        <div className="pgame-actions">
          <button
            type="submit"
            className="btn btn-primary pgame-btn-fire"
            disabled={!canTest}
          >
            {t.compTestBtn}
          </button>
          {evalResult && (
            <button
              type="button"
              className="btn btn-secondary pgame-btn-next"
              onClick={handleNext}
            >
              {t.compNextBtn}
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
            <p><strong>{t.compProofTitle}</strong></p>
            <code>sin(2·θ₂) = sin(2·(90° - {level.baseAngle}°)) = sin(180° - {level.baseAngle * 2}°) = sin({level.baseAngle * 2}°)</code>
            <p>{t.compProofConclusion} <code>R = {level.range} m</code>.</p>
          </div>
        </div>
      )}
    </div>
  );
}
