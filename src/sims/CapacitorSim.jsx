// Condensadores: dos condensadores en serie o en paralelo conectados a una
// pila. Al cerrar el interruptor se cargan (q = Q·(1 − e^(−t/τ))) y se ve la
// carga en las placas, la capacidad equivalente y la energía guardada.
import { useState } from 'react';
import { Sim, Stage, Slider, Choice, PlayBar, Readouts, Verdict, useSimClock, useTx, num, INK, COLORS } from './SimKit.jsx';

function Capacitor({ x, y, q, qMax, label }) {
  const marks = Math.round(Math.min(8, (q / Math.max(qMax, 1e-9)) * 8));
  return <g>
    <line x1={x - 14} y1={y - 40} x2={x - 14} y2={y + 40} stroke={INK} strokeWidth="5" />
    <line x1={x + 14} y1={y - 40} x2={x + 14} y2={y + 40} stroke={INK} strokeWidth="5" />
    {Array.from({ length: marks }, (_, i) => <g key={i}>
      <text x={x - 26} y={y - 34 + i * 10} textAnchor="middle" style={{ font: '900 11px system-ui', fill: COLORS.red }}>+</text>
      <text x={x + 26} y={y - 34 + i * 10} textAnchor="middle" style={{ font: '900 11px system-ui', fill: COLORS.blue }}>−</text>
    </g>)}
    {marks > 0 && Array.from({ length: 5 }, (_, i) => <line key={i} x1={x - 10} y1={y - 30 + i * 15} x2={x + 10} y2={y - 30 + i * 15} stroke={COLORS.violet} strokeWidth="1.2" opacity={0.25 + 0.7 * (q / qMax)} />)}
    <text x={x} y={y + 62} textAnchor="middle" className="sim-label sim-label-small" fill={INK}>{label}</text>
  </g>;
}

export default function CapacitorSim() {
  const tx = useTx();
  const [layout, setLayout] = useState('parallel');
  const [C1, setC1] = useState(10);
  const [C2, setC2] = useState(22);
  const [V, setV] = useState(12);
  const clock = useSimClock({ maxTime: 6 });
  const Ceq = layout === 'parallel' ? C1 + C2 : (C1 * C2) / (C1 + C2);
  const Qtot = Ceq * V; // µC
  const tau = 0.9;
  const k = 1 - Math.exp(-clock.time / tau);
  const Q1 = layout === 'parallel' ? C1 * V : Qtot;
  const Q2 = layout === 'parallel' ? C2 * V : Qtot;
  const V1 = Q1 / C1, V2 = Q2 / C2;
  const U = 0.5 * Ceq * 1e-6 * V * V;
  const qMax = Math.max(Q1, Q2);
  const change = setter => value => { setter(value); clock.reset(); };
  const wire = d => <path d={d} fill="none" stroke={INK} strokeWidth="3.2" strokeLinejoin="round" />;

  return <Sim title={tx('Condensadores', 'Condensador')} subtitle={layout === 'parallel' ? tx('En paralelo los dos tienen el mismo voltaje y las capacidades se suman.', 'Paralelo-pe mokõivéva oguereko peteĩ voltaje ha capacidad oñesuma.') : tx('En serie los dos guardan la misma carga y la capacidad equivalente es menor.', 'Serie-pe mokõivéva oñongatu peteĩ carga ha capacidad equivalente michĩve.')}
    actions={<Choice options={[{ id: 'parallel', label: tx('Paralelo', 'Paralelo') }, { id: 'series', label: tx('Serie', 'Serie') }]} value={layout} onChange={change(setLayout)} />}
    controls={<>
      <PlayBar running={clock.running} onToggle={clock.toggle} onReset={clock.reset} time={clock.time} />
      <Slider label="C₁" value={C1} min={1} max={47} step={1} unit="µF" onChange={change(setC1)} />
      <Slider label="C₂" value={C2} min={1} max={47} step={1} unit="µF" onChange={change(setC2)} />
      <Slider label={tx('Voltaje de la pila', 'Pila voltaje')} value={V} min={1.5} max={24} step={1.5} unit="V" onChange={change(setV)} />
    </>}
    readouts={<>
      <Readouts items={[
        { label: tx('C equivalente', 'C equivalente'), value: Ceq, unit: 'µF', tone: 'violet' },
        { label: tx('Carga total', 'Carga total'), value: Qtot * k, unit: 'µC', tone: 'blue' },
        { label: 'Q₁ / Q₂', value: `${num(Q1 * k)} / ${num(Q2 * k)}`, unit: 'µC', tone: 'red' },
        { label: 'V₁ / V₂', value: `${num(V1 * k)} / ${num(V2 * k)}`, unit: 'V', tone: 'green' },
        { label: tx('Energía guardada', 'Energía oñeñongatúva'), value: U * k * k * 1000, unit: 'mJ', tone: 'amber' },
      ]} />
      <Verdict tone={k > 0.99 ? 'good' : 'info'}>{k > 0.99 ? tx('Cargados: ya no circula corriente.', 'Henyhẽma: ndohasavéima corriente.') : clock.time > 0 ? tx('Cargándose: la corriente empieza fuerte y va bajando.', 'Henyhẽ hína: corriente oñepyrũ imbarete ha oguejy.') : tx('Tocá Iniciar para cerrar el interruptor.', 'Epoko Eñepyrũ embotyvo interruptor.')}</Verdict>
    </>}
    footer={layout === 'parallel' ? 'Cₚ = C₁ + C₂ ; Q = C·V ; U = ½·C·V²' : '1/Cₛ = 1/C₁ + 1/C₂ ; Q = C·V ; U = ½·C·V²'}>
    <Stage width={640} height={340} label={tx('Circuito con condensadores', 'Circuito condensador reheve')}>
      <g transform="translate(80 170)">
        <line x1="0" y1="-26" x2="0" y2="26" stroke={INK} strokeWidth="4" /><line x1="14" y1="-14" x2="14" y2="14" stroke={INK} strokeWidth="7" />
        <text x="-10" y="-34" style={{ font: '900 13px system-ui', fill: COLORS.red }}>+</text>
        <text x="-30" y="5" className="sim-label sim-label-small" fill={INK}>{num(V, 1)} V</text>
      </g>
      {wire('M80 144 V70 H560 V270 H80 V196')}
      <g transform="translate(240 70)"><circle r="5" fill={INK} /><line x1="0" y1="0" x2={clock.time > 0 ? 40 : 34} y2={clock.time > 0 ? 0 : -18} stroke={INK} strokeWidth="3.5" /><circle cx="40" r="5" fill={INK} /><text x="20" y="-24" textAnchor="middle" className="sim-tick">{tx('interruptor', 'interruptor')}</text></g>
      <rect x="236" y="62" width="48" height="16" fill="none" />
      {layout === 'parallel' ? <>
        {wire('M380 70 V120 M500 70 V120 M380 220 V270 M500 220 V270')}
        <Capacitor x={380} y={170} q={Q1 * k} qMax={qMax} label={`C₁ = ${C1} µF`} />
        <Capacitor x={500} y={170} q={Q2 * k} qMax={qMax} label={`C₂ = ${C2} µF`} />
      </> : <>
        {wire('M560 70 V120 M560 220 V270')}
        <Capacitor x={560} y={170} q={Q2 * k} qMax={qMax} label={`C₂ = ${C2} µF`} />
        <rect x="380" y="262" width="80" height="16" fill="#fbfcfe" />
        <g transform="rotate(90 420 270)"><Capacitor x={420} y={270} q={Q1 * k} qMax={qMax} label="" /></g>
        <text x="420" y="312" textAnchor="middle" className="sim-label sim-label-small" fill={INK}>C₁ = {C1} µF</text>
      </>}
    </Stage>
  </Sim>;
}
