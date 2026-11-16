// Qué intentos de un ejercicio de práctica se guardan en el progreso.
// Se guarda el primer intento equivocado (sirve para el plan de práctica y las
// dificultades frecuentes del docente) y el primer acierto, aunque llegue
// después de un error: equivocarse y corregir también es aprender.
export const emptyRecording = () => ({ wrong: false, correct: false });

/** Devuelve el estado nuevo si este intento se tiene que guardar, o null si no. */
export function nextRecording(recording, correct) {
  const current = recording ?? emptyRecording();
  if (correct) return current.correct ? null : { ...current, correct: true };
  if (current.correct || current.wrong) return null;
  return { ...current, wrong: true };
}
