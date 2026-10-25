// Magnetismo: experiencia de Oersted vista desde arriba. Un cable lleva
// corriente perpendicular a la pantalla y las brújulas giran hasta alinearse
// con el campo (círculos alrededor del cable) sumado al campo terrestre.
import { useEffect, useRef, useState } from 'react';
import { Sim, Stage, Slider, Readouts, Verdict, Toggle, useFrame, useTx, num, INK, COLORS } from './SimKit.jsx';

const CX = 300, CY = 190;
const B_EARTH = 23e-6; // T, orden del campo terrestre en Paraguay (componente horizontal aproximada)

export default function MagnetSim() {
  const tx = useTx();
  const [I, setI] = useState(8);
  const [r, setR] = useState(4);
  const [lines, setLines] = useState(true);
  const compasses = Array.from({ length: 12 }, (_, i) => (i / 12) * Math.PI * 2);
  const B = (2e-7 * Math.abs(I)) / (r / 100);
  const target = angle => {
    // Campo del cable: tangente (antihorario si I sale de la pantalla).
    const bx = -Math.sin(angle) * Math.sign(I) * B, by = -Math.cos(angle) * Math.sign(I) * B;
    // Campo terrestre hacia arriba de la pantalla (norte).
    const tx0 = bx, ty0 = by - B_EARTH;
    return Math.atan2(ty0, tx0);
  };
  const angles = useRef(compasses.map(() => -Math.PI / 2));
  const [, tick] = useState(0);
  const settled = compasses.every((a, i) => Math.abs(angles.current[i] - target(a)) < 0.01);
  useFrame(dt => {
    angles.current = angles.current.map((current, i) => {
      let diff = target(compasses[i]) - current;
      while (diff > Math.PI) diff -= 2 * Math.PI;
      while (diff < -Math.PI) diff += 2 * Math.PI;
      return current + diff * Math.min(1, dt * 5);
    });
    tick(n => n + 1);
  }, !settled);
  useEffect(() => { tick(n => n + 1); }, [I, r]);
  // Anillo de brújulas: el radio dibujado crece con la distancia pero nunca
  // deja que se superpongan (la física usa la distancia real r).
  const R = 78 + r * 8;

  return <Sim title={tx('Campo magnético de una corriente (Oersted)', 'Corriente campo magnético (Oersted)')} subtitle={tx('Vista desde arriba: el cable atraviesa la mesa. Con corriente, las brújulas forman un círculo alrededor del cable.', 'Yvate guive: cable ohasa mesa. Corriente reheve, brújula ojapo círculo cable jerére.')}
    controls={<>
      <Slider label={tx('Corriente (+ sale de la pantalla)', 'Corriente (+ osẽ pantalla-gui)')} value={I} min={-20} max={20} step={1} unit="A" onChange={setI} />
      <Slider label={tx('Distancia de las brújulas', 'Brújula distancia')} value={r} min={1} max={12} step={0.5} unit="cm" onChange={setR} />
      <Toggle label={tx('Mostrar líneas de campo', 'Ehechauka línea de campo')} checked={lines} onChange={setLines} />
    </>}
    readouts={<>
      <Readouts items={[{ label: tx('B del cable', 'Cable B'), value: B * 1e6, unit: 'µT', tone: 'violet' }, { label: tx('B terrestre', 'Yvy B'), value: B_EARTH * 1e6, unit: 'µT', tone: 'green' }, { label: tx('Corriente', 'Corriente'), value: I, unit: 'A', tone: 'red' }]} />
      <Verdict tone="info">{I === 0 ? tx('Sin corriente: todas apuntan al norte (campo de la Tierra).', 'Corriente’ỹre: opavave ohechauka norte (Yvy campo).') : B > B_EARTH ? tx('El campo del cable domina: las agujas siguen círculos. Cambiá el signo de la corriente y giran al revés.', 'Cable campo ipu’ãve: aguja osegi círculo. Embojere corriente signo ha ojere ambue gotyo.') : tx('Lejos del cable el campo es débil: gana el campo terrestre.', 'Cable mombyrýpe campo ikangy: ipu’ãve Yvy campo.')}</Verdict>
    </>}
    footer="B = µ₀·I / (2π·d) ; µ₀ = 4π × 10⁻⁷ T·m/A">
    <Stage width={640} height={380} label={tx('Brújulas alrededor de un cable', 'Brújula cable jerére')}>
      <rect width="640" height="380" fill="#f6efe2" />
      {lines && I !== 0 && [40, 70, 110, 150, 190].map((rr, i) => <circle key={rr} cx={CX} cy={CY} r={rr} fill="none" stroke={COLORS.violet} strokeWidth="1.5" strokeDasharray="6 6" opacity={Math.max(0.2, 0.9 - i * 0.16) * Math.min(1, Math.abs(I) / 8)} />)}
      <text x={CX + R + 22} y={CY + 4} className="sim-label sim-label-small" fill={INK}>r = {num(r)} cm</text>
      <circle cx={CX} cy={CY} r="16" fill="#e8b86d" stroke={INK} strokeWidth="2.4" />
      {I > 0 && <circle cx={CX} cy={CY} r="5" fill={INK} />}
      {I < 0 && <path d={`M${CX - 7} ${CY - 7} l14 14 M${CX + 7} ${CY - 7} l-14 14`} stroke={INK} strokeWidth="3" />}
      <text x={CX} y={CY + 36} textAnchor="middle" className="sim-label sim-label-small" fill={INK}>{I > 0 ? tx('I sale ●', 'I osẽ ●') : I < 0 ? tx('I entra ✕', 'I oike ✕') : 'I = 0'}</text>
      {compasses.map((a, i) => {
        const x = CX + R * Math.cos(a), y = CY - R * Math.sin(a);
        const dir = angles.current[i];
        const nx = Math.cos(dir) * 13, ny = Math.sin(dir) * 13;
        return <g key={i}>
          <circle cx={x} cy={y} r="17" fill="#fff" stroke={INK} strokeWidth="1.8" />
          <path d={`M${x + nx} ${y + ny} L${x - ny * 0.28} ${y + nx * 0.28} L${x - nx} ${y - ny} L${x + ny * 0.28} ${y - nx * 0.28} Z`} fill="#cbd5e1" stroke={INK} strokeWidth="1" />
          <path d={`M${x + nx} ${y + ny} L${x - ny * 0.28} ${y + nx * 0.28} L${x + ny * 0.28} ${y - nx * 0.28} Z`} fill={COLORS.red} />
        </g>;
      })}
      <g transform="translate(590 50)"><path d="M0 18 L0 -18 M-7 -8 L0 -18 L7 -8" stroke={INK} strokeWidth="2.4" fill="none" /><text x="0" y="34" textAnchor="middle" className="sim-label sim-label-small" fill={INK}>N</text></g>
    </Stage>
  </Sim>;
}
