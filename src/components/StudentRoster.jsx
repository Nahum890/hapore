import { getAccountById } from '../auth/localAccounts.js';
import { getRosterForTeacher } from '../utils/classroom.js';
import { readJSONForProfile, STORAGE_KEYS } from '../utils/storage.js';
import { getLevel } from '../utils/gamification.js';
import { topicStats } from '../pedagogy/progression.js';
import { exercises as catalogExercises } from '../data/catalogs.js';
import { getCustomExercises } from '../utils/customExercises.js';
import { getFlagState, withFlags } from '../pedagogy/flags.js';
import ClassDashboard from './ClassDashboard.jsx';
import { useTranslation } from '../i18n/LanguageProvider.jsx';

// Alumnos que se unieron con un código local en ESTE dispositivo: su
// progreso se lee directamente del perfil guardado de cada uno.
function studentFromProfile(entry, exercises) {
  const account = getAccountById(entry.studentId);
  if (!account) return null;
  const log = readJSONForProfile(entry.studentId, STORAGE_KEYS.ATTEMPT_LOG, []);
  const safeLog = Array.isArray(log) ? log : [];
  const xp = Number(readJSONForProfile(entry.studentId, STORAGE_KEYS.XP, 0)) || 0;
  return {
    id: entry.studentId,
    name: account.name,
    avatar: account.avatar,
    phone: account.phone,
    email: account.email,
    xp,
    level: getLevel(xp).level,
    confidence: Number(readJSONForProfile(entry.studentId, STORAGE_KEYS.CONFIDENCE, 0)) || 0,
    attempts: safeLog.filter(item => item?.exerciseId).length,
    correct: safeLog.filter(item => item?.correct).length,
    solved: new Set(safeLog.filter(item => item?.correct && item.exerciseId).map(item => item.exerciseId)).size,
    topicStats: topicStats(safeLog, exercises),
    log: safeLog,
  };
}

export default function StudentRoster({ teacherId, totalExercises }) {
  const { t } = useTranslation();
  // Con las banderitas del docente aplicadas: las estadísticas se agrupan por bandera.
  const exercises = withFlags([...catalogExercises, ...getCustomExercises()], getFlagState().byExercise);
  const students = getRosterForTeacher(teacherId).map(entry => studentFromProfile(entry, exercises)).filter(Boolean);
  return (
    <section className="card" aria-label={t('dash.list')}>
      <ClassDashboard students={students} totalExercises={totalExercises ?? exercises.length} exercises={exercises} />
    </section>
  );
}
