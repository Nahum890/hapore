import { getActiveProfile, readJSONForProfile, writeJSONForProfile } from '../utils/storage.js';

// Cliente mínimo de Supabase (Auth + PostgREST) con fetch, sin dependencias.
// Si no hay VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY, la app sigue
// funcionando 100% local como antes; la nube es opcional.
const SESSION_KEY = 'guarania:cloudSession';
const TIMEOUT_MS = 12000;

// Cada variable por separado y sin "?.": así Vite reemplaza solo estas dos.
// Con `import.meta.env` como objeto, el bundle publicaba todas las VITE_*
// (en Vercel: autor y mensaje del commit, rama, id del repositorio...).
const envUrl = (() => { try { return import.meta.env.VITE_SUPABASE_URL ?? ''; } catch { return ''; } })();
const envKey = (() => { try { return import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''; } catch { return ''; } })();
let config = {
  url: String(envUrl).replace(/\/+$/, ''),
  key: String(envKey),
  fetch: (...args) => fetch(...args),
};

/** Solo para pruebas: inyectar URL, clave y fetch simulados. */
export function configureCloud(next) {
  config = { ...config, ...next, url: String(next.url ?? config.url).replace(/\/+$/, '') };
}

export function isCloudConfigured() {
  return Boolean(config.url && config.key);
}

export class CloudError extends Error {
  constructor(message, { status = 0, offline = false, code = '' } = {}) {
    super(message);
    this.status = status;
    this.offline = offline;
    // Código de error de Supabase (error_code / error), por ejemplo
    // "user_already_exists" o "invalid_credentials".
    this.code = code;
  }
}

async function http(path, { method = 'GET', body, token, headers = {} } = {}) {
  if (!isCloudConfigured()) throw new CloudError('La nube no está configurada.');
  if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new CloudError('Sin conexión.', { offline: true });
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), TIMEOUT_MS) : null;
  let response;
  try {
    response = await config.fetch(`${config.url}${path}`, {
      method,
      signal: controller?.signal,
      headers: {
        apikey: config.key,
        // Con sesión se manda el token del usuario. Sin sesión (registro
        // anónimo) solo va `apikey`; la clave legacy "anon" (JWT, empieza con
        // eyJ) también se acepta como Bearer, pero la nueva "publishable"
        // (sb_publishable_…) no es un JWT y Supabase la rechaza ahí.
        ...(token || /^eyJ/.test(config.key) ? { Authorization: `Bearer ${token ?? config.key}` } : {}),
        'Content-Type': 'application/json',
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new CloudError('No se pudo conectar con la nube.', { offline: true });
  } finally {
    if (timer) clearTimeout(timer);
  }
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!response.ok) {
    const detail = data?.message || data?.msg || data?.error_description || data?.error || `Error ${response.status}`;
    const code = typeof data?.error_code === 'string' ? data.error_code : typeof data?.error === 'string' ? data.error : typeof data?.code === 'string' ? data.code : '';
    throw new CloudError(String(detail), { status: response.status, code });
  }
  return data;
}

function sessionFrom(data, permanent = false) {
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Number(data.expires_at) || Math.floor(Date.now() / 1000) + Number(data.expires_in || 3600),
    userId: data.user?.id,
    // Cuenta con usuario y contraseña (la misma en todos los dispositivos).
    // Nunca se reemplaza en silencio por una sesión anónima nueva.
    ...(permanent ? { permanent: true } : {}),
  };
}

// Todas las lecturas y escrituras de la sesión van atadas al perfil que
// empezó el pedido: si se cambia de cuenta mientras se renueva un token, la
// respuesta no puede terminar guardada en la otra cuenta (antes pasaba, y la
// cuenta B quedaba usando la identidad de la cuenta A en la nube).
const readSession = profile => readJSONForProfile(profile, SESSION_KEY, null);
const writeSession = (profile, value) => writeJSONForProfile(profile, SESSION_KEY, value);
const dropSession = profile => writeJSONForProfile(profile, SESSION_KEY, null);

function storeSession(profile, data, permanent = false) {
  const session = sessionFrom(data, permanent);
  writeSession(profile, session);
  return session;
}

export const SESSION_EXPIRED = 'Tu sesión en la nube venció. Cerrá sesión y volvé a entrar con internet.';
const sessionExpired = () => new CloudError(SESSION_EXPIRED, { status: 401, code: 'session_expired' });

/** Sesión de Supabase de la cuenta local activa: la de su usuario y contraseña
 * si la cuenta está en la nube, o una anónima (cuentas solo locales). */
export async function getCloudSession(profile = getActiveProfile()) {
  const stored = readSession(profile);
  const now = Math.floor(Date.now() / 1000);
  if (stored?.accessToken && stored.expiresAt - 60 > now) return stored;
  if (stored?.refreshToken) {
    try {
      return storeSession(profile, await http('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: stored.refreshToken } }), Boolean(stored.permanent));
    } catch (error) {
      if (error.offline) throw error;
      if (stored.permanent) { writeSession(profile, { permanent: true, userId: stored.userId }); throw sessionExpired(); }
      dropSession(profile);
    }
  }
  // Una cuenta en la nube sin sesión válida vuelve a entrar con su contraseña;
  // crear una anónima la dejaría sin sus clases y su contenido.
  if (stored?.permanent) throw sessionExpired();
  return storeSession(profile, await http('/auth/v1/signup', { method: 'POST', body: {} }));
}

// Si la sesión guardada ya no es válida (401: proyecto reiniciado, sesión
// revocada), se reintenta una vez: la cuenta en la nube renueva su token y la
// anónima se reemplaza por una nueva.
async function withSession(call) {
  const profile = getActiveProfile();
  try {
    return await call(await getCloudSession(profile));
  } catch (error) {
    if (error.status !== 401 || error.code === 'session_expired') throw error;
    const stored = readSession(profile);
    if (stored?.permanent) writeSession(profile, { ...stored, accessToken: null, expiresAt: 0 });
    else dropSession(profile);
    return call(await getCloudSession(profile));
  }
}

export function rpc(name, args) {
  return withSession(session => http(`/rest/v1/rpc/${name}`, { method: 'POST', body: args, token: session.accessToken }));
}

/** `path` puede ser una función de la sesión, para rutas que usan el id del
 * usuario y deben reconstruirse si la sesión se renueva. */
export function rest(path, options = {}) {
  return withSession(session => http(`/rest/v1/${typeof path === 'function' ? path(session) : path}`, { ...options, token: session.accessToken }));
}

export function forgetCloudSession() {
  dropSession(getActiveProfile());
}

// ---- Cuentas con usuario y contraseña (Supabase Auth) ----------------------
// Las usa auth/localAccounts.js. Reciben el id del perfil local porque se
// llaman antes de que la cuenta quede activa.

export function readCloudSessionFor(profileId) {
  return readJSONForProfile(profileId, SESSION_KEY, null);
}

export function saveCloudSessionFor(profileId, data, permanent = true) {
  const session = sessionFrom(data, permanent);
  writeJSONForProfile(profileId, SESSION_KEY, session);
  return session;
}

/** Cierra la sesión de la nube de ese perfil en este dispositivo. Deja la marca
 * "permanent" para que nunca se cree una sesión anónima en su lugar. */
export function signOutCloudFor(profileId) {
  const stored = readCloudSessionFor(profileId);
  if (!stored?.permanent) return;
  writeJSONForProfile(profileId, SESSION_KEY, { permanent: true, userId: stored.userId });
  if (stored.accessToken && isCloudConfigured()) {
    http('/auth/v1/logout?scope=local', { method: 'POST', token: stored.accessToken }).catch(() => {});
  }
}

export function cloudAuth(path, { method = 'POST', body, token } = {}) {
  return http(`/auth/v1/${path}`, { method, body, token });
}
