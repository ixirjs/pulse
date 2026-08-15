/**
 * Pure path alignment + interpolation. Runs in the `server` (node) project.
 *
 * The alignment internals (subdivision, ring rotation/reversal, anchor-travel
 * minimization) are exercised through `planMorph` / `interpolatePlan`, the two
 * entry points `morph()` itself uses — `interpolatePlan(plan, 0)` and
 * `(plan, 1)` render the plan's from- and to-paths.
 */

import { describe, expect, it } from 'vitest';
import { interpolatePlan, planMorph } from './interpolate';

/** Rendered endpoints of a plan — what the element's `d` shows at t=0 and t=1. */
const ends = (from: string, to: string, optimize = true) => {
	const plan = planMorph(from, to, optimize);
	return { plan, start: interpolatePlan(plan, 0), end: interpolatePlan(plan, 1) };
};

describe('subpath alignment', () => {
	it('grows the shorter side to the larger segment count, preserving endpoints', () => {
		// 1 segment vs 2 segments — both sides must end up at 2.
		const { plan } = ends('M0 0 L10 0', 'M0 0 C0 0 5 5 5 5 C5 5 8 8 10 10');
		expect(plan.from[0]!.segments).toHaveLength(2);
		expect(plan.to[0]!.segments).toHaveLength(2);
		// Subdivision must not move the path's real endpoints.
		expect(plan.from[0]!.start).toEqual([0, 0]);
		expect(plan.from[0]!.segments.at(-1)!.end).toEqual([10, 0]);
	});

	it('splits a straight line at its midpoint', () => {
		const { plan } = ends('M0 0 L10 0', 'M0 0 C0 0 5 5 5 5 C5 5 8 8 10 10');
		expect(plan.from[0]!.segments[0]!.end[0]).toBeCloseTo(5);
	});

	it('leaves equal segment counts untouched', () => {
		const { plan } = ends('M0 0 L10 0', 'M0 0 L0 10');
		expect(plan.from[0]!.segments).toHaveLength(1);
		expect(plan.to[0]!.segments).toHaveLength(1);
	});
});

describe('planMorph()', () => {
	it('is compatible for paths with matching subpath counts', () => {
		const plan = planMorph('M0 0 L10 0', 'M0 0 L0 10');
		expect(plan.compatible).toBe(true);
		expect(plan.from).toHaveLength(1);
		expect(plan.to).toHaveLength(1);
	});

	it('is incompatible when subpath counts differ', () => {
		const plan = planMorph('M0 0 L1 0', 'M0 0 L1 0 M2 2 L3 2');
		expect(plan.compatible).toBe(false);
	});
});

describe('interpolatePlan()', () => {
	it('lerps anchor positions at the midpoint', () => {
		const plan = planMorph('M0 0 L10 0', 'M10 10 L20 10');
		expect(interpolatePlan(plan, 0.5).startsWith('M5 5C')).toBe(true);
	});

	it('is monotonic between its endpoints', () => {
		const { start, end } = ends('M0 0 L10 0', 'M10 10 L20 10');
		expect(start).not.toBe(end);
		expect(start.startsWith('M0 0')).toBe(true);
		expect(end.startsWith('M10 10')).toBe(true);
	});
});

describe('anchor-travel minimization', () => {
	it('rotates the from-ring so an identical, differently-started shape coincides', () => {
		// Same square, started at a different corner — rotating the ring makes the
		// two rings identical, so nothing should visually move across the morph.
		const { start, end } = ends('M0 0 L10 0 L10 10 L0 10 Z', 'M10 0 L10 10 L0 10 L0 0 Z');
		expect(start).toBe(end);
	});

	it('reverses the from-ring when the target has the opposite winding', () => {
		const { start, end } = ends('M0 0 L10 0 L10 10 L0 10 Z', 'M0 0 L0 10 L10 10 L10 0 Z');
		expect(start).toBe(end);
	});

	it('can be disabled, leaving anchors paired in document order', () => {
		const { start, end } = ends('M0 0 L10 0 L10 10 L0 10 Z', 'M10 0 L10 10 L0 10 L0 0 Z', false);
		expect(start).not.toBe(end);
	});

	it('leaves open paths untouched — their start/end are fixed', () => {
		// An open path may not be rotated or reversed, so the from-ring must still
		// begin where it was authored.
		const { plan } = ends('M0 0 L10 0', 'M0 10 L0 0');
		expect(plan.from[0]!.start).toEqual([0, 0]);
		expect(plan.from[0]!.segments.at(-1)!.end).toEqual([10, 0]);
	});
});
