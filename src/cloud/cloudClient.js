import { readJSON, writeJSON, removeKey } from '../utils/storage.js';

// Cliente mínimo de Supabase (Auth + PostgREST) con fetch, sin dependencias.
// Si no hay VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY, la app sigue
// funcionando 100% local como antes; la nube es opcional.
const SESSION_KEY = 'guarania:cloudSession';
const TIMEOUT_MS = 12000;

const env = (() => { try { return import.meta.env ?? {}; } catch { return {}; } })();
let config = {
  url: String(env.VITE_SUPABASE_URL ?? '').replace(/\/+$/, ''),
  key: String(env.VITE_SUPABASE_ANON_KEY ?? ''),
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
  constructor(message, { status = 0, offline = false } = {}) {
    super(message);
    this.status = status;
    this.offline = offline;
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
        Authorization: `Bearer ${token ?? config.key}`,
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
    throw new CloudError(String(detail), { status: response.status });
  }
  return data;
}

function storeSession(data) {
  const session = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Number(data.expires_at) || Math.floor(Date.now() / 1000) + Number(data.expires_in || 3600),
    userId: data.user?.id,
  };
  writeJSON(SESSION_KEY, session);
  return session;
}

/** Sesión anónima de Supabase ligada a la cuenta local activa. */
export async function getCloudSession() {
  const stored = readJSON(SESSION_KEY, null);
  const now = Math.floor(Date.now() / 1000);
  if (stored?.accessToken && stored.expiresAt - 60 > now) return stored;
  if (stored?.refreshToken) {
    try {
      return storeSession(await http('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: stored.refreshToken } }));
    } catch (error) {
      if (error.offline) throw error;
      removeKey(SESSION_KEY);
    }
  }
  return storeSession(await http('/auth/v1/signup', { method: 'POST', body: {} }));
}

export async function rpc(name, args) {
  const session = await getCloudSession();
  return http(`/rest/v1/rpc/${name}`, { method: 'POST', body: args, token: session.accessToken });
}

export async function rest(path, options = {}) {
  const session = await getCloudSession();
  return http(`/rest/v1/${path}`, { ...options, token: session.accessToken });
}

export function forgetCloudSession() {
  removeKey(SESSION_KEY);
}
