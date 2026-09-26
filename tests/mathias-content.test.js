import { test } from 'node:test';
import assert from 'node:assert/strict';
import exercises from '../src/data/exercises.json' with { type: 'json' };
import cards from '../src/data/flashcards.json' with { type: 'json' };
import concepts from '../src/data/concepts.json' with { type: 'json' };
import tutor from '../src/data/tutor_jopara.json' with { type: 'json' };
import { scenarioMatchesConfig, encodeClassConfig, decodeClassConfig } from '../src/utils/classCode.js';
import { validateExercise } from '../src/physics/physicsValidator.js';

const SCENARIOS = ['dron', 'basketball', 'wall'];

for (const [label, rows] of Object.entries({ exercises, cards, concepts })) {
  test(label + ' tiene IDs únicos', () => assert.equal(new Set(rows.map(item => item.id)).size, rows.length));
}

for (const scenario of SCENARIOS) {
  test(scenario + ' tiene ejercicios propios', () => {
    assert.ok(exercises.filter(item => item.scenario === scenario).length >= 3);
    assert.ok(exercises.every(item => item.topic === 'Movimiento Parabólico'));
  });
}

test('los ejercicios nuevos aceptan su resultado y conservan pistas y unidades', () => {
  for (const item of exercises) {
    assert.ok(item.hints?.length >= 4, item.id);
    assert.ok(concepts.some(concept => concept.id === item.expectedConcept), item.id);
    assert.equal(validateExercise(item, String(item.correctAnswer)).correct, true, item.id);
    assert.ok(item.unit, item.id);
    assert.ok(['dron', 'basketball', 'wall'].includes(item.scenario), item.id);
  }
});

test('el código de aula selecciona ejercicios reales de cada situación', () => {
  for (const scenario of SCENARIOS) {
    const decoded = decodeClassConfig(encodeClassConfig({ flashcards: 10, ejercicios: 3, subtemas: [scenario] }));
    assert.ok(decoded);
    assert.ok(exercises.filter(item => scenarioMatchesConfig(item.scenario, decoded.subtemas)).length >= 3);
  }
});

test('se mantiene la revisión lingüística pendiente y las pistas por tipo de error cubren los 5 casos', () => {
  assert.match(tutor._reviewNote, /pendient|borrador/i);
  for (const key of ['confunde_velocidades', 'confunde_componentes', 'confunde_altura_alcance', 'olvida_gravedad', 'angulo_desfasado']) {
    assert.ok(tutor.hintLevels?.byErrorType?.[key], key);
  }
});
