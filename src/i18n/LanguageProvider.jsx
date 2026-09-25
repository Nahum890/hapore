import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES, translate } from './messages.js';

export const LANGUAGE_STORAGE_KEY = 'pyfis:language';
const LanguageContext = createContext(null);

export function readLanguage() {
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return SUPPORTED_LANGUAGES.includes(stored) ? stored : DEFAULT_LANGUAGE;
  } catch { return DEFAULT_LANGUAGE; }
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(readLanguage);
  const setLanguage = useCallback((next) => {
    if (!SUPPORTED_LANGUAGES.includes(next)) return;
    setLanguageState(next);
    try { localStorage.setItem(LANGUAGE_STORAGE_KEY, next); } catch { /* Preference remains available for this session. */ }
  }, []);
  useEffect(() => {
    document.documentElement.lang = language === 'es' ? 'es' : 'gn-PY';
    document.documentElement.dataset.language = language;
    const sync = event => { if (event.key === LANGUAGE_STORAGE_KEY) setLanguageState(readLanguage()); };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, [language]);
  const value = useMemo(() => ({ language, setLanguage, t: key => translate(language, key) }), [language, setLanguage]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useTranslation debe usarse dentro de LanguageProvider');
  return context;
}
