import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createLaunch, maxHeight, range, timeOfFlight } from '../src/physics/projectileMotion.js';

const { contentStatus, activities } = JSON.parse(readFileSync(new URL('../src/data/explorationLabActivities.json', import.meta.url), 'utf8'));

function measurements(values) {
  const launch = createLaunch(values.v0, values.angle, { gravity: values.gravity });
  return { range: range(launch), height: maxHeight(launch), time: timeOfFlight(launch) };
}

test('las actividades del laboratorio siguen en borrador y cambian una variable por comparación', () => {
  assert.equal(contentStatus, 'borrador');
  assert.equal(activities.length, 3);
  for (const activity of activities) {
    const keys = ['v0', 'angle', 'gravity'];
    const changed = keys.filter(key => activity.launchA[key] !== activity.launchB[key]);
    assert.deepEqual(changed, [activity.changedVariable], activity.id);
    assert.equal(activity.exitTicket.optionalSelfCheck, true);
    assert.ok(activity.expectedExplanation.length > 40);
  }
});

test('las mediciones descritas coinciden con el motor físico compartido', () => {
  const complementary = activities[0];
  const a = measurements(complementary.launchA);
  const b = measurements(complementary.launchB);
  assert.ok(Math.abs(a.range - 34.64) < 0.01);
  assert.ok(Math.abs(a.range - b.range) < 0.01);
  assert.ok(b.height > a.height);
  assert.ok(b.time > a.time);

  const speed = activities[1];
  const slow = measurements(speed.launchA);
  const fast = measurements(speed.launchB);
  assert.ok(Math.abs(slow.range - 10) < 0.01);
  assert.ok(Math.abs(fast.range - 40) < 0.01);
  assert.ok(Math.abs(fast.time / slow.time - 2) < 0.01);

  const gravity = activities[2];
  const earth = measurements(gravity.launchA);
  const moon = measurements(gravity.launchB);
  assert.ok(Math.abs(earth.range - 40.82) < 0.01);
  assert.ok(Math.abs(moon.range - 246.91) < 0.01);
  assert.ok(moon.time > earth.time);
});
