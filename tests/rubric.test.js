import test from 'node:test';
import assert from 'node:assert/strict';
import exercises from '../src/data/exercises.json' with { type: 'json' };
import flashcards from '../src/data/flashcards.json' with { type: 'json' };
import quizBank from '../src/ai/quizBank.json' with { type: 'json' };
import { sceneForExercise } from '../src/simulator/exerciseSimulation.js';
import { validateExercise } from '../src/physics/physicsValidator.js';
import { encodeClassConfig, decodeClassConfig, selectClassExercises } from '../src/utils/classCode.js';
import { diagnoseAttempt } from '../src/pedagogy/diagnoseAttempt.js';
import { recommendExercise, summarizeAttempts } from '../src/pedagogy/progression.js';

test('cada situación de Movimiento Parabólico incluye práctica graduada y material de repaso', () => {
  for (const scenario of ['dron', 'basketball', 'wall']) {
    const group = exercises.filter(item => item.scenario === scenario);
    assert.ok(group.length >= 3);
    assert.ok(group.some(item => item.difficulty === 'básico'));
    assert.ok(group.some(item => item.difficulty === 'avanzado'));
    assert.ok(group.every(item => item.questionJopara && item.hints.length >= 4));
  }
  assert.ok(flashcards.length >= 8);
  assert.ok(quizBank.filter(item => item.tipo === 'abierta').length >= 5);
});

test('el modelo visual calcula el mismo resultado que el corrector en todos los ejercicios', () => {
  for (const exercise of exercises) {
    const { measured } = sceneForExercise(exercise, exercise.correctAnswer);
    assert.ok(Number.isFinite(measured), exercise.id);
    assert.ok(Math.abs(measured - exercise.correctAnswer) < 0.02, exercise.id);
    assert.equal(validateExercise(exercise, String(measured)).correct, true, exercise.id);
  }
});

test('los códigos de clase seleccionan ejercicios de las situaciones habilitadas', () => {
  const config = { flashcards: 10, ejercicios: 4, subtemas: ['dron', 'basketball'] };
  assert.deepEqual(decodeClassConfig(encodeClassConfig(config)), config);
  const selection = selectClassExercises(exercises, config);
  assert.deepEqual(selection.map(item => item.scenario), ['dron', 'basketball', 'dron', 'basketball']);
  // La taxonomía cambió de temas a situaciones: los códigos de la versión
  // anterior (con termodinámica/óptica) ya no tienen un equivalente y no se
  // decodifican, en vez de mapear a un resultado sin sentido.
  assert.equal(decodeClassConfig('GP10P03'), null);
});

test('retroalimentación identifica errores de procedimiento frecuentes de movimiento parabólico', () => {
  const horizontal = exercises.find(item => item.id === 'ej-01');
  const swapped = diagnoseAttempt(horizontal, 20 * Math.sin((30 * Math.PI) / 180));
  assert.equal(swapped.key, 'confunde_componentes');
  assert.match(swapped.message, /coseno/i);

  const vertical = exercises.find(item => item.id === 'ej-02');
  const usedCos = diagnoseAttempt(vertical, 20 * Math.cos((30 * Math.PI) / 180));
  assert.equal(usedCos.key, 'confunde_componentes');
  assert.match(usedCos.message, /seno/i);
});

test('el progreso registra aciertos y recomienda reforzar tras dos fallos', () => {
  const dron = exercises.filter(item => item.scenario === 'dron');
  const current = dron.find(item => item.difficulty === 'avanzado');
  const log = [{ exerciseId: current.id, correct: false, durationMs: 12000 }, { exerciseId: current.id, correct: false, durationMs: 8000 }];
  assert.equal(summarizeAttempts(log).averageSeconds, 10);
  assert.equal(recommendExercise(dron, current.id, log).exercise.difficulty, 'básico');
});
