import React, { useEffect, useRef, useState } from 'react';
import {
  COMPLEMENTARY_LEVELS,
  GAMES_I18N,
  evaluateComplementaryChallenge,
} from './parabolicGamesEngine.js';

export default function ComplementaryChallenge({
  langKey = 'gn-jopara',
  onProgress,
}) {
  const t = GAMES_I18N[langKey] || GAMES_I18N.es;

  const [levelIndex, setLevelIndex] = useState(0);
  const currentLevel = COMPLEMENTARY_LEVELS[levelIndex];

  // Exact typed angle input box
  const [angleInput, setAngleInput] = useState('');
  const [evaluation, setEvaluation] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const canvasRef = useRef(null);

  // When level changes, reset input and evaluation
  useEffect(() => {
    setAngleInput('');
    setEvaluation(null);
    setErrorMsg('');
  }, [levelIndex, currentLevel]);

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

      // Evaluate preview or final
      const stateToDraw =
        evaluation ||
        evaluateComplementaryChallenge({
          baseAngle: currentLevel.baseAngle,
          proposedAngle: currentLevel.baseAngle,
          speed: currentLevel.speed,
          gravity: currentLevel.gravity,
        });

      const maxWorldX =
        Math.max(
          stateToDraw.rangeBase,
          evaluation ? stateToDraw.rangeUser : 0,
          35,
        ) * 1.25;
      const maxWorldY =
        Math.max(
          stateToDraw.peakBase,
          evaluation ? stateToDraw.peakUser : 0,
          15,
        ) * 1.35;

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

      // Target Ground Marker for exact required range
      const targetBasePx = toPx(currentLevel.range, 0);
      ctx.strokeStyle = '#17483b';
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(targetBasePx.x, groundY);
      ctx.lineTo(targetBasePx.x, groundY - 30);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#17483b';
      ctx.font = 'bold 10px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`Meta: ${currentLevel.range} m`, targetBasePx.x, groundY + 16);

      // Draw Base Trajectory (Cyan/Teal)
      if (stateToDraw.pointsBase.length > 1) {
        ctx.strokeStyle = '#318eaa';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        stateToDraw.pointsBase.forEach((pt, idx) => {
          const px = toPx(pt.x, pt.y);
          if (idx === 0) ctx.moveTo(px.x, px.y);
          else ctx.lineTo(px.x, px.y);
        });
        ctx.stroke();

        // Base peak label
        const basePeakPx = toPx(
          stateToDraw.rangeBase / 2,
          stateToDraw.peakBase,
        );
        ctx.fillStyle = '#1c5e72';
        ctx.font = '10px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(
          `θ₁ = ${currentLevel.baseAngle}° (H₁ = ${stateToDraw.peakBase.toFixed(1)}m)`,
          basePeakPx.x,
          basePeakPx.y - 6,
        );
      }

      // Draw Proposed User Trajectory (Orange) if evaluated
      if (evaluation && stateToDraw.pointsUser.length > 1) {
        ctx.strokeStyle = stateToDraw.isComplementary ? '#2e8b57' : '#d66836';
        ctx.lineWidth = 3;
        ctx.beginPath();
        stateToDraw.pointsUser.forEach((pt, idx) => {
          const px = toPx(pt.x, pt.y);
          if (idx === 0) ctx.moveTo(px.x, px.y);
          else ctx.lineTo(px.x, px.y);
        });
        ctx.stroke();

        // Proposed peak label
        const userPeakPx = toPx(
          stateToDraw.rangeUser / 2,
          stateToDraw.peakUser,
        );
        ctx.fillStyle = stateToDraw.isComplementary ? '#1a6639' : '#b34716';
        ctx.font = '10px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(
          `θ₂ = ${stateToDraw.proposedAngle}° (H₂ = ${stateToDraw.peakUser.toFixed(1)}m)`,
          userPeakPx.x,
          userPeakPx.y - 6,
        );

        // User landing marker
        const userLandingPx = toPx(stateToDraw.rangeUser, 0);
        ctx.fillStyle = stateToDraw.isComplementary ? '#2e8b57' : '#ba3d32';
        ctx.beginPath();
        ctx.arc(userLandingPx.x, groundY - 2, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = 'bold 11px system-ui, sans-serif';
        ctx.fillText(
          `${stateToDraw.rangeUser.toFixed(2)} m`,
          userLandingPx.x,
          groundY - 14,
        );
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
  }, [currentLevel, evaluation]);

  const handleTestFormula = (e) => {
    e?.preventDefault();
    setErrorMsg('');

    if (!angleInput.trim()) {
      setErrorMsg(t.compInvalidNumber);
      return;
    }

    const result = evaluateComplementaryChallenge({
      baseAngle: currentLevel.baseAngle,
      proposedAngle: angleInput,
      speed: currentLevel.speed,
      gravity: currentLevel.gravity,
    });

    if (result.result === 'invalid') {
      setErrorMsg(t.compInvalidNumber);
      return;
    }

    setEvaluation(result);

    onProgress?.({
      id: 'complementary-challenge',
      result: result.result,
      score: result.score,
    });
  };

  const handleNextLevel = () => {
    setLevelIndex((prev) => (prev + 1) % COMPLEMENTARY_LEVELS.length);
  };

  const questionText = t.compQuestion.replace('{range}', currentLevel.range);

  return (
    <div className="pgame-challenge">
      {/* Exam-Style Problem Statement Card */}
      <div className="pgame-problem-card">
        <div className="pgame-problem-header">
          <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#17483b' }}>
            {t.compProblemTitle} #{levelIndex + 1}
          </h3>
          <span className="pgame-problem-badge">Precisión Académica</span>
        </div>

        <div className="pgame-data-grid">
          <div className="pgame-data-item">
            <span className="pgame-data-label">{t.compSpeed}</span>
            <span className="pgame-data-val">{currentLevel.speed} m/s</span>
          </div>
          <div className="pgame-data-item">
            <span className="pgame-data-label">{t.compBaseAngle}</span>
            <span className="pgame-data-val">{currentLevel.baseAngle}°</span>
          </div>
          <div className="pgame-data-item">
            <span className="pgame-data-label">{t.compGravity}</span>
            <span className="pgame-data-val">{currentLevel.gravity} m/s²</span>
          </div>
          <div className="pgame-data-item">
            <span className="pgame-data-label">{t.compRangeObtained}</span>
            <span className="pgame-data-val">{currentLevel.range} m</span>
          </div>
        </div>

        <div className="pgame-question-box">
          {questionText}
        </div>

        {/* Precise Input Box Form */}
        <form onSubmit={handleTestFormula} className="pgame-input-row">
          <label htmlFor="pgame-angle-exact" style={{ fontWeight: 600, color: '#17483b' }}>
            {t.compInputLabel}
          </label>
          <input
            id="pgame-angle-exact"
            type="text"
            inputMode="decimal"
            className="pgame-text-input"
            placeholder={t.compInputPlaceholder}
            value={angleInput}
            onChange={(e) => setAngleInput(e.target.value)}
          />
          <span className="pgame-unit-tag">°</span>

          <button
            type="submit"
            className="pgame-btn pgame-btn-accent"
          >
            {t.compTestBtn}
          </button>

          {evaluation && evaluation.isComplementary && (
            <button
              type="button"
              className="pgame-btn pgame-btn-primary"
              onClick={handleNextLevel}
            >
              {t.nextLevelBtn}
            </button>
          )}
        </form>

        {errorMsg && (
          <p style={{ margin: '0.25rem 0 0 0', color: '#b93c30', fontSize: '0.875rem', fontWeight: 600 }}>
            {errorMsg}
          </p>
        )}
      </div>

      {/* Visual Simulation Canvas */}
      <div className="pgame-canvas-wrapper">
        <canvas
          ref={canvasRef}
          className="pgame-canvas"
          role="img"
          aria-label={`${t.compTitle}: Disparo inicial a ${currentLevel.baseAngle} grados con alcance de ${currentLevel.range} metros.`}
        >
          {t.compTitle}
        </canvas>
      </div>

      {/* Result Feedback Banner */}
      {evaluation && (
        <div
          className={`pgame-feedback is-${evaluation.result === 'perfect' ? 'perfect' : 'miss'}`}
          role="status"
          aria-live="polite"
        >
          <strong>
            {evaluation.isComplementary
              ? t.compSuccess
                  .replace('{angle}', evaluation.proposedAngle)
                  .replace('{range}', evaluation.rangeBase.toFixed(2))
              : evaluation.isSameAngle
              ? t.compSameAngle.replace('{baseAngle}', currentLevel.baseAngle)
              : t.compFail
                  .replace('{angle}', evaluation.proposedAngle)
                  .replace('{userRange}', evaluation.rangeUser.toFixed(2))
                  .replace('{diff}', evaluation.diff.toFixed(2))
                  .replace('{baseRange}', evaluation.rangeBase.toFixed(2))}
          </strong>
          <span>
            {t.scoreLabel}: {evaluation.score}/100 — {t.compGoal}
          </span>
        </div>
      )}

      {/* Analytical Table Comparison (when evaluated) */}
      {evaluation && evaluation.result !== 'invalid' && (
        <div className="pgame-table-wrapper">
          <table className="pgame-table">
            <thead>
              <tr>
                <th>{t.compTableCol1}</th>
                <th>{t.compTableCol2.replace('{baseAngle}', currentLevel.baseAngle)}</th>
                <th>{t.compTableCol3.replace('{userAngle}', evaluation.proposedAngle)}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>{t.compTableRange}</strong></td>
                <td>{evaluation.rangeBase.toFixed(2)} m</td>
                <td style={{ color: evaluation.isComplementary ? '#1a6639' : '#ba3d32', fontWeight: 700 }}>
                  {evaluation.rangeUser.toFixed(2)} m {evaluation.isComplementary ? '✓' : `(Δ = ${evaluation.diff.toFixed(2)} m)`}
                </td>
              </tr>
              <tr>
                <td><strong>{t.compTableHeight}</strong></td>
                <td>{evaluation.peakBase.toFixed(2)} m</td>
                <td>{evaluation.peakUser.toFixed(2)} m</td>
              </tr>
              <tr>
                <td><strong>{t.compTableDuration}</strong></td>
                <td>{evaluation.durationBase.toFixed(2)} s</td>
                <td>{evaluation.durationUser.toFixed(2)} s</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Step-by-Step Mathematical Explanation */}
      <div className="pgame-explanation">
        <h4>{t.compProofTitle}</h4>
        <p><strong>1. {t.compProof1}</strong> <code>R = (v₀² · sin(2θ)) / g</code></p>
        <p><strong>2. {t.compProof2}</strong> <code>θ₂ = 90° - θ₁ = 90° - {currentLevel.baseAngle}° = {currentLevel.expectedAngle}°</code></p>
        <p><strong>3. {t.compProof3}</strong></p>
      </div>
    </div>
  );
}
