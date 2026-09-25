export const GRAVITY = 9.8;

export function toRadians(angleDeg) {
  return (angleDeg * Math.PI) / 180;
}

export function toDegrees(radians) {
  return (radians * 180) / Math.PI;
}

export function horizontalComponent(v0, angleDeg) {
  return v0 * Math.cos(toRadians(angleDeg));
}

export function verticalComponent(v0, angleDeg) {
  return v0 * Math.sin(toRadians(angleDeg));
}

export function positionX(x0, vx, t) {
  return x0 + vx * t;
}

export function positionY(y0, vy, t, gravity = GRAVITY) {
  return y0 + vy * t - 0.5 * gravity * t * t;
}

// Cinemática
export function kinematicsSpeed(distance, time) {
  return Number(distance) / Number(time);
}

export function kinematicsDistance(speed, time) {
  return Number(speed) * Number(time);
}

export function kinematicsTime(distance, speed) {
  return Number(distance) / Number(speed);
}

// Vectores
export function vectorMagnitude(componenteX, componenteY) {
  return Math.hypot(Number(componenteX), Number(componenteY));
}

export function vectorCollinearResultant(v1, v2) {
  return Math.abs(Number(v1) + Number(v2));
}

// Ley de Hooke
export function hookeForce(k, x) {
  return Number(k) * Number(x);
}

export function hookeSpringConstant(force, x) {
  return Number(force) / Number(x);
}

export function hookeDeformation(force, k) {
  return Number(force) / Number(k);
}

// Termodinámica
export function thermalSensibleHeat(mass, specificHeat, deltaT) {
  return Number(mass) * Number(specificHeat) * Number(deltaT);
}

export function thermalFinalTemperature(initialT, heat, mass, specificHeat) {
  return Number(initialT) + Number(heat) / (Number(mass) * Number(specificHeat));
}

export function thermalEquilibriumTemperature(m1, t1, m2, t2, c1 = 1, c2 = 1) {
  const numM1 = Number(m1);
  const numT1 = Number(t1);
  const numM2 = Number(m2);
  const numT2 = Number(t2);
  const numC1 = Number(c1);
  const numC2 = Number(c2);
  return (numM1 * numC1 * numT1 + numM2 * numC2 * numT2) / (numM1 * numC1 + numM2 * numC2);
}

// Óptica
export function opticsAngleFromSurface(surfaceAngle) {
  return 90 - Number(surfaceAngle);
}

export function opticsReflectedAngle(incidentAngle) {
  return Number(incidentAngle);
}

export function opticsPlaneMirrorImageDistance(objectDistance) {
  return Number(objectDistance);
}

export function opticsRefractiveIndex(vacuumSpeed, mediumSpeed) {
  return Number(vacuumSpeed) / Number(mediumSpeed);
}

