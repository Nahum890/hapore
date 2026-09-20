import { useEffect, useRef } from 'react';
import { drawScene } from './projectileRenderer.js';

export default function CanvasSimulator({ mission }) {
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
    drawScene(ctx, { width, height, mission });
    return undefined;
  }, [mission]);

  return (
    <section className="card simulator-card" aria-label="Simulador de Movimiento Parabólico">
      <h2>Simulador</h2>
      <p className="simulator-status">
        {mission ? `Vista previa: ${mission.exercise.topic}` : 'Sin misión cargada'}
      </p>
      <canvas ref={canvasRef} className="simulator-canvas" />
      {/* TODO: controles de lanzamiento (v0, ángulo) y botón "Lanzar". */}
      {/* TODO: animación del dron con requestAnimationFrame. */}
      {/* TODO: dibujar la trayectoria real calculada con physics/projectileMotion. */}
      {/* TODO: comparar el punto de caída con el objetivo y mostrar la consecuencia visual del error. */}
    </section>
  );
}
