// Conservación de la energía en una pista en U (half-pipe). Barras de energía
// potencial, cinética, mecánica y calor perdido por rozamiento.
import { useEffect, useRef, useState } from 'react';
import { Sim, Stage, Slider, PlayBar, Readouts, Graph, Toggle, Verdict, useFrame, useTx, num, INK, COLORS } from './SimKit.jsx';

const G = 9.8;
const X_HALF = 6, H_TRACK = 5; // metros
const trackY = x => H_TRACK * (x / X_HALF) ** 2;
const slope = x => (2 * H_TRACK * x) / (X_HALF * X_HALF);

export default function EnergySim() {
  const tx = useTx();
  const [h0, setH0] = useState(4);
  const [m, setM] = useState(50);
  const [friction, setFriction] = useState(false);
  const [mu, setMu] = useState(0.05);
  const x0 = -X_HALF * Math.sqrt(h0 / H_TRACK);
  const sim = useRef({ x: x0, v: 0, t: 0, heat: 0, log: [] });
  const [, force] = useState(0);
  const [running, setRunning] = useState(false);

  const reset = () => { sim.current = { x: x0, v: 0, t: 0, heat: 0, log: [] }; setRunning(false); force(n => n + 1); };
  useEffect(reset, [h0, m, friction, mu]); // eslint-disable-line react-hooks/exhaustive-deps

  useFrame(dt => {
    const s = sim.current;
    const sub = 20, h = dt / sub;
    for (let i = 0; i < sub; i += 1) {
      const phi = Math.atan(slope(s.x));
      let at = -G * Math.sin(phi);
      if (friction && Math.abs(s.v) > 1e-4) at -= Math.sign(s.v) * mu * G * Math.cos(phi);
      const vNew = s.v + at * h;
      const ds = vNew * h;
      if (friction) s.heat += mu * m * G * Math.cos(phi) * Math.abs(ds);
      s.v = vNew;
      s.x += ds * Math.cos(phi);
      if (Math.abs(s.x) > X_HALF) { s.x = Math.sign(s.x) * X_HALF; s.v = 0; }
    }
    s.t += dt;
    if (s.log.length === 0 || s.t - s.log.at(-1)[0] > 0.05) s.log.push([s.t, m * G * trackY(s.x), 0.5 * m * s.v * s.v]);
    if (s.t > 30) setRunning(false);
    force(n => n + 1);
  }, running);

  const s = sim.current;
  const Ep = m * G * trackY(s.x);
  const Ec = 0.5 * m * s.v * s.v;
  const E0 = m * G * h0;
  const W = 640, Hs = 330, L = 60, R = 580, BOTTOM = 290, TOP = 50;
  const sx = x => L + ((x + X_HALF) / (2 * X_HALF)) * (R - L);
  const sy = y => BOTTOM - (y / H_TRACK) * (BOTTOM - TOP);
  const trackPath = Array.from({ length: 61 }, (_, i) => { const x = -X_HALF + (i / 60) * 2 * X_HALF; return `${i ? 'L' : 'M'}${sx(x).toFixed(1)},${sy(trackY(x)).toFixed(1)}`; }).join(' ');
  const bar = (label, value, color, index) => {
    const height = (value / E0) * 180;
    return <g key={label} transform={`translate(${W + 20 + index * 46} 0)`}>
      <rect x="0" y={260 - 180} width="30" height="180" rx="4" fill="#f1f5f9" stroke="#cbd5e1" />
      <rect x="0" y={260 - Math.min(180, height)} width="30" height={Math.min(180, height)} rx="4" fill={color} />
      <text x="15" y="280" textAnchor="middle" className="sim-label sim-label-small" fill={INK}>{label}</text>
    </g>;
  };

  return <Sim
    title={tx('Energía en la pista', 'Energía pista-pe')}
    subtitle={tx('Arriba tiene energía potencial; abajo, cinética. Sin rozamiento la suma (mecánica) no cambia.', 'Yvate oguereko energía potencial; yvýpe, cinética. Rozamiento’ỹre suma (mecánica) ndokambiái.')}
    controls={<>
      <PlayBar running={running} onToggle={() => setRunning(value => !value)} onReset={reset} time={s.t} />
      <Slider label={tx('Altura de salida', 'Osẽhápe yvatekue')} value={h0} min={1} max={5} step={0.5} unit="m" onChange={setH0} />
      <Slider label={tx('Masa', 'Masa')} value={m} min={20} max={90} step={5} unit="kg" onChange={setM} />
      <Toggle label={tx('Con rozamiento', 'Rozamiento reheve')} checked={friction} onChange={setFriction} />
      {friction && <Slider label="μ" value={mu} min={0.01} max={0.2} step={0.01} onChange={setMu} />}
    </>}
    readouts={<>
      <Readouts items={[
        { label: tx('Altura', 'Yvatekue'), value: trackY(s.x), unit: 'm', tone: 'blue' },
        { label: tx('Rapidez', 'Rapidez'), value: Math.abs(s.v), unit: 'm/s', tone: 'green' },
        { label: 'Ep', value: Ep, unit: 'J', tone: 'blue' },
        { label: 'Ec', value: Ec, unit: 'J', tone: 'green' },
        { label: tx('Mecánica', 'Mecánica'), value: Ep + Ec, unit: 'J', tone: 'violet' },
        { label: tx('Calor perdido', 'Calor okañýva'), value: s.heat, unit: 'J', tone: 'red' },
      ]} />
      <Verdict tone={friction ? 'warn' : 'good'}>{friction ? tx('Con rozamiento la energía mecánica disminuye: se transforma en calor.', 'Rozamiento reheve energía mecánica oguejy: oiko calor-ramo.') : tx(`Sin rozamiento: abajo llega a √(2gh) = ${num(Math.sqrt(2 * G * h0))} m/s.`, `Rozamiento’ỹre: yvýpe og̃uahẽ √(2gh) = ${num(Math.sqrt(2 * G * h0))} m/s.`)}</Verdict>
    </>}
    graphs={<Graph title={tx('Energía en el tiempo', 'Energía tiempo-pe')} xLabel="t (s)" yLabel="E (J)" yMin={0} yMax={E0 * 1.05} xMax={Math.max(6, s.t)}
      series={[
        { points: s.log.map(p => [p[0], p[1]]), color: COLORS.blue, label: tx('Potencial', 'Potencial') },
        { points: s.log.map(p => [p[0], p[2]]), color: COLORS.green, label: tx('Cinética', 'Cinética') },
        { points: s.log.map(p => [p[0], p[1] + p[2]]), color: COLORS.violet, label: tx('Mecánica', 'Mecánica'), dashed: true },
      ]} />}
    footer="Ep = m·g·h ; Ec = ½·m·v² ; Em = Ep + Ec"
  >
    <Stage width={W + 200} height={Hs} label={tx('Pista en U', 'Pista U')}>
      <path d={`${trackPath} L${R} ${BOTTOM + 30} L${L} ${BOTTOM + 30} Z`} fill="#e9dcc4" />
      <path d={trackPath} fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />
      {[1, 2, 3, 4, 5].map(h => <g key={h}><line x1={L - 10} y1={sy(h)} x2={L - 2} y2={sy(h)} stroke={INK} /><text x={L - 14} y={sy(h) + 4} textAnchor="end" className="sim-tick">{h} m</text></g>)}
      <line x1={sx(x0)} y1={sy(h0)} x2={sx(-x0)} y2={sy(h0)} stroke={COLORS.amber} strokeDasharray="6 5" strokeWidth="1.5" />
      <text x={sx(-x0) + 6} y={sy(h0) - 6} className="sim-label sim-label-small" fill="#92400e">{tx('altura de salida', 'osẽhápe yvatekue')}</text>
      {(() => {
        // Inclinación en pantalla (y hacia abajo) y normal hacia afuera de la pista.
        const kScale = ((BOTTOM - TOP) / H_TRACK) / ((R - L) / (2 * X_HALF));
        const rot = Math.atan(-slope(s.x) * kScale);
        const cx = sx(s.x) + Math.sin(rot) * 2, cy = sy(trackY(s.x)) - Math.cos(rot) * 2;
        return <g transform={`translate(${cx} ${cy}) rotate(${(rot * 180) / Math.PI})`}>
          <circle cx="-10" cy="-5" r="5" fill={INK} /><circle cx="10" cy="-5" r="5" fill={INK} />
          <rect x="-17" y="-24" width="34" height="16" rx="5" fill={COLORS.red} stroke={INK} strokeWidth="2" />
          <circle cx="0" cy="-32" r="7" fill="#f2c7a5" stroke={INK} strokeWidth="1.8" />
        </g>;
      })()}
      <line x1={W} y1="40" x2={W} y2="300" stroke="#e2e8f0" />
      {bar('Ep', Ep, COLORS.blue, 0)}
      {bar('Ec', Ec, COLORS.green, 1)}
      {bar(tx('Calor', 'Calor'), s.heat, COLORS.red, 2)}
      <text x={W + 20} y="64" className="sim-tick">{tx('Energía total al inicio', 'Energía total ñepyrũme')}: {num(E0)} J</text>
    </Stage>
  </Sim>;
}
