// Cinco avatares de dibujo, en la misma paleta que el resto de PyFis IA
// (var(--c-*) definidas en index.css), para que el alumno o el docente
// elijan uno sin depender de subir una foto ni de conexión a internet.
export const AVATAR_OPTIONS = ['sol', 'rio', 'selva', 'tierra', 'cielo'];

const FACE = '#F4D9B0';

function Face({ children }) {
  return (
    <svg viewBox="0 0 64 64" width="100%" height="100%" role="img" aria-hidden="true">
      <circle cx="32" cy="32" r="30" fill="var(--c-surface, #fff)" />
      {children}
      <circle cx="32" cy="34" r="17" fill={FACE} />
      <circle cx="26" cy="33" r="2.4" fill="#3A2E28" />
      <circle cx="38" cy="33" r="2.4" fill="#3A2E28" />
      <path d="M25 41 Q32 47 39 41" stroke="#3A2E28" strokeWidth="2.4" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function Sol() {
  return (
    <Face>
      <g fill="var(--c-sun, #F5A623)">
        {[0, 45, 90, 135, 180, 225, 270, 315].map(angle => (
          <rect key={angle} x="31" y="4" width="4" height="12" rx="2" transform={`rotate(${angle} 32 32)`} />
        ))}
      </g>
      <circle cx="32" cy="32" r="20" fill="var(--c-sun-soft, #FDE9C8)" />
    </Face>
  );
}

function Rio() {
  return (
    <Face>
      <circle cx="32" cy="32" r="24" fill="var(--c-sky-soft, #D6ECF7)" />
      <path d="M12 22 Q20 16 32 22 T52 22" stroke="var(--c-sky, #3FA9D6)" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M8 16 Q17 22 24 17" stroke="var(--c-sky-deep, #1E6E93)" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M40 17 Q47 22 56 16" stroke="var(--c-sky-deep, #1E6E93)" strokeWidth="3" fill="none" strokeLinecap="round" />
    </Face>
  );
}

function Selva() {
  return (
    <Face>
      <circle cx="32" cy="32" r="24" fill="var(--c-primary-soft, #DCEFE3)" />
      <path d="M18 20 Q32 2 46 20 Q32 14 18 20 Z" fill="var(--c-primary, #1B8A5A)" />
      <circle cx="14" cy="24" r="5" fill="var(--c-primary-deep, #0E5C3A)" />
      <circle cx="50" cy="24" r="5" fill="var(--c-primary-deep, #0E5C3A)" />
    </Face>
  );
}

function Tierra() {
  return (
    <Face>
      <circle cx="32" cy="32" r="24" fill="var(--c-earth-soft, #F6DCCB)" />
      <path d="M14 22 Q32 8 50 22 L48 26 Q32 14 16 26 Z" fill="var(--c-earth, #C0522D)" />
      <circle cx="17" cy="30" r="3" fill="var(--c-earth-deep, #7C2E14)" />
      <circle cx="47" cy="30" r="3" fill="var(--c-earth-deep, #7C2E14)" />
    </Face>
  );
}

function Cielo() {
  return (
    <Face>
      <circle cx="32" cy="32" r="24" fill="var(--c-paper, #F4EFE6)" />
      <circle cx="26" cy="33" r="7" fill="none" stroke="var(--c-ink, #2B2621)" strokeWidth="2.2" />
      <circle cx="40" cy="33" r="7" fill="none" stroke="var(--c-ink, #2B2621)" strokeWidth="2.2" />
      <line x1="33" y1="33" x2="33" y2="33" stroke="var(--c-ink, #2B2621)" strokeWidth="2.2" />
      <path d="M19 33 L14 31" stroke="var(--c-ink, #2B2621)" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M47 33 L52 31" stroke="var(--c-ink, #2B2621)" strokeWidth="2.2" strokeLinecap="round" />
    </Face>
  );
}

const RENDERERS = { sol: Sol, rio: Rio, selva: Selva, tierra: Tierra, cielo: Cielo };

export const isPhotoAvatar = id => typeof id === 'string' && /^data:image\/(jpeg|png|webp);base64,/.test(id);

export default function Avatar({ id, size = 40, className = '' }) {
  const style = { width: size, height: size, display: 'inline-block', borderRadius: '50%', overflow: 'hidden', flex: 'none' };
  // Foto subida por la persona (ya recortada y reducida a un data URL).
  if (isPhotoAvatar(id)) {
    return <span className={'avatar-icon ' + className} style={style}><img src={id} alt="" width={size} height={size} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /></span>;
  }
  const Renderer = RENDERERS[id];
  if (!Renderer) return null;
  return <span className={'avatar-icon ' + className} style={style}><Renderer /></span>;
}
