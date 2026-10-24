// Magnitudes y unidades: velocímetro con doble escala (km/h y m/s) y escalera
// de potencias de diez para longitudes con objetos conocidos.
import { useState } from 'react';
import { Sim, Stage, Slider, Choice, Readouts, Verdict, useTx, num, INK, COLORS } from './SimKit.jsx';

const LENGTHS = [
  { exp: -3, es: 'Una hormiga (≈ 3 mm)', gn: 'Tahýi (≈ 3 mm)', unit: 'mm' },
  { exp: -2, es: 'El ancho de un dedo (≈ 1 cm)', gn: 'Kuã ipe (≈ 1 cm)', unit: 'cm' },
  { exp: -1, es: 'Un celular (≈ 15 cm)', gn: 'Celular (≈ 15 cm)', unit: 'dm' },
  { exp: 0, es: 'Un paso (≈ 1 m)', gn: 'Peteĩ pyrũ (≈ 1 m)', unit: 'm' },
  { exp: 1, es: 'Un aula (≈ 10 m)', gn: 'Mbo’ehao kotypy (≈ 10 m)', unit: 'dam' },
  { exp: 2, es: 'Una cancha de fútbol (≈ 100 m)', gn: 'Cancha (≈ 100 m)', unit: 'hm' },
  { exp: 3, es: 'Diez cuadras (≈ 1 km)', gn: 'Pa cuadra (≈ 1 km)', unit: 'km' },
  { exp: 5, es: 'Asunción–Encarnación (≈ 370 km)', gn: 'Asunción–Encarnación (≈ 370 km)', unit: '100 km' },
  { exp: 7, es: 'El diámetro de la Tierra (≈ 12 742 km)', gn: 'Yvy diámetro (≈ 12 742 km)', unit: '10⁴ km' },
];

export default function UnitsSim() {
  const tx = useTx();
  const [mode, setMode] = useState('speed');
  const [kmh, setKmh] = useState(72);
  const [exp, setExp] = useState(0);
  const ms = kmh / 3.6;
  const angle = -120 + (kmh / 144) * 240;
  const CX = 250, CY = 200, R = 150;
  const polar = (deg, r) => ({ x: CX + r * Math.sin((deg * Math.PI) / 180), y: CY - r * Math.cos((deg * Math.PI) / 180) });
  const item = LENGTHS.find(entry => entry.exp === exp) ?? LENGTHS[3];

  return <Sim
    title={tx('Magnitudes y unidades', 'Magnitud ha unidad')}
    subtitle={mode === 'speed' ? tx('El mismo valor en dos unidades: para pasar de km/h a m/s se divide por 3,6.', 'Peteĩ valor mokõi unidad-pe: km/h guive m/s-pe oñedividi 3,6 rehe.') : tx('Cada escalón multiplica por 10: así funcionan los prefijos del Sistema Internacional.', 'Káda escalón omultiplica 10 rehe: péicha oiko Sistema Internacional prefijo.')}
    actions={<Choice options={[{ id: 'speed', label: tx('Velocidad', 'Velocidad') }, { id: 'length', label: tx('Longitud', 'Longitud') }]} value={mode} onChange={setMode} />}
    controls={mode === 'speed'
      ? <Slider label={tx('Velocidad', 'Velocidad')} value={kmh} min={0} max={144} step={1} unit="km/h" onChange={setKmh} />
      : <Slider label={tx('Potencia de diez (metros)', 'Diez potencia (metro)')} value={exp} min={-3} max={7} step={1} onChange={value => setExp(LENGTHS.some(entry => entry.exp === value) ? value : value + 1)} digits={0} />}
    readouts={mode === 'speed' ? <>
      <Readouts items={[{ label: 'km/h', value: kmh, tone: 'blue' }, { label: 'm/s', value: ms, tone: 'red' }]} />
      <Verdict tone="info">{tx(`${num(kmh)} km/h ÷ 3,6 = ${num(ms)} m/s`, `${num(kmh)} km/h ÷ 3,6 = ${num(ms)} m/s`)}</Verdict>
    </> : <>
      <Readouts items={[{ label: tx('Orden de magnitud', 'Orden de magnitud'), value: `10${String(exp).replace('-', '⁻').replace(/\d/g, d => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d])} m`, tone: 'blue' }, { label: tx('Unidad', 'Unidad'), value: item.unit, tone: 'green' }]} />
      <Verdict tone="info">{tx(item.es, item.gn)}</Verdict>
    </>}
    footer={tx('Unidades fundamentales del SI: metro (m), kilogramo (kg), segundo (s), amperio (A), kelvin (K), mol y candela.', 'SI unidad fundamental: metro (m), kilogramo (kg), segundo (s), amperio (A), kelvin (K), mol ha candela.')}
  >
    {mode === 'speed' ? <Stage width={500} height={330} label={tx('Velocímetro', 'Velocímetro')}>
      <circle cx={CX} cy={CY} r={R + 14} fill="#0f172a" />
      <circle cx={CX} cy={CY} r={R + 8} fill="#fff" stroke={INK} strokeWidth="3" />
      {Array.from({ length: 13 }, (_, i) => i * 12).map(v => { const deg = -120 + (v / 144) * 240; const a = polar(deg, R), b = polar(deg, R - 16), lbl = polar(deg, R - 30); return <g key={v}><line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={INK} strokeWidth="2.4" /><text x={lbl.x} y={lbl.y + 4} textAnchor="middle" style={{ font: '800 12px system-ui', fill: COLORS.blue }}>{v}</text></g>; })}
      {Array.from({ length: 9 }, (_, i) => i * 5).map(v => { const deg = -120 + ((v * 3.6) / 144) * 240; const a = polar(deg, R - 52), b = polar(deg, R - 60), lbl = polar(deg, R - 74); return <g key={`ms${v}`}><line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={COLORS.red} strokeWidth="2" /><text x={lbl.x} y={lbl.y + 4} textAnchor="middle" style={{ font: '700 11px system-ui', fill: COLORS.red }}>{v}</text></g>; })}
      <text x={CX} y={CY + 40} textAnchor="middle" style={{ font: '800 13px system-ui', fill: COLORS.blue }}>km/h</text>
      <text x={CX} y={CY + 58} textAnchor="middle" style={{ font: '800 12px system-ui', fill: COLORS.red }}>m/s</text>
      {(() => { const tip = polar(angle, R - 8); return <line x1={CX} y1={CY} x2={tip.x} y2={tip.y} stroke={COLORS.red} strokeWidth="4" strokeLinecap="round" />; })()}
      <circle cx={CX} cy={CY} r="10" fill={INK} />
      <rect x={CX - 60} y={CY + 72} width="120" height="34" rx="8" fill="#0f172a" />
      <text x={CX} y={CY + 95} textAnchor="middle" style={{ font: '800 16px ui-monospace, Consolas, monospace', fill: '#e2f0ff' }}>{num(kmh, 0)} km/h</text>
    </Stage> : <Stage width={500} height={330} label={tx('Escalera de potencias de diez', 'Diez potencia escalera')}>
      {LENGTHS.map((entry, index) => { const y = 300 - index * 32; const active = entry.exp === exp; return <g key={entry.exp}>
        <rect x={40 + index * 10} y={y - 22} width={420 - index * 20} height="26" rx="6" fill={active ? '#dbe7fb' : '#fff'} stroke={active ? COLORS.blue : '#cbd5e1'} strokeWidth={active ? 2.4 : 1.2} />
        <text x={52 + index * 10} y={y - 4} style={{ font: `${active ? 850 : 700} 12.5px system-ui`, fill: active ? COLORS.blue : '#334155' }}>10{String(entry.exp).replace('-', '⁻').replace(/\d/g, d => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d])} m</text>
        <text x={120 + index * 10} y={y - 4} style={{ font: '600 12px system-ui', fill: '#475569' }}>{tx(entry.es, entry.gn)}</text>
      </g>; })}
    </Stage>}
  </Sim>;
}
