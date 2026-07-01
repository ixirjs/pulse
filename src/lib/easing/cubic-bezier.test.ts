/**
 * Tests for the cubic-bezier easing factory.
 * Pure math — runs in the `server` vitest project.
 */

import { describe, expect, it } from 'vitest';
import { cubicBezier } from './cubic-bezier';
import { linear } from './primitive';

describe('cubicBezier()', () => {
	it('returns the linear function when x1===y1 and x2===y2', () => {
		// CSS spec: cubic-bezier(n, n, n, n) is equivalent to linear
		expect(cubicBezier(0, 0, 0, 0)).toBe(linear);
		expect(cubicBezier(0.5, 0.5, 0.5, 0.5)).toBe(linear);
		expect(cubicBezier(1, 1, 1, 1)).toBe(linear);
	});

	it('maps t=0 to 0', () => {
		const fn = cubicBezier(0.25, 0.1, 0.25, 1);
		expect(fn(0)).toBe(0);
	});

	it('maps t=1 to 1', () => {
		const fn = cubicBezier(0.25, 0.1, 0.25, 1);
		expect(fn(1)).toBe(1);
	});

	it('clamps at t < 0 → 0', () => {
		const fn = cubicBezier(0.25, 0.1, 0.25, 1);
		expect(fn(-0.1)).toBe(0);
	});

	it('clamps at t > 1 → 1', () => {
		const fn = cubicBezier(0.25, 0.1, 0.25, 1);
		expect(fn(1.1)).toBe(1);
	});

	it('returns finite values for all t in [0, 1]', () => {
		const fn = cubicBezier(0.42, 0, 0.58, 1);
		for (let t = 0; t <= 1; t += 0.05) {
			expect(Number.isFinite(fn(t))).toBe(true);
		}
	});

	it('ease-in-out is symmetric around t=0.5', () => {
		const fn = cubicBezier(0.42, 0, 0.58, 1);
		for (let t = 0; t <= 0.5; t += 0.05) {
			expect(fn(t)).toBeCloseTo(1 - fn(1 - t), 6);
		}
	});

	it('produces the correct ease midpoint (approximate)', () => {
		// CSS ease ≈ cubic-bezier(0.25, 0.1, 0.25, 1)
		// At t=0.5, ease eases more than linear (output > 0.5)
		const ease = cubicBezier(0.25, 0.1, 0.25, 1);
		expect(ease(0.5)).toBeGreaterThan(0.5);
	});

	it('ease-in is slow at the start (output < linear at t=0.5)', () => {
		const easeIn = cubicBezier(0.42, 0, 1, 1);
		expect(easeIn(0.5)).toBeLessThan(0.5);
	});

	it('ease-out is fast at the start (output > linear at t=0.5)', () => {
		const easeOut = cubicBezier(0, 0, 0.58, 1);
		expect(easeOut(0.5)).toBeGreaterThan(0.5);
	});

	it('two instances with the same control points produce the same results', () => {
		const fn1 = cubicBezier(0.4, 0, 0.2, 1);
		const fn2 = cubicBezier(0.4, 0, 0.2, 1);
		for (let t = 0; t <= 1; t += 0.1) {
			expect(fn1(t)).toBeCloseTo(fn2(t), 10);
		}
	});
});
