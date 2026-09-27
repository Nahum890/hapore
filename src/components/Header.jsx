import { useEffect, useState } from 'react';
import LanguageSelector from './LanguageSelector.jsx';
import Icon from './Icon.jsx';
import { BrandMark } from './Nanduti.jsx';
import Avatar from './Avatars.jsx';
import { useTranslation } from '../i18n/LanguageProvider.jsx';
export default function Header({ user, onHome, onLogout, onOpenSettings, onOpenNotifications, notificationCount = 0 }) {
  const { t } = useTranslation();
  const [online, setOnline] = useState(() => typeof navigator === 'undefined' || navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  return (
    <header className="app-header">
      <div className="header-row">
        <button
          className="header-brand"
          type="button"
          onClick={onHome}
          aria-label={t('header.home')}
          title={t('header.home')}
        >
          <BrandMark size={40} />
          <span>
            <strong>PyFis <em>IA</em></strong>
            <small>{t('brand.tagline')}</small>
          </span>
        </button>
        <div className="header-account">
          <span
            className="connection-label"
            role="status"
            aria-live="polite"
            data-online={online}
            title={online ? t('header.online') : t('header.offline')}
          >
            <span className="connection-dot" data-online={online} aria-hidden="true" />
            <span className="connection-text">{online ? t('header.online') : t('header.offline')}</span>
          </span>
          <LanguageSelector />
          {/* Solo muestra quién está conectado: la configuración se abre con
              el botón del engranaje de al lado (antes ambos hacían lo mismo). */}
          <div
            className="user-chip is-static"
            title={user.name + ' (' + (user.role === 'maestro' ? t('header.teacher') : t('header.student')) + ')'}
          >
            <Avatar id={user.avatar} name={user.name} size={32} />
            <span className="user-chip-text">
              <strong>{user.name}</strong>
              <small>{user.role === 'maestro' ? t('header.teacher') : t('header.student')}</small>
            </span>
          </div>
          <button type="button" className="header-action-button" onClick={onOpenSettings} aria-label={t('header.openSettings')} title={t('header.openSettings')}>
            <Icon name="settings" size={19} />
          </button>
          <button type="button" className="header-action-button header-notifications-button" onClick={onOpenNotifications} aria-label={t('notifications.open')} title={t('notifications.open')}>
            <Icon name="bell" size={19} />
            {notificationCount > 0 && <span className="header-notification-badge">{notificationCount > 99 ? '99+' : notificationCount}</span>}
          </button>
          <button
            className="logout-button"
            type="button"
            onClick={onLogout}
            aria-label={t('header.logout')}
            title={t('header.logout')}
          >
            <Icon name="logout" size={20} />
            <span>{t('header.logout')}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
