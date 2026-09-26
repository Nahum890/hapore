import { useEffect, useRef, useState } from 'react';

function VisualExplorar() {
  return (
    <svg viewBox="0 0 320 120" width="320" height="120" aria-hidden="true" focusable="false">
      <defs>
        <marker id="onb-arrow-blue" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto">
          <path d="M0 1 L9 5 L0 9 Z" fill="#1d5bd8" />
        </marker>
        <marker id="onb-arrow-amber" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto">
          <path d="M0 1 L9 5 L0 9 Z" fill="#d97706" />
        </marker>
      </defs>
      {/* Ejes de coordenadas */}
      <line x1="30" y1="96" x2="300" y2="96" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" />
      <line x1="30" y1="96" x2="30" y2="16" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" />
      <text x="304" y="99" fill="#64748b" fontSize="11" fontWeight="700">X</text>
      <text x="27" y="12" fill="#64748b" fontSize="11" fontWeight="700">Y</text>
      {/* Punto de lanzamiento / Dron */}
      <circle cx="30" cy="96" r="6" fill="#1d5bd8" />
      <rect x="22" y="70" width="16" height="8" rx="2" fill="#123ea1" />
      <line x1="16" y1="68" x2="44" y2="68" stroke="#1d5bd8" strokeWidth="2" strokeLinecap="round" />
      {/* Vector velocidad inicial v0 */}
      <line x1="30" y1="96" x2="88" y2="42" stroke="#1d5bd8" strokeWidth="3" markerEnd="url(#onb-arrow-blue)" strokeLinecap="round" />
      <text x="62" y="38" fill="#123ea1" fontSize="12" fontWeight="800">v₀</text>
      {/* Arco de ángulo θ */}
      <path d="M 52 96 A 22 22 0 0 0 46 81" fill="none" stroke="#d97706" strokeWidth="2" />
      <text x="56" y="86" fill="#d97706" fontSize="12" fontWeight="850">θ</text>
      {/* Trayectoria parabólica */}
      <path d="M 30 96 Q 140 18 250 96" fill="none" stroke="#1d5bd8" strokeWidth="2.5" strokeDasharray="5 4" opacity="0.85" />
      {/* Escenarios insignias */}
      <g transform="translate(140, 22)">
        <rect x="-34" y="-12" width="68" height="20" rx="10" fill="#eff4fe" stroke="#bfdbfe" />
        <text x="0" y="2" textAnchor="middle" fill="#123ea1" fontSize="10.5" fontWeight="800">Parábola</text>
      </g>
      <g transform="translate(250, 96)">
        <circle cx="0" cy="0" r="7" fill="#e11d48" />
        <circle cx="0" cy="0" r="3" fill="#ffffff" />
        <text x="0" y="18" textAnchor="middle" fill="#9f1239" fontSize="10" fontWeight="750">Diana / Meta</text>
      </g>
    </svg>
  );
}

function VisualResolver() {
  return (
    <svg viewBox="0 0 320 120" width="320" height="120" aria-hidden="true" focusable="false">
      <defs>
        <marker id="onb-arrow-coral" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto">
          <path d="M0 1 L9 5 L0 9 Z" fill="#e11d48" />
        </marker>
        <marker id="onb-arrow-blue-sm" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto">
          <path d="M0 1 L9 5 L0 9 Z" fill="#1d5bd8" />
        </marker>
      </defs>
      {/* Eje horizontal vx */}
      <line x1="36" y1="92" x2="140" y2="92" stroke="#1d5bd8" strokeWidth="3" markerEnd="url(#onb-arrow-blue-sm)" strokeLinecap="round" />
      <text x="148" y="96" fill="#123ea1" fontSize="11" fontWeight="850">vx = v₀ · cos(θ)</text>
      {/* Eje vertical vy */}
      <line x1="36" y1="92" x2="36" y2="24" stroke="#e11d48" strokeWidth="3" markerEnd="url(#onb-arrow-coral)" strokeLinecap="round" />
      <text x="44" y="22" fill="#9f1239" fontSize="11" fontWeight="850">vy = v₀ · sen(θ)</text>
      {/* Vector resultante v0 diagonal punteada */}
      <line x1="36" y1="92" x2="132" y2="24" stroke="#64748b" strokeWidth="2" strokeDasharray="3 3" />
      <line x1="132" y1="92" x2="132" y2="24" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="2 2" />
      <line x1="36" y1="24" x2="132" y2="24" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="2 2" />
      {/* Gravedad indicación */}
      <g transform="translate(230, 36)">
        <rect x="-10" y="-12" width="86" height="52" rx="10" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1.5" />
        <text x="33" y="4" textAnchor="middle" fill="#0f172a" fontSize="11" fontWeight="800">Gravedad (g)</text>
        <line x1="33" y1="10" x2="33" y2="28" stroke="#e11d48" strokeWidth="2" markerEnd="url(#onb-arrow-coral)" />
        <text x="33" y="36" textAnchor="middle" fill="#64748b" fontSize="9.5" fontWeight="700">9,8 m/s²</text>
      </g>
    </svg>
  );
}

function VisualRecibirAyuda() {
  return (
    <svg viewBox="0 0 320 120" width="320" height="120" aria-hidden="true" focusable="false">
      {/* Globo de diálogo del tutor */}
      <g transform="translate(18, 12)">
        <rect x="0" y="0" width="284" height="64" rx="14" fill="#f4f0ff" stroke="#ddd6fe" strokeWidth="1.5" />
        <polygon points="26,64 36,64 26,74" fill="#f4f0ff" stroke="#ddd6fe" strokeWidth="1.5" />
        <rect x="22" y="62" width="18" height="4" fill="#f4f0ff" />
        {/* Header del tutor */}
        <circle cx="20" cy="18" r="8" fill="#7047eb" />
        <text x="20" y="22" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="900">IA</text>
        <text x="36" y="22" fill="#4f25c2" fontSize="12" fontWeight="850">Tutor PyFis · Jopara / Castellano</text>
        <text x="14" y="46" fill="#0f172a" fontSize="12" fontWeight="600">
          ¿Mba'éichapa? Eipuru sen(θ) pe componente vertical-pe.
        </text>
      </g>
      {/* 4 Pistas progresivas */}
      <g transform="translate(18, 92)">
        {['Pista 1: Eje', 'Pista 2: Fórmula', 'Pista 3: Datos', 'Pista 4: Paso'].map((label, idx) => (
          <g key={idx} transform={`translate(${idx * 72}, 0)`}>
            <rect x="0" y="0" width="66" height="22" rx="7" fill={idx === 0 ? '#1d5bd8' : '#ffffff'} stroke={idx === 0 ? '#123ea1' : '#cbd5e1'} strokeWidth="1.2" />
            <text x="33" y="15" textAnchor="middle" fill={idx === 0 ? '#ffffff' : '#475569'} fontSize="9.5" fontWeight={idx === 0 ? '800' : '700'}>
              {label}
            </text>
          </g>
        ))}
      </g>
    </svg>
  );
}

function VisualVisualizar() {
  return (
    <svg viewBox="0 0 320 120" width="320" height="120" aria-hidden="true" focusable="false">
      {/* Suelo */}
      <line x1="20" y1="102" x2="300" y2="102" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
      {/* Curva 30° (alcance menor) */}
      <path d="M 24 102 Q 100 56 190 102" fill="none" stroke="#94a3b8" strokeWidth="1.8" strokeDasharray="3 3" />
      <text x="194" y="99" fill="#94a3b8" fontSize="10" fontWeight="700">30°</text>
      {/* Curva 60° (misma distancia que 30°, simetría) */}
      <path d="M 24 102 Q 100 12 190 102" fill="none" stroke="#cbd5e1" strokeWidth="1.8" strokeDasharray="3 3" />
      <text x="100" y="16" textAnchor="middle" fill="#64748b" fontSize="10" fontWeight="700">60° (simetría)</text>
      {/* Curva 45° (Alcance Máximo Óptimo) */}
      <path d="M 24 102 Q 140 22 270 102" fill="none" stroke="#1d5bd8" strokeWidth="3" />
      {/* Punto ápice Hmax */}
      <circle cx="140" cy="46" r="4.5" fill="#d97706" />
      <text x="140" y="38" textAnchor="middle" fill="#d97706" fontSize="11" fontWeight="850">H_max (vy = 0)</text>
      {/* Diana a 45° */}
      <g transform="translate(270, 102)">
        <circle cx="0" cy="0" r="6" fill="#059669" />
        <circle cx="0" cy="0" r="2.5" fill="#ffffff" />
        <text x="0" y="-10" textAnchor="middle" fill="#065f46" fontSize="10.5" fontWeight="900">45° Alcance Máx</text>
      </g>
    </svg>
  );
}

function VisualContinuar({ role }) {
  return (
    <svg viewBox="0 0 320 120" width="320" height="120" aria-hidden="true" focusable="false">
      {/* Mbarete XP Card */}
      <g transform="translate(18, 18)">
        <rect x="0" y="0" width="130" height="84" rx="14" fill="#fef3c7" stroke="#fde68a" strokeWidth="1.5" />
        <text x="14" y="24" fill="#92400e" fontSize="11" fontWeight="900">MBARETE XP</text>
        <text x="14" y="52" fill="#0f172a" fontSize="24" fontWeight="900">+50 XP</text>
        <rect x="14" y="62" width="102" height="6" rx="3" fill="#ffffff" />
        <rect x="14" y="62" width="76" height="6" rx="3" fill="#d97706" />
      </g>
      {/* Aula / Tarjetas Card */}
      <g transform="translate(162, 18)">
        <rect x="0" y="0" width="140" height="84" rx="14" fill="#eff4fe" stroke="#bfdbfe" strokeWidth="1.5" />
        <text x="14" y="24" fill="#123ea1" fontSize="11" fontWeight="900">
          {role === 'maestro' ? 'AULA DOCENTE' : 'TARJETAS Y AULA'}
        </text>
        <text x="14" y="48" fill="#1d5bd8" fontSize="16" fontWeight="850">
          {role === 'maestro' ? 'Proyector 4K' : 'Mazo Balística'}
        </text>
        <g transform="translate(14, 58)">
          <rect x="0" y="0" width="112" height="18" rx="6" fill="#1d5bd8" />
          <text x="56" y="13" textAnchor="middle" fill="#ffffff" fontSize="9.5" fontWeight="800">
            {role === 'maestro' ? 'Código de clase' : '¡Progreso guardado!'}
          </text>
        </g>
      </g>
    </svg>
  );
}

const STEPS = [
  {
    number: '01',
    label: 'Explorar',
    title: 'Explorá escenarios de tiro parabólico',
    description:
      'Elegí entre situaciones reales: dron de rescate en Alto Paraná, lanzamiento en básquetbol o tiro sobre paredón. Observá los datos iniciales de velocidad (v0), ángulo (θ) y gravedad.',
    tip: 'Las condiciones de lanzamiento determinan toda la cinemática del movimiento.',
  },
  {
    number: '02',
    label: 'Resolver',
    title: 'Descomponé y calculá paso a paso',
    description:
      'Separá el vuelo en dos componentes independientes: avance horizontal constante (vx = v0 · cos θ) y aceleración vertical gravitatoria (vy = v0 · sen θ - g·t). Escribí tu resultado con coma o punto.',
    tip: 'Equivocarse también es aprender: la confianza Mbarete XP solo sube, nunca baja.',
  },
  {
    number: '03',
    label: 'Recibir ayuda',
    title: 'Tutor pedagógico y pistas socráticas',
    description:
      'Si tenés dudas, activá las 4 pistas progresivas (fórmula, sustitución, desarrollo) o consultale al tutor inteligente en Jopara o Castellano. Te orienta paso a paso sin darte la respuesta directa.',
    tip: 'El tutor pedagógico funciona con IA y también en modo 100% offline sin internet.',
  },
  {
    number: '04',
    label: 'Visualizar',
    title: 'Comprobá con la simulación interactiva',
    description:
      'Al tocar “Comprobar con el simulador”, se genera la parábola física real calculada punto a punto. Mirá la altura máxima alcanzada, el impacto en la diana y experimentá por qué 45° brinda el alcance máximo.',
    tip: 'El simulador no revela el resultado hasta finalizar la comprobación animada.',
  },
  {
    number: '05',
    label: 'Continuar',
    title: 'Sumá Mbarete XP y dominá la física',
    description:
      'Consolidá conceptos clave con tarjetas didácticas de repaso espaciado, ganá XP por cada actividad completada y sincronizá tu progreso en el aula con el código de tu docente.',
    tip: 'Todo tu progreso se guarda localmente en el dispositivo para estudiar sin conexión.',
  },
];

export default function Onboarding({ open, onDismiss, onStart, role = 'alumno' }) {
  const dialogRef = useRef(null);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return undefined;
    if (open && !dialog.open) {
      setStep(0);
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
    return () => {
      if (dialog.open) dialog.close();
    };
  }, [open]);

  // Teclado para accesibilidad: flechas izquierda/derecha y escape
  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight' && step < STEPS.length - 1) {
        setStep(s => s + 1);
      } else if (e.key === 'ArrowLeft' && step > 0) {
        setStep(s => s - 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, step]);

  const current = step === 4 && role === 'maestro'
    ? {
        number: '05',
        label: 'Continuar',
        title: 'Prepará tu clase y proyectá',
        description:
          'En Aula podés seleccionar ejercicios por situación, proyectar la simulación en pantalla grande para tus alumnos, compartir el código de clase de 6 letras y descargar la ficha de aula en PDF.',
        tip: 'Tus alumnos ingresan el código desde cualquier dispositivo móvil o computadora.',
      }
    : STEPS[step];

  return (
    <dialog
      ref={dialogRef}
      className="onboarding-dialog"
      aria-labelledby="onboarding-title"
      aria-modal="true"
      onCancel={event => {
        event.preventDefault();
        onDismiss();
      }}
      onClick={event => {
        if (event.target === event.currentTarget) onDismiss();
      }}
    >
      <div className="onboarding-shell">
        <div className="onboarding-top">
          <span className="onboarding-brand">PyFis IA · Movimiento Parabólico · Guía rápida</span>
          <button type="button" className="onboarding-close" aria-label="Cerrar guía rápida" onClick={onDismiss}>
            ×
          </button>
        </div>
        <p className="onboarding-progress-label">
          Paso {step + 1} de {STEPS.length} · {current.label}
        </p>
        <div
          className="onboarding-progress"
          role="progressbar"
          aria-label="Progreso de la guía"
          aria-valuenow={step + 1}
          aria-valuemin={1}
          aria-valuemax={STEPS.length}
        >
          {STEPS.map((item, index) => (
            <span key={item.number} className={index <= step ? 'is-active' : ''} />
          ))}
        </div>
        <article className="onboarding-card" key={current.number}>
          <div className="onboarding-card-head">
            <span className="onboarding-number">{current.number}</span>
            <span className="onboarding-label">{current.label}</span>
          </div>
          <h2 id="onboarding-title">{current.title}</h2>
          <div className="onboarding-visual">
            {step === 0 && <VisualExplorar />}
            {step === 1 && <VisualResolver />}
            {step === 2 && <VisualRecibirAyuda />}
            {step === 3 && <VisualVisualizar />}
            {step === 4 && <VisualContinuar role={role} />}
          </div>
          <p>{current.description}</p>
          <div className="onboarding-tip">
            <strong>Consejo pedagógico</strong>
            <span>{current.tip}</span>
          </div>
        </article>
        <div className="onboarding-actions">
          <button type="button" className="onboarding-skip" onClick={onDismiss}>
            Omitir guía
          </button>
          <div className="onboarding-steps">
            {step > 0 && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setStep(value => value - 1)}
              >
                Anterior
              </button>
            )}
            {step < STEPS.length - 1 ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setStep(value => value + 1)}
              >
                Siguiente
              </button>
            ) : (
              <button type="button" className="btn btn-primary" onClick={onStart}>
                Empezar a practicar
              </button>
            )}
          </div>
        </div>
      </div>
    </dialog>
  );
}
