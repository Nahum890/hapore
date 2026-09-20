export const KMH_PER_MS = 3.6;

export function kmhToMs(kmh) {
  const value = Number(kmh);
  return Number.isFinite(value) ? value / KMH_PER_MS : NaN;
}

export function msToKmh(ms) {
  const value = Number(ms);
  return Number.isFinite(value) ? value * KMH_PER_MS : NaN;
}

export function formatNumber(value, decimals = 2) {
  if (!Number.isFinite(value)) return '—';
  return value.toFixed(decimals).replace('.', ',');
}
