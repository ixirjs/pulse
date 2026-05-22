import type { SpringOptions } from '../animate/types';
import { getCachedSpring } from '../animate/spring';

/**
 * A spring-physics easing function returned by `springEasing()`.
 *
 * In addition to being callable as a plain `EasingFn`, it carries:
 *  - `duration` — the natural settling time in ms. `animate()` uses this
 *    automatically when no explicit `duration` is provided.
 *  - `_linearEasing` — the pre-built WAAPI `linear(…)` string at full
 *    simulation fidelity (one sample per 60 fps frame). Used internally
 *    to skip the lossy 25-point resample done for generic easings.
 */
export interface SpringEasingFn {
  (t: number): number;
  /** Natural settling duration in ms. */
  readonly duration: number;
  /** @internal Pre-built WAAPI linear(…) string at full simulation fidelity. */
  readonly _linearEasing: string;
}

/**
 * Create a `SpringEasingFn` driven by spring physics.
 *
 * Unlike the per-prop `spring:` option (which auto-sizes the duration),
 * `springEasing()` returns a plain easing function that can be passed
 * anywhere `easing` is accepted — including shared `defaults.easing`.
 *
 * When no explicit `duration` is given to `animate()`, the function's own
 * `duration` (derived from the simulation) is used automatically, so the
 * animation settles at exactly the right time, just like `spring:` does.
 *
 * The curve can overshoot 1 (and dip below 0) for under-damped springs,
 * just like `backOut` or `elasticOut`.
 *
 * @example
 * ```ts
 * const bouncy = springEasing({ stiffness: 300, damping: 18 });
 *
 * // Duration auto-sized from simulation — works like spring: per-prop:
 * animate(node, { scale: 1.2 }, { easing: bouncy });
 *
 * // Or pin a custom duration (stretches/compresses the curve in time):
 * animate(node, { scale: 1.2 }, { easing: bouncy, duration: 500 });
 *
 * // Per-prop, mixing with other easings:
 * animate(node, {
 *   x: { to: 100, easing: bouncy },
 *   opacity: [0, 1],
 * });
 * ```
 */
export const springEasing = (options?: SpringOptions): SpringEasingFn => {
  const { spring: { samples, duration }, linearEasingCss } = getCachedSpring(options ?? {});
  const last = samples.length - 1;
  const fn = (t: number): number => {
    if (t <= 0) return 0;
    if (t >= 1) return samples[last]!;
    const pos = t * last;
    const lo = Math.floor(pos);
    const hi = lo + 1 > last ? last : lo + 1;
    const frac = pos - lo;
    return samples[lo]! + (samples[hi]! - samples[lo]!) * frac;
  };
  return Object.assign(fn, { duration, _linearEasing: linearEasingCss });
};
