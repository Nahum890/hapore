export const ERROR_DETAILS = {
  confunde_componentes: {
    label: 'Seno y coseno en las componentes',
    activity: 'Dibujar el triángulo de la velocidad y marcar qué lado queda horizontal y cuál vertical antes de elegir la razón trigonométrica.',
  },
  confunde_velocidades: {
    label: 'Velocidad inicial y componente vertical',
    activity: 'Comparar v0 con v0y en dos ángulos distintos y explicar por qué la componente vertical puede ser menor que la velocidad inicial.',
  },
  olvida_gravedad: {
    label: 'Efecto de la gravedad en el vuelo',
    activity: 'Resolver una predicción corta de tiempo de vuelo o altura máxima e identificar en qué parte de la fórmula aparece g.',
  },
  confunde_altura_alcance: {
    label: 'Altura máxima y alcance horizontal',
    activity: 'Marcar en una trayectoria dónde se mide la altura y dónde el alcance; después asociar cada medida con su fórmula.',
  },
  angulo_desfasado: {
    label: 'Ángulo y alcance',
    activity: 'Comparar dos ángulos complementarios y predecir cuál combinación produce mayor alcance bajo las mismas condiciones.',
  },
};

const knownError = key => Object.hasOwn(ERROR_DETAILS, key);

export function summarizeErrorCounts(attemptLog = []) {
  const counts = {};
  for (const item of Array.isArray(attemptLog) ? attemptLog : []) {
    if (item?.correct || !knownError(item?.errorType)) continue;
    counts[item.errorType] = (counts[item.errorType] ?? 0) + 1;
  }
  return counts;
}

export function getRepeatedErrorFocus(attemptLog = []) {
  const recent = (Array.isArray(attemptLog) ? attemptLog : []).slice(-30);
  const counts = summarizeErrorCounts(recent);
  const [key, count] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0] ?? [];
  return key && count >= 2 ? { key, count, ...ERROR_DETAILS[key] } : null;
}

export function aggregateClassDifficulties(members = []) {
  const summaries = members.map(member => member?.error_summary ?? {});
  const activeStudents = members.filter((member, index) => Number(member?.attempts) > 0 || Object.values(summaries[index]).some(value => Number(value) > 0)).length;
  if (activeStudents < 3) return { activeStudents, ready: false, challenges: [] };
  const studentsByError = {};
  for (const summary of summaries) {
    for (const [key, rawCount] of Object.entries(summary)) {
      if (knownError(key) && Number(rawCount) >= 2) studentsByError[key] = (studentsByError[key] ?? 0) + 1;
    }
  }
  const challenges = Object.entries(studentsByError)
    .filter(([, count]) => count >= 2)
    .map(([key, count]) => ({ key, count, ...ERROR_DETAILS[key] }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);
  return { activeStudents, ready: true, challenges };
}
