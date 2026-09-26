import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { createApiChatHandler } from '../src/server/apiChatHandler.js';

class Request extends EventEmitter {
  constructor(body, headers = {}) {
    super();
    this.method = 'POST';
    this.body = body;
    this.headers = headers;
    this.socket = { remoteAddress: '127.0.0.1' };
  }
}

class Response extends EventEmitter {
  constructor() {
    super();
    this.writableEnded = false;
    this.destroyed = false;
    this.headersSent = false;
    this.body = '';
  }
  writeHead(status, headers = {}) { this.statusCode = status; this.headers = headers; this.headersSent = true; }
  end(value = '') { this.body += value; this.writableEnded = true; }
  write(value) { this.body += value; return true; }
  flushHeaders() {}
}

const run = async (handler, body, headers) => {
  const req = new Request(body, headers);
  const res = new Response();
  await handler(req, res);
  return res;
};

test('el endpoint limita contexto y conserva idioma, sin reenviar campos ajenos', async () => {
  let geminiRequest;
  const handler = createApiChatHandler('secret-key', 'gemini-3.6-flash', {
    consumeQuota: () => true,
    fetch: async (url, options) => {
      geminiRequest = { url, options };
      return globalThis.Response.json({ candidates: [{ content: { parts: [{ text: 'Respuesta de Gemini' }] } }] });
    },
  });
  const result = await run(handler, { message: 'Explicame el alcance', stream: false, context: {
    message: 'Explicame el alcance', tipo: 'charla_libre', language: 'es', profile: { name: 'Dato privado' }, history: [],
  } });
  assert.equal(result.statusCode, 200);
  assert.equal(JSON.parse(result.body).text, 'Respuesta de Gemini');
  assert.equal(geminiRequest.options.headers['x-goog-api-key'], 'secret-key');
  const prompt = JSON.parse(geminiRequest.options.body).contents[0].parts[0].text;
  assert.match(prompt, /Idioma elegido: español/);
  assert.doesNotMatch(prompt, /Dato privado/);
  assert.doesNotMatch(JSON.stringify(JSON.parse(result.body)), /secret-key/);
});

test('el límite persistente de Supabase bloquea antes de llamar a Gemini', async () => {
  let geminiCalls = 0;
  const handler = createApiChatHandler('secret-key', 'gemini-3.6-flash', {
    supabaseUrl: 'https://school.supabase.co',
    supabaseAnonKey: 'public-anon-key',
    fetch: async url => {
      if (url.endsWith('/auth/v1/user')) return globalThis.Response.json({ id: 'verified-user' });
      if (url.endsWith('/rest/v1/rpc/consume_tutor_query')) return globalThis.Response.json([{ allowed: false, used: 15, remaining: 0 }]);
      geminiCalls += 1;
      return globalThis.Response.json({ candidates: [{ content: { parts: [{ text: 'No debería llegar aquí' }] } }] });
    },
  });
  const result = await run(handler, { message: 'Otra consulta', context: { message: 'Otra consulta', tipo: 'charla_libre' } }, { authorization: 'Bearer token-validado' });
  assert.equal(result.statusCode, 429);
  assert.equal(geminiCalls, 0);
  assert.match(result.body, /15 consultas/);
});

test('el endpoint rechaza consultas cuando el control de cuota deniega el acceso', async () => {
  let modelCalled = false;
  const handler = createApiChatHandler('secret-key', 'gemini-3.6-flash', {
    consumeQuota: () => false,
    fetch: async () => { modelCalled = true; return globalThis.Response.json({}); },
  });
  const result = await run(handler, { message: 'Consulta', context: { message: 'Consulta' } });
  assert.equal(result.statusCode, 429);
  assert.equal(modelCalled, false);
});
