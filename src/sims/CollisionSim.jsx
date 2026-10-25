// Choques en un riel de aire: elástico o perfectamente inelástico. Muestra la
// cantidad de movimiento antes y después (se conserva) y la energía cinética.
import { useEffect, useMemo, useState } from 'react';
import { Sim, Stage, Slider, Choice, PlayBar, Readouts, Verdict, Arrow, useSimClock, useTx, num, INK, COLORS, VECTOR } from './SimKit.jsx';

const TRACK_M = 10, L = 30, R = 610, CART = 0.7;
const sx = x => L + (x / TRACK_M) * (R - L);

function simulate({ m1, m2, v1, v2, type }) {
  // Posiciones iniciales y tiempo de choque.
  const x1 = 2, x2 = 7.3;
  const closing = v1 - v2;
  const tHit = closing > 0 ? (x2 - x1 - CART) / closing : Infinity;
  let u1 = v1, u2 = v2;
  if (type === 'elastic') {
    u1 = ((m1 - m2) * v1 + 2 * m2 * v2) / (m1 + m2);
    u2 = ((m2 - m1) * v2 + 2 * m1 * v1) / (m1 + m2);
  } else {
    u1 = u2 = (m1 * v1 + m2 * v2) / (m1 + m2);
  }
  const at = t => {
    if (t <= tHit) return { a: x1 + v1 * t, b: x2 + v2 * t, va: v1, vb: v2, hit: false };
    const dt = t - tHit;
    const a0 = x1 + v1 * tHit, b0 = x2 + v2 * tHit;
    return { a: a0 + u1 * dt, b: b0 + u2 * dt, va: u1, vb: u2, hit: true };
  };
  return { tHit, u1, u2, at };
}

function Cart({ x, color, mass, v }) {
  const w = (CART / TRACK_M) * (R - L);
  return <g>
    <rect x={sx(x)} y="150" width={w} height="34" rx="6" fill={color} stroke={INK} strokeWidth="2.2" />
    <text x={sx(x) + w / 2} y="172" textAnchor="middle" style={{ font: '800 12px system-ui', fill: INK }}>{mass} kg</text>
    {Math.abs(v) > 0.05 && <Arrow x1={sx(x) + w / 2} y1={134} x2={sx(x) + w / 2 + v * 14} y2={134} color={VECTOR.v} label={`${num(v)} m/s`} labelDx={v > 0 ? 4 : -60} labelDy={-6} />}
  </g>;
}

export default function CollisionSim() {
  const tx = useTx();
  const [type, setType] = useState('elastic');
  const [m1, setM1] = useState(2);
  const [m2, setM2] = useState(1);
  const [v1, setV1] = useState(3);
  const [v2, setV2] = useState(-1);
  const result = useMemo(() => simulate({ m1, m2, v1, v2, type }), [m1, m2, v1, v2, type]);
  const clock = useSimClock({ maxTime: 12 });
  const now = result.at(clock.time);
  const outside = now.a < -1 || now.b > TRACK_M + 1 || now.a > TRACK_M + 1 || now.b < -1;
  useEffect(() => { if (outside && clock.running) clock.setRunning(false); }, [outside, clock]);
  const change = setter => value => { setter(value); clock.reset(); };
  const pBefore = m1 * v1 + m2 * v2, pAfter = m1 * result.u1 + m2 * result.u2;
  const kBefore = 0.5 * m1 * v1 * v1 + 0.5 * m2 * v2 * v2, kAfter = 0.5 * m1 * result.u1 ** 2 + 0.5 * m2 * result.u2 ** 2;
  const noHit = !Number.isFinite(result.tHit);

  return <Sim
    title={tx('Choques y cantidad de movimiento', 'Choque ha cantidad de movimiento')}
    subtitle={tx('En todo choque sin fuerzas externas, la cantidad de movimiento total se conserva.', 'Opa choque-pe fuerza externa’ỹre, cantidad de movimiento total oñeñongatu.')}
    actions={<Choice options={[{ id: 'elastic', label: tx('Elástico (rebotan)', 'Elástico (opo jey)') }, { id: 'inelastic', label: tx('Inelástico (se pegan)', 'Inelástico (ojoaju)') }]} value={type} onChange={change(setType)} />}
    controls={<>
      <PlayBar running={clock.running} onToggle={clock.toggle} onReset={clock.reset} time={clock.time} />
      <Slider label={tx('Masa carrito A', 'Carrito A masa')} value={m1} min={0.5} max={5} step={0.5} unit="kg" onChange={change(setM1)} />
      <Slider label={tx('Velocidad A', 'Velocidad A')} value={v1} min={-2} max={5} step={0.5} unit="m/s" onChange={change(setV1)} />
      <Slider label={tx('Masa carrito B', 'Carrito B masa')} value={m2} min={0.5} max={5} step={0.5} unit="kg" onChange={change(setM2)} />
      <Slider label={tx('Velocidad B', 'Velocidad B')} value={v2} min={-5} max={2} step={0.5} unit="m/s" onChange={change(setV2)} />
    </>}
    readouts={<>
      <Readouts items={[
        { label: tx('p antes', 'p mboyve'), value: pBefore, unit: 'kg·m/s', tone: 'blue' },
        { label: tx('p después', 'p rire'), value: noHit ? pBefore : pAfter, unit: 'kg·m/s', tone: 'blue' },
        { label: tx('Ec antes', 'Ec mboyve'), value: kBefore, unit: 'J', tone: 'green' },
        { label: tx('Ec después', 'Ec rire'), value: noHit ? kBefore : kAfter, unit: 'J', tone: 'green' },
      ]} />
      {noHit ? <Verdict tone="warn">{tx('Así no chocan: A tiene que ir más rápido hacia B.', 'Péicha noñembotyryi: A oho va’erã pya’eve B gotyo.')}</Verdict>
        : <Verdict tone="good">{type === 'elastic' ? tx('Elástico: se conservan p y la energía cinética.', 'Elástico: oñeñongatu p ha energía cinética.') : tx(`Inelástico: p se conserva, pero se pierden ${num(kBefore - kAfter)} J de energía cinética (calor, deformación).`, `Inelástico: p oñeñongatu, okañy katu ${num(kBefore - kAfter)} J energía cinética.`)}</Verdict>}
    </>}
    footer="p = m·v ; m₁v₁ + m₂v₂ = m₁v₁′ + m₂v₂′"
  >
    <Stage width={640} height={250} label={tx('Riel con dos carritos', 'Riel mokõi carrito reheve')}>
      <rect x={L - 10} y="186" width={R - L + 20} height="16" rx="4" fill="#cbd5e1" stroke={INK} strokeWidth="2" />
      {Array.from({ length: 30 }, (_, i) => <circle key={i} cx={L + i * 20} cy="194" r="2" fill="#64748b" />)}
      {Array.from({ length: TRACK_M + 1 }, (_, i) => i).map(m => <g key={m}><line x1={sx(m)} y1="204" x2={sx(m)} y2="212" stroke={INK} /><text x={sx(m)} y="226" textAnchor="middle" className="sim-tick">{m} m</text></g>)}
      <Cart x={now.a} color="#fbbf24" mass={m1} v={now.va} />
      <Cart x={now.b} color="#93c5fd" mass={m2} v={now.vb} />
      {now.hit && type === 'inelastic' && <text x={sx(now.a) + 40} y="120" textAnchor="middle" className="sim-label" fill={COLORS.red}>{tx('¡se pegaron!', '¡ojoaju!')}</text>}
    </Stage>
  </Sim>;
}
