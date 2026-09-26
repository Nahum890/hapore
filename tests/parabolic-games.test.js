import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BASKETBALL_LEVELS,
  FREEKICK_LEVELS,
  TARGET_LEVELS,
  COMPLEMENTARY_LEVELS,
  evaluateBasketballShot,
  evaluateFreeKickShot,
  evaluateTargetShot,
  evaluateComplementaryChallenge,
  GAMES_I18N,
} from '../src/games/parabolic/parabolicGamesEngine.js';
import { planFlight } from '../src/simulator/flightPlan.js';

test('Básquetbol: aro suspendido a 3.05 m evalúa enceste en trayectoria descendente', () => {
  const level = BASKETBALL_LEVELS[0]; // Tiro libre: d = 4.60 m, aro = 3.05 m, salida = 1.80 m
  assert.equal(level.hoopHeight, 3.05);
  assert.equal(level.releaseHeight, 1.80);

  // Tiro bien calibrado con ~7.68 m/s a 52°
  const goodShot = evaluateBasketballShot({
    speed: 7.68,
    angleDeg: 52,
    distance: level.distance,
    hoopHeight: level.hoopHeight,
    releaseHeight: level.releaseHeight,
    gravity: 9.8,
    wind: 0,
  });

  assert.ok(['swish', 'rim-in'].includes(goodShot.result));
  assert.ok(goodShot.score >= 70);
  assert.equal(goodShot.isDescending, true, 'El balón debe descender para encestar');
  assert.ok(Math.abs(goodShot.heightAtHoop - 3.05) <= 0.32);

  // Tiro con gran rapidez que llega subiendo (ascendente): debe ser rechazado
  const ascendingShot = evaluateBasketballShot({
    speed: 15.0,
    angleDeg: 60,
    distance: level.distance,
    hoopHeight: level.hoopHeight,
    releaseHeight: level.releaseHeight,
    gravity: 9.8,
    wind: 0,
  });
  assert.equal(ascendingShot.result, 'ascending');
  assert.equal(ascendingShot.isDescending, false);

  // Tiro corto
  const shortShot = evaluateBasketballShot({
    speed: 4.5,
    angleDeg: 50,
    distance: level.distance,
    hoopHeight: level.hoopHeight,
    releaseHeight: level.releaseHeight,
    gravity: 9.8,
    wind: 0,
  });
  assert.equal(shortShot.result, 'short');
});

test('Básquetbol: proporciones oficiales aro (45 cm) vs balón (24 cm) y entorno techado ideal', () => {
  const rimDiameterMeters = 0.45;
  const ballDiameterMeters = 0.24;
  const ratio = rimDiameterMeters / ballDiameterMeters;
  assert.ok(ratio > 1.8 && ratio < 1.9, 'El aro es aproximadamente 1.875 veces más ancho que el balón');

  // Cancha techada (sin viento): vuelo parabólico ideal
  const indoorFlight = planFlight({
    speed: 8.0,
    angle: 50,
    gravity: 9.8,
    targetX: 4.60,
    targetY: 3.05,
    wind: 0,
  });
  assert.equal(indoorFlight.environment.isIndoor, true);
  assert.equal(indoorFlight.environment.wind, 0);

  // Cancha exterior con viento: deriva simulada
  const outdoorFlight = planFlight({
    speed: 8.0,
    angle: 50,
    gravity: 9.8,
    targetX: 4.60,
    targetY: 3.05,
    wind: 3.0,
  });
  assert.equal(outdoorFlight.environment.isIndoor, false);
  assert.equal(outdoorFlight.environment.wind, 3.0);
  assert.ok(outdoorFlight.points[outdoorFlight.points.length - 1].x > indoorFlight.points[indoorFlight.points.length - 1].x);
});

test('Tiro Libre (Roberto Carlos): barrera FIFA a 9.15 m y arco a 2.44 m de travesaño', () => {
  const level1 = FREEKICK_LEVELS[0]; // 25 m
  assert.equal(level1.barrierDistance, 9.15);
  assert.equal(level1.barrierHeight, 1.80);
  assert.equal(level1.goalHeight, 2.44);

  // Golazo: supera los 1.80 m en x=9.15 m y entra por debajo de 2.44 m en x=25 m
  const goalShot = evaluateFreeKickShot({
    speed: 18.5,
    angleDeg: 24,
    distance: 25.0,
    barrierDistance: 9.15,
    barrierHeight: 1.80,
    goalHeight: 2.44,
    gravity: 9.8,
  });

  assert.equal(goalShot.clearsBarrier, true, 'Debe superar la barrera de 1.80 m');
  assert.ok(goalShot.barrierY > 1.80);
  assert.equal(goalShot.result, 'goal');
  assert.equal(goalShot.score, 100);
  assert.ok(goalShot.goalY > 0 && goalShot.goalY <= 2.44);

  // Bloqueado en la barrera (ángulo muy bajo)
  const blockedShot = evaluateFreeKickShot({
    speed: 25.0,
    angleDeg: 8,
    distance: 25.0,
    barrierDistance: 9.15,
    barrierHeight: 1.80,
    goalHeight: 2.44,
    gravity: 9.8,
  });
  assert.equal(blockedShot.clearsBarrier, false);
  assert.equal(blockedShot.result, 'blocked');
  assert.equal(blockedShot.score, 0);

  // Por encima del travesaño (ángulo excesivo)
  const overShot = evaluateFreeKickShot({
    speed: 22.0,
    angleDeg: 38,
    distance: 25.0,
    barrierDistance: 9.15,
    barrierHeight: 1.80,
    goalHeight: 2.44,
    gravity: 9.8,
  });
  assert.equal(overShot.clearsBarrier, true);
  assert.equal(overShot.result, 'over-bar');
  assert.ok(overShot.goalY > 2.44);
});

test('Tiro Libre: nivel histórico de Roberto Carlos a 35 m contiene explicación del Efecto Magnus', () => {
  const rcLevel = FREEKICK_LEVELS.find((lvl) => lvl.id === 'fk-3');
  assert.ok(rcLevel);
  assert.equal(rcLevel.distance, 35.0);
  assert.ok(rcLevel.historicalNote.includes('Efecto Magnus'));
  assert.ok(GAMES_I18N.es.fkMagnusBody.includes('Efecto Magnus'));
  assert.ok(GAMES_I18N['gn-jopara'].fkMagnusBody.includes('Efecto Magnus'));
});

test('Target Challenge: impacto en el blanco evalúa rapidez calculada', () => {
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
});

test('Complementary Challenge: ángulos que suman 90° logran el mismo alcance exacto', () => {
  for (const level of COMPLEMENTARY_LEVELS) {
    const evalCorrect = evaluateComplementaryChallenge({
      baseAngle: level.baseAngle,
      proposedAngle: level.expectedAngle,
      speed: level.speed,
      gravity: level.gravity,
    });
    assert.equal(evalCorrect.isComplementary, true);
    assert.equal(evalCorrect.result, 'perfect');
    assert.equal(evalCorrect.score, 100);
    assert.ok(evalCorrect.diff < 1e-6);
  }
});
