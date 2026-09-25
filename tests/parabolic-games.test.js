import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  COMPLEMENTARY_LEVELS,
  TARGET_LEVELS,
  evaluateComplementaryChallenge,
  evaluateTargetShot,
} from '../src/games/parabolic/parabolicGamesEngine.js';
import { range } from '../src/physics/projectileMotion.js';

test('Target Challenge: impacto en el blanco evalúa resultado y puntaje determinista con precisión de examen', () => {
  // Disparo exacto para 25 metros con g = 9.8:
  // v0 = sqrt(25 * 9.8) = 15.652 m/s
  const shotHit = evaluateTargetShot({
    speed: '15,65',
    angleDeg: 45,
    targetDistance: 25,
    tolerance: 0.15,
    gravity: 9.8,
  });

  assert.equal(shotHit.result, 'perfect');
  assert.equal(shotHit.score, 100);
  assert.ok(shotHit.diff < 0.05);
  assert.ok(shotHit.points.length > 20);

  // Disparo aproximado por tanteo (15.8 m/s):
  // 15.8^2 / 9.8 = 25.47 m => se pasa 0.47m => en examen es RECHAZADO
  const shotTanteo = evaluateTargetShot({
    speed: 15.8,
    angleDeg: 45,
    targetDistance: 25,
    tolerance: 0.15,
    gravity: 9.8,
  });
  assert.equal(shotTanteo.result, 'miss');
  assert.equal(shotTanteo.score, 0);
  assert.ok(shotTanteo.diff > 0.4);

  // Disparo muy desviado
  const shotShort = evaluateTargetShot({
    speed: 12,
    angleDeg: 45,
    targetDistance: 40,
    tolerance: 0.15,
    gravity: 9.8,
  });
  assert.equal(shotShort.result, 'miss');
  assert.equal(shotShort.score, 0);
  assert.ok(shotShort.diff > 10);
});

test('Complementary Challenge: ángulos que suman 90° logran el mismo alcance exacto', () => {
  for (const level of COMPLEMENTARY_LEVELS) {
    const evalCorrect = evaluateComplementaryChallenge({
      baseAngle: level.baseAngle,
      proposedAngle: level.expectedAngle,
      speed: level.speed,
      gravity: level.gravity,
    });

    assert.equal(evalCorrect.isComplementary, true, `Falla en nivel ${level.id}`);
    assert.equal(evalCorrect.result, 'perfect');
    assert.equal(evalCorrect.score, 100);
    assert.ok(evalCorrect.diff < 1e-6);

    // Verificación con el cálculo analítico de alcance
    assert.ok(Math.abs(evalCorrect.rangeBase - evalCorrect.rangeUser) < 1e-6);
  }
});

test('Complementary Challenge: ángulo no complementario es rechazado', () => {
  const evalWrong = evaluateComplementaryChallenge({
    baseAngle: 30,
    proposedAngle: 45, // Debería ser 60
    speed: 20,
    gravity: 9.8,
  });

  assert.equal(evalWrong.isComplementary, false);
  assert.notEqual(evalWrong.result, 'perfect');
  assert.ok(evalWrong.diff > 2.0);
});

test('Complementary Challenge: acepta entrada en texto con coma o punto y rechaza mismo ángulo', () => {
  // Con coma decimal
  const evalComma = evaluateComplementaryChallenge({
    baseAngle: 30,
    proposedAngle: '60,0',
    speed: 20,
    gravity: 9.8,
  });
  assert.equal(evalComma.isComplementary, true);
  assert.equal(evalComma.result, 'perfect');
  assert.equal(evalComma.score, 100);

  // Mismo ángulo inicial ingresado
  const evalSame = evaluateComplementaryChallenge({
    baseAngle: 30,
    proposedAngle: '30',
    speed: 20,
    gravity: 9.8,
  });
  assert.equal(evalSame.isSameAngle, true);
  assert.equal(evalSame.isComplementary, false);
  assert.equal(evalSame.result, 'same-angle');
  assert.equal(evalSame.score, 0);

  // Valor no numérico
  const evalInvalid = evaluateComplementaryChallenge({
    baseAngle: 30,
    proposedAngle: 'abc',
    speed: 20,
    gravity: 9.8,
  });
  assert.equal(evalInvalid.result, 'invalid');
  assert.equal(evalInvalid.score, 0);
});
