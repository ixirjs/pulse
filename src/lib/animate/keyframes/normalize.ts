/**
 * Input normalization and per-prop timing resolution.
 *
 * Splits the user-facing shorthands (`123`, `[from, to]`, `PropConfig`) into
 * a uniform `PropConfig`, then derives the WAAPI timing (duration / easing
 * / delay) — including spring sampling.
 */

import { getCachedSpring } from '$lib/shared/spring-core';
import { atLeast0 } from '$lib/shared/math';
import type {
	AnimatableValue,
	AnimateDefaults,
	DurationFn,
	MotionElement,
	PropConfig,
	PropInput,
	SpringInput,
	SpringOptions
} from '../types';
import { DEFAULT_DURATION, easingToCss } from './easing-utils';
import { isSpringEasing } from '$lib/easing/spring';

interface ResolvedTiming {
	duration: number;
	easing: string;
	delay: number;
}

export const isPropConfig = (input: PropInput): input is PropConfig =>
	typeof input === 'object' &&
	input !== null &&
	!Array.isArray(input) &&
	('to' in input || 'values' in input);

/**
 * Expand an array shorthand into the matching `PropConfig` fields. A 2-element
 * array is the classic `[from, to]` pair; 3+ elements become a multi-stop
 * `values` sequence (with `to` set to the last stop for end-state writes).
 * Accepts a loose array type so callers don't need a cast after the
 * `Array.isArray` guard (which doesn't narrow readonly tuples).
 */
export const tupleToConfig = (
	tuple: readonly AnimatableValue[]
): Pick<PropConfig, 'from' | 'to' | 'values'> =>
	tuple.length > 2
		? { values: tuple, to: tuple[tuple.length - 1] }
		: { from: tuple[0], to: tuple[1] };

const EMPTY_SPRING_OPTIONS: SpringOptions = Object.freeze({});

const resolveSpring = (input: SpringInput): SpringOptions =>
	input === true ? EMPTY_SPRING_OPTIONS : input;

/**
 * Resolve a `duration` value that may be a plain number or a function of the
 * element. Returns `fallback` when `duration` is undefined.
 */
const resolveDurationMs = (
	duration: number | DurationFn | undefined,
	element: MotionElement | undefined,
	fallback: number
): number => {
	if (duration == null) return fallback;
	if (typeof duration === 'function') return atLeast0(duration(element!));
	return duration;
};

export const normalizeInput = (input: PropInput, defaults: AnimateDefaults): PropConfig => {
	const { duration, easing, spring, delay } = defaults;
	if (Array.isArray(input)) {
		return { ...tupleToConfig(input), duration, easing, spring, delay };
	}
	if (isPropConfig(input)) {
		// `values` takes precedence over from/to; mirror its last stop into `to`
		// so end-state writes (finalStyles / reduced-motion) have a target.
		const to = input.values ? input.values[input.values.length - 1] : input.to;
		return {
			from: input.from,
			to,
			values: input.values,
			offset: input.offset,
			duration: input.duration ?? duration,
			easing: input.easing ?? easing,
			spring: input.spring ?? spring,
			delay: input.delay ?? delay
		};
	}
	return { to: input as AnimatableValue, duration, easing, spring, delay };
};

export const resolveTiming = (config: PropConfig, element?: MotionElement): ResolvedTiming => {
	// The spring and non-spring paths differ only in the easing string and the
	// duration to fall back on when no explicit `duration` is given; the
	// resolveDurationMs() call and result shape are shared.
	let easing: string;
	let durationFallback: number;
	if (config.spring) {
		const cached = getCachedSpring(resolveSpring(config.spring));
		easing = cached.linearEasingCss;
		durationFallback = cached.spring.duration;
	} else {
		const fn = config.easing;
		easing = easingToCss(fn);
		durationFallback = (fn && isSpringEasing(fn) ? fn.duration : undefined) ?? DEFAULT_DURATION;
	}
	return {
		duration: resolveDurationMs(config.duration, element, durationFallback),
		easing,
		delay: config.delay ?? 0
	};
};
