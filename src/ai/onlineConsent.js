const SESSION_KEY = 'pyfis:gemini-consent:v1';
const EVENT_NAME = 'pyfis:gemini-consent-change';

export function getOnlineConsent() {
  // Node-based tests have no browser transport. In a browser, inability to
  // read sessionStorage is treated as no consent, so the request stays local.
  if (typeof window === 'undefined') return 'online';
  try {
    const value = window.sessionStorage.getItem(SESSION_KEY);
    return value === 'online' || value === 'local' ? value : 'unset';
  } catch {
    return 'unset';
  }
}

export function setOnlineConsent(value) {
  if (value !== 'online' && value !== 'local') return false;
  try {
    window.sessionStorage.setItem(SESSION_KEY, value);
    window.dispatchEvent(new Event(EVENT_NAME));
    return true;
  } catch {
    return false;
  }
}

export function subscribeOnlineConsent(callback) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(EVENT_NAME, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(EVENT_NAME, callback);
    window.removeEventListener('storage', callback);
  };
}

export function hasOnlineConsent() {
  return getOnlineConsent() === 'online';
}
