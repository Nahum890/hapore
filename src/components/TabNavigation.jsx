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
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
