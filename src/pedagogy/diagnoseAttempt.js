// Diagnóstico cerrado de errores típicos de Movimiento Parabólico. Compara la
// respuesta del estudiante con lo que daría aplicar una fórmula equivocada
// (confundir seno/coseno, olvidar la gravedad, etc.) para identificar el tipo
// de error y así poder pedirle al tutor una pista precisa para ese error, en
// vez de una genérica. Nunca decide si la respuesta es correcta: eso ya lo
// resolvió physicsValidator.
const toRad = deg => (deg * Math.PI) / 180;
const near = (actual, expected, relative = 0.03) =>
  Number.isFinite(actual) && Number.isFinite(expected)
  && Math.abs(actual - expected) <= Math.max(0.05, Math.abs(expected) * relative);

export function diagnoseAttempt(exercise, answer) {
  const values = exercise?.values ?? {};
  const actual = Number(String(answer ?? '').replace(',', '.'));
  const v0 = Number(values.v0);
  const angle = Number(values.angle);
  const gravity = Number(values.gravity) || 9.8;
  const concept = exercise?.expectedConcept;

  if (concept === 'componente-horizontal') {
    if (near(actual, v0 * Math.sin(toRad(angle))))
      return { key: 'confunde_componentes', message: 'Usaste el seno. La componente horizontal se calcula con el coseno del ángulo: vx = v0 · cos(ángulo).' };
    if (near(actual, v0))
      return { key: 'confunde_componentes', message: 'Pusiste la velocidad inicial completa. Multiplicala por el coseno del ángulo para quedarte solo con la parte horizontal.' };
  }
  if (concept === 'componente-vertical') {
    if (near(actual, v0 * Math.cos(toRad(angle))))
      return { key: 'confunde_componentes', message: 'Usaste el coseno. La componente vertical se calcula con el seno del ángulo: v0y = v0 · sen(ángulo).' };
    if (near(actual, v0))
      return { key: 'confunde_velocidades', message: 'Pusiste la velocidad inicial completa. Multiplicala por el seno del ángulo para quedarte solo con la parte vertical.' };
  }
  if (concept === 'altura-maxima') {
    const vy = v0 * Math.sin(toRad(angle));
    if (near(actual, vy))
      return { key: 'olvida_gravedad', message: 'Ese es el impulso vertical inicial, no la altura. Falta elevarlo al cuadrado y dividir entre 2 veces la gravedad.' };
    const rangeValue = (v0 ** 2 * Math.sin(toRad(2 * angle))) / gravity;
    if (near(actual, rangeValue))
      return { key: 'confunde_altura_alcance', message: 'Ese resultado es el alcance horizontal, no la altura máxima. Son dos fórmulas distintas.' };
  }
  if (concept === 'tiempo-de-vuelo') {
    const vy = Number(values.vy ?? v0 * Math.sin(toRad(angle)));
    if (near(actual, vy))
      return { key: 'olvida_gravedad', message: 'Esa es la velocidad vertical inicial, no el tiempo. Dividí el doble de ese valor entre la gravedad.' };
    if (Number.isFinite(vy) && near(actual, vy / gravity))
      return { key: 'olvida_gravedad', message: 'Te faltó multiplicar por 2: el tiempo de vuelo es el doble de la velocidad vertical dividido la gravedad.' };
  }
  if (concept === 'alcance') {
    if (exercise?.unit === '°') {
      if (Number.isFinite(actual) && (actual < 20 || actual > 70))
        return { key: 'angulo_desfasado', message: 'Ese ángulo queda demasiado rasante o demasiado vertical para maximizar el alcance. Probá acercarte a 45°.' };
    } else if (Number.isFinite(angle)) {
      const height = (v0 ** 2 * Math.sin(toRad(angle)) ** 2) / (2 * gravity);
      if (near(actual, height))
        return { key: 'confunde_altura_alcance', message: 'Calculaste la altura máxima, no el alcance horizontal. Son dos fórmulas distintas.' };
    }
  }
  return { key: null, message: exercise?.hints?.[1] ?? 'Identificá primero qué magnitud pide el problema y con qué componente se relaciona.' };
}
