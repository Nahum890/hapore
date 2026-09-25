import { useEffect, useState } from 'react';
import LanguageSelector from './LanguageSelector.jsx';
import { useTranslation } from '../i18n/LanguageProvider.jsx';
export default function Header({ user, onHome, onLogout }) {
  const { t } = useTranslation();
  const [online, setOnline] = useState(() => typeof navigator === 'undefined' || navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update); window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);
  return <header className="app-header"><div className="header-row">
    <button className="header-brand" type="button" onClick={onHome} aria-label={t('header.home')}><span className="brand-mark" aria-hidden="true">P</span><span><strong>PyFis IA</strong><small>{t('brand.tagline')}</small></span></button>
    <div className="header-account"><span className="connection-label" role="status"><span className="connection-dot" data-online={online} />{online ? t('header.online') : t('header.offline')}</span><LanguageSelector /><span className="user-chip"><span className="user-avatar" aria-hidden="true">{user.name.charAt(0).toUpperCase()}</span><span><strong>{user.name}</strong><small>{user.role === 'maestro' ? t('header.teacher') : t('header.student')}</small></span></span><button className="logout-button" type="button" onClick={onLogout}>{t('header.logout')}</button></div>
  </div></header>;
}
