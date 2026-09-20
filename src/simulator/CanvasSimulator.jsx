import { useEffect, useRef } from 'react';
import { drawScene } from './projectileRenderer.js';
import StatusBadge from './StatusBadge.jsx';

export default function CanvasSimulator({ mission, values, status = 'idle', result, targetDistance }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawScene(ctx, {
      width,
      height,
      mission,
      launchValues: values,
      targetDistance,
      landingDistance: result?.landingDistance,
    });
    return undefined;
  }, [mission, values, status, result, targetDistance]);

  const statusMessage =
    status === 'running' && !result
      ? 'Simulando trayectoria...'
      : result?.message;

  return (
    <section className="card simulator-card" aria-label="Simulador de Movimiento Parabólico">
      <div className="simulator-head">
        <h2>Simulador</h2>
        <StatusBadge status={status} message={statusMessage} />
      </div>
      <p className="simulator-status">
        {mission ? `Concepto: ${mission.exercise.topic}` : 'Sin misión cargada'}
      </p>
      <div className={`simulator-canvas-wrap status-${status}`}>
        <canvas ref={canvasRef} className="simulator-canvas" />
      </div>
      {/* TODO (motor del simulador 2D): animación del dron con requestAnimationFrame
          siguiendo la trayectoria calculada y dibujo de la trayectoria con
          drawTrajectory + toCanvasPoints. */}
    </section>
  );
}
