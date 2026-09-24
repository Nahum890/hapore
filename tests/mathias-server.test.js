import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { EventEmitter } from 'node:events';
import { apiChatPlugin } from '../vite.config.js';

async function callApi(body, fetchModel) {
  let handler;
  apiChatPlugin('test-key', 'test-model', { fetch: fetchModel }).configureServer({
    middlewares: { use(_path, callback) { handler = callback; } },
  });
  const req = Readable.from([JSON.stringify(body)]);
  req.method = 'POST';
  const res = new EventEmitter();
  res.headersSent = false;
  res.writableEnded = false;
  res.destroyed = false;
  res.output = '';
  res.writeHead = (status, headers) => { res.status = status; res.headers = headers; res.headersSent = true; };
  res.flushHeaders = () => {};
  res.write = chunk => { res.output += chunk; };
  res.end = (chunk = '') => { res.output += chunk; res.writableEnded = true; };
  await handler(req, res);
  return res;
}

test('el servidor transmite respuesta parcial y conserva el contexto pedagógico', async () => {
  let upstreamPayload, upstreamUrl;
  const fetchModel = async (url, options) => {
    upstreamUrl = url;
    upstreamPayload = JSON.parse(options.body);
    const encoder = new TextEncoder();
    return new Response(new ReadableStream({ start(controller) {
      controller.enqueue(encoder.encode('data: {"candidates":[{"content":{"parts":[{"text":"La "}]}}]}\n\n'));
      controller.enqueue(encoder.encode('data: {"candidates":[{"content":{"parts":[{"text":"gravedad"}]}}]}\n\n'));
      controller.close();
    } }), { headers: { 'content-type': 'text/event-stream' } });
  };
  const res = await callApi({ stream: true, context: { tipo: 'charla_libre', message: '¿Por qué cae?', subtema: 'Fuerzas' } }, fetchModel);
  assert.equal(res.status, 200);
  assert.match(res.headers['Content-Type'], /text\/event-stream/);
  assert.match(upstreamUrl, /streamGenerateContent\?alt=sse/);
  assert.match(JSON.stringify(upstreamPayload), /Por qué cae/);
  assert.match(JSON.stringify(upstreamPayload), /Fuerzas/);
  assert.match(res.output, /"text":"La gravedad"/);
  assert.match(res.output, /data: \[DONE\]/);
});

test('el servidor rechaza contexto inválido antes de contactar al modelo', async () => {
  let called = false;
  const res = await callApi({ stream: true }, async () => { called = true; });
  assert.equal(res.status, 400);
  assert.equal(called, false);
});
