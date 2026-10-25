// Relatividad restringida: un "reloj de luz" (un fotón que rebota entre dos
// espejos) visto desde la nave y desde la Tierra. Desde la Tierra el fotón
// recorre un camino más largo → el reloj de la nave atrasa (γ) y la nave se
// ve más corta (L₀/γ).
import { useState } from 'react';
import { Sim, Stage, Slider, PlayBar, Readouts, Verdict, useSimClock, useTx, num, INK, COLORS } from './SimKit.jsx';

const H_CLOCK = 90; // altura del reloj de luz (px)
const SHIP_W = 200;

function Ship({ x, y, width, height, label }) {
  return <g transform={`translate(${x} ${y})`}>
    <path d={`M0 0 H${width - 34} Q${width} ${height / 2} ${width - 34} ${height} H0 L-14 ${height - 14} V14 Z`} fill="#eef2f7" stroke={INK} strokeWidth="2.2" />
    <circle cx={width - 30} cy={height / 2} r="8" fill="#bfe3f2" stroke={INK} strokeWidth="1.6" />
    <path d={`M-14 ${height / 2 - 18} l-18 -8 v52 l18 -8`} fill={COLORS.amber} stroke={INK} strokeWidth="1.5" />
    <text x={width / 2} y={height + 18} textAnchor="middle" className="sim-label sim-label-small" fill={INK}>{label}</text>
  </g>;
}

export default function RelativitySim() {
  const tx = useTx();
  const [beta, setBeta] = useState(0.8);
  const gamma = 1 / Math.sqrt(1 - beta * beta);
  const clock = useSimClock({ maxTime: 30 });
  const t = clock.time;
  // Un "tic" del reloj propio dura 1 s de animación; desde la Tierra dura γ s.
  const ticksShip = Math.floor(t);
  const ticksEarth = Math.floor(t / gamma);
  const phase = (time, period) => { const p = (time % (2 * period)) / period; return p <= 1 ? p : 2 - p; };
  // Panel 1: desde la nave (el fotón sube y baja en vertical).
  const y1 = 40 + H_CLOCK * (1 - phase(t, 1));
  // Panel 2: desde la Tierra (la nave avanza; el fotón va en diagonal y tarda γ veces más).
  const speedPx = 60 * beta; // px/s
  const shipX = 40 + ((t * speedPx) % 420);
  const y2 = 230 + H_CLOCK * (1 - phase(t, gamma));
  const shipW2 = SHIP_W / gamma;

  return <Sim title={tx('Relatividad: el reloj de luz', 'Relatividad: tesape aravopapaha')} subtitle={tx('Para quien ve pasar la nave, la luz del reloj recorre un camino más largo: el tiempo de la nave pasa más lento.', 'Ohecháva nave ohasa, tesape oguata tape ipukuvéva: nave tiempo ohasa mbeguekatuve.')}
    controls={<>
      <PlayBar running={clock.running} onToggle={clock.toggle} onReset={clock.reset} time={t} />
      <Slider label={tx('Velocidad de la nave (fracción de c)', 'Nave velocidad (c fracción)')} value={beta} min={0} max={0.99} step={0.01} unit="c" onChange={value => { setBeta(value); clock.reset(); }} />
    </>}
    readouts={<>
      <Readouts items={[{ label: 'γ', value: gamma, tone: 'violet' }, { label: tx('Tics en la nave', 'Tic nave-pe'), value: ticksShip, tone: 'blue', digits: 0 }, { label: tx('Tics vistos desde la Tierra', 'Tic Yvy guive'), value: ticksEarth, tone: 'red', digits: 0 }, { label: tx('Largo visto', 'Largo ojehecháva'), value: 100 / gamma, unit: '%', tone: 'green', digits: 0 }]} />
      <Verdict tone="info">{beta < 0.1 ? tx('A velocidades cotidianas γ ≈ 1: no se nota ningún efecto.', 'Velocidad ára ha ára-pe γ ≈ 1: ndojehechái efecto.') : tx(`Por cada ${num(gamma)} s de la Tierra, en la nave pasa 1 s. La nave se ve ${num(100 / gamma, 0)} % de su largo.`, `Káda ${num(gamma)} s Yvy-pe, nave-pe ohasa 1 s. Nave ojehecha ${num(100 / gamma, 0)} % ipukukue.`)}</Verdict>
    </>}
    footer="γ = 1 / √(1 − v²/c²) ; Δt = γ·Δt₀ ; L = L₀/γ ; E = m·c²">
    <Stage width={640} height={380} label={tx('Reloj de luz en dos sistemas', 'Tesape aravopapaha mokõi sistema-pe')}>
      <rect x="0" y="0" width="640" height="186" fill="#0f1a33" />
      <text x="16" y="24" style={{ font: '800 13px system-ui', fill: '#e2e8f0' }}>{tx('Desde la nave', 'Nave guive')}</text>
      <line x1="300" y1="36" x2="360" y2="36" stroke="#e2e8f0" strokeWidth="4" />
      <line x1="300" y1={40 + H_CLOCK + 4} x2="360" y2={40 + H_CLOCK + 4} stroke="#e2e8f0" strokeWidth="4" />
      <line x1="330" y1="40" x2="330" y2={40 + H_CLOCK} stroke="#fde68a" strokeDasharray="4 5" opacity=".5" />
      <circle cx="330" cy={y1} r="7" fill="#fde68a" />
      <text x="380" y="92" style={{ font: '700 12px system-ui', fill: '#cbd5e1' }}>{tx('el fotón sube y baja', 'fotón ojupi ha oguejy')}</text>
      <rect x="0" y="194" width="640" height="186" fill="#e6f3fa" />
      <text x="16" y="216" className="sim-label" fill={INK}>{tx('Desde la Tierra', 'Yvy guive')}</text>
      <Ship x={shipX} y={220} width={shipW2} height={H_CLOCK + 20} label={tx(`largo visto: ${num(100 / gamma, 0)} %`, `largo ojehecháva: ${num(100 / gamma, 0)} %`)} />
      {(() => {
        // Rastro del fotón visto desde la Tierra: zigzag diagonal (camino más largo).
        const cx = time => 40 + ((time * speedPx) % 420) + shipW2 / 2 - 6;
        const pts = [];
        for (let s = Math.max(0, t - 3); s <= t; s += 0.05) {
          if (pts.length && cx(s) < pts.at(-1)[0]) pts.length = 0; // la nave volvió a empezar
          pts.push([cx(s), 230 + H_CLOCK * (1 - phase(s, gamma))]);
        }
        return pts.length > 1 && <polyline points={pts.map(p => p.join(',')).join(' ')} fill="none" stroke={COLORS.amber} strokeWidth="2" strokeDasharray="4 4" opacity=".8" />;
      })()}
      <line x1={shipX + shipW2 / 2 - 26} y1="226" x2={shipX + shipW2 / 2 + 14} y2="226" stroke={INK} strokeWidth="4" />
      <line x1={shipX + shipW2 / 2 - 26} y1={230 + H_CLOCK + 4} x2={shipX + shipW2 / 2 + 14} y2={230 + H_CLOCK + 4} stroke={INK} strokeWidth="4" />
      <circle cx={shipX + shipW2 / 2 - 6} cy={y2} r="7" fill={COLORS.amber} stroke={INK} strokeWidth="1.5" />
    </Stage>
  </Sim>;
}
