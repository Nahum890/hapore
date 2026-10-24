// Fluidos en reposo: presión con la profundidad (Stevin) con chorros que salen
// más lejos cuanto más abajo está el agujero, prensa hidráulica (Pascal) y
// flotación (Arquímedes) con peso, empuje y fracción sumergida.
import { useEffect, useRef, useState } from 'react';
import { Sim, Stage, Slider, Choice, Readouts, Graph, Verdict, Arrow, useFrame, useTx, num, INK, COLORS } from './SimKit.jsx';

const G = 9.8, P0 = 101325;
const LIQUIDS = [
  { id: 'agua', es: 'Agua', gn: 'Y', rho: 1000, color: '#9fd0f0' },
  { id: 'mar', es: 'Agua de mar', gn: 'Y mar-gua', rho: 1030, color: '#8cc6e0' },
  { id: 'aceite', es: 'Aceite', gn: 'Aceite', rho: 920, color: '#f4d77a' },
  { id: 'mercurio', es: 'Mercurio', gn: 'Mercurio', rho: 13600, color: '#c3c9d4' },
];

function PressureScene({ liquid, depth, tx }) {
  const TX = 70, TY = 40, TW = 230, TH = 220; // 5 m de profundidad
  const pxPerM = TH / 5;
  const FLOOR = TY + TH + 24;
  const P = P0 + liquid.rho * G * depth;
  const holes = [1, 2.5, 4];
  return <>
    <rect x={TX} y={TY} width={TW} height={TH} fill={liquid.color} opacity=".75" />
    <path d={`M${TX} ${TY - 20} V${TY + TH} H${TX + TW} V${TY - 20}`} fill="none" stroke={INK} strokeWidth="3" />
    {Array.from({ length: 6 }, (_, i) => i).map(m => <g key={m}><line x1={TX - 14} y1={TY + m * pxPerM} x2={TX - 4} y2={TY + m * pxPerM} stroke={INK} /><text x={TX - 18} y={TY + m * pxPerM + 4} textAnchor="end" className="sim-tick">{m} m</text></g>)}
    {/* Chorros: salen con v = √(2gh) (más rápido cuanto más profundo) y caen como tiro horizontal */}
    {holes.map((h, index) => {
      const y = TY + h * pxPerM;
      const v = Math.sqrt(2 * G * h);
      const fall = (FLOOR - y) / pxPerM;
      const tFall = Math.sqrt((2 * fall) / G);
      const pts = Array.from({ length: 16 }, (_, i) => { const t = (i / 15) * tFall; return `${i ? 'L' : 'M'}${TX + TW + v * t * pxPerM},${y + 0.5 * G * t * t * pxPerM}`; }).join(' ');
      return <g key={h}>
        <path d={pts} fill="none" stroke="#3b9ad9" strokeWidth="4" strokeLinecap="round" opacity=".85" />
        <circle cx={TX + TW} cy={y} r="3.5" fill={INK} />
        <text x={TX + TW + 8} y={y - 8} className="sim-label sim-label-small" fill="#1f6aa5">{num(v, 1)} m/s</text>
        <text x={TX + TW + v * tFall * pxPerM} y={FLOOR + 18 + index * 0} textAnchor="middle" className="sim-tick">{num(v * tFall, 1)} m</text>
      </g>;
    })}
    <rect x="0" y={FLOOR} width="640" height="6" fill={COLORS.earth} opacity=".45" />
    {/* Sonda */}
    <line x1={TX + 60} y1={TY - 20} x2={TX + 60} y2={TY + depth * pxPerM} stroke={INK} strokeWidth="2" />
    <circle cx={TX + 60} cy={TY + depth * pxPerM} r="9" fill="#fff" stroke={COLORS.red} strokeWidth="3" />
    <text x={TX + 76} y={TY + depth * pxPerM + 4} className="sim-label" fill={COLORS.red}>{num(P / 1000)} kPa</text>
  </>;
}

function PascalScene({ f1, a1, a2, tx }) {
  const f2 = (f1 * a2) / a1;
  const carWeight = 9800; // auto de 1000 kg
  const lift = Math.max(0, Math.min(1, (f2 - carWeight) / carWeight));
  const small = 26 + a1 * 1.2, big = 60 + a2 * 0.5;
  const LX = 140, RX = 430, BASE = 300, LEVEL = 180;
  const rise = lift * 40, sink = rise * (a2 / a1) * 0.05;
  return <>
    <path d={`M${LX - small / 2} ${LEVEL - 30} V${BASE} H${RX + big / 2} V${LEVEL - 80} M${RX - big / 2} ${LEVEL - 80} V${BASE - 40} H${LX + small / 2} V${LEVEL - 30}`} fill="none" stroke={INK} strokeWidth="3" />
    <rect x={LX - small / 2} y={LEVEL + sink} width={small} height={BASE - LEVEL - sink} fill="#9fd0f0" />
    <rect x={LX + small / 2} y={BASE - 40} width={RX - big / 2 - LX - small / 2} height="40" fill="#9fd0f0" />
    <rect x={RX - big / 2} y={LEVEL - rise} width={big} height={BASE - LEVEL + rise} fill="#9fd0f0" />
    <rect x={LX - small / 2} y={LEVEL - 10 + sink} width={small} height="10" fill="#64748b" stroke={INK} strokeWidth="1.5" />
    <rect x={RX - big / 2} y={LEVEL - 10 - rise} width={big} height="10" fill="#64748b" stroke={INK} strokeWidth="1.5" />
    <Arrow x1={LX} y1={LEVEL - 70 + sink} x2={LX} y2={LEVEL - 14 + sink} color={COLORS.red} label={`F₁ = ${num(f1)} N`} labelDx={10} labelDy={-26} />
    <g transform={`translate(${RX - 46} ${LEVEL - 52 - rise})`}>
      <rect x="0" y="12" width="92" height="22" rx="7" fill={COLORS.blue} stroke={INK} strokeWidth="2" />
      <path d="M16 12 l10 -12 h36 l12 12" fill="#bfe3f2" stroke={INK} strokeWidth="2" />
      <circle cx="22" cy="36" r="7" fill={INK} /><circle cx="70" cy="36" r="7" fill={INK} />
    </g>
    <text x={RX} y={BASE + 24} textAnchor="middle" className="sim-label sim-label-small" fill={INK}>A₂ = {a2} cm²</text>
    <text x={LX} y={BASE + 24} textAnchor="middle" className="sim-label sim-label-small" fill={INK}>A₁ = {a1} cm²</text>
    <text x={RX + big / 2 + 10} y={LEVEL - 20 - rise} className="sim-label" fill={COLORS.green}>F₂ = {num(f2)} N</text>
    <text x="20" y="30" className="sim-label sim-label-small" fill={INK}>{tx('Auto de 1000 kg (peso 9800 N)', 'Auto 1000 kg (peso 9800 N)')}</text>
  </>;
}

function BuoyancyScene({ liquid, rhoObj, y, tx }) {
  const TX = 120, TY = 70, TW = 300, TH = 240, SIDE = 70;
  const surface = TY + 30;
  const top = surface - SIDE + y; // y = cuánto se hundió (px)
  const submerged = Math.max(0, Math.min(SIDE, top + SIDE - surface));
  const V = 0.001; // 1 litro (cubo de 10 cm)
  const P = rhoObj * V * G;
  const E = liquid.rho * G * V * (submerged / SIDE);
  return { P, E, frac: submerged / SIDE, node: <>
    <rect x={TX} y={surface} width={TW} height={TY + TH - surface} fill={liquid.color} opacity=".75" />
    <path d={`M${TX} ${TY - 20} V${TY + TH} H${TX + TW} V${TY - 20}`} fill="none" stroke={INK} strokeWidth="3" />
    <rect x={TX + TW / 2 - SIDE / 2} y={top} width={SIDE} height={SIDE} rx="4" fill={rhoObj < 1000 ? '#d9a066' : rhoObj < 3000 ? '#94a3b8' : '#64748b'} stroke={INK} strokeWidth="2.4" opacity=".95" />
    <text x={TX + TW / 2} y={top + SIDE / 2 + 5} textAnchor="middle" style={{ font: '800 12px system-ui', fill: INK }}>{rhoObj} kg/m³</text>
    <Arrow x1={TX + TW / 2 - SIDE / 2 - 16} y1={top + SIDE / 2} x2={TX + TW / 2 - SIDE / 2 - 16} y2={top + SIDE / 2 + Math.min(120, P * 6)} color={COLORS.red} label="P" labelDx={-18} labelDy={0} />
    {E > 0.05 && <Arrow x1={TX + TW / 2 + SIDE / 2 + 16} y1={top + SIDE / 2} x2={TX + TW / 2 + SIDE / 2 + 16} y2={top + SIDE / 2 - Math.min(120, E * 6)} color={COLORS.blue} label="E" labelDx={6} labelDy={0} />}
    <text x={TX + TW + 14} y={surface + 4} className="sim-label sim-label-small" fill={INK}>{tx('superficie', 'ape')}</text>
  </> };
}

export default function FluidSim({ mode = 'pressure' }) {
  const tx = useTx();
  const [view, setView] = useState(mode === 'buoyancy' ? 'buoyancy' : 'depth');
  const [liquidId, setLiquidId] = useState('agua');
  const [depth, setDepth] = useState(2);
  const [f1, setF1] = useState(300);
  const [a1, setA1] = useState(10);
  const [a2, setA2] = useState(400);
  const [rhoObj, setRhoObj] = useState(600);
  const liquid = LIQUIDS.find(item => item.id === liquidId);
  // Flotación: el cubo se acomoda con un resorte amortiguado hasta el equilibrio.
  const SIDE = 70;
  const target = rhoObj < liquid.rho ? SIDE * (rhoObj / liquid.rho) : SIDE + 150;
  const pos = useRef({ y: 0, v: 0 });
  const [y, setY] = useState(0);
  useEffect(() => { pos.current = { y: 0, v: 0 }; setY(0); }, [rhoObj, liquidId]);
  const settling = view === 'buoyancy' && (Math.abs(pos.current.y - target) > 0.2 || Math.abs(pos.current.v) > 0.2);
  useFrame(dt => {
    const s = pos.current;
    const a = (target - s.y) * 18 - s.v * 4.5;
    s.v += a * dt; s.y += s.v * dt;
    if (s.y > SIDE + 150) { s.y = SIDE + 150; s.v = 0; }
    setY(s.y);
  }, settling);

  const buoy = BuoyancyScene({ liquid, rhoObj, y, tx });
  const P = P0 + liquid.rho * G * depth;
  const sinks = rhoObj > liquid.rho;
  const V = 0.001;

  return <Sim
    title={view === 'buoyancy' ? tx('Flotación: Principio de Arquímedes', 'Flotación: Arquímedes principio') : view === 'pascal' ? tx('Prensa hidráulica: Principio de Pascal', 'Prensa hidráulica: Pascal principio') : tx('Presión y profundidad', 'Presión ha ipypuku')}
    subtitle={view === 'buoyancy' ? tx('El líquido empuja hacia arriba con una fuerza igual al peso del líquido desalojado.', 'Líquido omosẽ yvate gotyo fuerza reheve, líquido omosẽva ipeso ha’eháicha.') : view === 'pascal' ? tx('La presión se transmite igual: una fuerza chica en un émbolo chico levanta un auto.', 'Presión ohasa peteĩcha: fuerza michĩ émbolo michĩme ojupi auto.') : tx('La presión aumenta con la profundidad: P = P₀ + ρ·g·h.', 'Presión ojupi ipypukúvo: P = P₀ + ρ·g·h.')}
    actions={<Choice options={[{ id: 'depth', label: tx('Profundidad', 'Ipypuku') }, { id: 'pascal', label: 'Pascal' }, { id: 'buoyancy', label: tx('Arquímedes', 'Arquímedes') }]} value={view} onChange={setView} />}
    controls={<>
      {view !== 'pascal' && <Choice label={tx('Líquido', 'Líquido')} options={LIQUIDS.map(item => ({ id: item.id, label: tx(item.es, item.gn) }))} value={liquidId} onChange={setLiquidId} />}
      {view === 'depth' && <Slider label={tx('Profundidad de la sonda', 'Sonda ipypuku')} value={depth} min={0} max={5} step={0.1} unit="m" onChange={setDepth} />}
      {view === 'pascal' && <>
        <Slider label={tx('Fuerza en el émbolo chico', 'Émbolo michĩ fuerza')} value={f1} min={50} max={600} step={10} unit="N" onChange={setF1} />
        <Slider label={tx('Área chica A₁', 'Área michĩ A₁')} value={a1} min={5} max={40} step={1} unit="cm²" onChange={setA1} />
        <Slider label={tx('Área grande A₂', 'Área tuicha A₂')} value={a2} min={100} max={1000} step={20} unit="cm²" onChange={setA2} />
      </>}
      {view === 'buoyancy' && <Slider label={tx('Densidad del cubo', 'Cubo densidad')} value={rhoObj} min={100} max={8000} step={50} unit="kg/m³" onChange={setRhoObj} />}
    </>}
    readouts={view === 'depth' ? <>
      <Readouts items={[
        { label: tx('Presión total', 'Presión total'), value: P / 1000, unit: 'kPa', tone: 'red' },
        { label: tx('Por el líquido', 'Líquido rupi'), value: (liquid.rho * G * depth) / 1000, unit: 'kPa', tone: 'blue' },
        { label: tx('Atmosférica', 'Atmosférica'), value: P0 / 1000, unit: 'kPa' },
        { label: 'ρ', value: liquid.rho, unit: 'kg/m³', tone: 'green' },
      ]} />
      <Verdict tone="info">{tx('Más profundo → más presión → el agua sale más rápido por el agujero.', 'Ypypukuve → presión hetave → y osẽ pya’eve kuágui.')}</Verdict>
    </> : view === 'pascal' ? <>
      <Readouts items={[
        { label: tx('Presión', 'Presión'), value: f1 / (a1 / 1e4) / 1000, unit: 'kPa', tone: 'blue' },
        { label: 'F₂', value: (f1 * a2) / a1, unit: 'N', tone: 'green' },
        { label: tx('Multiplica por', 'Omultiplica'), value: a2 / a1, unit: '×', tone: 'violet' },
      ]} />
      <Verdict tone={(f1 * a2) / a1 >= 9800 ? 'good' : 'warn'}>{(f1 * a2) / a1 >= 9800 ? tx('¡Alcanza para levantar el auto!', '¡Ojupi auto!') : tx('Todavía no alcanza: aumentá F₁ o la relación de áreas.', 'Ndohupytýi gueteri: embotuicha F₁ térã área relación.')}</Verdict>
    </> : <>
      <Readouts items={[
        { label: tx('Peso P', 'Peso P'), value: buoy.P, unit: 'N', tone: 'red' },
        { label: tx('Empuje E', 'Empuje E'), value: buoy.E, unit: 'N', tone: 'blue' },
        { label: tx('Sumergido', 'Oike ýpe'), value: buoy.frac * 100, unit: '%', tone: 'green', digits: 0 },
        { label: tx('Peso aparente', 'Peso aparente'), value: sinks ? (rhoObj - liquid.rho) * V * G : 0, unit: 'N', tone: 'amber' },
      ]} />
      <Verdict tone={sinks ? 'warn' : 'good'}>{sinks ? tx(`Se hunde: ${rhoObj} > ${liquid.rho} kg/m³ (más denso que el líquido).`, `Oike ypýpe: ${rhoObj} > ${liquid.rho} kg/m³.`) : tx(`Flota con el ${num((rhoObj / liquid.rho) * 100, 0)} % sumergido: ahí el empuje iguala al peso.`, `Ovevúi ${num((rhoObj / liquid.rho) * 100, 0)} % oike ýpe: upépe empuje ojoja peso ndive.`)}</Verdict>
    </>}
    graphs={view === 'depth' ? <Graph title={tx('Presión vs. profundidad', 'Presión vs. ipypuku')} xLabel="h (m)" yLabel="P (kPa)" xMax={5} yMin={0}
      series={[{ points: [[0, P0 / 1000], [5, (P0 + liquid.rho * G * 5) / 1000]], color: COLORS.blue }]} marker={[depth, P / 1000]} /> : null}
    footer={view === 'buoyancy' ? 'E = ρ_líq · g · V_sum (cubo de 1 litro)' : view === 'pascal' ? 'F₁ / A₁ = F₂ / A₂' : 'P = P₀ + ρ·g·h ; P₀ = 101,3 kPa'}
  >
    <Stage width={640} height={360} label={tx('Recipiente con líquido', 'Recipiente líquido reheve')}>
      {view === 'depth' ? <PressureScene liquid={liquid} depth={depth} tx={tx} /> : view === 'pascal' ? <PascalScene f1={f1} a1={a1} a2={a2} tx={tx} /> : buoy.node}
    </Stage>
  </Sim>;
}
