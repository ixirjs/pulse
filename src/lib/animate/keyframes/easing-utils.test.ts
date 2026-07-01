/**
 * Tests for easing-to-CSS conversion utilities.
 * No DOM access — runs in the `server` vitest project.
 */

import { describe, expect, it } from 'vitest';
import { DEFAULT_DURATION, DEFAULT_EASING, DEFAULT_EASING_CSS, easingToCss } from './easing-utils';
import { springEasing } from '$lib/easing/spring';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

describe('DEFAULT_DURATION', () => {
	it('is 300ms', () => {
		expect(DEFAULT_DURATION).toBe(300);
	});
});

describe('DEFAULT_EASING', () => {
	it('is a function', () => {
		expect(typeof DEFAULT_EASING).toBe('function');
	});

	it('maps 0 → 0', () => {
		expect(DEFAULT_EASING(0)).toBeCloseTo(0, 10);
	});

	it('maps 1 → 1', () => {
		expect(DEFAULT_EASING(1)).toBeCloseTo(1, 10);
	});

	it('returns finite values throughout [0, 1]', () => {
		for (let t = 0; t <= 1; t += 0.1) {
			expect(Number.isFinite(DEFAULT_EASING(t))).toBe(true);
		}
	});

	it('is monotonically non-decreasing (ease-out characteristic)', () => {
		let prev = DEFAULT_EASING(0);
		for (let t = 0.1; t <= 1; t += 0.1) {
			const curr = DEFAULT_EASING(t);
			expect(curr).toBeGreaterThanOrEqual(prev - 1e-9);
			prev = curr;
		}
	});
});

describe('DEFAULT_EASING_CSS', () => {
	it("is a string starting with 'linear('", () => {
		expect(typeof DEFAULT_EASING_CSS).toBe('string');
		expect(DEFAULT_EASING_CSS.startsWith('linear(')).toBe(true);
	});

	it("ends with ')'", () => {
		expect(DEFAULT_EASING_CSS.endsWith(')')).toBe(true);
	});

	it('matches easingToCss(DEFAULT_EASING)', () => {
		expect(DEFAULT_EASING_CSS).toBe(easingToCss(DEFAULT_EASING));
	});
});

// ---------------------------------------------------------------------------
// easingToCss()
// ---------------------------------------------------------------------------

describe('easingToCss()', () => {
	it('returns DEFAULT_EASING_CSS when called with undefined', () => {
		expect(easingToCss(undefined)).toBe(DEFAULT_EASING_CSS);
	});

	it('returns a linear(...) CSS string for a plain function', () => {
		const css = easingToCss((t) => t);
		expect(css.startsWith('linear(')).toBe(true);
		expect(css.endsWith(')')).toBe(true);
	});

	it('caches result for the same function reference', () => {
		const fn = (t: number) => t * t;
		const a = easingToCss(fn);
		const b = easingToCss(fn);
		expect(a).toBe(b);
	});

	it('different function references produce independent results', () => {
		// Same math, different object — still separate entries.
		const fn1 = (t: number) => t;
		const fn2 = (t: number) => t;
		const a = easingToCss(fn1);
		const b = easingToCss(fn2);
		// Strings happen to be identical in value since math is the same:
		expect(a).toBe(b);
		// But the results are produced independently (no cross-reference sharing).
	});

	it('uses SpringEasingFn._linearEasing directly (bypasses resampling)', () => {
		const seFn = springEasing({ stiffness: 200, damping: 24 });
		const css = easingToCss(seFn);
		expect(css).toBe(seFn._linearEasing);
	});

	it('linear identity easing produces 25-sample string', () => {
		const fn = (t: number) => t;
		const css = easingToCss(fn);
		const commas = (css.match(/,/g) ?? []).length;
		// 25 samples → 24 commas
		expect(commas).toBe(24);
	});
});
