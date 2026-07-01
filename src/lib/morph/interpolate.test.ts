/**
 * Pure path alignment + interpolation. Runs in the `server` (node) project.
 */

import { describe, expect, it } from 'vitest';
import { normalizePath } from './normalize';
import {
	alignSubpaths,
	interpolatePlan,
	minimizeAnchorTravel,
	planMorph,
	reverseClosed,
	rotateClosed,
	subdivideTo,
	toPathString
} from './interpolate';

describe('subdivideTo()', () => {
	it('grows the segment count while preserving endpoints', () => {
		const [line] = normalizePath('M0 0 L10 0');
		const grown = subdivideTo(line!, 2);
		expect(grown.segments).toHaveLength(2);
		// Midpoint of a straight line subdivided at 0.5.
		expect(grown.segments[0]!.end[0]).toBeCloseTo(5);
		expect(grown.segments.at(-1)!.end).toEqual([10, 0]);
	});

	it('is a no-op when already at the target count', () => {
		const [line] = normalizePath('M0 0 L10 0');
		expect(subdivideTo(line!, 1).segments).toHaveLength(1);
	});
});

describe('alignSubpaths()', () => {
	it('brings both subpaths to the larger segment count', () => {
		const [a] = normalizePath('M0 0 L10 0'); // 1 segment
		const [b] = normalizePath('M0 0 C0 0 5 5 5 5 C5 5 8 8 10 10'); // 2 segments
		const [aa, bb] = alignSubpaths(a!, b!);
		expect(aa.segments).toHaveLength(2);
		expect(bb.segments).toHaveLength(2);
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
	it('returns the from-path at t=0 and the to-path at t=1', () => {
		const plan = planMorph('M0 0 L10 0', 'M0 0 L0 10');
		expect(interpolatePlan(plan, 0)).toBe(toPathString(plan.from));
		expect(interpolatePlan(plan, 1)).toBe(toPathString(plan.to));
	});

	it('lerps anchor positions at the midpoint', () => {
		const plan = planMorph('M0 0 L10 0', 'M10 10 L20 10');
		expect(interpolatePlan(plan, 0.5).startsWith('M5 5C')).toBe(true);
	});
});

describe('rotateClosed() / reverseClosed()', () => {
	const [square] = normalizePath('M0 0 L10 0 L10 10 L0 10 Z');

	it('rotation keeps the shape but moves the start anchor', () => {
		const rotated = rotateClosed(square!, 1);
		expect(rotated.start).toEqual([10, 0]); // second corner becomes the start
		expect(rotated.segments).toHaveLength(square!.segments.length);
	});

	it('rotation by 0 (or a full turn) is a no-op', () => {
		expect(rotateClosed(square!, 0)).toBe(square);
		expect(rotateClosed(square!, square!.segments.length).start).toEqual(square!.start);
	});

	it('reversal keeps the start anchor but flips winding', () => {
		const reversed = reverseClosed(square!);
		expect(reversed.start).toEqual([0, 0]);
		// First step now heads to the previous *last* corner (0,10) instead of (10,0).
		expect(reversed.segments[0]!.end).toEqual([0, 10]);
	});
});

describe('minimizeAnchorTravel()', () => {
	it('rotates the from-ring so an identical, differently-started shape coincides', () => {
		// Same square, started at a different corner.
		const plan = planMorph('M0 0 L10 0 L10 10 L0 10 Z', 'M10 0 L10 10 L0 10 L0 0 Z');
		expect(toPathString(plan.from)).toBe(toPathString(plan.to));
	});

	it('reverses the from-ring when the target has the opposite winding', () => {
		const plan = planMorph('M0 0 L10 0 L10 10 L0 10 Z', 'M0 0 L0 10 L10 10 L10 0 Z');
		expect(toPathString(plan.from)).toBe(toPathString(plan.to));
	});

	it('can be disabled, leaving anchors paired in document order', () => {
		const unoptimized = planMorph('M0 0 L10 0 L10 10 L0 10 Z', 'M10 0 L10 10 L0 10 L0 0 Z', false);
		expect(toPathString(unoptimized.from)).not.toBe(toPathString(unoptimized.to));
	});

	it('leaves open paths untouched (start/end are fixed)', () => {
		const [open] = normalizePath('M0 0 L10 0');
		const [target] = normalizePath('M0 0 L0 10');
		expect(minimizeAnchorTravel(open!, target!)).toBe(open);
	});
});
