import test from 'node:test';
import assert from 'node:assert/strict';
import { register, updateProfile, listAccounts, getAccountById, hasContactInfo } from '../src/auth/localAccounts.js';
import { registerClassCode, getClassCodeOwner, joinClass, leaveClass, getTeacherLinkForStudent, getRosterForTeacher } from '../src/utils/classroom.js';
import { readJSONForProfile, setActiveProfile, writeJSON, STORAGE_KEYS } from '../src/utils/storage.js';

function withLocalStorage(run) {
  const data = new Map();
  globalThis.localStorage = {
    getItem: key => data.has(key) ? data.get(key) : null,
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: key => data.delete(key),
  };
  return Promise.resolve().then(run).finally(() => { delete globalThis.localStorage; });
}

test('updateProfile guarda teléfono, correo y avatar sin tocar la contraseña', () => withLocalStorage(async () => {
  const account = await register({ name: 'Marta', username: 'Marta_1', password: 'claveSegura1', role: 'maestro', phone: '0981 123 456', email: 'prueba@ejemplo.com' });
  const updated = updateProfile(account.id, { phone: '0981 000 000', email: 'marta@ejemplo.com', avatar: 'sol' });
  assert.equal(updated.phone, '0981 000 000');
  assert.equal(updated.email, 'marta@ejemplo.com');
  assert.equal(updated.avatar, 'sol');
  assert.equal(getAccountById(account.id).avatar, 'sol');
  assert.equal(listAccounts().length, 1);
  assert.ok(!('passwordHash' in updated));
}));

test('crear cuenta exige teléfono y correo válidos; la foto se valida', () => withLocalStorage(async () => {
  const base = { name: 'Sin Datos', username: 'sin_datos', password: 'claveSegura1', role: 'alumno' };
  await assert.rejects(register(base), /teléfono/);
  await assert.rejects(register({ ...base, phone: '0981 123 456' }), /correo/);
  await assert.rejects(register({ ...base, phone: '12', email: 'a@b.com' }), /teléfono/);
  await assert.rejects(register({ ...base, phone: '0981 123 456', email: 'sin-arroba' }), /correo/);
  const account = await register({ ...base, phone: '+595 981 123 456', email: 'Alumno@Ejemplo.com' });
  assert.equal(account.email, 'alumno@ejemplo.com');
  assert.ok(hasContactInfo(account));
  assert.equal(hasContactInfo({ phone: '', email: '' }), false);
  const photo = 'data:image/jpeg;base64,' + 'A'.repeat(100);
  assert.equal(updateProfile(account.id, { avatar: photo }).avatar, photo);
  assert.throws(() => updateProfile(account.id, { avatar: 'data:text/html;base64,AAAA' }), /foto/);
  assert.throws(() => updateProfile(account.id, { email: '' }), /correo/);
}));

test('un docente ve en su lista a los alumnos que se unieron con su código, no a otros', () => withLocalStorage(async () => {
  const teacher = await register({ name: 'Profe Rosa', username: 'rosa_1', password: 'claveSegura1', role: 'maestro', phone: '0981 123 456', email: 'prueba@ejemplo.com' });
  const otroDocente = await register({ name: 'Profe Juan', username: 'juan_1', password: 'claveSegura1', role: 'maestro', phone: '0981 123 456', email: 'prueba@ejemplo.com' });
  const alumno = await register({ name: 'Test Alumno', username: 'alumno_1', password: 'claveSegura1', role: 'alumno', phone: '0981 123 456', email: 'prueba@ejemplo.com' });

  const code = 'GP10A03';
  registerClassCode({ teacherId: teacher.id, code, config: { flashcards: 10, ejercicios: 3, subtemas: ['dron'] } });
  assert.equal(getClassCodeOwner(code), teacher.id);
  assert.equal(getClassCodeOwner('GP99Z99'), null);

  joinClass({ studentId: alumno.id, code });
  assert.deepEqual(getTeacherLinkForStudent(alumno.id), { studentId: alumno.id, teacherId: teacher.id, code, joinedAt: getTeacherLinkForStudent(alumno.id).joinedAt });

  const rosaRoster = getRosterForTeacher(teacher.id);
  assert.equal(rosaRoster.length, 1);
  assert.equal(rosaRoster[0].studentId, alumno.id);
  assert.equal(getRosterForTeacher(otroDocente.id).length, 0);

  // El docente puede leer el progreso del alumno sin cambiar de perfil activo.
  setActiveProfile(teacher.id);
  writeJSON(STORAGE_KEYS.XP, 999); // esto es del docente, no debe verse al leer el perfil del alumno
  setActiveProfile(alumno.id);
  writeJSON(STORAGE_KEYS.XP, 120);
  setActiveProfile(teacher.id);
  assert.equal(readJSONForProfile(alumno.id, STORAGE_KEYS.XP, 0), 120);
  assert.equal(readJSONForProfile(teacher.id, STORAGE_KEYS.XP, 0), 999);

  leaveClass(alumno.id);
  assert.equal(getTeacherLinkForStudent(alumno.id), null);
  assert.equal(getRosterForTeacher(teacher.id).length, 0);
  setActiveProfile(null);
}));
