import { useEffect, useState } from 'react';
export default function Header({ user, onHome, onLogout }) {
  const [online, setOnline] = useState(() => typeof navigator === 'undefined' || navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update); window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);
  return <header className="app-header"><div className="header-row">
    <button className="header-brand" type="button" onClick={onHome} aria-label="Ir al inicio"><span className="brand-mark" aria-hidden="true">P</span><span><strong>PyFis IA</strong><small>Física a tu ritmo</small></span></button>
    <div className="header-account"><span className="connection-label" role="status"><span className="connection-dot" data-online={online} />{online ? 'Con conexión' : 'Sin conexión'}</span><span className="user-chip"><span className="user-avatar" aria-hidden="true">{user.name.charAt(0).toUpperCase()}</span><span><strong>{user.name}</strong><small>{user.role === 'maestro' ? 'Maestro' : 'Alumno'}</small></span></span><button className="logout-button" type="button" onClick={onLogout}>Salir</button></div>
  </div></header>;
}
