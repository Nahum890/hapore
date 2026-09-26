import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeAnswer, createCustomExercise, deleteCustomExercise, getCustomExercises } from '../src/utils/customExercises.js';
import { validateExercise } from '../src/physics/physicsValidator.js';
import { sceneForExercise } from '../src/simulator/exerciseSimulation.js';

test('computeAnswer calcula la misma respuesta que el motor físico para cada concepto', () => {
  assert.ok(Math.abs(computeAnswer('componente-horizontal', { v0: 20, angle: 30 }) - 17.32) < 0.01);
  assert.ok(Math.abs(computeAnswer('componente-vertical', { v0: 20, angle: 30 }) - 10) < 0.01);
  assert.ok(Math.abs(computeAnswer('altura-maxima', { v0: 19.6, angle: 45, gravity: 9.8 }) - 9.8) < 0.01);
  assert.ok(Math.abs(computeAnswer('tiempo-de-vuelo', { v0: 20, angle: 30, gravity: 10 }) - 2) < 0.01);
  assert.ok(Math.abs(computeAnswer('alcance', { v0: 20, angle: 30, gravity: 10 }) - 34.64) < 0.01);
  assert.ok(Math.abs(computeAnswer('angulo', { v0: 20, gravity: 10, targetDistance: 40 }) - 45) < 0.01);
});

test('computeAnswer devuelve null con datos incompletos o inválidos, no un valor inventado', () => {
  assert.equal(computeAnswer('componente-horizontal', { v0: 0, angle: 30 }), null);
  assert.equal(computeAnswer('angulo', { v0: -5, gravity: 10, targetDistance: 40 }), null);
});

test('un ejercicio creado por el docente se valida y se simula igual que uno del banco', () => {
  const before = getCustomExercises().length;
  const exercise = createCustomExercise({
    scenario: 'dron', difficulty: 'básico', question: 'Prueba: v0=20, ángulo=30°, ¿vx?',
    conceptValue: 'componente-horizontal', v0: '20', angle: '30', gravity: '9.8', hints: ['', '', '', ''],
  });
  assert.ok(exercise);
  assert.equal(getCustomExercises().length, before + 1);
  assert.ok(Math.abs(exercise.correctAnswer - 17.32) < 0.01);
  assert.equal(exercise.unit, 'm/s');
  assert.equal(exercise.hints.length, 4);
  assert.equal(validateExercise(exercise, '17.32').correct, true);
  assert.equal(validateExercise(exercise, '90').correct, false);
  // El simulador debe reaccionar a la respuesta igual que con los ejercicios fijos.
  const wrong = sceneForExercise(exercise, 90);
  const right = sceneForExercise(exercise, exercise.correctAnswer);
  assert.notEqual(wrong.flight.landingX, right.flight.landingX);
  deleteCustomExercise(exercise.id);
  assert.equal(getCustomExercises().length, before);
});

test('un ejercicio de tipo ángulo creado por el docente guarda targetDistance, no angle', () => {
  const exercise = createCustomExercise({
    scenario: 'basketball', difficulty: 'avanzado', question: 'Prueba de ángulo',
    conceptValue: 'angulo', v0: '20', gravity: '10', targetDistance: '40', hints: ['', '', '', ''],
  });
  assert.ok(exercise);
  assert.equal(exercise.unit, '°');
  assert.equal(exercise.expectedConcept, 'alcance');
  assert.ok(Math.abs(exercise.correctAnswer - 45) < 0.01);
  assert.equal(exercise.values.angle, undefined);
  assert.equal(exercise.values.targetDistance, 40);
  deleteCustomExercise(exercise.id);
});
