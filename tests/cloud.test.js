import { test } from 'node:test';
import assert from 'node:assert/strict';
import { configureCloud, isCloudConfigured, getCloudSession } from '../src/cloud/cloudClient.js';
import {
  CLOUD_CODE_PATTERN, buildClassContent, downloadClass, flushProgress, getClassPackage, getPendingProgress,
  leaveCloudClass, progressSnapshot, queueProgress,
} from '../src/cloud/classCloud.js';
import { removeKey, setActiveProfile, writeJSON } from '../src/utils/storage.js';

function useOnline(onLine, run) {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { onLine } });
  return Promise.resolve().then(run).finally(() => {
    if (descriptor) Object.defineProperty(globalThis, 'navigator', descriptor); else delete globalThis.navigator;
  });
}

function fakeSupabase() {
  const calls = [];
  let signups = 0;
  const fetch = async (url, options) => {
    const path = url.replace('https://demo.supabase.co', '');
    const body = options.body ? JSON.parse(options.body) : undefined;
    calls.push({ path, method: options.method, body, auth: options.headers.Authorization });
    const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
    if (path === '/auth/v1/signup') { signups += 1; return json({ access_token: `tok-${signups}`, refresh_token: `ref-${signups}`, expires_in: 3600, user: { id: 'student-uid' } }); }
    if (path.startsWith('/auth/v1/token')) return json({ access_token: 'tok-refreshed', refresh_token: 'ref-2', expires_in: 3600, user: { id: 'student-uid' } });
    if (path === '/rest/v1/rpc/join_class') {
      if (body.p_code !== 'K7PQ2M') return json({ message: 'Código de clase inexistente.' }, 400);
      return json([{ class_id: 'class-1', code: 'K7PQ2M', title: '3.º B', teacher_name: 'Profe Rosa', teacher_avatar: 'sol', content: { version: 1, config: { subtemas: ['dron'], ejercicios: 2, flashcards: 5 }, cards: [{ id: 'custom-card-a', frente_es: '¿vx cambia?', dorso_concepto: 'No', custom: true }], exercises: [] } }]);
    }
    if (path.startsWith('/rest/v1/class_members')) return new Response(null, { status: 204 });
    return json({ message: 'no encontrado' }, 404);
  };
  return { calls, fetch };
}

test('sin variables de entorno la nube queda desactivada y la app sigue local', () => {
  assert.equal(isCloudConfigured(), false);
});

test('descargar una clase la guarda para usarla sin internet', async () => {
  setActiveProfile('cloud-student'); removeKey('guarania:cloudSession'); removeKey('guarania:classPackage'); removeKey('guarania:cloudPendingProgress');
  const server = fakeSupabase();
  configureCloud({ url: 'https://demo.supabase.co/', key: 'anon-key', fetch: server.fetch });
  assert.equal(isCloudConfigured(), true);

  const pkg = await useOnline(true, () => downloadClass({ code: 'k7pq-2m', displayName: 'Ana', avatar: 'rio' }));
  assert.equal(pkg.classId, 'class-1');
  assert.equal(getClassPackage().teacherName, 'Profe Rosa');
  assert.equal(getClassPackage().content.cards[0].id, 'custom-card-a');
  const join = server.calls.find(call => call.path === '/rest/v1/rpc/join_class');
  assert.equal(join.body.p_code, 'K7PQ2M');
  assert.equal(join.auth, 'Bearer tok-1', 'usa el token de la sesión, no la clave pública');

  await assert.rejects(() => useOnline(true, () => downloadClass({ code: 'ZZZZZZ', displayName: 'Ana' })), /inexistente/);
  setActiveProfile(null);
});

test('el avance sin conexión queda pendiente y se sube al volver internet', async () => {
  setActiveProfile('cloud-student');
  const server = fakeSupabase();
  configureCloud({ fetch: server.fetch });
  const learning = { xp: 125, level: { level: 2 }, attempts: 4, confidence: 40, attemptLog: [{ correct: true }, { correct: false }, { correct: true }], flashcardState: { a: { consolidated: true }, b: { consolidated: false } } };
  const snapshot = progressSnapshot(learning);
  assert.deepEqual(snapshot, { xp: 125, level: 2, attempts: 4, correct: 2, confidence: 40, cards_consolidated: 1 });

  queueProgress(snapshot);
  const offline = await useOnline(false, () => flushProgress());
  assert.equal(offline.status, 'offline');
  assert.ok(getPendingProgress(), 'sigue pendiente sin internet');
  assert.equal(server.calls.length, 0, 'sin internet no se intenta la red');

  const online = await useOnline(true, () => flushProgress());
  assert.equal(online.status, 'synced');
  assert.equal(getPendingProgress(), null);
  const patch = server.calls.find(call => call.method === 'PATCH');
  assert.match(patch.path, /class_members\?class_id=eq\.class-1&student_id=eq\.student-uid/);
  assert.equal(patch.body.xp, 125);
  assert.ok(patch.body.last_sync);
  setActiveProfile(null);
});

test('una sesión vencida se renueva en vez de crear otra identidad', async () => {
  setActiveProfile('cloud-refresh');
  const server = fakeSupabase();
  configureCloud({ fetch: server.fetch });
  writeJSON('guarania:cloudSession', { accessToken: 'old', refreshToken: 'ref-old', expiresAt: 10, userId: 'student-uid' });
  const session = await useOnline(true, () => getCloudSession());
  assert.equal(session.accessToken, 'tok-refreshed');
  assert.equal(server.calls.filter(call => call.path === '/auth/v1/signup').length, 0);
  setActiveProfile(null);
});

test('si la nube rechaza la sesión guardada (401), se crea una nueva y se reintenta una vez', async () => {
  setActiveProfile('cloud-401'); removeKey('guarania:cloudSession');
  writeJSON('guarania:cloudSession', { accessToken: 'revocado', refreshToken: 'x', expiresAt: 9999999999, userId: 'viejo' });
  const seen = [];
  configureCloud({
    fetch: async (url, options) => {
      const path = url.replace('https://demo.supabase.co', '');
      seen.push({ path, auth: options.headers.Authorization });
      if (path === '/auth/v1/signup') return new Response(JSON.stringify({ access_token: 'nuevo', refresh_token: 'r', expires_in: 3600, user: { id: 'nuevo-uid' } }), { status: 200 });
      if (options.headers.Authorization === 'Bearer revocado') return new Response(JSON.stringify({ message: 'JWT inválido' }), { status: 401 });
      return new Response('[]', { status: 200 });
    },
  });
  const { listTeacherClasses } = await import('../src/cloud/classCloud.js');
  const rows = await useOnline(true, () => listTeacherClasses());
  assert.deepEqual(rows, []);
  const lastList = seen.filter(call => call.path.startsWith('/rest/v1/classes')).at(-1);
  assert.equal(lastList.auth, 'Bearer nuevo');
  assert.match(lastList.path, /teacher_id=eq\.nuevo-uid/, 'la ruta se reconstruye con la sesión nueva');
  setActiveProfile(null);
});

test('salir de la clase borra el paquete y el avance pendiente de este dispositivo', async () => {
  setActiveProfile('cloud-student');
  configureCloud({ fetch: fakeSupabase().fetch });
  queueProgress({ xp: 1, level: 1, attempts: 0, correct: 0, confidence: 0, cards_consolidated: 0 });
  await useOnline(true, () => leaveCloudClass());
  assert.equal(getClassPackage(), null);
  assert.equal(getPendingProgress(), null);
  setActiveProfile(null);
});

test('el contenido compartido lleva solo las tarjetas elegidas y los ejercicios propios', () => {
  const content = buildClassContent({
    config: { subtemas: ['dron', 'wall'], ejercicios: '3' },
    cards: [{ id: 'fc-01', frente_es: 'A', dorso_concepto: 'B', formula: 'f' }, { id: 'custom-card-x', frente_es: 'C', dorso_concepto: 'D', custom: true }],
    exercises: [{ id: 'custom-1', scenario: 'dron' }],
  });
  assert.deepEqual(content.config, { subtemas: ['dron', 'wall'], ejercicios: 3, flashcards: 2 });
  assert.equal(content.cards.length, 2);
  assert.equal(content.cards[1].custom, true);
  assert.equal(content.exercises[0].id, 'custom-1');
  assert.ok(CLOUD_CODE_PATTERN.test('K7PQ2M'));
  assert.ok(!CLOUD_CODE_PATTERN.test('GP10H03'), 'los códigos locales viejos no se confunden con los de la nube');
});
