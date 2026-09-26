import { test } from 'node:test';
import assert from 'node:assert/strict';
import LocalAIProvider from '../src/ai/LocalAIProvider.js';
import { setOnlineConsent } from '../src/ai/onlineConsent.js';

test('Gemini no recibe preguntas antes del consentimiento y la elección online sí habilita la API', async () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const values = new Map();
  let sent = 0;
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      sessionStorage: { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) },
      dispatchEvent: () => true,
      addEventListener: () => {},
      removeEventListener: () => {},
    },
  });
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { onLine: true } });
  try {
    const provider = new LocalAIProvider({
      fetch: async () => { sent += 1; return globalThis.Response.json({ text: 'Respuesta online' }); },
    });
    const local = await provider.respond({ tipo: 'charla_libre', message: '¿Qué es el alcance?' });
    assert.equal(sent, 0);
    assert.equal(local.source, 'rules');
    assert.equal(local.reason, 'consent-required');

    setOnlineConsent('online');
    const online = await provider.respond({ tipo: 'charla_libre', message: '¿Qué es el alcance?' });
    assert.equal(sent, 1);
    assert.equal(online.source, 'gemini');
  } finally {
    if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow); else delete globalThis.window;
    if (originalNavigator) Object.defineProperty(globalThis, 'navigator', originalNavigator); else delete globalThis.navigator;
  }
});
