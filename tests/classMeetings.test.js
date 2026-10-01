import test from 'node:test';
import assert from 'node:assert/strict';
import { createClassMeeting, deleteClassMeeting, listClassMeetings, validateMeetingInput } from '../src/cloud/classMeetings.js';
import { configureCloud } from '../src/cloud/cloudClient.js';

const now = Date.now();
const valid = {
  classId: 'class-1',
  title: 'Repaso de tiro parabólico',
  description: 'Repasamos alcance y ángulos.',
  startsAt: new Date(now + 24 * 60 * 60 * 1000).toISOString(),
  meetUrl: 'https://meet.google.com/abc-defg-hij',
};

test('valida y normaliza una reunión futura de Google Meet', () => {
  const result = validateMeetingInput(valid, now);
  assert.equal(result.classId, valid.classId);
  assert.equal(result.title, valid.title);
  assert.equal(result.startsAt, valid.startsAt);
  assert.equal(result.meetUrl, valid.meetUrl);
});

test('rechaza datos incompletos, fechas pasadas y enlaces que no son Meet', () => {
  assert.throws(() => validateMeetingInput({ ...valid, classId: '' }, now), /MEETING_CLASS_REQUIRED/);
  assert.throws(() => validateMeetingInput({ ...valid, title: '  x ' }, now), /MEETING_TITLE_INVALID/);
  assert.throws(() => validateMeetingInput({ ...valid, startsAt: new Date(now - 1000).toISOString() }, now), /MEETING_TIME_INVALID/);
  assert.throws(() => validateMeetingInput({ ...valid, meetUrl: 'https://meet.google.com.evil.test/abc-defg-hij' }, now), /MEETING_URL_INVALID/);
  assert.throws(() => validateMeetingInput({ ...valid, meetUrl: 'https://example.com/abc-defg-hij' }, now), /MEETING_URL_INVALID/);
});

test('crea, consulta y cancela reuniones en la tabla compartida', async () => {
  const values = new Map();
  globalThis.localStorage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key),
  };
  const calls = [];
  const meeting = { id: 12, class_id: valid.classId, creator_id: 'teacher-1', title: valid.title, description: valid.description, starts_at: valid.startsAt, meet_url: valid.meetUrl };
  configureCloud({ url: 'https://cloud.example.invalid', key: 'publishable-test-key', fetch: async (url, options = {}) => {
    const parsed = new URL(url);
    calls.push({ path: parsed.pathname, search: parsed.search, method: options.method ?? 'GET', body: options.body, headers: options.headers });
    if (parsed.pathname.endsWith('/auth/v1/signup')) {
      return new Response(JSON.stringify({ access_token: 'access-token', refresh_token: 'refresh-token', expires_in: 3600, user: { id: 'teacher-1' } }), { status: 200 });
    }
    if (options.method === 'POST') return new Response(JSON.stringify([meeting]), { status: 201 });
    if (options.method === 'DELETE') return new Response(null, { status: 204 });
    return new Response(JSON.stringify([meeting]), { status: 200 });
  } });
  try {
    assert.deepEqual(await createClassMeeting(valid), meeting);
    const listed = await listClassMeetings(valid.classId);
    assert.deepEqual(listed, [meeting]);
    await deleteClassMeeting(meeting.id);
    assert.equal(calls.filter(call => call.path.endsWith('/rest/v1/class_meetings')).length, 3);
    assert.equal(JSON.parse(calls[1].body).class_id, valid.classId);
    assert.ok(calls[2].search.includes('starts_at=gte.'));
    assert.equal(calls[3].method, 'DELETE');
  } finally {
    configureCloud({ url: '', key: '', fetch: (...args) => fetch(...args) });
    delete globalThis.localStorage;
  }
});
