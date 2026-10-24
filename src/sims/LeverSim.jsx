// Equilibrio y momento de una fuerza: un subibaja con dos chicos. El tablón
// se inclina hacia el lado con mayor momento (M = F·d); en equilibrio ΣM = 0.
import { useEffect, useRef, useState } from 'react';
import { Sim, Stage, Slider, Readouts, Verdict, Arrow, useFrame, useTx, num, INK, COLORS, VECTOR } from './SimKit.jsx';

const G = 9.8;
const PX_PER_M = 120, CX = 320, CY = 220;

function Kid({ x, y, mass, color }) {
  const s = 0.75 + mass / 160;
  return <g transform={`translate(${x} ${y}) scale(${s})`}>
    <circle cx="0" cy="-58" r="11" fill="#f2c7a5" stroke={INK} strokeWidth="2" />
    <path d="M-10 -66 q10 -10 20 0" fill="#3b2a20" />
    <rect x="-13" y="-46" width="26" height="30" rx="8" fill={color} stroke={INK} strokeWidth="2" />
    <path d="M-10 -16 l-4 16 M10 -16 l4 16" stroke={INK} strokeWidth="5" strokeLinecap="round" />
    <path d="M-13 -40 l-10 14 M13 -40 l10 14" stroke={INK} strokeWidth="4" strokeLinecap="round" />
  </g>;
}

export default function LeverSim() {
  const tx = useTx();
  const [m1, setM1] = useState(40);
  const [d1, setD1] = useState(1.8);
  const [m2, setM2] = useState(60);
  const [d2, setD2] = useState(1);
  const M1 = m1 * G * d1, M2 = m2 * G * d2;
  const net = M2 - M1;
  const target = Math.max(-13, Math.min(13, net / 25));
  const [angle, setAngle] = useState(target);
  const angleRef = useRef(angle);
  const settled = Math.abs(angleRef.current - target) < 0.05;
  useFrame(dt => { angleRef.current += (target - angleRef.current) * Math.min(1, dt * 4); setAngle(angleRef.current); }, !settled);
  useEffect(() => { angleRef.current = angle; }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const balanced = Math.abs(net) <= Math.max(M1, M2) * 0.01;
  const rad = (angle * Math.PI) / 180;
  const at = d => ({ x: CX + d * PX_PER_M * Math.cos(rad), y: CY + d * PX_PER_M * Math.sin(rad) });
  const p1 = at(-d1), p2 = at(d2);
  const balanceD2 = (m1 * d1) / m2;

  return <Sim
    title={tx('Equilibrio: el subibaja', 'Equilibrio: subibaja')}
    subtitle={tx('Gana el lado con más momento (fuerza × distancia al apoyo). Si los momentos son iguales, hay equilibrio.', 'Ipu’ãve momento hetavéva (fuerza × distancia apoyo-gui). Momento peteĩcháramo, oĩ equilibrio.')}
    controls={<>
      <Slider label={tx('Masa izquierda', 'Masa asu gotyo')} value={m1} min={20} max={90} step={5} unit="kg" onChange={setM1} />
      <Slider label={tx('Distancia izquierda', 'Distancia asu gotyo')} value={d1} min={0.25} max={2} step={0.05} unit="m" onChange={setD1} />
      <Slider label={tx('Masa derecha', 'Masa akatúa gotyo')} value={m2} min={20} max={90} step={5} unit="kg" onChange={setM2} />
      <Slider label={tx('Distancia derecha', 'Distancia akatúa gotyo')} value={d2} min={0.25} max={2} step={0.05} unit="m" onChange={setD2} />
      <button type="button" className="sim-btn" disabled={balanceD2 > 2 || balanceD2 < 0.25} onClick={() => setD2(Math.round(balanceD2 * 100) / 100)}>{tx('Buscar el equilibrio', 'Eheka equilibrio')}</button>
    </>}
    readouts={<>
      <Readouts items={[
        { label: tx('Momento izq.', 'Momento asu'), value: M1, unit: 'N·m', tone: 'red' },
        { label: tx('Momento der.', 'Momento akatúa'), value: M2, unit: 'N·m', tone: 'blue' },
        { label: 'ΣM', value: net, unit: 'N·m', tone: 'violet' },
        { label: tx('d der. para equilibrar', 'd akatúa equilibrio-pe'), value: balanceD2, unit: 'm', tone: 'green' },
      ]} />
      <Verdict tone={balanced ? 'good' : 'info'}>{balanced ? tx('¡Equilibrio! ΣM = 0.', '¡Equilibrio! ΣM = 0.') : net > 0 ? tx('Baja el lado derecho: su momento es mayor.', 'Oguejy akatúa gotyo: imomento tuichave.') : tx('Baja el lado izquierdo: su momento es mayor.', 'Oguejy asu gotyo: imomento tuichave.')}</Verdict>
    </>}
    footer="M = F · d = m · g · d ; ΣM = 0 → m₁·d₁ = m₂·d₂"
  >
    <Stage width={640} height={320} label={tx('Subibaja', 'Subibaja')}>
      <rect x="0" y="282" width="640" height="38" fill={COLORS.grass} opacity=".55" />
      <polygon points={`${CX - 34},282 ${CX + 34},282 ${CX},${CY + 6}`} fill="#94a3b8" stroke={INK} strokeWidth="2.2" />
      <g transform={`rotate(${angle} ${CX} ${CY})`}>
        <rect x={CX - 2.1 * PX_PER_M} y={CY - 7} width={4.2 * PX_PER_M} height="14" rx="5" fill="#c08a52" stroke={INK} strokeWidth="2.2" />
        {Array.from({ length: 9 }, (_, i) => -2 + i * 0.5).map(d => <g key={d}>
          <line x1={CX + d * PX_PER_M} y1={CY + 7} x2={CX + d * PX_PER_M} y2={CY + (d % 1 === 0 ? 16 : 12)} stroke={INK} strokeWidth="1.2" />
          {d % 1 === 0 && d !== 0 && <text x={CX + d * PX_PER_M} y={CY + 28} textAnchor="middle" className="sim-tick">{Math.abs(d)} m</text>}
        </g>)}
      </g>
      <circle cx={CX} cy={CY} r="6" fill={INK} />
      <Kid x={p1.x} y={p1.y - 7} mass={m1} color={COLORS.red} />
      <Kid x={p2.x} y={p2.y - 7} mass={m2} color={COLORS.blue} />
      <Arrow x1={p1.x} y1={p1.y + 10} x2={p1.x} y2={p1.y + 10 + m1 * 0.9} color={VECTOR.force} label={`${num(m1 * G)} N`} labelDx={6} labelDy={0} />
      <Arrow x1={p2.x} y1={p2.y + 10} x2={p2.x} y2={p2.y + 10 + m2 * 0.9} color={VECTOR.force} label={`${num(m2 * G)} N`} labelDx={6} labelDy={0} />
    </Stage>
  </Sim>;
}
