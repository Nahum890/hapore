// Ley de Hooke: resorte colgado con una masa. Estiramiento de equilibrio
// x = m·g/k, gráfico F–x y oscilación al soltarlo (período 2π·√(m/k)).
import { useState } from 'react';
import { Sim, Stage, Slider, PlayBar, Readouts, Graph, Arrow, useSimClock, useTx, num, INK, COLORS, VECTOR } from './SimKit.jsx';

const G = 9.8;
const TOP = 40, PX_PER_CM = 6;

function springPath(x, y0, length, coils = 12, width = 22) {
  const lead = 14;
  const body = Math.max(10, length - 2 * lead);
  let d = `M${x} ${y0} L${x} ${y0 + lead}`;
  for (let i = 0; i < coils; i += 1) {
    const yA = y0 + lead + (body * (i + 0.25)) / coils;
    const yB = y0 + lead + (body * (i + 0.75)) / coils;
    d += ` L${x + width / 2} ${yA} L${x - width / 2} ${yB}`;
  }
  return `${d} L${x} ${y0 + lead + body} L${x} ${y0 + length}`;
}

export default function SpringSim() {
  const tx = useTx();
  const [k, setK] = useState(50);
  const [m, setM] = useState(0.5);
  const [pull, setPull] = useState(4);
  const clock = useSimClock();
  const t = clock.time;
  const xEq = (m * G) / k * 100; // cm
  const omega = Math.sqrt(k / m);
  const period = (2 * Math.PI) / omega;
  const offset = clock.running || t > 0 ? pull * Math.cos(omega * t) * Math.exp(-0.08 * t) : 0;
  const x = xEq + offset;
  const natural = 120;
  const length = natural + x * PX_PER_CM;
  const SX = 230;
  const massY = TOP + length;
  const box = 46 + m * 12;
  const F = k * x / 100;
  const change = setter => value => { setter(value); clock.reset(); };
  const fMax = Math.max(k * 0.3, F * 1.2);

  return <Sim
    title={tx('Ley de Hooke', 'Ley de Hooke')}
    subtitle={tx('El resorte se estira en proporción a la fuerza: F = k·x. Tirá y soltalo para ver cómo oscila.', 'Resorte ojepyso fuerza ndive proporción-pe: F = k·x. Emosẽ ha eheja ehecha hag̃ua oñemomýi.')}
    controls={<>
      <PlayBar running={clock.running} onToggle={clock.toggle} onReset={clock.reset} time={t} />
      <Slider label={tx('Constante k', 'Constante k')} value={k} min={10} max={300} step={5} unit="N/m" onChange={change(setK)} />
      <Slider label={tx('Masa colgada', 'Masa oñekuãva')} value={m} min={0.1} max={2} step={0.1} unit="kg" onChange={change(setM)} />
      <Slider label={tx('Cuánto lo estirás al soltar', 'Mboy reipyso reheja mboyve')} value={pull} min={0} max={10} step={0.5} unit="cm" onChange={change(setPull)} />
    </>}
    readouts={<Readouts items={[
      { label: tx('Estiramiento x', 'Ñepyso x'), value: x, unit: 'cm', tone: 'blue' },
      { label: tx('Fuerza del resorte', 'Resorte fuerza'), value: F, unit: 'N', tone: 'red' },
      { label: tx('x de equilibrio', 'x equilibrio'), value: xEq, unit: 'cm', tone: 'green' },
      { label: tx('Período', 'Período'), value: period, unit: 's', tone: 'violet' },
    ]} />}
    graphs={<Graph title={tx('Fuerza vs. estiramiento (F–x)', 'Fuerza vs. ñepyso (F–x)')} xLabel="x (cm)" yLabel="F (N)" xMax={Math.max(30, xEq + pull + 2)} yMin={0} yMax={fMax}
      series={[{ points: [[0, 0], [Math.max(30, xEq + pull + 2), k * Math.max(30, xEq + pull + 2) / 100]], color: COLORS.blue, label: `F = ${num(k)}·x` }]} marker={[x, F]} />}
    footer={tx('La pendiente de la recta F–x es la constante k. T = 2π·√(m/k).', 'Recta F–x pendiente ha’e constante k. T = 2π·√(m/k).')}
  >
    <Stage width={520} height={Math.max(380, massY + box + 50)} label={tx('Resorte con masa', 'Resorte masa reheve')}>
      <rect x={SX - 90} y={TOP - 18} width="180" height="18" fill="#cbd5e1" stroke={INK} strokeWidth="1.8" />
      {Array.from({ length: 9 }, (_, i) => <line key={i} x1={SX - 86 + i * 21} y1={TOP - 18} x2={SX - 76 + i * 21} y2={TOP - 28} stroke={INK} strokeWidth="1.2" />)}
      {/* Regla en cm desde el largo natural */}
      <line x1={SX + 70} y1={TOP + natural} x2={SX + 70} y2={TOP + natural + 40 * PX_PER_CM} stroke={INK} strokeWidth="1.3" />
      {Array.from({ length: 41 }, (_, i) => i).map(cm => <g key={cm}>
        <line x1={SX + 70} y1={TOP + natural + cm * PX_PER_CM} x2={SX + (cm % 5 === 0 ? 82 : 76)} y2={TOP + natural + cm * PX_PER_CM} stroke={INK} strokeWidth="1" />
        {cm % 5 === 0 && <text x={SX + 88} y={TOP + natural + cm * PX_PER_CM + 4} className="sim-tick">{cm}</text>}
      </g>)}
      <text x={SX + 70} y={TOP + natural - 8} textAnchor="middle" className="sim-tick sim-tick-unit">x (cm)</text>
      <line x1={SX - 70} y1={TOP + natural} x2={SX + 70} y2={TOP + natural} stroke={COLORS.green} strokeDasharray="5 4" />
      <text x={SX - 74} y={TOP + natural + 4} textAnchor="end" className="sim-label sim-label-small" fill={COLORS.green}>{tx('largo natural', 'largo natural')}</text>
      <path d={springPath(SX, TOP, length)} fill="none" stroke={INK} strokeWidth="2.6" strokeLinejoin="round" />
      <rect x={SX - box / 2} y={massY} width={box} height={box} rx="5" fill="#94a3b8" stroke={INK} strokeWidth="2.2" />
      <text x={SX} y={massY + box / 2 + 5} textAnchor="middle" style={{ font: '800 12px system-ui', fill: '#fff' }}>{num(m)} kg</text>
      <line x1={SX + box / 2} y1={massY} x2={SX + 70} y2={massY} stroke={COLORS.blue} strokeWidth="1.5" strokeDasharray="3 3" />
      <Arrow x1={SX - box / 2 - 14} y1={massY + box / 2} x2={SX - box / 2 - 14} y2={massY + box / 2 - Math.min(90, F * 8)} color={VECTOR.force} label="F" labelDx={-16} />
      <Arrow x1={SX - box / 2 - 30} y1={massY + box / 2} x2={SX - box / 2 - 30} y2={massY + box / 2 + Math.min(90, m * G * 8)} color={COLORS.earth} label="P" labelDx={-16} labelDy={10} />
    </Stage>
  </Sim>;
}
