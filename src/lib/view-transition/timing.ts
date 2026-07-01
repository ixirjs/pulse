/**
 * Pure resolution of {@link ViewTransitionOptions} into an `EffectTiming`
 * patch. Kept DOM-free so it can be unit-tested in node, separate from the
 * browser integration in `controller.ts`.
 */

import { springEasing } from '$lib/easing';
import { easingToCss } from '$lib/animate/keyframes/easing-utils';
import type { ViewTransitionOptions } from './types';

/**
 * Resolve the timing options into an `EffectTiming` suitable for
 * `KeyframeEffect.updateTiming`, or `null` when the caller supplied nothing to
 * override (keep the browser's default animation untouched).
 *
 * Precedence: `spring` › `easing` › bare `duration`. A `spring` derives its own
 * natural `duration`, which an explicit `duration` still overrides.
 */
export const resolveViewTransitionTiming = (
	opts: ViewTransitionOptions
): OptionalEffectTiming | null => {
	const { spring, easing, duration } = opts;

	if (spring) {
		const s = springEasing(spring === true ? {} : spring);
		return { duration: duration ?? s.duration, easing: s._linearEasing };
	}

	if (typeof easing === 'function') {
		const css = easingToCss(easing);
		return duration != null ? { duration, easing: css } : { easing: css };
	}

	if (typeof easing === 'string') {
		return duration != null ? { duration, easing } : { easing };
	}

	if (duration != null) return { duration };

	return null;
};
