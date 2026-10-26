import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planFlight, startingControls } from '../src/simulator/flightPlan.js';
import { sceneForExercise, shouldRevealSimulatorAnswer } from '../src/simulator/exerciseSimulation.js';
import { drawScene } from '../src/simulator/projectileRenderer.js';
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

test('una componente de velocidad mal calculada dibuja un vuelo distinto, no siempre el mismo', () => {
  // Caso real reportado: eb-01 pide vx (correcta 7,71 m/s). Antes de este
  // fix, cualquier respuesta (90, 12, 7.71...) dibujaba siempre el mismo
  // lanzamiento real (v0=12, ángulo=50°) y caía en el mismo punto.
  const exercise = exercises.find(item => item.id === 'eb-01');
  const guess90 = sceneForExercise(exercise, 90);
  const guess12 = sceneForExercise(exercise, 12);
  const correct = sceneForExercise(exercise, exercise.correctAnswer);
  assert.notEqual(guess90.flight.landingX, guess12.flight.landingX);
  assert.notEqual(guess12.flight.landingX, correct.flight.landingX);
  // Escena de básquet: la respuesta correcta tiene que entrar por el aro (antes
  // el aro se dibujaba a 3,05 m sobre el punto de caída y el balón pasaba por
  // debajo mientras el mensaje decía "correcto").
  assert.equal(correct.flight.targetY, 3.05);
  assert.ok(Math.abs(correct.flight.heightAtTarget - correct.flight.targetY) < 0.05);
  assert.equal(correct.flight.bballOutcome, 'swish');
  assert.equal(guess12.flight.basketSwish, false);
  assert.equal(guess90.flight.basketSwish, false);
});

test('cada respuesta correcta termina exactamente en el objetivo dibujado', () => {
  for (const exercise of exercises) {
    const { flight } = sceneForExercise(exercise, exercise.correctAnswer);
    if (exercise.scenario === 'basketball') {
      assert.ok(flight.basketSwish, `${exercise.id}: entra al aro`);
      const end = flight.positionAt(1);
      assert.ok(Math.abs(end.x - flight.targetX) < 0.2, `${exercise.id}: cae debajo del aro, no lejos (${end.x} vs ${flight.targetX})`);
      assert.ok(end.y < 1e-6, `${exercise.id}: termina en el piso`);
    } else {
      assert.ok(Math.abs(flight.landingX - flight.targetX) < 0.05, `${exercise.id}: ${flight.landingX} vs ${flight.targetX}`);
      if (flight.clearsObstacle) assert.ok(Math.abs(flight.positionAt(1).x - flight.targetX) < 0.05, `${exercise.id}: la animación termina en la marca`);
    }
  }
});

test('un ejercicio propio sin targetX ya no pone la marca en 35 m', () => {
  const exercise = { scenario: 'dron', values: { v0: 15, angle: 40, gravity: 9.8 }, expectedConcept: 'alcance', unit: 'm', correctAnswer: 22.61 };
  const { flight } = sceneForExercise(exercise, exercise.correctAnswer);
  assert.ok(Math.abs(flight.targetX - 22.61) < 0.05, String(flight.targetX));
});

test('altura, tiempo y alcance mal calculados también cambian el vuelo dibujado', () => {
  const altura = exercises.find(item => item.id === 'ej-03');
  assert.notEqual(sceneForExercise(altura, 2).flight.landingX, sceneForExercise(altura, 20).flight.landingX);

  const tiempo = exercises.find(item => item.id === 'ej-mec-03');
  assert.notEqual(sceneForExercise(tiempo, 0.5).flight.duration, sceneForExercise(tiempo, 5).flight.duration);

  const alcanceDesdeVxT = exercises.find(item => item.id === 'ej-04');
  assert.notEqual(sceneForExercise(alcanceDesdeVxT, 5).flight.landingX, sceneForExercise(alcanceDesdeVxT, 60).flight.landingX);

  const alcanceDesdeV0 = exercises.find(item => item.id === 'ej-07');
  assert.notEqual(sceneForExercise(alcanceDesdeV0, 5).flight.landingX, sceneForExercise(alcanceDesdeV0, 60).flight.landingX);
});

test('el simulador no revela el resultado hasta que termina la comprobación', () => {
  assert.equal(shouldRevealSimulatorAnswer('idle'), false);
  assert.equal(shouldRevealSimulatorAnswer('flying'), false);
  assert.equal(shouldRevealSimulatorAnswer('landed'), true);
});

test('los rótulos de los escenarios del lienzo cambian entre español y Jopara', () => {
  const captureCanvasText = () => {
    const text = [];
    const gradient = { addColorStop() {} };
    const ctx = new Proxy({
      fillText: value => text.push(String(value)),
      strokeText: value => text.push(String(value)),
      measureText: value => ({ width: String(value).length * 5 }),
      createLinearGradient: () => gradient,
      createRadialGradient: () => gradient,
    }, { get: (target, key) => target[key] ?? (() => {}), set: (target, key, value) => { target[key] = value; return true; } });
    return { ctx, text };
  };
  const wallFlight = planFlight({ speed: 18, angle: 45, gravity: 9.8, targetX: 30, obstacle: { x: 8, height: 1.5 } });
  const basketballFlight = planFlight({ speed: 8, angle: 50, gravity: 9.8, targetX: 4.6, targetY: 3.05, wind: 2 });

  for (const [scenario, flight, expectedJopara, expectedSpanish] of [
    ['wall', wallFlight, 'ÑEMOMBO', 'LANZAMIENTO'],
    ['basketball', basketballFlight, 'Ñemombo', 'Lanzamiento'],
  ]) {
    const jopara = captureCanvasText();
    drawScene(jopara.ctx, { width: 640, height: 360, flight, scenario, language: 'gn-jopara' });
    assert.ok(jopara.text.some(value => value.includes(expectedJopara)), `${scenario}: etiqueta Jopara`);
    assert.ok(jopara.text.every(value => !/🏀|🌬️|💥|✅/.test(value)), `${scenario}: sin emojis`);

    const spanish = captureCanvasText();
    drawScene(spanish.ctx, { width: 640, height: 360, flight, scenario, language: 'es' });
    assert.ok(spanish.text.some(value => value.includes(expectedSpanish)), `${scenario}: etiqueta en español`);
  }
});
