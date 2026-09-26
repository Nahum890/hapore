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

/* ---------- Escenario "básquetbol": tiro a la canasta reglamentaria (3.05 m) ---------- */
function court(ctx, width, height, groundY, environment) {
  // Techo y vigas de gimnasio techado con iluminación deportiva
  const gymCeiling = ctx.createLinearGradient(0, 0, 0, groundY);
  gymCeiling.addColorStop(0, '#1c2833');
  gymCeiling.addColorStop(0.35, '#2c3e50');
  gymCeiling.addColorStop(1, '#ecdcc6');
  ctx.fillStyle = gymCeiling;
  ctx.fillRect(0, 0, width, height);

  // Vigas de acero en el techo
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 2;
  for (let x = 0; x < width; x += 45) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 30, groundY * 0.4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 30, 0); ctx.lineTo(x, groundY * 0.4); ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.fillRect(0, groundY * 0.38, width, 6);

  // Focos de iluminación de cancha con conos de luz suave
  for (const lx of [width * 0.25, width * 0.5, width * 0.75]) {
    ctx.fillStyle = '#f1c40f';
    ctx.beginPath(); ctx.arc(lx, groundY * 0.12, 4, 0, Math.PI * 2); ctx.fill();
    const cone = ctx.createRadialGradient(lx, groundY * 0.12, 2, lx, groundY * 0.45, 80);
    cone.addColorStop(0, 'rgba(255, 245, 200, 0.25)');
    cone.addColorStop(1, 'rgba(255, 245, 200, 0)');
    ctx.fillStyle = cone;
    ctx.beginPath(); ctx.arc(lx, groundY * 0.25, 70, 0, Math.PI * 2); ctx.fill();
  }

  // Piso de parqué de madera barnizada
  const parquet = ctx.createLinearGradient(0, groundY - 6, 0, height);
  parquet.addColorStop(0, '#d6974b');
  parquet.addColorStop(1, '#b8762f');
  ctx.fillStyle = parquet;
  ctx.fillRect(0, groundY - 6, width, height - groundY + 6);

  // Tablones de parqué
  ctx.strokeStyle = 'rgba(100, 50, 10, 0.18)';
  ctx.lineWidth = 1;
  for (let y = groundY + 8; y < height; y += 12) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
  }
  for (let x = 12; x < width; x += 36) {
    ctx.beginPath(); ctx.moveTo(x, groundY); ctx.lineTo(x, height); ctx.stroke();
  }

  // Líneas reglamentarias de básquetbol (blancas)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.lineWidth = 2.5;
  // Línea de banda / fondo
  ctx.beginPath(); ctx.moveTo(0, groundY - 2); ctx.lineTo(width, groundY - 2); ctx.stroke();
  // Zona de tres puntos y tiro libre
  ctx.beginPath(); ctx.moveTo(width * 0.45, groundY - 2); ctx.lineTo(width * 0.45, groundY + 22); ctx.stroke();
  ctx.beginPath(); ctx.arc(width * 0.65, groundY - 2, Math.max(30, width * 0.18), Math.PI, 0, true); ctx.stroke();

  // Brillo del piso
  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.fillRect(0, groundY - 6, width, 4);

  // Placa de condiciones ambientales
  const isIndoor = environment?.isIndoor !== false;
  const windVal = environment?.wind || 0;
  const envText = isIndoor
    ? '🏀 Gimnasio techado · 21°C · Sin viento (vuelo ideal)'
    : `🌬️ Cancha exterior · Viento: ${windVal > 0 ? '+' : ''}${windVal} m/s · ${environment?.temperature ?? 21}°C`;
  ctx.fillStyle = 'rgba(20, 30, 45, 0.82)';
  const tw = ctx.measureText(envText).width + 20;
  roundedRect(ctx, width - tw - 12, 10, tw, 22, 4, 'rgba(20, 30, 45, 0.82)');
  ctx.fillStyle = '#f8fafc';
  ctx.font = '700 10px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(envText, width - 22, 25);
}

function hoopTarget(ctx, x, groundY, scale, hit, hoopHeight = 3.05) {
  // Altura física reglamentaria del aro FIBA / NBA: 3.05 metros
  const rimY = groundY - hoopHeight * scale;
  const rimWidth = Math.max(18, 0.45 * scale); // Diámetro reglamentario del aro: 45 cm (0.45 m)
  const backboardX = x + rimWidth * 0.4;
  const backboardH = Math.max(32, 1.05 * scale); // 1.05 m de alto reglamentario
  const backboardW = Math.max(5, 0.15 * scale);

  ctx.save();

  // 1. Poste de soporte metálico detrás del tablero
  const poleX = backboardX + 10;
  ctx.fillStyle = '#34495e';
  ctx.fillRect(poleX - 4, rimY - 25, 8, groundY - (rimY - 25));
  // Acolchado de seguridad en la base del poste
  roundedRect(ctx, poleX - 7, groundY - 35, 14, 35, 3, '#c0392b');
  // Brazo en ángulo que sostiene el tablero
  ctx.strokeStyle = '#2c3e50';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(poleX, rimY + 10);
  ctx.lineTo(backboardX + 2, rimY);
  ctx.stroke();

  // 2. Tablero reglamentario (1.80 m x 1.05 m)
  ctx.fillStyle = 'rgba(245, 250, 255, 0.9)';
  ctx.strokeStyle = '#c0392b';
  ctx.lineWidth = 2;
  const bbTop = rimY - backboardH * 0.65;
  roundedRect(ctx, backboardX, bbTop, backboardW, backboardH, 2, 'rgba(245, 250, 255, 0.92)');
  ctx.strokeRect(backboardX, bbTop, backboardW, backboardH);
  // Recuadro interior de puntería (59 cm x 45 cm)
  const targetBoxH = Math.max(14, 0.45 * scale);
  ctx.strokeStyle = '#c0392b';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(backboardX, rimY - targetBoxH, backboardW, targetBoxH);

  // 3. Aro reglamentario (naranja metálico, 45 cm de diámetro interior)
  const rimLeft = backboardX - rimWidth;
  ctx.strokeStyle = hit ? '#2ecc71' : '#e65100';
  ctx.lineWidth = Math.max(2.5, 0.05 * scale);
  ctx.beginPath();
  ctx.ellipse(rimLeft + rimWidth / 2, rimY, rimWidth / 2, 4, 0, 0, Math.PI * 2);
  ctx.stroke();

  // 4. Red blanca colgando debajo del aro (40-45 cm)
  const netH = Math.max(16, 0.42 * scale);
  ctx.save();
  ctx.strokeStyle = hit ? '#2ecc71' : 'rgba(255, 255, 255, 0.88)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  // Costados cónicos de la red
  ctx.moveTo(rimLeft, rimY);
  ctx.lineTo(rimLeft + rimWidth * 0.2, rimY + netH);
  ctx.lineTo(rimLeft + rimWidth * 0.8, rimY + netH);
  ctx.lineTo(rimLeft + rimWidth, rimY);
  // Tejido de malla en rombo
  for (let i = 1; i <= 3; i += 1) {
    const frac = i / 4;
    const yN = rimY + netH * frac;
    const wN = rimWidth * (1 - frac * 0.3);
    const xN = rimLeft + (rimWidth - wN) / 2;
    ctx.moveTo(xN, yN);
    ctx.lineTo(xN + wN, yN);
  }
  ctx.stroke();
  ctx.restore();

  // 5. Destellos de enceste si acertó (swish)
  if (hit) {
    ctx.fillStyle = '#2ecc71';
    ctx.font = '700 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('¡CANASTA!', rimLeft + rimWidth / 2, rimY - 14);
  }

  // 6. Proyección y marca en el suelo
  ctx.fillStyle = hit ? 'rgba(46, 204, 113, 0.3)' : 'rgba(230, 81, 0, 0.25)';
  ctx.beginPath();
  ctx.ellipse(x, groundY - 2, 18, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Indicador técnico de altura y diámetro
  ctx.fillStyle = '#2c3e50';
  ctx.font = '700 9px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ARO: 3.05 m · Ø 45 cm', rimLeft + rimWidth / 2, rimY + netH + 14);

  ctx.restore();
}

function basketballPlayer(ctx, x, groundY, size, hasBall) {
  ctx.save(); ctx.translate(x, groundY);
  // Cuerpo y camiseta de jugadora/jugador
  ctx.fillStyle = '#1b4965';
  roundedRect(ctx, -size * .18, -size * .95, size * .36, size * .55, size * .14, '#1b4965');
  // Dorsal número 10
  ctx.fillStyle = '#ffffff';
  ctx.font = `700 ${Math.max(8, Math.round(size * 0.25))}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('10', 0, -size * 0.6);
  // Cabeza
  ctx.fillStyle = '#e8b48c'; ctx.beginPath(); ctx.arc(0, -size * 1.05, size * .16, 0, Math.PI * 2); ctx.fill();
  // Piernas
  ctx.strokeStyle = '#1b2a41'; ctx.lineWidth = size * .1; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-size * .16, -size * .4); ctx.lineTo(-size * .3, 0); ctx.moveTo(size * .16, -size * .4); ctx.lineTo(size * .32, 0); ctx.stroke();
  // Brazos y balón
  if (hasBall) {
    // Postura de tiro elevada con ambas manos apuntando hacia el aro
    ctx.strokeStyle = '#e8b48c'; ctx.lineWidth = size * 0.08;
    ctx.beginPath(); ctx.moveTo(size * 0.1, -size * 0.85); ctx.lineTo(size * 0.35, -size * 1.0); ctx.stroke();
    // Balón en las manos
    const ballR = size * 0.14;
    ctx.fillStyle = '#d66836'; ctx.beginPath(); ctx.arc(size * 0.38, -size * 1.08, ballR, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#1b2a41'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(size * 0.38, -size * 1.08, ballR, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}

function ball(ctx, x, y, radius, spin) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(spin);
  // Balón de básquetbol naranja con franjas negras
  ctx.fillStyle = '#e65c00';
  ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = Math.max(1, radius * 0.12);
  ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.stroke();
  // Líneas del balón (cruz y arcos característicos)
  ctx.beginPath();
  ctx.moveTo(-radius, 0); ctx.lineTo(radius, 0);
  ctx.moveTo(0, -radius); ctx.lineTo(0, radius);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(-radius * 0.65, 0, radius * 0.65, -Math.PI / 2, Math.PI / 2);
  ctx.arc(radius * 0.65, 0, radius * 0.65, Math.PI / 2, (3 * Math.PI) / 2);
  ctx.stroke();
  ctx.restore();
}

function drawBasketball(ctx, { width, height, flight, progress, phase, now, verdict }) {
  const groundY = height - Math.max(30, height * .12);
  court(ctx, width, height, groundY, flight.environment);
  const originX = Math.max(30, width * .08);
  const worldWidth = Math.max(flight.targetX, flight.landingX, 12) * 1.2;
  const hoopH = flight.targetY > 0 ? flight.targetY : 3.05;
  const scale = Math.min((width - originX - 45) / worldWidth, (groundY - 55) / Math.max(flight.peakY, hoopH + 1.5, 4));
  const options = { scale, originX, groundY };
  const points = toCanvasPoints(flight.points, options);
  const targetPoint = toCanvasPoint({ x: flight.targetX, y: hoopH }, options);
  const current = toCanvasPoint(flight.positionAt(phase === 'idle' ? 0 : progress), options);

  // El aro suspendido a 3.05 m de altura (reglamentario)
  const isHit = phase === 'landed' && (verdict === true || flight.basketSwish || flight.hit);
  hoopTarget(ctx, targetPoint.x, groundY, scale, isHit, hoopH);

  // Trayectoria parabólica
  if (phase !== 'idle') trajectory(ctx, points, Math.round(progress * (points.length - 1)) + 1, '#e65c00', false);

  // Jugador lanzador
  basketballPlayer(ctx, originX - 6, groundY, Math.max(26, Math.min(36, width * .075)), phase === 'idle');

  // Balón en vuelo (con diámetro oficial de 24 cm = 0.24 m escalado)
  if (phase !== 'idle') {
    // Sombra en el suelo
    ctx.fillStyle = 'rgba(30, 20, 10, 0.2)';
    ctx.beginPath();
    ctx.ellipse(current.x, groundY - 2, Math.max(6, 12 * (1 - (groundY - current.y) / (groundY * 0.8))), 3, 0, 0, Math.PI * 2);
    ctx.fill();
    // Balón: diámetro oficial 24 cm -> radio = 0.12 m
    const ballRadiusPx = Math.max(6, Math.min(11, 0.12 * scale));
    ball(ctx, current.x, current.y, ballRadiusPx, now * 0.015);
  }

  label(ctx, Math.max(8, originX - 20), groundY - 65, 'LANZAMIENTO', C.ink);
  label(ctx, 8, 24, 'Tiro parabólico · Cancha de básquetbol', '#a4501f');
}

/* ---------- Escenario "pared" / "tiro libre" (estilo Roberto Carlos) ---------- */
function soccerPitch(ctx, width, height, groundY) {
  // Cielo de estadio al atardecer
  const sky = ctx.createLinearGradient(0, 0, 0, groundY);
  sky.addColorStop(0, '#1a365d'); sky.addColorStop(0.6, '#3182ce'); sky.addColorStop(1, '#bee3f8');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, width, height);

  // Graderías de estadio lejanas
  ctx.fillStyle = '#4a5568';
  ctx.fillRect(0, groundY - 35, width, 25);
  for (let s = 10; s < width; s += 24) {
    ctx.fillStyle = (s / 24) % 2 === 0 ? '#e2e8f0' : '#cbd5e1';
    ctx.fillRect(s, groundY - 33, 16, 12);
  }

  // Césped reglamentario con franjas de corte alternadas
  const grass = ctx.createLinearGradient(0, groundY - 6, 0, height);
  grass.addColorStop(0, '#38a169'); grass.addColorStop(1, '#22543d');
  ctx.fillStyle = grass; ctx.fillRect(0, groundY - 6, width, height - groundY + 6);

  for (let x = 0; x < width; x += 40) {
    ctx.fillStyle = (x / 40) % 2 === 0 ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)';
    ctx.fillRect(x, groundY - 6, 40, height - groundY + 6);
  }

  // Línea de cal del campo
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, groundY - 2); ctx.lineTo(width, groundY - 2); ctx.stroke();
}

function soccerWallBarrier(ctx, x, groundY, scale, barrierHeight = 1.8) {
  // Barrera reglamentaria FIFA a 9.15 m compuesta por 3-4 defensores
  const hPx = Math.max(30, barrierHeight * scale);
  const wPx = Math.max(22, 1.4 * scale);

  ctx.save();
  // Defensores con brazos cubriendo el pecho/rostro
  for (let i = 0; i < 3; i += 1) {
    const dx = x - wPx / 2 + (i * wPx) / 2.5;
    // Camiseta azul de Francia (referencia a Francia 1997 vs Brasil)
    roundedRect(ctx, dx - 5, groundY - hPx * 0.75, 10, hPx * 0.45, 2, '#2b6cb0');
    // Cabeza
    ctx.fillStyle = '#e8b48c'; ctx.beginPath(); ctx.arc(dx, groundY - hPx * 0.85, 4, 0, Math.PI * 2); ctx.fill();
    // Pantalón blanco y piernas
    ctx.fillStyle = '#ffffff'; roundedRect(ctx, dx - 4, groundY - hPx * 0.32, 8, hPx * 0.32, 1, '#ffffff');
  }
  ctx.restore();

  // Etiqueta de la barrera
  ctx.fillStyle = '#1a202c'; ctx.font = '700 9px system-ui, sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('BARRERA FIFA: 9.15 m · 1.80 m', x, groundY - hPx - 6);
}

function soccerGoal(ctx, x, groundY, scale, hit, goalHeight = 2.44) {
  // Arco reglamentario FIFA: travesaño a 2.44 m de altura
  const hPx = Math.max(32, goalHeight * scale);
  const wPx = Math.max(18, 1.8 * scale);

  ctx.save();
  // Red del arco
  ctx.fillStyle = hit ? 'rgba(56, 161, 105, 0.25)' : 'rgba(255, 255, 255, 0.2)';
  ctx.fillRect(x, groundY - hPx, wPx, hPx);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'; ctx.lineWidth = 1;
  for (let ny = groundY - hPx; ny <= groundY; ny += 6) {
    ctx.beginPath(); ctx.moveTo(x, ny); ctx.lineTo(x + wPx, ny); ctx.stroke();
  }

  // Postes y travesaño blancos reglamentarios
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(x, groundY);
  ctx.lineTo(x, groundY - hPx);
  ctx.lineTo(x + wPx, groundY - hPx);
  ctx.lineTo(x + wPx, groundY);
  ctx.stroke();

  if (hit) {
    ctx.fillStyle = '#38a169'; ctx.font = '700 12px system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('¡GOLAZO!', x + wPx / 2, groundY - hPx - 8);
  }

  ctx.fillStyle = '#2d3748'; ctx.font = '700 9px system-ui, sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('ARCO: 2.44 m', x + wPx / 2, groundY - hPx + 16);
  ctx.restore();
}

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

function soccerBall(ctx, x, y, radius, spin) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(spin);
  ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#1a202c'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.stroke();
  // Pentágono central negro del balón clásico
  ctx.fillStyle = '#1a202c';
  ctx.beginPath();
  for (let i = 0; i < 5; i += 1) {
    const a = (i * 2 * Math.PI) / 5;
    const px = Math.cos(a) * radius * 0.45;
    const py = Math.sin(a) * radius * 0.45;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

function drawWall(ctx, { width, height, flight, progress, phase, now, verdict }) {
  const isFreeKick = Boolean(flight.isFreeKick || flight.obstacle?.isFreeKick);
  const groundY = height - Math.max(30, height * .12);

  if (isFreeKick) {
    soccerPitch(ctx, width, height, groundY);
  } else {
    yard(ctx, width, height, groundY);
  }

  const originX = Math.max(30, width * .08);
  const worldWidth = Math.max(flight.targetX, flight.landingX, 14) * 1.15;
  const scale = Math.min((width - originX - 35) / worldWidth, (groundY - 50) / Math.max(flight.peakY, 5));
  const options = { scale, originX, groundY };
  const points = toCanvasPoints(flight.points, options);
  const targetPoint = toCanvasPoint({ x: flight.targetX, y: 0 }, options);
  const current = toCanvasPoint(flight.positionAt(phase === 'idle' ? 0 : progress), options);
  const obstacle = flight.obstacle ?? { x: flight.targetX * 0.45, height: Math.max(2, flight.peakY * 0.4) };
  const obstacleX = originX + obstacle.x * scale;

  if (isFreeKick) {
    soccerGoal(ctx, targetPoint.x, groundY, scale, phase === 'landed' && flight.clearsObstacle && (flight.landingX >= flight.targetX - 2));
    soccerWallBarrier(ctx, obstacleX, groundY, scale, obstacle.height || 1.8);
  } else {
    landingSpot(ctx, targetPoint.x, groundY, phase === 'landed' && verdict === true);
    wall(ctx, obstacleX, groundY, scale, obstacle.height, phase === 'landed' ? flight.clearsObstacle : null);
  }

  if (phase !== 'idle') trajectory(ctx, points, Math.round(progress * (points.length - 1)) + 1, isFreeKick ? '#e53e3e' : '#2f7d5e', false);
  kid(ctx, originX - 6, groundY, Math.max(28, Math.min(36, width * .075)), phase === 'flying' && progress < 0.15);

  if (phase !== 'idle') {
    ctx.fillStyle = 'rgba(30,65,54,.18)'; ctx.beginPath(); ctx.ellipse(current.x, groundY - 3, 9, 3, 0, 0, Math.PI * 2); ctx.fill();
    if (isFreeKick) {
      soccerBall(ctx, current.x, current.y - 7, Math.max(6, Math.min(9, width * .02)), now * 0.02);
    } else {
      ball(ctx, current.x, current.y - 7, Math.max(6, Math.min(9, width * .02)), now * .01);
    }
  }

  label(ctx, Math.max(8, originX - 20), groundY - 64, isFreeKick ? 'TIRO LIBRE' : 'LANZAMIENTO', C.ink);
  const explainerText = isFreeKick
    ? (flight.clearsObstacle === false && phase === 'landed' ? 'Impactó en la barrera (h < 1.80 m)' : 'Tiro Libre (estilo Roberto Carlos) · Vuelo vertical')
    : (flight.clearsObstacle === false && phase === 'landed' ? 'No superó el paredón' : 'Vuelo ideal · sin motor');
  label(ctx, 8, 24, explainerText, isFreeKick ? '#c53030' : '#256a4a');
}

export function drawScene(ctx, { width, height, flight, progress = 0, phase = 'idle', now = 0, scenario = 'dron', verdict = null }) {
  if (!(width > 0 && height > 0) || !flight) return;
  const args = { width, height, flight, progress, phase, now, verdict };
  if (scenario === 'basketball') return drawBasketball(ctx, args);
  if (scenario === 'wall' || scenario === 'roberto-carlos') return drawWall(ctx, args);
  return drawDrone(ctx, args);
}
