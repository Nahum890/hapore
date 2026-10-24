// Circuitos: un circuito simple con pila, lámpara y amperímetro (sentido real
// de los electrones vs. sentido convencional) y dos lámparas en serie o en
// paralelo, con brillo según la potencia y la opción de quitar una.
import { useRef, useState } from 'react';
import { Sim, Stage, Slider, Choice, Readouts, Verdict, Toggle, useFrame, useTx, num, INK, COLORS } from './SimKit.jsx';

function Bulb({ x, y, power, maxPower = 20, off = false, label, labelLeft = false }) {
  const glow = off ? 0 : Math.max(0, Math.min(1, power / maxPower));
  return <g>
    {glow > 0.02 && <circle cx={x} cy={y - 6} r={20 + glow * 26} fill="#fde68a" opacity={0.25 + glow * 0.45} />}
    <circle cx={x} cy={y - 6} r="17" fill={glow > 0.02 ? `rgb(255, ${Math.round(235 - glow * 40)}, ${Math.round(150 - glow * 110)})` : '#f1f5f9'} stroke={INK} strokeWidth="2.2" />
    <path d={`M${x - 6} ${y - 4} q3 -8 6 0 q3 -8 6 0`} fill="none" stroke={INK} strokeWidth="1.5" />
    <rect x={x - 9} y={y + 10} width="18" height="9" rx="2" fill="#94a3b8" stroke={INK} strokeWidth="1.5" />
    {off && <path d={`M${x - 20} ${y - 26} l40 40 M${x + 20} ${y - 26} l-40 40`} stroke={COLORS.red} strokeWidth="3" />}
    {label && <text x={labelLeft ? x - 30 : x} y={labelLeft ? y : y + 36} textAnchor={labelLeft ? 'end' : 'middle'} className="sim-label sim-label-small" fill={INK}>{label}</text>}
  </g>;
}

function Battery({ x, y, voltage }) {
  return <g>
    <rect x={x - 22} y={y - 40} width="44" height="80" rx="8" fill="#1e293b" stroke={INK} strokeWidth="2" />
    <rect x={x - 22} y={y - 40} width="44" height="22" rx="6" fill={COLORS.amber} />
    <rect x={x - 8} y={y - 48} width="16" height="8" rx="2" fill="#94a3b8" stroke={INK} />
    <text x={x} y={y - 24} textAnchor="middle" style={{ font: '900 14px system-ui', fill: INK }}>+</text>
    <text x={x} y={y + 30} textAnchor="middle" style={{ font: '900 14px system-ui', fill: '#fff' }}>−</text>
    <text x={x} y={y + 6} textAnchor="middle" style={{ font: '800 12px system-ui', fill: '#fff' }}>{num(voltage, 1)} V</text>
  </g>;
}

/** Puntos que recorren un camino (lista de puntos) a velocidad proporcional a la corriente. */
function Flow({ path, offset, current, real, color }) {
  const lengths = [];
  let total = 0;
  for (let i = 1; i < path.length; i += 1) { const l = Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]); lengths.push(l); total += l; }
  const at = s => {
    let d = ((s % total) + total) % total;
    for (let i = 0; i < lengths.length; i += 1) {
      if (d <= lengths[i]) { const k = d / lengths[i]; return [path[i][0] + (path[i + 1][0] - path[i][0]) * k, path[i][1] + (path[i + 1][1] - path[i][1]) * k]; }
      d -= lengths[i];
    }
    return path[0];
  };
  if (current <= 1e-6) return null;
  const spacing = 26;
  const dir = real ? -1 : 1;
  // Electrones (azul) en sentido real; cargas positivas imaginarias (rojo) en sentido convencional.
  return Array.from({ length: Math.floor(total / spacing) }, (_, i) => { const [x, y] = at(i * spacing + dir * offset); return <circle key={i} cx={x} cy={y} r="3.6" fill={color} />; });
}

export default function CircuitSim({ mode = 'single' }) {
  const tx = useTx();
  const [view, setView] = useState(mode === 'resistors' ? 'resistors' : 'single');
  const [V, setV] = useState(12);
  const [R, setR] = useState(6);
  const [R1, setR1] = useState(4);
  const [R2, setR2] = useState(12);
  const [layout, setLayout] = useState('series');
  const [remove2, setRemove2] = useState(false);
  const [real, setReal] = useState(true);
  const offset = useRef(0);
  const [, tick] = useState(0);

  let I, I1, I2, P1, P2, Req;
  if (view === 'single') { I = V / R; I1 = I; P1 = V * I; }
  else if (layout === 'series') { Req = remove2 ? Infinity : R1 + R2; I = remove2 ? 0 : V / Req; I1 = I; I2 = I; P1 = I * I * R1; P2 = I * I * R2; }
  else { Req = remove2 ? R1 : (R1 * R2) / (R1 + R2); I1 = V / R1; I2 = remove2 ? 0 : V / R2; I = I1 + I2; P1 = V * I1; P2 = V * I2; }
  useFrame(dt => { offset.current += dt * 22 * Math.min(4, I || 0); tick(n => n + 1); }, (I || 0) > 0);

  const color = real ? COLORS.blue : COLORS.red;
  const tabs = <Choice options={[{ id: 'single', label: tx('Circuito simple', 'Circuito simple') }, { id: 'resistors', label: tx('Serie y paralelo', 'Serie ha paralelo') }]} value={view} onChange={setView} />;
  const wire = (d, key) => <path key={key} d={d} fill="none" stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />;

  if (view === 'single') {
    const loop = [[110, 80], [530, 80], [530, 280], [110, 280], [110, 80]];
    return <Sim title={tx('Corriente y circuito eléctrico', 'Corriente ha circuito eléctrico')} subtitle={tx('La pila empuja la carga por el circuito cerrado. Los electrones van de − a +; el sentido convencional, de + a −.', 'Pila omosẽ carga circuito oñembotývape. Electrón oho − guive + peve; sentido convencional, + guive − peve.')} actions={tabs}
      controls={<>
        <Slider label={tx('Voltaje de la pila', 'Pila voltaje')} value={V} min={1.5} max={24} step={1.5} unit="V" onChange={setV} />
        <Slider label={tx('Resistencia de la lámpara', 'Lámpara resistencia')} value={R} min={2} max={40} step={1} unit="Ω" onChange={setR} />
        <Toggle label={real ? tx('Mostrando electrones (sentido real)', 'Electrón (sentido real)') : tx('Mostrando sentido convencional', 'Sentido convencional')} checked={real} onChange={setReal} />
      </>}
      readouts={<>
        <Readouts items={[{ label: tx('Corriente I', 'Corriente I'), value: I, unit: 'A', tone: 'red' }, { label: tx('Potencia', 'Potencia'), value: P1, unit: 'W', tone: 'amber' }, { label: tx('Carga por minuto', 'Carga minuto-pe'), value: I * 60, unit: 'C', tone: 'blue' }]} />
        <Verdict tone="info">{tx('Efecto térmico y luminoso: la lámpara convierte energía eléctrica en calor y luz.', 'Efecto térmico ha luminoso: lámpara ombohasa energía eléctrica calor ha tesape-pe.')}</Verdict>
      </>}
      footer="I = Q / t ; I = V / R ; P = V·I">
      <Stage width={640} height={360} label={tx('Circuito simple', 'Circuito simple')}>
        {wire('M110 80 H530 V280 H110 Z', 'w')}
        <Flow path={loop} offset={offset.current} current={I} real={real} color={color} />
        <rect x="88" y="130" width="44" height="100" fill="#fff" />
        <Battery x={110} y={180} voltage={V} />
        <rect x="500" y="150" width="60" height="70" fill="#fff" />
        <Bulb x={530} y={190} power={P1} maxPower={40} />
        <g transform="translate(320 280)"><circle r="24" fill="#fff" stroke={INK} strokeWidth="2.4" /><text y="5" textAnchor="middle" style={{ font: '900 15px system-ui', fill: INK }}>A</text><text y="46" textAnchor="middle" className="sim-label sim-label-small" fill={INK}>{num(I)} A</text></g>
        <text x="320" y="62" textAnchor="middle" className="sim-label sim-label-small" fill={color}>{real ? tx('electrones: de − a +', 'electrón: − guive + peve') : tx('sentido convencional: de + a −', 'sentido convencional: + guive − peve')}</text>
      </Stage>
    </Sim>;
  }

  const seriesLoop = [[100, 80], [540, 80], [540, 280], [100, 280], [100, 80]];
  const branch1 = [[100, 80], [320, 80], [320, 280], [100, 280], [100, 80]];
  const branch2 = [[100, 80], [540, 80], [540, 280], [100, 280], [100, 80]];
  return <Sim title={tx('Ley de Ohm: serie y paralelo', 'Ley de Ohm: serie ha paralelo')} subtitle={layout === 'series' ? tx('En serie la corriente es la misma en todo el circuito: si sacás una lámpara, se apagan todas.', 'Serie-pe corriente peteĩcha opa hendápe: reipe’áramo peteĩ lámpara, ogue opavave.') : tx('En paralelo cada lámpara tiene el voltaje completo: si sacás una, la otra sigue prendida.', 'Paralelo-pe káda lámpara oguereko voltaje completo: reipe’áramo peteĩ, ambuéva hendy gueteri.')} actions={tabs}
    controls={<>
      <Choice options={[{ id: 'series', label: tx('Serie', 'Serie') }, { id: 'parallel', label: tx('Paralelo', 'Paralelo') }]} value={layout} onChange={setLayout} />
      <Slider label={tx('Voltaje', 'Voltaje')} value={V} min={1.5} max={24} step={1.5} unit="V" onChange={setV} />
      <Slider label="R₁" value={R1} min={2} max={30} step={1} unit="Ω" onChange={setR1} />
      <Slider label="R₂" value={R2} min={2} max={30} step={1} unit="Ω" onChange={setR2} />
      <Toggle label={tx('Sacar la lámpara 2', 'Eipe’a lámpara 2')} checked={remove2} onChange={setRemove2} />
    </>}
    readouts={<Readouts items={[
      { label: tx('R equivalente', 'R equivalente'), value: Number.isFinite(Req) ? Req : '∞', unit: 'Ω', tone: 'violet' },
      { label: tx('Corriente total', 'Corriente total'), value: I, unit: 'A', tone: 'red' },
      { label: 'I₁ / I₂', value: `${num(I1)} / ${num(I2)}`, unit: 'A', tone: 'blue' },
      { label: 'P₁ / P₂', value: `${num(P1)} / ${num(P2)}`, unit: 'W', tone: 'amber' },
    ]} />}
    footer={layout === 'series' ? 'Rₛ = R₁ + R₂ ; I igual en todo el circuito' : '1/Rₚ = 1/R₁ + 1/R₂ ; V igual en cada rama'}>
    <Stage width={640} height={360} label={tx('Dos lámparas', 'Mokõi lámpara')}>
      {layout === 'series' ? <>
        {wire('M100 80 H540 V280 H100 Z', 'w')}
        <Flow path={seriesLoop} offset={offset.current} current={I} real color={COLORS.blue} />
        <rect x="78" y="130" width="44" height="100" fill="#fff" /><Battery x={100} y={180} voltage={V} />
        <rect x="270" y="50" width="60" height="70" fill="#fff" /><Bulb x={300} y={88} power={P1} label={`R₁ = ${R1} Ω`} />
        <rect x="510" y="150" width="60" height="70" fill="#fff" /><Bulb x={540} y={190} power={P2} off={remove2} label={`R₂ = ${R2} Ω`} labelLeft />
      </> : <>
        {wire('M100 80 H540 V280 H100 Z M320 80 V280', 'w')}
        <Flow path={branch1} offset={offset.current} current={I1} real color={COLORS.blue} />
        {!remove2 && <Flow path={branch2} offset={offset.current * 0.97} current={I2} real color={COLORS.sky} />}
        <rect x="78" y="130" width="44" height="100" fill="#fff" /><Battery x={100} y={180} voltage={V} />
        <rect x="290" y="150" width="60" height="70" fill="#fff" /><Bulb x={320} y={190} power={P1} label={`R₁ = ${R1} Ω`} />
        <rect x="510" y="150" width="60" height="70" fill="#fff" /><Bulb x={540} y={190} power={P2} off={remove2} label={`R₂ = ${R2} Ω`} labelLeft />
      </>}
    </Stage>
  </Sim>;
}
