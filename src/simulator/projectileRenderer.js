import { toCanvasPoint, toCanvasPoints } from './trajectory.js';

// Tres escenarios, un solo motor físico: solo cambia el dibujo (canvas 2D),
// nunca el cálculo de la trayectoria (viene siempre de flightPlan.js).
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
function skyBackdrop(ctx, width, height, groundY, top, bottom) {
  const sky = ctx.createLinearGradient(0, 0, 0, groundY);
  sky.addColorStop(0, top); sky.addColorStop(1, bottom);
  ctx.fillStyle = sky; ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#f8d98a'; ctx.beginPath(); ctx.arc(width * .82, height * .18, Math.max(12, width * .032), 0, Math.PI * 2); ctx.fill();
  cloud(ctx, width * .14, height * .2, Math.max(24, width * .08));
  cloud(ctx, width * .55, height * .1, Math.max(20, width * .06));
}
function trajectory(ctx, points, count, color, preview) {
  if (points.length < 2) return;
  ctx.strokeStyle = preview ? 'rgba(214,104,54,.55)' : color;
  ctx.lineWidth = preview ? 2 : 3; ctx.setLineDash(preview ? [5, 6] : []);
  ctx.beginPath();
  points.slice(0, Math.max(2, count)).forEach((point, index) => index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y));
  ctx.stroke(); ctx.setLineDash([]);
}
function label(ctx, x, y, text, color = C.forest) {
  ctx.fillStyle = 'rgba(255,255,255,.91)';
  const width = ctx.measureText(text).width + 16;
  ctx.fillRect(x, y - 16, width, 22);
  ctx.fillStyle = color; ctx.font = '700 11px system-ui, sans-serif'; ctx.textAlign = 'left';
  ctx.fillText(text, x + 8, y);
}

/* ---------- Escenario "dron": entrega rural ---------- */
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
function crate(ctx, x, y, size) {
  roundedRect(ctx, x, y, size, size, 2, C.box);
  ctx.strokeStyle = '#8b633f'; ctx.lineWidth = 1.5; ctx.strokeRect(x + 1, y + 1, size - 2, size - 2);
  ctx.beginPath(); ctx.moveTo(x + 2, y + 2); ctx.lineTo(x + size - 2, y + size - 2); ctx.moveTo(x + size - 2, y + 2); ctx.lineTo(x + 2, y + size - 2); ctx.stroke();
}
function farmBackdrop(ctx, width, height, groundY) {
  skyBackdrop(ctx, width, height, groundY, '#d6eef4', '#f8f3dc');
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
function deliveryTarget(ctx, x, groundY, hit) {
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
function drawDrone(ctx, { width, height, flight, progress, phase, now, verdict }) {
  const groundY = height - Math.max(34, height * .13);
  farmBackdrop(ctx, width, height, groundY);
  const originX = Math.max(34, width * .07);
  const worldWidth = Math.max(flight.targetX, flight.landingX, 20) * 1.13;
  const scale = Math.min((width - originX - 35) / worldWidth, (groundY - 55) / Math.max(flight.peakY, 7));
  const options = { scale, originX, groundY };
  const points = toCanvasPoints(flight.points, options);
  const targetPoint = toCanvasPoint({ x: flight.targetX, y: 0 }, options);
  const current = toCanvasPoint(flight.positionAt(phase === 'idle' ? 0 : progress), options);
  // El color de la zona refleja si la respuesta escrita fue correcta, no si
  // el dibujo geométrico "cayó cerca": ambas cosas pueden diferir cuando la
  // trayectoria mostrada no depende del número que escribió el estudiante.
  deliveryTarget(ctx, targetPoint.x, groundY, phase === 'landed' && verdict === true);
  if (phase !== 'idle') trajectory(ctx, points, Math.round(progress * (points.length - 1)) + 1, C.orange, false);
  ctx.fillStyle = 'rgba(30,65,54,.2)'; ctx.beginPath(); ctx.ellipse(current.x, groundY - 3, 14, 4, 0, 0, Math.PI * 2); ctx.fill();
  drone(ctx, current.x, Math.min(current.y - 29, groundY - 30), Math.max(20, Math.min(26, width * .05)), now * .045, phase === 'flying', phase !== 'landed');
  if (phase === 'landed') crate(ctx, current.x - 8, groundY - 18, 16);
  label(ctx, Math.max(8, originX - 18), groundY - 70, 'INICIO', C.ink);
  label(ctx, 8, 24, 'Vuelo ideal · sin motor', C.forest);
}

/* ---------- Escenario "básquetbol": tiro a la canasta ---------- */
function court(ctx, width, height, groundY) {
  skyBackdrop(ctx, width, height, groundY, '#fbe6c8', '#f7ede0');
  ctx.fillStyle = '#e3a35c'; ctx.fillRect(0, groundY - 6, width, height - groundY + 6);
  ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(0, groundY + 14); ctx.lineTo(width, groundY + 14); ctx.stroke();
  for (let x = 10; x < width; x += 40) { ctx.beginPath(); ctx.moveTo(x, groundY + 6); ctx.lineTo(x, groundY + 24); ctx.stroke(); }
  ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(0, groundY - 6, width, 3);
}
function hoopTarget(ctx, x, groundY, hit) {
  // Aro pintado en el piso: la pelota debe caer dentro del círculo de tiro.
  ctx.save();
  ctx.strokeStyle = hit ? '#4a9d65' : '#c0392b'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.ellipse(x, groundY - 2, 22, 8, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = hit ? 'rgba(74,157,101,.28)' : 'rgba(192,57,43,.22)';
  ctx.beginPath(); ctx.ellipse(x, groundY - 2, 22, 8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.fillStyle = C.ink; ctx.font = '700 10px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('ZONA DE TIRO', x, groundY - 22);
}
function basketballPlayer(ctx, x, groundY, size, hasBall) {
  ctx.save(); ctx.translate(x, groundY);
  ctx.fillStyle = '#2d4a63';
  roundedRect(ctx, -size * .18, -size * .95, size * .36, size * .55, size * .14, '#2d4a63');
  ctx.fillStyle = '#e8b48c'; ctx.beginPath(); ctx.arc(0, -size * 1.05, size * .16, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#1b2a41'; ctx.lineWidth = size * .1; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-size * .16, -size * .4); ctx.lineTo(-size * .3, 0); ctx.moveTo(size * .16, -size * .4); ctx.lineTo(size * .32, 0); ctx.stroke();
  if (hasBall) {
    ctx.fillStyle = '#d66836'; ctx.beginPath(); ctx.arc(size * .34, -size * .55, size * .12, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#1b2a41'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(size * .24, -size * .55); ctx.lineTo(size * .44, -size * .55); ctx.moveTo(size * .34, -size * .65); ctx.lineTo(size * .34, -size * .45); ctx.stroke();
  }
  ctx.restore();
}
function ball(ctx, x, y, radius, spin) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(spin);
  ctx.fillStyle = '#d66836'; ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#1b2a41'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-radius, 0); ctx.lineTo(radius, 0); ctx.moveTo(0, -radius); ctx.lineTo(0, radius); ctx.stroke();
  ctx.restore();
}
function drawBasketball(ctx, { width, height, flight, progress, phase, now, verdict }) {
  const groundY = height - Math.max(30, height * .12);
  court(ctx, width, height, groundY);
  const originX = Math.max(30, width * .08);
  const worldWidth = Math.max(flight.targetX, flight.landingX, 12) * 1.2;
  const scale = Math.min((width - originX - 30) / worldWidth, (groundY - 45) / Math.max(flight.peakY, 4));
  const options = { scale, originX, groundY };
  const points = toCanvasPoints(flight.points, options);
  const targetPoint = toCanvasPoint({ x: flight.targetX, y: 0 }, options);
  const current = toCanvasPoint(flight.positionAt(phase === 'idle' ? 0 : progress), options);
  hoopTarget(ctx, targetPoint.x, groundY, phase === 'landed' && verdict === true);
  if (phase !== 'idle') trajectory(ctx, points, Math.round(progress * (points.length - 1)) + 1, '#d66836', false);
  basketballPlayer(ctx, originX - 6, groundY, Math.max(26, Math.min(34, width * .07)), phase === 'idle');
  if (phase !== 'idle') {
    ctx.fillStyle = 'rgba(30,65,54,.18)'; ctx.beginPath(); ctx.ellipse(current.x, groundY - 3, 10, 3, 0, 0, Math.PI * 2); ctx.fill();
    ball(ctx, current.x, current.y - 8, Math.max(7, Math.min(10, width * .022)), now * .01);
  }
  label(ctx, Math.max(8, originX - 20), groundY - 60, 'LANZAMIENTO', C.ink);
  label(ctx, 8, 24, 'Tiro parabólico · sin resistencia del aire', '#a4501f');
}

/* ---------- Escenario "pared": pasar la pelota por encima del muro ---------- */
function yard(ctx, width, height, groundY) {
  skyBackdrop(ctx, width, height, groundY, '#dcecf7', '#f2f6e9');
  ctx.fillStyle = '#8fc48a'; ctx.fillRect(0, groundY - 4, width, height - groundY + 4);
  ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 1;
  for (let x = 6; x < width; x += 18) { ctx.beginPath(); ctx.moveTo(x, groundY); ctx.lineTo(x + 6, groundY + 10); ctx.stroke(); }
}
function wall(ctx, x, groundY, scale, obstacleHeight, cleared) {
  const wallHeightPx = Math.max(26, obstacleHeight * scale);
  ctx.fillStyle = cleared === false ? '#c0392b' : '#9a8b74';
  roundedRect(ctx, x - 7, groundY - wallHeightPx, 14, wallHeightPx, 3, cleared === false ? '#c0392b' : '#9a8b74');
  ctx.strokeStyle = '#6b5d47'; ctx.lineWidth = 1;
  for (let row = 0; row < wallHeightPx; row += 8) { ctx.beginPath(); ctx.moveTo(x - 7, groundY - row); ctx.lineTo(x + 7, groundY - row); ctx.stroke(); }
  ctx.fillStyle = C.ink; ctx.font = '700 10px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('PAREDÓN', x, groundY - wallHeightPx - 8);
}
function landingSpot(ctx, x, groundY, hit) {
  ctx.fillStyle = hit ? '#4a9d65' : C.blue;
  ctx.beginPath(); ctx.ellipse(x, groundY - 2, 16, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'white'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, groundY - 2, 9, 3, 0, 0, Math.PI * 2); ctx.stroke();
}
function kid(ctx, x, groundY, size, throwing) {
  ctx.save(); ctx.translate(x, groundY);
  roundedRect(ctx, -size * .16, -size * .8, size * .32, size * .48, size * .12, '#2f7d5e');
  ctx.fillStyle = '#e8b48c'; ctx.beginPath(); ctx.arc(0, -size * .9, size * .14, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#1b2a41'; ctx.lineWidth = size * .09; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-size * .14, -size * .34); ctx.lineTo(-size * .26, 0); ctx.moveTo(size * .14, -size * .34); ctx.lineTo(size * .26, 0); ctx.stroke();
  ctx.beginPath();
  if (throwing) { ctx.moveTo(size * .12, -size * .55); ctx.lineTo(size * .4, -size * .8); }
  else { ctx.moveTo(size * .12, -size * .5); ctx.lineTo(size * .3, -size * .32); }
  ctx.stroke();
  ctx.restore();
}
function drawWall(ctx, { width, height, flight, progress, phase, now, verdict }) {
  const groundY = height - Math.max(30, height * .12);
  yard(ctx, width, height, groundY);
  const originX = Math.max(30, width * .08);
  const worldWidth = Math.max(flight.targetX, flight.landingX, 14) * 1.15;
  const scale = Math.min((width - originX - 30) / worldWidth, (groundY - 50) / Math.max(flight.peakY, 5));
  const options = { scale, originX, groundY };
  const points = toCanvasPoints(flight.points, options);
  const targetPoint = toCanvasPoint({ x: flight.targetX, y: 0 }, options);
  const current = toCanvasPoint(flight.positionAt(phase === 'idle' ? 0 : progress), options);
  const obstacle = flight.obstacle ?? { x: flight.targetX * 0.45, height: Math.max(2, flight.peakY * 0.4) };
  const obstacleX = originX + obstacle.x * scale;
  landingSpot(ctx, targetPoint.x, groundY, phase === 'landed' && verdict === true);
  wall(ctx, obstacleX, groundY, scale, obstacle.height, phase === 'landed' ? flight.clearsObstacle : null);
  if (phase !== 'idle') trajectory(ctx, points, Math.round(progress * (points.length - 1)) + 1, '#2f7d5e', false);
  kid(ctx, originX - 6, groundY, Math.max(28, Math.min(36, width * .075)), phase === 'flying' && progress < 0.15);
  if (phase !== 'idle') {
    ctx.fillStyle = 'rgba(30,65,54,.18)'; ctx.beginPath(); ctx.ellipse(current.x, groundY - 3, 9, 3, 0, 0, Math.PI * 2); ctx.fill();
    ball(ctx, current.x, current.y - 7, Math.max(6, Math.min(9, width * .02)), now * .01);
  }
  label(ctx, Math.max(8, originX - 20), groundY - 64, 'LANZAMIENTO', C.ink);
  label(ctx, 8, 24, flight.clearsObstacle === false && phase === 'landed' ? 'No superó el paredón' : 'Vuelo ideal · sin motor', '#256a4a');
}

export function drawScene(ctx, { width, height, flight, progress = 0, phase = 'idle', now = 0, scenario = 'dron', verdict = null }) {
  if (!(width > 0 && height > 0) || !flight) return;
  const args = { width, height, flight, progress, phase, now, verdict };
  if (scenario === 'basketball') return drawBasketball(ctx, args);
  if (scenario === 'wall') return drawWall(ctx, args);
  return drawDrone(ctx, args);
}
