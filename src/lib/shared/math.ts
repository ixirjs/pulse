/**
 * Tiny numeric clamps shared across the animation modules so the same
 * bound-checking lives in one place instead of being re-spelled inline.
 */

/** Clamp `n` to be non-negative (≥ 0). */
export const atLeast0 = (n: number): number => Math.max(0, n);

/** Clamp `n` into the inclusive `[0, 1]` range. */
export const clamp01 = (n: number): number => Math.min(1, Math.max(0, n));
