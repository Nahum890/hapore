import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  GRAVITY,
  horizontalComponent,
  verticalComponent,
  positionX,
  positionY,
} from '../src/physics/formulas.js';
import {
  createLaunch,
  evaluateTrajectory,
  maxHeight,
  range,
  timeOfFlight,
} from '../src/physics/projectileMotion.js';
import { validateAnswer, validateExercise } from '../src/physics/physicsValidator.js';

test('componente horizontal: v0=20 m/s, 30° -> ~17,32 m/s', () => {
  assert.ok(Math.abs(horizontalComponent(20, 30) - 17.3205) < 0.001);
});

test('componente vertical: v0=20 m/s, 30° -> 10 m/s', () => {
  assert.ok(Math.abs(verticalComponent(20, 30) - 10) < 1e-9);
});

test('posición x(t) = x0 + vx·t', () => {
  assert.equal(positionX(0, 10, 2), 20);
  assert.equal(positionX(5, 10, 2), 25);
});

test('posición y(t) incluye la gravedad: y0 + vy·t - g·t²/2', () => {
  assert.ok(Math.abs(positionY(0, 20, 1) - (20 - 0.5 * GRAVITY)) < 1e-9);
});

test('altura máxima: v0=19,6 m/s y 45° -> 9,8 m', () => {
  const launch = createLaunch(19.6, 45);
  assert.ok(Math.abs(maxHeight(launch) - 9.8) < 1e-9);
});

test('alcance: v0=19,6 m/s y 45° -> 39,2 m', () => {
  const launch = createLaunch(19.6, 45);
  assert.ok(Math.abs(range(launch) - 39.2) < 1e-6);
});

test('tiempo de vuelo: 2·vy/g con y0 = 0', () => {
  const launch = createLaunch(19.6, 45);
  const expected = (2 * launch.vy) / GRAVITY;
  assert.ok(Math.abs(timeOfFlight(launch) - expected) < 1e-9);
});

test('la trayectoria termina en y ~ 0', () => {
  const launch = createLaunch(19.6, 45);
  const points = evaluateTrajectory(launch, { step: 0.05 });
  assert.ok(points.length > 1);
  const last = points[points.length - 1];
  assert.ok(Math.abs(last.y) < 1e-6);
});

test('validación: acepta coma decimal dentro de la tolerancia', () => {
  const result = validateAnswer(17.32, '17,3');
  assert.equal(result.correct, true);
});

test('validación: acepta punto decimal dentro de la tolerancia', () => {
  const result = validateAnswer(10, '10.01');
  assert.equal(result.correct, true);
});

test('validación: rechaza respuesta fuera de tolerancia', () => {
  const result = validateAnswer(17.32, '25');
  assert.equal(result.correct, false);
});

test('validación: rechaza entrada no numérica', () => {
  const result = validateAnswer(17.32, 'abc');
  assert.equal(result.correct, false);
  assert.equal(result.reason, 'not-a-number');
});

test('validateExercise usa correctAnswer y unit del ejercicio', () => {
  const exercise = { correctAnswer: 10, unit: 'm/s' };
  assert.equal(validateExercise(exercise, '10').correct, true);
  assert.equal(validateExercise(exercise, '9,99').correct, true);
  assert.equal(validateExercise(exercise, '10,5').correct, false);
});
