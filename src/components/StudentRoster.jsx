import { getAccountById } from '../auth/localAccounts.js';
import { getRosterForTeacher } from '../utils/classroom.js';
import { readJSONForProfile, STORAGE_KEYS } from '../utils/storage.js';
import { getLevel } from '../utils/gamification.js';
import { commonDifficulties } from '../pedagogy/progression.js';
import Avatar from './Avatars.jsx';

// Dificultades más repetidas entre TODOS los alumnos de esta lista, sin decir
// quién se equivocó: sirve para saber qué reforzar en la próxima clase.
function CommonDifficulties({ roster }) {
  const logs = roster.map(({ entry }) => readJSONForProfile(entry.studentId, STORAGE_KEYS.ATTEMPT_LOG, []));
  const difficulties = commonDifficulties(logs);
  if (!difficulties.length) return null;
  return <div className="teacher-block common-difficulties" aria-label="Dificultades frecuentes de la clase">
    <h3>Dificultades frecuentes en la clase</h3>
    <p className="teacher-note">Errores que se repitieron entre tus alumnos, sin identificar a quién le pasó. Sirve para elegir qué reforzar.</p>
    <ul className="common-difficulties-list">
      {difficulties.map(item => <li key={item.errorType}>
        <strong>{item.label}</strong>
        <span className="chip">{item.count} veces</span>
      </li>)}
    </ul>
    <p className="field-help">Actividad sugerida: repasá con el simulador un ejercicio de {difficulties[0].concepts[0]?.replace(/-/g, ' ') ?? 'este tema'} en el proyector o en Mis clases.</p>
  </div>;
}

function studentSnapshot(entry) {
  const account = getAccountById(entry.studentId);
  const xp = Number(readJSONForProfile(entry.studentId, STORAGE_KEYS.XP, 0)) || 0;
  const attempts = Number(readJSONForProfile(entry.studentId, STORAGE_KEYS.ATTEMPTS, 0)) || 0;
  const confidence = Number(readJSONForProfile(entry.studentId, STORAGE_KEYS.CONFIDENCE, 0)) || 0;
  return { entry, account, xp, attempts, confidence, level: getLevel(xp) };
}

export default function StudentRoster({ teacherId }) {
  const roster = getRosterForTeacher(teacherId).map(studentSnapshot).filter(item => item.account);
  return (
    <section className="card" aria-label="Tus alumnos">
      <h2>Tus alumnos</h2>
      <p className="teacher-note">
        Alumnos que se unieron a un código de clase generado por vos, en este dispositivo. Si practican en otro
        teléfono o computadora, no hay forma de verlos acá: la app no tiene servidor ni sincroniza entre dispositivos.
      </p>
      {roster.length === 0 ? (
        <p className="field-help">Todavía no hay alumnos unidos a tu clase en este dispositivo.</p>
      ) : (
        <ul className="aula-list roster-list">
          {roster.map(({ entry, account, xp, attempts, confidence, level }) => (
            <li key={entry.studentId} className="aula-item roster-item">
              <Avatar id={account.avatar} size={44} />
              <div className="roster-info">
                <h3>{account.name}</h3>
                <p>@{account.username}{account.phone ? ` · ${account.phone}` : ''}{account.email ? ` · ${account.email}` : ''}</p>
                <div className="roster-stats">
                  <span className="chip">{xp} XP · Nivel {level.level}</span>
                  <span className="chip">{attempts} intentos</span>
                  <span className="chip">Confianza {confidence}/100</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      {roster.length > 0 && <CommonDifficulties roster={roster} />}
    </section>
  );
}
