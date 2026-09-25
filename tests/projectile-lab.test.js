import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createLaunch,
  evaluateTrajectory,
  maxHeight,
  positionAt,
  range,
  timeOfFlight,
  velocityAt,
} from '../src/physics/projectileMotion.js';
import {
  LAB_LIMITS,
  calculateLabPhysics,
  clampValue,
  compareTrajectories,
} from '../src/simulator/projectileLabEngine.js';
import { drawRoundedRect } from '../src/simulator/projectileRenderer.js';

test('createLaunch valida entradas y rechaza gravedad no positiva', () => {
  const launchDefault = createLaunch(20, 45, { gravity: -9.8 });
  assert.equal(launchDefault.gravity, 9.8);

  const launchZero = createLaunch(20, 45, { gravity: 0 });
  assert.equal(launchZero.gravity, 9.8);

  const launchInvalid = createLaunch(20, 45, { gravity: 'invalido' });
  assert.equal(launchInvalid.gravity, 9.8);

  const launchCustom = createLaunch(20, 45, { gravity: 10.0 });
  assert.equal(launchCustom.gravity, 10.0);
});

test('calculateLabPhysics acota variables según LAB_LIMITS', () => {
  const over = calculateLabPhysics({ v0: 200, angleDeg: 120, y0: 100, gravity: 50 });
  assert.equal(over.v0, LAB_LIMITS.maxSpeed);
  assert.equal(over.angleDeg, LAB_LIMITS.maxAngle);
  assert.equal(over.y0, LAB_LIMITS.maxHeight);
  assert.equal(over.gravity, LAB_LIMITS.maxGravity);

  const under = calculateLabPhysics({ v0: -10, angleDeg: -30, y0: -5, gravity: -2 });
  assert.equal(under.v0, LAB_LIMITS.minSpeed);
  assert.equal(under.angleDeg, LAB_LIMITS.minAngle);
  assert.equal(under.y0, LAB_LIMITS.minHeight);
  assert.equal(under.gravity, LAB_LIMITS.minGravity);
});

test('velocityAt calcula componentes y anula vy en el punto más alto', () => {
  const launch = createLaunch(20, 30, { gravity: 9.8 });
  const tPeak = launch.vy / launch.gravity;

  const vel0 = velocityAt(launch, 0);
  assert.ok(Math.abs(vel0.vx - launch.vx) < 1e-9);
  assert.ok(Math.abs(vel0.vy - launch.vy) < 1e-9);
  assert.ok(Math.abs(vel0.speed - 20) < 1e-9);

  const velPeak = velocityAt(launch, tPeak);
  assert.ok(Math.abs(velPeak.vx - launch.vx) < 1e-9);
  assert.ok(Math.abs(velPeak.vy) < 1e-9);
  assert.ok(Math.abs(velPeak.speed - launch.vx) < 1e-9);
});

test('compareTrajectories identifica ángulos complementarios con mismo alcance', () => {
  const traj30 = calculateLabPhysics({ v0: 25, angleDeg: 30, y0: 0, gravity: 9.8 });
  const traj60 = calculateLabPhysics({ v0: 25, angleDeg: 60, y0: 0, gravity: 9.8 });

  const comp = compareTrajectories(traj30, traj60);
  assert.ok(comp !== null);
  assert.equal(comp.isComplementary, true);
  assert.equal(comp.sameRange, true);
  assert.ok(comp.rangeDiff < 0.05);
  assert.ok(traj60.peakY > traj30.peakY);
  assert.ok(traj60.duration > traj30.duration);
  assert.ok(comp.descriptionEs.includes('Ángulos complementarios'));
  assert.ok(comp.descriptionJopara.includes('Ángulo complementario'));
});

test('drawRoundedRect funciona correctamente con y sin soporte nativo de ctx.roundRect', () => {
  let calledPath = [];
  const mockCtxWithoutNative = {
    moveTo: (x, y) => calledPath.push(['moveTo', x, y]),
    lineTo: (x, y) => calledPath.push(['lineTo', x, y]),
    quadraticCurveTo: (...args) => calledPath.push(['quad', ...args]),
    closePath: () => calledPath.push(['close']),
    rect: (x, y, w, h) => calledPath.push(['rect', x, y, w, h]),
  };

  drawRoundedRect(mockCtxWithoutNative, 10, 20, 100, 50, 8);
  assert.ok(calledPath.length > 5);
  assert.equal(calledPath[calledPath.length - 1][0], 'close');

  let nativeCalled = false;
  const mockCtxWithNative = {
    roundRect: (x, y, w, h, r) => {
      nativeCalled = true;
    },
  };
  drawRoundedRect(mockCtxWithNative, 10, 20, 100, 50, 8);
  assert.equal(nativeCalled, true);
});
