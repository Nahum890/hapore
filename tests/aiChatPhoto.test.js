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

const TINY_IMAGE = { mimeType: 'image/jpeg', data: 'QUJDREVGRw==' }; // "ABCDEFG" en base64

test('una foto válida se manda a Gemini como inlineData junto con el texto', async () => {
  let upstreamPayload;
  const fetchModel = async (_url, options) => {
    upstreamPayload = JSON.parse(options.body);
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'Leo la foto: v0 = 20 m/s...' }] } }] }), { status: 200 });
  };
  const res = await callApi({ image: TINY_IMAGE, context: { message: 'Ayuda con esta foto' } }, fetchModel);
  assert.equal(res.status, 200);
  const parts = upstreamPayload.contents[0].parts;
  assert.deepEqual(parts[0].inlineData, TINY_IMAGE);
  assert.match(parts[1].text, /transcribí en una lista corta/);
});

test('una foto con un mimeType no permitido se rechaza antes de llamar a Gemini', async () => {
  let called = false;
  const res = await callApi({ image: { mimeType: 'application/pdf', data: 'QUJD' }, context: { message: 'hola' } }, async () => { called = true; });
  assert.equal(res.status, 400);
  assert.equal(called, false);
});

test('una foto que pesa más de lo permitido se rechaza', async () => {
  const res = await callApi({ image: { mimeType: 'image/jpeg', data: 'A'.repeat(900_001) }, context: { message: 'hola' } }, async () => {});
  assert.equal(res.status, 400);
});

test('sin foto, un cuerpo grande sigue rechazándose con el límite normal', async () => {
  const res = await callApi({ context: { message: 'x'.repeat(20_000) } }, async () => {});
  assert.equal(res.status, 413);
});
