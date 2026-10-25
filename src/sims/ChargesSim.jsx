// Electrostática: electrización por contacto (las cargas se reparten),
// Ley de Coulomb entre dos cargas, campo eléctrico (vectores y una sonda que
// se arrastra) y potencial eléctrico (mapa de colores).
import { useMemo, useRef, useState } from 'react';
import { Sim, Stage, Slider, Choice, Readouts, Verdict, Arrow, Toggle, useFrame, useTx, num, INK, COLORS } from './SimKit.jsx';

const K = 9e9;
const W = 640, H = 360, PX_PER_M = 400; // 1,6 m de ancho

function chargeColor(q) { return q > 0 ? COLORS.red : q < 0 ? COLORS.blue : '#94a3b8'; }
function ChargeBall({ x, y, q, r = 20 }) {
  return <g>
    <circle cx={x} cy={y} r={r} fill={chargeColor(q)} stroke={INK} strokeWidth="2.2" />
    <text x={x} y={y + 6} textAnchor="middle" style={{ font: '900 18px system-ui', fill: '#fff' }}>{q > 0 ? '+' : q < 0 ? '−' : '0'}</text>
    <text x={x} y={y + r + 18} textAnchor="middle" className="sim-label sim-label-small" fill={INK}>{num(q)} µC</text>
  </g>;
}

function fieldAt(charges, px, py) {
  let ex = 0, ey = 0, v = 0;
  for (const c of charges) {
    const dx = (px - c.x) / PX_PER_M, dy = (py - c.y) / PX_PER_M;
    const r2 = dx * dx + dy * dy;
    if (r2 < 1e-6) continue;
    const r = Math.sqrt(r2);
    const e = (K * c.q * 1e-6) / r2;
    ex += (e * dx) / r; ey += (e * dy) / r;
    v += (K * c.q * 1e-6) / r;
  }
  return { ex, ey, e: Math.hypot(ex, ey), v };
}

// Hook (usa estado propio): por eso se llama siempre, en el mismo orden.
function useElectrize(tx) {
  const [qa, setQa] = useState(8);
  const [qb, setQb] = useState(-2);
  const [phase, setPhase] = useState(0); // 0 separadas, 0..1 acercándose, 1 tocando, 2 separadas tras tocar
  const anim = useRef(0);
  const [, tick] = useState(0);
  const touching = phase > 0;
  useFrame(dt => { anim.current = Math.min(2, anim.current + dt * 0.9); if (anim.current >= 2) setPhase(2); tick(n => n + 1); }, phase === 1);
  const a = anim.current;
  const gap = phase === 0 ? 160 : a < 1 ? 160 * (1 - a) : 160 * (a - 1);
  const shared = (qa + qb) / 2;
  const after = a >= 1;
  const showA = after ? shared : qa, showB = after ? shared : qb;
  const electrons = Math.abs(qa - shared) * 1e-6 / 1.6e-19;
  const dots = (q, cx) => Array.from({ length: Math.min(12, Math.round(Math.abs(q))) }, (_, i) => { const ang = (i / 12) * Math.PI * 2; return <text key={i} x={cx + Math.cos(ang) * 30} y={175 + Math.sin(ang) * 30 + 5} textAnchor="middle" style={{ font: '900 14px system-ui', fill: q > 0 ? COLORS.red : COLORS.blue }}>{q > 0 ? '+' : '−'}</text>; });
  const xa = 320 - 45 - gap / 2, xb = 320 + 45 + gap / 2;
  return { controls: <>
    <Slider label={tx('Carga de la esfera A', 'Esfera A carga')} value={qa} min={-10} max={10} step={1} unit="µC" onChange={value => { setQa(value); setPhase(0); anim.current = 0; }} />
    <Slider label={tx('Carga de la esfera B', 'Esfera B carga')} value={qb} min={-10} max={10} step={1} unit="µC" onChange={value => { setQb(value); setPhase(0); anim.current = 0; }} />
    <button type="button" className="sim-btn is-primary" onClick={() => { anim.current = 0; setPhase(1); }} disabled={phase === 1}>{tx('Juntarlas y separarlas', 'Embojoaju ha emboja’o')}</button>
  </>, readouts: <>
    <Readouts items={[{ label: 'A', value: showA, unit: 'µC', tone: 'red' }, { label: 'B', value: showB, unit: 'µC', tone: 'blue' }, { label: tx('Carga total', 'Carga total'), value: qa + qb, unit: 'µC', tone: 'violet' }, { label: tx('Electrones que pasaron', 'Electrón ohasáva'), value: after ? electrons : 0, tone: 'green' }]} />
    <Verdict tone="info">{after ? tx('Esferas iguales se reparten la carga en partes iguales. La carga total se conserva.', 'Esfera peteĩchagua omboja’o carga peteĩcha. Carga total oñeñongatu.') : tx('Tocá el botón: los electrones pasan de una esfera a la otra.', 'Epoko botón: electrón ohasa peteĩ esfera-gui ambuépe.')}</Verdict>
  </>, scene: <>
    {[xa, xb].map((x, i) => <g key={i}><rect x={x - 4} y="215" width="8" height="90" fill="#94a3b8" stroke={INK} /><rect x={x - 30} y="300" width="60" height="10" rx="3" fill="#64748b" /></g>)}
    <circle cx={xa} cy="175" r="44" fill="#e2e8f0" stroke={INK} strokeWidth="2.4" />
    <circle cx={xb} cy="175" r="44" fill="#e2e8f0" stroke={INK} strokeWidth="2.4" />
    {dots(showA, xa)}{dots(showB, xb)}
    <text x={xa} y="112" textAnchor="middle" className="sim-label" fill={INK}>A · {num(showA)} µC</text>
    <text x={xb} y="112" textAnchor="middle" className="sim-label" fill={INK}>B · {num(showB)} µC</text>
    {touching && a > 0.85 && a < 1.15 && <text x="320" y="60" textAnchor="middle" className="sim-label" fill={COLORS.violet}>{tx('¡contacto!', '¡ojopoko!')}</text>}
  </> };
}

export default function ChargesSim({ mode = 'coulomb' }) {
  const tx = useTx();
  const [view, setView] = useState(mode);
  const [q1, setQ1] = useState(3);
  const [q2, setQ2] = useState(-2);
  const [dist, setDist] = useState(0.6);
  const [showVectors, setShowVectors] = useState(true);
  const [showMap, setShowMap] = useState(mode === 'potential');
  const [probe, setProbe] = useState({ x: 320, y: 90 });
  const svgRef = useRef(null);
  const electrize = useElectrize(tx);
  const c1 = { x: W / 2 - (dist * PX_PER_M) / 2, y: H / 2, q: q1 };
  const c2 = { x: W / 2 + (dist * PX_PER_M) / 2, y: H / 2, q: q2 };
  const F = (K * Math.abs(q1 * 1e-6 * q2 * 1e-6)) / (dist * dist);
  const attract = q1 * q2 < 0;
  const charges = [c1, c2].filter(c => c.q !== 0);
  const grid = useMemo(() => {
    const cells = [];
    for (let y = 20; y < H; y += 40) for (let x = 20; x < W; x += 40) cells.push({ x, y, ...fieldAt(charges, x, y) });
    return cells;
  }, [q1, q2, dist]); // eslint-disable-line react-hooks/exhaustive-deps
  const map = useMemo(() => {
    if (!showMap) return [];
    const cells = [];
    for (let y = 0; y < H; y += 16) for (let x = 0; x < W; x += 16) cells.push({ x, y, v: fieldAt(charges, x + 8, y + 8).v });
    return cells;
  }, [q1, q2, dist, showMap]); // eslint-disable-line react-hooks/exhaustive-deps
  const probeField = fieldAt(charges, probe.x, probe.y);
  const dragProbe = event => {
    if (event.buttons !== 1 && event.type !== 'pointerdown') return;
    const svg = svgRef.current?.querySelector('svg');
    if (!svg) return;
    const point = svg.createSVGPoint(); point.x = event.clientX; point.y = event.clientY;
    const local = point.matrixTransform(svg.getScreenCTM().inverse());
    setProbe({ x: Math.max(10, Math.min(W - 10, local.x)), y: Math.max(10, Math.min(H - 10, local.y)) });
  };
  const tabs = <Choice options={[{ id: 'electrize', label: tx('Contacto', 'Contacto') }, { id: 'coulomb', label: 'Coulomb' }, { id: 'field', label: tx('Campo', 'Campo') }, { id: 'potential', label: tx('Potencial', 'Potencial') }]} value={view} onChange={next => { setView(next); setShowMap(next === 'potential'); }} />;

  if (view === 'electrize') {
    return <Sim title={tx('Electrización por contacto', 'Electrización contacto rupi')} subtitle={tx('Al tocarse, los electrones pasan de una esfera a la otra hasta repartir la carga.', 'Ojopokóvo, electrón ohasa peteĩ esfera-gui ambuépe omboja’o peve carga.')} actions={tabs} controls={electrize.controls} readouts={electrize.readouts} footer="q = n·e ; e = 1,6 × 10⁻¹⁹ C">
      <Stage width={W} height={H} label={tx('Dos esferas metálicas', 'Mokõi esfera metálica')}>{electrize.scene}</Stage>
    </Sim>;
  }

  const sizeF = Math.min(120, 18 * Math.log10(1 + F * 50));
  const v = view;
  return <Sim
    title={v === 'coulomb' ? tx('Ley de Coulomb', 'Ley de Coulomb') : v === 'field' ? tx('Campo eléctrico', 'Campo eléctrico') : tx('Potencial eléctrico', 'Potencial eléctrico')}
    subtitle={v === 'coulomb' ? tx('Cargas iguales se repelen y distintas se atraen; la fuerza cae con el cuadrado de la distancia.', 'Carga peteĩchagua ojoity, ojoavýva ojoguerahauka; fuerza oguejy distancia cuadrado ndive.') : v === 'field' ? tx('Las flechas muestran hacia dónde empujaría una carga positiva. Arrastrá la sonda.', 'Flecha ohechauka moõ gotyo omosẽta carga positiva. Emongu’e sonda.') : tx('Rojo: potencial alto (cerca de cargas +). Azul: bajo (cerca de cargas −). Arrastrá la sonda.', 'Pytã: potencial yvate. Hovy: karape. Emongu’e sonda.')}
    actions={tabs}
    controls={<>
      <Slider label="q₁" value={q1} min={-8} max={8} step={1} unit="µC" onChange={setQ1} />
      <Slider label="q₂" value={q2} min={-8} max={8} step={1} unit="µC" onChange={setQ2} />
      <Slider label={tx('Distancia', 'Distancia')} value={dist} min={0.2} max={1.2} step={0.05} unit="m" onChange={setDist} />
      {v !== 'coulomb' && <>
        <Toggle label={tx('Vectores de campo', 'Campo vector')} checked={showVectors} onChange={setShowVectors} />
        <Toggle label={tx('Mapa de potencial', 'Potencial mapa')} checked={showMap} onChange={setShowMap} />
      </>}
    </>}
    readouts={v === 'coulomb' ? <>
      <Readouts items={[{ label: tx('Fuerza', 'Fuerza'), value: F, unit: 'N', tone: 'red' }, { label: 'k', value: K, unit: 'N·m²/C²', tone: 'violet' }]} />
      <Verdict tone={q1 * q2 === 0 ? 'info' : attract ? 'good' : 'warn'}>{q1 * q2 === 0 ? tx('Una carga es cero: no hay fuerza.', 'Peteĩ carga ha’e cero: ndaipóri fuerza.') : attract ? tx('Signos distintos: se atraen.', 'Signo ojoavýva: ojoguerahauka.') : tx('Mismo signo: se repelen.', 'Peteĩ signo: ojoity.')}</Verdict>
    </> : <Readouts items={[{ label: tx('Campo en la sonda', 'Campo sonda-pe'), value: probeField.e, unit: 'N/C', tone: 'red' }, { label: tx('Potencial en la sonda', 'Potencial sonda-pe'), value: probeField.v, unit: 'V', tone: 'violet' }]} />}
    footer={v === 'coulomb' ? 'F = k·|q₁·q₂| / d²' : v === 'field' ? 'E = k·Q / d² (se suman como vectores)' : 'V = k·Q / d (se suman como números)'}
  >
    <div ref={svgRef} onPointerDown={v !== 'coulomb' ? dragProbe : undefined} onPointerMove={v !== 'coulomb' ? dragProbe : undefined}>
      <Stage width={W} height={H} label={tx('Cargas eléctricas', 'Carga eléctrica')}>
        {showMap && v !== 'coulomb' && map.map((cell, i) => { const s = Math.tanh(cell.v / 2e5); return <rect key={i} x={cell.x} y={cell.y} width="16" height="16" fill={s > 0 ? `rgba(225,29,72,${Math.abs(s) * 0.55})` : `rgba(29,91,216,${Math.abs(s) * 0.55})`} />; })}
        {showVectors && v !== 'coulomb' && grid.map((cell, i) => { if (cell.e < 1) return null; const len = 14; const ux = cell.ex / cell.e, uy = cell.ey / cell.e; const alpha = Math.min(1, 0.25 + Math.log10(cell.e) / 7); return <Arrow key={i} x1={cell.x - ux * len / 2} y1={cell.y - uy * len / 2} x2={cell.x + ux * len / 2} y2={cell.y + uy * len / 2} color={`rgba(27,42,65,${alpha})`} width={1.6} head={6} />; })}
        {v === 'coulomb' && <line x1={c1.x} y1={H / 2 + 50} x2={c2.x} y2={H / 2 + 50} stroke={INK} strokeWidth="1.2" />}
        {v === 'coulomb' && <text x={W / 2} y={H / 2 + 66} textAnchor="middle" className="sim-label sim-label-small" fill={INK}>d = {num(dist)} m</text>}
        {v === 'coulomb' && q1 * q2 !== 0 && <>
          <Arrow x1={c1.x} y1={H / 2} x2={c1.x + (attract ? 1 : -1) * (24 + sizeF)} y2={H / 2} color={COLORS.violet} label="F" labelDy={-12} width={4} />
          <Arrow x1={c2.x} y1={H / 2} x2={c2.x + (attract ? -1 : 1) * (24 + sizeF)} y2={H / 2} color={COLORS.violet} label="F" labelDy={-12} width={4} />
        </>}
        <ChargeBall x={c1.x} y={c1.y} q={q1} />
        <ChargeBall x={c2.x} y={c2.y} q={q2} />
        {v !== 'coulomb' && <g>
          {probeField.e > 1 && <Arrow x1={probe.x} y1={probe.y} x2={probe.x + (probeField.ex / probeField.e) * 40} y2={probe.y + (probeField.ey / probeField.e) * 40} color={COLORS.green} label="E" width={3} />}
          <circle cx={probe.x} cy={probe.y} r="9" fill="#fff" stroke={COLORS.green} strokeWidth="3" style={{ cursor: 'grab' }} />
          <text x={probe.x + 12} y={probe.y + 22} className="sim-label sim-label-small" fill={COLORS.green}>{tx('sonda', 'sonda')}</text>
        </g>}
      </Stage>
    </div>
  </Sim>;
}
