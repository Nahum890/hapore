// Gravitación y leyes de Kepler: órbita elíptica con el Sol en un foco y
// sectores de igual tiempo (áreas iguales, 2.ª ley). Fuerza ∝ 1/r².
import { useMemo, useState } from 'react';
import { Sim, Stage, Slider, PlayBar, Readouts, Toggle, Arrow, Verdict, useSimClock, useTx, num, INK, COLORS, VECTOR } from './SimKit.jsx';

const A_PX = 210, CX = 320, CY = 190, SECTORS = 12;

function solveKepler(M, e) {
  let E = M;
  for (let i = 0; i < 12; i += 1) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
  return E;
}

export default function OrbitSim() {
  const tx = useTx();
  const [e, setE] = useState(0.5);
  const [period, setPeriod] = useState(12);
  const [areas, setAreas] = useState(true);
  const clock = useSimClock();
  const b = A_PX * Math.sqrt(1 - e * e);
  const c = A_PX * e;
  const sun = { x: CX + c, y: CY };
  const posAt = M => { const E = solveKepler(M, e); return { x: CX + A_PX * Math.cos(E), y: CY - b * Math.sin(E) }; };
  const M = ((2 * Math.PI * clock.time) / period) % (2 * Math.PI);
  const planet = posAt(M);
  const r = Math.hypot(planet.x - sun.x, planet.y - sun.y);
  const rMin = A_PX * (1 - e), rMax = A_PX * (1 + e);
  const speedRel = Math.sqrt(2 / (r / A_PX) - 1); // vis-viva relativa a la velocidad circular media
  const forceRel = (A_PX / r) ** 2;
  const sectors = useMemo(() => Array.from({ length: SECTORS }, (_, k) => {
    const pts = Array.from({ length: 13 }, (_, j) => posAt(((k + j / 12) * 2 * Math.PI) / SECTORS));
    return `M${sun.x} ${sun.y} ` + pts.map(p => `L${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ') + ' Z';
  }), [e]); // eslint-disable-line react-hooks/exhaustive-deps
  const dir = { x: (sun.x - planet.x) / r, y: (sun.y - planet.y) / r };

  return <Sim
    title={tx('Gravitación y leyes de Kepler', 'Gravitación ha Kepler ley-kuéra')}
    subtitle={tx('1.ª ley: órbita elíptica con el Sol en un foco. 2.ª ley: en tiempos iguales barre áreas iguales (cerca del Sol va más rápido).', '1.ª ley: órbita elíptica, Kuarahy peteĩ foco-pe. 2.ª ley: tiempo peteĩchagua-pe ombogue área peteĩchagua.')}
    controls={<>
      <PlayBar running={clock.running} onToggle={clock.toggle} onReset={clock.reset} time={clock.time} />
      <Slider label={tx('Excentricidad', 'Excentricidad')} value={e} min={0} max={0.8} step={0.05} onChange={setE} />
      <Slider label={tx('Período de la animación', 'Animación período')} value={period} min={6} max={24} step={1} unit="s" onChange={setPeriod} />
      <Toggle label={tx('Mostrar áreas de igual tiempo', 'Ehechauka área tiempo peteĩchagua')} checked={areas} onChange={setAreas} />
    </>}
    readouts={<>
      <Readouts items={[
        { label: tx('Distancia r / a', 'Distancia r / a'), value: r / A_PX, tone: 'blue' },
        { label: tx('Rapidez (relativa)', 'Rapidez (relativa)'), value: speedRel, tone: 'green' },
        { label: tx('Fuerza (relativa)', 'Fuerza (relativa)'), value: forceRel, tone: 'red' },
        { label: tx('Perihelio / afelio', 'Perihelio / afelio'), value: `${num(rMin / A_PX)} / ${num(rMax / A_PX)}`, tone: 'amber' },
      ]} />
      {e === 0 ? <Verdict tone="info">{tx('Excentricidad 0: la órbita es un círculo y la rapidez no cambia.', 'Excentricidad 0: órbita ha’e círculo ha rapidez ndokambiái.')}</Verdict>
        : <Verdict tone="good">{tx(`En el perihelio va ${num(Math.sqrt((1 + e) / (1 - e)))} veces más rápido que en el afelio.`, `Perihelio-pe oho ${num(Math.sqrt((1 + e) / (1 - e)))} veces pya’eve afelio-gui.`)}</Verdict>}
    </>}
    footer="F = G·M·m / r² ; Kepler 2: áreas iguales en tiempos iguales"
  >
    <Stage width={640} height={380} label={tx('Órbita elíptica', 'Órbita elíptica')}>
      <rect width="640" height="380" fill="#0f1a33" />
      {Array.from({ length: 40 }, (_, i) => <circle key={i} cx={(i * 97) % 640} cy={(i * 53) % 380} r={i % 3 ? 0.8 : 1.4} fill="#cbd5e1" opacity=".7" />)}
      {areas && sectors.map((d, k) => <path key={k} d={d} fill={k % 2 ? 'rgba(245,158,11,.22)' : 'rgba(59,130,246,.22)'} stroke="rgba(255,255,255,.12)" />)}
      <ellipse cx={CX} cy={CY} rx={A_PX} ry={b} fill="none" stroke="#e2e8f0" strokeWidth="1.6" strokeDasharray="5 6" />
      <circle cx={CX - c} cy={CY} r="3" fill="#94a3b8" />
      <text x={CX - c} y={CY + 18} textAnchor="middle" style={{ font: '700 11px system-ui', fill: '#94a3b8' }}>{tx('foco vacío', 'foco nandi')}</text>
      <circle cx={sun.x} cy={sun.y} r="20" fill="#f59e0b" stroke="#fde68a" strokeWidth="4" />
      <text x={sun.x} y={sun.y + 40} textAnchor="middle" style={{ font: '800 12px system-ui', fill: '#fde68a' }}>{tx('Sol', 'Kuarahy')}</text>
      <line x1={sun.x} y1={sun.y} x2={planet.x} y2={planet.y} stroke="#e2e8f0" strokeWidth="1.2" opacity=".6" />
      <Arrow x1={planet.x} y1={planet.y} x2={planet.x + dir.x * Math.min(80, 26 * forceRel)} y2={planet.y + dir.y * Math.min(80, 26 * forceRel)} color="#fb7185" label="F" />
      <circle cx={planet.x} cy={planet.y} r="10" fill="#60a5fa" stroke="#e0f2fe" strokeWidth="2.5" />
    </Stage>
  </Sim>;
}
