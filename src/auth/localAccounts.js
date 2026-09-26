const ACCOUNTS_KEY = 'guarania:accounts:v1';
const SESSION_KEY = 'guarania:session:v1';
const ITERATIONS = 120000;
const FALLBACK_ITERATIONS = 1000;
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
    return 'fb:' + bytesToHex(pbkdf2Sha256(password, hexToBytes(salt), FALLBACK_ITERATIONS));
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
  return 'fb:' + bytesToHex(pbkdf2Sha256(password, hexToBytes(salt), FALLBACK_ITERATIONS));
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
  };
}

function saveAccounts(list) {
  storage().setItem(ACCOUNTS_KEY, JSON.stringify(list));
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
  if (phone !== undefined) next.phone = String(phone || '').trim().slice(0, 30);
  if (email !== undefined) next.email = String(email || '').trim().slice(0, 120);
  if (avatar !== undefined) next.avatar = avatar || null;
  const list = [...saved];
  list[index] = next;
  saveAccounts(list);
  return publicAccount(next);
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

export async function register({ name, username, password, role }) {
  const cleanName = String(name || '').trim();
  const cleanUsername = String(username || '').trim().toLowerCase();
  if (cleanName.length < 2) throw new Error('Escribí tu nombre.');
  if (!/^[a-z0-9._-]{3,24}$/.test(cleanUsername)) throw new Error('El usuario debe tener entre 3 y 24 letras, números, puntos, guiones o guiones bajos.');
  if (String(password || '').length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres.');
  if (!['alumno', 'maestro'].includes(role)) throw new Error('Elegí Alumno o Maestro.');
  const saved = accounts();
  if (saved.some(item => item.username === cleanUsername)) throw new Error('Ese nombre de usuario ya existe en este dispositivo.');
  const salt = bytesToHex(getRandomBytes(16));
  const account = { id: generateUUID(), name: cleanName, username: cleanUsername, role, salt, passwordHash: await hashPassword(password, salt) };
  try {
    storage().setItem(ACCOUNTS_KEY, JSON.stringify([...saved, account]));
    storage().setItem(SESSION_KEY, account.id);
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

export async function login({ username, password }) {
  const account = accounts().find(item => item.username === String(username || '').trim().toLowerCase());
  if (!account || !account.salt || !account.passwordHash) throw new Error('Usuario o contraseña incorrectos.');
  const candidate = await hashPassword(password, account.salt, account.passwordHash);
  if (candidate !== account.passwordHash) throw new Error('Usuario o contraseña incorrectos.');
  storage().setItem(SESSION_KEY, account.id);
  return publicAccount(account);
}

export function logout() {
  storage().removeItem(SESSION_KEY);
}
