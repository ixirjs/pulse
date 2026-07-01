/**
 * Pure drag-constraint math. Runs in the `server` (node) vitest project.
 */

import { describe, expect, it } from 'vitest';
import { applyConstraint, xBounds, yBounds } from './constraints';

describe('applyConstraint()', () => {
	it('passes values within bounds through unchanged', () => {
		expect(applyConstraint(50, { min: 0, max: 100 })).toBe(50);
	});

	it('hard-clamps at the bounds when elastic is 0', () => {
		expect(applyConstraint(150, { max: 100 })).toBe(100);
		expect(applyConstraint(-30, { min: 0 })).toBe(0);
	});

	it('rubber-bands past the bound when elastic > 0', () => {
		expect(applyConstraint(150, { max: 100 }, 0.5)).toBe(125);
		expect(applyConstraint(-30, { min: 0 }, 0.2)).toBeCloseTo(-6);
	});

	it('treats omitted bounds as unbounded', () => {
		expect(applyConstraint(9999, {})).toBe(9999);
		expect(applyConstraint(-9999, { max: 0 })).toBe(-9999);
	});
});

describe('axis projections', () => {
	it('maps left/right to x bounds and top/bottom to y bounds', () => {
		const box = { left: -10, right: 20, top: -5, bottom: 15 };
		expect(xBounds(box)).toEqual({ min: -10, max: 20 });
		expect(yBounds(box)).toEqual({ min: -5, max: 15 });
	});
});
