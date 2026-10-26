import { CloudError, cloudAuth, isCloudConfigured } from './cloudClient.js';

// Cuentas con usuario y contraseña en Supabase Auth: la misma cuenta sirve en
// cualquier teléfono o computadora. Antes cada cuenta vivía solo en el
// localStorage del navegador donde se creó, y en otro dispositivo "no
// existía" (ni para entrar ni para avisar que el usuario ya estaba ocupado).
//
// Supabase pide un correo para cada cuenta. Se arma uno interno con el nombre
// de usuario en un dominio reservado (.invalid, RFC 2606: nadie lo puede
// registrar, así que nadie puede recibir correos de recuperación de otra
// cuenta). En Supabase hay que desactivar "Confirm email" (ver supabase/README.md).
const DOMAIN = (() => {
  try { return String(import.meta.env.VITE_ACCOUNT_EMAIL_DOMAIN ?? ''); } catch { return ''; }
})().trim().toLowerCase().replace(/[^a-z0-9.-]/g, '') || 'cuentas.pyfis.invalid';

export const accountEmail = username => `${String(username).trim().toLowerCase()}@${DOMAIN}`;

export function cloudAccountsAvailable() {
  return isCloudConfigured() && !(typeof navigator !== 'undefined' && navigator.onLine === false);
}

/** Datos de perfil que viajan con la cuenta. La foto NO va: Supabase la
 * copiaría dentro de cada token (hasta 200 kB por pedido). */
export function cloudProfile({ name, username, role, phone, email }) {
  return {
    name: String(name ?? '').slice(0, 80),
    username: String(username ?? ''),
    role: role === 'maestro' ? 'maestro' : 'alumno',
    phone: String(phone ?? '').slice(0, 24),
    email: String(email ?? '').slice(0, 120),
  };
}

const TAKEN = new Set(['user_already_exists', 'email_exists', 'identity_already_exists']);
const INVALID = new Set(['invalid_credentials', 'invalid_grant']);

/** Traduce los errores de Supabase Auth a códigos propios de la app. */
function accountError(error) {
  if (!(error instanceof CloudError) || error.offline) return error;
  if (TAKEN.has(error.code) || /already (been )?registered|already exists/i.test(error.message)) return new CloudError('USERNAME_TAKEN', { status: error.status, code: 'USERNAME_TAKEN' });
  if (INVALID.has(error.code) || /invalid login credentials/i.test(error.message)) return new CloudError('INVALID_CREDENTIALS', { status: error.status, code: 'INVALID_CREDENTIALS' });
  if (error.status === 429 || /rate[_ ]?limit/i.test(error.code ?? '')) return new CloudError('CLOUD_RATE_LIMIT', { status: 429, code: 'CLOUD_RATE_LIMIT' });
  if (error.code === 'weak_password') return new CloudError('CLOUD_WEAK_PASSWORD', { status: error.status, code: 'CLOUD_WEAK_PASSWORD' });
  return error;
}

function requireSession(data) {
  if (!data?.access_token || !data?.user?.id) {
    // Con "Confirm email" activado Supabase crea la cuenta pero no da sesión.
    throw new CloudError('CLOUD_CONFIRM_EMAIL_ENABLED', { code: 'CLOUD_CONFIRM_EMAIL_ENABLED' });
  }
  return data;
}

export async function cloudSignUp({ username, password, profile }) {
  try {
    return requireSession(await cloudAuth('signup', { body: { email: accountEmail(username), password, data: profile } }));
  } catch (error) { throw accountError(error); }
}

export async function cloudSignIn({ username, password }) {
  try {
    return requireSession(await cloudAuth('token?grant_type=password', { body: { email: accountEmail(username), password } }));
  } catch (error) { throw accountError(error); }
}

/** Convierte la sesión anónima de un perfil (la que tenía sus clases) en una
 * cuenta con usuario y contraseña, conservando el mismo id. Devuelve null si
 * Supabase no lo permite; quien llama crea entonces una cuenta nueva. */
export async function cloudConvertAnonymous(anonSession, { username, password, profile }) {
  if (!anonSession?.accessToken || anonSession.permanent) return null;
  const email = accountEmail(username);
  try {
    const withEmail = await cloudAuth('user', { method: 'PUT', token: anonSession.accessToken, body: { email, data: profile } });
    if (String(withEmail?.email ?? '').toLowerCase() !== email) return null; // quedó pendiente de confirmación
    await cloudAuth('user', { method: 'PUT', token: anonSession.accessToken, body: { password } });
    // El token anónimo sigue marcado como anónimo: se entra de nuevo.
    return await cloudSignIn({ username, password });
  } catch {
    return null;
  }
}

export async function cloudChangePassword(session, newPassword) {
  try {
    await cloudAuth('user', { method: 'PUT', token: session.accessToken, body: { password: newPassword } });
  } catch (error) { throw accountError(error); }
}

export async function cloudUpdateProfile(session, profile) {
  await cloudAuth('user', { method: 'PUT', token: session.accessToken, body: { data: profile } });
}
