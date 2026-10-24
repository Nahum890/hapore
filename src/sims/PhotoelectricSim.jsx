// Efecto fotoeléctrico: la luz arranca electrones de un metal solo si la
// energía de cada fotón (E = h·f) supera la función trabajo φ. Más intensidad
// = más electrones, pero no más rápidos. Gráfico Ec máx. vs. frecuencia.
import { useRef, useState } from 'react';
import { Sim, Stage, Slider, Choice, Readouts, Verdict, Graph, useFrame, useTx, num, INK, COLORS } from './SimKit.jsx';

const H = 6.63e-34, E = 1.6e-19, C = 3e8;
const METALS = [{ id: 'sodio', es: 'Sodio', gn: 'Sodio', phi: 2.28 }, { id: 'zinc', es: 'Zinc', gn: 'Zinc', phi: 4.3 }, { id: 'cobre', es: 'Cobre', gn: 'Cobre', phi: 4.7 }];

/** Color aproximado de una longitud de onda (nm); ultravioleta en violeta oscuro. */
function waveColor(nm) {
  if (nm < 380) return '#6d28d9';
  const stops = [[380, [120, 0, 200]], [440, [70, 60, 255]], [490, [0, 170, 255]], [530, [40, 200, 80]], [580, [250, 220, 0]], [620, [255, 120, 0]], [700, [220, 20, 40]]];
  for (let i = 1; i < stops.length; i += 1) {
    if (nm <= stops[i][0]) { const [a, ca] = stops[i - 1], [b, cb] = stops[i]; const k = (nm - a) / (b - a); return `rgb(${ca.map((v, j) => Math.round(v + (cb[j] - v) * k)).join(',')})`; }
  }
  return 'rgb(220,20,40)';
}

export default function PhotoelectricSim() {
  const tx = useTx();
  const [nm, setNm] = useState(400);
  const [intensity, setIntensity] = useState(50);
  const [metalId, setMetalId] = useState('sodio');
  const metal = METALS.find(m => m.id === metalId);
  const f = C / (nm * 1e-9);
  const ePhoton = (H * f) / E;
  const ec = ePhoton - metal.phi;
  const emits = ec > 0;
  const color = waveColor(nm);
  const photons = useRef([]);
  const electrons = useRef([]);
  const spawn = useRef(0);
  const [, tick] = useState(0);
  useFrame(dt => {
    spawn.current += dt * intensity * 0.3;
    while (spawn.current > 1) { spawn.current -= 1; photons.current.push({ x: 70, y: 120 + Math.random() * 130 }); }
    photons.current = photons.current.filter(p => {
      p.x += 420 * dt; p.y += (p.y < 185 ? 0.6 : -0.6) * 60 * dt;
      if (p.x >= 300) { if (emits) electrons.current.push({ x: 300, y: p.y, v: 60 + Math.sqrt(ec) * 160 }); return false; }
      return true;
    });
    electrons.current = electrons.current.filter(e => { e.x += e.v * dt; return e.x < 560; });
    tick(n => n + 1);
  }, true);
  const thresholdF = (metal.phi * E) / H;
  const series = [{ points: [[thresholdF / 1e14, 0], [16, ((H * 16e14) / E) - metal.phi]], color: COLORS.violet }];

  return <Sim title={tx('Efecto fotoeléctrico', 'Efecto fotoeléctrico')} subtitle={tx('Cada fotón tiene energía E = h·f. Solo si supera la función trabajo del metal arranca un electrón.', 'Káda fotón oguereko energía E = h·f. Ohasáramo metal función trabajo, omosẽ electrón.')}
    actions={<Choice options={METALS.map(m => ({ id: m.id, label: tx(m.es, m.gn) }))} value={metalId} onChange={setMetalId} />}
    controls={<>
      <Slider label={tx('Longitud de onda de la luz', 'Tesape longitud de onda')} value={nm} min={150} max={700} step={5} unit="nm" onChange={setNm} />
      <Slider label={tx('Intensidad (brillo)', 'Intensidad (hesape)')} value={intensity} min={5} max={100} step={5} unit="%" onChange={setIntensity} />
    </>}
    readouts={<>
      <Readouts items={[
        { label: tx('Frecuencia', 'Frecuencia'), value: f, unit: 'Hz', tone: 'blue' },
        { label: tx('Energía del fotón', 'Fotón energía'), value: ePhoton, unit: 'eV', tone: 'violet' },
        { label: tx('Función trabajo φ', 'Función trabajo φ'), value: metal.phi, unit: 'eV', tone: 'amber' },
        { label: tx('Ec máx. del electrón', 'Electrón Ec máx.'), value: Math.max(0, ec), unit: 'eV', tone: 'green' },
      ]} />
      <Verdict tone={emits ? 'good' : 'warn'}>{emits ? tx('Salen electrones. Subí la intensidad: salen más, pero no más rápidos.', 'Osẽ electrón. Embojupi intensidad: osẽ hetave, ndaha’éi pya’eve.') : tx('No sale ninguno, aunque subas el brillo: cada fotón tiene poca energía (frecuencia baja).', 'Ndosẽi ni peteĩ, rembojupíramo jepe hesape: káda fotón oguereko sa’i energía.')}</Verdict>
    </>}
    graphs={<Graph title={tx('Energía cinética máxima vs. frecuencia', 'Energía cinética máxima vs. frecuencia')} xLabel="f (×10¹⁴ Hz)" yLabel="Ec (eV)" xMin={0} xMax={16} yMin={0} yMax={5} series={series} marker={[f / 1e14, Math.max(0, ec)]} />}
    footer="E = h·f ; Ec máx = h·f − φ ; h = 6,63 × 10⁻³⁴ J·s">
    <Stage width={640} height={320} label={tx('Tubo con metal iluminado', 'Tubo metal ohesapéva reheve')}>
      <rect x="20" y="90" width="60" height="190" rx="10" fill="#334155" stroke={INK} strokeWidth="2" />
      <circle cx="68" cy="185" r="16" fill={color} stroke="#fff" strokeWidth="2" opacity={0.5 + intensity / 200} />
      <text x="50" y="300" textAnchor="middle" className="sim-tick">{tx('lámpara', 'lámpara')}</text>
      <rect x="250" y="60" width="350" height="230" rx="40" fill="#f1f5f9" stroke={INK} strokeWidth="2" opacity=".9" />
      <rect x="290" y="100" width="16" height="150" fill="#94a3b8" stroke={INK} strokeWidth="2" />
      <text x="298" y="270" textAnchor="middle" className="sim-tick">{tx(metal.es, metal.gn)}</text>
      <rect x="548" y="100" width="12" height="150" fill="#cbd5e1" stroke={INK} strokeWidth="2" />
      {photons.current.map((p, i) => <path key={i} d={`M${p.x - 14} ${p.y} q3.5 -5 7 0 t7 0`} fill="none" stroke={color} strokeWidth="2.4" />)}
      {electrons.current.map((e, i) => <circle key={i} cx={e.x} cy={e.y} r="4" fill={COLORS.blue} stroke="#fff" strokeWidth="1" />)}
      <path d="M560 175 H610 V300 H300 V250" fill="none" stroke={INK} strokeWidth="2" />
      <g transform="translate(455 300)"><circle r="16" fill="#fff" stroke={INK} strokeWidth="2" /><text y="5" textAnchor="middle" style={{ font: '900 13px system-ui', fill: INK }}>A</text></g>
    </Stage>
  </Sim>;
}
