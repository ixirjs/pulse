/**
 * Easing-to-CSS conversion utilities for the `animate()` runtime.
 *
 * Converts JS easing functions into WAAPI-compatible `linear(...)` strings,
 * with a WeakMap cache so repeated issuance with the same function is free.
 */

import type { EasingFn } from '../types';
import { cubicOut } from '../../easing/primitive';
import { cssKeywordOf } from '../../easing/css';
import { isSpringEasing } from '../../easing/spring';
import { samplesToLinearEasing } from '../../shared/spring-core';

export const DEFAULT_DURATION = 300;
/** Default easing — CSS `ease-out` cubic-bezier, shared with `cubicOut`. */
export const DEFAULT_EASING: EasingFn = cubicOut;

const EASING_SAMPLES = 25;
const EASING_CACHE = new WeakMap<EasingFn, string>();

const sampleEasing = (fn: EasingFn): string => {
	const last = EASING_SAMPLES - 1;
	return samplesToLinearEasing(Array.from({ length: EASING_SAMPLES }, (_, i) => fn(i / last)));
};

/**
 * Convert an easing function into a WAAPI-compatible `linear(...)` string.
 * Memoized by function reference — repeated calls with the same function are free.
 * `SpringEasingFn` instances carry a pre-built high-fidelity string via `_linearEasing`.
 */
export const easingToCss = (easing: EasingFn | undefined): string => {
	const fn = easing ?? DEFAULT_EASING;
	// Prefer an exact form over the 25-point resample: a CSS keyword the browser
	// implements natively, or a spring's pre-built high-fidelity string.
	const cached = isSpringEasing(fn) ? fn._linearEasing : (cssKeywordOf(fn) ?? EASING_CACHE.get(fn));
	if (cached) return cached;
	const css = sampleEasing(fn);
	EASING_CACHE.set(fn, css);
	return css;
};
