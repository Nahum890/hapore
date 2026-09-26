// Motivo de ñandutí (encaje paraguayo): pétalos y anillos festoneados
// alrededor de un centro, como el "sol" clásico del ñandutí. Todo se genera
// con geometría (sin trazar a mano), para poder reusarlo en cualquier tamaño.
function polar(cx, cy, r, deg) {
  const a = (deg * Math.PI) / 180;
  return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
}

// Un pétalo (forma de hoja/lanza) apuntando hacia afuera desde el centro.
function petalPath(cx, cy, deg, rBase, rTip, halfAngle) {
  const [bx, by] = polar(cx, cy, rBase, deg);
  const [tx, ty] = polar(cx, cy, rTip, deg);
  const midR = rBase + (rTip - rBase) * 0.52;
  const [s1x, s1y] = polar(cx, cy, midR, deg - halfAngle);
  const [s2x, s2y] = polar(cx, cy, midR, deg + halfAngle);
  return `M${bx.toFixed(2)},${by.toFixed(2)} Q${s1x.toFixed(2)},${s1y.toFixed(2)} ${tx.toFixed(2)},${ty.toFixed(2)} Q${s2x.toFixed(2)},${s2y.toFixed(2)} ${bx.toFixed(2)},${by.toFixed(2)} Z`;
}

function petalRing(cx, cy, count, rBase, rTip, widthFactor = 0.36, offsetDeg = 0) {
  const step = 360 / count;
  const halfAngle = step * widthFactor;
  return Array.from({ length: count }, (_, i) => petalPath(cx, cy, offsetDeg + step * i, rBase, rTip, halfAngle));
}

// El "hilo" festoneado que bordea cada anillo, como el remate de crochet.
function scallopRing(cx, cy, r, bumps, depth) {
  const step = 360 / bumps;
  const pts = Array.from({ length: bumps }, (_, i) => polar(cx, cy, r, step * i));
  const rx = (Math.PI * r) / bumps + depth;
  let d = `M${pts[0][0].toFixed(2)},${pts[0][1].toFixed(2)} `;
  for (let i = 1; i <= bumps; i += 1) {
    const [x, y] = pts[i % bumps];
    d += `A${rx.toFixed(2)} ${rx.toFixed(2)} 0 0 1 ${x.toFixed(2)},${y.toFixed(2)} `;
  }
  return d + 'Z';
}

function Dots({ cx, cy, r, count, dotR, offsetDeg = 0 }) {
  return Array.from({ length: count }, (_, i) => {
    const [x, y] = polar(cx, cy, r, offsetDeg + (360 / count) * i);
    return <circle key={i} cx={x.toFixed(2)} cy={y.toFixed(2)} r={dotR} />;
  });
}

/**
 * `spokes` fija cuántos pétalos tiene cada anillo; `rings` fija el nivel de
 * detalle (2 = una rosácea simple para íconos chicos; 3-4 = motivo "sol"
 * completo, con anillo interior y remate festoneado, para usos grandes).
 */
export function Nanduti({ size = 120, spokes = 16, rings = 3, color = 'currentColor', accent, className = '', strokeWidth = 1.6 }) {
  const c = 50;
  const petals = Math.max(6, spokes);
  const innerPetals = Math.max(5, Math.round(petals / 2));
  const detailed = rings >= 3;
  return (
    <svg className={'nanduti ' + className} width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <g fill={color}>
        {petalRing(c, c, petals, 29, 43).map((d, i) => <path key={'op' + i} d={d} />)}
        {detailed && petalRing(c, c, innerPetals, 13, 25, 0.4, 360 / petals / 2).map((d, i) => <path key={'ip' + i} d={d} />)}
        {detailed && <Dots cx={c} cy={c} r={10} count={petals} dotR={1.5} />}
      </g>
      <g fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round">
        <path d={scallopRing(c, c, 46.5, petals, 2.4)} />
        {detailed && <circle cx={c} cy={c} r={27.5} strokeWidth={strokeWidth * 0.7} strokeDasharray="1.8 2.6" />}
      </g>
      {detailed
        ? <circle cx={c} cy={c} r={6.4} fill="none" stroke={accent ?? color} strokeWidth={strokeWidth * 1.15} />
        : <circle cx={c} cy={c} r={4} fill={accent ?? color} />}
    </svg>
  );
}

// Marca de PyFis IA: una rosácea de ñandutí (el "sol") con la parábola de un lanzamiento.
export function BrandMark({ size = 40 }) {
  return <svg className="brand-mark" width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
    <rect width="48" height="48" rx="14" fill="var(--c-primary)" />
    <g fill="rgba(255,255,255,.55)">
      {petalRing(33, 15, 8, 3, 8.5, 0.4).map((d, i) => <path key={i} d={d} />)}
    </g>
    <circle cx="33" cy="15" r="2.6" fill="var(--c-sun)" />
    <path d="M9 38 Q 20 6 38 38" fill="none" stroke="var(--c-sun)" strokeWidth="3" strokeLinecap="round" strokeDasharray="0.1 5.2" />
    <path d="M7 38.5h34" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
    <circle cx="38" cy="38.5" r="3.2" fill="var(--c-earth)" stroke="#fff" strokeWidth="1.4" />
  </svg>;
}

// Escena ilustrada: cielo, sol-ñandutí, tierra colorada y una trayectoria con sus componentes.
export function LaunchScene({ className = '' }) {
  // "meet" mantiene visible toda la trayectoria; el cielo y la tierra se extienden
  // fuera del viewBox (overflow visible) para llenar contenedores anchos o altos.
  return <svg className={'launch-scene ' + className} viewBox="0 0 360 220" preserveAspectRatio="xMidYMax meet" overflow="visible" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id="ls-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#bfe3f2" /><stop offset="1" stopColor="#f3ecd9" /></linearGradient>
      {[['earth', '#e4572e'], ['sky', '#2f80c1'], ['green', '#0e7c66']].map(([id, fill]) => <marker key={id} id={'ls-arrow-' + id} viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 10 5 0 10z" fill={fill} /></marker>)}
    </defs>
    <rect x="-600" y="-400" width="1560" height="620" fill="url(#ls-sky)" />
    <g transform="translate(252 34)"><g className="ls-sun"><Nanduti size={84} spokes={18} rings={3} color="#eba431" accent="#f4b942" strokeWidth={1.3} /></g></g>
    <path d="M-600 170 C -400 150 -200 180 0 176 C 60 150 110 160 170 168 S 290 150 360 162 C 500 150 700 175 960 165 V240 H-600Z" fill="#6aa66f" />
    <path d="M-600 186 C -300 180 -100 192 0 190 C 90 176 200 186 360 178 C 560 172 760 188 960 182 V240 H-600Z" fill="#c8552f" />
    <path d="M-600 204 C -300 198 -100 206 0 204 C 120 196 240 206 360 200 C 560 196 760 206 960 202 V240 H-600Z" fill="#a94424" />
    <path d="M40 184 Q 160 30 282 184" fill="none" stroke="#1b2a41" strokeWidth="2" strokeDasharray="5 6" strokeLinecap="round" />
    {/* v₀ es tangente a la trayectoria en el lanzamiento; v₀x y v₀y son sus componentes exactas. */}
    <path d="M86 184 V125 M40 125 H86" stroke="#1b2a41" strokeOpacity=".25" strokeDasharray="3 3" />
    <line x1="40" y1="184" x2="86" y2="184" stroke="#e4572e" strokeWidth="3" markerEnd="url(#ls-arrow-earth)" />
    <line x1="40" y1="184" x2="40" y2="125" stroke="#2f80c1" strokeWidth="3" markerEnd="url(#ls-arrow-sky)" />
    <line x1="40" y1="184" x2="86" y2="125" stroke="#0e7c66" strokeWidth="3.4" markerEnd="url(#ls-arrow-green)" />
    <text x="52" y="200" fill="#fff" fontSize="12" fontWeight="800">v₀x</text>
    <text x="12" y="150" fill="#1f6aa5" fontSize="12" fontWeight="800">v₀y</text>
    <text x="90" y="120" fill="#0a5a4a" fontSize="12" fontWeight="800">v₀</text>
    <g className="ls-ball"><circle cx="161" cy="107" r="9" fill="#f4b942" stroke="#1b2a41" strokeWidth="2" /></g>
    <g transform="translate(282 150)"><line x1="0" y1="0" x2="0" y2="34" stroke="#1b2a41" strokeWidth="2.4" /><path d="M0 0 20 7 0 14z" fill="#e4572e" /></g>
  </svg>;
}
