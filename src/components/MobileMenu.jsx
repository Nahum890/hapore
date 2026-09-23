import { useEffect, useRef, useState } from 'react';

const MENU_ITEMS = [
  { id: 'simulador', label: 'Misión / Simulador 2D' },
  { id: 'tarjetas', label: 'Fichas de Repaso (Flashcards)' },
  { id: 'chats', label: 'Chats e Historial' },
  { id: 'aula', label: 'Vista del Docente / Modo Aula' },
];

export default function MobileMenu({ activeTab, onChange }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const handlePointerDown = (event) => {
      if (menuRef.current?.contains(event.target) || buttonRef.current?.contains(event.target)) {
        return;
      }
      setOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const handleSelect = (id) => {
    setOpen(false);
    onChange?.(id);
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="hamburger-btn"
        aria-label="Abrir menú de módulos"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="hamburger-bar" aria-hidden="true" />
        <span className="hamburger-bar" aria-hidden="true" />
        <span className="hamburger-bar" aria-hidden="true" />
      </button>
      <div
        className={`menu-backdrop ${open ? 'is-open' : ''}`}
        aria-hidden="true"
        onClick={() => setOpen(false)}
      />
      <nav
        ref={menuRef}
        className={`menu-drawer ${open ? 'is-open' : ''}`}
        aria-label="Módulos de GuaranIA"
      >
        {MENU_ITEMS.map((item, index) => (
          <button
            key={item.id}
            type="button"
            className={`menu-item ${activeTab === item.id ? 'is-active' : ''}`}
            aria-current={activeTab === item.id ? 'page' : undefined}
            onClick={() => handleSelect(item.id)}
          >
            <span className="menu-item-index" aria-hidden="true">{index + 1}</span>
            {item.label}
          </button>
        ))}
      </nav>
    </>
  );
}
