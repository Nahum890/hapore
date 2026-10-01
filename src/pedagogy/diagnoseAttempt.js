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

// Cada diagnóstico tiene su texto en castellano y un borrador en Jopara (sin
// revisión lingüística todavía, igual que el resto del contenido en Jopara).
const MESSAGES = {
  seno_por_coseno: {
    es: 'Usaste el seno. La componente horizontal se calcula con el coseno del ángulo: vx = v0 · cos(ángulo).',
    jopara: 'Reipuru seno. Pe componente horizontal-pe g̃uarã ojeipuru coseno: vx = v0 · cos(ángulo).',
  },
  v0_completa_horizontal: {
    es: 'Pusiste la velocidad inicial completa. Multiplicala por el coseno del ángulo para quedarte solo con la parte horizontal.',
    jopara: 'Remoĩ velocidad inicial completa. Emultiplica coseno del ángulo reheve reguereko hag̃ua parte horizontal añoite.',
  },
  coseno_por_seno: {
    es: 'Usaste el coseno. La componente vertical se calcula con el seno del ángulo: v0y = v0 · sen(ángulo).',
    jopara: 'Reipuru coseno. Pe componente vertical-pe g̃uarã ojeipuru seno: v0y = v0 · sen(ángulo).',
  },
  v0_completa_vertical: {
    es: 'Pusiste la velocidad inicial completa. Multiplicala por el seno del ángulo para quedarte solo con la parte vertical.',
    jopara: 'Remoĩ velocidad inicial completa. Emultiplica seno del ángulo reheve reguereko hag̃ua parte vertical añoite.',
  },
  impulso_no_altura: {
    es: 'Ese es el impulso vertical inicial, no la altura. Falta elevarlo al cuadrado y dividir entre 2 veces la gravedad.',
    jopara: 'Upéva ha\'e impulso vertical inicial, ndaha\'éi altura. Ofalta: ejapo cuadrado ha edividi 2 · g-pe.',
  },
  alcance_no_altura: {
    es: 'Ese resultado es el alcance horizontal, no la altura máxima. Son dos fórmulas distintas.',
    jopara: 'Ko resultado ha\'e alcance horizontal, ndaha\'éi altura máxima. Ha\'e mokõi fórmula iñambuéva.',
  },
  vy_no_tiempo: {
    es: 'Esa es la velocidad vertical inicial, no el tiempo. Dividí el doble de ese valor entre la gravedad.',
    jopara: 'Upéva ha\'e velocidad vertical inicial, ndaha\'éi tiempo. Emultiplica 2 reheve ha edividi g-pe.',
  },
  falta_multiplicar_2: {
    es: 'Te faltó multiplicar por 2: el tiempo de vuelo es el doble de la velocidad vertical dividido la gravedad.',
    jopara: 'Ofalta emultiplica 2 reheve: tiempo de vuelo ha\'e 2 · v0y dividido g.',
  },
  angulo_desfasado: {
    es: 'Ese ángulo queda demasiado rasante o demasiado vertical para maximizar el alcance. Probá acercarte a 45°.',
    jopara: 'Ko ángulo michĩeterei térã yvateeterei alcance máximo-pe g̃uarã. Eñeha\'ã eñemboja 45°-pe.',
  },
  altura_no_alcance: {
    es: 'Calculaste la altura máxima, no el alcance horizontal. Son dos fórmulas distintas.',
    jopara: 'Recalcula altura máxima, ndaha\'éi alcance horizontal. Ha\'e mokõi fórmula iñambuéva.',
  },
  default: {
    es: 'Identificá primero qué magnitud pide el problema y con qué componente se relaciona.',
    jopara: 'Emyesakã raẽ mba\'e magnitud-pa ojerure pe ejercicio ha mba\'e componente ndive oñembojoaju.',
  },
};

function pick(entryKey, language) {
  const entry = MESSAGES[entryKey] ?? MESSAGES.default;
  return language === 'es' ? entry.es : entry.jopara;
}

export function diagnoseAttempt(exercise, answer, language = 'es') {
  const values = exercise?.values ?? {};
  const actual = Number(String(answer ?? '').replace(',', '.'));
  const v0 = Number(values.v0);
  const angle = Number(values.angle);
  const gravity = Number(values.gravity) || 9.8;
  const concept = exercise?.expectedConcept;

  if (concept === 'componente-horizontal') {
    if (near(actual, v0 * Math.sin(toRad(angle))))
      return { key: 'confunde_componentes', message: pick('seno_por_coseno', language) };
    if (near(actual, v0))
      return { key: 'confunde_componentes', message: pick('v0_completa_horizontal', language) };
  }
  if (concept === 'componente-vertical') {
    if (near(actual, v0 * Math.cos(toRad(angle))))
      return { key: 'confunde_componentes', message: pick('coseno_por_seno', language) };
    if (near(actual, v0))
      return { key: 'confunde_velocidades', message: pick('v0_completa_vertical', language) };
  }
  if (concept === 'altura-maxima') {
    const vy = v0 * Math.sin(toRad(angle));
    if (near(actual, vy))
      return { key: 'olvida_gravedad', message: pick('impulso_no_altura', language) };
    const rangeValue = (v0 ** 2 * Math.sin(toRad(2 * angle))) / gravity;
    if (near(actual, rangeValue))
      return { key: 'confunde_altura_alcance', message: pick('alcance_no_altura', language) };
  }
  if (concept === 'tiempo-de-vuelo') {
    const vy = Number(values.vy ?? v0 * Math.sin(toRad(angle)));
    if (near(actual, vy))
      return { key: 'olvida_gravedad', message: pick('vy_no_tiempo', language) };
    if (Number.isFinite(vy) && near(actual, vy / gravity))
      return { key: 'olvida_gravedad', message: pick('falta_multiplicar_2', language) };
  }
  if (concept === 'alcance') {
    if (exercise?.unit === '°') {
      if (Number.isFinite(actual) && (actual < 20 || actual > 70))
        return { key: 'angulo_desfasado', message: pick('angulo_desfasado', language) };
    } else if (Number.isFinite(angle)) {
      const height = (v0 ** 2 * Math.sin(toRad(angle)) ** 2) / (2 * gravity);
      if (near(actual, height))
        return { key: 'confunde_altura_alcance', message: pick('altura_no_alcance', language) };
    }
  }
  return { key: null, message: (language === 'es' && exercise?.hints?.[1]) || pick('default', language) };
}
