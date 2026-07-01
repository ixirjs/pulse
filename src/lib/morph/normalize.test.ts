/**
 * Pure path normalization to absolute cubic subpaths. Runs in `server` (node).
 */

import { describe, expect, it } from 'vitest';
import { normalizePath } from './normalize';

describe('normalizePath()', () => {
	it('converts a line to a cubic with thirds-placed controls', () => {
		const [sp] = normalizePath('M0 0 L9 0');
		expect(sp!.start).toEqual([0, 0]);
		expect(sp!.segments).toHaveLength(1);
		const seg = sp!.segments[0]!;
		expect(seg.c1[0]).toBeCloseTo(3);
		expect(seg.c2[0]).toBeCloseTo(6);
		expect(seg.end).toEqual([9, 0]);
	});

	it('resolves H and V to absolute endpoints', () => {
		expect(normalizePath('M0 0 H10')[0]!.segments[0]!.end).toEqual([10, 0]);
		expect(normalizePath('M0 0 V10')[0]!.segments[0]!.end).toEqual([0, 10]);
	});

	it('applies relative offsets cumulatively', () => {
		const [sp] = normalizePath('m10 10 l10 0');
		expect(sp!.start).toEqual([10, 10]);
		expect(sp!.segments[0]!.end).toEqual([20, 10]);
	});

	it('elevates a quadratic to a cubic', () => {
		const seg = normalizePath('M0 0 Q6 12 12 0')[0]!.segments[0]!;
		expect(seg.c1[0]).toBeCloseTo(4);
		expect(seg.c1[1]).toBeCloseTo(8);
		expect(seg.end).toEqual([12, 0]);
	});

	it('closes a subpath, adding the return segment', () => {
		const [sp] = normalizePath('M0 0 L10 0 Z');
		expect(sp!.closed).toBe(true);
		expect(sp!.segments).toHaveLength(2);
		expect(sp!.segments[1]!.end).toEqual([0, 0]);
	});

	it('splits multiple subpaths', () => {
		const paths = normalizePath('M0 0 L1 0 M5 5 L6 5');
		expect(paths).toHaveLength(2);
		expect(paths[1]!.start).toEqual([5, 5]);
	});

	it('converts an arc into cubic segments', () => {
		const [sp] = normalizePath('M0 0 A5 5 0 0 1 10 0');
		expect(sp!.segments.length).toBeGreaterThan(0);
		// Endpoint is preserved exactly.
		expect(sp!.segments.at(-1)!.end[0]).toBeCloseTo(10);
		expect(sp!.segments.at(-1)!.end[1]).toBeCloseTo(0);
	});
});
