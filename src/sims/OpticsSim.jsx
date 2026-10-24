// Óptica geométrica: sombras (propagación rectilínea), espejos planos y
// esféricos, refracción (Snell, reflexión total y prisma) y lentes delgadas,
// con diagramas de rayos principales e imagen calculada (1/f = 1/do + 1/di).
import { useState } from 'react';
import { Sim, Stage, Slider, Choice, Readouts, Verdict, useTx, num, INK, COLORS } from './SimKit.jsx';

const CY = 190, MX = 380, SCALE = 4; // px por cm
const LIGHT = '#f59e0b';

function ObjectArrow({ x, h, color = COLORS.blue, dashed = false, label }) {
  const tipY = CY - h;
  return <g opacity={dashed ? 0.75 : 1}>
    <line x1={x} y1={CY} x2={x} y2={tipY} stroke={color} strokeWidth="4" strokeDasharray={dashed ? '6 5' : undefined} />
    <path d={`M${x} ${tipY} l-8 ${h > 0 ? 12 : -12} h16z`} fill={color} />
    {label && <text x={x + 8} y={tipY + (h > 0 ? -6 : 16)} className="sim-label sim-label-small" fill={color}>{label}</text>}
  </g>;
}

/** Recta que pasa por dos puntos, extendida hasta x = xEnd. */
const extend = (p, q, xEnd) => { const m = (q.y - p.y) / (q.x - p.x || 1e-9); return { x: xEnd, y: q.y + m * (xEnd - q.x) }; };

function MirrorScene({ kind, f, dObj, hObj, tx }) {
  const fSigned = kind === 'plane' ? Infinity : kind === 'concave' ? f : -f;
  const di = kind === 'plane' ? -dObj : 1 / (1 / fSigned - 1 / dObj);
  const hi = -(di / dObj) * hObj;
  const objX = MX - dObj * SCALE, tip = { x: objX, y: CY - hObj * SCALE };
  const imgX = MX - di * SCALE; // di > 0: delante (izquierda); di < 0: detrás
  const F = { x: MX - fSigned * SCALE, y: CY };
  const rays = [];
  if (kind !== 'plane' && Number.isFinite(di)) {
    // 1) paralelo al eje → refleja pasando por F (o pareciendo venir de F)
    const hit1 = { x: MX, y: tip.y };
    // Cóncavo: el rayo reflejado pasa por F. Convexo: parece venir de F (detrás del espejo).
    rays.push({ a: tip, b: hit1, c: kind === 'concave' ? extend(hit1, F, 20) : extend(F, hit1, 20) });
    // 2) hacia el vértice → refleja simétrico
    const hit2 = { x: MX, y: CY };
    rays.push({ a: tip, b: hit2, c: { x: 20, y: CY + (CY - tip.y) * ((MX - 20) / (MX - tip.x)) } });
  }
  const real = di > 0;
  const image = Number.isFinite(di) && Math.abs(di) < 400;
  return { di, hi, real, node: <>
    <line x1="10" y1={CY} x2="630" y2={CY} stroke={INK} strokeOpacity=".4" strokeDasharray="4 6" />
    {kind === 'plane'
      ? <line x1={MX} y1={CY - 120} x2={MX} y2={CY + 120} stroke={INK} strokeWidth="5" />
      : <path d={kind === 'concave' ? `M${MX - 12} ${CY - 120} Q ${MX + 22} ${CY} ${MX - 12} ${CY + 120}` : `M${MX + 12} ${CY - 120} Q ${MX - 22} ${CY} ${MX + 12} ${CY + 120}`} fill="none" stroke={INK} strokeWidth="5" />}
    {Array.from({ length: 9 }, (_, i) => <line key={i} x1={MX + 8} y1={CY - 110 + i * 27} x2={MX + 18} y2={CY - 118 + i * 27} stroke={INK} strokeWidth="1.2" />)}
    {kind !== 'plane' && <><circle cx={F.x} cy={CY} r="4" fill={COLORS.red} /><text x={F.x} y={CY + 20} textAnchor="middle" className="sim-label sim-label-small" fill={COLORS.red}>F</text>
      <circle cx={MX - 2 * fSigned * SCALE} cy={CY} r="4" fill={INK} /><text x={MX - 2 * fSigned * SCALE} y={CY + 20} textAnchor="middle" className="sim-label sim-label-small" fill={INK}>C</text></>}
    {rays.map((ray, i) => <g key={i}>
      <polyline points={`${ray.a.x},${ray.a.y} ${ray.b.x},${ray.b.y} ${ray.c.x},${ray.c.y}`} fill="none" stroke={LIGHT} strokeWidth="2.2" />
      {!real && image && <line x1={ray.b.x} y1={ray.b.y} x2={imgX} y2={CY - hi * SCALE} stroke={LIGHT} strokeWidth="1.6" strokeDasharray="5 5" />}
    </g>)}
    {kind === 'plane' && <><line x1={tip.x} y1={tip.y} x2={MX} y2={CY - hObj * SCALE / 2} stroke={LIGHT} strokeWidth="2.2" /><line x1={MX} y1={CY - hObj * SCALE / 2} x2={tip.x} y2={CY} stroke={LIGHT} strokeWidth="2.2" /><line x1={MX} y1={CY - hObj * SCALE / 2} x2={imgX} y2={tip.y} stroke={LIGHT} strokeWidth="1.6" strokeDasharray="5 5" /></>}
    <ObjectArrow x={objX} h={hObj * SCALE} label={tx('objeto', 'objeto')} />
    {image && <ObjectArrow x={imgX} h={hi * SCALE} color={COLORS.violet} dashed={!real} label={tx(real ? 'imagen real' : 'imagen virtual', real ? 'imagen real' : 'imagen virtual')} />}
  </> };
}

function LensScene({ kind, f, dObj, hObj, tx }) {
  const fs = kind === 'converging' ? f : -f;
  const di = 1 / (1 / fs - 1 / dObj); // di > 0: imagen real a la derecha
  const hi = -(di / dObj) * hObj;
  const objX = MX - dObj * SCALE, tip = { x: objX, y: CY - hObj * SCALE };
  const imgX = MX + di * SCALE;
  // Foco imagen: a la derecha en la convergente, del lado del objeto en la divergente.
  const Fimg = { x: MX + fs * SCALE, y: CY };
  const Fl = { x: MX - f * SCALE, y: CY }, Fr = { x: MX + f * SCALE, y: CY };
  const real = di > 0;
  const image = Number.isFinite(di) && Math.abs(di) < 400;
  // Rayo 1: paralelo → pasa por F′ (convergente) o parece venir de F (divergente).
  const hit1 = { x: MX, y: tip.y };
  const out1 = kind === 'converging' ? extend(hit1, Fimg, 630) : extend(Fimg, hit1, 630);
  // Rayo 2: por el centro, sin desviarse.
  const out2 = extend(tip, { x: MX, y: CY }, 630);
  return { di, hi, real, node: <>
    <line x1="10" y1={CY} x2="630" y2={CY} stroke={INK} strokeOpacity=".4" strokeDasharray="4 6" />
    <path d={kind === 'converging' ? `M${MX} ${CY - 120} Q ${MX + 26} ${CY} ${MX} ${CY + 120} Q ${MX - 26} ${CY} ${MX} ${CY - 120}` : `M${MX - 12} ${CY - 120} H${MX + 12} Q ${MX - 4} ${CY} ${MX + 12} ${CY + 120} H${MX - 12} Q ${MX + 4} ${CY} ${MX - 12} ${CY - 120}`} fill="#dbeafe" stroke={INK} strokeWidth="2.5" opacity=".9" />
    {[Fl, Fr].map((point, i) => <g key={i}><circle cx={point.x} cy={CY} r="4" fill={COLORS.red} /><text x={point.x} y={CY + 20} textAnchor="middle" className="sim-label sim-label-small" fill={COLORS.red}>{i ? 'F′' : 'F'}</text></g>)}
    <polyline points={`${tip.x},${tip.y} ${hit1.x},${hit1.y} ${out1.x},${out1.y}`} fill="none" stroke={LIGHT} strokeWidth="2.2" />
    <polyline points={`${tip.x},${tip.y} ${out2.x},${out2.y}`} fill="none" stroke={LIGHT} strokeWidth="2.2" />
    {!real && image && <><line x1={hit1.x} y1={hit1.y} x2={imgX} y2={CY - hi * SCALE} stroke={LIGHT} strokeWidth="1.6" strokeDasharray="5 5" /><line x1={MX} y1={CY} x2={imgX} y2={CY - hi * SCALE} stroke={LIGHT} strokeWidth="1.6" strokeDasharray="5 5" /></>}
    <ObjectArrow x={objX} h={hObj * SCALE} label={tx('objeto', 'objeto')} />
    {image && <ObjectArrow x={imgX} h={hi * SCALE} color={COLORS.violet} dashed={!real} label={tx(real ? 'imagen real' : 'imagen virtual', real ? 'imagen real' : 'imagen virtual')} />}
  </> };
}

const MEDIA = [{ id: 'aire', es: 'Aire', gn: 'Aire', n: 1 }, { id: 'agua', es: 'Agua', gn: 'Y', n: 1.33 }, { id: 'vidrio', es: 'Vidrio', gn: 'Vidrio', n: 1.5 }, { id: 'diamante', es: 'Diamante', gn: 'Diamante', n: 2.42 }];

function SnellScene({ n1, n2, theta1, tx }) {
  const O = { x: 320, y: 190 }, L = 170;
  const r1 = (theta1 * Math.PI) / 180;
  const inc = { x: O.x - L * Math.sin(r1), y: O.y - L * Math.cos(r1) };
  const s2 = (n1 / n2) * Math.sin(r1);
  const total = s2 > 1;
  const r2 = total ? null : Math.asin(s2);
  const refl = { x: O.x + L * Math.sin(r1), y: O.y - L * Math.cos(r1) };
  const refr = r2 === null ? null : { x: O.x + L * Math.sin(r2), y: O.y + L * Math.cos(r2) };
  return { theta2: r2 === null ? null : (r2 * 180) / Math.PI, total, critical: n1 > n2 ? (Math.asin(n2 / n1) * 180) / Math.PI : null, node: <>
    <rect x="0" y="0" width="640" height={O.y} fill={n1 > 1 ? '#dbeafe' : '#f8fbff'} />
    <rect x="0" y={O.y} width="640" height={380 - O.y} fill={n2 > 1.4 ? '#c7d9f2' : n2 > 1 ? '#bfe0f5' : '#f8fbff'} />
    <line x1="0" y1={O.y} x2="640" y2={O.y} stroke={INK} strokeWidth="2" />
    <line x1={O.x} y1="10" x2={O.x} y2="370" stroke={INK} strokeDasharray="6 6" opacity=".5" />
    <text x={O.x + 6} y="22" className="sim-tick">{tx('normal', 'normal')}</text>
    <line x1={inc.x} y1={inc.y} x2={O.x} y2={O.y} stroke={LIGHT} strokeWidth="4" />
    <line x1={O.x} y1={O.y} x2={refl.x} y2={refl.y} stroke={LIGHT} strokeWidth={total ? 4 : 1.6} opacity={total ? 1 : 0.45} />
    {refr && <line x1={O.x} y1={O.y} x2={refr.x} y2={refr.y} stroke={COLORS.red} strokeWidth="4" />}
    <text x={inc.x - 4} y={inc.y - 8} textAnchor="end" className="sim-label sim-label-small" fill="#92400e">θ₁ = {num(theta1, 1)}°</text>
    {refr && <text x={refr.x + 6} y={refr.y} className="sim-label sim-label-small" fill={COLORS.red}>θ₂ = {num((r2 * 180) / Math.PI, 1)}°</text>}
    <text x="14" y="26" className="sim-label" fill={INK}>n₁ = {num(n1)}</text>
    <text x="14" y={O.y + 26} className="sim-label" fill={INK}>n₂ = {num(n2)}</text>
  </> };
}

function PrismScene({ tx }) {
  // Prisma de 60° con índices exagerados para ver bien la dispersión.
  const colors = [['#e11d48', 1.50], ['#f97316', 1.512], ['#facc15', 1.524], ['#22c55e', 1.536], ['#3b82f6', 1.548], ['#7c3aed', 1.56]];
  const A = { x: 320, y: 80 }, B = { x: 220, y: 253 }, C = { x: 420, y: 253 };
  const entry = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 };
  const src = { x: 40, y: 210 };
  const normalL = { x: -(A.y - B.y), y: A.x - B.x }; const nl = Math.hypot(normalL.x, normalL.y); normalL.x /= nl; normalL.y /= nl; // apunta hacia afuera (izq.)
  const din = { x: entry.x - src.x, y: entry.y - src.y }; const dl = Math.hypot(din.x, din.y); din.x /= dl; din.y /= dl;
  const refract = (d, n, eta) => { const cosi = -(d.x * n.x + d.y * n.y); const k = 1 - eta * eta * (1 - cosi * cosi); if (k < 0) return null; const t = eta * cosi - Math.sqrt(k); return { x: eta * d.x + t * n.x, y: eta * d.y + t * n.y }; };
  const hitRight = (p, d) => { const ex = C.x - A.x, ey = C.y - A.y; const den = d.x * ey - d.y * ex; const t = ((A.x - p.x) * ey - (A.y - p.y) * ex) / den; return { x: p.x + d.x * t, y: p.y + d.y * t }; };
  const normalR = { x: C.y - A.y, y: -(C.x - A.x) }; const nr = Math.hypot(normalR.x, normalR.y); normalR.x /= nr; normalR.y /= nr;
  return <>
    <polygon points={`${A.x},${A.y} ${B.x},${B.y} ${C.x},${C.y}`} fill="#e0f2fe" stroke={INK} strokeWidth="2.5" opacity=".9" />
    <line x1={src.x} y1={src.y} x2={entry.x} y2={entry.y} stroke="#fff" strokeWidth="6" />
    <line x1={src.x} y1={src.y} x2={entry.x} y2={entry.y} stroke={INK} strokeWidth="1.2" />
    {colors.map(([color, n]) => {
      const inside = refract(din, normalL, 1 / n);
      if (!inside) return null;
      const exit = hitRight(entry, inside);
      const out = refract(inside, { x: -normalR.x, y: -normalR.y }, n);
      const end = out ? { x: exit.x + out.x * 260, y: exit.y + out.y * 260 } : exit;
      return <g key={color}><line x1={entry.x} y1={entry.y} x2={exit.x} y2={exit.y} stroke={color} strokeWidth="1.6" opacity=".7" /><line x1={exit.x} y1={exit.y} x2={end.x} y2={end.y} stroke={color} strokeWidth="3" /></g>;
    })}
    <text x="40" y="196" className="sim-label sim-label-small" fill={INK}>{tx('luz blanca', 'tesape morotĩ')}</text>
  </>;
}

function ShadowScene({ kind, distance, tx }) {
  const L = { x: 60, y: 180 }, screenX = 580, objX = 60 + distance, R = 34;
  const scaleK = (screenX - L.x) / (objX - L.x);
  const shadowR = R * scaleK;
  const opacity = kind === 'opaque' ? 0.85 : kind === 'translucent' ? 0.35 : 0;
  return { shadow: shadowR * 2, node: <>
    <rect x="0" y="0" width="640" height="360" fill="#1e293b" opacity=".06" />
    <circle cx={L.x} cy={L.y} r="16" fill="#fde68a" stroke={INK} strokeWidth="2" />
    <rect x={L.x - 6} y={L.y + 14} width="12" height="10" fill="#94a3b8" stroke={INK} />
    {[-1, 1].map(sign => <line key={sign} x1={L.x} y1={L.y} x2={screenX} y2={L.y + sign * shadowR} stroke={LIGHT} strokeWidth="1.6" opacity=".8" />)}
    <rect x={screenX} y="20" width="16" height="320" fill="#fff" stroke={INK} strokeWidth="2" />
    <rect x={screenX} y={L.y - shadowR} width="16" height={shadowR * 2} fill="#0f172a" opacity={opacity} />
    <circle cx={objX} cy={L.y} r={R} fill={kind === 'opaque' ? '#c08a52' : kind === 'translucent' ? 'rgba(255,255,255,.55)' : 'rgba(186,230,253,.25)'} stroke={INK} strokeWidth="2.2" strokeDasharray={kind === 'transparent' ? '5 4' : undefined} />
    <text x={screenX - 6} y="350" textAnchor="end" className="sim-tick">{tx('pantalla', 'pantalla')}</text>
  </> };
}

export default function OpticsSim({ mode = 'mirror' }) {
  const tx = useTx();
  const [view, setView] = useState(mode);
  const [mirror, setMirror] = useState('concave');
  const [lens, setLens] = useState('converging');
  const [f, setF] = useState(15);
  const [dObj, setDObj] = useState(40);
  const [hObj, setHObj] = useState(10);
  const [n1, setN1] = useState('aire');
  const [n2, setN2] = useState('agua');
  const [theta1, setTheta1] = useState(40);
  const [prism, setPrism] = useState(false);
  const [shadowKind, setShadowKind] = useState('opaque');
  const [distance, setDistance] = useState(200);

  const tabs = <Choice options={[{ id: 'shadow', label: tx('Sombras', 'Kuarahy’ã') }, { id: 'mirror', label: tx('Espejos', 'Espejo') }, { id: 'snell', label: tx('Refracción', 'Refracción') }, { id: 'lens', label: tx('Lentes', 'Lente') }]} value={view} onChange={setView} />;
  let scene, controls, readouts, subtitle, footer, title;

  if (view === 'shadow') {
    const s = ShadowScene({ kind: shadowKind, distance, tx });
    title = tx('Propagación de la luz', 'Tesape iñemosarambi'); subtitle = tx('La luz viaja en línea recta: un cuerpo opaco deja una sombra con forma definida.', 'Tesape oho línea recta-pe: cuerpo opaco oheja kuarahy’ã.');
    controls = <><Choice label={tx('Tipo de cuerpo', 'Cuerpo tipo')} options={[{ id: 'opaque', label: tx('Opaco', 'Opaco') }, { id: 'translucent', label: tx('Translúcido', 'Translúcido') }, { id: 'transparent', label: tx('Transparente', 'Transparente') }]} value={shadowKind} onChange={setShadowKind} />
      <Slider label={tx('Distancia lámpara–objeto', 'Lámpara–objeto distancia')} value={distance} min={80} max={440} step={10} unit="px" onChange={setDistance} /></>;
    readouts = <><Readouts items={[{ label: tx('Tamaño de la sombra', 'Kuarahy’ã tuichakue'), value: s.shadow / 68, unit: '× objeto', tone: 'violet' }]} />
      <Verdict tone="info">{shadowKind === 'opaque' ? tx('Opaco: no deja pasar la luz → sombra oscura.', 'Opaco: noheja’ỹi tesape → kuarahy’ã hũ.') : shadowKind === 'translucent' ? tx('Translúcido: deja pasar luz difusa → sombra suave.', 'Translúcido: oheja tesape difuso → kuarahy’ã kangy.') : tx('Transparente: deja pasar casi toda la luz → casi no hay sombra.', 'Transparente: oheja haimete opa tesape → ndaipóri kuarahy’ã.')}</Verdict></>;
    footer = tx('Cuanto más cerca de la lámpara, más grande la sombra (triángulos semejantes).', 'Lámpara ypyvévo, kuarahy’ã tuichave.');
    scene = s.node;
  } else if (view === 'snell') {
    const m1 = MEDIA.find(m => m.id === n1), m2 = MEDIA.find(m => m.id === n2);
    const s = SnellScene({ n1: m1.n, n2: m2.n, theta1, tx });
    title = tx('Refracción: ley de Snell', 'Refracción: Snell ley'); subtitle = tx('Al cambiar de medio la luz cambia de velocidad y se desvía: n₁·sen θ₁ = n₂·sen θ₂.', 'Medio okambiávo tesape okambia velocidad ha ijere: n₁·sen θ₁ = n₂·sen θ₂.');
    controls = prism ? <button type="button" className="sim-btn" onClick={() => setPrism(false)}>{tx('Volver a Snell', 'Jevy Snell-pe')}</button> : <>
      <Choice label={tx('Medio de arriba', 'Medio yvategua')} options={MEDIA.map(m => ({ id: m.id, label: tx(m.es, m.gn) }))} value={n1} onChange={setN1} />
      <Choice label={tx('Medio de abajo', 'Medio yvygua')} options={MEDIA.map(m => ({ id: m.id, label: tx(m.es, m.gn) }))} value={n2} onChange={setN2} />
      <Slider label={tx('Ángulo de incidencia', 'Incidencia ángulo')} value={theta1} min={0} max={89} step={1} unit="°" onChange={setTheta1} />
      <button type="button" className="sim-btn" onClick={() => setPrism(true)}>{tx('Ver el prisma (dispersión)', 'Ehecha prisma (dispersión)')}</button>
    </>;
    readouts = prism ? <Verdict tone="info">{tx('Cada color tiene un índice de refracción un poco distinto: el prisma los separa (dispersión).', 'Káda sa’y oguereko índice iñambuéva: prisma omboja’o (dispersión).')}</Verdict> : <>
      <Readouts items={[{ label: 'θ₁', value: theta1, unit: '°', tone: 'amber' }, { label: 'θ₂', value: s.theta2 ?? '—', unit: s.theta2 === null ? '' : '°', tone: 'red', digits: 1 }, { label: tx('Ángulo crítico', 'Ángulo crítico'), value: s.critical ?? '—', unit: s.critical ? '°' : '', tone: 'violet', digits: 1 }]} />
      <Verdict tone={s.total ? 'warn' : 'info'}>{s.total ? tx('¡Reflexión total! Toda la luz vuelve al primer medio (así funciona la fibra óptica).', '¡Reflexión total! Opa tesape ojevy peteĩha medio-pe (fibra óptica ramo).') : m2.n > m1.n ? tx('Entra a un medio más refringente: se acerca a la normal.', 'Oike medio n tuichavévape: oñemboja normal-re.') : m2.n < m1.n ? tx('Pasa a un medio menos refringente: se aleja de la normal.', 'Ohasa medio n michĩvévape: oñemomombyry normal-gui.') : tx('Mismo medio: no se desvía.', 'Peteĩ medio: ndojereiri.')}</Verdict></>;
    footer = 'n₁·sen θ₁ = n₂·sen θ₂ ; sen θc = n₂ / n₁';
    scene = prism ? <PrismScene tx={tx} /> : s.node;
  } else {
    const isMirror = view === 'mirror';
    const s = isMirror ? MirrorScene({ kind: mirror, f, dObj, hObj, tx }) : LensScene({ kind: lens, f, dObj, hObj, tx });
    title = isMirror ? tx('Espejos', 'Espejo') : tx('Lentes', 'Lente');
    subtitle = isMirror ? tx('La imagen se ubica con los rayos principales y con 1/f = 1/dₒ + 1/dᵢ (rayos cerca del eje: condiciones de Gauss).', 'Imagen ojejuhu rayo principal ha 1/f = 1/dₒ + 1/dᵢ reheve.') : tx('Convergente: junta los rayos en el foco. Divergente: los separa.', 'Convergente: ombyaty rayo foco-pe. Divergente: omboja’o.');
    controls = <>
      {isMirror ? <Choice label={tx('Tipo de espejo', 'Espejo tipo')} options={[{ id: 'plane', label: tx('Plano', 'Plano') }, { id: 'concave', label: tx('Cóncavo', 'Cóncavo') }, { id: 'convex', label: tx('Convexo', 'Convexo') }]} value={mirror} onChange={setMirror} />
        : <Choice label={tx('Tipo de lente', 'Lente tipo')} options={[{ id: 'converging', label: tx('Convergente', 'Convergente') }, { id: 'diverging', label: tx('Divergente', 'Divergente') }]} value={lens} onChange={setLens} />}
      {!(isMirror && mirror === 'plane') && <Slider label={tx('Distancia focal', 'Distancia focal')} value={f} min={8} max={30} step={1} unit="cm" onChange={setF} />}
      <Slider label={tx('Distancia del objeto', 'Objeto distancia')} value={dObj} min={5} max={85} step={1} unit="cm" onChange={setDObj} />
      <Slider label={tx('Altura del objeto', 'Objeto yvatekue')} value={hObj} min={4} max={20} step={1} unit="cm" onChange={setHObj} />
    </>;
    const A = -s.di / dObj;
    readouts = <>
      <Readouts items={[{ label: 'dᵢ', value: s.di, unit: 'cm', tone: 'violet' }, { label: tx('Aumento A', 'Aumento A'), value: A, unit: '×', tone: 'blue' }, { label: tx('Altura imagen', 'Imagen yvatekue'), value: Math.abs(s.hi), unit: 'cm', tone: 'green' }]} />
      <Verdict tone="info">{!Number.isFinite(s.di) || Math.abs(s.di) > 400 ? tx('El objeto está en el foco: los rayos salen paralelos, no se forma imagen.', 'Objeto oĩ foco-pe: rayo osẽ paralelo, ndojejapói imagen.') : `${s.real ? tx('Real', 'Real') : tx('Virtual', 'Virtual')}, ${A < 0 ? tx('invertida', 'ojere') : tx('derecha', 'derecha')}, ${Math.abs(A) > 1.02 ? tx('más grande', 'tuichave') : Math.abs(A) < 0.98 ? tx('más chica', 'michĩve') : tx('del mismo tamaño', 'peteĩ tamaño')}.`}</Verdict>
    </>;
    footer = isMirror ? '1/f = 1/dₒ + 1/dᵢ ; A = −dᵢ/dₒ ; f = R/2 (f < 0 en espejos convexos)' : '1/f = 1/dₒ + 1/dᵢ ; A = −dᵢ/dₒ ; P = 1/f (dioptrías)';
    scene = s.node;
  }

  return <Sim title={title} subtitle={subtitle} actions={tabs} controls={controls} readouts={readouts} footer={footer}>
    <Stage width={640} height={380} label={title}>{scene}</Stage>
  </Sim>;
}
