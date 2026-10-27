import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { changePassword, getSession, login, logout, register } from '../src/auth/localAccounts.js';
import { configureCloud, getCloudSession } from '../src/cloud/cloudClient.js';
import { accountEmail } from '../src/cloud/cloudAccounts.js';
import { readJSON, readJSONForProfile, setActiveProfile } from '../src/utils/storage.js';

// Cada "dispositivo" es un localStorage distinto. La nube es un Supabase Auth
// simulado en memoria, compartido por todos los dispositivos.
const devices = new Map();
function useDevice(name) {
  if (!devices.has(name)) devices.set(name, new Map());
  const data = devices.get(name);
  globalThis.localStorage = {
    getItem: key => data.has(key) ? data.get(key) : null,
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: key => data.delete(key),
  };
  return data;
}

function fakeSupabaseAuth() {
  const users = new Map(); // email -> { id, password, meta, anonymous }
  const tokens = new Map(); // access/refresh token -> email
  const calls = [];
  const state = { rateLimited: false };
  let counter = 0;
  const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
  const session = email => {
    counter += 1;
    const user = users.get(email);
    tokens.set(`acc-${counter}`, email); tokens.set(`ref-${counter}`, email);
    return { access_token: `acc-${counter}`, refresh_token: `ref-${counter}`, expires_in: 3600, user: { id: user.id, email: user.anonymous ? '' : email, is_anonymous: user.anonymous, user_metadata: user.meta } };
  };
  const fetch = async (url, options) => {
    const path = url.replace('https://demo.supabase.co', '');
    const body = options.body ? JSON.parse(options.body) : {};
    const bearer = String(options.headers.Authorization ?? '').replace('Bearer ', '');
    calls.push({ path, method: options.method, body });
    if (path === '/auth/v1/signup') {
      if (!body.email) { const email = `anon-${counter}`; users.set(email, { id: `uid-anon-${counter}`, anonymous: true, meta: {} }); return json(session(email)); }
      if (users.has(body.email)) return json({ code: 422, error_code: 'user_already_exists', msg: 'User already registered' }, 422);
      users.set(body.email, { id: `uid-${users.size + 1}`, password: body.password, meta: body.data ?? {} });
      return json(session(body.email));
    }
    if (path === '/auth/v1/token?grant_type=password') {
      if (state.rateLimited) return json({ code: 429, error_code: 'over_request_rate_limit', msg: 'Request rate limit reached' }, 429);
      const user = users.get(body.email);
      if (!user || user.password !== body.password) return json({ code: 400, error_code: 'invalid_credentials', msg: 'Invalid login credentials' }, 400);
      return json(session(body.email));
    }
    if (path === '/auth/v1/token?grant_type=refresh_token') {
      const email = tokens.get(body.refresh_token);
      if (!email) return json({ error_code: 'refresh_token_not_found', msg: 'Invalid Refresh Token' }, 400);
      return json(session(email));
    }
    if (path === '/auth/v1/user' && options.method === 'PUT') {
      const email = tokens.get(bearer);
      if (!email) return json({ msg: 'invalid JWT' }, 401);
      const user = users.get(email);
      if (body.password) user.password = body.password;
      if (body.data) user.meta = { ...user.meta, ...body.data };
      return json({ id: user.id, email, user_metadata: user.meta });
    }
    if (path.startsWith('/auth/v1/logout')) return new Response(null, { status: 204 });
    return json({ message: 'no encontrado' }, 404);
  };
  return { users, calls, fetch, state };
}

const cloud = fakeSupabaseAuth();
configureCloud({ url: 'https://demo.supabase.co', key: 'sb_publishable_demo', fetch: cloud.fetch });

const contact = { phone: '0981 123 456', email: 'ana@example.invalid' };
const password = ['clave', 'de', 'prueba', String(Date.now())].join('-');

afterEach(() => { setActiveProfile(null); delete globalThis.localStorage; });

test('una cuenta creada en un teléfono sirve para entrar desde otro dispositivo', async () => {
  useDevice('telefono-a');
  const created = await register({ name: 'Ana Benítez', username: 'ana.b', password, role: 'maestro', ...contact });
  assert.equal(created.cloud, true, 'la cuenta queda en la nube');
  const stored = cloud.users.get(accountEmail('ana.b'));
  assert.equal(created.id, stored.id, 'el id local es el mismo de la nube');
  assert.equal(stored.meta.role, 'maestro');
  assert.equal(stored.meta.phone, contact.phone);
  assert.equal(readJSONForProfile(created.id, 'guarania:cloudSession', null).permanent, true);

  // Otro dispositivo, sin nada guardado: antes decía "Usuario o contraseña incorrectos".
  useDevice('computadora-b');
  const other = await login({ username: 'ANA.B', password });
  assert.equal(other.id, created.id);
  assert.equal(other.name, 'Ana Benítez');
  assert.equal(other.role, 'maestro');
  assert.equal(other.phone, contact.phone);
  assert.equal(getSession().id, created.id);
  setActiveProfile(other.id);
  assert.equal((await getCloudSession()).userId, created.id, 'usa la misma identidad en la nube: ve sus clases');
});

test('el nombre de usuario es único entre dispositivos y una clave equivocada no entra', async () => {
  useDevice('telefono-c');
  await assert.rejects(register({ name: 'Otra Ana', username: 'ana.b', password, role: 'alumno', ...contact }), /ya existe/);
  await assert.rejects(login({ username: 'ana.b', password: `${password}-mal` }), /incorrectos/);
  await assert.rejects(login({ username: 'nadie.registrado', password }), /incorrectos/);
});

test('una clave cambiada en un dispositivo deja de valer en los demás', async () => {
  useDevice('telefono-a');
  const account = await login({ username: 'ana.b', password });
  setActiveProfile(account.id);
  const newPassword = `${password}-nueva`;
  await changePassword(account.id, { currentPassword: password, newPassword });
  assert.equal(cloud.users.get(accountEmail('ana.b')).password, newPassword, 'la clave nueva llegó a la nube');
  setActiveProfile(null);

  // La computadora todavía tiene la copia local con la clave vieja.
  useDevice('computadora-b');
  await assert.rejects(login({ username: 'ana.b', password }), /incorrectos/);
  assert.equal((await login({ username: 'ana.b', password: newPassword })).id, account.id);
});

test('sin internet se crea solo en el dispositivo y se sube al volver la conexión', async () => {
  useDevice('tablet-d');
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { onLine: false } });
  let offline;
  try {
    offline = await register({ name: 'Beto Ríos', username: 'beto.r', password, role: 'alumno', ...contact });
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'navigator', descriptor); else delete globalThis.navigator;
  }
  assert.equal(offline.cloud, false);
  assert.equal(cloud.users.has(accountEmail('beto.r')), false);
  logout();

  const linked = await login({ username: 'beto.r', password });
  assert.equal(linked.cloud, true, 'al entrar con internet la cuenta se sube a la nube');
  assert.equal(linked.id, offline.id, 'conserva su progreso local (mismo perfil)');
  assert.equal(cloud.users.get(accountEmail('beto.r')).meta.name, 'Beto Ríos');

  useDevice('telefono-e');
  assert.equal((await login({ username: 'beto.r', password })).name, 'Beto Ríos');
});

test('una cuenta de la nube nunca cae en silencio a una sesión anónima', async () => {
  const data = useDevice('telefono-f');
  const account = await register({ name: 'Caro Gómez', username: 'caro.g', password, role: 'alumno', ...contact });
  setActiveProfile(account.id);
  // Sesión vencida y refresh token revocado.
  const key = `guarania:profile:${account.id}:guarania:cloudSession`;
  data.set(key, JSON.stringify({ ...JSON.parse(data.get(key)), accessToken: 'x', expiresAt: 0, refreshToken: 'revocado' }));
  const before = cloud.calls.filter(call => call.path === '/auth/v1/signup' && !call.body.email).length;
  await assert.rejects(getCloudSession(), /venció/);
  assert.equal(cloud.calls.filter(call => call.path === '/auth/v1/signup' && !call.body.email).length, before, 'no crea otra identidad');
  assert.equal(readJSON('guarania:cloudSession', null).permanent, true);
});

test('cerrar sesión no deja tokens de la nube guardados en el dispositivo', async () => {
  useDevice('compartida-g');
  const account = await login({ username: 'caro.g', password });
  assert.ok(readJSONForProfile(account.id, 'guarania:cloudSession', null).refreshToken);
  logout();
  const after = readJSONForProfile(account.id, 'guarania:cloudSession', null);
  assert.equal(after.permanent, true);
  assert.equal(after.refreshToken, undefined);
  assert.equal(after.accessToken, undefined);
});

test('la foto de perfil no viaja dentro de la cuenta de la nube', async () => {
  const meta = cloud.users.get(accountEmail('ana.b')).meta;
  assert.deepEqual(Object.keys(meta).sort(), ['email', 'name', 'phone', 'role', 'username']);
  assert.match(accountEmail('Ana.B'), /^ana\.b@[a-z0-9.-]+\.invalid$/, 'dominio reservado: nadie recibe correos de otra cuenta');
});

test('si Supabase limita por IP (un aula entera), la cuenta ya guardada en el dispositivo entra igual', async () => {
  useDevice('aula-h');
  const account = await register({ name: 'Dani Paz', username: 'dani.p', password, role: 'alumno', ...contact });
  logout();
  cloud.state.rateLimited = true;
  try {
    assert.equal((await login({ username: 'dani.p', password })).id, account.id);
    logout();
    await assert.rejects(login({ username: 'dani.p', password: `${password}-mal` }), /incorrectos/);
    useDevice('aula-nueva');
    await assert.rejects(login({ username: 'dani.p', password }), /Demasiados intentos/);
  } finally {
    cloud.state.rateLimited = false;
  }
});
