// Calor: escalas termométricas (°C, °F, K), mezcla hasta el equilibrio
// térmico, curva de calentamiento del agua (mesetas en los cambios de estado)
// y dilatación lineal de una barra.
import { useMemo, useState } from 'react';
import { Sim, Stage, Slider, Choice, PlayBar, Readouts, Graph, Verdict, Dimension, useSimClock, useTx, num, INK, COLORS } from './SimKit.jsx';

/* ---------- Escalas ---------- */
function Thermometer({ x, label, value, min, max, unit, marks, color }) {
  const top = 40, bottom = 290;
  const y = v => bottom - ((v - min) / (max - min)) * (bottom - top);
  return <g>
    <rect x={x - 12} y={top - 14} width="24" height={bottom - top + 30} rx="12" fill="#fff" stroke={INK} strokeWidth="2" />
    <circle cx={x} cy={bottom + 22} r="18" fill={color} stroke={INK} strokeWidth="2" />
    <rect x={x - 5} y={y(value)} width="10" height={bottom + 10 - y(value)} fill={color} />
    {marks.map(mark => <g key={mark}><line x1={x + 12} y1={y(mark)} x2={x + 20} y2={y(mark)} stroke={INK} /><text x={x + 24} y={y(mark) + 4} className="sim-tick">{num(mark, 0)}</text></g>)}
    <text x={x} y={bottom + 58} textAnchor="middle" className="sim-label" fill={INK}>{label}</text>
    <text x={x} y={top - 22} textAnchor="middle" className="sim-label" fill={color}>{num(value, 1)} {unit}</text>
  </g>;
}

const LANDMARKS = [
  { c: -40, es: '−40: °C y °F coinciden', gn: '−40: °C ha °F peteĩcha' },
  { c: 0, es: 'El agua se congela', gn: 'Y oñembohatã' },
  { c: 37, es: 'Cuerpo humano', gn: 'Tete yvypóra' },
  { c: 40, es: 'Siesta de verano en Asunción', gn: 'Arahaku Asunción-pe' },
  { c: 100, es: 'El agua hierve', gn: 'Y opupu' },
];

/* ---------- Curva de calentamiento: 1 kg de hielo a −20 °C ---------- */
const HEAT = { cIce: 2100, cWater: 4186, cSteam: 2010, Lf: 334000, Lv: 2260000 };
function heatingCurve(power) {
  const m = 1;
  const stages = [
    { q: m * HEAT.cIce * 20, from: -20, to: 0, state: 'ice' },
    { q: m * HEAT.Lf, from: 0, to: 0, state: 'melt' },
    { q: m * HEAT.cWater * 100, from: 0, to: 100, state: 'water' },
    { q: m * HEAT.Lv, from: 100, to: 100, state: 'boil' },
    { q: m * HEAT.cSteam * 20, from: 100, to: 120, state: 'steam' },
  ];
  let t = 0;
  return stages.map(stage => { const duration = stage.q / power; const out = { ...stage, t0: t, t1: t + duration }; t += duration; return out; });
}

export default function ThermoSim({ mode = 'scales' }) {
  const tx = useTx();
  const [view, setView] = useState(mode);
  const [celsius, setCelsius] = useState(25);
  // Mezcla
  const [m1, setM1] = useState(0.5);
  const [t1, setT1] = useState(80);
  const [m2, setM2] = useState(1);
  const [t2, setT2] = useState(20);
  const [curveMode, setCurveMode] = useState(false);
  const [power, setPower] = useState(2000);
  // Dilatación
  const MATERIALS = [{ id: 'acero', es: 'Acero', gn: 'Acero', a: 1.2e-5 }, { id: 'aluminio', es: 'Aluminio', gn: 'Aluminio', a: 2.4e-5 }, { id: 'cobre', es: 'Cobre', gn: 'Cobre', a: 1.7e-5 }, { id: 'vidrio', es: 'Vidrio', gn: 'Vidrio', a: 0.9e-5 }];
  const [material, setMaterial] = useState('acero');
  const [L0, setL0] = useState(10);
  const [dT, setDT] = useState(40);
  const curve = useMemo(() => heatingCurve(power), [power]);
  const totalCurve = curve.at(-1).t1;
  const clock = useSimClock({ maxTime: view === 'mixing' ? (curveMode ? totalCurve / 60 : 12) : 0 });
  const teq = (m1 * t1 + m2 * t2) / (m1 + m2);

  if (view === 'scales') {
    const f = 1.8 * celsius + 32, k = celsius + 273.15;
    const near = LANDMARKS.reduce((best, item) => (Math.abs(item.c - celsius) < Math.abs(best.c - celsius) ? item : best), LANDMARKS[0]);
    return <Sim title={tx('Escalas de temperatura', 'Temperatura escala')} subtitle={tx('La misma temperatura en tres escalas: Celsius, Fahrenheit y Kelvin.', 'Peteĩ temperatura mbohapy escala-pe: Celsius, Fahrenheit ha Kelvin.')}
      actions={<Choice options={[{ id: 'scales', label: tx('Escalas', 'Escala') }, { id: 'mixing', label: tx('Calorimetría', 'Calorimetría') }, { id: 'expansion', label: tx('Dilatación', 'Dilatación') }]} value={view} onChange={setView} />}
      controls={<Slider label={tx('Temperatura', 'Temperatura')} value={celsius} min={-40} max={120} step={1} unit="°C" onChange={setCelsius} />}
      readouts={<>
        <Readouts items={[{ label: 'Celsius', value: celsius, unit: '°C', tone: 'red' }, { label: 'Fahrenheit', value: f, unit: '°F', tone: 'amber' }, { label: 'Kelvin', value: k, unit: 'K', tone: 'blue' }]} />
        {Math.abs(near.c - celsius) <= 3 && <Verdict tone="info">{tx(near.es, near.gn)}</Verdict>}
      </>}
      footer="°F = 1,8·°C + 32 ; K = °C + 273,15">
      <Stage width={560} height={380} label={tx('Tres termómetros', 'Mbohapy termómetro')}>
        <Thermometer x={110} label="Celsius" value={celsius} min={-40} max={120} unit="°C" color={COLORS.red} marks={[-40, 0, 37, 100, 120]} />
        <Thermometer x={280} label="Fahrenheit" value={f} min={-40} max={248} unit="°F" color={COLORS.amber} marks={[-40, 32, 98.6, 212, 248]} />
        <Thermometer x={450} label="Kelvin" value={k} min={233.15} max={393.15} unit="K" color={COLORS.blue} marks={[233, 273, 310, 373, 393]} />
      </Stage>
    </Sim>;
  }

  if (view === 'expansion') {
    const mat = MATERIALS.find(item => item.id === material);
    const dL = mat.a * L0 * dT; // m
    const exaggerate = 300 / Math.max(L0, 1);
    const barPx = 420;
    const growth = Math.min(160, dL * 1000 * exaggerate * 0.9);
    const hue = Math.min(1, Math.max(0, dT / 100));
    return <Sim title={tx('Dilatación térmica', 'Dilatación térmica')} subtitle={tx('Al calentarse la barra se alarga: ΔL = α·L₀·ΔT (exagerado en el dibujo).', 'Hakúvo barra ipukuve: ΔL = α·L₀·ΔT (dibujo-pe tuichave).')}
      actions={<Choice options={[{ id: 'scales', label: tx('Escalas', 'Escala') }, { id: 'mixing', label: tx('Calorimetría', 'Calorimetría') }, { id: 'expansion', label: tx('Dilatación', 'Dilatación') }]} value={view} onChange={setView} />}
      controls={<>
        <Choice label={tx('Material', 'Material')} options={MATERIALS.map(item => ({ id: item.id, label: tx(item.es, item.gn) }))} value={material} onChange={setMaterial} />
        <Slider label={tx('Largo inicial', 'Largo ñepyrũ')} value={L0} min={1} max={50} step={1} unit="m" onChange={setL0} />
        <Slider label={tx('Aumento de temperatura', 'Temperatura ojupíva')} value={dT} min={0} max={100} step={5} unit="°C" onChange={setDT} />
      </>}
      readouts={<Readouts items={[
        { label: 'α', value: mat.a, unit: '/°C', tone: 'violet' },
        { label: 'ΔL', value: dL * 1000, unit: 'mm', tone: 'red' },
        { label: tx('Largo final', 'Largo final'), value: L0 + dL, unit: 'm', tone: 'blue', digits: 4 },
      ]} />}
      footer={tx('Por eso los puentes y las vías tienen juntas de dilatación.', 'Upévare puente ha tren rape oguereko junta de dilatación.')}>
      <Stage width={640} height={260} label={tx('Barra que se dilata', 'Barra ojepysóva')}>
        <rect x="30" y="80" width="40" height="120" fill="#94a3b8" stroke={INK} strokeWidth="2" />
        <rect x={70} y="122" width={barPx + growth} height="36" rx="4" fill={`rgb(${150 + hue * 105}, ${160 - hue * 60}, ${170 - hue * 120})`} stroke={INK} strokeWidth="2.2" />
        <line x1={70 + barPx} y1="96" x2={70 + barPx} y2="184" stroke={COLORS.blue} strokeDasharray="5 4" strokeWidth="1.6" />
        <text x={70 + barPx} y="90" textAnchor="middle" className="sim-label sim-label-small" fill={COLORS.blue}>L₀</text>
        {growth > 2 && <Dimension x1={70 + barPx} y1={190} x2={70 + barPx + growth} y2={190} text={`ΔL = ${num(dL * 1000)} mm`} color={COLORS.red} />}
        {Array.from({ length: 5 }, (_, i) => <path key={i} d={`M${120 + i * 90} 210 q8 -10 0 -20 q-8 -10 0 -20`} fill="none" stroke={COLORS.red} strokeWidth="2" opacity={hue} />)}
        <text x="70" y="240" className="sim-tick">{tx('Dibujo exagerado: la barra real cambia muy poco.', 'Dibujo tuichave: barra añetegua okambia michĩmi.')}</text>
      </Stage>
    </Sim>;
  }

  // Calorimetría: mezcla o curva de calentamiento.
  const time = clock.time;
  let content;
  if (!curveMode) {
    const k = 0.45;
    const T1 = teq + (t1 - teq) * Math.exp(-k * time), T2 = teq + (t2 - teq) * Math.exp(-k * time);
    const samples = Array.from({ length: 61 }, (_, i) => { const s = (i / 60) * 12; return [s, teq + (t1 - teq) * Math.exp(-k * s), teq + (t2 - teq) * Math.exp(-k * s)]; }).filter(p => p[0] <= time + 1e-9);
    // Agua fría azul → caliente rojiza (interpolación entre dos tonos de la paleta).
    const colorFor = T => { const k = Math.max(0, Math.min(1, T / 100)); const mix = (a, b) => Math.round(a + (b - a) * k); return `rgb(${mix(159, 244)}, ${mix(208, 162)}, ${mix(240, 140)})`; };
    const beaker = (x, m, T, label) => { const h = 60 + m * 90; return <g>
      <path d={`M${x} 110 V${290} H${x + 130} V110`} fill="none" stroke={INK} strokeWidth="3" />
      <rect x={x + 3} y={290 - h} width="124" height={h - 2} fill={colorFor(T)} opacity=".8" />
      <text x={x + 65} y={100} textAnchor="middle" className="sim-label" fill={INK}>{num(T, 1)} °C</text>
      <text x={x + 65} y={312} textAnchor="middle" className="sim-tick">{label} · {num(m)} kg</text>
    </g>; };
    content = { readouts: <>
      <Readouts items={[
        { label: tx('Caliente', 'Haku'), value: T1, unit: '°C', tone: 'red' },
        { label: tx('Fría', 'Ro’y'), value: T2, unit: '°C', tone: 'blue' },
        { label: tx('Equilibrio', 'Equilibrio'), value: teq, unit: '°C', tone: 'violet' },
        { label: tx('Calor transferido', 'Calor ohasáva'), value: m1 * 4186 * (t1 - T1) / 1000, unit: 'kJ', tone: 'amber' },
      ]} />
      <Verdict tone="info">{tx('El calor que pierde el agua caliente es el que gana la fría.', 'Calor okañýva y hakúgui ohupyty y ro’ýva.')}</Verdict>
    </>, graph: <Graph title={tx('Temperaturas en contacto', 'Temperatura ojopokóva')} xLabel="t" yLabel="T (°C)" xMax={12} yMin={0} yMax={100}
      series={[{ points: samples.map(p => [p[0], p[1]]), color: COLORS.red }, { points: samples.map(p => [p[0], p[2]]), color: COLORS.blue }, { points: [[0, teq], [12, teq]], color: COLORS.violet, dashed: true }]} />,
    stage: <>{beaker(80, m1, T1, tx('caliente', 'haku'))}{beaker(330, m2, T2, tx('fría', 'ro’y'))}
      <path d="M215 200 h110" stroke={COLORS.red} strokeWidth="4" markerEnd="none" />
      <path d="M318 192 l10 8 -10 8z" fill={COLORS.red} />
      <text x="270" y="190" textAnchor="middle" className="sim-label sim-label-small" fill={COLORS.red}>{tx('calor', 'calor')}</text></> };
  } else {
    const seconds = time * 60;
    const stage = curve.find(item => seconds <= item.t1) ?? curve.at(-1);
    const temp = stage.from + (stage.to - stage.from) * Math.min(1, Math.max(0, (seconds - stage.t0) / (stage.t1 - stage.t0)));
    const points = []; curve.forEach(item => { points.push([item.t0 / 60, item.from]); points.push([item.t1 / 60, item.to]); });
    const shown = points.filter(p => p[0] <= time).concat([[time, temp]]);
    const names = { ice: tx('Hielo calentándose', 'Hielo hakúvo'), melt: tx('Fusión (meseta a 0 °C)', 'Fusión (0 °C-pe)'), water: tx('Agua calentándose', 'Y hakúvo'), boil: tx('Ebullición (meseta a 100 °C)', 'Ebullición (100 °C-pe)'), steam: tx('Vapor calentándose', 'Vapor hakúvo') };
    content = { readouts: <>
      <Readouts items={[{ label: tx('Temperatura', 'Temperatura'), value: temp, unit: '°C', tone: 'red' }, { label: tx('Calor entregado', 'Calor ojeme’ẽva'), value: (Math.min(seconds, totalCurve) * power) / 1000, unit: 'kJ', tone: 'amber' }]} />
      <Verdict tone={stage.from === stage.to ? 'warn' : 'info'}>{names[stage.state]}{stage.from === stage.to ? tx(': la temperatura no cambia, el calor rompe la estructura (calor latente).', ': temperatura ndokambiái, calor ojepuru estado ñemoambuépe.') : ''}</Verdict>
    </>, graph: <Graph title={tx('Curva de calentamiento (1 kg de hielo a −20 °C)', 'Calentamiento curva (1 kg hielo −20 °C)')} xLabel="t (min)" yLabel="T (°C)" xMax={totalCurve / 60} yMin={-30} yMax={130} series={[{ points: shown, color: COLORS.red }]} marker={[time, temp]} />,
    stage: <>
      <rect x="200" y="290" width="160" height="16" rx="4" fill="#64748b" />
      {Array.from({ length: 5 }, (_, i) => <path key={i} d={`M${222 + i * 28} 290 q-6 -10 0 -18 q6 -8 0 -16`} fill="none" stroke={COLORS.amber} strokeWidth="3" />)}
      <path d="M210 120 V270 H350 V120" fill="none" stroke={INK} strokeWidth="3" />
      {stage.state === 'ice' || stage.state === 'melt' ? Array.from({ length: stage.state === 'ice' ? 6 : 3 }, (_, i) => <rect key={i} x={222 + (i % 3) * 40} y={220 - Math.floor(i / 3) * 40} width="32" height="32" rx="5" fill="#e0f2fe" stroke="#7dd3fc" strokeWidth="2" />) : null}
      {(stage.state === 'melt' || stage.state === 'water' || stage.state === 'boil') && <rect x="213" y={stage.state === 'boil' ? 210 : 196} width="134" height={stage.state === 'boil' ? 58 : 72} fill="#9fd0f0" opacity=".85" />}
      {(stage.state === 'boil' || stage.state === 'steam') && Array.from({ length: 6 }, (_, i) => <circle key={i} cx={230 + i * 20} cy={150 - ((time * 40 + i * 13) % 40)} r="6" fill="#e2e8f0" opacity=".9" />)}
    </> };
  }

  return <Sim title={tx('Calorimetría', 'Calorimetría')} subtitle={curveMode ? tx('Con potencia constante, la temperatura sube… salvo en los cambios de estado.', 'Potencia constante reheve temperatura ojupi… estado ñemoambuépe katu nahániri.') : tx('Dos aguas en contacto llegan a una temperatura de equilibrio.', 'Mokõi y ojopokóva og̃uahẽ temperatura de equilibrio-pe.')}
    actions={<Choice options={[{ id: 'scales', label: tx('Escalas', 'Escala') }, { id: 'mixing', label: tx('Calorimetría', 'Calorimetría') }, { id: 'expansion', label: tx('Dilatación', 'Dilatación') }]} value={view} onChange={next => { setView(next); clock.reset(); }} />}
    controls={<>
      <Choice options={[{ id: 'mix', label: tx('Mezcla', 'Mezcla') }, { id: 'curve', label: tx('Curva de calentamiento', 'Calentamiento curva') }]} value={curveMode ? 'curve' : 'mix'} onChange={value => { setCurveMode(value === 'curve'); clock.reset(); }} />
      <PlayBar running={clock.running} onToggle={clock.toggle} onReset={clock.reset} />
      {!curveMode ? <>
        <Slider label={tx('Agua caliente: masa', 'Y haku: masa')} value={m1} min={0.1} max={1.5} step={0.1} unit="kg" onChange={value => { setM1(value); clock.reset(); }} />
        <Slider label={tx('Agua caliente: temperatura', 'Y haku: temperatura')} value={t1} min={40} max={100} step={1} unit="°C" onChange={value => { setT1(value); clock.reset(); }} />
        <Slider label={tx('Agua fría: masa', 'Y ro’y: masa')} value={m2} min={0.1} max={1.5} step={0.1} unit="kg" onChange={value => { setM2(value); clock.reset(); }} />
        <Slider label={tx('Agua fría: temperatura', 'Y ro’y: temperatura')} value={t2} min={0} max={35} step={1} unit="°C" onChange={value => { setT2(value); clock.reset(); }} />
      </> : <Slider label={tx('Potencia de la hornalla', 'Hornalla potencia')} value={power} min={500} max={4000} step={100} unit="W" onChange={value => { setPower(value); clock.reset(); }} />}
    </>}
    readouts={content.readouts}
    graphs={content.graph}
    footer={curveMode ? 'Q = m·c·ΔT ; Q = m·L' : 'T_eq = (m₁T₁ + m₂T₂) / (m₁ + m₂)'}>
    <Stage width={560} height={330} label={tx('Experimento de calor', 'Calor experimento')}>{content.stage}</Stage>
  </Sim>;
}
