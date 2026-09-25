const RANK = { básico: 0, intermedio: 1, avanzado: 2 };

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
      ? { exercise: easier, reason: 'Este tema se vuelve más claro si repasás primero una base.' }
      : { exercise: current, reason: 'Podés reintentar sin perder puntos. Pedí una pista si la necesitás.' };
  }
  if (!recent.at(-1).correct) return { exercise: current, reason: 'Revisá la explicación y volvé a probar.' };
  const mastered = new Set(log.filter(entry => entry.correct).map(entry => entry.exerciseId));
  const next = exercises.find(item => item.topic === current.topic && !mastered.has(item.id) && item.id !== currentId && (RANK[item.difficulty] ?? 0) >= (RANK[current.difficulty] ?? 0))
    ?? exercises.find(item => !mastered.has(item.id) && item.id !== currentId);
  return next
    ? { exercise: next, reason: 'Ya resolviste este paso. Probá el siguiente desafío.' }
    : { exercise: current, reason: 'Completaste los ejercicios disponibles. Podés repasar cuando quieras.' };
}
