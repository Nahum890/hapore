// Íconos de línea propios (sin dependencias ni red) para navegación y tarjetas.
const PATHS = {
  home: <><path d="M4 11.5 12 5l8 6.5" /><path d="M6.5 10v9h11v-9" /><path d="M10 19v-5h4v5" /></>,
  launch: <><path d="M3 19h18" /><path d="M4 19c2.5-9 13.5-9 16 0" strokeDasharray="2.5 2.5" /><circle cx="12" cy="12.2" r="1.8" fill="currentColor" stroke="none" /><path d="M5 17l3-4" /></>,
  cards: <><rect x="4" y="6" width="12" height="14" rx="2.5" /><path d="M8 3.5h9.5A2.5 2.5 0 0 1 20 6v11" /><path d="M7.5 11h5M7.5 14.5h3" /></>,
  chat: <><path d="M5 5.5h14a1.5 1.5 0 0 1 1.5 1.5v8.5A1.5 1.5 0 0 1 19 17h-8l-4.5 3.5V17H5a1.5 1.5 0 0 1-1.5-1.5V7A1.5 1.5 0 0 1 5 5.5Z" /><path d="M8 10h8M8 13h5" /></>,
  class: <><rect x="3.5" y="4.5" width="17" height="11" rx="1.5" /><path d="M8 20l4-4.5 4 4.5" /><path d="M7 12l3-3 2.5 2 4-4" /></>,
  arrow: <><path d="M5 12h14" /><path d="M13 6l6 6-6 6" /></>,
  spark: <><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" /></>,
  retry: <><path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3" /><path d="M4 4.5v4.2h4.2" /></>,
  offline: <><path d="M4 9.5a12 12 0 0 1 16 0" /><path d="M7 12.8a7.5 7.5 0 0 1 10 0" /><path d="M10 16a3 3 0 0 1 4 0" /><circle cx="12" cy="19" r="1" fill="currentColor" stroke="none" /></>,
  help: <><circle cx="12" cy="12" r="8.5" /><path d="M9.6 9.6a2.5 2.5 0 1 1 3.4 2.3c-.7.3-1 .8-1 1.6" /><circle cx="12" cy="16.6" r=".9" fill="currentColor" stroke="none" /></>,
  logout: <><path d="M14 5h4.5v14H14" /><path d="M10 8l-4 4 4 4M6 12h9" /></>,
  ball: <><circle cx="12" cy="12" r="8.5" /><path d="M12 3.5v17M3.5 12h17" /><path d="M5.6 5.6a8.5 8.5 0 0 0 12.8 12.8M18.4 5.6A8.5 8.5 0 0 1 5.6 18.4" /></>,
  wall: <><path d="M3.5 6h17v12h-17z" /><path d="M3.5 12h17M8.5 6v6M15.5 6v6M6 12v6M12 12v6M18 12v6" /></>,
};

export default function Icon({ name, size = 22, className = '' }) {
  return <svg className={'icon ' + className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{PATHS[name]}</svg>;
}
