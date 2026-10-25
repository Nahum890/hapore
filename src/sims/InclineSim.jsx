// Leyes de Newton: bloque en un plano inclinado con diagrama de cuerpo libre
// (peso, normal, rozamiento y componentes) y máquina de Atwood con polea.
import { useEffect, useState } from 'react';
import { Sim, Stage, Slider, Choice, PlayBar, Readouts, Arrow, Verdict, Toggle, useSimClock, useTx, num, INK, COLORS, VECTOR } from './SimKit.jsx';

const G = 9.8;
const SLOPE_M = 5;

function InclineScene({ theta, m, mu, t, showParts, tx }) {
  const rad = (theta * Math.PI) / 180;
  const slides = Math.tan(rad) > mu + 1e-9;
  const a = slides ? G * (Math.sin(rad) - mu * Math.cos(rad)) : 0;
  const Lpx = Math.min(470, 240 / Math.max(Math.sin(rad), 0.12));
  const B = { x: 590, y: 300 };
  const A = { x: B.x - Lpx * Math.cos(rad), y: B.y - Lpx * Math.sin(rad) };
  const pxPerM = Lpx / SLOPE_M;
  const s = Math.min(SLOPE_M - 0.6, 0.5 + 0.5 * a * t * t);
  const along = { x: Math.cos(rad), y: Math.sin(rad) };
  const normal = { x: Math.sin(rad), y: -Math.cos(rad) };
  const base = { x: A.x + along.x * s * pxPerM, y: A.y + along.y * s * pxPerM };
  const size = 26 + m * 1.2;
  const center = { x: base.x + normal.x * size / 2, y: base.y + normal.y * size / 2 };
  const P = m * G, N = P * Math.cos(rad), fr = slides ? mu * N : P * Math.sin(rad);
  const k = 70 / Math.max(P, 1);
  return { a, slides, P, N, fr, done: s >= SLOPE_M - 0.6, node: <>
    <polygon points={`${A.x},${A.y} ${B.x},${B.y} ${A.x},${B.y}`} fill="#e9dcc4" stroke={INK} strokeWidth="2" />
    {Array.from({ length: 6 }, (_, i) => <line key={i} x1={A.x + (i / 5) * (B.x - A.x)} y1={B.y + 2} x2={A.x + (i / 5) * (B.x - A.x) - 10} y2={B.y + 12} stroke={INK} strokeWidth="1" opacity=".5" />)}
    <path d={`M${B.x - 46} ${B.y} A46 46 0 0 0 ${B.x - 46 * Math.cos(rad)} ${B.y - 46 * Math.sin(rad)}`} fill="none" stroke={INK} strokeWidth="1.4" />
    <text x={B.x - 62} y={B.y - 8} className="sim-label sim-label-small" fill={INK}>θ = {theta}°</text>
    <g transform={`translate(${center.x} ${center.y}) rotate(${theta})`}>
      <rect x={-size / 2} y={-size / 2} width={size} height={size} rx="4" fill="#fbbf24" stroke={INK} strokeWidth="2.2" />
      <text x="0" y="5" textAnchor="middle" style={{ font: '800 12px system-ui', fill: INK }}>{m} kg</text>
    </g>
    <Arrow x1={center.x} y1={center.y} x2={center.x} y2={center.y + P * k} color={VECTOR.force} label="P" labelDx={6} labelDy={4} />
    <Arrow x1={center.x} y1={center.y} x2={center.x + normal.x * N * k} y2={center.y + normal.y * N * k} color={COLORS.blue} label="N" />
    {fr > 0.01 && <Arrow x1={center.x} y1={center.y} x2={center.x - along.x * fr * k} y2={center.y - along.y * fr * k} color={COLORS.amber} label={slides ? 'f_r' : 'f_e'} labelDx={-26} />}
    {showParts && <>
      <Arrow x1={center.x} y1={center.y} x2={center.x + along.x * P * Math.sin(rad) * k} y2={center.y + along.y * P * Math.sin(rad) * k} color={VECTOR.force} dashed width={2} label="P_x" labelDy={16} />
      <Arrow x1={center.x} y1={center.y} x2={center.x - normal.x * N * k} y2={center.y - normal.y * N * k} color={VECTOR.force} dashed width={2} label="P_y" labelDx={-28} labelDy={10} />
    </>}
    <text x={A.x + 6} y={A.y - 10} className="sim-tick">{tx(`rampa de ${SLOPE_M} m`, `rampa ${SLOPE_M} m`)}</text>
  </> };
}

function AtwoodScene({ m1, m2, t }) {
  const a = ((m1 - m2) * G) / (m1 + m2);
  const T = (2 * m1 * m2 * G) / (m1 + m2);
  const pxPerM = 80;
  const disp = Math.max(-1.6, Math.min(1.6, 0.5 * a * t * t));
  const PX = 320, PY = 60, R = 30;
  const y1 = 190 + disp * pxPerM, y2 = 190 - disp * pxPerM;
  const box = (x, y, m, color) => { const s = 24 + m * 2.4; return <g><line x1={x} y1={PY} x2={x} y2={y - s / 2} stroke={INK} strokeWidth="2" /><rect x={x - s / 2} y={y - s / 2} width={s} height={s} rx="4" fill={color} stroke={INK} strokeWidth="2.2" /><text x={x} y={y + 5} textAnchor="middle" style={{ font: '800 12px system-ui', fill: INK }}>{m} kg</text></g>; };
  return { a, T, done: Math.abs(disp) >= 1.6, node: <>
    <rect x={PX - 90} y="14" width="180" height="12" fill="#cbd5e1" stroke={INK} strokeWidth="1.5" />
    <line x1={PX} y1="26" x2={PX} y2={PY} stroke={INK} strokeWidth="3" />
    <circle cx={PX} cy={PY} r={R} fill="#fff" stroke={INK} strokeWidth="2.4" />
    <g transform={`rotate(${disp * 120} ${PX} ${PY})`}><line x1={PX - R + 6} y1={PY} x2={PX + R - 6} y2={PY} stroke={INK} strokeWidth="1.5" /><line x1={PX} y1={PY - R + 6} x2={PX} y2={PY + R - 6} stroke={INK} strokeWidth="1.5" /></g>
    <circle cx={PX} cy={PY} r="5" fill={INK} />
    {box(PX - R, y1, m1, '#fbbf24')}
    {box(PX + R, y2, m2, '#93c5fd')}
    <rect x="0" y="330" width="640" height="10" fill={COLORS.earth} opacity=".35" />
  </> };
}

export default function InclineSim() {
  const tx = useTx();
  const [mode, setMode] = useState('incline');
  const [theta, setTheta] = useState(30);
  const [m, setM] = useState(5);
  const [mu, setMu] = useState(0.2);
  const [parts, setParts] = useState(true);
  const [m1, setM1] = useState(5);
  const [m2, setM2] = useState(3);
  const clock = useSimClock({ maxTime: 8 });
  const scene = mode === 'incline' ? InclineScene({ theta, m, mu, t: clock.time, showParts: parts, tx }) : AtwoodScene({ m1, m2, t: clock.time });
  useEffect(() => { if (scene.done && clock.running) clock.setRunning(false); }, [scene.done, clock]);
  const change = setter => value => { setter(value); clock.reset(); };

  return <Sim
    title={tx('Leyes de Newton', 'Newton ley-kuéra')}
    subtitle={mode === 'incline' ? tx('Diagrama de cuerpo libre: la fuerza neta a lo largo de la rampa produce la aceleración (F = m·a).', 'Diagrama cuerpo libre: fuerza neta rampa rupi ome’ẽ aceleración (F = m·a).') : tx('Máquina de Atwood: la masa más pesada baja y arrastra a la otra.', 'Atwood máquina: masa ipohýivéva oguejy ha ogueraha ambuéva.')}
    actions={<Choice options={[{ id: 'incline', label: tx('Plano inclinado', 'Plano inclinado') }, { id: 'atwood', label: tx('Polea (Atwood)', 'Polea (Atwood)') }]} value={mode} onChange={change(setMode)} />}
    controls={<>
      <PlayBar running={clock.running} onToggle={clock.toggle} onReset={clock.reset} time={clock.time} />
      {mode === 'incline' ? <>
        <Slider label={tx('Ángulo', 'Ángulo')} value={theta} min={5} max={60} step={1} unit="°" onChange={change(setTheta)} />
        <Slider label={tx('Masa', 'Masa')} value={m} min={1} max={20} step={1} unit="kg" onChange={change(setM)} />
        <Slider label={tx('Rozamiento μ', 'Rozamiento μ')} value={mu} min={0} max={0.8} step={0.05} onChange={change(setMu)} />
        <Toggle label={tx('Mostrar componentes del peso', 'Ehechauka peso componente')} checked={parts} onChange={setParts} />
      </> : <>
        <Slider label={tx('Masa izquierda', 'Masa asu gotyo')} value={m1} min={1} max={20} step={1} unit="kg" onChange={change(setM1)} />
        <Slider label={tx('Masa derecha', 'Masa akatúa gotyo')} value={m2} min={1} max={20} step={1} unit="kg" onChange={change(setM2)} />
      </>}
    </>}
    readouts={mode === 'incline' ? <>
      <Readouts items={[
        { label: tx('Peso P', 'Peso P'), value: scene.P, unit: 'N', tone: 'red' },
        { label: tx('Normal N', 'Normal N'), value: scene.N, unit: 'N', tone: 'blue' },
        { label: tx('Rozamiento', 'Rozamiento'), value: scene.fr, unit: 'N', tone: 'amber' },
        { label: tx('Aceleración', 'Aceleración'), value: scene.a, unit: 'm/s²', tone: 'violet' },
      ]} />
      <Verdict tone={scene.slides ? 'info' : 'warn'}>{scene.slides
        ? tx(`Baja: la componente del peso (${num(scene.P * Math.sin(theta * Math.PI / 180))} N) le gana al rozamiento.`, `Oguejy: peso componente (${num(scene.P * Math.sin(theta * Math.PI / 180))} N) ipu’ãve rozamiento-gui.`)
        : tx('Se queda quieto: el rozamiento alcanza para sostenerlo (tan θ ≤ μ).', 'Opyta kirirĩ: rozamiento ojoko (tan θ ≤ μ).')}</Verdict>
    </> : <>
      <Readouts items={[
        { label: tx('Aceleración', 'Aceleración'), value: Math.abs(scene.a), unit: 'm/s²', tone: 'violet' },
        { label: tx('Tensión de la cuerda', 'Cuerda tensión'), value: scene.T, unit: 'N', tone: 'blue' },
        { label: tx('Peso izquierda', 'Peso asu'), value: m1 * G, unit: 'N', tone: 'red' },
        { label: tx('Peso derecha', 'Peso akatúa'), value: m2 * G, unit: 'N', tone: 'red' },
      ]} />
      {m1 === m2 && <Verdict tone="good">{tx('Masas iguales: equilibrio, a = 0 (siguen quietas o en MRU).', 'Masa peteĩcha: equilibrio, a = 0.')}</Verdict>}
    </>}
    footer={mode === 'incline' ? 'a = g·(sen θ − μ·cos θ) ; N = m·g·cos θ' : 'a = (m₁ − m₂)·g / (m₁ + m₂) ; T = 2·m₁·m₂·g / (m₁ + m₂)'}
  >
    <Stage width={640} height={340} label={tx('Escena de fuerzas', 'Fuerza escena')}>{scene.node}</Stage>
  </Sim>;
}
