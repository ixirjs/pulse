/**
 * Built-in easing functions and a `cubicBezier()` factory.
 *
 * Easings are pure functions of `t ∈ [0, 1]` returning a normalized progress
 * value (typically in `[0, 1]`, but may overshoot for back/elastic curves).
 *
 * Import the ones you need and pass them to `animate()` as the `easing`
 * option. Define your own by writing a function with the same signature.
 *
 * @example
 * ```ts
 * import { easeOut, backOut, cubicBezier } from '@svelte-atoms/vibra/easing';
 *
 * const snappy = cubicBezier(0.2, 0.9, 0.2, 1);
 * animate(node, { x: 100, scale: { to: 1.1, easing: backOut } }, { easing: snappy });
 * ```
 */

export * from './primitive';
export * from './cubic-bezier';
export * from './css';
export * from './spring';
