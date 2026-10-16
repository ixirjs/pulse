/**
 * Resolve user-facing `FlipOptions` into normalized values consumed by the
 * animator. All helpers are pure — no DOM access, no side effects.
 */

import { CSS_EASINGS, cubicBezier } from '../easing/index.js';
import type { EasingFn } from '../shared/types.js';
import { DEFAULT_EASING } from '../animate/keyframes/easing-utils.js';
import { FLIP_DEFAULT_DURATION, diagonal } from './geometry.js';
import type {
	FlipDuration,
	FlipEasing,
	FlipOpacity,
	FlipOptions,
	FlipOptionsInput,
	FlipRectPair
} from './types.js';

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
 * Named CSS string easings ("ease", "ease-out", …) and `cubic-bezier(…)` are
 * mapped to equivalent functions. Other strings (`steps()`, `linear(…)`) fall
 * back to {@link DEFAULT_EASING}.
 */
export const resolveEasing = (easing: FlipEasing | undefined): EasingFn => {
	if (easing == null) return DEFAULT_EASING;
	if (typeof easing === 'function') return easing;
	return CSS_EASINGS[easing] ?? parseCubicBezier(easing) ?? DEFAULT_EASING;
};

const CUBIC_BEZIER_RE = /^cubic-bezier\(([^)]*)\)$/;
// Memoized so repeated reflows reuse one function (and its cached CSS form).
const parsedCurves = new Map<string, EasingFn>();

const parseCubicBezier = (easing: string): EasingFn | undefined => {
	const cached = parsedCurves.get(easing);
	if (cached) return cached;
	const match = CUBIC_BEZIER_RE.exec(easing.trim());
	const p = match?.[1]!.split(',').map(Number);
	if (p?.length !== 4 || !p.every(Number.isFinite)) return undefined;
	// Tag with the original curve, as `easing/css.ts` does for its keywords, so
	// WAAPI gets the exact curve instead of a resampled `linear(…)`.
	const fn = Object.assign(cubicBezier(p[0]!, p[1]!, p[2]!, p[3]!), {
		_cssKeyword: `cubic-bezier(${p.join(', ')})`
	});
	parsedCurves.set(easing, fn);
	return fn;
};
