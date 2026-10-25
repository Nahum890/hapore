// Vectores: suma por el método del polígono (cola con punta) y del
// paralelogramo, componentes, módulo, dirección y producto punto.
import { useState } from 'react';
import { Sim, Stage, Slider, Readouts, Toggle, Arrow, useTx, num, INK, COLORS, VECTOR } from './SimKit.jsx';

const CX = 300, CY = 250, U = 22; // px por unidad
const toXY = (m, deg) => ({ x: m * Math.cos((deg * Math.PI) / 180), y: m * Math.sin((deg * Math.PI) / 180) });

export default function VectorSim() {
  const tx = useTx();
  const [a, setA] = useState(6);
  const [aDeg, setADeg] = useState(20);
  const [b, setB] = useState(5);
  const [bDeg, setBDeg] = useState(125);
  const [parallelogram, setParallelogram] = useState(true);
  const A = toXY(a, aDeg), B = toXY(b, bDeg);
  const R = { x: A.x + B.x, y: A.y + B.y };
  const rMag = Math.hypot(R.x, R.y);
  const rDeg = ((Math.atan2(R.y, R.x) * 180) / Math.PI + 360) % 360;
  const dot = A.x * B.x + A.y * B.y;
  const cross = A.x * B.y - A.y * B.x;
  const p = v => ({ x: CX + v.x * U, y: CY - v.y * U });

  return <Sim
    title={tx('Suma de vectores', 'Vector ñembojoapy')}
    subtitle={tx('Poné B a continuación de A (cola con punta): la resultante va del inicio de A a la punta de B.', 'Emoĩ B A rapykuéri (rugua apysa ndive): resultante oho A ñepyrũgui B apysa peve.')}
    controls={<>
      <Slider label={tx('Módulo de A', 'A módulo')} value={a} min={1} max={9} step={0.5} onChange={setA} />
      <Slider label={tx('Ángulo de A', 'A ángulo')} value={aDeg} min={0} max={360} step={5} unit="°" onChange={setADeg} />
      <Slider label={tx('Módulo de B', 'B módulo')} value={b} min={1} max={9} step={0.5} onChange={setB} />
      <Slider label={tx('Ángulo de B', 'B ángulo')} value={bDeg} min={0} max={360} step={5} unit="°" onChange={setBDeg} />
      <Toggle label={tx('Mostrar paralelogramo', 'Ehechauka paralelogramo')} checked={parallelogram} onChange={setParallelogram} />
    </>}
    readouts={<Readouts items={[
      { label: tx('Resultante |R|', 'Resultante |R|'), value: rMag, tone: 'green' },
      { label: tx('Dirección de R', 'R dirección'), value: rDeg, unit: '°', tone: 'green', digits: 1 },
      { label: 'Rx', value: R.x, tone: 'red' },
      { label: 'Ry', value: R.y, tone: 'blue' },
      { label: 'A · B', value: dot, tone: 'violet' },
      { label: tx('|A × B| (eje z)', '|A × B| (eje z)'), value: Math.abs(cross), tone: 'amber' },
    ]} />}
    footer="R = √(Rx² + Ry²) ; A·B = |A|·|B|·cos θ ; |A×B| = |A|·|B|·sen θ"
  >
    <Stage width={600} height={500} label={tx('Plano con vectores', 'Plano vector reheve')}>
      {Array.from({ length: 27 }, (_, i) => i - 13).map(i => <g key={i}>
        <line x1={CX + i * U} y1="0" x2={CX + i * U} y2="500" stroke="rgba(29,91,216,.08)" />
        <line x1="0" y1={CY + i * U} x2="600" y2={CY + i * U} stroke="rgba(29,91,216,.08)" />
      </g>)}
      <line x1="0" y1={CY} x2="600" y2={CY} stroke={INK} strokeOpacity=".5" />
      <line x1={CX} y1="0" x2={CX} y2="500" stroke={INK} strokeOpacity=".5" />
      <text x="590" y={CY - 6} textAnchor="end" className="sim-axis">x</text>
      <text x={CX + 8} y="14" className="sim-axis">y</text>
      {parallelogram && <>
        <Arrow x1={CX} y1={CY} x2={p(B).x} y2={p(B).y} color={COLORS.amber} width={2} dashed />
        <line x1={p(B).x} y1={p(B).y} x2={p(R).x} y2={p(R).y} stroke={COLORS.blue} strokeDasharray="5 5" strokeWidth="1.6" />
      </>}
      {/* Componentes de R */}
      <line x1={CX} y1={CY} x2={p({ x: R.x, y: 0 }).x} y2={CY} stroke={VECTOR.vx} strokeWidth="2" strokeDasharray="4 4" />
      <line x1={p({ x: R.x, y: 0 }).x} y1={CY} x2={p(R).x} y2={p(R).y} stroke={VECTOR.vy} strokeWidth="2" strokeDasharray="4 4" />
      <Arrow x1={CX} y1={CY} x2={p(A).x} y2={p(A).y} color={COLORS.blue} label="A" width={3.4} labelAtMiddle labelDx={4} labelDy={18} />
      <Arrow x1={p(A).x} y1={p(A).y} x2={p(R).x} y2={p(R).y} color={COLORS.amber} label="B" width={3} labelAtMiddle labelDx={10} labelDy={4} />
      <Arrow x1={CX} y1={CY} x2={p(R).x} y2={p(R).y} color={VECTOR.v} label="R" width={3.8} labelAtMiddle labelDx={-22} labelDy={-4} />
      <circle cx={CX} cy={CY} r="4" fill={INK} />
    </Stage>
  </Sim>;
}
