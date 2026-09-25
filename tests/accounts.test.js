import test from 'node:test';
import assert from 'node:assert/strict';
import { generateUUID, getSession, login, logout, register } from '../src/auth/localAccounts.js';
import { readJSON, setActiveProfile, writeJSON } from '../src/utils/storage.js';

test('registro, roles, sesión y progreso independiente por cuenta', async () => {
  const data = new Map();
  globalThis.localStorage = {
    getItem: key => data.has(key) ? data.get(key) : null,
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: key => data.delete(key),
  };
  localStorage.setItem('guarania:xp', '35');
  const student = await register({ name: 'Ana', username: 'Ana_1', password: 'claveSegura1', role: 'alumno' });
  assert.equal(student.role, 'alumno');
  assert.equal(getSession().id, student.id);
  assert.equal(data.get('guarania:accounts:v1').includes('claveSegura1'), false);
  setActiveProfile(student.id);
  assert.equal(readJSON('guarania:xp', 0), 35);
  writeJSON('guarania:xp', 80);
  logout();
  assert.equal(getSession(), null);
  await assert.rejects(login({ username: 'Ana_1', password: 'incorrecta' }));
  const teacher = await register({ name: 'Luis', username: 'Luis_1', password: 'otraClaveSegura', role: 'maestro' });
  setActiveProfile(teacher.id);
  assert.equal(readJSON('guarania:xp', 0), 0);
  logout();
  assert.equal((await login({ username: 'ANA_1', password: 'claveSegura1' })).role, 'alumno');
  setActiveProfile(student.id);
  assert.equal(readJSON('guarania:xp', 0), 80);
  setActiveProfile(null);
  delete globalThis.localStorage;
});

test('registro funciona correctamente cuando crypto.randomUUID no es una función', async () => {
  const data = new Map();
  globalThis.localStorage = {
    getItem: key => data.has(key) ? data.get(key) : null,
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: key => data.delete(key),
  };

  const originalRandomUUID = crypto.randomUUID;
  try {
    crypto.randomUUID = undefined;
    assert.equal(typeof crypto.randomUUID, 'undefined');

    const account = await register({
      name: 'Usuario Sin UUID',
      username: 'sin_uuid',
      password: 'passwordSeguro123',
      role: 'alumno',
    });

    assert.ok(account.id);
    assert.match(account.id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    assert.equal(account.username, 'sin_uuid');
  } finally {
    crypto.randomUUID = originalRandomUUID;
    delete globalThis.localStorage;
  }
});

test('generateUUID y register no causan recursión infinita si crypto.randomUUID apunta a generateUUID', async () => {
  const data = new Map();
  globalThis.localStorage = {
    getItem: key => data.has(key) ? data.get(key) : null,
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: key => data.delete(key),
  };

  const originalRandomUUID = crypto.randomUUID;
  try {
    crypto.randomUUID = () => generateUUID();

    const id = generateUUID();
    assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);

    const account = await register({
      name: 'Sin Congelamiento',
      username: 'no_freeze',
      password: 'claveSinFreeze1',
      role: 'alumno',
    });
    assert.ok(account.id);
    assert.equal(account.username, 'no_freeze');
  } finally {
    crypto.randomUUID = originalRandomUUID;
    delete globalThis.localStorage;
  }
});

test('flujo de registro y login funciona en entornos móviles no seguros sin WebCrypto (HTTP LAN)', async () => {
  const data = new Map();
  globalThis.localStorage = {
    getItem: key => data.has(key) ? data.get(key) : null,
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: key => data.delete(key),
  };

  const subtleDesc = Object.getOwnPropertyDescriptor(Crypto.prototype, 'subtle');
  const origRandomUUID = crypto.randomUUID;
  try {
    Object.defineProperty(Crypto.prototype, 'subtle', { get: () => undefined, configurable: true });
    crypto.randomUUID = undefined;

    const user = await register({
      name: 'Móvil Local',
      username: 'movil_lan',
      password: 'claveMóvil_123',
      role: 'alumno',
    });

    assert.ok(user.id);
    assert.equal(user.username, 'movil_lan');

    // Verificar que el hash se almacenó con fallback 'fb:'
    const saved = JSON.parse(data.get('guarania:accounts:v1'));
    const savedUser = saved.find(u => u.username === 'movil_lan');
    assert.ok(savedUser.passwordHash.startsWith('fb:'));

    // Cerrar sesión y volver a ingresar
    logout();
    assert.equal(getSession(), null);

    // Contraseña incorrecta rechazada
    await assert.rejects(login({ username: 'movil_lan', password: 'incorrecta' }));

    // Contraseña correcta aceptada
    const logged = await login({ username: 'movil_lan', password: 'claveMóvil_123' });
    assert.equal(logged.id, user.id);
    assert.equal(getSession().id, user.id);
  } finally {
    if (subtleDesc) Object.defineProperty(Crypto.prototype, 'subtle', subtleDesc);
    crypto.randomUUID = origRandomUUID;
    delete globalThis.localStorage;
  }
});

test('generateUUID genera UUIDs válidos con o sin crypto.randomUUID y crypto.getRandomValues', () => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  // Con soporte nativo
  const id1 = generateUUID();
  assert.match(id1, uuidRegex);

  // Sin crypto.randomUUID
  const origRandomUUID = crypto.randomUUID;
  try {
    crypto.randomUUID = undefined;
    const id2 = generateUUID();
    assert.match(id2, uuidRegex);

    // Sin crypto.getRandomValues
    const origGetRandomValues = crypto.getRandomValues;
    try {
      crypto.getRandomValues = undefined;
      const id3 = generateUUID();
      assert.match(id3, uuidRegex);
    } finally {
      crypto.getRandomValues = origGetRandomValues;
    }
  } finally {
    crypto.randomUUID = origRandomUUID;
  }
});
