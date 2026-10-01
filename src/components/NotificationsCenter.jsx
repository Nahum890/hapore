import { useEffect, useRef } from 'react';
import { useTranslation } from '../i18n/LanguageProvider.jsx';

function formatDateTime(value, language) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat(language === 'es' ? 'es-PY' : 'gn-PY', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export default function NotificationsCenter({ open, onClose, onOpenMessages, messageNotifications = [], upcomingMeetings = [] }) {
  const { t, language } = useTranslation();
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  return <dialog ref={dialogRef} className="notifications-dialog" aria-labelledby="notifications-title" onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="notifications-panel">
      <header className="notifications-heading"><div><span className="panel-eyebrow">{t('notifications.eyebrow')}</span><h2 id="notifications-title">{t('notifications.title')}</h2></div><button type="button" className="onboarding-close" aria-label={t('notifications.close')} onClick={onClose}>×</button></header>
      <section className="notifications-section" aria-labelledby="notifications-messages-title">
        <h3 id="notifications-messages-title">{t('notifications.messages')}</h3>
        {messageNotifications.length ? <ul className="notifications-list">
          {messageNotifications.map(item => <li key={item.classId}><button type="button" className="notification-message-item" onClick={() => { onClose(); onOpenMessages(); }}><span><strong>{item.title}</strong><small>{t('notifications.unreadMessages', { n: item.count })}</small></span><span className="notification-count">{item.count}</span></button></li>)}
        </ul> : <p className="field-help">{t('notifications.noMessages')}</p>}
        {messageNotifications.length > 0 && <button type="button" className="btn btn-secondary" onClick={() => { onClose(); onOpenMessages(); }}>{t('notifications.openMessages')}</button>}
      </section>
      <section className="notifications-section" aria-labelledby="notifications-meetings-title">
        <h3 id="notifications-meetings-title">{t('notifications.meetings')}</h3>
        {upcomingMeetings.length ? <ul className="notifications-list">
          {upcomingMeetings.map(item => <li key={item.id} className="notification-meeting-item"><div><strong>{item.title}</strong><small>{item.classTitle} · {formatDateTime(item.starts_at, language)}</small>{item.description && <p>{item.description}</p>}</div><a className="btn btn-primary" href={item.meet_url} target="_blank" rel="noreferrer">{t('notifications.joinMeet')}</a></li>)}
        </ul> : <p className="field-help">{t('notifications.noMeetings')}</p>}
      </section>
      <footer className="notifications-footer"><button type="button" className="btn btn-secondary" onClick={onClose}>{t('common.close')}</button></footer>
    </section>
  </dialog>;
}
