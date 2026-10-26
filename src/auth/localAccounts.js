import {
  cloudAccountsAvailable, cloudChangePassword, cloudConvertAnonymous, cloudProfile, cloudSignIn, cloudSignUp, cloudUpdateProfile,
} from '../cloud/cloudAccounts.js';
import { getCloudSession, readCloudSessionFor, saveCloudSessionFor, signOutCloudFor } from '../cloud/cloudClient.js';

const ACCOUNTS_KEY = 'guarania:accounts:v1';
const SESSION_KEY = 'guarania:session:v1';
const ITERATIONS = 120000;
const FALLBACK_ITERATIONS = 20000;
const LEGACY_FALLBACK_ITERATIONS = 1000;
const LEGACY_PROGRESS_KEYS = [
  'guarania:confidence', 'guarania:currentExercise', 'guarania:attempts',
  'guarania:flashcardState', 'guarania:completed', 'guarania:xp',
  'guarania:quizRewarded', 'guarania_chat_history', 'guarania:classCode', 'guarania:attemptLog',
];

function storage() {
  if (typeof localStorage === 'undefined') throw new Error('Activá el almacenamiento del navegador para usar cuentas en este dispositivo.');
  return localStorage;
}

function accounts() {
  try {
    const value = JSON.parse(storage().getItem(ACCOUNTS_KEY) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

const bytesToHex = bytes => Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
const hexToBytes = hex => new Uint8Array(hex.match(/.{2}/g).map(byte => parseInt(byte, 16)));

const encodeUTF8 = (str) => {
  if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(str);
  const utf8 = unescape(encodeURIComponent(str));
  const bytes = new Uint8Array(utf8.length);
  for (let i = 0; i < utf8.length; i++) bytes[i] = utf8.charCodeAt(i);
  return bytes;
};

// Implementación de SHA-256 en JavaScript puro para entornos no seguros (HTTP / LAN móvil)
function sha256Bytes(data) {
  function rightRotate(value, amount) { return (value >>> amount) | (value << (32 - amount)); }
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
  let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;

  const len = data.length;
  const bitLen = len * 8;
  const withPadLen = ((len + 8) >> 6) + 1 << 6;
  const padded = new Uint8Array(withPadLen);
  padded.set(data);
  padded[len] = 0x80;

  const view = new DataView(padded.buffer);
  view.setUint32(withPadLen - 4, bitLen >>> 0, false);
  view.setUint32(withPadLen - 8, Math.floor(bitLen / 0x100000000), false);

  const w = new Uint32Array(64);

  for (let i = 0; i < withPadLen; i += 64) {
    for (let t = 0; t < 16; t++) {
      w[t] = view.getUint32(i + (t * 4), false);
    }
    for (let t = 16; t < 64; t++) {
      const s0 = rightRotate(w[t - 15], 7) ^ rightRotate(w[t - 15], 18) ^ (w[t - 15] >>> 3);
      const s1 = rightRotate(w[t - 2], 17) ^ rightRotate(w[t - 2], 19) ^ (w[t - 2] >>> 10);
      w[t] = (w[t - 16] + s0 + w[t - 7] + s1) >>> 0;
    }

    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;

    for (let t = 0; t < 64; t++) {
      const S1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & f) ^ ((~e) & g);
      const temp1 = (h + S1 + ch + K[t] + w[t]) >>> 0;
      const S0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }

  const out = new Uint8Array(32);
  const outView = new DataView(out.buffer);
  outView.setUint32(0, h0, false);
  outView.setUint32(4, h1, false);
  outView.setUint32(8, h2, false);
  outView.setUint32(12, h3, false);
  outView.setUint32(16, h4, false);
  outView.setUint32(20, h5, false);
  outView.setUint32(24, h6, false);
  outView.setUint32(28, h7, false);
  return out;
}

function hmacSha256(key, msg) {
  let k = key;
  if (k.length > 64) k = sha256Bytes(k);
  const kPad = new Uint8Array(64);
  kPad.set(k);
  const ipad = new Uint8Array(64 + msg.length);
  const opad = new Uint8Array(64 + 32);
  for (let i = 0; i < 64; i++) {
    ipad[i] = kPad[i] ^ 0x36;
    opad[i] = kPad[i] ^ 0x5c;
  }
  ipad.set(msg, 64);
  const inner = sha256Bytes(ipad);
  opad.set(inner, 64);
  return sha256Bytes(opad);
}

function pbkdf2Sha256(passwordStr, saltBytes, iterations = FALLBACK_ITERATIONS) {
  const pass = encodeUTF8(passwordStr);
  const initialMsg = new Uint8Array(saltBytes.length + 4);
  initialMsg.set(saltBytes);
  initialMsg[saltBytes.length + 3] = 1;

  let u = hmacSha256(pass, initialMsg);
  const result = new Uint8Array(u);

  for (let c = 1; c < iterations; c++) {
    u = hmacSha256(pass, u);
    for (let j = 0; j < 32; j++) {
      result[j] ^= u[j];
    }
  }
  return result;
}

// Este fallback solo forma identificadores locales; nunca se usa para sales.
export function getRandomBytes(length) {
  const bytes = new Uint8Array(length);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    return crypto.getRandomValues(bytes);
  }
  for (let i = 0; i < length; i++) {
    bytes[i] = (Math.random() * 256) | 0;
  }
  return bytes;
}

function getSecureRandomBytes(length) {
  if (typeof crypto === 'undefined' || typeof crypto.getRandomValues !== 'function') {
    throw new Error('Este navegador no ofrece aleatoriedad segura. Abrí la app con HTTPS o localhost para crear una cuenta.');
  }
  return crypto.getRandomValues(new Uint8Array(length));
}

// Conservar referencia original nativa si existe para prevenir recursión infinita
const nativeRandomUUID = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
  ? crypto.randomUUID.bind(crypto)
  : null;

export function generateUUID() {
  if (nativeRandomUUID) {
    try {
      return nativeRandomUUID();
    } catch {
      // Continuar con fallback si el nativo falla
    }
  }
  const bytes = getRandomBytes(16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // RFC 4122 v4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // RFC 4122 variant
  const hex = bytesToHex(bytes);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

try {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID !== 'function') {
    crypto.randomUUID = () => generateUUID();
  }
} catch {
  // Ignorar si crypto no permite redefinir propiedades
}

async function hashPassword(password, salt, targetHash) {
  if (targetHash && targetHash.startsWith('fb:')) {
    return 'fb:' + bytesToHex(pbkdf2Sha256(password, hexToBytes(salt), LEGACY_FALLBACK_ITERATIONS));
  }
  if (targetHash && targetHash.startsWith('fb2:')) {
    return 'fb2:' + bytesToHex(pbkdf2Sha256(password, hexToBytes(salt), FALLBACK_ITERATIONS));
  }
  if (typeof crypto !== 'undefined' && crypto?.subtle?.importKey) {
    try {
      const key = await crypto.subtle.importKey('raw', encodeUTF8(password), 'PBKDF2', false, ['deriveBits']);
      const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: hexToBytes(salt), iterations: ITERATIONS, hash: 'SHA-256' }, key, 256);
      return bytesToHex(new Uint8Array(bits));
    } catch {
      // Si falla WebCrypto, continuar a fallback
    }
  }
  if (targetHash && !targetHash.startsWith('fb:')) {
    throw new Error('Esta cuenta fue creada en un entorno con HTTPS. Para ingresar desde esta conexión local, volvé a crearla o usá localhost/HTTPS.');
  }
  return 'fb2:' + bytesToHex(pbkdf2Sha256(password, hexToBytes(salt), FALLBACK_ITERATIONS));
}

function publicAccount(account) {
  return {
    id: account.id,
    name: account.name,
    username: account.username,
    role: account.role,
    phone: account.phone ?? '',
    email: account.email ?? '',
    avatar: account.avatar ?? null,
    // true: la cuenta existe en la nube y sirve en cualquier dispositivo.
    cloud: Boolean(account.cloudLinked),
  };
}

function saveAccounts(list) {
  storage().setItem(ACCOUNTS_KEY, JSON.stringify(list));
}

/** Teléfono y correo son obligatorios: se usan para que docente y alumnos de
 * una misma clase puedan contactarse. */
export function validateContact({ phone, email }) {
  const cleanPhone = String(phone ?? '').trim();
  const cleanEmail = String(email ?? '').trim().toLowerCase();
  if (!/^\+?[\d\s().-]{7,24}$/.test(cleanPhone) || cleanPhone.replace(/\D/g, '').length < 7) {
    throw new Error('Escribí un número de teléfono válido (al menos 7 dígitos).');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(cleanEmail) || cleanEmail.length > 120) {
    throw new Error('Escribí un correo válido, por ejemplo nombre@ejemplo.com.');
  }
  return { phone: cleanPhone, email: cleanEmail };
}

// Mismos ids que AVATAR_OPTIONS en components/Avatars.jsx. Vacío = solo la inicial.
const PRESET_AVATARS = ['sol', 'rio', 'selva', 'tierra', 'cielo', 'yaguarete', 'guacamayo', 'tatu', 'cohete', 'atomo', 'pelota', 'dron'];
const MAX_PHOTO_CHARS = 200_000;

function validAvatar(avatar) {
  if (!avatar) return null;
  if (PRESET_AVATARS.includes(avatar)) return avatar;
  if (/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(avatar) && avatar.length <= MAX_PHOTO_CHARS) return avatar;
  throw new Error('La foto no es válida o es demasiado grande.');
}

export function hasContactInfo(account) {
  try { validateContact(account ?? {}); return true; } catch { return false; }
}

/** Datos de contacto y foto de perfil: quedan en este dispositivo, igual que
 * el resto de la cuenta. No hay verificación de teléfono/correo: son solo
 * datos que el alumno o el docente eligen mostrar (por ejemplo, para que su
 * clase sepa cómo son o cómo contactarlos). */
export function updateProfile(accountId, { phone, email, avatar } = {}) {
  const saved = accounts();
  const index = saved.findIndex(item => item.id === accountId);
  if (index === -1) throw new Error('No se encontró la cuenta en este dispositivo.');
  const next = { ...saved[index] };
  if (phone !== undefined || email !== undefined) {
    Object.assign(next, validateContact({ phone: phone ?? next.phone, email: email ?? next.email }));
  }
  if (avatar !== undefined) next.avatar = validAvatar(avatar);
  const list = [...saved];
  list[index] = next;
  saveAccounts(list);
  if (next.cloudLinked && cloudAccountsAvailable()) {
    // Nombre, rol y contactos viajan con la cuenta (la foto queda en el dispositivo).
    getCloudSession().then(session => cloudUpdateProfile(session, cloudProfile(next))).catch(() => {});
  }
  return publicAccount(next);
}

/** Actualiza la clave local verificando primero la actual y guardando un hash
 * PBKDF2 con una sal nueva. Estas cuentas viven en el dispositivo, no en Auth. */
export async function changePassword(accountId, { currentPassword, newPassword } = {}) {
  const saved = accounts();
  const index = saved.findIndex(item => item.id === accountId);
  if (index === -1) throw new Error('ACCOUNT_NOT_FOUND');
  const account = { ...saved[index] };
  if (!account.salt || !account.passwordHash) throw new Error('PASSWORD_UNAVAILABLE');
  const candidate = await hashPassword(String(currentPassword ?? ''), account.salt, account.passwordHash);
  if (candidate !== account.passwordHash) throw new Error('PASSWORD_CURRENT_INVALID');
  const cleanNewPassword = String(newPassword ?? '');
  if (cleanNewPassword.length < 8) throw new Error('PASSWORD_TOO_SHORT');
  if (account.cloudLinked) {
    // La clave nueva tiene que llegar a la nube: si no, en otro dispositivo
    // seguiría valiendo la anterior.
    if (!cloudAccountsAvailable()) throw new Error('PASSWORD_NEEDS_INTERNET');
    let session;
    try { session = await getCloudSession(); } catch (error) {
      throw new Error(error?.code === 'session_expired' ? 'PASSWORD_SESSION_EXPIRED' : 'PASSWORD_NEEDS_INTERNET');
    }
    try { await cloudChangePassword(session, cleanNewPassword); } catch (error) {
      throw new Error(error?.code === 'CLOUD_WEAK_PASSWORD' ? 'PASSWORD_TOO_SHORT' : 'PASSWORD_NEEDS_INTERNET');
    }
  }
  const salt = bytesToHex(getSecureRandomBytes(16));
  account.salt = salt;
  account.passwordHash = await hashPassword(cleanNewPassword, salt);
  const next = [...saved];
  next[index] = account;
  saveAccounts(next);
  return true;
}

/** Cuentas visibles en este dispositivo (sin contraseñas), para que un
 * alumno pueda ver quién es su docente y un docente pueda ver su lista de
 * alumnos. Nunca sale de este dispositivo. */
export function listAccounts() {
  return accounts().map(publicAccount);
}

export function getAccountById(id) {
  const found = accounts().find(item => item.id === id);
  return found ? publicAccount(found) : null;
}

export function getSession() {
  try {
    const id = storage().getItem(SESSION_KEY);
    const account = accounts().find(item => item.id === id);
    return account ? publicAccount(account) : null;
  } catch {
    return null;
  }
}

export async function register({ name, username, password, role, phone, email }) {
  const cleanName = String(name || '').trim();
  const cleanUsername = String(username || '').trim().toLowerCase();
  if (cleanName.length < 2) throw new Error('Escribí tu nombre.');
  if (!/^[a-z0-9._-]{3,24}$/.test(cleanUsername)) throw new Error('El usuario debe tener entre 3 y 24 letras, números, puntos, guiones o guiones bajos.');
  if (String(password || '').length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres.');
  if (!['alumno', 'maestro'].includes(role)) throw new Error('Elegí Alumno o Maestro.');
  const contact = validateContact({ phone, email });
  const saved = accounts();
  if (saved.some(item => item.username === cleanUsername)) throw new Error('Ese nombre de usuario ya existe en este dispositivo.');
  // Con internet, la cuenta se crea primero en la nube: así el nombre de
  // usuario es único entre todos los dispositivos y se puede entrar desde
  // cualquiera. Sin internet se crea solo acá y se sube al próximo inicio de
  // sesión con conexión.
  let cloud = null;
  if (cloudAccountsAvailable()) {
    try {
      cloud = await cloudSignUp({ username: cleanUsername, password: String(password), profile: cloudProfile({ name: cleanName, username: cleanUsername, role, ...contact }) });
    } catch (error) {
      if (error?.code === 'USERNAME_TAKEN') throw new Error('Ese nombre de usuario ya existe. Elegí otro.');
      if (error?.code === 'CLOUD_RATE_LIMIT') throw new Error('Demasiados intentos seguidos. Esperá unos minutos y volvé a probar.');
      if (error?.code === 'CLOUD_WEAK_PASSWORD') throw new Error('La contraseña debe tener al menos 8 caracteres.');
      // Sin conexión o nube mal configurada: la cuenta sigue funcionando en este dispositivo.
      if (!error?.offline) console.warn('No se pudo crear la cuenta en la nube:', error?.code || error?.message);
    }
  }
  const salt = bytesToHex(getSecureRandomBytes(16));
  const account = {
    id: cloud?.user?.id ?? generateUUID(), name: cleanName, username: cleanUsername, role, ...contact, salt,
    passwordHash: await hashPassword(password, salt),
    cloudUserId: cloud?.user?.id ?? null, cloudLinked: Boolean(cloud),
  };
  try {
    storage().setItem(ACCOUNTS_KEY, JSON.stringify([...saved, account]));
    storage().setItem(SESSION_KEY, account.id);
    if (cloud) saveCloudSessionFor(account.id, cloud, true);
    if (saved.length === 0) {
      for (const key of LEGACY_PROGRESS_KEYS) {
        const previous = storage().getItem(key);
        if (previous !== null) storage().setItem(`guarania:profile:${account.id}:${key}`, previous);
      }
    }
  } catch {
    throw new Error('No se pudo guardar la cuenta en este dispositivo. Revisá el almacenamiento del navegador.');
  }
  return publicAccount(account);
}

function replaceAccount(next) {
  saveAccounts(accounts().map(item => item.id === next.id ? next : item));
}

/** Copia local de una cuenta de la nube que acaba de entrar: se crea (para
 * poder entrar sin internet la próxima vez) o se actualiza con lo que se
 * cambió en otro dispositivo. La clave queda solo como hash PBKDF2. */
async function rememberCloudLogin(local, cloud, username, password) {
  const meta = cloud.user.user_metadata ?? {};
  const salt = bytesToHex(getSecureRandomBytes(16));
  const fromCloud = {
    ...(typeof meta.name === 'string' && meta.name.trim().length >= 2 ? { name: meta.name.trim().slice(0, 80) } : {}),
    ...(meta.role === 'maestro' || meta.role === 'alumno' ? { role: meta.role } : {}),
    ...(typeof meta.phone === 'string' && meta.phone ? { phone: meta.phone.slice(0, 24) } : {}),
    ...(typeof meta.email === 'string' && meta.email ? { email: meta.email.slice(0, 120) } : {}),
  };
  const base = local ?? { id: cloud.user.id, name: username, role: 'alumno', phone: '', email: '', avatar: null };
  return {
    ...base, ...fromCloud, username,
    cloudUserId: cloud.user.id, cloudLinked: true, salt, passwordHash: await hashPassword(password, salt),
  };
}

/** Sube a la nube una cuenta que hasta ahora vivía solo en este dispositivo.
 * Si el perfil tenía una sesión anónima (con clases creadas), se convierte esa
 * misma, así no se pierden. Nunca bloquea el inicio de sesión. */
async function linkLocalAccount(account, password) {
  const credentials = { username: account.username, password: String(password), profile: cloudProfile(account) };
  let cloud = await cloudConvertAnonymous(readCloudSessionFor(account.id), credentials);
  if (!cloud) {
    try {
      cloud = await cloudSignUp(credentials);
    } catch (error) {
      if (error?.code !== 'USERNAME_TAKEN') return account;
      // Ya existe en la nube: si la clave coincide es esta misma cuenta
      // (vinculada desde otro dispositivo). Si no, es de otra persona.
      cloud = await cloudSignIn(credentials).catch(() => null);
      if (!cloud) return { ...account, cloudConflict: true };
    }
  }
  const next = { ...account, cloudUserId: cloud.user.id, cloudLinked: true };
  delete next.cloudConflict;
  saveCloudSessionFor(account.id, cloud, true);
  return next;
}

const LOGIN_FAILED = 'Usuario o contraseña incorrectos.';

export async function login({ username, password }) {
  const cleanUsername = String(username || '').trim().toLowerCase();
  const cleanPassword = String(password ?? '');
  let account = accounts().find(item => item.username === cleanUsername);
  // Cuenta de la nube (o que no está en este dispositivo): manda la nube. Así
  // se entra desde cualquier teléfono, y una clave cambiada en otro
  // dispositivo deja de valer también acá.
  if (cloudAccountsAvailable() && (!account || account.cloudLinked)) {
    let cloud = null;
    try {
      cloud = await cloudSignIn({ username: cleanUsername, password: cleanPassword });
    } catch (error) {
      if (error?.code === 'CLOUD_RATE_LIMIT') throw new Error('Demasiados intentos seguidos. Esperá unos minutos y volvé a probar.');
      if (!account) throw new Error(error?.offline ? 'Sin conexión: para entrar por primera vez en este dispositivo necesitás internet.' : LOGIN_FAILED);
      if (error?.code === 'INVALID_CREDENTIALS') {
        // ¿La nube perdió la cuenta (proyecto nuevo o reiniciado)? Si la clave
        // local coincide y el usuario no existe allá, se vuelve a crear; si
        // existe con otra clave, la cambiaron en otro dispositivo: no se entra.
        const candidate = await hashPassword(cleanPassword, account.salt, account.passwordHash).catch(() => null);
        if (candidate !== account.passwordHash) throw new Error(LOGIN_FAILED);
        const relinked = await linkLocalAccount({ ...account, cloudLinked: false }, cleanPassword);
        if (!relinked.cloudLinked) throw new Error(LOGIN_FAILED);
        replaceAccount(relinked);
        storage().setItem(SESSION_KEY, relinked.id);
        return publicAccount(relinked);
      }
      // Sin conexión o nube caída: se valida con la copia local (más abajo).
    }
    if (cloud) {
      // Un usuario de la nube con el mismo id que otra cuenta local: no se mezclan.
      if (!account && accounts().some(item => item.id === cloud.user.id)) throw new Error(LOGIN_FAILED);
      const remembered = await rememberCloudLogin(account, cloud, cleanUsername, cleanPassword);
      saveAccounts(account ? accounts().map(item => item.id === account.id ? remembered : item) : [...accounts(), remembered]);
      saveCloudSessionFor(remembered.id, cloud, true);
      storage().setItem(SESSION_KEY, remembered.id);
      return publicAccount(remembered);
    }
  }
  if (!account || !account.salt || !account.passwordHash) throw new Error(LOGIN_FAILED);
  const candidate = await hashPassword(cleanPassword, account.salt, account.passwordHash);
  if (candidate !== account.passwordHash) throw new Error(LOGIN_FAILED);
  if (!account.cloudLinked && cloudAccountsAvailable()) {
    try {
      account = await linkLocalAccount(account, cleanPassword);
      replaceAccount(account);
    } catch {
      // Se reintenta en el próximo inicio de sesión con internet.
    }
  }
  // Hashes viejos (1.000 o 20.000 iteraciones) se rehacen con la clave recién
  // verificada: con WebCrypto quedan en 120.000.
  if (/^fb2?:/.test(account.passwordHash)) {
    try {
      const salt = bytesToHex(getSecureRandomBytes(16));
      account.salt = salt;
      account.passwordHash = await hashPassword(password, salt);
      storage().setItem(ACCOUNTS_KEY, JSON.stringify(accounts().map(item => item.id === account.id ? account : item)));
    } catch {
      // No bloquear perfiles existentes en navegadores antiguos; el hash
      // legado se reemplaza si la plataforma ofrece un generador seguro.
    }
  }
  storage().setItem(SESSION_KEY, account.id);
  return publicAccount(account);
}

export function logout() {
  const id = storage().getItem(SESSION_KEY);
  // La sesión de la nube no queda guardada en un dispositivo compartido.
  if (id) signOutCloudFor(id);
  storage().removeItem(SESSION_KEY);
}
