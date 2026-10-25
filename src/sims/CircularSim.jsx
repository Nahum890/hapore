// Movimiento circular uniforme: una calesita vista desde arriba. Muestra la
// velocidad tangencial y la aceleración centrípeta; "Soltar" hace que el
// objeto salga por la tangente (prueba de que v es tangente a la trayectoria).
import { useEffect, useState } from 'react';
import { Sim, Stage, Slider, PlayBar, Readouts, Arrow, Verdict, useSimClock, useTx, num, INK, COLORS, VECTOR } from './SimKit.jsx';

const CX = 250, CY = 180, PX_PER_M = 40;

export default function CircularSim() {
  const tx = useTx();
  const [r, setR] = useState(2.5);
  const [T, setT] = useState(4);
  const [m, setM] = useState(30);
  const [released, setReleased] = useState(null);
  const clock = useSimClock();
  const t = clock.time;
  const omega = (2 * Math.PI) / T;
  const v = omega * r;
  const ac = v * v / r;
  const R = r * PX_PER_M;
  const angleAt = time => omega * time;
  const pos = time => ({ x: CX + R * Math.cos(angleAt(time)), y: CY - R * Math.sin(angleAt(time)) });

  let ball = pos(t);
  let flying = false;
  if (released !== null && t > released) {
    const p = pos(released);
    const a = angleAt(released);
    const dt = t - released;
    ball = { x: p.x - Math.sin(a) * v * PX_PER_M * dt, y: p.y - Math.cos(a) * v * PX_PER_M * dt };
    flying = true;
  }
  const a = angleAt(t);
  const tangent = { x: -Math.sin(a), y: -Math.cos(a) };
  const vScale = Math.min(70, 12 * v);
  const aScale = Math.min(70, 9 * ac);
  const change = setter => value => { setter(value); setReleased(null); clock.reset(); };
  const outOfStage = ball.x < -20 || ball.x > 520 || ball.y < -20 || ball.y > 380;
  useEffect(() => { if (flying && outOfStage && clock.running) clock.setRunning(false); }, [flying, outOfStage, clock]);
  const wedge = (index, radius) => {
    const a0 = (index * Math.PI) / 6, a1 = ((index + 1) * Math.PI) / 6;
    return `M${CX} ${CY} L${CX + radius * Math.cos(a0)} ${CY + radius * Math.sin(a0)} A${radius} ${radius} 0 0 1 ${CX + radius * Math.cos(a1)} ${CY + radius * Math.sin(a1)} Z`;
  };

  return <Sim
    title={tx('Movimiento circular uniforme', 'Movimiento circular uniforme')}
    subtitle={tx('La rapidez es constante, pero la dirección cambia todo el tiempo: por eso hay aceleración hacia el centro.', 'Rapidez constante, dirección katu okambia akóinte: upévare oĩ aceleración centro gotyo.')}
    controls={<>
      <PlayBar running={clock.running} onToggle={clock.toggle} onReset={() => { setReleased(null); clock.reset(); }} time={t}
        extra={<button type="button" className="sim-btn" disabled={flying || !clock.running} onClick={() => setReleased(t)}>{tx('Soltar', 'Eheja')}</button>} />
      <Slider label={tx('Radio', 'Radio')} value={r} min={1} max={4} step={0.25} unit="m" onChange={change(setR)} />
      <Slider label={tx('Período (una vuelta)', 'Período (peteĩ vuelta)')} value={T} min={1.5} max={10} step={0.5} unit="s" onChange={change(setT)} />
      <Slider label={tx('Masa del niño', 'Mitã masa')} value={m} min={15} max={60} step={5} unit="kg" onChange={change(setM)} />
    </>}
    readouts={<>
      <Readouts items={[
        { label: tx('Frecuencia', 'Frecuencia'), value: 1 / T, unit: 'Hz', tone: 'blue' },
        { label: 'ω', value: omega, unit: 'rad/s', tone: 'blue' },
        { label: tx('Velocidad v', 'Velocidad v'), value: v, unit: 'm/s', tone: 'green' },
        { label: tx('Acel. centrípeta', 'Acel. centrípeta'), value: ac, unit: 'm/s²', tone: 'violet' },
        { label: tx('Fuerza centrípeta', 'Fuerza centrípeta'), value: m * ac, unit: 'N', tone: 'red' },
        { label: tx('Vueltas', 'Vuelta'), value: Math.floor((released ?? t) / T), unit: '' },
      ]} />
      {flying && <Verdict tone="good">{tx('Al soltarlo sigue en línea recta, tangente al círculo: la fuerza centrípeta desapareció.', 'Ojeheja vove oho línea recta-pe, círculo tangente: fuerza centrípeta okañy.')}</Verdict>}
    </>}
    footer={tx('Vista desde arriba. v = ω·r ; a = v²/r ; F = m·v²/r.', 'Yvate guive. v = ω·r ; a = v²/r ; F = m·v²/r.')}
  >
    <Stage width={500} height={360} label={tx('Calesita vista desde arriba', 'Calesita yvate guive')}>
      <circle cx={CX} cy={CY} r={4 * PX_PER_M + 14} fill="#e8f1e4" stroke="#cbd5e1" strokeWidth="1.5" />
      <g transform={`rotate(${-(a * 180) / Math.PI} ${CX} ${CY})`}>
        {Array.from({ length: 12 }, (_, index) => <path key={index} d={wedge(index, R + 10)} fill={index % 2 ? '#fde2e7' : '#dbe7fb'} />)}
        <circle cx={CX} cy={CY} r={R + 10} fill="none" stroke={INK} strokeWidth="2.2" />
        <circle cx={CX} cy={CY} r={(R + 10) * 0.55} fill="none" stroke={INK} strokeOpacity=".25" strokeDasharray="3 5" />
      </g>
      <circle cx={CX} cy={CY} r="10" fill={INK} />
      <line x1={CX} y1={CY} x2={flying ? CX : ball.x} y2={flying ? CY : ball.y} stroke={INK} strokeWidth="1.4" strokeDasharray="4 4" opacity=".6" />
      <text x={CX + 8} y={CY + 24} className="sim-label sim-label-small" fill={INK}>r = {num(r)} m</text>
      {flying && <line x1={pos(released).x} y1={pos(released).y} x2={ball.x} y2={ball.y} stroke={VECTOR.v} strokeWidth="2" strokeDasharray="6 5" />}
      {!flying && <>
        <Arrow x1={ball.x} y1={ball.y} x2={ball.x + tangent.x * vScale} y2={ball.y + tangent.y * vScale} color={VECTOR.v} label="v" />
        <Arrow x1={ball.x} y1={ball.y} x2={ball.x + (CX - ball.x) / R * aScale} y2={ball.y + (CY - ball.y) / R * aScale} color={VECTOR.accel} label="a_c" labelDx={-10} labelDy={14} />
      </>}
      <g transform={`translate(${ball.x} ${ball.y})`}>
        <circle r="13" fill={COLORS.amber} stroke={INK} strokeWidth="2.2" />
        <circle cx="0" cy="-2" r="4.5" fill="#7c4a2d" />
      </g>
    </Stage>
  </Sim>;
}
