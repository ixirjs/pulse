import type { EasingFn } from '$lib/shared/types';
import { linear } from './primitive';

const NEWTON_ITERATIONS = 8;
const NEWTON_MIN_SLOPE = 0.001;
const SUBDIVISION_PRECISION = 1e-7;
const SUBDIVISION_MAX_ITERATIONS = 12;

/**
 * Build an easing function equivalent to CSS `cubic-bezier(x1, y1, x2, y2)`.
 *
 * The polynomial coefficients are computed once per factory call so each
 * `t` evaluation is a small handful of multiplies, matching what
 * Blink/WebKit do internally.
 */
export const cubicBezier = (
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): EasingFn => {
  if (x1 === y1 && x2 === y2) return linear;

  // Hoist coefficients — these never change across `t` evaluations.
  const ax = 1 - 3 * x2 + 3 * x1;
  const bx = 3 * x2 - 6 * x1;
  const cx = 3 * x1;
  const ay = 1 - 3 * y2 + 3 * y1;
  const by = 3 * y2 - 6 * y1;
  const cy = 3 * y1;

  const calcX = (t: number): number => ((ax * t + bx) * t + cx) * t;
  const calcY = (t: number): number => ((ay * t + by) * t + cy) * t;
  const slopeX = (t: number): number => 3 * ax * t * t + 2 * bx * t + cx;

  return (t) => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;

    // Newton-Raphson with a binary-subdivision fallback for ill-conditioned
    // segments — this is the same algorithm Blink/WebKit use internally.
    let guess = t;
    for (let i = 0; i < NEWTON_ITERATIONS; i++) {
      const slope = slopeX(guess);
      if (slope < NEWTON_MIN_SLOPE) break;
      guess -= (calcX(guess) - t) / slope;
    }

    if (Math.abs(calcX(guess) - t) > SUBDIVISION_PRECISION) {
      let lo = 0;
      let hi = 1;
      let mid = guess;
      for (
        let i = 0;
        i < SUBDIVISION_MAX_ITERATIONS &&
        Math.abs(calcX(mid) - t) > SUBDIVISION_PRECISION;
        i++
      ) {
        if (calcX(mid) < t) lo = mid;
        else hi = mid;
        mid = (lo + hi) / 2;
      }
      guess = mid;
    }

    return calcY(guess);
  };
};
