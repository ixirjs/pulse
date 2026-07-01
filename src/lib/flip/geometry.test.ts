/**
 * Tests for pure geometry primitives (rectsEqual, diagonal, computeDelta, isIdentityDelta).
 * No DOM access — runs in the `server` vitest project.
 */

import { describe, expect, it } from 'vitest';
import { computeDelta, diagonal, isIdentityDelta, rectsEqual } from './geometry';
import type { FlipRect } from './types';

const rect = (x: number, y: number, w: number, h: number): FlipRect => ({
	x,
	y,
	width: w,
	height: h
});

describe('rectsEqual()', () => {
	it('identical rects are equal', () => {
		const r = rect(10, 20, 100, 50);
		expect(rectsEqual(r, r)).toBe(true);
	});

	it('rects within default epsilon (0.5) are equal', () => {
		expect(rectsEqual(rect(0, 0, 100, 50), rect(0.4, 0.4, 100.4, 50.4))).toBe(true);
	});

	it('rects outside default epsilon are not equal', () => {
		expect(rectsEqual(rect(0, 0, 100, 50), rect(1, 0, 100, 50))).toBe(false);
	});

	it('respects custom epsilon', () => {
		expect(rectsEqual(rect(0, 0, 100, 50), rect(2, 0, 100, 50), 3)).toBe(true);
		expect(rectsEqual(rect(0, 0, 100, 50), rect(2, 0, 100, 50), 1)).toBe(false);
	});

	it('all four dimensions must be within epsilon', () => {
		// x differs beyond epsilon, others within
		expect(rectsEqual(rect(0, 0, 100, 50), rect(1, 0, 100, 50))).toBe(false);
		// y differs beyond epsilon
		expect(rectsEqual(rect(0, 0, 100, 50), rect(0, 1, 100, 50))).toBe(false);
		// width differs
		expect(rectsEqual(rect(0, 0, 100, 50), rect(0, 0, 101, 50))).toBe(false);
		// height differs
		expect(rectsEqual(rect(0, 0, 100, 50), rect(0, 0, 100, 51))).toBe(false);
	});
});

describe('diagonal()', () => {
	it('returns 0 for identical rects', () => {
		const r = rect(10, 20, 100, 50);
		expect(diagonal(r, r)).toBe(0);
	});

	it('computes horizontal distance correctly', () => {
		expect(diagonal(rect(0, 0, 1, 1), rect(3, 0, 1, 1))).toBeCloseTo(3, 5);
	});

	it('computes vertical distance correctly', () => {
		expect(diagonal(rect(0, 0, 1, 1), rect(0, 4, 1, 1))).toBeCloseTo(4, 5);
	});

	it('computes diagonal distance correctly (3-4-5 triangle)', () => {
		expect(diagonal(rect(0, 0, 1, 1), rect(3, 4, 1, 1))).toBeCloseTo(5, 5);
	});

	it('is symmetric', () => {
		const a = rect(10, 20, 100, 50);
		const b = rect(50, 60, 80, 40);
		expect(diagonal(a, b)).toBeCloseTo(diagonal(b, a), 5);
	});
});

describe('computeDelta()', () => {
	it('returns identity delta for identical rects', () => {
		const r = rect(0, 0, 100, 50);
		const delta = computeDelta({ from: r, to: r });
		expect(delta.dx).toBe(0);
		expect(delta.dy).toBe(0);
		expect(delta.sx).toBe(1);
		expect(delta.sy).toBe(1);
	});

	it('computes translation correctly', () => {
		const from = rect(10, 20, 100, 50);
		const to = rect(30, 50, 100, 50);
		const delta = computeDelta({ from, to });
		expect(delta.dx).toBe(-20); // from.x - to.x
		expect(delta.dy).toBe(-30); // from.y - to.y
		expect(delta.sx).toBe(1);
		expect(delta.sy).toBe(1);
	});

	it('computes scale correctly', () => {
		const from = rect(0, 0, 200, 100);
		const to = rect(0, 0, 100, 50);
		const delta = computeDelta({ from, to });
		expect(delta.sx).toBe(2); // from.width / to.width
		expect(delta.sy).toBe(2); // from.height / to.height
		expect(delta.dx).toBe(0);
		expect(delta.dy).toBe(0);
	});

	it('disabling translate zeroes dx/dy', () => {
		const from = rect(10, 20, 100, 50);
		const to = rect(30, 50, 100, 50);
		const delta = computeDelta({ from, to }, { translate: false });
		expect(delta.dx).toBe(0);
		expect(delta.dy).toBe(0);
		expect(delta.sx).toBe(1);
		expect(delta.sy).toBe(1);
	});

	it('disabling scale sets sx/sy to 1', () => {
		const from = rect(0, 0, 200, 100);
		const to = rect(0, 0, 100, 50);
		const delta = computeDelta({ from, to }, { scale: false });
		expect(delta.sx).toBe(1);
		expect(delta.sy).toBe(1);
	});

	it('handles zero-size `to` rect without NaN (guards division by zero)', () => {
		const from = rect(0, 0, 100, 50);
		const to = rect(0, 0, 0, 0);
		const delta = computeDelta({ from, to });
		expect(delta.sx).toBe(1);
		expect(delta.sy).toBe(1);
	});
});

describe('isIdentityDelta()', () => {
	it('returns true for identity delta', () => {
		expect(isIdentityDelta({ dx: 0, dy: 0, sx: 1, sy: 1 })).toBe(true);
	});

	it('returns false when dx != 0', () => {
		expect(isIdentityDelta({ dx: 1, dy: 0, sx: 1, sy: 1 })).toBe(false);
	});

	it('returns false when dy != 0', () => {
		expect(isIdentityDelta({ dx: 0, dy: 1, sx: 1, sy: 1 })).toBe(false);
	});

	it('returns false when sx != 1', () => {
		expect(isIdentityDelta({ dx: 0, dy: 0, sx: 1.5, sy: 1 })).toBe(false);
	});

	it('returns false when sy != 1', () => {
		expect(isIdentityDelta({ dx: 0, dy: 0, sx: 1, sy: 0.9 })).toBe(false);
	});
});
