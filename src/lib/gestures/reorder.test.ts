import { describe, expect, it } from 'vitest';
import { nearestCenterIndex } from './reorder';

describe('nearestCenterIndex()', () => {
	it('finds the same nearest slot at either boundary and between centers', () => {
		const centers = [10, 40, 90, 160];
		expect(nearestCenterIndex(centers, -10)).toBe(0);
		expect(nearestCenterIndex(centers, 67)).toBe(2);
		expect(nearestCenterIndex(centers, 999)).toBe(3);
	});

	it('retains nearest-slot semantics for non-linear arrangements', () => {
		expect(nearestCenterIndex([10, 90, 40], 35)).toBe(2);
	});

	it('reports no slot for an empty list', () => {
		expect(nearestCenterIndex([], 0)).toBe(-1);
	});
});
