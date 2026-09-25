import { useEffect, useState } from 'react';
import MobileMenu from './MobileMenu.jsx';
import PdfButton from './PdfButton.jsx';
export default function Header({ activeTab, onChange }) {
  const [online, setOnline] = useState(() => typeof navigator === 'undefined' || navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update); window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);
  return (
    <header className="app-header">
      <div className="header-row">
        <MobileMenu activeTab={activeTab} onChange={onChange} />
        <div className="header-title">
          <h1>GuaranIA</h1>
          <span className="offline-badge" role="status" data-online={online}>
            <span aria-hidden="true" className="network-dot" />
            {online ? 'Con conexión' : 'Sin conexión'}
          </span>
        </div>
        <PdfButton />
      </div>
    </header>
  );
}
