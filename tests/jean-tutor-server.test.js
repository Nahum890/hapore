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
  const handler = createApiChatHandler('secret-key', 'gemini-3.8-flash', {
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
  const handler = createApiChatHandler('secret-key', 'gemini-3.8-flash', {
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
  const handler = createApiChatHandler('secret-key', 'gemini-3.8-flash', {
    consumeQuota: () => false,
    fetch: async () => { modelCalled = true; return globalThis.Response.json({}); },
  });
  const result = await run(handler, { message: 'Consulta', context: { message: 'Consulta', tipo: 'charla_libre' } });
  assert.equal(result.statusCode, 429);
  assert.equal(modelCalled, false);
});

test('el cuestionario no consume cuota diaria, pero conserva la validación de sesión', async () => {
  let quotaCalls = 0;
  let auxCalls = 0;
  let geminiCalls = 0;
  const handler = createApiChatHandler('secret-key', 'gemini-3.8-flash', {
    supabaseUrl: 'https://school.supabase.co',
    supabaseAnonKey: 'public-anon-key',
    fetch: async (url, options) => {
      if (url.endsWith('/auth/v1/user')) return globalThis.Response.json({ id: 'verified-user' });
      if (url.endsWith('/rest/v1/rpc/consume_tutor_query')) { quotaCalls += 1; return globalThis.Response.json([{ allowed: false }]); }
      if (url.endsWith('/rest/v1/rpc/consume_tutor_quota')) {
        auxCalls += 1;
        assert.equal(JSON.parse(options.body).p_kind, 'aux');
        return globalThis.Response.json([{ allowed: true, used: 1, remaining: 79 }]);
      }
      geminiCalls += 1;
      return globalThis.Response.json({ candidates: [{ content: { parts: [{ text: 'Respuesta del cuestionario' }] } }] });
    },
  });
  const result = await run(handler, {
    message: '¿Por qué?',
    stream: false,
    context: { message: '¿Por qué?', tipo: 'evaluacion_cuestionario' },
  }, { authorization: 'Bearer token-validado' });

  assert.equal(result.statusCode, 200, JSON.stringify(result));
  assert.equal(quotaCalls, 0);
  assert.equal(auxCalls, 1, "descuenta de la cuota de ayudas, no de las 15 del chat");
  assert.equal(geminiCalls, 1);
});

test('pistas y diagnóstico también tienen tope: ya no llegan a Gemini sin límite', async () => {
  let geminiCalls = 0;
  const handler = createApiChatHandler('secret-key', 'gemini-3.8-flash', {
    consumeQuota: () => true,
    consumeAuxQuota: () => false,
    fetch: async () => { geminiCalls += 1; return globalThis.Response.json({ candidates: [{ content: { parts: [{ text: 'x' }] } }] }); },
  });
  const result = await run(handler, { message: 'Pista', context: { message: 'Pista' } });
  assert.equal(result.statusCode, 429);
  assert.equal(geminiCalls, 0);
});

test('una foto cuenta como consulta del chat aunque no diga tipo charla_libre', async () => {
  let chatCalls = 0;
  const handler = createApiChatHandler('secret-key', 'gemini-3.8-flash', {
    consumeQuota: () => { chatCalls += 1; return false; },
    consumeAuxQuota: () => true,
    fetch: async () => globalThis.Response.json({ candidates: [{ content: { parts: [{ text: 'x' }] } }] }),
  });
  const result = await run(handler, { message: 'Foto', image: { mimeType: 'image/png', data: 'iVBORw0KGgo=' }, context: { message: 'Foto' } });
  assert.equal(result.statusCode, 429);
  assert.equal(chatCalls, 1);
});

test('el tope por red frena a quien rota sesiones anónimas', async () => {
  let geminiCalls = 0;
  const handler = createApiChatHandler('secret-key', 'gemini-3.8-flash', {
    consumeQuota: () => true,
    addressGuard: () => false,
    fetch: async () => { geminiCalls += 1; return globalThis.Response.json({}); },
  });
  const result = await run(handler, { message: 'Hola', context: { message: 'Hola', tipo: 'charla_libre' } });
  assert.equal(result.statusCode, 429);
  assert.equal(geminiCalls, 0);
});

test('una página de otro sitio no puede gastar la cuota con un POST simple', async () => {
  let geminiCalls = 0;
  const handler = createApiChatHandler('secret-key', 'gemini-3.8-flash', {
    consumeQuota: () => true,
    fetch: async () => { geminiCalls += 1; return globalThis.Response.json({ candidates: [{ content: { parts: [{ text: 'x' }] } }] }); },
  });
  const body = { message: 'Hola', stream: false, context: { message: 'Hola', tipo: 'charla_libre' } };
  const foreign = await run(handler, body, { origin: 'https://sitio-malicioso.example', host: 'pyfisia.vercel.app' });
  assert.equal(foreign.statusCode, 403);
  const same = await run(handler, body, { origin: 'https://pyfisia.vercel.app', host: 'pyfisia.vercel.app' });
  assert.equal(same.statusCode, 200);
  assert.equal(geminiCalls, 1);
});

test('una imagen tiene que tener bytes de imagen de verdad', async () => {
  let geminiCalls = 0;
  const handler = createApiChatHandler('secret-key', 'gemini-3.8-flash', {
    consumeQuota: () => true,
    fetch: async () => { geminiCalls += 1; return globalThis.Response.json({ candidates: [{ content: { parts: [{ text: 'x' }] } }] }); },
  });
  for (const image of [{ mimeType: 'image/png', data: '====' }, { mimeType: 'image/png', data: 'QUJDREVGRw==' }, { mimeType: 'image/jpeg', data: 'iVBORw0KGgo=' }]) {
    const result = await run(handler, { message: 'Foto', image, context: { message: 'Foto' } });
    assert.equal(result.statusCode, 400, JSON.stringify(image));
  }
  assert.equal(geminiCalls, 0);
});

test('fuera de Vercel no se confía en cabeceras de IP inventadas para los límites', async () => {
  const seen = [];
  const handler = createApiChatHandler('secret-key', 'gemini-3.8-flash', {
    trustProxy: false,
    consumeQuota: address => { seen.push(address); return true; },
    fetch: async () => globalThis.Response.json({ candidates: [{ content: { parts: [{ text: 'x' }] } }] }),
  });
  await run(handler, { message: 'Hola', stream: false, context: { message: 'Hola', tipo: 'charla_libre' } }, { 'x-real-ip': '203.0.113.9', 'x-forwarded-for': '198.51.100.1' });
  assert.deepEqual(seen, ['127.0.0.1']);
});

test('un cliente que manda el cuerpo de a poco (slowloris) recibe 408 al vencer el tiempo', async () => {
  const handler = createApiChatHandler('secret-key', 'gemini-3.8-flash', { consumeQuota: () => true, timeoutMs: 30, fetch: async () => globalThis.Response.json({}) });
  const req = new Request(undefined);
  delete req.body;
  let destroyed = false;
  req.destroy = () => { destroyed = true; };
  req[Symbol.asyncIterator] = () => ({ next: () => new Promise(() => {}) }); // nunca termina de llegar
  const res = new Response();
  const started = Date.now();
  await handler(req, res);
  assert.equal(res.statusCode, 408);
  assert.ok(Date.now() - started < 2000);
  assert.equal(destroyed, true);
});
