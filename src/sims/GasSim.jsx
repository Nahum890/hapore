// Gases: cilindro con pistón y partículas (más rápidas a más temperatura),
// cuatro procesos con su camino en el diagrama P–V al lado, y un ciclo de
// Carnot con su rendimiento máximo. Gas ideal monoatómico (γ = 5/3).
import { useMemo, useRef, useState } from 'react';
import { Sim, Stage, Slider, Choice, Readouts, Verdict, PlayBar, Plot, useFrame, useSimClock, useTx, num, INK, COLORS } from './SimKit.jsx';

const NR = 100 / 300; // kPa·L/K: estado inicial 100 kPa, 1 L, 300 K
const GAMMA = 5 / 3, CV = 1.5;
const PROCESSES = ['isotermico', 'isobarico', 'isocorico', 'adiabatico'];

function stateFor(process, control) {
  // control: V (L) en isotérmico/adiabático, T (K) en isobárico/isocórico.
  if (process === 'isotermico') return { V: control, T: 300, P: (NR * 300) / control };
  if (process === 'adiabatico') { const P = 100 * (1 / control) ** GAMMA; return { V: control, P, T: (P * control) / NR }; }
  if (process === 'isobarico') return { T: control, P: 100, V: (NR * control) / 100 };
  return { T: control, V: 1, P: (NR * control) / 1 };
}

function Cylinder({ V, T, particles, vMax }) {
  const X = 40, Y = 70, W = 170, maxH = 230;
  const h = Math.max(14, Math.min(maxH, (maxH * V) / vMax));
  const top = Y + maxH - h;
  const warm = Math.max(0, Math.min(1, (T - 200) / 500));
  return <g>
    <rect x={X - 8} y={Y - 10} width={W + 16} height={maxH + 20} fill="none" stroke={INK} strokeWidth="3" />
    <rect x={X} y={top} width={W} height={h + 8} fill={`rgba(${Math.round(120 + 120 * warm)}, ${Math.round(170 - 40 * warm)}, ${Math.round(235 - 140 * warm)}, .25)`} />
    {particles.map((p, i) => <circle key={i} cx={X + 6 + p.x * (W - 12)} cy={top + 6 + p.y * (h - 6)} r="3.2" fill={COLORS.blue} />)}
    <rect x={X - 4} y={top - 14} width={W + 8} height="14" fill="#94a3b8" stroke={INK} strokeWidth="2" />
    <rect x={X + W / 2 - 6} y={Y - 50} width="12" height={top - 14 - Y + 50} fill="#cbd5e1" stroke={INK} strokeWidth="1.5" />
    <text x={X + W / 2} y={Y + maxH + 32} textAnchor="middle" className="sim-label sim-label-small" fill={INK}>{num(V)} L · {num(T, 0)} K</text>
  </g>;
}

export default function GasSim({ mode = 'process' }) {
  const tx = useTx();
  const [view, setView] = useState(mode === 'cycle' ? 'cycle' : 'process');
  const [process, setProcess] = useState('isotermico');
  const [control, setControl] = useState(1);
  const [tc, setTc] = useState(600);
  const [tf, setTf] = useState(300);
  const range = process === 'isotermico' || process === 'adiabatico' ? { min: 0.4, max: 3.5, step: 0.05, unit: 'L', start: 1 } : { min: 200, max: 600, step: 5, unit: 'K', start: 300 };
  const value = Math.min(range.max, Math.max(range.min, control));
  const now = stateFor(process, value);
  const start = stateFor(process, range.start);
  const path = useMemo(() => Array.from({ length: 41 }, (_, i) => { const c = range.start + (value - range.start) * (i / 40); const s = stateFor(process, c); return [s.V, s.P]; }), [process, value]); // eslint-disable-line react-hooks/exhaustive-deps
  const W = process === 'isocorico' ? 0 : process === 'isobarico' ? 100 * (now.V - start.V) : process === 'isotermico' ? NR * 300 * Math.log(now.V / start.V) : -CV * NR * (now.T - start.T);
  const dU = CV * NR * (now.T - start.T);
  const Q = dU + W;

  // Partículas: la velocidad crece con √T.
  const particles = useRef(Array.from({ length: 34 }, (_, i) => ({ x: (i * 0.618) % 1, y: (i * 0.755) % 1, vx: Math.cos(i * 2.3), vy: Math.sin(i * 2.3) })));
  const [, tick] = useState(0);
  const clock = useSimClock({ maxTime: Infinity });
  const carnot = useMemo(() => {
    const V1 = 1, V2 = 2;
    const ratio = (tc / tf) ** (1 / (GAMMA - 1));
    const V3 = V2 * ratio, V4 = V1 * ratio;
    const iso = (Va, Vb, T) => Array.from({ length: 30 }, (_, i) => { const V = Va + (Vb - Va) * (i / 29); return [V, (NR * T) / V]; });
    const adi = (Va, Vb, Pa) => Array.from({ length: 30 }, (_, i) => { const V = Va + (Vb - Va) * (i / 29); return [V, Pa * (Va / V) ** GAMMA]; });
    const a = iso(V1, V2, tc), b = adi(V2, V3, (NR * tc) / V2), c = iso(V3, V4, tf), d = adi(V4, V1, (NR * tf) / V4);
    return { loop: [...a, ...b, ...c, ...d], legs: [a, b, c, d], vMax: V3 * 1.08, pMax: ((NR * tc) / V1) * 1.08 };
  }, [tc, tf]);
  const loopIndex = Math.max(0, Math.floor((clock.time * 30) % carnot.loop.length));
  const cyclePoint = carnot.loop[loopIndex];
  const leg = Math.floor(loopIndex / 30);
  const temp = view === 'process' ? now.T : (cyclePoint[1] * cyclePoint[0]) / NR;
  useFrame(dt => {
    const speed = 0.4 * Math.sqrt(temp / 300);
    for (const p of particles.current) {
      p.x += p.vx * speed * dt; p.y += p.vy * speed * dt;
      if (p.x < 0 || p.x > 1) { p.vx *= -1; p.x = Math.min(1, Math.max(0, p.x)); }
      if (p.y < 0 || p.y > 1) { p.vy *= -1; p.y = Math.min(1, Math.max(0, p.y)); }
    }
    tick(n => n + 1);
  }, true);

  const legNames = [tx('Expansión isotérmica: recibe calor del foco caliente', 'Expansión isotérmica: ohupyty calor foco hakúgui'), tx('Expansión adiabática: se enfría sin intercambiar calor', 'Expansión adiabática: oñembohesaku’ỹ calor’ỹre'), tx('Compresión isotérmica: entrega calor al foco frío', 'Compresión isotérmica: ome’ẽ calor foco ro’ýpe'), tx('Compresión adiabática: se calienta sin intercambiar calor', 'Compresión adiabática: haku calor’ỹre')];
  const tabs = <Choice options={[{ id: 'process', label: tx('Procesos', 'Proceso') }, { id: 'cycle', label: tx('Ciclo de Carnot', 'Carnot ciclo') }]} value={view} onChange={setView} />;

  if (view === 'cycle') {
    const eta = 1 - tf / tc;
    return <Sim title={tx('Máquina térmica: ciclo de Carnot', 'Máquina térmica: Carnot ciclo')} subtitle={tx('Ninguna máquina puede superar el rendimiento de Carnot: η = 1 − T_f / T_c (en kelvin).', 'Ni peteĩ máquina ndohasái Carnot rendimiento: η = 1 − T_f / T_c (kelvin-pe).')}
      actions={tabs}
      controls={<>
        <PlayBar running={clock.running} onToggle={clock.toggle} onReset={clock.reset} />
        <Slider label={tx('Foco caliente', 'Foco haku')} value={tc} min={400} max={900} step={10} unit="K" onChange={setTc} />
        <Slider label={tx('Foco frío', 'Foco ro’y')} value={tf} min={250} max={390} step={5} unit="K" onChange={setTf} />
      </>}
      readouts={<>
        <Readouts items={[{ label: tx('Rendimiento máximo', 'Rendimiento máximo'), value: eta * 100, unit: '%', tone: 'green', digits: 1 }, { label: 'T_c', value: tc, unit: 'K', tone: 'red' }, { label: 'T_f', value: tf, unit: 'K', tone: 'blue' }, { label: tx('T del gas', 'Gas T'), value: temp, unit: 'K', tone: 'amber', digits: 0 }]} />
        <Verdict tone="info">{legNames[leg]}</Verdict>
      </>}
      footer={tx('El área encerrada por el ciclo en el diagrama P–V es el trabajo neto de cada vuelta.', 'Ciclo área oñembotýva diagrama P–V-pe ha’e trabajo neto.')}>
      <Stage width={640} height={360} label={tx('Cilindro y diagrama P–V', 'Cilindro ha diagrama P–V')}>
        <Cylinder V={cyclePoint[0]} T={temp} particles={particles.current} vMax={carnot.vMax} />
        <Plot x={300} y={40} width={310} height={260} xLabel="V (L)" yLabel="P (kPa)" xMax={carnot.vMax} yMax={carnot.pMax}
          series={carnot.legs.map((points, index) => ({ points, color: [COLORS.red, COLORS.amber, COLORS.blue, COLORS.violet][index] }))} marker={cyclePoint} />
      </Stage>
    </Sim>;
  }

  return <Sim title={tx('Procesos de un gas', 'Gas proceso')} subtitle={tx('Elegí un proceso y mové el control: el camino queda dibujado en el diagrama P–V.', 'Eiporavo proceso ha emongu’e control: tape ojehai diagrama P–V-pe.')}
    actions={tabs}
    controls={<>
      <Choice label={tx('Proceso', 'Proceso')} options={PROCESSES.map(id => ({ id, label: { isotermico: tx('Isotérmico', 'Isotérmico'), isobarico: tx('Isobárico', 'Isobárico'), isocorico: tx('Isocórico', 'Isocórico'), adiabatico: tx('Adiabático', 'Adiabático') }[id] }))} value={process} onChange={next => { setProcess(next); setControl(next === 'isotermico' || next === 'adiabatico' ? 1 : 300); }} />
      <Slider label={process === 'isotermico' || process === 'adiabatico' ? tx('Volumen', 'Volumen') : tx('Temperatura', 'Temperatura')} value={value} min={range.min} max={range.max} step={range.step} unit={range.unit} onChange={setControl} />
    </>}
    readouts={<>
      <Readouts items={[
        { label: 'P', value: now.P, unit: 'kPa', tone: 'red' }, { label: 'V', value: now.V, unit: 'L', tone: 'blue' }, { label: 'T', value: now.T, unit: 'K', tone: 'amber' },
        { label: tx('Trabajo W', 'Trabajo W'), value: W, unit: 'J', tone: 'green' }, { label: 'ΔU', value: dU, unit: 'J', tone: 'violet' }, { label: 'Q', value: Q, unit: 'J', tone: 'amber' },
      ]} />
      <Verdict tone="info">{{
        isotermico: tx('T constante: P·V se mantiene (Boyle). ΔU = 0, todo el calor se vuelve trabajo.', 'T constante: P·V oñeñongatu (Boyle). ΔU = 0.'),
        isobarico: tx('P constante: V crece con T (Charles). W = P·ΔV.', 'P constante: V okakuaa T ndive (Charles). W = P·ΔV.'),
        isocorico: tx('V constante: P crece con T (Gay-Lussac). No hay trabajo (W = 0).', 'V constante: P okakuaa T ndive (Gay-Lussac). W = 0.'),
        adiabatico: tx('Sin intercambio de calor (Q = 0): al comprimirlo se calienta.', 'Calor ñembohasa’ỹre (Q = 0): oñemichĩvo haku.'),
      }[process]}</Verdict>
    </>}
    footer="P·V = n·R·T ; Q = ΔU + W (gas ideal monoatómico)">
    <Stage width={640} height={360} label={tx('Cilindro y diagrama P–V', 'Cilindro ha diagrama P–V')}>
      <Cylinder V={now.V} T={now.T} particles={particles.current} vMax={3.7} />
      <Plot x={300} y={40} width={310} height={260} xLabel="V (L)" yLabel="P (kPa)" xMin={0} xMax={3.6} yMax={260} series={[{ points: path, color: COLORS.violet }]} marker={[now.V, now.P]} area={process !== 'isocorico'} />
    </Stage>
  </Sim>;
}
