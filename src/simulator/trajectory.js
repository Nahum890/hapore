/**
 * Mapeo de coordenadas físicas (metros) a coordenadas de canvas (píxeles)
 * para el simulador 2D de Movimiento Parabólico.
 */

export function computeScale(worldWidth, worldHeight, canvasWidth, canvasHeight, padding = 24) {
  const usableWidth = Math.max(1, canvasWidth - padding * 2);
  const usableHeight = Math.max(1, canvasHeight - padding * 2);
  return Math.min(usableWidth / worldWidth, usableHeight / worldHeight);
}

export function toCanvasPoint(point, options) {
  const { scale, originX = 0, groundY } = options;
  return {
    x: originX + point.x * scale,
    y: groundY - point.y * scale,
  };
}

export function toCanvasPoints(points, options) {
  return points.map((point) => toCanvasPoint(point, options));
}
