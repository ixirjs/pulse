/**
 * `stagger()` — generate staggered delays for list animations.
 *
 * Returns a function `(index, total) => delayMs` that can be passed directly
 * to `animate()` or `timeline.add()` as the `delay` option.
 *
 * @example
 * ```ts
 * import { animate, stagger } from './index';
 *
 * const delay = stagger(50);
 * items.forEach((el, i) => {
 *   animate(el, { opacity: [0, 1], y: [20, 0] }, { delay: delay(i, items.length) });
 * });
 *
 * // From center outward — center items animate first:
 * const delay = stagger(40, { from: 'center' });
 *
 * // From end — last item animates first:
 * const delay = stagger(40, { from: 'end' });
 *
 * // Normalized position (0 = start, 1 = end, 0.5 = center):
 * const delay = stagger(40, { from: 0.3 });
 *
 * // With easing — the spacing between delays follows the curve:
 * import { easeOut } from './easings';
 * const delay = stagger(60, { from: 'start', easing: easeOut });
 * ```
 */

import { clamp01 } from '$lib/shared/math';
import type { EasingFn } from './types';

export interface StaggerOptions {
	/**
	 * Which element has the shortest (zero) delay.
	 *  - `'start'`  (default) — first element starts immediately.
	 *  - `'end'`              — last element starts immediately.
	 *  - `'center'`           — middle element starts immediately, edges are latest.
	 *  - `number`             — normalized position in `[0, 1]` (0 = start, 1 = end).
	 */
	from?: 'start' | 'end' | 'center' | number;
	/**
	 * Easing applied to the normalized distance from the origin before
	 * converting to a delay. Useful for non-linear "wave" staggers.
	 * Default: linear.
	 */
	easing?: EasingFn;
}

/**
 * Returns a `(index: number, total: number) => number` delay factory for
 * staggered list animations. The delay unit is milliseconds.
 *
 * @param interval - Base delay between adjacent elements, in ms.
 * @param options  - Optional `from` origin and `easing`.
 */
export const stagger = (
	interval: number,
	options: StaggerOptions = {}
): ((index: number, total: number) => number) => {
	const { from = 'start', easing } = options;

	return (index: number, total: number): number => {
		const n = Math.max(1, total);
		if (n === 1) return 0;

		// Resolve the origin as an absolute (possibly fractional) index.
		const origin =
			from === 'start'
				? 0
				: from === 'end'
					? n - 1
					: from === 'center'
						? (n - 1) / 2
						: // Clamp a 0-1 normalized position into [0, n-1].
							clamp01(from) * (n - 1);

		// Distance from this index to the origin, normalized to [0, 1] relative
		// to the farthest element so the maximum stagger = (maxDist * interval).
		const maxDist = Math.max(Math.abs(0 - origin), Math.abs(n - 1 - origin));
		if (maxDist === 0) return 0;

		const normalizedDist = Math.abs(index - origin) / maxDist;
		const easedDist = easing ? easing(normalizedDist) : normalizedDist;

		return easedDist * maxDist * interval;
	};
};
