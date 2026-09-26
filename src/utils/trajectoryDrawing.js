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
