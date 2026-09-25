import { readJSON, writeJSON, STORAGE_KEYS } from '../utils/storage.js';

export const DAILY_TUTOR_LIMIT = 15;

function dayInParaguay(now = new Date()) {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Asuncion',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now);
  } catch {
    return now.toISOString().slice(0, 10);
  }
}

function currentUsage() {
  const today = dayInParaguay();
  const stored = readJSON(STORAGE_KEYS.TUTOR_USAGE, null);
  if (!stored || stored.day !== today || !Number.isFinite(stored.count)) {
    return { day: today, count: 0 };
  }
  return { day: today, count: Math.min(DAILY_TUTOR_LIMIT, Math.max(0, stored.count)) };
}

export function getTutorQuota() {
  const { count } = currentUsage();
  return { limit: DAILY_TUTOR_LIMIT, used: count, remaining: Math.max(0, DAILY_TUTOR_LIMIT - count) };
}

export function recordTutorQuery() {
  const usage = currentUsage();
  const next = { day: usage.day, count: Math.min(DAILY_TUTOR_LIMIT, usage.count + 1) };
  writeJSON(STORAGE_KEYS.TUTOR_USAGE, next);
  try {
    globalThis.window?.dispatchEvent(new Event('tutor-quota-change'));
  } catch {
    // Storage remains the source of truth when custom events are unavailable.
  }
  return { limit: DAILY_TUTOR_LIMIT, used: next.count, remaining: DAILY_TUTOR_LIMIT - next.count };
}

export function tutorQuotaMessage(remaining = 0) {
  return remaining > 0
    ? 'Alcanzaste las 15 consultas diarias del tutor. Mañana vas a poder seguir; te quedan ' + remaining + ' consultas.'
    : 'Alcanzaste las 15 consultas diarias del tutor. Mañana vas a poder seguir.';
}
