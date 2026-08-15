/**
 * Resolve user-facing `FlipOptions` into normalized values consumed by the
 * animator. All helpers are pure — no DOM access, no side effects.
 */

import { CSS_EASINGS } from '../easing';
import type { EasingFn } from '../shared/types';
import { DEFAULT_EASING } from '../animate/keyframes/easing-utils';
import { FLIP_DEFAULT_DURATION, diagonal } from './geometry';
import type {
	FlipDuration,
	FlipEasing,
	FlipOpacity,
	FlipOptions,
	FlipOptionsInput,
	FlipRectPair
} from './types';

export const DEFAULT_DELAY = 0;

/** Unwrap an options thunk; thunks let callers track reactive state. */
export const readOptions = (input: FlipOptionsInput): FlipOptions => {
	if (input == null) return {};
	return typeof input === 'function' ? input() : input;
};

/**
 * Resolve a duration that may be either a literal millisecond value or a
 * function of the rect-to-rect diagonal distance.
 */
export const resolveDuration = (d: FlipDuration | undefined, rects: FlipRectPair): number => {
	if (d == null) return FLIP_DEFAULT_DURATION;
	const raw = typeof d === 'function' ? d(diagonal(rects.from, rects.to), rects) : d;
	return Math.max(0, raw);
};

/** Normalize the `opacity` shorthand into a fully-populated config or `null`. */
export const resolveOpacity = (
	o: FlipOpacity | boolean | undefined
): { from: number; to: number } | null => {
	if (o == null || o === false) return null;
	if (o === true) return { from: 0, to: 1 };
	return { from: o.from ?? 0, to: o.to ?? 1 };
};

/**
 * Coerce the user-supplied easing into an `EasingFn` so we can hand it
 * straight to the `animate()` runtime (which only accepts functions).
 *
 * Named CSS string easings ("ease", "ease-out", …) are mapped to their
 * cubic-bezier equivalents. Unknown strings fall back to {@link DEFAULT_EASING}.
 */
export const resolveEasing = (easing: FlipEasing | undefined): EasingFn => {
	if (easing == null) return DEFAULT_EASING;
	if (typeof easing === 'function') return easing;
	return CSS_EASINGS[easing] ?? DEFAULT_EASING;
};
