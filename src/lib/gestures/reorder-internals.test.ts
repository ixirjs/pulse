import { describe, expect, it } from 'vitest';
import { centersAreAscending, nearestCenterIndex } from './reorder-internals';

describe('nearestCenterIndex()', () => {
	it('finds the same nearest slot at either boundary and between centers', () => {
		const centers = [10, 40, 90, 160];
		expect(nearestCenterIndex(centers, -10)).toBe(0);
		expect(nearestCenterIndex(centers, 67)).toBe(2);
		expect(nearestCenterIndex(centers, 999)).toBe(3);
	});

	it('uses an O(log n) lookup for ascending list centers', () => {
		const centers = Array.from({ length: 1024 }, (_, index) => index * 10);
		expect(centersAreAscending(centers)).toBe(true);
		expect(nearestCenterIndex(centers, 5_555)).toBe(555);
	});

	it('retains linear nearest-slot semantics for non-linear arrangements', () => {
		const centers = [10, 90, 40];
		expect(centersAreAscending(centers)).toBe(false);
		expect(nearestCenterIndex(centers, 35, false)).toBe(2);
	});
});
