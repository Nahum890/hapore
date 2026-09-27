// Clave de traducción para la etiqueta "de dónde viene la respuesta" del
// tutor. Única fuente para el chat, el cuestionario y la tarjeta lateral.
export function tutorSourceKey(entry = {}) {
  if (entry.source === 'gemini') return 'tutor.src.gemini';
  if (entry.source === 'local-model') return 'tutor.src.localModel';
  if (entry.source !== 'rules') return null;
  if (entry.reason === 'offline') return 'tutor.src.offline';
  if (['consent-required', 'local-only'].includes(entry.reason)) return 'tutor.src.noConsent';
  if (entry.reason === 'rate-limited') return 'tutor.src.rateLimit';
  if (entry.reason === 'timeout') return 'tutor.src.timeout';
  if (entry.reason === 'online-fallback') return 'tutor.src.fallback';
  return 'tutor.src.local';
}
