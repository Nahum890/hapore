// Movimiento vertical en el vacío: tiro hacia arriba o caída libre desde una
// torre, con marcas cada 0,5 s y gráficos y–t / v–t. Opción "con aire" para
// comparar una pluma y una piedra (en el vacío caen juntas).
import { useEffect, useMemo, useState } from 'react';
import { Sim, Stage, Slider, Choice, PlayBar, Readouts, Graph, Verdict, Toggle, Arrow, useSimClock, useTx, num, INK, COLORS, VECTOR } from './SimKit.jsx';

const G = 9.8;
const GROUND = 300, TOP = 24;

export default function FreeFallSim() {
  const tx = useTx();
  const [mode, setMode] = useState('up');
  const [h0, setH0] = useState(20);
  const [v0, setV0] = useState(15);
  const [air, setAir] = useState(false);
  const launchV = mode === 'drop' ? 0 : v0;
  const hMax = h0 + (launchV > 0 ? launchV * launchV / (2 * G) : 0);
  const scaleTop = Math.max(25, Math.ceil(hMax / 5) * 5 + 5);
  const sy = h => GROUND - (h / scaleTop) * (GROUND - TOP);
  const tLand = (launchV + Math.sqrt(launchV * launchV + 2 * G * h0)) / G;
  const clock = useSimClock({ maxTime: Math.max(tLand, air ? 8 : 0) });
  const t = clock.time;

  const state = time => {
    const tt = Math.min(time, tLand);
    return { y: h0 + launchV * tt - 0.5 * G * tt * tt, v: time >= tLand ? 0 : launchV - G * tt };
  };
  // Pluma con resistencia del aire: velocidad límite de 1,2 m/s (integración simple).
  const feather = useMemo(() => {
    const points = [[0, h0]];
    let y = h0, v = launchV, s = 0;
    const dt = 0.01, k = G / (1.2 * 1.2);
    while (y > 0 && s < 12) { const a = -G + (v < 0 ? k * v * v : -k * v * v); v += a * dt; y += v * dt; s += dt; points.push([s, Math.max(0, y)]); }
    return points;
  }, [h0, launchV]);
  const featherY = time => { const index = Math.min(feather.length - 1, Math.round(time / 0.01)); return feather[index][1]; };

  const now = state(t);
  const samples = useMemo(() => Array.from({ length: 121 }, (_, index) => {
    const time = (index / 120) * tLand; const s = state(time); return [time, s.y, s.v];
  }), [tLand, h0, launchV]);
  const shown = samples.filter(point => point[0] <= t + 1e-9);
  const strobe = []; for (let s = 0; s <= Math.min(t, tLand) + 1e-9; s += 0.5) strobe.push({ s, ...state(s) });

  const change = setter => value => { setter(value); clock.reset(); };
  useEffect(() => { clock.reset(); }, [air]); // eslint-disable-line react-hooks/exhaustive-deps

  const towerTop = sy(h0);
  const ballX = 300;

  return <Sim
    title={tx('Movimiento vertical en el vacío', 'Movimiento vertical vacío-pe')}
    subtitle={tx('La gravedad cambia la velocidad 9,8 m/s cada segundo. Arriba, en la altura máxima, v = 0.', 'Gravedad omoambue velocidad 9,8 m/s káda segundo. Yvatevehápe, v = 0.')}
    actions={<Choice options={[{ id: 'up', label: tx('Tiro hacia arriba', 'Yvate gotyo') }, { id: 'drop', label: tx('Caída libre', 'Caída libre') }]} value={mode} onChange={change(setMode)} />}
    controls={<>
      <PlayBar running={clock.running} onToggle={clock.toggle} onReset={clock.reset} time={t} />
      <Slider label={tx('Altura de la torre', 'Torre yvatekue')} value={h0} min={0} max={60} step={5} unit="m" onChange={change(setH0)} />
      {mode === 'up' && <Slider label={tx('Velocidad inicial (hacia arriba)', 'Velocidad inicial (yvate gotyo)')} value={v0} min={2} max={30} step={1} unit="m/s" onChange={change(setV0)} />}
      <Toggle label={tx('Comparar con una pluma (con aire)', 'Ñambojoja pluma ndive (aire reheve)')} checked={air} onChange={setAir} />
    </>}
    readouts={<>
      <Readouts items={[
        { label: tx('Altura', 'Yvatekue'), value: now.y, unit: 'm', tone: 'blue' },
        { label: tx('Velocidad', 'Velocidad'), value: now.v, unit: 'm/s', tone: 'green' },
        { label: tx('Altura máx.', 'Altura máx.'), value: hMax, unit: 'm', tone: 'amber' },
        { label: tx('Llega al suelo', 'Og̃uahẽ yvýpe'), value: tLand, unit: 's', tone: 'red' },
      ]} />
      {mode === 'up' && h0 + launchV * t - 0.5 * G * t * t >= hMax - 0.05 && t > 0 && t < tLand && <Verdict tone="good">{tx('¡Altura máxima! Acá la velocidad vale cero.', '¡Altura máxima! Ko’ápe velocidad ha’e cero.')}</Verdict>}
      {air && <Verdict tone="info">{tx('Con aire, la pluma llega a una velocidad límite y tarda mucho más. En el vacío caerían juntas.', 'Aire reheve, pluma og̃uahẽ velocidad límite-pe ha oipuru hetave tiempo. Vacío-pe ho’áta oñondive.')}</Verdict>}
    </>}
    graphs={<>
      <Graph title={tx('Altura en el tiempo (y–t)', 'Yvatekue tiempo-pe (y–t)')} xLabel="t (s)" yLabel="y (m)" xMax={Math.max(tLand, 0.5)} yMin={0} series={[{ points: shown.map(p => [p[0], p[1]]), color: COLORS.blue }]} marker={[t, now.y]} />
      <Graph title={tx('Velocidad en el tiempo (v–t)', 'Velocidad tiempo-pe (v–t)')} xLabel="t (s)" yLabel="v (m/s)" xMax={Math.max(tLand, 0.5)} series={[{ points: shown.map(p => [p[0], p[2]]), color: COLORS.green }]} marker={[t, now.v]} markerColor={COLORS.green} />
    </>}
    footer={tx('Signo: positivo hacia arriba. La pendiente del gráfico v–t es −9,8 m/s² todo el tiempo.', 'Signo: positivo yvate gotyo. Gráfico v–t pendiente ha’e −9,8 m/s² akóinte.')}
  >
    <Stage width={640} height={340} label={tx('Torre y pelota', 'Torre ha pelota')}>
      <rect x="0" y="0" width="640" height={GROUND} fill="#e6f3fa" />
      <rect x="0" y={GROUND} width="640" height="10" fill={COLORS.grass} />
      <rect x="0" y={GROUND + 10} width="640" height="30" fill={COLORS.earth} />
      {/* Regla de alturas */}
      {Array.from({ length: Math.floor(scaleTop / 5) + 1 }, (_, index) => index * 5).map(h => <g key={h}>
        <line x1="34" y1={sy(h)} x2={h % 10 === 0 ? 46 : 42} y2={sy(h)} stroke={INK} strokeWidth="1.2" />
        {h % 10 === 0 && <text x="30" y={sy(h) + 4} textAnchor="end" className="sim-tick">{h}</text>}
      </g>)}
      <line x1="46" y1={sy(0)} x2="46" y2={sy(scaleTop)} stroke={INK} strokeWidth="1.2" />
      <text x="50" y={TOP - 6} className="sim-tick sim-tick-unit">y (m)</text>
      {/* Torre */}
      {h0 > 0 && <g>
        <rect x={ballX - 70} y={towerTop} width="60" height={GROUND - towerTop} fill="#e2d6c3" stroke={INK} strokeWidth="2" />
        {Array.from({ length: Math.floor((GROUND - towerTop) / 26) }, (_, row) => <g key={row}>{[0, 1].map(col => <rect key={col} x={ballX - 62 + col * 26} y={towerTop + 10 + row * 26} width="16" height="12" rx="2" fill="#bfe3f2" stroke={INK} strokeWidth="1" />)}</g>)}
        <rect x={ballX - 74} y={towerTop - 4} width="68" height="6" fill={INK} />
      </g>}
      {/* Altura máxima */}
      {mode === 'up' && <g>
        <line x1={ballX - 30} y1={sy(hMax)} x2={ballX + 120} y2={sy(hMax)} stroke={COLORS.amber} strokeWidth="1.6" strokeDasharray="6 5" />
        <text x={ballX + 124} y={sy(hMax) + 4} className="sim-label sim-label-small" fill="#92400e">H_máx = {num(hMax)} m</text>
      </g>}
      {/* Estroboscopio */}
      {strobe.map(item => <circle key={item.s} cx={ballX} cy={sy(item.y) - 9} r="8" fill={COLORS.amber} opacity=".28" />)}
      {/* Pluma */}
      {air && <g transform={`translate(${ballX + 70} ${sy(featherY(t)) - 12})`}>
        <path d="M0 12 C -6 2 -2 -10 8 -14 C 6 -4 6 4 0 12 Z" fill="#fff" stroke={INK} strokeWidth="1.5" />
        <path d="M0 12 L6 -8" stroke={INK} strokeWidth="1" />
      </g>}
      {/* Pelota y vector velocidad */}
      <circle cx={ballX} cy={sy(now.y) - 9} r="9" fill={COLORS.amber} stroke={INK} strokeWidth="2.2" />
      {Math.abs(now.v) > 0.3 && <Arrow x1={ballX + 16} y1={sy(now.y) - 9} x2={ballX + 16} y2={sy(now.y) - 9 - now.v * 3} color={VECTOR.v} label="v" />}
      <Arrow x1={ballX - 18} y1={sy(now.y) - 9} x2={ballX - 18} y2={sy(now.y) + 19} color={VECTOR.accel} label="g" labelDx={-14} labelDy={6} width={2.4} />
    </Stage>
  </Sim>;
}
