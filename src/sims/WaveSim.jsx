// Ondas: onda en una cuerda (transversal) o en un resorte (longitudinal) con
// λ, período y una partícula marcada que solo sube y baja; y efecto Doppler
// con frentes de onda de una fuente en movimiento.
import { useState } from 'react';
import { Sim, Stage, Slider, Choice, PlayBar, Readouts, Verdict, Dimension, Toggle, useSimClock, useTx, num, INK, COLORS } from './SimKit.jsx';

const V_SOUND = 340;

function StringWave({ t, A, f, v, longitudinal, tx }) {
  const lambda = v / f; // m
  const PX_PER_M = 120;
  const k = (2 * Math.PI) / lambda, w = 2 * Math.PI * f;
  const X0 = 30, X1 = 610, CY = 170;
  const N = 60;
  const xs = Array.from({ length: N + 1 }, (_, i) => X0 + (i / N) * (X1 - X0));
  const disp = x => A * Math.sin(k * ((x - X0) / PX_PER_M) - w * t);
  const marked = 30;
  if (longitudinal) {
    return <>
      {xs.map((x, i) => { const dx = disp(x) * 0.6; return <line key={i} x1={x + dx} y1={CY - 40} x2={x + dx} y2={CY + 40} stroke={i === marked ? COLORS.red : COLORS.blue} strokeWidth={i === marked ? 4 : 2.2} />; })}
      <text x={X0} y={CY + 70} className="sim-tick">{tx('Compresiones y rarefacciones: las espiras vibran hacia adelante y atrás.', 'Espira oñemomýi tenonde ha tapykue gotyo.')}</text>
      <Dimension x1={X0 + 20} y1={CY - 60} x2={X0 + 20 + lambda * PX_PER_M} y2={CY - 60} text={`λ = ${num(lambda)} m`} color={COLORS.violet} />
    </>;
  }
  const path = xs.map((x, i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${(CY - disp(x)).toFixed(1)}`).join(' ');
  // Primera cresta visible para acotar λ.
  const phase = ((w * t) / k) * PX_PER_M;
  const crest = X0 + ((((Math.PI / 2) / k) * PX_PER_M + phase) % (lambda * PX_PER_M));
  return <>
    <line x1={X0} y1={CY} x2={X1} y2={CY} stroke={INK} strokeOpacity=".25" strokeDasharray="4 6" />
    <path d={path} fill="none" stroke={COLORS.blue} strokeWidth="3.5" strokeLinecap="round" />
    {xs.filter((_, i) => i % 3 === 0).map((x, i) => <circle key={i} cx={x} cy={CY - disp(x)} r="3" fill={COLORS.blue} />)}
    <circle cx={xs[marked]} cy={CY - disp(xs[marked])} r="7" fill={COLORS.red} stroke="#fff" strokeWidth="2" />
    <line x1={xs[marked]} y1={CY - A - 8} x2={xs[marked]} y2={CY + A + 8} stroke={COLORS.red} strokeDasharray="3 4" opacity=".6" />
    {crest + lambda * PX_PER_M < X1 && <Dimension x1={crest} y1={CY - A - 22} x2={crest + lambda * PX_PER_M} y2={CY - A - 22} text={`λ = ${num(lambda)} m`} color={COLORS.violet} />}
    <Dimension x1={X1 - 18} y1={CY} x2={X1 - 18} y2={CY - A} text={`A`} color={COLORS.green} />
    <text x={xs[marked] + 10} y={CY + A + 24} className="sim-label sim-label-small" fill={COLORS.red}>{tx('solo sube y baja', 'ojupi ha oguejy añoite')}</text>
  </>;
}

function Doppler({ t, f, vs, tx }) {
  const PX_PER_M = 0.9; // px por metro (escena de ~700 m)
  const CY = 180, startX = 90;
  const sourceX = startX + vs * t * PX_PER_M;
  // Un frente cada 0,2 s (las ondas reales son demasiado juntas para dibujarlas).
  const fronts = [];
  for (let e = 0; e <= t; e += 0.2) {
    const age = t - e;
    const r = V_SOUND * age * PX_PER_M;
    if (r < 700) fronts.push({ x: startX + vs * e * PX_PER_M, r });
  }
  const fFront = (f * V_SOUND) / (V_SOUND - vs), fBack = (f * V_SOUND) / (V_SOUND + vs);
  return { fFront, fBack, node: <>
    {fronts.map((front, i) => <circle key={i} cx={front.x} cy={CY} r={front.r} fill="none" stroke={COLORS.blue} strokeWidth="1.8" opacity={Math.max(0.15, 1 - front.r / 600)} />)}
    <g transform={`translate(${sourceX} ${CY})`}>
      <rect x="-26" y="-14" width="52" height="24" rx="6" fill="#fff" stroke={INK} strokeWidth="2" />
      <rect x="-26" y="-4" width="52" height="5" fill={COLORS.red} />
      <rect x="-6" y="-22" width="12" height="8" rx="2" fill={COLORS.red} stroke={INK} strokeWidth="1.5" />
      <circle cx="-14" cy="12" r="5" fill={INK} /><circle cx="14" cy="12" r="5" fill={INK} />
    </g>
    <g transform={`translate(600 ${CY})`}><circle r="12" fill="#f2c7a5" stroke={INK} strokeWidth="2" /><text y="32" textAnchor="middle" className="sim-label sim-label-small" fill={INK}>{tx('adelante', 'tenonde')}</text></g>
    <g transform={`translate(30 ${CY})`}><circle r="12" fill="#f2c7a5" stroke={INK} strokeWidth="2" /><text y="32" textAnchor="middle" className="sim-label sim-label-small" fill={INK}>{tx('atrás', 'tapykue')}</text></g>
  </> };
}

export default function WaveSim({ mode = 'string' }) {
  const tx = useTx();
  const [view, setView] = useState(mode === 'doppler' ? 'doppler' : 'string');
  const [A, setA] = useState(40);
  const [f, setF] = useState(1);
  const [v, setV] = useState(2);
  const [longitudinal, setLongitudinal] = useState(false);
  const [fs, setFs] = useState(440);
  const [vs, setVs] = useState(60);
  const clock = useSimClock({ maxTime: view === 'doppler' ? 6 : Infinity });
  const tabs = <Choice options={[{ id: 'string', label: tx('Onda en una cuerda', 'Cuerda onda') }, { id: 'doppler', label: tx('Efecto Doppler', 'Efecto Doppler') }]} value={view} onChange={next => { setView(next); clock.reset(); }} />;

  if (view === 'doppler') {
    const d = Doppler({ t: clock.time, f: fs, vs, tx });
    return <Sim title={tx('Sonido: efecto Doppler', 'Sonido: efecto Doppler')} subtitle={tx('Si la fuente se acerca, los frentes de onda llegan más juntos: se oye más agudo.', 'Fuente oñembojáramo, frente de onda og̃uahẽ hi’aguĩve: ojehendu agudove.')} actions={tabs}
      controls={<>
        <PlayBar running={clock.running} onToggle={clock.toggle} onReset={clock.reset} time={clock.time} />
        <Slider label={tx('Frecuencia de la sirena', 'Sirena frecuencia')} value={fs} min={200} max={1000} step={10} unit="Hz" onChange={setFs} />
        <Slider label={tx('Velocidad de la ambulancia', 'Ambulancia velocidad')} value={vs} min={0} max={150} step={5} unit="m/s" onChange={value => { setVs(value); clock.reset(); }} />
      </>}
      readouts={<>
        <Readouts items={[{ label: tx('Oye adelante', 'Ohendu tenonde'), value: d.fFront, unit: 'Hz', tone: 'red', digits: 0 }, { label: tx('Oye atrás', 'Ohendu tapykue'), value: d.fBack, unit: 'Hz', tone: 'blue', digits: 0 }, { label: tx('Emite', 'Omosẽ'), value: fs, unit: 'Hz', tone: 'green', digits: 0 }]} />
        <Verdict tone="info">{vs === 0 ? tx('Quieta: todos oyen la misma frecuencia.', 'Opytáramo: opavave ohendu peteĩ frecuencia.') : tx('Adelante más agudo, atrás más grave.', 'Tenonde agudove, tapykue graveve.')}</Verdict>
      </>}
      footer={`f′ = f·v / (v ∓ v_f) ; v = ${V_SOUND} m/s`}>
      <Stage width={640} height={360} label={tx('Frentes de onda', 'Frente de onda')}>{d.node}</Stage>
    </Sim>;
  }

  const lambda = v / f;
  return <Sim title={tx('Ondas', 'Onda')} subtitle={tx('La onda avanza, pero cada punto de la cuerda solo oscila en su lugar: transporta energía, no materia.', 'Onda oho tenonde, cuerda punto katu oñemomýi hendápe añoite: ogueraha energía, ndaha’éi materia.')} actions={tabs}
    controls={<>
      <PlayBar running={clock.running} onToggle={clock.toggle} onReset={clock.reset} time={clock.time} />
      <Slider label={tx('Amplitud', 'Amplitud')} value={A} min={5} max={70} step={1} unit="px" onChange={setA} />
      <Slider label={tx('Frecuencia', 'Frecuencia')} value={f} min={0.2} max={3} step={0.1} unit="Hz" onChange={setF} />
      <Slider label={tx('Velocidad de la onda', 'Onda velocidad')} value={v} min={0.5} max={4} step={0.1} unit="m/s" onChange={setV} />
      <Toggle label={tx('Longitudinal (resorte)', 'Longitudinal (resorte)')} checked={longitudinal} onChange={setLongitudinal} />
    </>}
    readouts={<Readouts items={[{ label: 'λ = v/f', value: lambda, unit: 'm', tone: 'violet' }, { label: tx('Período T', 'Período T'), value: 1 / f, unit: 's', tone: 'blue' }, { label: 'f', value: f, unit: 'Hz', tone: 'green' }, { label: 'v', value: v, unit: 'm/s', tone: 'red' }]} />}
    footer="v = λ·f ; T = 1/f">
    <Stage width={640} height={320} label={tx('Onda', 'Onda')}><StringWave t={clock.time} A={A} f={f} v={v} longitudinal={longitudinal} tx={tx} /></Stage>
  </Sim>;
}
