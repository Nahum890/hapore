import { computeScale, toCanvasPoint, toCanvasPoints } from './trajectory.js';

export const PALETTE = {
  verdeMonte: '#1B4D3E',
  tierraColorada: '#C04A26',
  azulItaipu: '#0284C7',
  ambarSuave: '#D97706',
  fondo: '#F8F9FA',
  grisCarbon: '#1F2937',
  cielo: '#EAF2EF',
  suelo: '#D8E4DC',
};

export function drawSky(ctx, { width, height }) {
  ctx.fillStyle = PALETTE.cielo;
  ctx.fillRect(0, 0, width, height);
}

export function drawGround(ctx, { width, groundY }) {
  ctx.fillStyle = PALETTE.suelo;
  ctx.fillRect(0, groundY, width, 20);
  ctx.strokeStyle = PALETTE.verdeMonte;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, groundY);
  ctx.lineTo(width, groundY);
  ctx.stroke();
}

export function drawHorizontalAxis(ctx, { width, groundY, scale }) {
  ctx.strokeStyle = PALETTE.grisCarbon;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(16, groundY);
  ctx.lineTo(width - 16, groundY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = PALETTE.grisCarbon;
  ctx.font = '10px system-ui, sans-serif';
  ctx.fillText('x (m) — escala: ' + scale.toFixed(1) + ' px/m', 16, groundY + 14);
}

export function drawTarget(ctx, { x, y }) {
  ctx.fillStyle = PALETTE.azulItaipu;
  ctx.beginPath();
  ctx.arc(x, y, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = PALETTE.fondo;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, 9, 0, Math.PI * 2);
  ctx.stroke();
}

export function drawLanding(ctx, { x, y }) {
  ctx.strokeStyle = PALETTE.tierraColorada;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(x - 6, y - 6);
  ctx.lineTo(x + 6, y + 6);
  ctx.moveTo(x + 6, y - 6);
  ctx.lineTo(x - 6, y + 6);
  ctx.stroke();
}

export function drawProjectile(ctx, { x, y }) {
  ctx.fillStyle = PALETTE.tierraColorada;
  ctx.beginPath();
  ctx.arc(x, y, 7, 0, Math.PI * 2);
  ctx.fill();
}

export function drawTrajectory(ctx, points) {
  if (!points || points.length < 2) return;
  ctx.strokeStyle = PALETTE.ambarSuave;
  ctx.lineWidth = 2;
  ctx.beginPath();
  points.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.stroke();
}

function toNumber(value) {
  if (typeof value === 'number') return value;
  return Number(String(value).trim().replace(',', '.'));
}

export function drawScene(ctx, { width, height, mission, launchValues, targetDistance, landingDistance }) {
  const groundY = height - 32;
  drawSky(ctx, { width, height });
  drawGround(ctx, { width, groundY });

  const v0Raw = launchValues?.v0 ?? mission?.exercise?.values?.v0 ?? 20;
  const v0 = toNumber(v0Raw);
  const target = Number.isFinite(toNumber(targetDistance)) ? toNumber(targetDistance) : null;
  const worldWidth = Math.max(
    10,
    Math.max((Number.isFinite(v0) ? v0 : 20) * 2.2, (target ?? 0) * 1.15),
  );
  const scale = computeScale(worldWidth, 25, width, height, 24);
  const originX = 24;

  drawHorizontalAxis(ctx, { width, groundY, scale });

  // Objetivo en su posición física (o placeholder si aún no hay distancia).
  drawTarget(ctx, { x: target !== null ? originX + target * scale : width - 48, y: groundY });

  // Dron placeholder en el punto de lanzamiento.
  drawProjectile(ctx, { x: originX, y: groundY - 7 });

  // Punto de caída calculado (consecuencia visual del resultado).
  const landing = Number.isFinite(toNumber(landingDistance)) ? toNumber(landingDistance) : null;
  if (landing !== null) {
    drawLanding(ctx, { x: originX + landing * scale, y: groundY });
  }

  // TODO: calcular el launch con physics/projectileMotion.createLaunch(v0, ángulo)
  //   y mapear evaluateTrajectory(...) con toCanvasPoints(...) para dibujar
  //   la trayectoria real con drawTrajectory(ctx, canvasPoints).
  // TODO: animación del dron con requestAnimationFrame siguiendo la trayectoria.
}
