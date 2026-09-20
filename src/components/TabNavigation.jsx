const ICONS = {
  simulador: (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
      <circle cx="5" cy="5" r="2.4" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="19" cy="5" r="2.4" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="5" cy="19" r="2.4" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="19" cy="19" r="2.4" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6.5 6.5 L10.5 10.5 M17.5 6.5 L13.5 10.5 M6.5 17.5 L10.5 13.5 M17.5 17.5 L13.5 13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <rect x="10.5" y="10.5" width="3" height="3" rx="1" fill="currentColor" />
    </svg>
  ),
  tarjetas: (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
      <path d="M4 5.5 C 6.5 4 9.5 4 12 5.5 C 14.5 4 17.5 4 20 5.5 V 18.5 C 17.5 17 14.5 17 12 18.5 C 9.5 17 6.5 17 4 18.5 Z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <line x1="12" y1="5.5" x2="12" y2="18.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  aula: (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
      <rect x="3.5" y="4" width="17" height="11" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 15 V 18 M8 21 L12 18 L16 21" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7.5 12 L10.5 9 L13 10.5 L16.5 7.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

const TABS = [
  { id: 'simulador', label: 'Simulador' },
  { id: 'tarjetas', label: 'Tarjetas' },
  { id: 'aula', label: 'Aula' },
];

export default function TabNavigation({ activeTab, onChange }) {
  return (
    <nav className="tab-navigation" role="tablist" aria-label="Módulos de GuaranIA">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={activeTab === tab.id}
          className={`tab ${activeTab === tab.id ? 'is-active' : ''}`}
          onClick={() => onChange(tab.id)}
        >
          <span className="tab-icon">{ICONS[tab.id]}</span>
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
