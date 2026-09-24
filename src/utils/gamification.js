import { readJSON, writeJSON, STORAGE_KEYS } from '../utils/storage.js';

export const XP_REWARDS = {
  exerciseClean: 50,
  exerciseWithHints: 25,
  flashcardConsolidated: 15,
  quizAnswer: 30,
};

export const XP_MIN = 0;

/**
 * Curva de niveles Mbarete: Nivel de Cuenta (1 al 10) con rangos honoríficos.
 * Regla Cardinal Kyhyje'ỹ: la XP acumulada y el Nivel alcanzado NUNCA bajan
 * ni se descuentan ante un fallo.
 */
export const XP_LEVELS = [
  { level: 1, xp: 0, rank: 'Temimbo\'e Pyahu', title: 'Iniciante' },
  { level: 2, xp: 100, rank: 'Katupyry Oñepyrũva', title: 'Aprendiz Activo' },
  { level: 3, xp: 260, rank: 'Mbarete Vekuaa', title: 'Explorador de Vectores' },
  { level: 4, xp: 450, rank: 'Dron Moñe\'ẽhára', title: 'Piloto de Rutas' },
  { level: 5, xp: 700, rank: 'Arandu Parabolico', title: 'Especialista en Trayectorias' },
  { level: 6, xp: 1000, rank: 'Mba\'ehechaha', title: 'Observador Científico' },
  { level: 7, xp: 1350, rank: 'Py\'aguasu Mbo\'e', title: 'Investigador Firme' },
  { level: 8, xp: 1750, rank: 'Mba\'ekuaa Ruvicha', title: 'Maestro de Fuerzas' },
  { level: 9, xp: 2200, rank: 'Tembikuaa Mohendahára', title: 'Estratega Físico' },
  { level: 10, xp: 2700, rank: 'Mburuvicha Guasu', title: 'Gran Maestro de la Física' },
];

export function getXP() {
  const raw = readJSON(STORAGE_KEYS.XP, XP_MIN);
  const value = Number(raw);
  if (!Number.isFinite(value) || value < XP_MIN) {
    return XP_MIN;
  }
  return Math.floor(value);
}

export function getLevel(xp = getXP()) {
  let current = XP_LEVELS[0];
  for (const entry of XP_LEVELS) {
    if (xp >= entry.xp) {
      current = entry;
    }
  }
  return current;
}

export function getNextLevel(xp = getXP()) {
  const current = getLevel(xp);
  return XP_LEVELS.find((entry) => entry.level === current.level + 1) ?? null;
}

/**
 * Registra XP con incrementos exclusivamente positivos: la XP acumulada
 * jamás disminuye. Devuelve el estado { xp, level } actualizado.
 */
export function recordXP(amount) {
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
    return { xp: getXP(), level: getLevel() };
  }
  const next = getXP() + Math.floor(amount);
  writeJSON(STORAGE_KEYS.XP, next);
  return { xp: next, level: getLevel(next) };
}
