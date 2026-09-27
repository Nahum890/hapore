import { useSyncExternalStore } from 'react';
import { getOnlineConsent, setOnlineConsent, subscribeOnlineConsent } from '../ai/onlineConsent.js';
import { useTranslation } from '../i18n/LanguageProvider.jsx';

export default function AIPrivacyNotice() {
  const { t } = useTranslation();
  const consent = useSyncExternalStore(subscribeOnlineConsent, getOnlineConsent, () => 'unset');
  return <aside className="ai-privacy-notice" aria-label={t('privacy.label')}>
    <div className="ai-privacy-copy">
      <strong>{t(consent === 'online' ? 'privacy.online' : consent === 'local' ? 'privacy.local' : 'privacy.unset')}</strong>
      <p>{t('privacy.text')}</p>
    </div>
    <div className="ai-privacy-actions">
      {consent !== 'online' && <button type="button" className="btn btn-primary" onClick={() => setOnlineConsent('online')}>{t('privacy.allow')}</button>}
      {consent !== 'local' && <button type="button" className="btn btn-secondary" onClick={() => setOnlineConsent('local')}>{t('privacy.localOnly')}</button>}
    </div>
  </aside>;
}
