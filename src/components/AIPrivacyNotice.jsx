import { useSyncExternalStore } from 'react';
import { getOnlineConsent, setOnlineConsent, subscribeOnlineConsent } from '../ai/onlineConsent.js';

export default function AIPrivacyNotice() {
  const consent = useSyncExternalStore(subscribeOnlineConsent, getOnlineConsent, () => 'unset');
  return <aside className="ai-privacy-notice" aria-label="Privacidad del tutor con Gemini">
    <div className="ai-privacy-copy">
      <strong>{consent === 'online' ? 'Gemini online está habilitado en esta pestaña' : consent === 'local' ? 'Estás usando el tutor local' : 'Elegí cómo querés usar el tutor'}</strong>
      <p>Con Gemini se envía tu pregunta y hasta los últimos 4 mensajes de esta conversación a Google para generar la respuesta. No incluyas tu nombre, escuela ni otros datos personales. La elección dura hasta que cierres esta pestaña.</p>
    </div>
    <div className="ai-privacy-actions">
      {consent !== 'online' && <button type="button" className="btn btn-primary" onClick={() => setOnlineConsent('online')}>Permitir Gemini online</button>}
      {consent !== 'local' && <button type="button" className="btn btn-secondary" onClick={() => setOnlineConsent('local')}>Seguir solo con tutor local</button>}
    </div>
  </aside>;
}
