const RANK = { básico: 0, intermedio: 1, avanzado: 2 };

// Nombre para mostrar y concepto relacionado de cada tipo de error que ya
// diagnostica pedagogy/diagnoseAttempt.js. Sirve tanto para el plan de
// práctica del alumno como para el resumen de dificultades del docente.
export const ERROR_TYPE_INFO = {
  confunde_velocidades: { label: 'Confundir la velocidad inicial completa con una componente', concepts: ['componente-vertical', 'componente-horizontal'] },
  confunde_componentes: { label: 'Confundir seno y coseno entre horizontal y vertical', concepts: ['componente-horizontal', 'componente-vertical'] },
  confunde_altura_alcance: { label: 'Confundir la fórmula de altura máxima con la de alcance', concepts: ['altura-maxima', 'alcance'] },
  olvida_gravedad: { label: 'Olvidar la gravedad en el tiempo de vuelo', concepts: ['tiempo-de-vuelo'] },
  angulo_desfasado: { label: 'Elegir un ángulo muy rasante o muy vertical para el alcance máximo', concepts: ['alcance', 'angulo-optimo'] },
};

function errorCounts(log = []) {
  const counts = new Map();
  for (const entry of log) {
    if (!entry?.errorType) continue;
    counts.set(entry.errorType, (counts.get(entry.errorType) ?? 0) + 1);
  }
  return counts;
}

export function summarizeAttempts(log = []) {
  const valid = log.filter(entry => entry?.exerciseId);
  const correct = valid.filter(entry => entry.correct).length;
  const timed = valid.filter(entry => Number(entry.durationMs) > 0);
  return {
    attempts: valid.length,
    correct,
    accuracy: valid.length ? Math.round(100 * correct / valid.length) : 0,
    averageSeconds: timed.length ? Math.round(timed.reduce((sum, entry) => sum + entry.durationMs, 0) / timed.length / 1000) : 0,
  };
}

export function recommendExercise(exercises = [], currentId, log = []) {
  const current = exercises.find(item => item.id === currentId);
  if (!current) return null;
  const attempts = log.filter(entry => entry.exerciseId === currentId);
  const recent = attempts.slice(-2);
  if (!recent.length) return null;
  if (recent.every(entry => !entry.correct)) {
    const easier = exercises.find(item => item.topic === current.topic && (RANK[item.difficulty] ?? 0) < (RANK[current.difficulty] ?? 0));
    return easier
      ? { exercise: easier, reason: 'Este tema se vuelve más claro si repasás primero una base.', reasonKey: 'reco.easier' }
      : { exercise: current, reason: 'Podés reintentar sin perder puntos. Pedí una pista si la necesitás.', reasonKey: 'reco.retrySame' };
  }
  if (!recent.at(-1).correct) return { exercise: current, reason: 'Revisá la explicación y volvé a probar.', reasonKey: 'reco.review' };
  const mastered = new Set(log.filter(entry => entry.correct).map(entry => entry.exerciseId));
  const next = exercises.find(item => item.topic === current.topic && !mastered.has(item.id) && item.id !== currentId && (RANK[item.difficulty] ?? 0) >= (RANK[current.difficulty] ?? 0))
    ?? exercises.find(item => !mastered.has(item.id) && item.id !== currentId);
  return next
    ? { exercise: next, reason: 'Ya resolviste este paso. Probá el siguiente desafío.', reasonKey: 'reco.next' }
    : { exercise: current, reason: 'Completaste los ejercicios disponibles. Podés repasar cuando quieras.', reasonKey: 'reco.done' };
}

/** El error más repetido del alumno (mínimo 2 veces para no reaccionar a un
 * tropiezo aislado), con el nombre para mostrar y los conceptos afectados. */
export function weakestPattern(log = []) {
  const counts = errorCounts(log);
  let best = null;
  for (const [errorType, count] of counts) {
    if (count >= 2 && (!best || count > best.count)) best = { errorType, count };
  }
  if (!best) return null;
  return { ...best, ...(ERROR_TYPE_INFO[best.errorType] ?? { label: 'Un tema para repasar', concepts: [] }) };
}

/** Ejercicio corto para practicar la dificultad más repetida: distinto del
 * último intentado y, si es posible, más simple que el nivel donde falló. */
export function practiceRecommendation(exercises = [], log = []) {
  const pattern = weakestPattern(log);
  if (!pattern) return null;
  const lastId = [...log].reverse().find(entry => entry?.exerciseId)?.exerciseId;
  const candidates = exercises.filter(item => pattern.concepts.includes(item.expectedConcept));
  const exercise = candidates.find(item => item.id !== lastId && item.difficulty === 'básico')
    ?? candidates.find(item => item.id !== lastId)
    ?? candidates[0];
  if (!exercise) return null;
  return { exercise, pattern, reason: `Practicá esto: ${pattern.label.toLowerCase()}.` };
}

// Temas del panel docente: agrupan los conceptos de los ejercicios (los
// ejercicios de ángulos complementarios usan el concepto "alcance" pero se
// reconocen por tener angleA/angleB en sus datos).
export const DASHBOARD_TOPICS = ['componentes', 'tiempo', 'altura', 'alcance', 'angulos'];
const CONCEPT_TOPIC = {
  'componente-horizontal': 'componentes', 'componente-vertical': 'componentes',
  'tiempo-de-vuelo': 'tiempo', 'altura-maxima': 'altura', alcance: 'alcance', 'angulo-optimo': 'angulos',
};

export function topicForExercise(exercise, concept) {
  if (exercise?.values && ('angleA' in exercise.values || 'angleB' in exercise.values)) return 'angulos';
  if (exercise?.unit === '°') return 'angulos';
  return CONCEPT_TOPIC[exercise?.expectedConcept ?? concept] ?? null;
}

/** Intentos y aciertos por tema a partir del historial de un alumno. Los
 * intentos viejos sin `expectedConcept` se resuelven con el catálogo. */
export function topicStats(log = [], exercises = []) {
  const byId = new Map(exercises.map(item => [item.id, item]));
  const stats = {};
  for (const entry of log) {
    if (!entry?.exerciseId) continue;
    const topic = topicForExercise(byId.get(entry.exerciseId), entry.expectedConcept);
    if (!topic) continue;
    stats[topic] ??= { attempts: 0, correct: 0 };
    stats[topic].attempts += 1;
    if (entry.correct) stats[topic].correct += 1;
  }
  return stats;
}

/** Suma las estadísticas por tema de varios alumnos (valores ya agregados). */
export function mergeTopicStats(list = []) {
  const total = {};
  for (const stats of list) {
    for (const [topic, value] of Object.entries(stats ?? {})) {
      total[topic] ??= { attempts: 0, correct: 0 };
      total[topic].attempts += Number(value?.attempts) || 0;
      total[topic].correct += Number(value?.correct) || 0;
    }
  }
  return total;
}

export const percent = (correct, attempts) => (attempts > 0 ? Math.round((100 * correct) / attempts) : null);

/** Dificultades más comunes de un grupo de alumnos, combinadas (sin exponer
 * quién se equivocó), para que el docente sepa qué reforzar en clase. */
export function commonDifficulties(attemptLogs = [], limit = 3) {
  const counts = new Map();
  for (const log of attemptLogs) {
    for (const [errorType, count] of errorCounts(log)) counts.set(errorType, (counts.get(errorType) ?? 0) + count);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([errorType, count]) => ({ errorType, count, ...(ERROR_TYPE_INFO[errorType] ?? { label: errorType, concepts: [] }) }));
}
