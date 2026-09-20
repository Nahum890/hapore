const DEFAULT_LABELS = {
  idle: 'En espera',
  running: 'Simulando trayectoria...',
  success: '¡Llegó al objetivo!',
  error: 'Revisá el resultado',
};

const ICONS = {
  idle: (
    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="4" fill="currentColor" />
    </svg>
  ),
  running: (
    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false">
      <path d="M12 3 a 9 9 0 0 1 9 9" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  ),
  success: (
    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false">
      <path d="M5 12.5 L10 17.5 L19 7" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  error: (
    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false">
      <path d="M12 4 L21 19 H3 Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <line x1="12" y1="10" x2="12" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="16.6" r="0.9" fill="currentColor" />
    </svg>
  ),
};

export default function StatusBadge({ status = 'idle', message }) {
  const label = message ?? DEFAULT_LABELS[status] ?? DEFAULT_LABELS.idle;

  return (
    <span className={`status-badge status-${status}`} role="status">
      {ICONS[status] ?? ICONS.idle}
      {label}
    </span>
  );
}
