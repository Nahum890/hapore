import { rest } from './cloudClient.js';

const COLUMNS = 'id,class_id,creator_id,title,description,starts_at,meet_url,created_at';

export function validateMeetingInput({ classId, title, description = '', startsAt, meetUrl }, now = Date.now()) {
  const cleanTitle = String(title ?? '').trim();
  const cleanDescription = String(description ?? '').trim();
  const cleanUrl = String(meetUrl ?? '').trim();
  const timestamp = new Date(startsAt).getTime();
  if (!classId) throw new Error('MEETING_CLASS_REQUIRED');
  if (cleanTitle.length < 3 || cleanTitle.length > 100) throw new Error('MEETING_TITLE_INVALID');
  if (cleanDescription.length > 500) throw new Error('MEETING_DESCRIPTION_INVALID');
  if (!Number.isFinite(timestamp) || timestamp <= now) throw new Error('MEETING_TIME_INVALID');
  let parsed;
  try { parsed = new URL(cleanUrl); } catch { throw new Error('MEETING_URL_INVALID'); }
  if (parsed.protocol !== 'https:' || parsed.hostname !== 'meet.google.com' || !/^\/[a-z0-9-]{6,40}$/i.test(parsed.pathname)) {
    throw new Error('MEETING_URL_INVALID');
  }
  return { classId, title: cleanTitle, description: cleanDescription, startsAt: new Date(timestamp).toISOString(), meetUrl: parsed.toString() };
}

export async function listClassMeetings(classId, { from = new Date().toISOString(), limit = 40 } = {}) {
  if (!classId) return [];
  const safeLimit = Math.max(1, Math.min(100, Math.floor(Number(limit) || 40)));
  const query = `class_meetings?select=${COLUMNS}&class_id=eq.${encodeURIComponent(classId)}&starts_at=gte.${encodeURIComponent(from)}&order=starts_at.asc&limit=${safeLimit}`;
  const rows = await rest(query);
  return Array.isArray(rows) ? rows : [];
}

export async function createClassMeeting(input) {
  const meeting = validateMeetingInput(input);
  const rows = await rest('class_meetings', {
    method: 'POST',
    body: {
      class_id: meeting.classId,
      title: meeting.title,
      description: meeting.description,
      starts_at: meeting.startsAt,
      meet_url: meeting.meetUrl,
    },
    headers: { Prefer: 'return=representation' },
  });
  const row = Array.isArray(rows) ? rows[0] : rows;
  if (!row?.id) throw new Error('MEETING_SAVE_FAILED');
  return row;
}

export async function deleteClassMeeting(id) {
  if (!id) throw new Error('MEETING_ID_REQUIRED');
  await rest(`class_meetings?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
}
