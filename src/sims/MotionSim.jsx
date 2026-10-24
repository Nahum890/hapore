// Simulador de movimiento rectilíneo: MRU, MRUV y encuentro de dos móviles.
// Marca la posición cada segundo (estroboscopio): en MRU las marcas quedan a
// igual distancia; en MRUV se separan (o se juntan si frena).
import { useEffect, useMemo, useState } from 'react';
import { Sim, Stage, Slider, Choice, PlayBar, Readouts, Graph, Verdict, useSimClock, useTx, num, INK, COLORS } from './SimKit.jsx';

const ROAD_M = 200;
const X0 = 40, X1 = 600;
const S = (X1 - X0) / ROAD_M;
const px = meters => X0 + Math.max(-10, Math.min(ROAD_M + 10, meters)) * S;

function kinematics({ x0 = 0, v0, a }, t) {
  if (a < 0 && v0 > 0) {
    const stop = v0 / -a;
    const tt = Math.min(t, stop);
    return { x: x0 + v0 * tt + 0.5 * a * tt * tt, v: t >= stop ? 0 : v0 + a * t };
  }
  return { x: x0 + v0 * t + 0.5 * a * t * t, v: v0 + a * t };
}

function Bus({ x, y }) {
  return <g transform={`translate(${x - 30} ${y - 30})`}>
    <rect x="0" y="4" width="60" height="22" rx="5" fill="#f8fafc" stroke={INK} strokeWidth="2" />
    <rect x="2" y="16" width="56" height="5" fill={COLORS.red} />
    {[6, 18, 30, 42].map(wx => <rect key={wx} x={wx} y="8" width="9" height="6" rx="1.5" fill="#bfe3f2" stroke={INK} strokeWidth="1" />)}
    <rect x="52" y="8" width="6" height="8" rx="1.5" fill="#bfe3f2" stroke={INK} strokeWidth="1" />
    {[13, 47].map(cx => <g key={cx}><circle cx={cx} cy="27" r="5.5" fill={INK} /><circle cx={cx} cy="27" r="2" fill="#cbd5e1" /></g>)}
  </g>;
}

function Moto({ x, y }) {
  return <g transform={`translate(${x - 20} ${y - 30})`}>
    {[6, 32].map(cx => <g key={cx}><circle cx={cx} cy="24" r="6.5" fill="none" stroke={INK} strokeWidth="2.5" /><circle cx={cx} cy="24" r="1.6" fill={INK} /></g>)}
    <path d="M6 24 L16 14 L28 14 L32 24" fill="none" stroke={INK} strokeWidth="2.4" strokeLinejoin="round" />
    <path d="M14 13 h12 l3 -3 h-14 z" fill={COLORS.amber} stroke={INK} strokeWidth="1.6" />
    <path d="M28 14 l3 -6" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />
    <circle cx="20" cy="3" r="4.2" fill={COLORS.blue} stroke={INK} strokeWidth="1.5" />
    <path d="M20 7 L18 13" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
  </g>;
}

export default function MotionSim({ mode: initialMode = 'mru' }) {
  const tx = useTx();
  const [mode, setMode] = useState(initialMode === 'compare' ? 'compare' : initialMode);
  const [v, setV] = useState(initialMode === 'compare' ? 10 : 15);
  const [x0, setX0] = useState(0);
  const [v0, setV0] = useState(4);
  const [a, setA] = useState(2);
  const [aB, setAB] = useState(2);
  const maxTime = 20;
  const clock = useSimClock({ maxTime });
  const t = clock.time;

  const movers = useMemo(() => {
    if (mode === 'mru') return [{ id: 'A', kind: 'bus', p: { x0, v0: v, a: 0 }, color: COLORS.red }];
    if (mode === 'mruv') return [{ id: 'A', kind: 'moto', p: { x0, v0, a }, color: COLORS.amber }];
    return [
      { id: 'A', kind: 'bus', p: { x0: 0, v0: v, a: 0 }, color: COLORS.red },
      { id: 'B', kind: 'moto', p: { x0: 0, v0: 0, a: aB }, color: COLORS.amber },
    ];
  }, [mode, x0, v, v0, a, aB]);

  // Termina cuando el primero sale del camino.
  const states = movers.map(mover => ({ ...mover, ...kinematics(mover.p, t) }));
  const finished = states.every(state => state.x >= ROAD_M + 8 || (state.v === 0 && t > 0.5));
  useEffect(() => { if (clock.running && finished) clock.setRunning(false); }, [clock, finished]);

  const samples = useMemo(() => {
    const out = movers.map(() => []);
    for (let s = 0; s <= maxTime; s += 0.1) movers.forEach((mover, index) => { const k = kinematics(mover.p, s); out[index].push([s, k.x, k.v]); });
    return out;
  }, [movers]);
  const upTo = list => list.filter(point => point[0] <= t + 1e-9);
  const meet = mode === 'compare' && aB > 0 ? { t: (2 * v) / aB, x: v * (2 * v) / aB } : null;

  const change = setter => value => { setter(value); clock.reset(); };
  const changeMode = next => { setMode(next); if (next === 'compare') { setV(10); setAB(2); } clock.reset(); };
  const roadY = 168;

  return <Sim
    title={tx('Movimiento rectilíneo', 'Movimiento rectilíneo')}
    subtitle={mode === 'compare' ? tx('El colectivo va a velocidad constante; la moto arranca del reposo y acelera. ¿Dónde se encuentran?', 'Colectivo oho velocidad constante-pe; moto osẽ reposo-gui ha oacelera. ¿Moõpa ojotopa?') : tx('Mirá las marcas de cada segundo: iguales en MRU, cada vez más separadas en MRUV.', 'Ehecha káda segundo marca: peteĩcha MRU-pe, ojoavyvéva MRUV-pe.')}
    actions={<Choice options={[{ id: 'mru', label: 'MRU' }, { id: 'mruv', label: 'MRUV' }, { id: 'compare', label: tx('Encuentro', 'Ñembojoja') }]} value={mode} onChange={changeMode} />}
    controls={<>
      <PlayBar running={clock.running} onToggle={clock.toggle} onReset={clock.reset} time={t} />
      {mode === 'mru' && <>
        <Slider label={tx('Velocidad', 'Velocidad')} value={v} min={2} max={30} step={1} unit="m/s" onChange={change(setV)} />
        <Slider label={tx('Posición inicial', 'Posición inicial')} value={x0} min={0} max={60} step={5} unit="m" onChange={change(setX0)} />
      </>}
      {mode === 'mruv' && <>
        <Slider label={tx('Velocidad inicial', 'Velocidad inicial')} value={v0} min={0} max={25} step={1} unit="m/s" onChange={change(setV0)} />
        <Slider label={tx('Aceleración', 'Aceleración')} value={a} min={-4} max={4} step={0.5} unit="m/s²" onChange={change(setA)} />
      </>}
      {mode === 'compare' && <>
        <Slider label={tx('Velocidad del colectivo', 'Colectivo velocidad')} value={v} min={4} max={20} step={1} unit="m/s" onChange={change(setV)} />
        <Slider label={tx('Aceleración de la moto', 'Moto aceleración')} value={aB} min={0.5} max={5} step={0.5} unit="m/s²" onChange={change(setAB)} />
      </>}
    </>}
    readouts={<>
      <Readouts items={states.flatMap(state => [
        { label: `x${states.length > 1 ? ` ${state.id}` : ''}`, value: state.x, unit: 'm', tone: state.id === 'A' ? 'red' : 'amber' },
        { label: `v${states.length > 1 ? ` ${state.id}` : ''}`, value: state.v, unit: 'm/s', tone: 'green' },
      ])} />
      {mode === 'mruv' && a < 0 && v0 > 0 && <Verdict tone="warn">{tx(`Frena (MUR): se detiene a los ${num(v0 / -a)} s, después de ${num(v0 * v0 / (-2 * a))} m.`, `Ofrena (MUR): opyta ${num(v0 / -a)} s-pe, ${num(v0 * v0 / (-2 * a))} m rire.`)}</Verdict>}
      {meet && <Verdict tone={t >= meet.t ? 'good' : 'info'}>{meet.x <= ROAD_M
        ? tx(`Se encuentran a los ${num(meet.t)} s, a ${num(meet.x)} m de la salida.`, `Ojotopa ${num(meet.t)} s-pe, ${num(meet.x)} m osẽhágui.`)
        : tx(`Se encontrarían a ${num(meet.x)} m: fuera de este camino de ${ROAD_M} m.`, `Ojotopáta ${num(meet.x)} m-pe: ko tape ${ROAD_M} m okápe.`)}</Verdict>}
    </>}
    graphs={<>
      <Graph title={tx('Posición en el tiempo (x–t)', 'Posición tiempo-pe (x–t)')} xLabel="t (s)" yLabel="x (m)" xMax={maxTime} yMin={0}
        series={samples.map((list, index) => ({ points: upTo(list).map(p => [p[0], p[1]]), color: movers[index].color, label: movers.length > 1 ? (movers[index].kind === 'bus' ? tx('Colectivo', 'Colectivo') : 'Moto') : undefined }))}
        marker={[t, states[0].x]} />
      <Graph title={tx('Velocidad en el tiempo (v–t)', 'Velocidad tiempo-pe (v–t)')} xLabel="t (s)" yLabel="v (m/s)" xMax={maxTime} area={mode !== 'compare'}
        series={samples.map((list, index) => ({ points: upTo(list).map(p => [p[0], p[2]]), color: movers[index].color }))}
        marker={[t, states[0].v]} markerColor={COLORS.green} />
    </>}
    footer={tx('En el gráfico v–t, el área bajo la línea es la distancia recorrida.', 'Gráfico v–t-pe, área línea iguýpe ha’e distancia oguatáva.')}
  >
    <Stage width={640} height={256} label={tx('Camino con vehículos', 'Tape vehículo reheve')}>
      <rect x="0" y="0" width="640" height="130" fill="#e6f3fa" />
      <path d="M0 108 C 120 84 220 118 330 100 S 540 80 640 104 V140 H0Z" fill="#cfe7d4" />
      {[[70, 112], [190, 106], [300, 110], [470, 100], [560, 104]].map(([tx0, ty0], index) => <g key={index} transform={`translate(${tx0} ${ty0})`}>
        <rect x="-2" y="0" width="4" height="22" fill="#7c4a2d" />
        <circle cx="0" cy="-4" r={index % 2 ? 11 : 14} fill={index % 2 ? '#6aa66f' : '#5b9a63'} stroke={INK} strokeWidth="1.2" />
      </g>)}
      <g transform="translate(408 98)">
        <rect x="-1.5" y="0" width="3" height="32" fill={INK} />
        <rect x="-11" y="-4" width="22" height="13" rx="3" fill={COLORS.blue} stroke={INK} strokeWidth="1.2" />
        <text x="0" y="6" textAnchor="middle" style={{ font: '800 8px system-ui', fill: '#fff' }}>BUS</text>
      </g>
      <rect x="0" y="130" width="640" height="10" fill={COLORS.grass} />
      <rect x="0" y={roadY - 28} width="640" height="56" fill="#4b5563" />
      <line x1="0" y1={roadY} x2="640" y2={roadY} stroke="#f8fafc" strokeWidth="3" strokeDasharray="18 14" />
      <rect x="0" y={roadY + 28} width="640" height="58" fill="#c8552f" />
      <rect x="0" y={roadY + 28} width="640" height="6" fill="#a94424" />
      {Array.from({ length: ROAD_M / 20 + 1 }, (_, index) => index * 20).map(m => <g key={m}>
        <line x1={px(m)} y1={roadY + 34} x2={px(m)} y2={roadY + 46} stroke="#fff" strokeWidth="2" />
        <text x={px(m)} y={roadY + 60} textAnchor="middle" className="sim-tick" fill="#fff" style={{ fill: '#fff7ed' }}>{m} m</text>
      </g>)}
      {/* Estroboscopio: una marca por segundo */}
      {states.map((state, index) => Array.from({ length: Math.floor(t) + 1 }, (_, second) => {
        const k = kinematics(movers[index].p, second);
        if (k.x > ROAD_M + 5) return null;
        return <g key={`${state.id}-${second}`}>
          <circle cx={px(k.x)} cy={roadY - 36 - index * 12} r="4" fill={state.color} stroke="#fff" strokeWidth="1.5" />
          {second > 0 && second % 2 === 0 && index === 0 && <text x={px(k.x)} y={roadY - 44 - (states.length - 1) * 12} textAnchor="middle" className="sim-label sim-label-small" fill={INK}>{second} s</text>}
        </g>;
      }))}
      {meet && meet.x <= ROAD_M && <g>
        <line x1={px(meet.x)} y1={roadY - 30} x2={px(meet.x)} y2={roadY + 28} stroke={COLORS.green} strokeWidth="2" strokeDasharray="5 4" />
        <text x={px(meet.x)} y={roadY - 70} textAnchor="middle" className="sim-label" fill={COLORS.green}>{tx('encuentro', 'ñembojoja')}</text>
      </g>}
      {states.map((state, index) => (state.kind === 'bus'
        ? <Bus key={state.id} x={px(state.x)} y={roadY - 2 + (index ? 14 : 0)} />
        : <Moto key={state.id} x={px(state.x)} y={roadY + (states.length > 1 ? 22 : 8)} />))}
    </Stage>
  </Sim>;
}
