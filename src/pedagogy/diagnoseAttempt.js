const near = (actual, expected) => Number.isFinite(actual) && Number.isFinite(expected)
  && Math.abs(actual - expected) <= Math.max(0.01, Math.abs(expected) * 0.02);

export function diagnoseAttempt(exercise, answer) {
  const values = exercise?.values ?? {};
  const actual = Number(String(answer).replace(',', '.'));
  if (exercise?.expectedConcept === 'calor-sensible' && near(actual, Number(values.masa) * Number(values.calorEspecifico) * Number(values.temperaturaFinal)))
    return 'Usaste la temperatura final como si fuera el cambio. Primero restá temperatura final menos temperatura inicial.';
  if (exercise?.expectedConcept === 'temperatura-final' && near(actual, Number(values.calor) / (Number(values.masa) * Number(values.calorEspecifico))))
    return 'Calculaste el aumento de temperatura. Sumale la temperatura inicial para obtener la final.';
  if (exercise?.expectedConcept === 'equilibrio-termico' && near(actual, (Number(values.temperaturaCaliente) + Number(values.temperaturaFria)) / 2))
    return 'Promediaste las temperaturas por igual. Como las masas son distintas, cada una aporta una cantidad diferente de calor.';
  if (exercise?.expectedConcept === 'ley-reflexion' && 'anguloSuperficie' in values && near(actual, Number(values.anguloSuperficie)))
    return 'Tomaste el ángulo desde la superficie. La reflexión se mide desde la normal: calculá el complemento de 90°.';
  if (exercise?.expectedConcept === 'espejo-plano' && near(actual, Number(values.distanciaObjeto) * 2))
    return 'Duplicaste la distancia. Medí desde el espejo: la imagen queda igual de lejos que el objeto.';
  if (exercise?.expectedConcept === 'indice-refraccion' && near(actual, Number(values.velocidadMedio) / Number(values.velocidadVacio)))
    return 'Invertiste las velocidades. En n = c/v, la velocidad en vacío va arriba.';
  return exercise?.hints?.[1] ?? 'Identificá primero qué magnitud pide el problema y revisá la unidad.';
}
