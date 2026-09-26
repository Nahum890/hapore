import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planFlight, SPEED_LIMITS, ANGLE_LIMITS, clamp } from '../src/simulator/flightPlan.js';
import { createLaunch, velocityAt, heightAtX } from '../src/physics/projectileMotion.js';

test('Laboratorio/FlightPlan: límites de control y sujeción segura (clamp)', () => {
  assert.equal(clamp(2, SPEED_LIMITS.min, SPEED_LIMITS.max, 20), SPEED_LIMITS.min);
  assert.equal(clamp(60, SPEED_LIMITS.min, SPEED_LIMITS.max, 20), SPEED_LIMITS.max);
  assert.equal(clamp(NaN, SPEED_LIMITS.min, SPEED_LIMITS.max, 20), 20);
  assert.equal(clamp(5, ANGLE_LIMITS.min, ANGLE_LIMITS.max, 45), ANGLE_LIMITS.min);
  assert.equal(clamp(90, ANGLE_LIMITS.min, ANGLE_LIMITS.max, 45), ANGLE_LIMITS.max);
});

test('Laboratorio/FlightPlan: soporte de objetivo suspendido (aro de básquetbol a 3.05 m)', () => {
  const flight = planFlight({
    speed: 7.68,
    angle: 52,
    gravity: 9.8,
    targetX: 4.60,
    targetY: 3.05,
    y0: 1.80,
  });

  assert.equal(flight.targetY, 3.05);
  assert.equal(flight.y0, 1.80);
  assert.equal(flight.isDescending, true);
  assert.ok(Math.abs(flight.heightAtTarget - 3.05) < 0.1);
  assert.equal(flight.basketSwish, true);
  assert.equal(flight.hit, true);
});

test('Laboratorio/FlightPlan: superación de barrera defensiva a 9.15 m', () => {
  const flightOver = planFlight({
    speed: 18.5,
    angle: 24,
    gravity: 9.8,
    targetX: 25.0,
    targetY: 2.44,
    obstacle: { x: 9.15, height: 1.80 },
  });

  assert.equal(flightOver.clearsObstacle, true);
  assert.ok(flightOver.obstacleHeight > 1.80);

  const flightBlocked = planFlight({
    speed: 20.0,
    angle: 10,
    gravity: 9.8,
    targetX: 25.0,
    targetY: 2.44,
    obstacle: { x: 9.15, height: 1.80 },
  });

  assert.equal(flightBlocked.clearsObstacle, false);
  assert.ok(flightBlocked.obstacleHeight < 1.80);
});

test('Laboratorio/FlightPlan: entorno cerrado (vuelo ideal) vs exterior con viento', () => {
  const indoor = planFlight({
    speed: 15,
    angle: 45,
    gravity: 9.8,
    wind: 0,
    temperature: 21,
  });
  assert.equal(indoor.environment.isIndoor, true);
  assert.equal(indoor.environment.wind, 0);

  const headwind = planFlight({
    speed: 15,
    angle: 45,
    gravity: 9.8,
    wind: -3.0,
    temperature: 15,
  });
  assert.equal(headwind.environment.isIndoor, false);
  assert.equal(headwind.environment.wind, -3.0);
  // Con viento en contra, el punto de impacto efectivo es menor
  const lastIndoor = indoor.points[indoor.points.length - 1];
  const lastHeadwind = headwind.points[headwind.points.length - 1];
  assert.ok(lastHeadwind.x < lastIndoor.x);
});

test('Physics: velocityAt calcula componentes, rapidez escalar y ángulo instantáneo', () => {
  const launch = createLaunch(20, 30, { gravity: 9.8 });
  const vel0 = velocityAt(launch, 0);
  assert.ok(Math.abs(vel0.vx - 17.3205) < 0.001);
  assert.ok(Math.abs(vel0.vy - 10) < 0.001);
  assert.ok(Math.abs(vel0.speed - 20) < 0.001);
  assert.ok(Math.abs(vel0.angleDeg - 30) < 0.001);

  const tPeak = launch.vy / launch.gravity;
  const velPeak = velocityAt(launch, tPeak);
  assert.ok(Math.abs(velPeak.vy) < 0.001);
  assert.ok(Math.abs(velPeak.angleDeg) < 0.001);
});
