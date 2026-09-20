export const DEFAULT_TOLERANCE = 0.01;

function toNumber(value) {
  if (typeof value === 'number') return value;
  return Number(String(value).trim().replace(',', '.'));
}

export function validateAnswer(expected, studentAnswer, options = {}) {
  const { tolerance = DEFAULT_TOLERANCE, unit } = options;
  const expectedNum = toNumber(expected);
  if (!Number.isFinite(expectedNum)) {
    return { correct: false, reason: 'invalid-expected', unit };
  }
  const studentNum = toNumber(studentAnswer);
  if (!Number.isFinite(studentNum)) {
    return {
      correct: false,
      reason: 'not-a-number',
      message: 'Ingresá un valor numérico (por ejemplo: 17,32).',
      unit,
    };
  }
  const diff = Math.abs(studentNum - expectedNum);
  const toleranceAbs = tolerance * Math.max(1, Math.abs(expectedNum));
  return {
    correct: diff <= toleranceAbs,
    reason: diff <= toleranceAbs ? 'ok' : 'out-of-tolerance',
    expected: expectedNum,
    student: studentNum,
    diff,
    toleranceAbs,
    unit,
  };
}

export function validateExercise(exercise, studentAnswer) {
  return validateAnswer(exercise.correctAnswer, studentAnswer, { unit: exercise.unit });
}
