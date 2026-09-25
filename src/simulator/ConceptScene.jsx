import { shouldRevealSimulatorAnswer } from './exerciseSimulation.js';

function CinematicaScene({ phase }) {
  return <svg className="concept-svg" viewBox="0 0 600 230" aria-hidden="true">
    <defs><linearGradient id="trackSky" x2="0" y2="1"><stop stopColor="#d9edf3"/><stop offset="1" stopColor="#f7f3dc"/></linearGradient></defs>
    <rect width="600" height="230" fill="url(#trackSky)" />
    <circle cx="505" cy="45" r="23" fill="#f8d98a" />
    <path d="M0 154 Q150 110 300 148 T600 146 V230 H0Z" fill="#b7d4a8" />
    <rect y="176" width="600" height="54" fill="#bd986d" />
    <line x1="40" y1="174" x2="560" y2="174" stroke="#fff5dc" strokeWidth="3" strokeDasharray="13 9" />
    <text x="38" y="205" fill="#26483d" fontSize="14" fontWeight="700">INICIO</text>
    <text x="508" y="205" fill="#26483d" fontSize="14" fontWeight="700">LLEGADA</text>
    <g className={'concept-cart ' + (phase === 'flying' ? 'is-moving' : phase === 'landed' ? 'is-finished' : '')}>
      <rect x="38" y="134" width="62" height="27" rx="7" fill="#d66836" />
      <rect x="48" y="127" width="35" height="19" rx="6" fill="#e3f3f5" stroke="#26483d" strokeWidth="2" />
      <circle cx="51" cy="164" r="9" fill="#26483d" /><circle cx="88" cy="164" r="9" fill="#26483d" />
    </g>
  </svg>;
}

function VectoresScene({ exercise, phase }) {
  const values = exercise?.values ?? {};
  const perpendicular = 'componenteX' in values;
  const opposing = Number(values.velocidadViento) < 0;
  return <svg className={'concept-svg vectors-scene ' + (phase !== 'idle' ? 'is-active' : '')} viewBox="0 0 600 230" aria-hidden="true">
    <rect width="600" height="230" fill="#e6f2ed" />
    <defs><marker id="vectorTip" markerWidth="10" markerHeight="10" refX="7" refY="3" orient="auto"><path d="M0 0 L0 6 L8 3Z" fill="#17483b" /></marker></defs>
    <path d="M45 183 H560 M75 205 V28" stroke="#b6cfc0" strokeWidth="2" />
    <circle cx="105" cy="160" r="13" fill="#17483b" /><text x="91" y="198" fontSize="13" fill="#17483b">inicio</text>
    <line className="vector-line" x1="105" y1="160" x2="360" y2="160" stroke="#d66836" strokeWidth="7" markerEnd="url(#vectorTip)" />
    <text x="180" y="148" fontSize="15" fontWeight="700" fill="#904722">{perpendicular ? `Este: ${values.componenteX} m` : `Dron: ${values.velocidadDron} m/s`}</text>
    {perpendicular
      ? <><line className="vector-line" x1="360" y1="160" x2="360" y2="46" stroke="#318eaa" strokeWidth="7" markerEnd="url(#vectorTip)" /><text x="375" y="88" fontSize="15" fontWeight="700" fill="#17607c">Norte: {values.componenteY} m</text><line className="vector-result-line" x1="105" y1="160" x2="360" y2="46" stroke="#17483b" strokeWidth="4" strokeDasharray="9 6" /></>
      : <><line className="vector-line" x1={opposing ? 370 : 350} y1="95" x2={opposing ? 250 : 450} y2="95" stroke="#318eaa" strokeWidth="7" markerEnd="url(#vectorTip)" /><text x="240" y="75" fontSize="15" fontWeight="700" fill="#17607c">Viento: {Math.abs(values.velocidadViento)} m/s {opposing ? 'oeste' : 'este'}</text><line className="vector-result-line" x1="105" y1="195" x2={opposing ? 285 : 465} y2="195" stroke="#17483b" strokeWidth="5" markerEnd="url(#vectorTip)" /></>}
  </svg>;
}

function HookeScene({ phase }) {
  return <svg className={'concept-svg hooke-scene ' + (phase === 'flying' ? 'is-moving' : phase === 'landed' ? 'is-finished' : '')} viewBox="0 0 600 230" aria-hidden="true">
    <rect width="600" height="230" fill="#f3f2e9" />
    <rect x="80" y="30" width="440" height="20" rx="5" fill="#17483b" />
    <g className="spring-body"><path d="M300 50 L300 65 L270 72 L330 82 L270 92 L330 102 L270 112 L330 122 L270 132 L330 142 L300 150 L300 159" fill="none" stroke="#318eaa" strokeWidth="7" strokeLinejoin="round" strokeLinecap="round" /><rect x="260" y="158" width="80" height="52" rx="6" fill="#c78a4a" stroke="#8b633f" strokeWidth="3" /><path d="M261 159 L339 209 M339 159 L261 209" stroke="#8b633f" strokeWidth="3" /></g>
    <text x="380" y="105" fill="#17483b" fontSize="16" fontWeight="700">Fuerza ↓</text>
    <text x="365" y="185" fill="#17607c" fontSize="16" fontWeight="700">Deformación x</text>
  </svg>;
}

function ThermoScene({ exercise, phase }) {
  const values = exercise.values ?? {};
  const showAnswer = shouldRevealSimulatorAnswer(phase);
  const mixed = exercise.expectedConcept === 'equilibrio-termico';
  const initial = Number(values.temperaturaInicial ?? values.temperaturaFria);
  const final = mixed
    ? (Number(values.masaCaliente) * Number(values.temperaturaCaliente) + Number(values.masaFria) * Number(values.temperaturaFria)) / (Number(values.masaCaliente) + Number(values.masaFria))
    : Number(values.temperaturaFinal ?? (initial + Number(values.calor) / (Number(values.masa) * Number(values.calorEspecifico))));
  return <svg className={'concept-svg thermo-scene ' + (phase !== 'idle' ? 'is-active' : '')} viewBox="0 0 600 230" aria-hidden="true">
    <rect width="600" height="230" fill="#fff4e7" /><rect y="188" width="600" height="42" fill="#d9bd95" />
    <circle cx="487" cy="53" r="29" fill="#f3bb5e" opacity=".65" /><text x="30" y="34" fill="#744927" fontSize="16" fontWeight="700">{mixed ? 'MEZCLA DE AGUA' : 'CALENTAR AGUA'}</text>
    {mixed ? <>
      <path d="M85 91 L168 91 L157 182 L96 182Z" fill="#c5e5f1" stroke="#568aa1" strokeWidth="3" /><path d="M235 91 L318 91 L307 182 L246 182Z" fill="#f9ca9a" stroke="#bb7651" strokeWidth="3" />
      <text x="96" y="77" fill="#315b6a" fontSize="15">{values.temperaturaFria} °C</text><text x="240" y="77" fill="#8a4929" fontSize="15">{values.temperaturaCaliente} °C</text>
      <path className="thermo-flow" d="M176 138 H220 M327 138 H367" stroke="#ad693e" strokeWidth="5" strokeLinecap="round" />
      <path d="M380 83 L488 83 L475 182 L393 182Z" fill="#dfdcd0" stroke="#759789" strokeWidth="3" /><text x="405" y="121" fill="#245246" fontSize="24" fontWeight="800">{showAnswer ? `${final.toFixed(0)} °C` : '? °C'}</text><text x="398" y="150" fill="#245246" fontSize="13">{showAnswer ? 'equilibrio' : 'resultado'}</text>
    </> : <>
      <rect x="118" y="88" width="187" height="95" rx="8" fill="#bcdce2" stroke="#6a949a" strokeWidth="4" /><path d="M119 116 Q165 105 211 116 T305 116" fill="none" stroke="#f7ffff" strokeWidth="3" /><path className="thermo-heat" d="M160 185 q-12 20 0 35 m44-35 q-12 20 0 35 m44-35 q-12 20 0 35" fill="none" stroke="#d27945" strokeWidth="5" />
      <rect x="383" y="56" width="24" height="129" rx="12" fill="#fff" stroke="#a46746" strokeWidth="3" /><circle cx="395" cy="184" r="16" fill="#df7743" stroke="#a46746" strokeWidth="3" /><rect className="thermo-mercury" x="390" y="106" width="10" height="78" rx="5" fill="#df7743" />
      <text x="337" y="42" fill="#744927" fontSize="15">{initial} °C</text><text x="422" y="109" fill="#9d502d" fontSize="17" fontWeight="700">→ {exercise.expectedConcept === 'temperatura-final' && !showAnswer ? '? °C' : `${final.toFixed(0)} °C`}</text>
      <text x="112" y="69" fill="#744927" fontSize="14">{values.masa} kg de agua</text>
    </>}
  </svg>;
}

function OpticsScene({ exercise, phase }) {
  const values = exercise.values ?? {};
  const showAnswer = shouldRevealSimulatorAnswer(phase);
  const kind = exercise.expectedConcept;
  const surfaceAngle = Number(values.anguloSuperficie);
  const angle = Number(values.anguloIncidencia ?? (90 - Number(values.anguloSuperficie)));
  const dx = Math.cos(angle * Math.PI / 180) * 105;
  const dy = Math.sin(angle * Math.PI / 180) * 105;
  return <svg className={'concept-svg optics-scene ' + (phase !== 'idle' ? 'is-active' : '')} viewBox="0 0 600 230" aria-hidden="true">
    <rect width="600" height="230" fill="#eaf5fa" /><text x="24" y="30" fill="#215a73" fontSize="16" fontWeight="700">{kind === 'indice-refraccion' ? 'LUZ EN VIDRIO' : kind === 'espejo-plano' ? 'IMAGEN EN ESPEJO PLANO' : 'REFLEXIÓN DE LA LUZ'}</text>
    <rect x="298" y="37" width="10" height="164" rx="4" fill="#8caebd" /><path d="M312 45 l14 10 m-14 7 14 10 m-14 7 14 10 m-14 7 14 10 m-14 7 14 10 m-14 7 14 10 m-14 7 14 10 m-14 7 14 10" stroke="#8caebd" strokeWidth="2" />
    {kind === 'espejo-plano' ? <>
      <circle cx="150" cy="110" r="22" fill="#efbc67" /><path d="M150 133 V179 M129 151 H171" stroke="#315c6b" strokeWidth="5" />{showAnswer && <><circle cx="456" cy="110" r="22" fill="#efbc67" opacity=".5" /><path d="M456 133 V179 M435 151 H477" stroke="#315c6b" strokeWidth="5" opacity=".5" /></>}
      <path d="M150 204 H300 M308 204 H456" stroke="#315c6b" strokeWidth="2" strokeDasharray="7 5" /><text x="181" y="220" fill="#315c6b" fontSize="14">{values.distanciaObjeto} cm</text><text x="349" y="220" fill="#315c6b" fontSize="14">{showAnswer ? `${values.distanciaObjeto} cm` : '? cm'}</text>
    </> : kind === 'indice-refraccion' ? <>
      <rect x="309" y="38" width="291" height="164" fill="#b9dce8" opacity=".45" /><path d="M28 117 H567" stroke="#8baab8" strokeDasharray="6 6" />
      <path className="optics-ray" d="M78 58 L303 117 L540 153" fill="none" stroke="#e39a35" strokeWidth="5" strokeLinejoin="round" /><text x="85" y="86" fill="#315c6b" fontSize="14">aire · c = {Number(values.velocidadVacio) / 1000000} Mm/s</text><text x="354" y="91" fill="#315c6b" fontSize="14">vidrio · v = {Number(values.velocidadMedio) / 1000000} Mm/s</text>
    </> : <>
      <path d="M70 117 H523" stroke="#8baab8" strokeWidth="2" strokeDasharray="7 6" /><path className="optics-ray" d={showAnswer ? `M${303 - dx} ${117 - dy} L303 117 L${303 - dx} ${117 + dy}` : `M${303 - dx} ${117 - dy} L303 117`} fill="none" stroke="#e39a35" strokeWidth="5" strokeLinejoin="round" />
      {showAnswer
        ? <><text x="167" y="87" fill="#9b5b22" fontSize="15">incidencia {angle}°</text><text x="156" y="163" fill="#9b5b22" fontSize="15">reflexión {angle}°</text></>
        : <text x="153" y="163" fill="#9b5b22" fontSize="15">{Number.isFinite(surfaceAngle) ? `superficie ${surfaceAngle}°` : `incidencia ${angle}°`} · reflexión ?</text>}
    </>}
  </svg>;
}

export default function ConceptScene({ exercise, phase, submissionId }) {
  const topic = exercise?.topic;
  return <div className="concept-scene" key={submissionId} role="img" aria-label={`Representación de ${topic ?? 'este tema'} vinculada al ejercicio actual.`}>
    {topic === 'Termodinámica' ? <ThermoScene exercise={exercise} phase={phase} /> : topic === 'Óptica' ? <OpticsScene exercise={exercise} phase={phase} /> : topic === 'Cinemática' ? <CinematicaScene phase={phase} /> : topic === 'Vectores' ? <VectoresScene exercise={exercise} phase={phase} /> : <HookeScene phase={phase} />}
  </div>;
}
