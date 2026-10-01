import { useId } from 'react';

// Avatares de dibujo (sin subir fotos ni depender de internet). Los cinco
// primeros ids se conservan para que los perfiles guardados sigan
// funcionando; si no hay avatar, se muestra la inicial del nombre.
export const AVATAR_OPTIONS = ['sol', 'rio', 'selva', 'tierra', 'cielo', 'yaguarete', 'guacamayo', 'tatu', 'cohete', 'atomo', 'pelota', 'dron'];
export const LETTER_AVATAR = '';

function Frame({ from, to, children }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg viewBox="0 0 64 64" width="100%" height="100%" role="img" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={from} /><stop offset="1" stopColor={to} /></linearGradient>
        <radialGradient id={`${id}-shine`} cx="0.3" cy="0.2" r="0.8"><stop offset="0" stopColor="#fff" stopOpacity=".45" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></radialGradient>
      </defs>
      <circle cx="32" cy="32" r="32" fill={`url(#${id}-bg)`} />
      {children}
      <circle cx="32" cy="32" r="32" fill={`url(#${id}-shine)`} />
    </svg>
  );
}

const Eyes = ({ y = 32, dx = 6, cx = 32, color = '#2b2118' }) => <>
  <circle cx={cx - dx} cy={y} r="2.6" fill={color} /><circle cx={cx + dx} cy={y} r="2.6" fill={color} />
  <circle cx={cx - dx + 0.9} cy={y - 0.9} r="0.8" fill="#fff" /><circle cx={cx + dx + 0.9} cy={y - 0.9} r="0.8" fill="#fff" />
</>;
const Smile = ({ y = 39, w = 6, color = '#2b2118' }) => <path d={`M${32 - w} ${y} Q32 ${y + 5} ${32 + w} ${y}`} stroke={color} strokeWidth="2.2" fill="none" strokeLinecap="round" />;
const Cheeks = ({ y = 38 }) => <><circle cx="22" cy={y} r="3" fill="#ff7a7a" opacity=".45" /><circle cx="42" cy={y} r="3" fill="#ff7a7a" opacity=".45" /></>;

function Sol() {
  return <Frame from="#ffd166" to="#f77f00">
    <g fill="#fff3c4">{[0, 45, 90, 135, 180, 225, 270, 315].map(a => <path key={a} d="M32 5 L35 14 L29 14 Z" transform={`rotate(${a} 32 32)`} />)}</g>
    <circle cx="32" cy="33" r="16" fill="#ffe066" stroke="#fff3c4" strokeWidth="2" />
    <Eyes y={31} /><Smile y={37} /><Cheeks y={36} />
  </Frame>;
}
function Rio() {
  return <Frame from="#8ecae6" to="#1d5bd8">
    <path d="M0 42 Q10 36 20 42 T40 42 T64 42 V64 H0Z" fill="#48cae4" opacity=".9" />
    <path d="M0 50 Q10 44 20 50 T40 50 T64 50 V64 H0Z" fill="#0077b6" />
    <path d="M20 28 Q32 16 44 28 Q32 40 20 28Z" fill="#ffb703" /><path d="M44 28 L52 22 L52 34Z" fill="#fb8500" />
    <circle cx="27" cy="26.5" r="2" fill="#1b263b" /><circle cx="27.6" cy="26" r=".6" fill="#fff" />
  </Frame>;
}
function Selva() {
  return <Frame from="#b7e4c7" to="#2d6a4f">
    <path d="M8 58 Q14 30 32 22 Q22 40 20 58Z" fill="#40916c" /><path d="M56 58 Q50 30 32 22 Q42 40 44 58Z" fill="#52b788" />
    <circle cx="32" cy="38" r="12" fill="#74c69d" /><circle cx="26" cy="29" r="5" fill="#95d5b2" /><circle cx="38" cy="29" r="5" fill="#95d5b2" />
    <Eyes y={29} dx={6} /><Smile y={41} w={5} />
  </Frame>;
}
function Tierra() {
  return <Frame from="#caf0f8" to="#0096c7">
    <circle cx="32" cy="32" r="18" fill="#48cae4" />
    <path d="M20 24 Q26 18 32 22 Q30 28 24 30 Q18 30 20 24Z M34 34 Q42 30 46 36 Q42 44 36 44 Q32 40 34 34Z M26 40 Q30 40 29 45 Q25 46 24 43Z" fill="#52b788" />
    <ellipse cx="32" cy="32" rx="26" ry="7" fill="none" stroke="#fff" strokeWidth="2" opacity=".7" transform="rotate(-18 32 32)" />
  </Frame>;
}
function Cielo() {
  return <Frame from="#e0f2fe" to="#7dd3fc">
    <path d="M14 40 a8 8 0 0 1 8 -9 a10 10 0 0 1 19 -2 a7 7 0 0 1 9 7 a6 6 0 0 1 -2 11 H18 a6 6 0 0 1 -4 -7Z" fill="#fff" />
    <path d="M40 14 L56 20 L44 24Z" fill="#1d5bd8" /><path d="M44 24 L46 30 L48 22Z" fill="#1e40af" />
    <path d="M10 22 Q22 12 38 18" stroke="#1d5bd8" strokeWidth="1.6" strokeDasharray="2 3" fill="none" />
  </Frame>;
}
function Yaguarete() {
  return <Frame from="#ffe8a3" to="#e76f51">
    <circle cx="19" cy="20" r="6" fill="#f4a261" /><circle cx="45" cy="20" r="6" fill="#f4a261" />
    <circle cx="19" cy="20" r="3" fill="#6b3e26" /><circle cx="45" cy="20" r="3" fill="#6b3e26" />
    <circle cx="32" cy="35" r="17" fill="#f4a261" />
    {[[22, 27], [42, 27], [18, 37], [46, 37], [32, 22]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="2" fill="#6b3e26" opacity=".75" />)}
    <ellipse cx="32" cy="41" rx="8" ry="6" fill="#fff4e0" />
    <Eyes y={33} /><path d="M30 38 L34 38 L32 40.5Z" fill="#6b3e26" /><Smile y={43} w={4} color="#6b3e26" />
  </Frame>;
}
function Guacamayo() {
  return <Frame from="#a5d8ff" to="#1c7ed6">
    <path d="M20 58 Q18 36 30 26 Q46 20 46 36 Q46 50 36 58Z" fill="#e03131" />
    <path d="M36 58 Q44 48 46 36 L52 46 Q50 54 44 58Z" fill="#fcc419" /><path d="M20 58 Q22 48 28 44 L26 58Z" fill="#1971c2" />
    <ellipse cx="36" cy="30" rx="6" ry="5" fill="#fff" /><circle cx="37" cy="30" r="2.4" fill="#212529" />
    <path d="M42 32 Q52 30 50 40 Q46 36 42 36Z" fill="#343a40" />
  </Frame>;
}
function Tatu() {
  return <Frame from="#fff1e6" to="#b08968">
    <path d="M12 44 Q14 24 34 22 Q52 22 54 40 Q54 46 48 46 H16 Q12 46 12 44Z" fill="#9c6644" />
    {[20, 28, 36, 44].map(x => <path key={x} d={`M${x} 24 Q${x + 2} 34 ${x} 46`} stroke="#ddb892" strokeWidth="2" fill="none" />)}
    <path d="M54 40 Q60 38 60 44 Q56 46 52 45Z" fill="#b08968" /><circle cx="56" cy="41" r="1.4" fill="#2b2118" />
    <path d="M12 42 Q6 44 6 50" stroke="#9c6644" strokeWidth="3" fill="none" strokeLinecap="round" />
    <rect x="18" y="45" width="5" height="7" rx="2" fill="#7f5539" /><rect x="42" y="45" width="5" height="7" rx="2" fill="#7f5539" />
  </Frame>;
}
function Cohete() {
  return <Frame from="#3a0ca3" to="#4361ee">
    {[[12, 14], [50, 12], [16, 46], [52, 44], [44, 24]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="1.3" fill="#fff" />)}
    <path d="M32 8 Q42 18 40 38 H24 Q22 18 32 8Z" fill="#f8f9fa" />
    <circle cx="32" cy="24" r="4.5" fill="#4cc9f0" stroke="#adb5bd" strokeWidth="1.5" />
    <path d="M24 30 L16 42 L24 40Z M40 30 L48 42 L40 40Z" fill="#f72585" />
    <path d="M26 38 Q32 58 38 38Z" fill="#ffba08" /><path d="M29 38 Q32 50 35 38Z" fill="#ff6d00" />
  </Frame>;
}
function Atomo() {
  return <Frame from="#d0bfff" to="#7048e8">
    {[0, 60, 120].map(a => <ellipse key={a} cx="32" cy="32" rx="22" ry="8" fill="none" stroke="#fff" strokeWidth="2.2" transform={`rotate(${a} 32 32)`} />)}
    <circle cx="32" cy="32" r="6" fill="#ffd43b" />
    <circle cx="54" cy="32" r="2.6" fill="#63e6be" /><circle cx="21" cy="13" r="2.6" fill="#63e6be" /><circle cx="21" cy="51" r="2.6" fill="#63e6be" />
  </Frame>;
}
function Pelota() {
  return <Frame from="#d3f9d8" to="#2f9e44">
    <path d="M8 50 Q24 6 44 30" stroke="#fff" strokeWidth="2" strokeDasharray="3 3" fill="none" />
    <circle cx="44" cy="38" r="12" fill="#fff" stroke="#212529" strokeWidth="1.5" />
    <path d="M44 32 L49 35.5 L47 41.5 H41 L39 35.5Z" fill="#212529" />
    <path d="M44 26 V32 M49 35.5 L55 34 M47 41.5 L50 47 M41 41.5 L38 47 M39 35.5 L33 34" stroke="#212529" strokeWidth="1.3" />
    <rect x="4" y="54" width="56" height="10" fill="#2b8a3e" />
  </Frame>;
}
function Dron() {
  return <Frame from="#fff3bf" to="#fab005">
    <rect x="20" y="28" width="24" height="10" rx="5" fill="#343a40" />
    <path d="M22 30 L12 22 M42 30 L52 22" stroke="#495057" strokeWidth="3" strokeLinecap="round" />
    <ellipse cx="12" cy="20" rx="9" ry="2.5" fill="#adb5bd" opacity=".9" /><ellipse cx="52" cy="20" rx="9" ry="2.5" fill="#adb5bd" opacity=".9" />
    <circle cx="32" cy="33" r="3" fill="#4dabf7" />
    <path d="M28 38 L26 44 M36 38 L38 44" stroke="#495057" strokeWidth="2" />
    <rect x="25" y="44" width="14" height="11" rx="2" fill="#c0843e" /><path d="M25 44 L39 55 M39 44 L25 55" stroke="#8b5a2b" strokeWidth="1.2" />
  </Frame>;
}

const RENDERERS = { sol: Sol, rio: Rio, selva: Selva, tierra: Tierra, cielo: Cielo, yaguarete: Yaguarete, guacamayo: Guacamayo, tatu: Tatu, cohete: Cohete, atomo: Atomo, pelota: Pelota, dron: Dron };
const LETTER_COLORS = [['#4dabf7', '#1c7ed6'], ['#63e6be', '#0ca678'], ['#ffa94d', '#e8590c'], ['#b197fc', '#7048e8'], ['#ff8787', '#e03131'], ['#ffd43b', '#f08c00']];

export const isPhotoAvatar = id => typeof id === 'string' && /^data:image\/(jpeg|png|webp);base64,/.test(id);

/** Inicial del nombre sobre un color estable (siempre el mismo para el mismo nombre). */
function LetterAvatar({ name }) {
  const id = useId().replace(/:/g, '');
  const text = String(name ?? '').trim();
  const letter = (text.charAt(0) || '?').toUpperCase();
  const hash = [...text].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const [from, to] = LETTER_COLORS[hash % LETTER_COLORS.length];
  return <svg viewBox="0 0 64 64" width="100%" height="100%" role="img" aria-hidden="true">
    <defs><linearGradient id={`${id}-l`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={from} /><stop offset="1" stopColor={to} /></linearGradient></defs>
    <circle cx="32" cy="32" r="32" fill={`url(#${id}-l)`} />
    <text x="32" y="33" textAnchor="middle" dominantBaseline="central" fontFamily="system-ui, sans-serif" fontWeight="800" fontSize="30" fill="#fff">{letter}</text>
  </svg>;
}

export default function Avatar({ id, size = 40, className = '', name = '' }) {
  const style = { width: size, height: size, display: 'inline-block', borderRadius: '50%', overflow: 'hidden', flex: 'none' };
  // Foto subida por la persona (ya recortada y reducida a un data URL).
  if (isPhotoAvatar(id)) {
    return <span className={'avatar-icon ' + className} style={style}><img src={id} alt="" width={size} height={size} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /></span>;
  }
  const Renderer = RENDERERS[id];
  if (!Renderer) return <span className={'avatar-icon ' + className} style={style}><LetterAvatar name={name} /></span>;
  return <span className={'avatar-icon ' + className} style={style}><Renderer /></span>;
}
