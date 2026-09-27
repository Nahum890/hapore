import { createLaunch, heightAtX, maxHeight, range } from '../physics/projectileMotion.js';

const SAMPLE_FRACTIONS = [0.2, 0.4, 0.6, 0.8];

export function createDrawingChallenge(level = 0) {
  const angle = level % 2 === 0 ? 45 : 30;
  const launch = createLaunch(20, angle, { gravity: 10 });
  const horizontalRange = range(launch);
  const highestPoint = maxHeight(launch);

  return {
    level,
    launch,
    angle,
    horizontalRange,
    highestPoint,
    apex: { x: horizontalRange / 2, y: highestPoint },
    points: SAMPLE_FRACTIONS.map(fraction => {
      const x = horizontalRange * fraction;
      return { fraction, x, y: heightAtX(launch, x) };
    }),
  };
}

export function gradeDrawingPoint(challenge, stepIndex, plottedPoint) {
  const expected = challenge.points[stepIndex];
  if (!expected || !Number.isFinite(plottedPoint?.x) || !Number.isFinite(plottedPoint?.y)) {
    return { correct: false, reason: 'invalid' };
  }

  const xTolerance = challenge.horizontalRange * 0.045;
  const yTolerance = challenge.highestPoint * 0.12;
  const aligned = Math.abs(plottedPoint.x - expected.x) <= xTolerance;
  const heightMatches = Math.abs(plottedPoint.y - expected.y) <= yTolerance;

  return {
    correct: aligned && heightMatches,
    aligned,
    heightMatches,
    expected,
    xTolerance,
    yTolerance,
  };
}

/** Evalúa un trazo continuo en los cuatro puntos de control del lanzamiento. */
export function gradeDrawingStroke(challenge, plottedPoints) {
  const points = Array.isArray(plottedPoints)
    ? plottedPoints.filter(point => Number.isFinite(point?.x) && Number.isFinite(point?.y)).sort((a, b) => a.x - b.x)
    : [];
  if (points.length < 4) return { correct: false, reason: 'short', matches: 0, total: challenge.points.length };

  const { horizontalRange, highestPoint } = challenge;
  const start = points[0];
  const finish = points.at(-1);
  if (start.x > horizontalRange * 0.1 || start.y > highestPoint * 0.18) {
    return { correct: false, reason: 'start', matches: 0, total: challenge.points.length };
  }
  if (finish.x < horizontalRange * 0.88 || finish.y > highestPoint * 0.18) {
    return { correct: false, reason: 'finish', matches: 0, total: challenge.points.length };
  }

  const samples = challenge.points.map(expected => {
    let afterIndex = points.findIndex(point => point.x >= expected.x);
    if (afterIndex < 0) afterIndex = points.length - 1;
    const before = points[Math.max(0, afterIndex - 1)];
    const after = points[afterIndex];
    const ratio = after.x === before.x ? 0 : (expected.x - before.x) / (after.x - before.x);
    const actualY = before.y + (after.y - before.y) * Math.max(0, Math.min(1, ratio));
    const tolerance = highestPoint * 0.18;
    return { x: expected.x, expectedY: expected.y, actualY, correct: Math.abs(actualY - expected.y) <= tolerance };
  });
  const matches = samples.filter(sample => sample.correct).length;
  return {
    correct: matches === samples.length,
    reason: matches === samples.length ? null : 'curve',
    matches,
    total: samples.length,
    samples,
  };
}
