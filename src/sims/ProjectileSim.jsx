// Movimiento parabólico con escala igual en x e y (la parábola no se deforma).
// Vectores vx (constante) y vy (cambia) en vivo, marcas a tiempos iguales,
// comparación con el ángulo complementario y gravedad de otros astros.
import { useEffect, useMemo, useState } from 'react';
import { Sim, Stage, Slider, Choice, PlayBar, Readouts, Toggle, Arrow, Verdict, useSimClock, useTx, num, INK, COLORS, VECTOR } from './SimKit.jsx';

const W = 640, LEFT = 46, TOPPAD = 24, MAX_PLOT_H = 280;
const PLANETS = { tierra: 9.8, luna: 1.62, marte: 3.71 };

function flight(v0, angle, g, h0) {
  const rad = (angle * Math.PI) / 180;
  const vx = v0 * Math.cos(rad), vy = v0 * Math.sin(rad);
  const T = (vy + Math.sqrt(vy * vy + 2 * g * h0)) / g;
  return { vx, vy, T, range: vx * T, hMax: h0 + (vy > 0 ? vy * vy / (2 * g) : 0), at: t => ({ x: vx * t, y: h0 + vy * t - 0.5 * g * t * t, vyNow: vy - g * t }) };
}

export default function ProjectileSim() {
  const tx = useTx();
  const [v0, setV0] = useState(18);
  const [angle, setAngle] = useState(40);
  const [h0, setH0] = useState(0);
  const [planet, setPlanet] = useState('tierra');
  const [compare, setCompare] = useState(false);
  const g = PLANETS[planet];
  const main = useMemo(() => flight(v0, angle, g, h0), [v0, angle, g, h0]);
  const other = useMemo(() => flight(v0, 90 - angle, g, h0), [v0, angle, g, h0]);
  const tMax = compare ? Math.max(main.T, other.T) : main.T;
  const clock = useSimClock({ maxTime: tMax });
  const t = clock.time;

  // Escala única: entra todo el vuelo (y el del ángulo complementario si se compara).
  const xSpan = Math.max(main.range, compare ? other.range : 0, 5) * 1.08;
  const ySpan = Math.max(main.hMax, compare ? other.hMax : 0, 3) * 1.18;
  const scale = Math.min((W - LEFT - 24) / xSpan, MAX_PLOT_H / ySpan);
  // La altura de la escena se ajusta a la trayectoria (sin cielo vacío).
  const BOTTOM = TOPPAD + Math.max(150, ySpan * scale);
  const H = BOTTOM + 44;
  const sx = x => LEFT + x * scale, sy = y => BOTTOM - y * scale;
  const path = f => Array.from({ length: 81 }, (_, i) => { const p = f.at((i / 80) * f.T); return `${i ? 'L' : 'M'}${sx(p.x).toFixed(1)},${sy(Math.max(0, p.y)).toFixed(1)}`; }).join(' ');
  const now = main.at(Math.min(t, main.T));
  const nowOther = other.at(Math.min(t, other.T));
  const step = main.T / 8;
  const strobe = Array.from({ length: 9 }, (_, i) => i * step).filter(s => s <= t + 1e-9).map(s => main.at(s));
  const gridStep = [1, 2, 5, 10, 20, 50, 100].find(value => xSpan / value <= 10) ?? 100;
  const vecScale = Math.min(4.2, 60 / Math.max(v0, 1));
  const change = setter => value => { setter(value); clock.reset(); };
  useEffect(() => { clock.reset(); }, [compare]); // eslint-disable-line react-hooks/exhaustive-deps
  const complementary = Math.abs(main.range - other.range) < 0.05 * main.range && h0 === 0;

  return <Sim
    title={tx('Movimiento parabólico', 'Movimiento parabólico')}
    subtitle={tx('Horizontal: MRU (vx no cambia). Vertical: MRUV (vy cambia por la gravedad).', 'Horizontal: MRU (vx ndokambiái). Vertical: MRUV (vy okambia gravedad rupi).')}
    actions={<Choice options={[{ id: 'tierra', label: tx('Tierra', 'Yvy') }, { id: 'luna', label: tx('Luna', 'Jasy') }, { id: 'marte', label: 'Marte' }]} value={planet} onChange={change(setPlanet)} />}
    controls={<>
      <PlayBar running={clock.running} onToggle={clock.toggle} onReset={clock.reset} time={t} />
      <Slider label={tx('Velocidad inicial', 'Velocidad inicial')} value={v0} min={5} max={35} step={1} unit="m/s" onChange={change(setV0)} />
      <Slider label={tx('Ángulo', 'Ángulo')} value={angle} min={5} max={85} step={1} unit="°" onChange={change(setAngle)} />
      <Slider label={tx('Altura de salida', 'Osẽhápe yvatekue')} value={h0} min={0} max={20} step={1} unit="m" onChange={change(setH0)} />
      <Toggle label={tx(`Comparar con ${90 - angle}° (complementario)`, `Ñambojoja ${90 - angle}° ndive (complementario)`)} checked={compare} onChange={setCompare} />
    </>}
    readouts={<>
      <Readouts items={[
        { label: tx('Alcance', 'Alcance'), value: main.range, unit: 'm', tone: 'red' },
        { label: tx('Altura máx.', 'Altura máx.'), value: main.hMax, unit: 'm', tone: 'amber' },
        { label: tx('Tiempo de vuelo', 'Tiempo de vuelo'), value: main.T, unit: 's', tone: 'blue' },
        { label: 'vx', value: main.vx, unit: 'm/s', tone: 'red' },
        { label: tx('vy ahora', 'vy ko’ág̃a'), value: t <= main.T ? now.vyNow : 0, unit: 'm/s', tone: 'blue' },
        { label: 'g', value: g, unit: 'm/s²' },
      ]} />
      {compare && complementary && <Verdict tone="good">{tx(`${angle}° y ${90 - angle}° llegan igual de lejos (${num(main.range)} m): son complementarios.`, `${angle}° ha ${90 - angle}° og̃uahẽ peteĩcha mombyry (${num(main.range)} m): ha’e complementario.`)}</Verdict>}
      {!compare && angle === 45 && h0 === 0 && <Verdict tone="good">{tx('45°: el mayor alcance posible con esta velocidad.', '45°: alcance tuichavéva ko velocidad reheve.')}</Verdict>}
    </>}
    footer={tx('Modelo ideal: sin resistencia del aire. Mismas escalas en x e y.', 'Modelo ideal: aire’ỹre. Peteĩ escala x ha y-pe.')}
  >
    <Stage width={W} height={H} label={tx('Trayectoria parabólica', 'Trayectoria parabólica')}>
      <rect x="0" y="0" width={W} height={BOTTOM} fill={planet === 'tierra' ? '#e6f3fa' : planet === 'luna' ? '#eef0f5' : '#f8e9df'} />
      {Array.from({ length: Math.floor(xSpan / gridStep) + 1 }, (_, i) => i * gridStep).map(x => <g key={x}>
        <line x1={sx(x)} y1={BOTTOM} x2={sx(x)} y2={BOTTOM + 7} stroke={INK} strokeWidth="1.2" />
        <text x={sx(x)} y={BOTTOM + 20} textAnchor="middle" className="sim-tick">{x}</text>
      </g>)}
      <text x={W - 10} y={BOTTOM + 34} textAnchor="end" className="sim-tick sim-tick-unit">x (m)</text>
      <rect x="0" y={BOTTOM} width={W} height={H - BOTTOM} fill={planet === 'tierra' ? COLORS.earth : planet === 'luna' ? '#9ca3af' : '#b45309'} opacity=".25" />
      <line x1="0" y1={BOTTOM} x2={W} y2={BOTTOM} stroke={INK} strokeWidth="2" />
      {h0 > 0 && <rect x={LEFT - 30} y={sy(h0)} width="30" height={BOTTOM - sy(h0)} fill="#e2d6c3" stroke={INK} strokeWidth="1.8" />}
      {compare && <path d={path(other)} fill="none" stroke={COLORS.violet} strokeWidth="2.4" strokeDasharray="7 6" opacity=".8" />}
      <path d={path(main)} fill="none" stroke={INK} strokeWidth="2" strokeDasharray="5 7" opacity=".55" />
      <line x1={sx(0)} y1={sy(main.hMax)} x2={sx(main.vx * (main.vy / g))} y2={sy(main.hMax)} stroke={COLORS.amber} strokeDasharray="4 4" strokeWidth="1.4" />
      <text x={sx(0) + 4} y={sy(main.hMax) - 6} className="sim-label sim-label-small" fill="#92400e">H = {num(main.hMax)} m</text>
      <line x1={sx(main.range)} y1={BOTTOM - 26} x2={sx(main.range)} y2={BOTTOM} stroke={COLORS.red} strokeWidth="2" />
      <path d={`M${sx(main.range)} ${BOTTOM - 26} l16 6 -16 6z`} fill={COLORS.red} />
      {strobe.map((p, i) => <circle key={i} cx={sx(p.x)} cy={sy(p.y)} r="5" fill={COLORS.blue} opacity=".25" />)}
      {compare && <circle cx={sx(nowOther.x)} cy={sy(Math.max(0, nowOther.y))} r="7" fill={COLORS.violet} stroke={INK} strokeWidth="1.8" />}
      {t < main.T && <>
        <Arrow x1={sx(now.x)} y1={sy(now.y)} x2={sx(now.x) + main.vx * vecScale} y2={sy(now.y)} color={VECTOR.vx} label="vx" labelDy={16} />
        <Arrow x1={sx(now.x)} y1={sy(now.y)} x2={sx(now.x)} y2={sy(now.y) - now.vyNow * vecScale} color={VECTOR.vy} label="vy" labelDx={-22} />
        <Arrow x1={sx(now.x)} y1={sy(now.y)} x2={sx(now.x) + main.vx * vecScale} y2={sy(now.y) - now.vyNow * vecScale} color={VECTOR.v} label="v" width={3.4} />
      </>}
      <circle cx={sx(now.x)} cy={sy(Math.max(0, now.y))} r="9" fill={COLORS.amber} stroke={INK} strokeWidth="2.2" />
    </Stage>
  </Sim>;
}
