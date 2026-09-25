import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  LAB_I18N,
  LAB_LIMITS,
  PRESET_GRAVITIES,
  calculateLabPhysics,
  compareTrajectories,
} from './projectileLabEngine.js';
import { drawRoundedRect } from './projectileRenderer.js';
import './projectileLab.css';

export default function ProjectileLab({ language = 'gn-jopara' }) {
  const langKey = language === 'es' ? 'es' : 'gn-jopara';
  const t = LAB_I18N[langKey] || LAB_I18N.es;

  const [speed, setSpeed] = useState(20);
  const [angle, setAngle] = useState(45);
  const [height, setHeight] = useState(0);
  const [gravity, setGravity] = useState(9.8);
  const [showVectors, setShowVectors] = useState(true);
  const [showComponents, setShowComponents] = useState(true);

  const [ghostPhysics, setGhostPhysics] = useState(null);
  const [animState, setAnimState] = useState('idle'); // 'idle' | 'running' | 'paused' | 'finished'
  const [simTime, setSimTime] = useState(0);

  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const lastTimestampRef = useRef(null);

  // Compute current physical trajectory
  const physics = useMemo(() => {
    return calculateLabPhysics({
      v0: speed,
      angleDeg: angle,
      y0: height,
      gravity,
    });
  }, [speed, angle, height, gravity]);

  // Comparison with ghost if available
  const comparison = useMemo(() => {
    if (!ghostPhysics) return null;
    return compareTrajectories(physics, ghostPhysics);
  }, [physics, ghostPhysics]);

  // Handle animation loop
  useEffect(() => {
    if (animState !== 'running') {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      lastTimestampRef.current = null;
      return;
    }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      setSimTime(physics.duration);
      setAnimState('finished');
      return;
    }

    const step = (timestamp) => {
      if (lastTimestampRef.current === null) {
        lastTimestampRef.current = timestamp;
      }
      const dt = (timestamp - lastTimestampRef.current) / 1000;
      lastTimestampRef.current = timestamp;

      setSimTime((prevTime) => {
        const nextTime = prevTime + dt;
        if (nextTime >= physics.duration) {
          setAnimState('finished');
          return physics.duration;
        }
        return nextTime;
      });

      animFrameRef.current = requestAnimationFrame(step);
    };

    animFrameRef.current = requestAnimationFrame(step);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [animState, physics.duration]);

  // Reset simTime when parameters change in idle state
  useEffect(() => {
    if (animState === 'idle') {
      setSimTime(0);
    }
  }, [speed, angle, height, gravity, animState]);

  // Draw scene to canvas
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

      const groundY = heightPx - Math.max(36, heightPx * 0.12);
      const originX = Math.max(40, width * 0.08);

      // Coordinate scaling
      const maxDistX = Math.max(
        physics.landingX,
        ghostPhysics ? ghostPhysics.landingX : 0,
        30,
      ) * 1.15;
      const maxHeightY = Math.max(
        physics.peakY,
        ghostPhysics ? ghostPhysics.peakY : 0,
        height,
        10,
      ) * 1.35;

      const scaleX = (width - originX - 40) / maxDistX;
      const scaleY = (groundY - 40) / maxHeightY;
      const scale = Math.min(scaleX, scaleY);

      const toPx = (x, y) => ({
        x: originX + x * scale,
        y: groundY - y * scale,
      });

      // 1. Sky & Ground
      ctx.fillStyle = '#f7faf8';
      ctx.fillRect(0, 0, width, groundY);

      // Ground earth
      ctx.fillStyle = '#8f6843';
      ctx.fillRect(0, groundY, width, heightPx - groundY);
      // Grass strip
      ctx.fillStyle = '#4e9b67';
      ctx.fillRect(0, groundY - 4, width, 6);

      // 2. Grid & Scale ticks (every 5m or 10m depending on scale)
      const tickStep = maxDistX > 60 ? 10 : 5;
      ctx.strokeStyle = '#d6e4dc';
      ctx.lineWidth = 1;
      ctx.fillStyle = '#557269';
      ctx.font = '10px system-ui, sans-serif';
      ctx.textAlign = 'center';

      for (let mx = 0; mx <= maxDistX; mx += tickStep) {
        const p = toPx(mx, 0);
        ctx.beginPath();
        ctx.moveTo(p.x, groundY - 4);
        ctx.lineTo(p.x, groundY + 8);
        ctx.stroke();
        ctx.fillText(`${mx}m`, p.x, groundY + 20);
      }

      for (let my = tickStep; my <= maxHeightY; my += tickStep) {
        const p = toPx(0, my);
        ctx.beginPath();
        ctx.moveTo(originX - 6, p.y);
        ctx.lineTo(originX + 6, p.y);
        ctx.stroke();
        ctx.textAlign = 'right';
        ctx.fillText(`${my}m`, originX - 9, p.y + 3);
      }

      // 3. Ghost Trajectory (if active)
      if (ghostPhysics && ghostPhysics.points.length > 1) {
        ctx.strokeStyle = 'rgba(49, 142, 170, 0.55)';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ghostPhysics.points.forEach((pt, idx) => {
          const pxPt = toPx(pt.x, pt.y);
          if (idx === 0) ctx.moveTo(pxPt.x, pxPt.y);
          else ctx.lineTo(pxPt.x, pxPt.y);
        });
        ctx.stroke();
        ctx.setLineDash([]);

        // Ghost landing marker
        const ghostLanding = toPx(ghostPhysics.landingX, 0);
        ctx.fillStyle = 'rgba(49, 142, 170, 0.7)';
        ctx.beginPath();
        ctx.arc(ghostLanding.x, ghostLanding.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      // 4. Current Trajectory
      const activeDuration = animState === 'idle' ? physics.duration : simTime;
      const pointsToDraw = physics.points.filter((p) => p.t <= activeDuration);

      if (pointsToDraw.length > 0) {
        ctx.strokeStyle = '#d66836';
        ctx.lineWidth = 3;
        ctx.beginPath();
        pointsToDraw.forEach((pt, idx) => {
          const pxPt = toPx(pt.x, pt.y);
          if (idx === 0) ctx.moveTo(pxPt.x, pxPt.y);
          else ctx.lineTo(pxPt.x, pxPt.y);
        });
        ctx.stroke();
      }

      // 5. Peak Marker
      if (physics.peakY > 0 && (animState === 'finished' || animState === 'idle')) {
        const peakPos = toPx(physics.peakX, physics.peakY);
        ctx.strokeStyle = 'rgba(214, 104, 54, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(peakPos.x, peakPos.y);
        ctx.lineTo(peakPos.x, groundY);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#b34716';
        ctx.beginPath();
        ctx.arc(peakPos.x, peakPos.y, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = 'bold 11px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`Hmax = ${physics.peakY.toFixed(1)}m`, peakPos.x, peakPos.y - 8);
      }

      // 6. Launcher Platform / Cannon
      const launchBase = toPx(0, 0);
      const launchMouth = toPx(0, height);

      if (height > 0) {
        // Pedestal/Tower
        ctx.fillStyle = '#4a675e';
        drawRoundedRect(ctx, launchBase.x - 8, launchMouth.y, 16, launchBase.y - launchMouth.y, 2);
        ctx.fill();
      }

      // Cannon barrel
      ctx.save();
      ctx.translate(launchMouth.x, launchMouth.y);
      ctx.rotate(-((angle * Math.PI) / 180));
      ctx.fillStyle = '#17483b';
      drawRoundedRect(ctx, 0, -5, 24, 10, 3);
      ctx.fill();
      ctx.restore();

      // Pivot
      ctx.fillStyle = '#203b39';
      ctx.beginPath();
      ctx.arc(launchMouth.x, launchMouth.y, 7, 0, Math.PI * 2);
      ctx.fill();

      // 7. Projectile Ball & Vectors
      const currentPos = physics.sampleAt(simTime);
      const currentVel = physics.velocityAt(simTime);
      const ballPx = toPx(currentPos.x, currentPos.y);

      // Projectile body
      ctx.fillStyle = '#d66836';
      ctx.beginPath();
      ctx.arc(ballPx.x, ballPx.y, 6.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Vectors visualization
      const vecScale = 1.4; // pixel length per m/s
      if (showVectors) {
        // Total velocity vector (orange)
        const vxPx = currentVel.vx * vecScale;
        const vyPx = -currentVel.vy * vecScale; // canvas y is inverted

        ctx.strokeStyle = '#e65c00';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(ballPx.x, ballPx.y);
        ctx.lineTo(ballPx.x + vxPx, ballPx.y + vyPx);
        ctx.stroke();

        // Arrow head for v
        const headAngle = Math.atan2(vyPx, vxPx);
        ctx.fillStyle = '#e65c00';
        ctx.beginPath();
        ctx.moveTo(ballPx.x + vxPx, ballPx.y + vyPx);
        ctx.lineTo(
          ballPx.x + vxPx - 7 * Math.cos(headAngle - Math.PI / 6),
          ballPx.y + vyPx - 7 * Math.sin(headAngle - Math.PI / 6),
        );
        ctx.lineTo(
          ballPx.x + vxPx - 7 * Math.cos(headAngle + Math.PI / 6),
          ballPx.y + vyPx - 7 * Math.sin(headAngle + Math.PI / 6),
        );
        ctx.fill();

        if (showComponents) {
          // Horizontal component vx (blue)
          ctx.strokeStyle = '#318eaa';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(ballPx.x, ballPx.y);
          ctx.lineTo(ballPx.x + vxPx, ballPx.y);
          ctx.stroke();

          // Arrow head vx
          ctx.fillStyle = '#318eaa';
          ctx.beginPath();
          ctx.moveTo(ballPx.x + vxPx, ballPx.y);
          ctx.lineTo(ballPx.x + vxPx - (vxPx > 0 ? 6 : -6), ballPx.y - 4);
          ctx.lineTo(ballPx.x + vxPx - (vxPx > 0 ? 6 : -6), ballPx.y + 4);
          ctx.fill();

          // Vertical component vy (green)
          if (Math.abs(currentVel.vy) > 0.1) {
            ctx.strokeStyle = '#2e8b57';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(ballPx.x, ballPx.y);
            ctx.lineTo(ballPx.x, ballPx.y + vyPx);
            ctx.stroke();

            // Arrow head vy
            ctx.fillStyle = '#2e8b57';
            ctx.beginPath();
            ctx.moveTo(ballPx.x, ballPx.y + vyPx);
            ctx.lineTo(ballPx.x - 4, ballPx.y + vyPx - (vyPx > 0 ? 6 : -6));
            ctx.lineTo(ballPx.x + 4, ballPx.y + vyPx - (vyPx > 0 ? 6 : -6));
            ctx.fill();
          }
        }
      }

      // Landing point label if finished
      if (animState === 'finished' || animState === 'idle') {
        const landingPx = toPx(physics.landingX, 0);
        ctx.fillStyle = '#17483b';
        ctx.font = 'bold 11px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`R = ${physics.landingX.toFixed(1)}m`, landingPx.x, groundY - 10);
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
  }, [
    physics,
    ghostPhysics,
    animState,
    simTime,
    showVectors,
    showComponents,
    angle,
    height,
  ]);

  const handleLaunch = () => {
    setSimTime(0);
    setAnimState('running');
  };

  const handlePauseResume = () => {
    if (animState === 'running') setAnimState('paused');
    else if (animState === 'paused') setAnimState('running');
  };

  const handleReset = () => {
    setSimTime(0);
    setAnimState('idle');
  };

  const handleSaveGhost = () => {
    setGhostPhysics(physics);
  };

  const handleClearGhost = () => {
    setGhostPhysics(null);
  };

  const currentInstantVel = physics.velocityAt(simTime);
  const currentInstantPos = physics.sampleAt(simTime);

  return (
    <section className="plab-container" aria-label={t.title}>
      <header className="plab-header">
        <div className="plab-title-row">
          <h2 className="plab-title">{t.title}</h2>
          <span className="plab-badge">{t.assumptionsBadge}</span>
        </div>
        <p className="plab-subtitle">{t.subtitle}</p>
      </header>

      {/* Interactive Canvas */}
      <div className="plab-canvas-wrapper">
        <canvas
          ref={canvasRef}
          className="plab-canvas"
          role="img"
          aria-label={`${t.title}. Alcance: ${physics.landingX.toFixed(1)} metros, Altura máxima: ${physics.peakY.toFixed(1)} metros.`}
        >
          {t.title}
        </canvas>

        <div className="plab-canvas-overlay" aria-hidden="true">
          <div className="plab-legend-item">
            <span className="plab-dot plab-dot-current"></span>
            <span>{t.currentLegend} ({angle}°)</span>
          </div>
          {ghostPhysics && (
            <div className="plab-legend-item">
              <span className="plab-dot plab-dot-ghost"></span>
              <span>{t.ghostLegend} ({ghostPhysics.angleDeg}°)</span>
            </div>
          )}
        </div>
      </div>

      {/* Comparison Feedback */}
      {comparison && (
        <div className="plab-comparison-box" role="status">
          <p>
            {langKey === 'es'
              ? comparison.descriptionEs
              : comparison.descriptionJopara}
          </p>
        </div>
      )}

      {/* Controls Grid */}
      <div className="plab-controls-grid">
        {/* Speed */}
        <div className="plab-control-card">
          <label htmlFor="plab-speed-input" className="plab-control-label">
            <span>{t.speed}</span>
            <span className="plab-val-tag">{speed} m/s</span>
          </label>
          <input
            id="plab-speed-input"
            className="plab-slider"
            type="range"
            min={LAB_LIMITS.minSpeed}
            max={LAB_LIMITS.maxSpeed}
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
          />
        </div>

        {/* Angle */}
        <div className="plab-control-card">
          <label htmlFor="plab-angle-input" className="plab-control-label">
            <span>{t.angle}</span>
            <span className="plab-val-tag">{angle}°</span>
          </label>
          <input
            id="plab-angle-input"
            className="plab-slider"
            type="range"
            min={LAB_LIMITS.minAngle}
            max={LAB_LIMITS.maxAngle}
            value={angle}
            onChange={(e) => setAngle(Number(e.target.value))}
          />
        </div>

        {/* Height */}
        <div className="plab-control-card">
          <label htmlFor="plab-height-input" className="plab-control-label">
            <span>{t.height}</span>
            <span className="plab-val-tag">{height} m</span>
          </label>
          <input
            id="plab-height-input"
            className="plab-slider"
            type="range"
            min={LAB_LIMITS.minHeight}
            max={LAB_LIMITS.maxHeight}
            value={height}
            onChange={(e) => setHeight(Number(e.target.value))}
          />
        </div>

        {/* Gravity */}
        <div className="plab-control-card">
          <label htmlFor="plab-gravity-select" className="plab-control-label">
            <span>{t.gravity}</span>
            <span className="plab-val-tag">{gravity.toFixed(2)} m/s²</span>
          </label>
          <select
            id="plab-gravity-select"
            className="plab-select"
            value={gravity}
            onChange={(e) => setGravity(Number(e.target.value))}
          >
            {PRESET_GRAVITIES.map((preset) => (
              <option key={preset.id} value={preset.value}>
                {langKey === 'es' ? preset.labelEs : preset.labelJopara}
              </option>
            ))}
          </select>
          <div className="plab-toggles">
            <label className="plab-checkbox-label">
              <input
                type="checkbox"
                checked={showVectors}
                onChange={(e) => setShowVectors(e.target.checked)}
              />
              <span>{t.velocityVector}</span>
            </label>
            <label className="plab-checkbox-label">
              <input
                type="checkbox"
                checked={showComponents}
                onChange={(e) => setShowComponents(e.target.checked)}
              />
              <span>{t.components}</span>
            </label>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="plab-actions">
        <button
          type="button"
          className="plab-btn plab-btn-accent"
          onClick={handleLaunch}
          disabled={animState === 'running'}
        >
          {t.launchBtn}
        </button>

        {(animState === 'running' || animState === 'paused') && (
          <button
            type="button"
            className="plab-btn plab-btn-secondary"
            onClick={handlePauseResume}
          >
            {animState === 'running' ? t.pauseBtn : t.resumeBtn}
          </button>
        )}

        <button
          type="button"
          className="plab-btn plab-btn-secondary"
          onClick={handleReset}
        >
          {t.resetBtn}
        </button>

        <button
          type="button"
          className="plab-btn plab-btn-primary"
          onClick={handleSaveGhost}
        >
          {t.saveGhostBtn}
        </button>

        {ghostPhysics && (
          <button
            type="button"
            className="plab-btn plab-btn-secondary"
            onClick={handleClearGhost}
          >
            {t.clearGhostBtn}
          </button>
        )}
      </div>

      {/* Metrics Dashboard */}
      <div className="plab-metrics-panel">
        <h3 className="plab-metrics-title">{t.metricsTitle}</h3>
        <div className="plab-metrics-grid">
          <div className="plab-metric-item">
            <span className="plab-metric-name">{t.maxRange}</span>
            <span className="plab-metric-value">{physics.landingX.toFixed(2)} m</span>
          </div>
          <div className="plab-metric-item">
            <span className="plab-metric-name">{t.maxHeight}</span>
            <span className="plab-metric-value">{physics.peakY.toFixed(2)} m</span>
          </div>
          <div className="plab-metric-item">
            <span className="plab-metric-name">{t.timeFlight}</span>
            <span className="plab-metric-value">{physics.duration.toFixed(2)} s</span>
          </div>
          <div className="plab-metric-item">
            <span className="plab-metric-name">{t.horizontalVel}</span>
            <span className="plab-metric-value">{physics.launch.vx.toFixed(2)} m/s</span>
          </div>
          <div className="plab-metric-item">
            <span className="plab-metric-name">{t.verticalVel}</span>
            <span className="plab-metric-value">{currentInstantVel.vy.toFixed(2)} m/s</span>
          </div>
          <div className="plab-metric-item">
            <span className="plab-metric-name">{t.currentPos}</span>
            <span className="plab-metric-value">
              ({currentInstantPos.x.toFixed(1)}, {currentInstantPos.y.toFixed(1)}) m
            </span>
          </div>
        </div>
      </div>

      {/* Hypotheses Collapsible */}
      <aside className="plab-hypotheses">
        <details>
          <summary>{t.assumptionsTitle}</summary>
          <ul>
            <li>{t.assumption1}</li>
            <li>{t.assumption2}</li>
            <li>{t.assumption3}</li>
            <li>{t.complementaryHint}</li>
          </ul>
        </details>
      </aside>
    </section>
  );
}
