import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyRecording, nextRecording } from '../src/pedagogy/practiceRecording.js';
import { setActiveProfile } from '../src/utils/storage.js';
import { getXP, XP_REWARDS } from '../src/utils/gamification.js';
import { recordExerciseResult, loadLearningState } from '../src/pedagogy/learningState.js';
import { topicStats } from '../src/curriculum/progress.js';

// Aplica una secuencia de respuestas (true = correcta) y devuelve cuáles se guardaron.
function recordedSequence(answers) {
  let recording = emptyRecording();
  return answers.map(correct => {
    const next = nextRecording(recording, correct);
    if (next) recording = next;
    return Boolean(next);
  });
}

// Simula la práctica de un tema: solo envía al progreso los intentos que la
// regla dice que se guardan (como TopicPractice.jsx).
function practice(exerciseId, answers) {
  let recording = emptyRecording();
  let hintShown = false;
  for (const correct of answers) {
    const next = nextRecording(recording, correct);
    if (next) {
      recording = next;
      recordExerciseResult({ correct, hintsUsed: hintShown ? 1 : 0, exerciseId, scenario: 'vectores', expectedConcept: 'vectores', errorType: correct ? null : 'calculo' });
    }
    if (!correct) hintShown = true; // después de un error, la app muestra la pista
  }
}

test('se guarda el primer error y el primer acierto, nada más', () => {
  assert.deepEqual(recordedSequence([false, false, true, true]), [true, false, true, false]);
});

test('acierto directo: después de acertar no se guardan errores', () => {
  assert.deepEqual(recordedSequence([true, false]), [true, false]);
});

test('tolera un estado vacío', () => {
  assert.deepEqual(nextRecording(undefined, false), { wrong: true, correct: false });
});

test('equivocarse y después acertar suma XP con pista (25)', () => {
  setActiveProfile('test-acierto-tras-error');
  const before = getXP();
  practice('vectores:vec-resultant#1', [false, true]);
  assert.equal(getXP() - before, XP_REWARDS.exerciseWithHints);
  assert.deepEqual(loadLearningState().attemptLog.map(attempt => attempt.correct), [false, true]);
});

test('las estadísticas del tema cuentan el acierto que llega después del error', () => {
  setActiveProfile('test-estadisticas-tema');
  practice('vectores:vec-resultant#2', [false, true]);
  assert.deepEqual(topicStats(loadLearningState().attemptLog), { vectores: { attempts: 2, correct: 1 } });
});
