/**
 * Tests for stagger() delay factory.
 * Pure math — runs in the `server` vitest project.
 */

import { describe, expect, it } from 'vitest';
import { stagger } from './stagger';

describe("stagger() — from: 'start' (default)", () => {
	it('first element has zero delay', () => {
		const delay = stagger(50);
		expect(delay(0, 5)).toBe(0);
	});

	it('delays increase from first to last', () => {
		const delay = stagger(50);
		for (let i = 1; i < 5; i++) {
			expect(delay(i, 5)).toBeGreaterThan(delay(i - 1, 5));
		}
	});

	it('last element delay equals (n-1) * interval', () => {
		const interval = 40;
		const n = 6;
		const delay = stagger(interval);
		expect(delay(n - 1, n)).toBeCloseTo(interval * (n - 1), 5);
	});
});

describe("stagger() — from: 'end'", () => {
	it('last element has zero delay', () => {
		const delay = stagger(50, { from: 'end' });
		expect(delay(4, 5)).toBe(0);
	});

	it('delays decrease toward end', () => {
		const delay = stagger(50, { from: 'end' });
		for (let i = 0; i < 4; i++) {
			expect(delay(i, 5)).toBeGreaterThan(delay(i + 1, 5));
		}
	});
});

describe("stagger() — from: 'center'", () => {
	it('middle element has zero delay for odd-length list', () => {
		const delay = stagger(50, { from: 'center' });
		expect(delay(2, 5)).toBeCloseTo(0, 5);
	});

	it('edges have equal delay for symmetric list', () => {
		const delay = stagger(50, { from: 'center' });
		const n = 5;
		expect(delay(0, n)).toBeCloseTo(delay(n - 1, n), 5);
	});
});

describe('stagger() — from: number (normalized)', () => {
	it("from: 0 is equivalent to from: 'start'", () => {
		const start = stagger(50, { from: 'start' });
		const num = stagger(50, { from: 0 });
		const n = 6;
		for (let i = 0; i < n; i++) {
			expect(num(i, n)).toBeCloseTo(start(i, n), 5);
		}
	});

	it("from: 1 is equivalent to from: 'end'", () => {
		const end = stagger(50, { from: 'end' });
		const num = stagger(50, { from: 1 });
		const n = 6;
		for (let i = 0; i < n; i++) {
			expect(num(i, n)).toBeCloseTo(end(i, n), 5);
		}
	});

	it('clamps values outside [0, 1]', () => {
		const neg = stagger(50, { from: -1 });
		const over = stagger(50, { from: 2 });
		const start = stagger(50, { from: 'start' });
		const end = stagger(50, { from: 'end' });
		const n = 4;
		for (let i = 0; i < n; i++) {
			expect(neg(i, n)).toBeCloseTo(start(i, n), 5);
			expect(over(i, n)).toBeCloseTo(end(i, n), 5);
		}
	});
});

describe('stagger() — edge cases', () => {
	it('returns 0 for single-item list', () => {
		const delay = stagger(100);
		expect(delay(0, 1)).toBe(0);
	});

	it('returns 0 for total = 0', () => {
		const delay = stagger(100);
		expect(delay(0, 0)).toBe(0);
	});

	it('scales proportionally with interval', () => {
		const a = stagger(40);
		const b = stagger(80);
		const n = 4;
		for (let i = 0; i < n; i++) {
			expect(b(i, n)).toBeCloseTo(a(i, n) * 2, 5);
		}
	});
});

describe('stagger() — with easing', () => {
	it('easing changes delay values but preserves t=0 and t=1 extremes', () => {
		const linear = stagger(50);
		const eased = stagger(50, { easing: (t) => t * t });
		const n = 5;
		// First element always zero from 'start'
		expect(eased(0, n)).toBe(0);
		// Last element should equal linear last (maxDist * interval) because
		// eased(1) = 1² = 1 = same as linear(1).
		expect(eased(n - 1, n)).toBeCloseTo(linear(n - 1, n), 5);
		// Mid elements differ
		expect(eased(2, n)).not.toBeCloseTo(linear(2, n), 2);
	});
});
