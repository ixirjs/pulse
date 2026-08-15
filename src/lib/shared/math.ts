/** Scalar helpers shared across the animation, scroll and interpolation code. */

/** Linear interpolation between `a` and `b` at `t`. */
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Clamp into `[0, 1]`. */
export const clamp01 = (n: number): number => Math.min(1, Math.max(0, n));
