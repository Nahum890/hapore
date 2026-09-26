import test from 'node:test';
import assert from 'node:assert/strict';
import { createDrawingChallenge, gradeDrawingPoint } from '../src/utils/trajectoryDrawing.js';

test('drawing challenge has reference points and intermediate heights from the projectile engine', () => {
  const challenge = createDrawingChallenge(0);
  assert.equal(challenge.angle, 45);
  assert.ok(Math.abs(challenge.horizontalRange - 40) < 0.01);
  assert.ok(Math.abs(challenge.highestPoint - 10) < 0.01);
  assert.equal(challenge.points.length, 4);
  assert.ok(Math.abs(challenge.points[0].y - 6.4) < 0.01);
  assert.ok(Math.abs(challenge.points[3].y - 6.4) < 0.01);
});

test('drawing exercise accepts points close to the requested parabola coordinate', () => {
  const challenge = createDrawingChallenge(1);
  const target = challenge.points[1];
  const result = gradeDrawingPoint(challenge, 1, { x: target.x + 0.2, y: target.y - 0.2 });
  assert.equal(result.correct, true);
  assert.equal(result.aligned, true);
  assert.equal(result.heightMatches, true);
});

test('drawing exercise guides the student when the point is at the wrong height or distance', () => {
  const challenge = createDrawingChallenge(0);
  const target = challenge.points[0];
  const tooLow = gradeDrawingPoint(challenge, 0, { x: target.x, y: 0 });
  const wrongDistance = gradeDrawingPoint(challenge, 0, { x: target.x + challenge.horizontalRange / 3, y: target.y });
  assert.equal(tooLow.correct, false);
  assert.equal(tooLow.aligned, true);
  assert.equal(tooLow.heightMatches, false);
  assert.equal(wrongDistance.correct, false);
  assert.equal(wrongDistance.aligned, false);
});
