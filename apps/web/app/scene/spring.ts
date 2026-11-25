/**
 * Critically damped spring (no overshoot), integrated in closed form so it stays stable at any
 * frame rate. `omega` is the angular frequency: higher = snappier. ~4 settles in about one second.
 */
export interface Spring {
  value: number;
  velocity: number;
}

export function stepSpring(s: Spring, target: number, omega: number, dt: number): Spring {
  if (dt <= 0) return s;
  const x0 = s.value - target;
  const exp = Math.exp(-omega * dt);
  const temp = (s.velocity + omega * x0) * dt;
  return {
    value: target + (x0 + temp) * exp,
    velocity: (s.velocity - omega * temp) * exp,
  };
}

/** True once the spring is visually at rest. */
export const springSettled = (s: Spring, target: number, eps = 0.01): boolean =>
  Math.abs(s.value - target) < eps && Math.abs(s.velocity) < eps;
