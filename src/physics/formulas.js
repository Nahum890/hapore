export const GRAVITY = 9.8;

function toRadians(angleDeg) {
  return (angleDeg * Math.PI) / 180;
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
