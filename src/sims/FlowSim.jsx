// Hidrodinámica: caño que se angosta. Continuidad (A₁v₁ = A₂v₂) con
// partículas que aceleran en la parte angosta y tubos manométricos que bajan
// donde la velocidad es mayor (Bernoulli).
import { useRef, useState } from 'react';
import { Sim, Stage, Slider, Readouts, Verdict, useFrame, useTx, num, INK, COLORS } from './SimKit.jsx';

const RHO = 1000, G = 9.8;
const X0 = 30, X1 = 610, NECK_A = 250, NECK_B = 390, CY = 230, H1 = 90;

export default function FlowSim() {
  const tx = useTx();
  const [q, setQ] = useState(6); // L/s
  const [ratio, setRatio] = useState(0.4);
  const A1 = 0.006; // m² (sección ancha)
  const A2 = A1 * ratio;
  const v1 = (q / 1000) / A1, v2 = (q / 1000) / A2;
  const dP = 0.5 * RHO * (v2 * v2 - v1 * v1);
  const halfHeight = x => {
    const h2 = H1 * Math.sqrt(ratio);
    if (x < NECK_A - 40) return H1 / 2;
    if (x < NECK_A) { const k = (x - (NECK_A - 40)) / 40; return (H1 / 2) * (1 - k) + (h2 / 2) * k; }
    if (x < NECK_B) return h2 / 2;
    if (x < NECK_B + 40) { const k = (x - NECK_B) / 40; return (h2 / 2) * (1 - k) + (H1 / 2) * k; }
    return H1 / 2;
  };
  const speedAt = x => v1 * ((H1 / 2) / halfHeight(x)) ** 2; // A ∝ h²
  // Distribución pareja (secuencias de baja discrepancia), sin rayas diagonales.
  const particles = useRef(Array.from({ length: 80 }, (_, i) => ({ x: X0 + ((i * 0.6180339) % 1) * (X1 - X0), lane: ((i * 0.7548777) % 1) - 0.5 })));
  const [, tick] = useState(0);
  useFrame(dt => {
    for (const p of particles.current) {
      p.x += speedAt(p.x) * 26 * dt;
      if (p.x > X1) p.x = X0;
    }
    tick(n => n + 1);
  }, true);
  const top = Array.from({ length: 59 }, (_, i) => { const x = X0 + (i / 58) * (X1 - X0); return `${i ? 'L' : 'M'}${x},${CY - halfHeight(x)}`; }).join(' ');
  const bottom = Array.from({ length: 59 }, (_, i) => { const x = X1 - (i / 58) * (X1 - X0); return `L${x},${CY + halfHeight(x)}`; }).join(' ');
  const column1 = 120, column2 = Math.max(10, column1 - (dP / (RHO * G)) * 400);
  const tubes = [{ x: 150, h: column1, label: 'P₁' }, { x: (NECK_A + NECK_B) / 2, h: column2, label: 'P₂' }, { x: 500, h: column1, label: 'P₃' }];

  return <Sim
    title={tx('Caudal, continuidad y Bernoulli', 'Caudal, continuidad ha Bernoulli')}
    subtitle={tx('Donde el caño es angosto el agua va más rápido y la presión baja (los tubos marcan la presión).', 'Caño ipiriguahápe y oho pya’eve ha presión oguejy (tubo omarka presión).')}
    controls={<>
      <Slider label={tx('Caudal', 'Caudal')} value={q} min={1} max={12} step={0.5} unit="L/s" onChange={setQ} />
      <Slider label={tx('Sección angosta / ancha', 'Sección piriguáva / tuicháva')} value={ratio} min={0.2} max={1} step={0.05} onChange={setRatio} />
    </>}
    readouts={<>
      <Readouts items={[
        { label: tx('v en lo ancho', 'v tuicháme'), value: v1, unit: 'm/s', tone: 'blue' },
        { label: tx('v en lo angosto', 'v piriguápe'), value: v2, unit: 'm/s', tone: 'red' },
        { label: tx('Diferencia de presión', 'Presión diferencia'), value: dP / 1000, unit: 'kPa', tone: 'violet' },
        { label: 'Q = A·v', value: q / 1000, unit: 'm³/s', tone: 'green', digits: 4 },
      ]} />
      <Verdict tone="info">{tx(`El área se redujo a ${num(ratio * 100, 0)} %: la velocidad se multiplicó por ${num(1 / ratio)}.`, `Área oguejy ${num(ratio * 100, 0)} % peve: velocidad omultiplica ${num(1 / ratio)} rehe.`)}</Verdict>
    </>}
    footer="A₁·v₁ = A₂·v₂ ; P₁ − P₂ = ½·ρ·(v₂² − v₁²)"
  >
    <Stage width={640} height={320} label={tx('Caño con estrechamiento', 'Caño ipiriguáva')}>
      {tubes.map(tube => <g key={tube.label}>
        <rect x={tube.x - 9} y={CY - halfHeight(tube.x) - 150} width="18" height="150" fill="#fff" stroke={INK} strokeWidth="1.6" />
        <rect x={tube.x - 7} y={CY - halfHeight(tube.x) - tube.h} width="14" height={tube.h} fill="#9fd0f0" />
        <text x={tube.x} y={CY - halfHeight(tube.x) - 158} textAnchor="middle" className="sim-label sim-label-small" fill={INK}>{tube.label}</text>
      </g>)}
      <path d={`${top} ${bottom} Z`} fill="#cfe8f7" stroke="none" />
      <path d={top} fill="none" stroke={INK} strokeWidth="3" />
      <path d={bottom.replace(/^L/, 'M')} fill="none" stroke={INK} strokeWidth="3" />
      {particles.current.map((p, i) => <circle key={i} cx={p.x} cy={CY + p.lane * 2 * halfHeight(p.x) * 0.9} r="3" fill={COLORS.blue} opacity=".75" />)}
      <text x="70" y={CY + H1 / 2 + 26} className="sim-label sim-label-small" fill={INK}>v₁ = {num(v1)} m/s</text>
      <text x={(NECK_A + NECK_B) / 2} y={CY + H1 / 2 + 26} textAnchor="middle" className="sim-label sim-label-small" fill={COLORS.red}>v₂ = {num(v2)} m/s</text>
    </Stage>
  </Sim>;
}
