// Supabase simulado en memoria SOLO para probar la app localmente, sin crear
// un proyecto real. Imita las reglas RLS de supabase/schema.sql para clases,
// directorio de contactos y chat. Los datos se pierden al cerrarlo.
// Uso: node supabase/mock-server.mjs   (escucha en el puerto 54321)
// Ver docs/GUIA_CODEX_SERVIDOR.md.
import http from 'node:http';
import { randomUUID } from 'node:crypto';

const tokens = new Map(); // token -> uid
const classes = [];
const members = [];
const messages = [];
let nextMessageId = 1;

const send = (res, status, data) => {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, prefer',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  });
  res.end(data === undefined ? '' : JSON.stringify(data));
};
const newSession = uid => { const token = randomUUID(); tokens.set(token, uid); return { access_token: token, refresh_token: token, expires_in: 3600, user: { id: uid } }; };
const params = url => Object.fromEntries([...url.searchParams].map(([k, v]) => [k, v.replace(/^(eq|gt)\./, '')]));
const isTeacher = (classId, uid) => classes.some(c => c.id === classId && c.teacher_id === uid);
const isParticipant = (classId, uid) => isTeacher(classId, uid) || members.some(m => m.class_id === classId && m.student_id === uid);

http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204);
  const url = new URL(req.url, 'http://x');
  let raw = ''; for await (const chunk of req) raw += chunk;
  const body = raw ? JSON.parse(raw) : {};
  const uid = tokens.get((req.headers.authorization ?? '').replace('Bearer ', ''));

  if (url.pathname === '/auth/v1/signup') return send(res, 200, newSession(randomUUID()));
  if (url.pathname === '/auth/v1/token') { const old = tokens.get(body.refresh_token); return old ? send(res, 200, newSession(old)) : send(res, 400, { error_description: 'refresh inválido' }); }
  if (!uid) return send(res, 401, { message: 'JWT inválido' });

  if (url.pathname === '/rest/v1/rpc/create_class') {
    const code = Array.from({ length: 6 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('');
    const row = { id: randomUUID(), code, teacher_id: uid, teacher_name: body.p_teacher_name, teacher_avatar: body.p_teacher_avatar, teacher_phone: body.p_teacher_phone, teacher_email: body.p_teacher_email, title: body.p_title, content: body.p_content, created_at: new Date().toISOString() };
    classes.push(row);
    return send(res, 200, [{ id: row.id, code }]);
  }
  if (url.pathname === '/rest/v1/rpc/join_class') {
    const found = classes.find(item => item.code === String(body.p_code).toUpperCase());
    if (!found) return send(res, 400, { message: 'Código de clase inexistente.' });
    const profile = { display_name: body.p_display_name, avatar: body.p_avatar, phone: body.p_phone, email: body.p_email };
    const existing = members.find(m => m.class_id === found.id && m.student_id === uid);
    if (existing) Object.assign(existing, profile);
    else members.push({ class_id: found.id, student_id: uid, ...profile, xp: 0, level: 1, attempts: 0, correct: 0, confidence: 0, cards_consolidated: 0, last_sync: null, joined_at: new Date().toISOString() });
    const { id, code, title, teacher_id, teacher_name, teacher_avatar, teacher_phone, teacher_email, content } = found;
    return send(res, 200, [{ class_id: id, code, title, teacher_id, teacher_name, teacher_avatar, teacher_phone, teacher_email, content }]);
  }
  if (url.pathname === '/rest/v1/rpc/class_directory') {
    const found = classes.find(c => c.id === body.p_class_id);
    if (!found || !isParticipant(found.id, uid)) return send(res, 200, []);
    return send(res, 200, [
      { user_id: found.teacher_id, role: 'maestro', display_name: found.teacher_name, avatar: found.teacher_avatar, phone: found.teacher_phone, email: found.teacher_email },
      ...members.filter(m => m.class_id === found.id).map(m => ({ user_id: m.student_id, role: 'alumno', display_name: m.display_name, avatar: m.avatar, phone: m.phone, email: m.email })),
    ]);
  }
  if (url.pathname === '/rest/v1/rpc/sync_my_profile') {
    for (const c of classes) if (c.teacher_id === uid) Object.assign(c, { teacher_name: body.p_display_name, teacher_avatar: body.p_avatar, teacher_phone: body.p_phone, teacher_email: body.p_email });
    for (const m of members) if (m.student_id === uid) Object.assign(m, { display_name: body.p_display_name, avatar: body.p_avatar, phone: body.p_phone, email: body.p_email });
    return send(res, 204);
  }
  if (url.pathname === '/rest/v1/classes') {
    const p = params(url);
    if (req.method === 'GET') {
      const own = classes.filter(item => item.teacher_id === uid && (!p.teacher_id || p.teacher_id === uid));
      return send(res, 200, own.map(item => ({ id: item.id, code: item.code, title: item.title, created_at: item.created_at, class_members: members.filter(m => m.class_id === item.id) })));
    }
    if (req.method === 'DELETE') {
      const index = classes.findIndex(item => item.id === p.id && item.teacher_id === uid);
      if (index >= 0) { const [gone] = classes.splice(index, 1); for (let i = members.length - 1; i >= 0; i--) if (members[i].class_id === gone.id) members.splice(i, 1); }
      return send(res, 204);
    }
  }
  if (url.pathname === '/rest/v1/class_members') {
    const p = params(url);
    if (p.student_id !== uid) return send(res, 403, { message: 'RLS: solo tu propia fila' });
    const index = members.findIndex(m => m.class_id === p.class_id && m.student_id === uid);
    if (req.method === 'PATCH') { if (index >= 0) Object.assign(members[index], body); return send(res, 204); }
    if (req.method === 'DELETE') { if (index >= 0) members.splice(index, 1); return send(res, 204); }
  }
  if (url.pathname === '/rest/v1/messages') {
    if (req.method === 'GET') {
      const p = params(url);
      const after = Number(p.id) || 0;
      const visible = messages.filter(m => m.class_id === p.class_id && m.id > after && isParticipant(m.class_id, uid)
        && (!m.recipient_id || m.sender_id === uid || m.recipient_id === uid));
      return send(res, 200, visible.slice(0, 200));
    }
    if (req.method === 'POST') {
      const { class_id, recipient_id = null, kind = 'text', body: text = '', payload = null } = body;
      const allowed = isParticipant(class_id, uid)
        && (!recipient_id || (recipient_id !== uid && isParticipant(class_id, recipient_id)))
        && (kind === 'text' || isTeacher(class_id, uid))
        && (kind === 'text' || payload);
      if (!allowed) return send(res, 403, { message: 'new row violates row-level security policy for table "messages"' });
      const row = { id: nextMessageId++, class_id, sender_id: uid, recipient_id, kind, body: text, payload, created_at: new Date().toISOString() };
      messages.push(row);
      return send(res, 201, [row]);
    }
  }
  return send(res, 404, { message: `sin ruta ${req.method} ${url.pathname}` });
}).listen(54321, () => console.log('supabase-mock listo en http://127.0.0.1:54321'));
