import { test } from 'node:test';
import assert from 'node:assert/strict';
import { configureCloud } from '../src/cloud/cloudClient.js';
import {
  GROUP, cacheMessages, conversationOf, getCachedMessages, lessonPayload, markRead, getReadMarks,
  mergeMessages, sendMessage, unreadCounts, validateMessage,
} from '../src/cloud/chatCloud.js';
import { whatsappLink } from '../src/utils/contact.js';
import { removeKey, setActiveProfile, writeJSON } from '../src/utils/storage.js';

const ME = 'me', PROFE = 'profe', ANA = 'ana';
const msg = (id, sender, recipient = null, kind = 'text') => ({ id, class_id: 'c1', sender_id: sender, recipient_id: recipient, kind, body: `m${id}`, payload: kind === 'image' ? { dataUrl: 'data:image/jpeg;base64,AA' } : null });

test('cada mensaje cae en su conversación: grupo o la otra persona', () => {
  assert.equal(conversationOf(msg(1, PROFE), ME), GROUP);
  assert.equal(conversationOf(msg(2, ME, ANA), ME), ANA);
  assert.equal(conversationOf(msg(3, ANA, ME), ME), ANA);
});

test('los no leídos se cuentan por conversación y nunca los propios', () => {
  const list = [msg(1, PROFE), msg(2, ME), msg(3, ANA, ME), msg(4, ANA, ME)];
  assert.deepEqual(unreadCounts(list, ME, {}), { [GROUP]: 1, [ANA]: 2 });
  assert.deepEqual(unreadCounts(list, ME, { [ANA]: 3, [GROUP]: 1 }), { [ANA]: 1 });
});

test('solo se aceptan mensajes completos; texto vacío o muy largo se rechaza', () => {
  assert.throws(() => validateMessage({ body: '   ' }), /Escribí/);
  assert.throws(() => validateMessage({ body: 'x'.repeat(2001) }), /largo/);
  assert.throws(() => validateMessage({ kind: 'image', payload: { dataUrl: 'javascript:alert(1)' } }), /imagen/);
  assert.throws(() => validateMessage({ kind: 'lesson', payload: { lesson: { slides: [] } } }), /diapositivas/);
  assert.throws(() => validateMessage({ kind: 'video', body: 'hola' }), /desconocido/);
  assert.deepEqual(validateMessage({ body: ' hola ', payload: { ignorado: true } }), { kind: 'text', body: 'hola', payload: null });
});

test('una clase enviada lleva los ejercicios propios que usa', () => {
  const lesson = { id: 'l1', title: 'Tiro', description: '', createdAt: 'x', slides: [{ id: 's1', type: 'ejercicio', exerciseId: 'custom-1' }, { id: 's2', type: 'ejercicio', exerciseId: 'dron-01' }] };
  const payload = lessonPayload(lesson, [{ id: 'custom-1', custom: true }, { id: 'custom-2', custom: true }, { id: 'dron-01' }]);
  assert.deepEqual(payload.exercises.map(item => item.id), ['custom-1']);
  assert.equal(payload.lesson.slides.length, 2);
  assert.ok(!('createdAt' in payload.lesson));
});

test('enviar un mensaje privado usa la tabla messages con el destinatario', async () => {
  setActiveProfile('chat-test');
  writeJSON('guarania:cloudSession', { accessToken: 'tok', refreshToken: 'r', expiresAt: 9999999999, userId: ME });
  const calls = [];
  configureCloud({
    url: 'https://demo.supabase.co', key: 'anon',
    fetch: async (url, options) => {
      calls.push({ url, options, body: JSON.parse(options.body) });
      return new Response(JSON.stringify([{ id: 7, ...JSON.parse(options.body), sender_id: ME }]), { status: 201 });
    },
  });
  const saved = await sendMessage({ classId: 'c1', recipientId: ANA, body: 'Hola Ana' });
  assert.equal(saved.id, 7);
  assert.match(calls[0].url, /\/rest\/v1\/messages$/);
  assert.deepEqual(calls[0].body, { class_id: 'c1', recipient_id: ANA, kind: 'text', body: 'Hola Ana', payload: null });
  assert.equal(calls[0].options.headers.Authorization, 'Bearer tok');
  configureCloud({ url: '', key: '' });
  removeKey('guarania:cloudSession');
  setActiveProfile(null);
});

test('el historial guardado sin conexión conserva solo las últimas imágenes', () => {
  setActiveProfile('chat-cache');
  const list = mergeMessages([msg(2, PROFE, null, 'image')], [msg(1, PROFE, null, 'image'), msg(3, PROFE, null, 'image'), msg(4, ANA)]);
  assert.deepEqual(list.map(item => item.id), [1, 2, 3, 4]);
  cacheMessages('c1', list, 2);
  const cached = getCachedMessages('c1');
  assert.equal(cached[0].payload, null, 'la imagen más vieja se guarda sin contenido');
  assert.ok(cached[1].payload.dataUrl);
  markRead('c1', GROUP, 3);
  markRead('c1', GROUP, 2);
  assert.equal(getReadMarks('c1')[GROUP], 3, 'marcar leído nunca retrocede');
  removeKey('guarania:chatCache'); removeKey('guarania:chatRead');
  setActiveProfile(null);
});

test('WhatsApp: los números paraguayos con 0 pasan a +595', () => {
  assert.equal(whatsappLink('0981 123 456'), 'https://wa.me/595981123456');
  assert.equal(whatsappLink('+54 11 5555 1234'), 'https://wa.me/541155551234');
  assert.equal(whatsappLink(''), null);
});
