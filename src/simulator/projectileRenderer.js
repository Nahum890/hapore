import { toCanvasPoint, toCanvasPoints } from './trajectory.js';

const C = { forest: '#17483b', grass: '#7fbb79', field: '#c7d89c', earth: '#b9875b', orange: '#d66836', blue: '#318eaa', ink: '#203b39', box: '#c78a4a' };

function roundedRect(ctx, x, y, width, height, radius, color) {
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.roundRect(x, y, width, height, radius); ctx.fill();
}
function cloud(ctx, x, y, size) {
  ctx.fillStyle = 'rgba(255,255,255,.83)';
  for (const [dx, dy, r] of [[0, 0, .25], [.22, -.1, .32], [.49, .02, .23]]) {
    ctx.beginPath(); ctx.arc(x + dx * size, y + dy * size, r * size, 0, Math.PI * 2); ctx.fill();
  }
}
function tree(ctx, x, groundY, size) {
  roundedRect(ctx, x - size * .07, groundY - size * .55, size * .14, size * .55, 2, '#806145');
  ctx.fillStyle = '#5e9d70';
  for (const [dx, dy, radius] of [[0, -.9, .35], [-.25, -.65, .27], [.24, -.66, .28]]) {
    ctx.beginPath(); ctx.arc(x + dx * size, groundY + dy * size, radius * size, 0, Math.PI * 2); ctx.fill();
  }
}
function barn(ctx, x, groundY, size) {
  roundedRect(ctx, x, groundY - size * .68, size, size * .68, 3, '#bf6c56');
  ctx.fillStyle = '#894b43';
  ctx.beginPath(); ctx.moveTo(x - size * .08, groundY - size * .68); ctx.lineTo(x + size * .5, groundY - size * 1.05); ctx.lineTo(x + size * 1.08, groundY - size * .68); ctx.closePath(); ctx.fill();
  roundedRect(ctx, x + size * .37, groundY - size * .4, size * .26, size * .4, 2, '#f0d0a9');
  ctx.strokeStyle = '#894b43'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x + size * .37, groundY - size * .4); ctx.lineTo(x + size * .63, groundY); ctx.moveTo(x + size * .63, groundY - size * .4); ctx.lineTo(x + size * .37, groundY); ctx.stroke();
}
function farmBackdrop(ctx, width, height, groundY) {
  const sky = ctx.createLinearGradient(0, 0, 0, groundY);
  sky.addColorStop(0, '#d6eef4'); sky.addColorStop(1, '#f8f3dc');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#f8d98a'; ctx.beginPath(); ctx.arc(width * .79, height * .2, Math.max(13, width * .035), 0, Math.PI * 2); ctx.fill();
  cloud(ctx, width * .12, height * .22, Math.max(26, width * .09));
  cloud(ctx, width * .57, height * .11, Math.max(23, width * .065));
  ctx.fillStyle = '#a9cfb6'; ctx.beginPath(); ctx.moveTo(0, groundY - 24); ctx.quadraticCurveTo(width * .2, groundY - 70, width * .47, groundY - 28); ctx.quadraticCurveTo(width * .75, groundY - 75, width, groundY - 30); ctx.lineTo(width, groundY); ctx.lineTo(0, groundY); ctx.fill();
  ctx.fillStyle = C.field; ctx.fillRect(0, groundY - 15, width, height - groundY + 15);
  ctx.strokeStyle = 'rgba(91,138,75,.33)'; ctx.lineWidth = 1;
  for (let row = 0; row < 4; row += 1) {
    ctx.beginPath(); ctx.moveTo(0, groundY - 7 + row * 11); ctx.quadraticCurveTo(width / 2, groundY + 5 + row * 12, width, groundY - 7 + row * 11); ctx.stroke();
  }
  tree(ctx, width * .12, groundY - 8, Math.min(36, width * .075));
  tree(ctx, width * .66, groundY - 8, Math.min(29, width * .06));
  barn(ctx, width - Math.min(95, width * .2), groundY - 8, Math.min(53, width * .13));
  ctx.fillStyle = C.earth; ctx.fillRect(0, groundY, width, height - groundY);
  ctx.fillStyle = C.grass; ctx.fillRect(0, groundY - 5, width, 7);
  ctx.strokeStyle = 'rgba(96,76,54,.5)'; ctx.lineWidth = 2;
  for (let x = 12; x < width; x += 32) { ctx.beginPath(); ctx.moveTo(x, groundY - 30); ctx.lineTo(x, groundY - 6); ctx.stroke(); }
  for (const y of [groundY - 23, groundY - 13]) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke(); }
}
function crate(ctx, x, y, size) {
  roundedRect(ctx, x, y, size, size, 2, C.box);
  ctx.strokeStyle = '#8b633f'; ctx.lineWidth = 1.5; ctx.strokeRect(x + 1, y + 1, size - 2, size - 2);
  ctx.beginPath(); ctx.moveTo(x + 2, y + 2); ctx.lineTo(x + size - 2, y + size - 2); ctx.moveTo(x + size - 2, y + 2); ctx.lineTo(x + 2, y + size - 2); ctx.stroke();
}
function target(ctx, x, groundY, hit) {
  ctx.fillStyle = hit ? '#4a9d65' : C.blue;
  ctx.beginPath(); ctx.ellipse(x, groundY - 3, 19, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'white'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, groundY - 3, 12, 4, 0, 0, Math.PI * 2); ctx.stroke();
  crate(ctx, x + 22, groundY - 19, 16); crate(ctx, x + 35, groundY - 18, 15); crate(ctx, x + 28, groundY - 35, 16);
  ctx.fillStyle = C.ink; ctx.font = '700 10px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('ENTREGA', x, groundY - 47);
}
function drone(ctx, x, y, size, rotorPhase, flying, carrying) {
  ctx.save(); ctx.translate(x, y);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-size * .8, 0); ctx.lineTo(size * .8, 0); ctx.stroke();
  for (const side of [-1, 1]) {
    roundedRect(ctx, side * size * .75 - size * .11, -size * .15, size * .22, size * .23, 3, C.ink);
    ctx.strokeStyle = '#516b6a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(side * size * .78, -size * .26, size * (flying ? .44 + .08 * Math.sin(rotorPhase) : .36), size * .07, 0, 0, Math.PI * 2); ctx.stroke();
  }
  roundedRect(ctx, -size * .37, -size * .15, size * .74, size * .35, size * .13, '#f8faf9');
  roundedRect(ctx, -size * .12, -size * .2, size * .36, size * .2, 3, C.blue);
  ctx.fillStyle = '#263e46'; ctx.beginPath(); ctx.arc(size * .16, size * .05, size * .08, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = flying ? '#ef7b45' : '#8fd5af';
  for (const side of [-1, 1]) { ctx.beginPath(); ctx.arc(side * size * .75, size * .13, size * .055, 0, Math.PI * 2); ctx.fill(); }
  ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-size * .19, size * .2); ctx.lineTo(-size * .25, size * .43); ctx.lineTo(size * .25, size * .43); ctx.lineTo(size * .19, size * .2); ctx.stroke();
  if (carrying) {
    ctx.strokeStyle = '#6a5d4a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, size * .43); ctx.lineTo(0, size * .63); ctx.stroke();
    crate(ctx, -size * .16, size * .58, size * .32);
  }
  ctx.restore();
}
function trajectory(ctx, points, count, preview) {
  if (points.length < 2) return;
  ctx.strokeStyle = preview ? 'rgba(214,104,54,.55)' : C.orange;
  ctx.lineWidth = preview ? 2 : 3; ctx.setLineDash(preview ? [5, 6] : []);
  ctx.beginPath();
  points.slice(0, Math.max(2, count)).forEach((point, index) => index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y));
  ctx.stroke(); ctx.setLineDash([]);
}
export function drawScene(ctx, { width, height, flight, progress = 0, phase = 'idle', now = 0 }) {
  if (!(width > 0 && height > 0) || !flight) return;
  const groundY = height - Math.max(34, height * .13);
  farmBackdrop(ctx, width, height, groundY);
  const originX = Math.max(34, width * .07);
  const worldWidth = Math.max(flight.targetX, flight.landingX, 20) * 1.13;
  const scale = Math.min((width - originX - 35) / worldWidth, (groundY - 55) / Math.max(flight.peakY, 7));
  const options = { scale, originX, groundY };
  const points = toCanvasPoints(flight.points, options);
  const targetPoint = toCanvasPoint({ x: flight.targetX, y: 0 }, options);
  const current = toCanvasPoint(flight.positionAt(phase === 'idle' ? 0 : progress), options);
  target(ctx, targetPoint.x, groundY, phase === 'landed' && flight.hit);
  if (phase !== 'idle') trajectory(ctx, points, Math.round(progress * (points.length - 1)) + 1, false);
  ctx.fillStyle = 'rgba(30,65,54,.2)'; ctx.beginPath(); ctx.ellipse(current.x, groundY - 3, 14, 4, 0, 0, Math.PI * 2); ctx.fill();
  drone(ctx, current.x, Math.min(current.y - 29, groundY - 30), Math.max(20, Math.min(26, width * .05)), now * .045, phase === 'flying', phase !== 'landed');
  if (phase === 'landed') crate(ctx, current.x - 8, groundY - 18, 16);
  ctx.fillStyle = C.ink; ctx.font = '700 10px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.fillText('INICIO', Math.max(8, originX - 18), groundY - 70);
  ctx.fillStyle = 'rgba(255,255,255,.91)'; ctx.fillRect(8, 8, Math.min(172, width - 16), 24);
  ctx.fillStyle = C.forest; ctx.font = '700 11px system-ui, sans-serif'; ctx.fillText('Vuelo ideal · sin motor', 16, 24);
}
