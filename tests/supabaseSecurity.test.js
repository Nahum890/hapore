import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';

// Auditoría de seguridad (26/10/2026): ejecuta supabase/schema.sql y las
// migraciones en un PostgreSQL real (PGlite, en memoria) y prueba como alumno,
// docente, extraño y clave pública sin sesión cada ataque encontrado, más los
// usos legítimos que tienen que seguir funcionando.
const sql = file => readFileSync(new URL(`../supabase/${file}`, import.meta.url), 'utf8');

test('Supabase: las políticas resisten los ataques de la auditoría y la app sigue funcionando', { timeout: 120000 }, async () => {
const db = new PGlite();
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok, detail }); };
await db.exec(`
  create role anon nologin; create role authenticated nologin;
  create schema auth;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
`);
await db.exec(sql('schema.sql'));
await db.exec(sql('migrations/20260926_tutor_daily_quota.sql'));
await db.exec(sql('migrations/20261026_tutor_quota_fix.sql'));
await db.exec(sql('migrations/20261026_security_hardening.sql')); // idempotente: segunda pasada
await db.exec(sql('schema.sql')); // volver a correr el esquema no deshace el endurecimiento
check('esquema + migraciones se aplican (y se pueden repetir)', true);

const T = '11111111-1111-4111-8111-111111111111', S = '22222222-2222-4222-8222-222222222222', O = '33333333-3333-4333-8333-333333333333', S2 = '44444444-4444-4444-8444-444444444444';
await db.exec(`insert into auth.users (id) values ('${T}'), ('${S}'), ('${O}'), ('${S2}')`);

async function as(user, query, params) {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${user ?? ''}', false); set role ${user ? 'authenticated' : 'anon'};`);
  try { return { rows: (await db.query(query, params)).rows }; }
  catch (error) { return { error: error.message }; }
  finally { await db.exec('reset role'); }
}

// Docente crea clase, alumno se une.
const created = await as(T, `select * from public.create_class('3B', 'Profe', 'sol', '0981 111 222', 'profe@example.invalid', '{"config":{}}'::jsonb)`);
const classId = created.rows[0].id, code = created.rows[0].code;
check('crear clase con create_class', Boolean(classId) && /^[A-HJ-NP-Z2-9]{6}$/.test(code), code);
const other = await as(O, `select * from public.create_class('Otra', 'Otro', null, null, null, '{"config":{}}'::jsonb)`);
const otherClassId = other.rows[0].id;
const joined = await as(S, `select * from public.join_class($1, 'Ana', 'rio', '0982 333 444', 'ana@example.invalid')`, [code]);
check('alumno se une con el código', joined.rows?.[0]?.class_id === classId);

// DB-01: mover la membresía a otra clase con PATCH directo.
const move = await as(S, `update public.class_members set class_id = $1 where student_id = $2`, [otherClassId, S]);
check('DB-01 alumno NO puede cambiar class_id', Boolean(move.error), move.error);
const rename = await as(S, `update public.class_members set display_name = 'Profe Falso' where student_id = $1`, [S]);
check('alumno NO puede cambiar su nombre con PATCH (solo sync_my_profile)', Boolean(rename.error));
const progress = await as(S, `update public.class_members set xp = 120, error_summary = '{"olvida_gravedad": 2}' where student_id = $1 returning xp`, [S]);
check('alumno SÍ puede subir su avance', progress.rows?.[0]?.xp === 120, progress.error);
const nested = await as(S, `update public.class_members set error_summary = '{"olvida_gravedad": {"x": "texto"}}' where student_id = $1`, [S]);
check('DB-06 error_summary con objetos se rechaza', Boolean(nested.error));
const bigXp = await as(S, `update public.class_members set xp = 2147483647 where student_id = $1`, [S]);
check('DB-06 xp absurdo se rechaza', Boolean(bigXp.error));
const insertMember = await as(O, `insert into public.class_members (class_id, display_name) values ($1, 'Intruso')`, [classId]);
check('nadie se une sin código (insert directo)', Boolean(insertMember.error));

// DB-02: cuota.
let last;
for (let i = 1; i <= 17; i += 1) last = await as(S, `select * from public.consume_tutor_query(((now() at time zone 'America/Asuncion')::date))`);
check('DB-02 la consulta 16+ queda bloqueada', last.rows?.[0]?.allowed === false, JSON.stringify(last.rows?.[0] ?? last.error));
const oldDate = await as(S, `select * from public.consume_tutor_quota('2020-01-01', 'chat')`);
check('DB-03 fechas arbitrarias se rechazan', Boolean(oldDate.error));
let aux;
for (let i = 1; i <= 81; i += 1) aux = await as(S, `select * from public.consume_tutor_quota(((now() at time zone 'America/Asuncion')::date), 'aux')`);
check('cuota de ayudas (aux) bloquea en 81', aux.rows?.[0]?.allowed === false);
const anonQuota = await as(null, `select * from public.consume_tutor_quota(((now() at time zone 'America/Asuncion')::date), 'chat')`);
check('sin sesión no se puede consumir cuota', Boolean(anonQuota.error));

// DB-04: oráculo de membresía.
const oracle = await as(O, `select public.is_class_participant($1, $2) as participant, public.is_class_teacher($1, $3) as teacher`, [classId, S, T]);
check('DB-04 un extraño NO averigua quién está en la clase', oracle.rows?.[0]?.participant === false && oracle.rows?.[0]?.teacher === false, JSON.stringify(oracle.rows?.[0]));
const inside = await as(S, `select public.is_class_participant($1) as me, public.is_class_teacher($1, $2) as teacher`, [classId, T]);
check('un integrante sí puede (lo necesitan las políticas)', inside.rows?.[0]?.me === true && inside.rows?.[0]?.teacher === true);

// Mensajes.
const textOk = await as(S, `insert into public.messages (class_id, kind, body) values ($1, 'text', 'hola') returning id`, [classId]);
check('alumno manda un texto', Boolean(textOk.rows?.[0]?.id), textOk.error);
const textPayload = await as(S, `insert into public.messages (class_id, kind, body, payload) values ($1, 'text', '', $2::jsonb)`, [classId, JSON.stringify({ x: 'a'.repeat(1000) })]);
check('DB-07 texto con payload se rechaza', Boolean(textPayload.error));
const jsImage = await as(T, `insert into public.messages (class_id, kind, body, payload) values ($1, 'image', '', $2::jsonb)`, [classId, JSON.stringify({ dataUrl: 'javascript:alert(document.cookie)' })]);
check('DB-09 imagen con javascript: se rechaza (XSS)', Boolean(jsImage.error));
const extImage = await as(T, `insert into public.messages (class_id, kind, body, payload) values ($1, 'image', '', $2::jsonb)`, [classId, JSON.stringify({ dataUrl: 'https://rastreo.example/pixel.png' })]);
check('DB-09 imagen externa (rastreo) se rechaza', Boolean(extImage.error));
const goodImage = await as(T, `insert into public.messages (class_id, kind, body, payload) values ($1, 'image', '', $2::jsonb) returning id`, [classId, JSON.stringify({ dataUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==' })]);
check('imagen válida del docente se acepta', Boolean(goodImage.rows?.[0]?.id), goodImage.error);
const forged = await as(S, `insert into public.messages (class_id, sender_id, kind, body) values ($1, $2, 'text', 'soy la profe')`, [classId, T]);
check('nadie falsifica sender_id', Boolean(forged.error));
const backdated = await as(S, `insert into public.messages (class_id, kind, body, created_at) values ($1, 'text', 'x', '2000-01-01')`, [classId]);
check('nadie falsifica created_at', Boolean(backdated.error));
let flood;
for (let i = 0; i < 21; i += 1) flood = await as(S, `insert into public.messages (class_id, kind, body) values ($1, 'text', 'spam')`, [classId]);
check('más de 20 mensajes por minuto se frena', Boolean(flood.error) && /rápido/.test(flood.error), flood.error);

// Fuerza bruta de códigos.
let attempt;
const wrong = [];
for (let i = 0; i < 9; i += 1) { attempt = await as(S2, `select * from public.join_class('ZZZZZ${i}', 'Bot', null, null, null)`); wrong.push(attempt.rows?.length ?? attempt.error); }
check('código equivocado devuelve 0 filas (y queda contado)', wrong[0] === 0);
check('después de 8 códigos equivocados se bloquea', typeof wrong[8] === 'string' && /Demasiados/.test(wrong[8]), String(wrong[8]));
const blockedReal = await as(S2, `select * from public.join_class($1, 'Bot', null, null, null)`, [code]);
check('el bloqueo vale también para el código correcto', Boolean(blockedReal.error));

// Avatares y tamaños.
const badAvatar = await as(S, `select public.sync_my_profile('Ana', 'https://rastreo.example/a.png', '0982', 'ana@example.invalid')`);
check('avatar con URL externa se rechaza', Boolean(badAvatar.error));
const hugeAvatar = await as(S, `select public.sync_my_profile('Ana', $1, '0982', 'ana@example.invalid')`, ['data:image/png;base64,' + 'A'.repeat(250000)]);
check('avatar gigante se rechaza', Boolean(hugeAvatar.error));
const badEmail = await as(S, `select public.sync_my_profile('Ana', 'rio', '0982', '<script>@x.y')`);
check('correo con caracteres raros se rechaza', Boolean(badEmail.error));
const hugeContent = await as(T, `select * from public.create_class('Grande', 'Profe', null, null, null, $1::jsonb)`, [JSON.stringify({ config: {}, blob: 'a'.repeat(1_100_000) })]);
check('DB-08 contenido de clase > 1 MB se rechaza (aunque comprima bien)', Boolean(hugeContent.error));

// Rol anónimo.
const anonRead = await as(null, `select count(*) from public.classes`);
check('la clave pública sin sesión no lee tablas', Boolean(anonRead.error));
const anonRpc = await as(null, `select * from public.join_class($1, 'x', null, null, null)`, [code]);
check('la clave pública sin sesión no llama RPC', Boolean(anonRpc.error));

// Controles que deben seguir funcionando.
const directory = await as(S, `select role, phone from public.class_directory($1)`, [classId]);
check('el directorio sigue funcionando para integrantes', directory.rows?.length === 2);
const outsiderDir = await as(O, `select * from public.class_directory($1)`, [classId]);
check('el directorio no responde a extraños', outsiderDir.rows?.length === 0);
const meeting = await as(T, `insert into public.class_meetings (class_id, title, starts_at, meet_url) values ($1, 'Repaso', now() + interval '1 day', 'https://meet.google.com/abc-defg-hij') returning id`, [classId]);
check('el docente programa reuniones', Boolean(meeting.rows?.[0]?.id), meeting.error);
const teacherList = await as(T, `select c.id, (select count(*) from public.class_members m where m.class_id = c.id) as n from public.classes c where c.teacher_id = $1`, [T]);
check('el docente ve sus clases y alumnos', teacherList.rows?.[0]?.n >= 1, JSON.stringify(teacherList.rows));
const content = await as(T, `insert into public.teacher_content (kind, item_id, data) values ('lesson', 'l1', '{"id":"l1"}') on conflict (owner_id, kind, item_id) do update set data = excluded.data returning item_id`);
check('respaldo de contenido del docente', content.rows?.[0]?.item_id === 'l1', content.error);
await db.close();
const failed = results.filter(r => !r.ok).map(r => `${r.name}${r.detail ? ' — ' + r.detail : ''}`);
assert.deepEqual(failed, [], 'comprobaciones fallidas');
assert.ok(results.length >= 37, `solo ${results.length} comprobaciones`);
});
