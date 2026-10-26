import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BASKETBALL_LEVELS, COMPLEMENTARY_LEVELS, FREEKICK_LEVELS, TARGET_LEVELS,
  evaluateBasketballShot, evaluateFreeKickShot,
} from '../src/games/parabolic/parabolicGamesEngine.js';
import { planFlight } from '../src/simulator/flightPlan.js';
import { BACKBOARD_BELOW_RIM, BACKBOARD_HEIGHT, BACKBOARD_OFFSET } from '../src/physics/basketballShot.js';
import { createLaunch, range } from '../src/physics/projectileMotion.js';

// Reporte del equipo: "en la animación el balón se puede ir a otro lado y no
// llegar donde debería, y te marca bien; o el punto final no está en la
// posición correcta". Estas pruebas recorren muchos tiros y exigen que lo que
// se ve (planFlight) coincida con lo que se evalúa (motor del desafío).

const MAKES = new Set(['swish', 'bank-in', 'rim-in']);
const samplePath = (flight, n = 400) => Array.from({ length: n + 1 }, (_, i) => flight.positionAt(i / n));

function* basketballShots() {
  for (const level of BASKETBALL_LEVELS) {
    for (const wind of [0, -3, 2.5]) {
      for (let angle = 30; angle <= 70; angle += 4) {
        for (let speed = level.idealSpeed - 1.5; speed <= level.idealSpeed + 1.5; speed += 0.1) {
          yield { level, wind, angle, speed: Math.round(speed * 100) / 100 };
        }
      }
    }
  }
}

test('básquet: el veredicto y la animación cuentan siempre lo mismo (con y sin viento)', () => {
  let makes = 0;
  for (const { level, wind, angle, speed } of basketballShots()) {
    const evaluation = evaluateBasketballShot({ speed, angleDeg: angle, distance: level.distance, hoopHeight: level.hoopHeight, releaseHeight: level.releaseHeight, gravity: level.gravity, wind });
    const flight = planFlight({ speed, angle, gravity: level.gravity, targetX: level.distance, targetY: level.hoopHeight, y0: level.releaseHeight, wind });
    const label = `${level.id} v=${speed} θ=${angle} viento=${wind}`;
    assert.equal(flight.bballOutcome, evaluation.result, label);
    assert.equal(flight.basketSwish, MAKES.has(evaluation.result), label);
    if (MAKES.has(evaluation.result)) makes += 1;
  }
  assert.ok(makes > 50, 'la grilla incluye muchos encestes');
});

test('básquet: un enceste pasa por el centro del aro y cae debajo, nunca atraviesa el tablero', () => {
  for (const { level, wind, angle, speed } of basketballShots()) {
    const flight = planFlight({ speed, angle, gravity: level.gravity, targetX: level.distance, targetY: level.hoopHeight, y0: level.releaseHeight, wind });
    const label = `${level.id} v=${speed} θ=${angle} viento=${wind} (${flight.bballOutcome})`;
    const path = samplePath(flight);
    const bbX = level.distance + BACKBOARD_OFFSET;
    const boardBottom = level.hoopHeight - BACKBOARD_BELOW_RIM;
    const boardTop = boardBottom + BACKBOARD_HEIGHT;
    // Ningún tiro cruza el tablero por dentro de su altura.
    for (let i = 1; i < path.length; i += 1) {
      const [a, b] = [path[i - 1], path[i]];
      if (a.x < bbX - 1e-6 && b.x > bbX + 1e-6) {
        const y = a.y + (b.y - a.y) * ((bbX - a.x) / (b.x - a.x));
        assert.ok(y < boardBottom || y > boardTop, `${label}: atravesó el tablero a y=${y.toFixed(2)}`);
      }
    }
    if (flight.basketSwish) {
      const closest = Math.min(...path.map(p => Math.hypot(p.x - level.distance, p.y - level.hoopHeight)));
      assert.ok(closest < 0.12, `${label}: no pasó por el aro (distancia ${closest.toFixed(2)} m)`);
      const end = flight.positionAt(1);
      assert.ok(Math.abs(end.x - level.distance) <= 0.15, `${label}: terminó en x=${end.x.toFixed(2)}, lejos del aro`);
      assert.ok(end.y < 1e-6, `${label}: termina en el piso`);
    }
  }
});

test('tiro libre: el veredicto coincide con la animación y el balón no atraviesa la barrera ni se va lejos del arco', () => {
  for (const level of FREEKICK_LEVELS) {
    for (let angle = 8; angle <= 40; angle += 2) {
      for (let speed = level.idealSpeed - 6; speed <= level.idealSpeed + 6; speed += 0.5) {
        const evaluation = evaluateFreeKickShot({ speed, angleDeg: angle, distance: level.distance, barrierDistance: level.barrierDistance, barrierHeight: level.barrierHeight, goalHeight: level.goalHeight, gravity: level.gravity });
        const flight = planFlight({ speed, angle, gravity: level.gravity, targetX: level.distance, targetY: level.goalHeight, obstacle: { x: level.barrierDistance, height: level.barrierHeight, isFreeKick: true } });
        const label = `${level.id} v=${speed} θ=${angle} (${evaluation.result})`;
        assert.equal(flight.clearsObstacle, evaluation.clearsBarrier, label);
        const end = flight.positionAt(1);
        if (evaluation.result === 'blocked') {
          assert.ok(Math.max(...samplePath(flight).map(p => p.x)) <= level.barrierDistance + 1e-6, `${label}: pasó a través de la barrera`);
        }
        if (evaluation.result === 'goal') {
          assert.ok(end.x >= level.distance - 1e-6 && end.x <= level.distance + 1.6 + 1e-6, `${label}: el gol terminó en x=${end.x.toFixed(2)}`);
        }
      }
    }
  }
});

test('paredón del simulador: si no pasa, la pelota queda delante del paredón', () => {
  const blocked = planFlight({ speed: 9, angle: 20, gravity: 9.8, targetX: 20, obstacle: { x: 6, height: 2 } });
  assert.equal(blocked.clearsObstacle, false);
  assert.ok(Math.max(...samplePath(blocked).map(p => p.x)) <= 6 + 1e-6);
  const cleared = planFlight({ speed: 18, angle: 45, gravity: 9.8, targetX: 30, obstacle: { x: 8, height: 1.5 } });
  assert.ok(Math.abs(cleared.positionAt(1).x - cleared.landingX) < 0.01);
});

test('la estela y el balón avanzan juntos (muestras parejas en el tiempo)', () => {
  const flight = planFlight({ speed: 8, angle: 52, gravity: 9.8, targetX: 4.6, targetY: 3.05, y0: 1.8 });
  for (const progress of [0.1, 0.37, 0.5, 0.82, 1]) {
    const index = Math.round(progress * (flight.points.length - 1));
    const fromTrail = flight.points[index];
    const fromBall = flight.positionAt(progress);
    assert.ok(Math.hypot(fromTrail.x - fromBall.x, fromTrail.y - fromBall.y) < 0.05, `progreso ${progress}`);
  }
});

test('los objetivos de cada nivel coinciden con la física (el banderín va donde cae el disparo)', () => {
  for (const level of COMPLEMENTARY_LEVELS) {
    const expected = range(createLaunch(level.speed, level.baseAngle, { gravity: level.gravity }));
    assert.ok(Math.abs(level.range - expected) < 0.01, `${level.id}: ${level.range} vs ${expected.toFixed(3)}`);
  }
  for (const level of TARGET_LEVELS) {
    const reached = range(createLaunch(level.exactSpeed, level.angleDeg, { gravity: level.gravity }));
    assert.ok(Math.abs(reached - level.distance) <= level.tolerance, `${level.id}`);
  }
  for (const level of BASKETBALL_LEVELS) {
    const evaluation = evaluateBasketballShot({ speed: level.idealSpeed, angleDeg: level.targetAngle, distance: level.distance, hoopHeight: level.hoopHeight, releaseHeight: level.releaseHeight, gravity: level.gravity });
    assert.equal(evaluation.result, 'swish', `${level.id}: la rapidez ideal encesta limpio`);
  }
});
