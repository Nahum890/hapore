import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planFlight, startingControls } from '../src/simulator/flightPlan.js';
import { sceneForExercise, shouldRevealSimulatorAnswer } from '../src/simulator/exerciseSimulation.js';
import exercises from '../src/data/exercises.json' with { type: 'json' };

test('el simulador usa los datos del ejercicio y llega al objetivo esperado', () => {
  const controls = startingControls({ values: { v0: 20, angle: 30 } });
  const flight = planFlight({ ...controls, gravity: 9.8, targetX: 34.64 });
  assert.deepEqual(controls, { speed: 20, angle: 30 });
  assert.ok(Math.abs(flight.landingX - 35.35) < 0.1);
  assert.equal(flight.hit, true);
  assert.equal(flight.positionAt(0).x, 0);
  assert.ok(Math.abs(flight.positionAt(1).x - flight.landingX) < 0.01);
  assert.ok(flight.points.length > 50);
});

test('el resultado distingue un lanzamiento corto y límites de controles', () => {
  const flight = planFlight({ speed: 8, angle: 15, gravity: 10, targetX: 40 });
  assert.equal(flight.hit, false);
  assert.ok(flight.error < -30);
  assert.deepEqual(startingControls({ values: { v0: 100, angle: -5 } }), { speed: 35, angle: 15 });
});

test('cada visualización calcula la magnitud del ejercicio activo', () => {
  for (const exercise of exercises) {
    const scene = sceneForExercise(exercise, exercise.correctAnswer);
    assert.ok(Math.abs(scene.measured - exercise.correctAnswer) < 0.02, exercise.id);
    assert.equal(Boolean(scene.flight), exercise.topic === 'Movimiento Parabólico', exercise.id);
  }
});

test('el ángulo escrito cambia el recorrido mostrado para la misión de entrega', () => {
  const exercise = exercises.find(item => item.id === 'ej-06');
  const wrong = sceneForExercise(exercise, 30);
  const correct = sceneForExercise(exercise, 45);
  assert.ok(wrong.flight.landingX < wrong.flight.targetX - 4);
  assert.ok(Math.abs(correct.flight.landingX - correct.flight.targetX) < 0.01);
});

test('el simulador no revela el resultado hasta que termina la comprobación', () => {
  assert.equal(shouldRevealSimulatorAnswer('idle'), false);
  assert.equal(shouldRevealSimulatorAnswer('flying'), false);
  assert.equal(shouldRevealSimulatorAnswer('landed'), true);
});
