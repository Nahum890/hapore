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
  // La fuente se fija antes de medir: si no, el ancho sale con la fuente
  // anterior y el texto se sale del recuadro.
  ctx.save();
  ctx.font = '700 11px system-ui, sans-serif'; ctx.textAlign = 'left';
  const width = ctx.measureText(text).width + 16;
  ctx.shadowColor = 'rgba(15,23,42,.18)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 1;
  roundedRect(ctx, x, y - 15, width, 21, 6, 'rgba(255,255,255,.93)');
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = color;
  ctx.fillText(text, x + 8, y);
  ctx.restore();
}
// Etiqueta pequeña tipo "píldora" para marcar medidas dentro de la escena.
function pill(ctx, x, y, text, { bg = 'rgba(15,23,42,.72)', color = '#f8fafc', align = 'center', size = 10 } = {}) {
  ctx.save();
  ctx.font = `700 ${size}px system-ui, sans-serif`;
  const w = ctx.measureText(text).width + 12;
  const h = size + 8;
  const left = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
  roundedRect(ctx, left, y - h + 4, w, h, h / 2, bg);
  ctx.fillStyle = color; ctx.textAlign = 'left';
  ctx.fillText(text, left + 6, y);
  ctx.restore();
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
function drawDrone(ctx, { width, height, flight, progress, phase, now, verdict, hideTarget, guessX, guessLabel }) {
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
  if (!hideTarget) deliveryTarget(ctx, targetPoint.x, groundY, phase === 'landed' && verdict === true);
  if (Number.isFinite(guessX) && phase === 'landed') guessMarker(ctx, originX + guessX * scale, groundY, width, guessLabel);
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

  // Gradas del gimnasio con público tenue y una franja institucional
  const bleacherTop = groundY * 0.5;
  const bleacherBottom = groundY - 22;
  if (bleacherBottom - bleacherTop > 24) {
    ctx.fillStyle = 'rgba(40, 52, 70, 0.55)';
    ctx.fillRect(0, bleacherTop, width, bleacherBottom - bleacherTop);
    // Filas de asientos (líneas suaves) en vez de público punto por punto
    for (let y = bleacherTop + 6, row = 0; y < bleacherBottom - 2; y += 9, row += 1) {
      ctx.fillStyle = row % 2 ? 'rgba(29, 91, 216, 0.28)' : 'rgba(226, 232, 240, 0.16)';
      ctx.fillRect(0, y, width, 4);
    }
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    for (let x = width * 0.1; x < width; x += width * 0.2) ctx.fillRect(x, bleacherTop, 3, bleacherBottom - bleacherTop); // escaleras
    const fade = ctx.createLinearGradient(0, bleacherTop, 0, bleacherBottom);
    fade.addColorStop(0, 'rgba(236, 220, 198, 0)'); fade.addColorStop(1, 'rgba(236, 220, 198, 0.55)');
    ctx.fillStyle = fade; ctx.fillRect(0, bleacherTop, width, bleacherBottom - bleacherTop);
  }
  roundedRect(ctx, 0, groundY - 20, width, 12, 0, 'rgba(29, 91, 216, 0.85)');
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'; ctx.font = '800 8px system-ui, sans-serif'; ctx.textAlign = 'center';
  for (let x = width * 0.16; x < width; x += width * 0.34) ctx.fillText('PYFIS IA · MOVIMIENTO PARABÓLICO', x, groundY - 11.5);

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

function hoopTarget(ctx, x, groundY, scale, hit, hoopHeight = 3.05, collision = null, progress = 1, bballOutcome = null) {
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

  // Destello de impacto con el tablero
  if (collision && collision.type === 'backboard' && progress >= (collision.progress || 0.5)) {
    const impactY = groundY - collision.y * scale;
    ctx.save();
    ctx.strokeStyle = collision.isBasket ? '#2ecc71' : '#f39c12';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(backboardX, impactY, 11, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = collision.isBasket ? '#2ecc71' : '#e67e22';
    ctx.font = '700 11px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('💥 ¡CLAC! Tablero', backboardX + 8, impactY + 4);
    ctx.restore();
  }

  // 3. Aro reglamentario (naranja metálico, 45 cm de diámetro interior)
  const rimLeft = backboardX - rimWidth;
  ctx.strokeStyle = hit ? '#2ecc71' : '#e65100';
  ctx.lineWidth = Math.max(2.5, 0.05 * scale);
  ctx.beginPath();
  ctx.ellipse(rimLeft + rimWidth / 2, rimY, rimWidth / 2, 4, 0, 0, Math.PI * 2);
  ctx.stroke();

  // 4. Red blanca colgando debajo del aro (40-45 cm)
  const netH = Math.max(16, (hit ? 0.48 : 0.42) * scale);
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

  // 5. Destellos de enceste si acertó (swish, bank-in, rim-in)
  if (hit) {
    const bannerText = bballOutcome === 'bank-in'
      ? '¡TABLERAZO Y ADENTRO!'
      : bballOutcome === 'rim-in'
        ? '¡ARO Y ADENTRO!'
        : '¡CANASTA LIMPIA (SWISH)!';
    // A la izquierda del aro para no quedar encima del tablero.
    pill(ctx, rimLeft - 10, rimY - 22, bannerText, { bg: '#16a34a', align: 'right', size: 11 });
  }

  // 6. Proyección y marca en el suelo
  ctx.fillStyle = hit ? 'rgba(46, 204, 113, 0.3)' : 'rgba(230, 81, 0, 0.25)';
  ctx.beginPath();
  ctx.ellipse(x, groundY - 2, 18, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  // Indicador técnico de altura y diámetro, a la izquierda del aro para que
  // no lo tape el poste. Línea de cota punteada hasta el piso.
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1; ctx.setLineDash([3, 4]);
  ctx.beginPath(); ctx.moveTo(rimLeft - 4, rimY); ctx.lineTo(rimLeft - 4, groundY - 2); ctx.stroke();
  ctx.restore();
  pill(ctx, rimLeft - 10, rimY + 4, `Aro ${hoopHeight.toFixed(2)} m · Ø 45 cm`, { align: 'right', size: 9.5 });
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
  hoopTarget(ctx, targetPoint.x, groundY, scale, isHit, hoopH, flight.collision, progress, flight.bballOutcome);

  // Trayectoria parabólica
  if (phase !== 'idle') trajectory(ctx, points, Math.round(progress * (points.length - 1)) + 1, '#e65c00', false);

  // Jugador lanzador escalado en proporción física exacta con el aro y la cancha
  const playerSize = Math.max(16, Math.min(52, 1.60 * scale));
  basketballPlayer(ctx, originX - 6, groundY, playerSize, phase === 'idle');

  // Guía de mira balística interactiva en reposo
  if (phase === 'idle' && flight.launch) {
    const launchAngleRad = (flight.launch.angle * Math.PI) / 180;
    const hasSpeed = Boolean(flight.hasUserSpeed && flight.userSpeed > 0);
    const speedVal = hasSpeed ? flight.userSpeed : null;
    const arrowLen = speedVal ? Math.max(28, Math.min(60, speedVal * 3.5)) : 36;
    const ballOriginX = originX + playerSize * 0.35;
    const ballOriginY = groundY - (flight.y0 || 1.80) * scale;
    const endX = ballOriginX + Math.cos(launchAngleRad) * arrowLen;
    const endY = ballOriginY - Math.sin(launchAngleRad) * arrowLen;

    ctx.save();
    ctx.strokeStyle = hasSpeed ? 'rgba(230, 81, 0, 0.85)' : 'rgba(71, 85, 105, 0.65)';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(ballOriginX, ballOriginY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = hasSpeed ? '#e65100' : '#64748b';
    ctx.beginPath();
    ctx.arc(endX, endY, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = '700 10.5px system-ui, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#1b2a41';
    ctx.lineWidth = 3;
    const labelText = speedVal ? `${Math.round(flight.launch.angle)}° · ${speedVal.toFixed(1)} m/s` : `${Math.round(flight.launch.angle)}° (Ingresá v₀)`;
    ctx.strokeText(labelText, endX + 8, endY + 3);
    ctx.fillText(labelText, endX + 8, endY + 3);
    ctx.restore();
  }

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

  pill(ctx, originX - 6, groundY - playerSize * 1.4 - 8, 'Lanzamiento', { bg: 'rgba(255,255,255,.92)', color: C.ink });
  label(ctx, 8, 24, 'Tiro parabólico · Cancha de básquetbol', '#a4501f');
}

/* ---------- Escenario "pared" / "tiro libre" (estilo Roberto Carlos) ---------- */
// Colores de la hinchada: pseudoaleatorio pero fijo (no parpadea entre cuadros).
const CROWD = ['#f6e05e', '#38a169', '#e53e3e', '#3182ce', '#f7fafc', '#ed8936', '#d53f8c', '#2d3748'];
function crowdColor(col, row) {
  const n = Math.sin(col * 12.9898 + row * 78.233) * 43758.5453;
  return CROWD[Math.floor((n - Math.floor(n)) * CROWD.length)];
}

function floodlight(ctx, x, baseY, topY) {
  ctx.save();
  ctx.strokeStyle = '#2d3748'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x, baseY); ctx.lineTo(x, topY + 10); ctx.stroke();
  const glow = ctx.createRadialGradient(x, topY, 2, x, topY, 70);
  glow.addColorStop(0, 'rgba(255,250,220,.55)'); glow.addColorStop(1, 'rgba(255,250,220,0)');
  ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(x, topY, 70, 0, Math.PI * 2); ctx.fill();
  roundedRect(ctx, x - 13, topY - 6, 26, 14, 3, '#4a5568');
  ctx.fillStyle = '#fffbe6';
  for (let i = 0; i < 3; i += 1) for (let j = 0; j < 2; j += 1) ctx.fillRect(x - 10 + i * 7.5, topY - 4 + j * 6, 5, 4);
  ctx.restore();
}

function soccerPitch(ctx, width, height, groundY) {
  // Cielo de estadio al anochecer
  const sky = ctx.createLinearGradient(0, 0, 0, groundY);
  sky.addColorStop(0, '#14264a'); sky.addColorStop(0.55, '#2c5c9c'); sky.addColorStop(1, '#8fc1e8');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, width, height);
  ctx.save(); ctx.globalAlpha = .16;
  cloud(ctx, width * .2, groundY * .16, Math.max(26, width * .07));
  cloud(ctx, width * .62, groundY * .1, Math.max(22, width * .055));
  ctx.restore();

  // Tribunas con hinchada (bloques escalonados)
  const standTop = Math.max(groundY * .34, groundY - 118);
  const standBottom = groundY - 14;
  ctx.fillStyle = '#1f2a3d'; ctx.fillRect(0, standTop - 8, width, standBottom - standTop + 8);
  ctx.fillStyle = '#2b3a55'; ctx.fillRect(0, standTop - 8, width, 5); // techo
  const cell = 6;
  for (let y = standTop, row = 0; y < standBottom - 4; y += cell, row += 1) {
    ctx.fillStyle = row % 4 === 3 ? '#16202f' : '#243249';
    ctx.fillRect(0, y, width, cell);
    if (row % 4 === 3) continue; // pasillo
    ctx.globalAlpha = .5; // hinchada tenue: que resalten los jugadores
    for (let x = 2, col = 0; x < width; x += cell, col += 1) {
      ctx.fillStyle = crowdColor(col, row);
      ctx.fillRect(x, y + 1, 3.2, 3.6);
    }
    ctx.globalAlpha = 1;
  }
  const standShade = ctx.createLinearGradient(0, standTop, 0, standBottom);
  standShade.addColorStop(0, 'rgba(10,18,32,.35)'); standShade.addColorStop(1, 'rgba(10,18,32,0)');
  ctx.fillStyle = standShade; ctx.fillRect(0, standTop, width, standBottom - standTop);
  floodlight(ctx, width * .06, standTop, standTop - 26);
  floodlight(ctx, width * .94, standTop, standTop - 26);

  // Carteles de publicidad al borde del campo
  const boardY = groundY - 14;
  for (let x = 0, i = 0; x < width; x += 90, i += 1) {
    roundedRect(ctx, x + 2, boardY, 86, 10, 2, i % 2 ? '#1d5bd8' : '#e53e3e');
    ctx.fillStyle = '#ffffff'; ctx.font = '800 7.5px system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(i % 2 ? 'FÍSICA 3.º CURSO' : 'PYFIS IA', x + 45, boardY + 7.8);
  }

  // Césped en perspectiva: franjas de corte horizontales que se ensanchan
  // hacia adelante (más cerca de la cámara).
  const grass = ctx.createLinearGradient(0, groundY - 4, 0, height);
  grass.addColorStop(0, '#2f8f55'); grass.addColorStop(1, '#1d6b3c');
  ctx.fillStyle = grass; ctx.fillRect(0, groundY - 4, width, height - groundY + 4);
  let y = groundY - 4;
  for (let band = 0; y < height; band += 1) {
    const h = 5 + band * 3.2;
    if (band % 2 === 0) { ctx.fillStyle = 'rgba(255,255,255,.07)'; ctx.fillRect(0, y, width, h); }
    y += h;
  }
  // Viñeta suave de iluminación
  const vignette = ctx.createLinearGradient(0, groundY, 0, height);
  vignette.addColorStop(0, 'rgba(255,255,230,.08)'); vignette.addColorStop(1, 'rgba(0,0,0,.18)');
  ctx.fillStyle = vignette; ctx.fillRect(0, groundY - 4, width, height - groundY + 4);

  // Línea de cal (línea de meta vista de costado)
  ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, groundY - 1); ctx.lineTo(width, groundY - 1); ctx.stroke();
}

// Área grande (16.5 m) y área chica (5.5 m) dibujadas sobre el césped en
// perspectiva, más el punto penal (11 m). Solo referencia visual.
function penaltyArea(ctx, goalX, groundY, height, scale) {
  const depth = (height - groundY) * .62;
  const skew = depth * .55;
  const box = (meters, d) => {
    const far = goalX - meters * scale;
    ctx.beginPath();
    ctx.moveTo(far, groundY);
    ctx.lineTo(far - skew * d, groundY + depth * d);
    ctx.lineTo(goalX - skew * d, groundY + depth * d);
    ctx.lineTo(goalX, groundY);
    ctx.stroke();
  };
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 1.6;
  box(16.5, 1);
  box(5.5, .45);
  ctx.fillStyle = 'rgba(255,255,255,.75)';
  ctx.beginPath(); ctx.ellipse(goalX - 11 * scale - skew * .5, groundY + depth * .5, 3, 1.6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function soccerPlayer(ctx, x, groundY, size, { jersey = '#f6e05e', shorts = '#2b6cb0', socks = '#ffffff', number = null, arms = 'down', kicking = false } = {}) {
  ctx.save(); ctx.translate(x, groundY); ctx.lineCap = 'round';
  // Sombra
  ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(0, -1, size * .28, size * .06, 0, 0, Math.PI * 2); ctx.fill();
  // Piernas (medias) y botines
  ctx.strokeStyle = socks; ctx.lineWidth = size * .1;
  ctx.beginPath();
  ctx.moveTo(-size * .08, -size * .42); ctx.lineTo(-size * .12, -size * .04);
  if (kicking) { ctx.moveTo(size * .08, -size * .42); ctx.lineTo(size * .3, -size * .2); }
  else { ctx.moveTo(size * .08, -size * .42); ctx.lineTo(size * .12, -size * .04); }
  ctx.stroke();
  ctx.fillStyle = '#111827';
  ctx.beginPath(); ctx.ellipse(-size * .1, -size * .03, size * .07, size * .035, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(kicking ? size * .32 : size * .14, kicking ? -size * .19 : -size * .03, size * .07, size * .035, 0, 0, Math.PI * 2); ctx.fill();
  // Pantalón
  roundedRect(ctx, -size * .15, -size * .52, size * .3, size * .14, size * .04, shorts);
  // Camiseta
  roundedRect(ctx, -size * .17, -size * .88, size * .34, size * .4, size * .08, jersey);
  if (number) {
    ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.font = `800 ${Math.max(7, Math.round(size * .17))}px system-ui, sans-serif`; ctx.textAlign = 'center';
    ctx.fillText(number, 0, -size * .63);
  }
  // Brazos
  ctx.strokeStyle = '#e8b48c'; ctx.lineWidth = size * .075;
  ctx.beginPath();
  if (arms === 'cover') { // barrera: brazos cruzados delante
    ctx.moveTo(-size * .16, -size * .8); ctx.lineTo(size * .1, -size * .58);
    ctx.moveTo(size * .16, -size * .8); ctx.lineTo(-size * .1, -size * .58);
  } else {
    ctx.moveTo(-size * .17, -size * .82); ctx.lineTo(-size * .3, -size * .58);
    ctx.moveTo(size * .17, -size * .82); ctx.lineTo(size * .32, -size * .62);
  }
  ctx.stroke();
  // Cabeza y pelo
  ctx.fillStyle = '#e8b48c'; ctx.beginPath(); ctx.arc(0, -size * 1, size * .12, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#2d1b10'; ctx.beginPath(); ctx.arc(0, -size * 1.03, size * .12, Math.PI, 0); ctx.fill();
  ctx.restore();
}

function soccerWallBarrier(ctx, x, groundY, scale, barrierHeight = 1.8) {
  // Barrera reglamentaria FIFA a 9.15 m: cuatro defensores de 1.80 m.
  const size = Math.max(30, barrierHeight * scale);
  const gap = Math.max(7, size * .26);
  for (let i = 0; i < 4; i += 1) {
    soccerPlayer(ctx, x + (i - 1.5) * gap, groundY, size, { jersey: '#2b6cb0', shorts: '#ffffff', socks: '#e53e3e', arms: 'cover' });
  }
  pill(ctx, x, groundY - size * 1.15 - 8, `Barrera · 9.15 m · ${barrierHeight.toFixed(2)} m`, { size: 9.5 });
}

function soccerGoal(ctx, x, groundY, scale, hit, goalHeight = 2.44) {
  // Arco reglamentario FIFA: travesaño a 2.44 m, con profundidad de red.
  const hPx = Math.max(32, goalHeight * scale);
  const depth = Math.max(18, 1.8 * scale);
  const backTop = groundY - hPx * .82;

  ctx.save();
  // Red lateral (trapecio) con malla
  ctx.fillStyle = hit ? 'rgba(72, 187, 120, 0.28)' : 'rgba(255, 255, 255, 0.16)';
  ctx.beginPath();
  ctx.moveTo(x, groundY - hPx); ctx.lineTo(x + depth, backTop); ctx.lineTo(x + depth, groundY); ctx.lineTo(x, groundY); ctx.closePath();
  ctx.fill();
  ctx.save(); ctx.clip();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)'; ctx.lineWidth = .8;
  for (let d = -hPx; d < depth + hPx; d += 6) {
    ctx.beginPath(); ctx.moveTo(x + d, groundY); ctx.lineTo(x + d + hPx, groundY - hPx); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + d, groundY - hPx); ctx.lineTo(x + d + hPx, groundY); ctx.stroke();
  }
  ctx.restore();
  // Soportes traseros
  ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(x, groundY - hPx); ctx.lineTo(x + depth, backTop); ctx.lineTo(x + depth, groundY); ctx.stroke();
  // Poste y travesaño (vistos de costado)
  ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 4;
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(x, groundY); ctx.lineTo(x, groundY - hPx); ctx.lineTo(x + 6, groundY - hPx); ctx.stroke();
  ctx.restore();

  if (hit) pill(ctx, x + depth / 2, groundY - hPx - 10, '¡GOLAZO!', { bg: '#2f855a', size: 12 });
  pill(ctx, x - 8, groundY - hPx + 4, `Arco ${goalHeight.toFixed(2)} m`, { align: 'right', size: 9.5 });
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

function drawWall(ctx, { width, height, flight, progress, phase, now, verdict, hideTarget, guessX, guessLabel }) {
  const isFreeKick = Boolean(flight.isFreeKick || flight.obstacle?.isFreeKick);
  // En el tiro libre el suelo sube (72 %) para mostrar el césped en
  // perspectiva y que el cielo no ocupe casi toda la escena.
  const groundY = isFreeKick ? Math.round(height * .72) : height - Math.max(30, height * .12);

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
    penaltyArea(ctx, targetPoint.x, groundY, height, scale);
    // "¡GOLAZO!" solo si el reto lo evaluó como gol (verdict); la regla
    // geométrica queda de respaldo para quien no pase veredicto.
    const isGoal = typeof verdict === 'boolean' ? verdict : flight.clearsObstacle && (flight.landingX >= flight.targetX - 2);
    soccerGoal(ctx, targetPoint.x, groundY, scale, phase === 'landed' && isGoal);
    soccerWallBarrier(ctx, obstacleX, groundY, scale, obstacle.height || 1.8);
  } else {
    if (!hideTarget) landingSpot(ctx, targetPoint.x, groundY, phase === 'landed' && verdict === true);
    wall(ctx, obstacleX, groundY, scale, obstacle.height, phase === 'landed' ? flight.clearsObstacle : null);
  }
  if (Number.isFinite(guessX) && phase === 'landed') guessMarker(ctx, originX + guessX * scale, groundY, width, guessLabel);

  if (phase !== 'idle') {
    if (isFreeKick) {
      // Estela con brillo para que el disparo se lea bien sobre el estadio.
      ctx.save(); ctx.shadowColor = 'rgba(255,255,255,.7)'; ctx.shadowBlur = 6;
      trajectory(ctx, points, Math.round(progress * (points.length - 1)) + 1, '#fef08a', false);
      ctx.restore();
    } else {
      trajectory(ctx, points, Math.round(progress * (points.length - 1)) + 1, '#2f7d5e', false);
    }
  }
  const kickerSize = Math.max(28, Math.min(48, 1.75 * scale));
  if (isFreeKick) {
    soccerPlayer(ctx, originX - 12, groundY, kickerSize, { jersey: '#f6e05e', shorts: '#2b6cb0', socks: '#ffffff', number: '6', kicking: phase === 'flying' && progress < 0.2 });
    if (phase === 'idle') soccerBall(ctx, originX + 2, groundY - 5, Math.max(4.5, Math.min(7, width * .014)), 0);
  } else {
    kid(ctx, originX - 6, groundY, Math.max(28, Math.min(36, width * .075)), phase === 'flying' && progress < 0.15);
  }

  if (phase !== 'idle') {
    ctx.fillStyle = 'rgba(30,65,54,.18)'; ctx.beginPath(); ctx.ellipse(current.x, groundY - 3, 9, 3, 0, 0, Math.PI * 2); ctx.fill();
    if (isFreeKick) {
      soccerBall(ctx, current.x, current.y - 7, Math.max(6, Math.min(9, width * .02)), now * 0.02);
    } else {
      ball(ctx, current.x, current.y - 7, Math.max(6, Math.min(9, width * .02)), now * .01);
    }
  }

  if (isFreeKick) pill(ctx, originX - 12, groundY - kickerSize * 1.2 - 8, `Tiro libre · ${Math.round(flight.targetX * 10) / 10} m`, { bg: 'rgba(255,255,255,.92)', color: C.ink });
  else label(ctx, Math.max(8, originX - 20), groundY - 64, 'LANZAMIENTO', C.ink);
  const explainerText = isFreeKick
    ? (flight.clearsObstacle === false && phase === 'landed' ? 'Impactó en la barrera (h < 1.80 m)' : 'Tiro Libre (estilo Roberto Carlos) · Vuelo vertical')
    : (flight.clearsObstacle === false && phase === 'landed' ? 'No superó el paredón' : 'Vuelo ideal · sin motor');
  label(ctx, 8, 24, explainerText, isFreeKick ? '#c53030' : '#256a4a');
}

// Marca vertical con la predicción del alumno (minijuego "Predecí y lanzá").
function guessMarker(ctx, x, groundY, width, text) {
  const px = Math.max(10, Math.min(width - 10, x));
  ctx.save();
  ctx.strokeStyle = '#7047eb'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]);
  ctx.beginPath(); ctx.moveTo(px, groundY); ctx.lineTo(px, groundY - 46); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#7047eb'; ctx.font = '800 11px system-ui, sans-serif'; ctx.textAlign = px > width - 40 ? 'right' : 'center';
  ctx.fillText(text, px, groundY - 50);
  ctx.restore();
}

export function drawScene(ctx, { width, height, flight, progress = 0, phase = 'idle', now = 0, scenario = 'dron', verdict = null, hideTarget = false, guessX = null, guessLabel = '' }) {
  if (!(width > 0 && height > 0) || !flight) return;
  const args = { width, height, flight, progress, phase, now, verdict, hideTarget, guessX, guessLabel };
  if (scenario === 'basketball') return drawBasketball(ctx, args);
  if (scenario === 'wall' || scenario === 'roberto-carlos') return drawWall(ctx, args);
  return drawDrone(ctx, args);
}
