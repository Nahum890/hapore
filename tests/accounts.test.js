import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { generateUUID, getSession, login, logout, register } from '../src/auth/localAccounts.js';
import { readJSON, setActiveProfile, writeJSON } from '../src/utils/storage.js';

function installMemoryStorage() {
  const data = new Map();
  globalThis.localStorage = {
    getItem: key => data.has(key) ? data.get(key) : null,
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: key => data.delete(key),
  };
  return data;
}

function makePassword() {
  return Array.from(crypto.getRandomValues(new Uint8Array(24)), byte => byte.toString(16).padStart(2, '0')).join('');
}

function makeContact(label, suffix) {
  return {
    phone: ['+1', '202', '555', suffix].join(' '),
    email: `${label}@example.invalid`,
  };
}

afterEach(() => {
  delete globalThis.localStorage;
});

test('registro, roles, sesión y progreso independiente por cuenta', async () => {
  const data = installMemoryStorage();
  const studentPassword = makePassword();
  const teacherPassword = makePassword();
  localStorage.setItem('guarania:xp', '35');

  const student = await register({ name: 'Estudiante de prueba', username: 'estudiante_1', password: studentPassword, role: 'alumno', ...makeContact('student', '0101') });
  assert.equal(student.role, 'alumno');
  assert.equal(getSession().id, student.id);
  assert.equal(data.get('guarania:accounts:v1').includes(studentPassword), false);
  setActiveProfile(student.id);
  assert.equal(readJSON('guarania:xp', 0), 35);
  writeJSON('guarania:xp', 80);
  logout();
  assert.equal(getSession(), null);
  await assert.rejects(login({ username: 'estudiante_1', password: makePassword() }));

  const teacher = await register({ name: 'Docente de prueba', username: 'docente_1', password: teacherPassword, role: 'maestro', ...makeContact('teacher', '0102') });
  setActiveProfile(teacher.id);
  assert.equal(readJSON('guarania:xp', 0), 0);
  logout();
  assert.equal((await login({ username: 'ESTUDIANTE_1', password: studentPassword })).role, 'alumno');
  setActiveProfile(student.id);
  assert.equal(readJSON('guarania:xp', 0), 80);
  setActiveProfile(null);
});

test('registro funciona correctamente cuando crypto.randomUUID no es una función', async () => {
  installMemoryStorage();
  const password = makePassword();
  const originalRandomUUID = crypto.randomUUID;
  try {
    crypto.randomUUID = undefined;
    assert.equal(typeof crypto.randomUUID, 'undefined');

    const account = await register({ name: 'Usuario de prueba', username: 'sin_uuid', password, role: 'alumno', ...makeContact('no-uuid', '0103') });
    assert.ok(account.id);
    assert.match(account.id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    assert.equal(account.username, 'sin_uuid');
  } finally {
    crypto.randomUUID = originalRandomUUID;
  }
});

test('generateUUID y register no causan recursión infinita si crypto.randomUUID apunta a generateUUID', async () => {
  installMemoryStorage();
  const password = makePassword();
  const originalRandomUUID = crypto.randomUUID;
  try {
    crypto.randomUUID = () => generateUUID();

    const id = generateUUID();
    assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);

    const account = await register({ name: 'Usuario de prueba', username: 'sin_recursion', password, role: 'alumno', ...makeContact('no-recursion', '0104') });
    assert.ok(account.id);
    assert.equal(account.username, 'sin_recursion');
  } finally {
    crypto.randomUUID = originalRandomUUID;
  }
});

test('flujo de registro y login funciona en entornos móviles no seguros sin WebCrypto (HTTP LAN)', async () => {
  const data = installMemoryStorage();
  const password = makePassword();
  const subtleDesc = Object.getOwnPropertyDescriptor(Crypto.prototype, 'subtle');
  const originalRandomUUID = crypto.randomUUID;
  try {
    Object.defineProperty(Crypto.prototype, 'subtle', { get: () => undefined, configurable: true });
    crypto.randomUUID = undefined;

    const user = await register({ name: 'Usuario móvil de prueba', username: 'movil_lan', password, role: 'alumno', ...makeContact('mobile', '0105') });
    assert.ok(user.id);
    assert.equal(user.username, 'movil_lan');

    const saved = JSON.parse(data.get('guarania:accounts:v1'));
    const savedUser = saved.find(account => account.username === 'movil_lan');
    assert.ok(savedUser.passwordHash.startsWith('fb2:'));

    logout();
    assert.equal(getSession(), null);
    await assert.rejects(login({ username: 'movil_lan', password: makePassword() }));
    const logged = await login({ username: 'movil_lan', password });
    assert.equal(logged.id, user.id);
    assert.equal(getSession().id, user.id);
  } finally {
    if (subtleDesc) Object.defineProperty(Crypto.prototype, 'subtle', subtleDesc);
    crypto.randomUUID = originalRandomUUID;
  }
});

test('el registro no crea contraseñas con una sal pseudoaleatoria', async () => {
  const data = installMemoryStorage();
  const password = makePassword();
  const originalRandom = crypto.getRandomValues;
  try {
    crypto.getRandomValues = undefined;
    await assert.rejects(register({ name: 'Cuenta de prueba', username: 'cuenta_local', password, role: 'alumno', ...makeContact('local-account', '0106') }), /aleatoriedad segura/i);
    assert.equal(data.has('guarania:accounts:v1'), false);
  } finally {
    crypto.getRandomValues = originalRandom;
  }
});

test('generateUUID genera UUIDs válidos con o sin crypto.randomUUID y crypto.getRandomValues', () => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  assert.match(generateUUID(), uuidRegex);

  const originalRandomUUID = crypto.randomUUID;
  try {
    crypto.randomUUID = undefined;
    assert.match(generateUUID(), uuidRegex);

    const originalRandom = crypto.getRandomValues;
    try {
      crypto.getRandomValues = undefined;
      assert.match(generateUUID(), uuidRegex);
    } finally {
      crypto.getRandomValues = originalRandom;
    }
  } finally {
    crypto.randomUUID = originalRandomUUID;
  }
});
