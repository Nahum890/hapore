import { useEffect, useId, useRef, useState } from 'react';
const MENU_ITEMS = [
  { id: 'simulador', label: 'Misión / Simulador 2D' },
  { id: 'tarjetas', label: 'Fichas de repaso' },
  { id: 'chats', label: 'Chats e historial' },
  { id: 'aula', label: 'Aula y docente' },
];
export default function MobileMenu({ activeTab, onChange }) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef(null), buttonRef = useRef(null);
  const id = useId();
  useEffect(() => {
    if (!open) return undefined;
    const dialog = dialogRef.current;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      buttonRef.current?.focus();
    };
  }, [open]);
  const close = () => setOpen(false);
  return (
    <>
      <button ref={buttonRef} type="button" className="hamburger-btn" aria-label="Abrir menú de módulos" aria-expanded={open} aria-controls={id} onClick={() => setOpen(true)}>
        <span className="hamburger-bar" aria-hidden="true" /><span className="hamburger-bar" aria-hidden="true" /><span className="hamburger-bar" aria-hidden="true" />
      </button>
      <dialog ref={dialogRef} id={id} className="navigation-dialog" aria-labelledby={id + '-title'} onCancel={event => { event.preventDefault(); close(); }} onClose={close} onClick={event => { if (event.target === event.currentTarget) close(); }}>
        <nav aria-label="Módulos de PyFis IA" className="navigation-panel">
          <div className="navigation-heading"><h2 id={id + '-title'}>Explorá PyFis IA</h2><button type="button" className="icon-button" onClick={close} aria-label="Cerrar menú">×</button></div>
          <p className="muted">Aprendé a tu ritmo, con o sin conexión.</p>
          {MENU_ITEMS.map((item, index) => (
            <button key={item.id} type="button" className={'menu-item ' + (activeTab === item.id ? 'is-active' : '')} aria-current={activeTab === item.id ? 'page' : undefined} onClick={() => { close(); onChange?.(item.id); }}>
              <span className="menu-item-index" aria-hidden="true">{index + 1}</span>{item.label}
            </button>
          ))}
        </nav>
      </dialog>
    </>
  );
}
