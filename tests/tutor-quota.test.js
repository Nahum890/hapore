import { test } from 'node:test';
import assert from 'node:assert/strict';
import LocalAIProvider from '../src/ai/LocalAIProvider.js';
import { buildFreeChatPrompt } from '../src/ai/prompt.js';
import { DAILY_TUTOR_LIMIT, getTutorQuota, recordTutorQuery } from '../src/ai/tutorQuota.js';
import { removeKey, setActiveProfile, STORAGE_KEYS } from '../src/utils/storage.js';

function useOnlineState(onLine, run) {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { onLine } });
  return Promise.resolve().then(run).finally(() => {
    if (descriptor) Object.defineProperty(globalThis, 'navigator', descriptor);
    else delete globalThis.navigator;
  });
}

test('el límite diario es 15 y queda aislado por perfil', () => {
  setActiveProfile('quota-test-jean');
  removeKey(STORAGE_KEYS.TUTOR_USAGE);
  assert.equal(getTutorQuota().remaining, DAILY_TUTOR_LIMIT);
  for (let index = 0; index < DAILY_TUTOR_LIMIT; index += 1) recordTutorQuery();
  assert.equal(getTutorQuota().remaining, 0);
  setActiveProfile('quota-test-nahum');
  removeKey(STORAGE_KEYS.TUTOR_USAGE);
  assert.equal(getTutorQuota().remaining, DAILY_TUTOR_LIMIT);
  setActiveProfile(null);
});

test('un error del servicio online cae al chatbot local, etiquetado como tal', async () => {
  // Decisión de producto actualizada: si Gemini falla por cualquier motivo
  // estando "online" (sin servidor, sin credencial, red rota), el alumno
  // debe seguir recibiendo respuesta del tutor local en vez de un error sin
  // salida; nunca se presenta esa respuesta como si viniera de Gemini.
  setActiveProfile('quota-test-online-error');
  removeKey(STORAGE_KEYS.TUTOR_USAGE);
  let fallbackCalls = 0;
  const provider = new LocalAIProvider({
    maxRetries: 0,
    fallback: { async respond() { fallbackCalls += 1; return { message: 'respuesta local', available: true }; } },
    fetch: async () => { throw new TypeError('Failed to fetch'); },
  });
  const result = await useOnlineState(true, () => provider.respond({ tipo: 'charla_libre', message: '¿Qué es la aceleración?' }));
  assert.equal(result.available, true);
  assert.equal(result.source, 'rules');
  assert.equal(result.message, 'respuesta local');
  assert.equal(fallbackCalls, 1);
});

test('si Gemini y el tutor local fallan los dos, recién ahí se muestra el error online', async () => {
  setActiveProfile('quota-test-online-error-2');
  removeKey(STORAGE_KEYS.TUTOR_USAGE);
  const provider = new LocalAIProvider({
    maxRetries: 0,
    fallback: { async respond() { return { message: '', available: false }; } },
    fetch: async () => { throw new TypeError('Failed to fetch'); },
  });
  const result = await useOnlineState(true, () => provider.respond({ tipo: 'charla_libre', message: '¿Qué es la aceleración?' }));
  assert.equal(result.available, false);
  assert.match(result.message, /Gemini/);
});

test('el tutor local responde y consume una consulta solo sin conexión', async () => {
  setActiveProfile('quota-test-offline');
  removeKey(STORAGE_KEYS.TUTOR_USAGE);
  const provider = new LocalAIProvider({
    fallback: { async respond() { return { message: 'Respuesta local.', available: true }; } },
    fetch: async () => { throw new Error('No debe consultar Gemini'); },
  });
  const result = await useOnlineState(false, () => provider.respond({ tipo: 'charla_libre', message: '¿Qué es la velocidad?' }));
  assert.equal(result.source, 'rules');
  assert.equal(result.available, true);
  assert.equal(getTutorQuota().remaining, DAILY_TUTOR_LIMIT - 1);
});

test('el prompt mantiene contexto breve y permite respuestas completas en jopara', () => {
  const prompt = buildFreeChatPrompt({
    message: 'Explicame completo el movimiento parabólico',
    history: [{ role: 'tutor', text: 'Hablamos de la trayectoria.' }, { role: 'alumno', text: 'Sí' }],
  });
  assert.match(prompt, /Hablamos de la trayectoria/);
  assert.match(prompt, /“sí”/);
  assert.match(prompt, /respondé de forma completa y ordenada/);
  assert.match(prompt, /sugerí exactamente una pregunta relacionada/);
});
