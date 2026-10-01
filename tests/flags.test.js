import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFlag, deleteFlag, getFlagState, setExerciseFlag, withFlags } from '../src/pedagogy/flags.js';
import { topicStats } from '../src/pedagogy/progression.js';

test('las banderitas del docente agrupan las estadísticas de los alumnos', () => {
  const exercises = [
    { id: 'a', expectedConcept: 'alcance' },
    { id: 'b', expectedConcept: 'tiempo-de-vuelo' },
    { id: 'custom-1', expectedConcept: 'altura-maxima', custom: true },
  ];
  const exam = createFlag('Examen 1', '#e11d48');
  setExerciseFlag('a', exam.id);
  setExerciseFlag('custom-1', exam.id);
  const flagged = withFlags(exercises, getFlagState().byExercise);
  const log = [
    { exerciseId: 'a', correct: true },
    { exerciseId: 'custom-1', correct: false },
    { exerciseId: 'b', correct: true },
  ];
  const stats = topicStats(log, flagged);
  assert.deepEqual(stats[exam.id], { attempts: 2, correct: 1 });
  assert.deepEqual(stats.tiempo, { attempts: 1, correct: 1 });

  // Al borrar la bandera, los ejercicios vuelven a su tema automático.
  deleteFlag(exam.id);
  const back = topicStats(log, withFlags(exercises, getFlagState().byExercise));
  assert.equal(back[exam.id], undefined);
  assert.deepEqual(back.alcance, { attempts: 1, correct: 1 });
});
